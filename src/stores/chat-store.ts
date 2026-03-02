/* ═══════════════════════════════════════════════════════════
   Chat Store — State management for Chat
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import chatClient from '../lib/chat-client';
import mainClient from '../lib/main-client';
import * as routes from '../config/api-routes';
import { useAuthStore } from './auth-store';
import { chatSocket } from '../lib/chat-socket';
import {
    type Conversation,
    type Message,
    type ChatListResponse,
    type MessageListResponse,
    type CreateChatPayload,
    type User,
} from '../types/chat';
import type { Team } from '../types/models';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    searchResults: User[];
    userTeams: Team[];
    unreadCount: number;
    activeParticipants: any[];
    conversationParticipants: User[];

    // Actions
    fetchConversations: () => Promise<void>;
    fetchMessages: (conversationId: string) => Promise<void>;
    setActiveConversation: (id: string | null) => void;
    sendMessage: (content: string, contentType?: string, parentMessageId?: string, mentions?: string[]) => Promise<void>;
    markAsRead: (conversationId: string, messageId?: string) => Promise<void>;
    markLatestMessageRead: (conversationId: string) => Promise<void>;
    searchUsers: (query: string) => Promise<void>;
    fetchTeams: (userId: string) => Promise<void>;
    createChat: (payload: CreateChatPayload) => Promise<string | null>;
    getConversationByUniqueName: (name: string) => Promise<string | null>;
    editMessage: (conversationId: string, messageSyskey: string, content: string) => Promise<boolean>;
    deleteMessage: (conversationId: string, messageSyskey: string) => Promise<boolean>;
    addReaction: (conversationId: string, messageSyskey: string, reactionStatus: number) => Promise<void>;
    fetchParticipants: (conversationId: string) => Promise<User[]>;
    addParticipants: (conversationId: string, userIds: string[], role?: string, subAppid?: string, shareAll?: boolean) => Promise<boolean>;
    removeParticipant: (conversationId: string, userId: string) => Promise<boolean>;
    changeGroupName: (conversationId: string, newName: string) => Promise<boolean>;
    // Attachment upload (mirrors Flutter's sendAttachment / fileToBase64New)
    sendAttachment: (files: File[]) => Promise<void>;
    // WebSocket
    connectSocket: () => void;
    disconnectSocket: () => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            conversations: [],
            activeConversationId: null,
            messages: [],
            isLoading: false,
            error: null,
            searchResults: [],
            userTeams: [],
            unreadCount: 0,
            activeParticipants: [],
            conversationParticipants: [],

            fetchConversations: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await chatClient.post<ChatListResponse>(
                        `${routes.CHAT_CONV_LIST}?curPage=1&pageSize=50`,
                        { curPage: 1, pageSize: 50 }
                    );

                    const rawData = response.data.data;
                    const convList = rawData?.data_list || (rawData as any)?.datalist || (response.data as any).data_list || [];

                    const mappedConversations = (convList as any[]).map((c: any) => {
                        // isRead: null → true (no unread), 1 → true (read), 0 → false (unread)
                        // This matches Flutter's Chat.fromJson logic exactly
                        const isRead = c.read == null
                            ? true
                            : (typeof c.read === 'number' ? c.read === 1 : Boolean(c.read));

                        // For groups, prefer group_name. For private chats, prefer opposite_user_name.
                        const displayName = c.group_name || c.opposite_user_name || c.name || 'Unknown';

                        // ── Fix: never show unread badge for messages YOU sent ──
                        // If the last message sender is the current user, count must be 0.
                        const { userId: myId } = useAuthStore.getState();
                        const senderField = String(c.sender_user_id || c.senderId || '').trim().toLowerCase();
                        const myIdNorm = String(myId || '').trim().toLowerCase();
                        const senderIsMe = Boolean(senderField && myIdNorm && senderField === myIdNorm);

                        return {
                            ...c,
                            name: displayName,
                            isRead: senderIsMe ? true : isRead,
                            sender_user_id: c.sender_user_id || c.senderId || '',
                            count: senderIsMe ? 0 : (c.count ?? 0),
                        };
                    });

                    const totalUnreadArr = mappedConversations.reduce((acc: number, c: any) => acc + (c.count || 0), 0);

                    set({ conversations: mappedConversations, unreadCount: totalUnreadArr as any, isLoading: false });
                } catch (err: any) {
                    console.error('[fetchConversations] Error details:', err.response?.data);
                    const errorMsg = err.response?.data?.message || err.message;
                    set({ error: errorMsg, isLoading: false });
                }
            },

            fetchMessages: async (conversationId: string) => {
                // Only show full loading spinner on first load (no existing messages for this convo).
                // Polling updates should be silent to avoid message list flickering every 5s.
                const isFirstLoad = get().activeConversationId !== conversationId || get().messages.length === 0;
                if (isFirstLoad) {
                    set({ isLoading: true, error: null, activeConversationId: conversationId });
                } else {
                    // Keep activeConversationId updated without clearing messages
                    set({ activeConversationId: conversationId });
                }
                try {
                    const response = await chatClient.post<MessageListResponse>(`${routes.CHAT_MSG_LIST}?curPage=1&pageSize=50`, {
                        conversation_id: conversationId,
                        curPage: 1,
                        pageSize: 50
                    });

                    const rawData = response.data.data;
                    const messagesData = rawData?.data_list || (rawData as any)?.datalist || (response.data as any).data_list;

                    // Support for mapping sender names/images from the 'role' array (participants)
                    const participants = messagesData?.role || [];
                    const messagesList = messagesData?.message || [];

                    const mappedMessages = messagesList.map((m: any) => {
                        const sender = participants.find((p: any) => p.sender_id === m.sender_id);

                        // Map the parent message reference from message_reference (Flutter API field)
                        const msgRef = m.message_reference || null;
                        const parentMsgId = m.parent_message_id || m.parentMessageId
                            || (msgRef?.syskey) || '';

                        // Flutter reads deleteFlag from json['status'] (not delete_flag)
                        // Map API 'status' field → delete_flag for our isDeleted check
                        const deleteFlag = m.delete_flag ?? m.status ?? 1;

                        return {
                            ...m,
                            sender_id: m.sender_id || m.senderId || '',
                            sender_name: sender?.sender_name || m.sender_name || 'Unknown',
                            sender_image: sender?.sender_image || m.sender_image || null,
                            send_at: m.send_at || m.timestamp || new Date().toISOString(),
                            // Normalise delete flag: API uses 'status', UI checks 'delete_flag'
                            delete_flag: deleteFlag,
                            // Normalise parent message reference
                            parent_message_id: parentMsgId,
                            // Keep the full parent message object for reply quote rendering
                            parent_message: msgRef ? {
                                syskey: msgRef.syskey || '',
                                sender_name: msgRef.name || msgRef.sender_name || 'Unknown',
                                content: msgRef.content || '',
                                images: msgRef.images || [],
                                files: msgRef.files || [],
                                delete_flag: msgRef.status ?? 1,
                            } : (m.parent_message || null),
                        };
                    }).sort((a: any, b: any) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime());

                    set({ messages: mappedMessages, activeParticipants: participants, isLoading: false });

                    // Auto-mark as read if this conversation is currently active
                    const { activeConversationId } = get();
                    if (activeConversationId === conversationId && mappedMessages.length > 0) {
                        // Get the latest non-temp message's syskey (matches Flutter's readLastMessage)
                        const latestMsg = [...mappedMessages]
                            .reverse()
                            .find((m: any) => m.syskey && !String(m.syskey).startsWith('temp_'));
                        if (latestMsg?.syskey) {
                            get().markAsRead(conversationId, latestMsg.syskey);
                        }
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            setActiveConversation: (id) => {
                set({ activeConversationId: id, messages: id ? get().messages : [] });
            },

            sendMessage: async (content, contentType = 'text', parentMessageId, mentions = []) => {
                const { activeConversationId } = get();
                if (!activeConversationId) return;

                // ── Gather sender identity ──
                const { userId: myId, domain, user } = useAuthStore.getState();
                const { activeParticipants } = get();
                const mySelf = activeParticipants.find((p: any) =>
                    String(p.sender_id || '').trim().toLowerCase() === String(myId || '').trim().toLowerCase()
                );
                // username: display name the server shows on the message bubble for other users
                const username = user?.name || mySelf?.sender_name || myId || '';

                // ── Optimistic update: show message immediately ──
                const tempSyskey = `temp_${Date.now()}`;
                // Find the parent message object for the reply banner
                const parentMsgObj = parentMessageId
                    ? get().messages.find((m: any) => m.syskey === parentMessageId)
                    : null;
                const optimisticMsg = {
                    syskey: tempSyskey,
                    conversation_id: activeConversationId,
                    sender_id: myId || '',
                    sender_name: mySelf?.sender_name || user?.name || 'You',
                    sender_image: mySelf?.sender_image || null,
                    content,
                    content_type: contentType,
                    send_at: new Date().toISOString(),
                    status: 'sent' as const,
                    parent_message_id: parentMessageId || '',
                    parent_message: parentMsgObj ? {
                        syskey: parentMsgObj.syskey,
                        sender_name: (parentMsgObj as any).sender_name || 'Unknown',
                        content: (parentMsgObj as any).content || '',
                        images: (parentMsgObj as any).images || [],
                        delete_flag: (parentMsgObj as any).delete_flag ?? 1,
                    } : null,
                    read_list: [myId || ''],
                    mentions,
                };
                set(state => ({ messages: [...state.messages, optimisticMsg] }));

                try {
                    // ── Match Flutter's SendMessageModel.toJson() exactly ──
                    // Flutter sends: conversation_id, sender_id, content, content_type,
                    //                username (display name), teamname (group name), domain, parent_message
                    const activeConv = get().conversations.find(c => c.syskey === activeConversationId);
                    const teamname = activeConv?.group_name || '';

                    const payload: Record<string, any> = {
                        conversation_id: activeConversationId,
                        sender_id: myId || '',          // ← CRITICAL: who is sending
                        content,
                        content_type: contentType,
                        username,                        // ← display name for the recipient
                        teamname,                        // ← group name (empty for private chat)
                        domain: domain || 'demouat',    // ← tenant/domain
                        mentions,                       // ← user IDs to mention
                    };
                    // Flutter uses 'parent_message' (not parent_message_id) for replies
                    if (parentMessageId) payload.parent_message = parentMessageId;

                    const res = await chatClient.post(routes.CHAT_SEND_MSG, payload);
                    console.log('[sendMessage] API response:', res.data);

                    // Replace optimistic message with real server data
                    await get().fetchMessages(activeConversationId);
                } catch (err: any) {
                    console.error('[sendMessage] FAILED:', err.response?.data || err.message);
                    // Remove the optimistic message on failure
                    set(state => ({ messages: state.messages.filter(m => m.syskey !== tempSyskey), error: err.message }));
                }
            },

            // ── Send Attachment (mirrors Flutter's sendAttachment + fileToBase64New) ──
            sendAttachment: async (files: File[]) => {
                const { activeConversationId } = get();
                if (!activeConversationId || files.length === 0) return;

                const { userId: myId, domain, user } = useAuthStore.getState();
                const { activeParticipants } = get();
                const mySelf = activeParticipants.find((p: any) =>
                    String(p.sender_id || '').toLowerCase() === String(myId || '').toLowerCase()
                );
                const username = user?.name || mySelf?.sender_name || myId || '';
                const activeConv = get().conversations.find(c => c.syskey === activeConversationId);
                const teamname = activeConv?.group_name || '';

                // Detect if all files are images
                const allImages = files.every(f => f.type.startsWith('image/'));
                const contentType = allImages ? 'image' : 'file';

                // Convert files to base64 maps (mirrors Flutter's fileToBase64New)
                const toBase64Map = (file: File): Promise<Record<string, string>> =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const dataUrl = reader.result as string;
                            const sizeKB = (file.size / 1024).toFixed(2) + ' KB';
                            resolve({
                                name: file.name,
                                type: file.type || 'application/octet-stream',
                                size: sizeKB,
                                data: dataUrl,  // data:<mime>;base64,<b64>
                            });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                // Optimistic: show local preview immediately
                const tempSyskey = `temp_${Date.now()}`;
                const localUrls = files.map(f => URL.createObjectURL(f));
                const optimisticMsg: any = {
                    syskey: tempSyskey,
                    conversation_id: activeConversationId,
                    sender_id: myId || '',
                    sender_name: mySelf?.sender_name || user?.name || 'You',
                    sender_image: mySelf?.sender_image || null,
                    content: '',
                    content_type: contentType,
                    send_at: new Date().toISOString(),
                    status: 'sending',
                    images: allImages ? localUrls : [],
                    files: allImages ? [] : files.map((f, i) => ({ name: f.name, url: localUrls[i], size: (f.size / 1024).toFixed(2) + ' KB' })),
                    read_list: [myId || ''],
                };
                set(state => ({ messages: [...state.messages, optimisticMsg] }));

                try {
                    const attachment = await Promise.all(files.map(toBase64Map));

                    const res = await chatClient.post(routes.CHAT_ATTACHMENT, {
                        conversation_id: activeConversationId,
                        sender_id: myId || '',
                        content_type: contentType,
                        username,
                        teamname,
                        domain: domain || 'demouat',
                        attachment,
                    });

                    console.log('[sendAttachment] response:', res.data);
                    // Refresh messages to get real server URLs
                    await get().fetchMessages(activeConversationId);
                } catch (err: any) {
                    console.error('[sendAttachment] FAILED:', err.response?.data || err.message);
                    // Remove optimistic message on failure
                    set(state => ({ messages: state.messages.filter(m => m.syskey !== tempSyskey), error: err.message }));
                } finally {
                    // Release object URLs
                    localUrls.forEach(u => URL.revokeObjectURL(u));
                }
            },

            editMessage: async (conversationId, messageSyskey, content) => {
                try {
                    // Flutter: EditMessageReq.toJson()
                    // { user_id, conversation_id, message_id, content, username, teamname, domain, type: 1 (MsgType.edit) }
                    const { userId, domain, user } = useAuthStore.getState();
                    const activeConv = get().conversations.find(c => c.syskey === conversationId);
                    const username = user?.name || userId || '';
                    const teamname = activeConv?.group_name || '';

                    const res = await chatClient.post(routes.CHAT_EDIT_MSG, {
                        user_id: userId || '',
                        conversation_id: conversationId,
                        message_id: messageSyskey,       // ← not "syskey"
                        content,
                        username,
                        teamname,
                        domain: domain || 'demouat',
                        type: 1,                         // MsgType.edit index
                    });
                    if (res.data?.status === 200 || res.status === 200) {
                        await get().fetchMessages(conversationId);
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.error('Failed to edit message', err);
                    return false;
                }
            },

            deleteMessage: async (conversationId, messageSyskey) => {
                try {
                    const { userId, domain, user } = useAuthStore.getState();
                    const activeConv = get().conversations.find(c => c.syskey === conversationId);
                    const username = user?.name || userId || '';
                    const teamname = activeConv?.group_name || '';

                    // Optimistic update: patch single message in-place (matches Flutter's copyWith(deleteFlag: 4))
                    set(state => ({
                        messages: state.messages.map(m =>
                            m.syskey === messageSyskey ? { ...m, delete_flag: 4 } : m
                        ),
                    }));

                    const res = await chatClient.post(routes.CHAT_DELETE_MSG, {
                        user_id: userId || '',
                        conversation_id: conversationId,
                        message_id: messageSyskey,
                        status: 4,
                        username,
                        teamname,
                        domain: domain || 'demouat',
                        type: 2,
                    });

                    const httpOk = res.status >= 200 && res.status < 300;
                    console.log('[deleteMessage] response:', res.status, res.data);

                    if (httpOk) {
                        // Flutter DOES NOT refetch after delete — it only patches in-place.
                        // Calling fetchMessages here would overwrite the optimistic update with stale server data.
                        return true;
                    }

                    // Revert optimistic update on API-level failure
                    set(state => ({
                        messages: state.messages.map(m =>
                            m.syskey === messageSyskey ? { ...m, delete_flag: 1 } : m
                        ),
                    }));
                    return false;
                } catch (err: any) {
                    console.error('[deleteMessage] FAILED:', err.response?.data || err.message);
                    // Revert on network error
                    set(state => ({
                        messages: state.messages.map(m =>
                            m.syskey === messageSyskey ? { ...m, delete_flag: 1 } : m
                        ),
                    }));
                    return false;
                }
            },

            addReaction: async (conversationId, messageSyskey, reactionStatus) => {
                try {
                    // Flutter: ChatReactionRequest.toJson()
                    // { user_id, message_id, username, teamname, domain, reaction, appid, type }
                    const { userId, domain, user } = useAuthStore.getState();
                    const activeConv = get().conversations.find(c => c.syskey === conversationId);
                    const username = user?.name || userId || '';
                    const teamname = activeConv?.group_name || '';

                    await chatClient.post(routes.CHAT_REACTION, {
                        user_id: userId || '',
                        message_id: messageSyskey,         // ← message syskey
                        username,
                        teamname,
                        domain: domain || 'demouat',
                        reaction: reactionStatus,           // ← not "status"
                        appid: '004',
                        type: 'single',
                    });
                    await get().fetchMessages(conversationId);
                } catch (err) {
                    console.error('Failed to add reaction', err);
                }
            },

            fetchParticipants: async (conversationId) => {
                try {
                    // Flutter: GET /chat-new/conversations/{id}/participants
                    const url = routes.CHAT_PARTICIPANTS.replace(':id', conversationId);
                    const { token, domain } = useAuthStore.getState();
                    const res = await chatClient.get(url, {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { sub_appid: domain || 'demouat', appid: '004' },
                    });
                    // Flutter enrichment: e['user']['user_id'], e['display_name'], e['role']
                    const rawList: any[] = Array.isArray(res.data)
                        ? res.data
                        : res.data?.data || res.data?.data_list || [];

                    const list = rawList.map((e: any) => ({
                        ...e,
                        // Normalise name: prefer display_name → name → fallback
                        name: (e.display_name && e.display_name !== '')
                            ? e.display_name
                            : (e.name || e.username || ''),
                        // Normalise userid: prefer user.user_id → userid
                        userid: (e.user?.user_id && e.user.user_id !== '')
                            ? e.user.user_id
                            : (e.userid || e.user_id || ''),
                        // Profile image
                        profile: e.profile || e.user?.profile || null,
                        // Role / org status
                        orgStatus: e.role || e.org_status || '',
                    }));

                    set({ conversationParticipants: list });
                    return list;
                } catch (err) {
                    console.error('[fetchParticipants] Failed:', err);
                    return [];
                }
            },

            addParticipants: async (conversationId, userIds, role = 'member', subAppid, shareAll = false) => {
                try {
                    // Flutter: POST /chat-new/add-participants (AddParticipantModel.toJson)
                    const { userId, domain } = useAuthStore.getState();
                    const res = await chatClient.post(routes.CHAT_ADD_PARTICIPANTS, {
                        conversation_id: conversationId,
                        userid: userId || '',           // who is adding
                        role,
                        appid: '004',
                        sub_appid: subAppid || domain || 'demouat',
                        participants: userIds,
                        shareAll,
                    });
                    return res.data?.status === 200 || res.status === 200 || res.data?.success === true;
                } catch (err) {
                    console.error('[addParticipants] Failed:', err);
                    return false;
                }
            },

            removeParticipant: async (conversationId, userId) => {
                try {
                    // Flutter: POST /chat-new/remove-participant (RemoveParticipantModel.toJson)
                    // Payload: { conversation_id, user_id }   ← note: "user_id" not "userid"
                    const res = await chatClient.post(routes.CHAT_REMOVE_PARTICIPANT, {
                        conversation_id: conversationId,
                        user_id: userId,    // matches RemoveParticipantModel.toJson()
                    });
                    return res.data?.status === 200 || res.status === 200 || res.data?.success === true;
                } catch (err) {
                    console.error('[removeParticipant] Failed:', err);
                    return false;
                }
            },

            changeGroupName: async (conversationId, newName) => {
                try {
                    const res = await chatClient.post(routes.CHAT_CHANGE_NAME.replace(':id', conversationId), {
                        conversation_id: conversationId,
                        group_name: newName,
                    });
                    return res.data?.status === 200 || res.status === 200;
                } catch (err) {
                    console.error('Failed to change group name', err);
                    return false;
                }
            },

            markAsRead: async (conversationId, messageId) => {
                try {
                    const { userId } = useAuthStore.getState();

                    // Build payload matching Flutter's ReadMessageModel.toJson():
                    // { user_id, message_id, conversation_id }
                    const payload: Record<string, string> = {
                        conversation_id: conversationId,
                        user_id: userId || '',
                    };

                    // message_id is required by the Flutter API when marking a specific message
                    if (messageId) payload.message_id = messageId;

                    await chatClient.post(routes.CHAT_READ_MSG, payload);

                    // Optimistically update local state — reset count & isRead for this convo
                    set((state) => {
                        const newConvs = state.conversations.map((c) =>
                            c.syskey === conversationId ? { ...c, count: 0, isRead: true } : c
                        );
                        const total = newConvs.reduce((acc, c) => acc + (c.count || 0), 0);
                        return { conversations: newConvs, unreadCount: total as any };
                    });
                } catch (err) {
                    console.error('[markAsRead] Failed:', err);
                }
            },

            markLatestMessageRead: async (conversationId) => {
                const { messages } = get();
                const latestMsg = [...messages]
                    .reverse()
                    .find((m: any) => m.syskey && !String(m.syskey).startsWith('temp_'));
                if (latestMsg?.syskey) {
                    await get().markAsRead(conversationId, latestMsg.syskey);
                }
            },

            searchUsers: async (query) => {
                if (query === null || query === undefined) {
                    set({ searchResults: [] });
                    return;
                }
                set({ isLoading: true });
                try {
                    const authState = useAuthStore.getState();
                    // mainClient interceptor injects userid+domain automatically,
                    // but we also send explicitly to be safe (matches Flutter exactly)
                    const userId = authState.userId ?? authState.user?.userid ?? '';
                    const domain = authState.domain ?? authState.user?.domain ?? '';

                    console.log('[searchUsers] Request:', {
                        userid: userId, domain, searchkey: query
                    });

                    const response = await mainClient.post(routes.CHAT_SEARCH_USER, {
                        userid: userId,
                        domain: domain,
                        searchkey: query,
                        currentpage: 1,
                        pagesize: 50,
                        sortby: 'name',
                        sortorder: 'ASC',
                    });

                    const raw = response.data;
                    console.log('[searchUsers] Raw response:', JSON.stringify(raw)?.slice(0, 500));

                    let users: User[] = [];

                    // Handle every response shape Flutter handles + common wrappers:
                    if (Array.isArray(raw)) {
                        users = raw;
                    } else if (raw?.employeelist && Array.isArray(raw.employeelist)) {
                        users = raw.employeelist;
                    } else if (raw?.data_list && Array.isArray(raw.data_list)) {
                        users = raw.data_list;
                    } else if (raw?.data && Array.isArray(raw.data)) {
                        users = raw.data;
                    } else if (raw?.data?.employeelist && Array.isArray(raw.data.employeelist)) {
                        // { status, data: { employeelist: [...], totalCount: N } }
                        users = raw.data.employeelist;
                    } else if (raw?.data?.data_list && Array.isArray(raw.data.data_list)) {
                        users = raw.data.data_list;
                    } else if (raw?.datalist && Array.isArray(raw.datalist)) {
                        users = raw.datalist;
                    }

                    console.log('[searchUsers] Parsed users count:', users.length);
                    set({ searchResults: users, isLoading: false });
                } catch (err) {
                    console.error('[searchUsers] Error:', err);
                    set({ isLoading: false });
                }
            },



            fetchTeams: async (userId) => {
                set({ isLoading: true });
                try {
                    const response = await mainClient.post(routes.TEAM_LIST, {
                        userid: userId,
                    });
                    const teamsRaw = (response.data?.data?.teamList ?? []) as any[];
                    const teams: Team[] = teamsRaw.map((t) => ({
                        teamId: String(t.teamId ?? t.teamid ?? ''),
                        teamName: String(t.teamName ?? t.teamname ?? ''),
                        syskey: String(t.syskey ?? t.sysKey ?? ''),
                        key: userId,
                    }));
                    set({ userTeams: teams, isLoading: false });
                } catch (err) {
                    set({ isLoading: false });
                }
            },

            createChat: async (payload) => {
                try {
                    // Map camelCase payload → Flutter's snake_case API fields
                    // (mirrors CreateChatModel.toJson() in chat_model.dart)
                    const body = {
                        user_id: payload.userId,
                        participants: payload.participants,
                        appid: payload.appid,
                        sub_appid: payload.subAppid,
                        name: payload.name,
                        group_name: payload.groupName,
                        role: payload.role,
                        type: payload.type,
                        is_group: payload.isGroup,
                        action_type: payload.actionType,
                        adminkey: payload.adminkey,
                    };
                    console.log('[createChat] Payload:', body);
                    const res = await chatClient.post(routes.CHAT_CREATE, body);
                    console.log('[createChat] Response:', JSON.stringify(res.data)?.slice(0, 300));
                    // Flutter returns: { status, data: { conversation_id } } OR { status, data: "<id>" }
                    const conversationId =
                        res.data?.data?.conversation_id ||
                        res.data?.conversation_id ||
                        res.data?.data;
                    if (conversationId) {
                        return conversationId;
                    }
                    return null;
                } catch (err: any) {
                    // 409 Conflict = conversation already exists — extract the id from the error body
                    const errData = err?.response?.data;
                    const existingId =
                        errData?.data?.conversation_id ||
                        errData?.conversation_id ||
                        errData?.data;
                    if (existingId) {
                        console.log('[createChat] 409 Conflict — returning existing conversation:', existingId);
                        return existingId;
                    }
                    console.error('[createChat] Error:', err?.response?.status, errData);
                    return null;
                }
            },

            getConversationByUniqueName: async (name) => {
                try {
                    console.log('[getConversationByUniqueName] bookingkey:', name);
                    const res = await chatClient.post(routes.CHAT_CONV_BY_NAME, {
                        bookingkey: name
                    });
                    console.log('[getConversationByUniqueName] Response:', JSON.stringify(res.data)?.slice(0, 300));
                    // Flutter returns: { status, data: { conversation_id } }
                    return (
                        res.data?.data?.conversation_id ||
                        res.data?.conversation_id ||
                        null
                    );
                } catch (err: any) {
                    // 409 Conflict = conversation already exists on the server
                    // The error response body may contain the existing conversation_id
                    const errData = err?.response?.data;
                    const existingId =
                        errData?.data?.conversation_id ||
                        errData?.conversation_id ||
                        null;
                    if (existingId) {
                        console.log('[getConversationByUniqueName] 409: found existing id:', existingId);
                        return existingId;
                    }
                    console.log('[getConversationByUniqueName] Not found, status:', err?.response?.status);
                    return null;
                }
            },

            // ── WebSocket ──────────────────────────────────────────────────────────────
            connectSocket: () => {
                // Register the incoming-message handler (mirrors Flutter handleNewSocketIncoming)
                chatSocket.onMessage((decoded) => {
                    const convId: string = decoded['conversation_id']?.toString() ?? '';
                    if (!convId) return;

                    // Determine message type (Flutter MsgType: 0=send, 1=edit, 2=delete)
                    const msgType = parseInt(decoded['type'] ?? '0', 10);

                    const { userId: myId } = useAuthStore.getState();
                    const senderId: string = decoded['sender_id']?.toString() ?? '';
                    const isFromMe = senderId && myId && senderId === myId;

                    // ── Edit incoming (type=1) ─────────────────────────────────────────
                    if (msgType === 1) {
                        const msgSyskey: string = decoded['syskey']?.toString() ?? '';
                        const newContent: string = decoded['content']?.toString() ?? '';
                        if (!msgSyskey) return;
                        set(state => ({
                            messages: state.messages.map(m =>
                                m.syskey === msgSyskey ? { ...m, content: newContent } : m
                            ),
                        }));
                        return;
                    }

                    // ── Delete incoming (type=2) ───────────────────────────────────────
                    if (msgType === 2) {
                        const msgSyskey: string = decoded['syskey']?.toString() ?? decoded['message_id']?.toString() ?? '';
                        const deleteStatus = parseInt(decoded['status'] ?? '4', 10);
                        if (!msgSyskey) return;
                        set(state => ({
                            messages: state.messages.map(m =>
                                m.syskey === msgSyskey ? { ...m, delete_flag: deleteStatus } : m
                            ),
                        }));
                        return;
                    }

                    // ── New message (type=0 / send) ────────────────────────────────────
                    const msgSyskey: string = decoded['syskey']?.toString() ?? `temp_ws_${Date.now()}`;
                    const content: string = decoded['content']?.toString() ?? '';
                    const sendAt: string = decoded['send_at']?.toString() ?? new Date().toISOString();
                    const senderName: string = decoded['username']?.toString() ?? senderId;
                    const contentType: string = decoded['content_type']?.toString() ?? 'message';
                    const teamname: string = decoded['teamname']?.toString() ?? '';
                    const parentMsgId: string = decoded['parent_message']?.toString() ?? '';

                    const newMsg: any = {
                        syskey: msgSyskey,
                        conversation_id: convId,
                        sender_id: senderId,
                        sender_name: senderName,
                        sender_image: null,
                        content,
                        send_at: sendAt,
                        content_type: contentType,
                        parent_message_id: parentMsgId,
                        parent_message: null,
                        delete_flag: 1,
                        reactions: [],
                        read_ids: [],
                    };

                    const { activeConversationId } = get();

                    if (convId === activeConversationId) {
                        // Active conversation: append message immediately (avoid duplicates by syskey)
                        set(state => {
                            const exists = state.messages.some(m => m.syskey === msgSyskey);
                            if (exists) return state;
                            return { messages: [...state.messages, newMsg] };
                        });

                        // If it's from someone else, mark as read automatically
                        if (!isFromMe) {
                            get().markLatestMessageRead(convId).catch(() => { });
                        }
                    } else {
                        // Non-active conversation: bump unread count + update conversation preview
                        set(state => {
                            const updated = state.conversations.map(c => {
                                if (c.syskey !== convId) return c;
                                const displayContent = teamname
                                    ? `${senderName}: ${content}`
                                    : content;
                                return {
                                    ...c,
                                    content: displayContent,
                                    send_at: sendAt,
                                    isRead: isFromMe ? true : false,
                                    count: isFromMe ? (c.count ?? 0) : (c.count ?? 0) + 1,
                                };
                            });
                            const totalUnread = updated.reduce((acc, c) => acc + (c.count ?? 0), 0);
                            return { conversations: updated, unreadCount: totalUnread };
                        });
                    }
                });

                chatSocket.connect();
            },

            disconnectSocket: () => {
                chatSocket.disconnect();
            },
        }),
        {
            name: 'chat-storage',
            partialize: (state) => ({ activeConversationId: state.activeConversationId }),
        }
    )
);
