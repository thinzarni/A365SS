import React, { useEffect, useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
    Send, MoreVertical, MessageSquare, Plus, Search, ChevronLeft, Users, SquarePen,
    File as FileIcon, Settings, UserPlus, X, Download, ZoomIn, ChevronLeft as PrevIcon,
    ChevronRight, Copy, CornerUpLeft, Eye, MoreHorizontal, Trash2, Pencil, Check, CheckCheck,
    Paperclip, ImagePlus, Phone
} from 'lucide-react';

// ── Reaction status mapping from OmniCloud API / Flutter chat_model.dart ──
const REACTION_MAP: Record<number, string> = {
    1: '👍', // Like
    2: '❤️', // Heart
    3: '😆', // Haha
    4: '😮', // Wow
    5: '😢', // Sad
    6: '😠', // Angry
    7: '🥰', // Care
    8: '🙏', // Thank you
};

const REACTION_LABELS: Record<number, string> = {
    1: 'Like', 2: 'Heart', 3: 'Haha', 4: 'Wow', 5: 'Sad', 6: 'Angry', 7: 'Care', 8: 'Thank You',
};

const getReactionEmoji = (r: any) => r.reaction || REACTION_MAP[r.status] || '👍';

const getAttachmentUrl = (item: any) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.url || item.uri || '';
};

const getAttachmentName = (item: any) => {
    if (!item) return '';
    if (typeof item === 'string') return item.split('/').pop() || 'File';
    return item.name || item.filename || 'File';
};

import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chat-store';
import { useAuthStore } from '../../stores/auth-store';
import { useChatSocket } from '../../lib/useChatSocket';
import { NewChatModal } from '../../components/chat/NewChatModal';
import styles from './ChatPage.module.css';

export default function ChatPage() {
    const { t } = useTranslation();
    const {
        conversations,
        activeConversationId,
        messages,
        isLoading,
        error,
        fetchConversations,
        fetchMessages,
        setActiveConversation,
        sendMessage,
        markLatestMessageRead,
        activeParticipants,
        editMessage,
        deleteMessage,
        addReaction,
        fetchParticipants,
        addParticipants,
        removeParticipant,
        changeGroupName,
        searchUsers,
        searchResults,
        sendAttachment,
        getConversationByUniqueName,
        createChat,
        typingStatus,
        hasMoreConversations,
        hasMoreMessages,
    } = useChatStore();

    const { sendTypingIndicator } = useChatSocket();

    const { userId } = useAuthStore();
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [showContacts, setShowContacts] = useState(false);  // Flutter ContactPage equivalent
    const [contactSearch, setContactSearch] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);  // files queued for upload
    const [pendingPreviews, setPendingPreviews] = useState<string[]>([]); // object URLs for preview
    const [selectedMessageForReactions, setSelectedMessageForReactions] = useState<any>(null);
    const [activeReactionTab, setActiveReactionTab] = useState<'all' | string>('all');

    // ── Pagination State ───────────────────────────────────────────
    const [convPage, setConvPage] = useState(1);
    const [msgPage, setMsgPage] = useState(1);

    // ── Contact search debounce (mirrors Flutter's _searchUser) ──────
    const [contactChatLoading, setContactChatLoading] = useState(false);
    useEffect(() => {
        if (!showContacts) return;
        const t = setTimeout(() => searchUsers(contactSearch), 350);
        return () => clearTimeout(t);
    }, [contactSearch, showContacts]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Teams-style hover toolbar + dropdown ──────────────────────
    const [moreMenuMsgId, setMoreMenuMsgId] = useState<string | null>(null);
    const [replyToMsg, setReplyToMsg] = useState<any>(null);

    // ── Mention State ──────────────────────────────────────────────
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [filteredMentionUsers, setFilteredMentionUsers] = useState<any[]>([]);
    const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
    const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
    // Long-press (mobile touch only)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [mobileContextMsg, setMobileContextMsg] = useState<any>(null);

    // ── Edit message state ─────────────────────────────────────────
    const [editingMsg, setEditingMsg] = useState<any>(null);
    const [editText, setEditText] = useState('');

    // ── Read-by modal ──────────────────────────────────────────────
    const [readByMsg, setReadByMsg] = useState<any>(null);

    // ── Delete confirmation modal ──────────────────────────────────
    const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<any>(null);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    // ── Participants panel ─────────────────────────────────────────
    const [showParticipants, setShowParticipants] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [participantSearch, setParticipantSearch] = useState('');

    // ── Add participants ───────────────────────────────────────────
    const [showAddParticipants, setShowAddParticipants] = useState(false);
    const [addParticipantSearch, setAddParticipantSearch] = useState('');
    const [selectedToAdd, setSelectedToAdd] = useState<any[]>([]);

    // ── Change group name modal ────────────────────────────────────
    const [showChangeGroupName, setShowChangeGroupName] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [groupNameLoading, setGroupNameLoading] = useState(false);

    // ── Local group name override (after rename) ───────────────────
    const [localGroupName, setLocalGroupName] = useState<string | null>(null);

    // Build a participant map: userId → participant data
    const participantMap = useMemo(() => {
        const map: Record<string, any> = {};
        for (const p of activeParticipants) {
            map[p.sender_id || p.userid] = p;
        }
        for (const p of participants) {
            map[p.userid || p.sender_id] = p;
        }
        return map;
    }, [activeParticipants, participants]);

    // ── Mention Filtering ──────────────────────────────────────────
    useEffect(() => {
        if (mentionQuery === null) {
            setFilteredMentionUsers([]);
            return;
        }

        const query = mentionQuery.toLowerCase();
        const results = activeParticipants.filter(p =>
            p.sender_id !== userId &&
            (p.sender_name || '').toLowerCase().includes(query)
        );

        // Include @Everyone if query is "everyone" or empty and there's enough people
        if (activeParticipants.length > 2 && ('everyone'.includes(query) || query === '')) {
            results.unshift({
                sender_id: 'everyone',
                sender_name: 'Everyone',
                isSpecial: true
            });
        }

        setFilteredMentionUsers(results);
    }, [mentionQuery, activeParticipants, userId]);

    const QUICK_REACTIONS = [
        { emoji: '👍', label: 'Like', status: 1 },
        { emoji: '❤️', label: 'Heart', status: 2 },
        { emoji: '🥰', label: 'Care', status: 7 },
        { emoji: '😆', label: 'Haha', status: 3 },
        { emoji: '😮', label: 'Wow', status: 4 },
    ] as const;

    // Touch long-press (mobile)
    const startLongPress = useCallback((msg: any) => {
        longPressTimer.current = setTimeout(() => setMobileContextMsg(msg), 600);
    }, []);
    const cancelLongPress = useCallback(() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }, []);
    const closeMobileContext = useCallback(() => setMobileContextMsg(null), []);

    const handleCopyMessage = useCallback((msg: any) => {
        if (msg?.content) navigator.clipboard.writeText(msg.content).catch(() => { });
        setMoreMenuMsgId(null);
        closeMobileContext();
    }, [closeMobileContext]);

    const handleReplyToMessage = useCallback((msg: any) => {
        setReplyToMsg(msg);
        setMoreMenuMsgId(null);
        closeMobileContext();
    }, [closeMobileContext]);

    const handleQuickReaction = useCallback(async (_emoji: string, status: number, msg?: any) => {
        const target = msg || mobileContextMsg;
        if (target && activeConversationId) {
            await addReaction(activeConversationId, target.syskey, status);
        }
        setMoreMenuMsgId(null);
        closeMobileContext();
    }, [closeMobileContext, mobileContextMsg, activeConversationId, addReaction]);

    const handleEditMessage = useCallback((msg: any) => {
        setEditingMsg(msg);
        setEditText(msg.content || '');
        setMoreMenuMsgId(null);
        closeMobileContext();
    }, [closeMobileContext]);

    const handleSaveEdit = useCallback(async () => {
        if (!editingMsg || !activeConversationId || !editText.trim()) return;
        const ok = await editMessage(activeConversationId, editingMsg.syskey, editText.trim());
        if (ok) {
            setEditingMsg(null);
            setEditText('');
        }
    }, [editingMsg, activeConversationId, editText, editMessage]);

    const handleDeleteMessage = useCallback((msg: any) => {
        if (!activeConversationId) return;
        // Show confirmation modal instead of window.confirm
        setDeleteConfirmMsg(msg);
        setMoreMenuMsgId(null);
        closeMobileContext();
    }, [activeConversationId, closeMobileContext]);

    const confirmDeleteMessage = useCallback(async () => {
        if (!deleteConfirmMsg || !activeConversationId) return;
        setDeleteInProgress(true);
        await deleteMessage(activeConversationId, deleteConfirmMsg.syskey);
        setDeleteInProgress(false);
        setDeleteConfirmMsg(null);
    }, [deleteConfirmMsg, activeConversationId, deleteMessage]);

    const handleShowReadBy = useCallback((msg: any) => {
        setReadByMsg(msg);
        setMoreMenuMsgId(null);
        closeMobileContext();
    }, [closeMobileContext]);

    // Load participants when panel opens
    const handleOpenParticipants = useCallback(async () => {
        if (!activeConversationId) return;
        setShowParticipants(true);
        setParticipantsLoading(true);
        const list = await fetchParticipants(activeConversationId);
        setParticipants(list);
        setParticipantsLoading(false);
    }, [activeConversationId, fetchParticipants]);

    const handleRemoveParticipant = useCallback(async (p: any) => {
        if (!activeConversationId) return;
        const confirmed = window.confirm(`Remove ${p.name || p.userid}?`);
        if (confirmed) {
            const ok = await removeParticipant(activeConversationId, p.userid);
            if (ok) setParticipants(prev => prev.filter(x => x.userid !== p.userid));
        }
    }, [activeConversationId, removeParticipant]);

    const handleAddParticipants = useCallback(async () => {
        if (!activeConversationId || selectedToAdd.length === 0) return;
        const userIds = selectedToAdd.map((u: any) => u.userid);
        const ok = await addParticipants(activeConversationId, userIds);
        if (ok) {
            setShowAddParticipants(false);
            setSelectedToAdd([]);
            setAddParticipantSearch('');
            // Refresh participant list
            const list = await fetchParticipants(activeConversationId);
            setParticipants(list);
        }
    }, [activeConversationId, selectedToAdd, addParticipants, fetchParticipants]);

    const handleChangeGroupName = useCallback(async () => {
        if (!activeConversationId || !newGroupName.trim()) return;
        setGroupNameLoading(true);
        const ok = await changeGroupName(activeConversationId, newGroupName.trim());
        if (ok) {
            setLocalGroupName(newGroupName.trim());
            setShowChangeGroupName(false);
            setNewGroupName('');
        }
        setGroupNameLoading(false);
    }, [activeConversationId, newGroupName, changeGroupName]);

    // Debounced user search for add-participant modal
    useEffect(() => {
        if (!showAddParticipants) return;
        const timer = setTimeout(() => {
            if (addParticipantSearch.length >= 2) {
                searchUsers(addParticipantSearch);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [addParticipantSearch, showAddParticipants, searchUsers]);

    // Close the more-menu when clicking elsewhere
    useEffect(() => {
        if (!moreMenuMsgId) return;
        const close = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('[data-moremenu]')) setMoreMenuMsgId(null);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [moreMenuMsgId]);

    // \u2500\u2500 Send with attachments handler \u2500\u2500
    const handleSendWithAttachments = useCallback(async () => {
        if (pendingFiles.length === 0) return;
        // If there's also text typed, send it first as a regular message
        if (inputText.trim()) {
            await sendMessage(inputText.trim(), 'text', replyToMsg?.syskey, selectedMentionIds);
            setInputText('');
            setReplyToMsg(null);
            setSelectedMentionIds([]);
        }
        await sendAttachment(pendingFiles);
        // Clean up object URLs to release memory
        pendingPreviews.forEach(u => URL.revokeObjectURL(u));
        setPendingFiles([]);
        setPendingPreviews([]);
    }, [pendingFiles, pendingPreviews, inputText, replyToMsg, sendMessage, sendAttachment, selectedMentionIds]);

    // Image lightbox viewer state
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const lightboxOpen = lightboxImages.length > 0;

    const openLightbox = useCallback((images: any[], startIndex = 0) => {
        const urls = images.map(getAttachmentUrl).filter(Boolean);
        setLightboxImages(urls);
        setLightboxIndex(startIndex);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxImages([]);
        setLightboxIndex(0);
    }, []);

    const lightboxPrev = useCallback(() => {
        setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length);
    }, [lightboxImages.length]);

    const lightboxNext = useCallback(() => {
        setLightboxIndex(i => (i + 1) % lightboxImages.length);
    }, [lightboxImages.length]);

    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') lightboxPrev();
            if (e.key === 'ArrowRight') lightboxNext();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [lightboxOpen, closeLightbox, lightboxPrev, lightboxNext]);

    useEffect(() => {
        setConvPage(1);
        fetchConversations(1);
    }, [fetchConversations]);

    // Periodically refresh conversations sidebar as a safety-net fallback
    // (socket delivers real-time; poll ensures consistency after brief disconnects)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchConversations();
        }, 60000); // every 60s — reduced now that socket handles real-time
        return () => clearInterval(interval);
    }, [fetchConversations]);

    const prevMessagesRef = useRef<number>(0);
    // Track the first-unread message index for the divider (set when conversation first loads)
    const [firstUnreadIndex, setFirstUnreadIndex] = useState<number | null>(null);
    const hasSetUnreadDividerRef = useRef(false);

    useEffect(() => {
        if (activeConversationId) {
            prevMessagesRef.current = 0;
            hasSetUnreadDividerRef.current = false;
            setFirstUnreadIndex(null);
            setMsgPage(1);
            // Safety-net poll for the active conversation (socket handles real-time additions)
            const interval = setInterval(() => {
                fetchMessages(activeConversationId, 1);
            }, 30000); // every 30s — reduced from 5s
            return () => clearInterval(interval);
        }
    }, [activeConversationId, fetchMessages]);

    const prevLastMsgIdRef = useRef<string | null>(null);
    const prevFirstMsgIdRef = useRef<string | null>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const prevScrollTopRef = useRef<number>(0);

    // ── Infinite Scroll Handlers ──
    const handleConvListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreConversations && !isLoading) {
            setConvPage(p => {
                const n = p + 1;
                fetchConversations(n);
                return n;
            });
        }
    }, [fetchConversations, hasMoreConversations, isLoading]);

    const handleMsgListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight } = e.currentTarget;
        prevScrollTopRef.current = scrollTop;
        prevScrollHeightRef.current = scrollHeight;

        // Scroll up to load older messages
        if (scrollTop < 50 && hasMoreMessages && !isLoading && activeConversationId) {
            setMsgPage(p => {
                const n = p + 1;
                fetchMessages(activeConversationId, n);
                return n;
            });
        }
    }, [fetchMessages, activeConversationId, hasMoreMessages, isLoading]);

    // Intelligent scroll to bottom + read tracking + preserve position on pagination
    useLayoutEffect(() => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const currentFirstMsgId = messages.length > 0 ? messages[0].syskey : null;
            const currentLastMsgId = messages.length > 0 ? messages[messages.length - 1].syskey : null;

            const isFirstLoad = prevMessagesRef.current === 0;
            const hasNewMessageAtBottom = currentLastMsgId !== prevLastMsgIdRef.current && prevLastMsgIdRef.current !== null;
            const isOlderMessagesPrepended = currentFirstMsgId !== prevFirstMsgIdRef.current && prevFirstMsgIdRef.current !== null;

            // Set the unread divider position on first load of a conversation
            // (marks the boundary between previously-read and new unread messages)
            if (isFirstLoad && messages.length > 0 && !hasSetUnreadDividerRef.current) {
                const activeConvData = conversations.find(c => c.syskey === activeConversationId);
                // If there were unread messages, the divider goes BEFORE the first unread one
                // We approximate: if count > 0, the last `count` messages are unread
                const unreadCount = activeConvData?.count ?? 0;
                if (unreadCount > 0) {
                    const idx = Math.max(0, messages.length - unreadCount);
                    setFirstUnreadIndex(idx);
                }
                hasSetUnreadDividerRef.current = true;
            }

            if (isOlderMessagesPrepended && !hasNewMessageAtBottom && !isFirstLoad) {
                // We loaded older messages at the top! Restore the visual scroll position
                const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
                container.scrollTop = prevScrollTopRef.current + heightDiff;
            } else {
                const isNearBottom = prevScrollHeightRef.current - prevScrollTopRef.current - container.clientHeight < 100;
                const lastMessageIsMine = messages.length > 0 && messages[messages.length - 1]?.sender_id === userId;

                if (isFirstLoad || (hasNewMessageAtBottom && (isNearBottom || lastMessageIsMine))) {
                    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
                }
            }

            // Auto mark-read when near bottom and new messages arrive
            const isNearBottomNow = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (hasNewMessageAtBottom && isNearBottomNow && activeConversationId) {
                markLatestMessageRead(activeConversationId);
                // Clear the divider once user has scrolled to bottom and read new messages
                setFirstUnreadIndex(null);
            }

            prevMessagesRef.current = messages.length;
            prevLastMsgIdRef.current = currentLastMsgId;
            prevFirstMsgIdRef.current = currentFirstMsgId;
            prevScrollHeightRef.current = container.scrollHeight;
            prevScrollTopRef.current = container.scrollTop;
        }
    }, [messages, userId, activeConversationId, conversations, markLatestMessageRead]);

    // Close settings dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showSettings && !(e.target as HTMLElement).closest(`.${styles.roomSettings}`)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings]);

    const handleSelectConv = (id: string) => {
        // Optimistically clear the unread badge immediately (before API responds)
        useChatStore.setState(state => ({
            conversations: state.conversations.map(c =>
                c.syskey === id ? { ...c, count: 0, isRead: true } : c
            ),
            unreadCount: state.conversations
                .filter(c => c.syskey !== id)
                .reduce((acc, c) => acc + (c.count || 0), 0),
        }));
        setActiveConversation(id);
        fetchMessages(id);
        setLocalGroupName(null);
        // Clear any lingering input state from the previous conversation
        setReplyToMsg(null);
        setEditingMsg(null);
        setEditText('');
        setInputText('');
        setMoreMenuMsgId(null);
    };

    // ── Mention Helpers ───────────────────────────────────────────
    const handleSelectMention = (user: any) => {
        const text = editingMsg ? editText : inputText;
        const before = text.substring(0, mentionCursorPos);
        const after = text.substring(mentionCursorPos + (mentionQuery?.length || 0));

        // Use @Name text
        const mentionText = `@${user.sender_name} `;
        const newText = before + mentionText + after;

        if (editingMsg) {
            setEditText(newText);
        } else {
            setInputText(newText);
        }

        if (user.sender_id === 'everyone') {
            const allIds = activeParticipants
                .map(p => p.sender_id)
                .filter(id => id !== userId);
            setSelectedMentionIds(prev => Array.from(new Set([...prev, ...allIds])));
        } else {
            setSelectedMentionIds(prev => Array.from(new Set([...prev, user.sender_id])));
        }

        setMentionQuery(null);
    };

    // Keep selectedMentionIds in sync
    useEffect(() => {
        const text = (editingMsg ? editText : inputText).toLowerCase();
        setSelectedMentionIds(prev => prev.filter(id => {
            const p = activeParticipants.find(ap => ap.sender_id === id);
            if (!p) return false;
            return text.includes(`@${(p.sender_name || '').toLowerCase()}`);
        }));
    }, [inputText, editText, editingMsg, activeParticipants]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const parentId = replyToMsg?.syskey;
        await sendMessage(inputText, 'text', parentId, selectedMentionIds);
        setInputText('');
        setReplyToMsg(null);
        setSelectedMentionIds([]);
    };

    const handleChatCreated = (id: string, groupName?: string, oppositeUserName?: string, oppositeUserImage?: string) => {
        setIsNewChatModalOpen(false);
        // Inject a stub if the new conversation isn't in the list yet
        const alreadyInList = useChatStore.getState().conversations.some(c => c.syskey === id);
        if (!alreadyInList) {
            useChatStore.setState(state => ({
                conversations: [
                    {
                        syskey: id,
                        name: id,
                        opposite_user_name: oppositeUserName || '',
                        group_name: groupName || '',
                        image: oppositeUserImage || null,
                        sender_id: '',
                        content: '',
                        send_at: new Date().toISOString(),
                        count: 0,
                        isRead: true,
                    } as any,
                    ...state.conversations,
                ],
            }));
        }
        handleSelectConv(id);
        // Refresh the list in background to hydrate real conversation data
        fetchConversations();
    };

    // Also fall back to the Zustand store directly in case a stub was just injected
    // but the React subscription hasn't re-rendered yet (timing issue after contact chat creation)
    const activeConv = conversations.find(c => c.syskey === activeConversationId)
        ?? useChatStore.getState().conversations.find(c => c.syskey === activeConversationId);
    const activeConvName = localGroupName || activeConv?.group_name || activeConv?.opposite_user_name || activeConv?.name || '';

    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            const searchStr = (c.group_name || c.opposite_user_name || c.name || '').toLowerCase();
            return searchStr.includes(searchQuery.toLowerCase());
        });
    }, [conversations, searchQuery]);

    const formatMessage = (content: string) => {
        if (!content) return '';
        // Same as Flutter's r'@([A-Za-z0-9_.\- ]+?)(?=[ \n\r\t,.:;!?()]|$)'
        // but simplified for JS split. 
        // Handles @Kyaw Phyo, @Arkar-Phyo etc.
        const parts = content.split(/(@[a-zA-Z0-9_\-\. ]+?)(?=[ \n\r\t,.:;!?()]|$)/g);
        return parts.map((part, i) => {
            if (part && part.startsWith('@')) {
                return <span key={i} className={styles.mention}>{part}</span>;
            }
            return part;
        });
    };

    const getInitials = (name: string) => (name || '?').charAt(0).toUpperCase();

    // ── Read status icon (like Flutter) ─────────────────────────
    const renderReadStatus = (msg: any) => {
        if (msg.delete_flag === 4) return null;
        // Robust compare: normalize both sides to string, trim, lowercase
        const myId = String(userId || '').trim().toLowerCase();
        const senderId = String(msg.sender_id || msg.user_id || msg.senderId || '').trim().toLowerCase();
        const isMe = myId && senderId && myId === senderId;
        if (!isMe) return null;

        const readList: string[] = msg.read_list || [];
        const otherReaders = readList.filter((id: string) => String(id).trim().toLowerCase() !== myId);
        const totalOthers = activeParticipants.length;

        if (otherReaders.length === 0) {
            return <Check size={13} style={{ color: '#94a3b8', marginLeft: 3 }} aria-label="Sent" />;
        }
        if (totalOthers > 0 && otherReaders.length >= totalOthers) {
            return <CheckCheck size={13} style={{ color: '#3b82f6', marginLeft: 3 }} aria-label="Read by all" />;
        }
        return <CheckCheck size={13} style={{ color: '#94a3b8', marginLeft: 3 }} aria-label={`Read by ${otherReaders.length}`} />;
    };

    // ── Build "Seen by" text for read-by modal ─────────────────────
    const buildReadByText = (readList: string[]) => {
        const names = readList
            .filter(id => id !== userId)
            .map(id => {
                const p = participantMap[id];
                return p?.sender_name || p?.name || id;
            });
        if (names.length === 0) return 'Not seen yet';
        if (names.length <= 3) return `Seen by ${names.join(', ')}`;
        return `Seen by ${names.slice(0, 3).join(', ')} +${names.length - 3}`;
    };

    return (
        <div className={styles.chatPage}>
            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.headerTop}>
                        <h1 className={styles.title}>{t('chat.title')}</h1>
                        <div className={styles.headerActions}>
                            <button className={styles.iconBtn} title="Search">
                                <Search size={22} />
                            </button>
                            <button
                                className={styles.iconBtn}
                                title="Contacts"
                                onClick={() => {
                                    setShowContacts(v => {
                                        if (!v) { searchUsers(''); setContactSearch(''); }
                                        return !v;
                                    });
                                }}
                            >
                                <Users size={22} />
                            </button>
                            <button
                                className={styles.newChatBtn}
                                onClick={() => setIsNewChatModalOpen(true)}
                                title={t('chat.newChat')}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            placeholder={t('chat.searchEmployees')}
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.convList} onScroll={handleConvListScroll}>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    {isLoading && conversations.length === 0 ? (
                        <div className={styles.emptyState}>{t('common.loading')}</div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isUnread = !conv.isRead || conv.count > 0;
                            const isMe = String(conv.sender_user_id || '').trim().toLowerCase() === String(userId || '').trim().toLowerCase();
                            const displayName = conv.group_name || conv.opposite_user_name || conv.name || 'Unknown';

                            let lastMsgPrefix = '';
                            if (isMe) {
                                lastMsgPrefix = 'You: ';
                            } else if (conv.group_name && conv.sender_name) {
                                lastMsgPrefix = `${conv.sender_name}: `;
                            }

                            return (
                                <div
                                    key={conv.syskey}
                                    className={`${styles.convItem} ${activeConversationId === conv.syskey ? styles.convItemActive : ''}`}
                                    onClick={() => handleSelectConv(conv.syskey)}
                                >
                                    <div className={styles.avatar}>
                                        {conv.group_name ? (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white' }}>
                                                <Users size={20} />
                                            </div>
                                        ) : (conv.image || conv.opposite_user_image) ? (
                                            <img src={conv.image || conv.opposite_user_image} alt="" />
                                        ) : (
                                            getInitials(displayName)
                                        )}
                                    </div>

                                    <div className={styles.convInfo}>
                                        <div className={styles.convHeader}>
                                            <span className={`${styles.convName} ${isUnread ? styles.unreadText : ''}`}>
                                                {displayName}
                                            </span>
                                            <span className={styles.convTime}>
                                                {conv.send_at ? (() => {
                                                    const date = new Date(conv.send_at);
                                                    const now = new Date();
                                                    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                                                    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
                                                    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                                })() : ''}
                                            </span>
                                        </div>
                                        <div className={styles.convSubHeader}>
                                            <span className={styles.convLastMsg}>
                                                {lastMsgPrefix}{conv.content || 'No messages yet'}
                                            </span>
                                            {conv.count > 0 ? (
                                                <span className={styles.unreadBadge}>{conv.count}</span>
                                            ) : (
                                                isUnread && <span className={styles.unreadDot} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {filteredConversations.length === 0 && !isLoading && !error && (
                        <div className={styles.emptyState}>{t('chat.noConversations')}</div>
                    )}
                </div>
                <button
                    className={styles.fab}
                    onClick={() => setIsNewChatModalOpen(true)}
                    title={t('chat.newChat')}
                >
                    <SquarePen size={22} />
                </button>

                {/* ── Contacts Panel (mirrors Flutter ContactPage) ── */}
                {showContacts && (
                    <div className={styles.contactsPanel}>
                        {/* Header */}
                        <div className={styles.contactsPanelHeader}>
                            <button
                                className={styles.iconBtn}
                                onClick={() => setShowContacts(false)}
                                title="Back"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <span className={styles.contactsPanelTitle}>Contacts</span>
                        </div>
                        {/* Search */}
                        <div className={styles.contactsPanelSearch}>
                            <Search size={16} className={styles.contactsPanelSearchIcon} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={contactSearch}
                                onChange={e => setContactSearch(e.target.value)}
                                className={styles.contactsPanelSearchInput}
                                autoFocus
                            />
                            {contactSearch && (
                                <button
                                    className={styles.contactsClearBtn}
                                    onClick={() => setContactSearch('')}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {/* List */}
                        <div className={styles.contactsList}>
                            {isLoading && searchResults.length === 0 ? (
                                <div className={styles.contactsEmpty}>Loading...</div>
                            ) : searchResults.length === 0 ? (
                                <div className={styles.contactsEmpty}>
                                    {contactSearch ? 'No employees found' : 'No contacts available'}
                                </div>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user.userid} className={styles.contactRow}>
                                        <div className={styles.contactAvatar}>
                                            {user.profile ? (
                                                <img src={user.profile} alt="" className={styles.contactAvatarImg} />
                                            ) : (
                                                getInitials(user.name)
                                            )}
                                        </div>
                                        <div className={styles.contactInfo}>
                                            <div className={styles.contactName}>{user.name}</div>
                                            <div className={styles.contactMeta}>
                                                {user.userid !== '-' && user.userid ? `${user.userid}${user.eid ? ` (${user.eid})` : ''}` : user.department}
                                            </div>
                                        </div>
                                        <div className={styles.contactActions}>
                                            {user.phone && (
                                                <a
                                                    href={`tel:${user.phone}`}
                                                    className={styles.contactActionBtn}
                                                    title={`Call ${user.name}`}
                                                >
                                                    <Phone size={18} />
                                                </a>
                                            )}
                                            {user.userid !== userId && (
                                                <button
                                                    className={styles.contactActionBtn}
                                                    title={`Message ${user.name}`}
                                                    disabled={contactChatLoading}
                                                    onClick={async () => {
                                                        setContactChatLoading(true);
                                                        try {
                                                            const authState = useAuthStore.getState();
                                                            const domain = authState.domain ?? '';
                                                            const me = authState.userId ?? authState.user?.userid ?? '';

                                                            // Mirror Flutter's MyHelpers.generateChatroomId exactly
                                                            const ids = [me, user.userid].sort();
                                                            const chatroomId = [
                                                                ids[0].replace(/\+/g, ''),
                                                                domain.replace(/\+/g, ''),
                                                                'a365',
                                                                ids[1].replace(/\+/g, ''),
                                                            ].join('_');

                                                            console.log('[ContactChat] chatroomId:', chatroomId, '| me:', me, '| target:', user.userid);

                                                            // Step 1: Check if an existing conversation is already in the list
                                                            // (match by chatroomId stored in the `name` field, or by opposite user)
                                                            const currentConvs = useChatStore.getState().conversations;
                                                            const existingByName = currentConvs.find(c =>
                                                                c.name === chatroomId ||
                                                                (c.opposite_user_name && c.opposite_user_name === user.name && !c.group_name)
                                                            );

                                                            let convSyskey: string | null = existingByName?.syskey ?? null;
                                                            console.log('[ContactChat] existingByName syskey:', convSyskey);

                                                            if (!convSyskey) {
                                                                // Step 2: Ask the server for the conversation_id by bookingkey
                                                                const serverConvId = await getConversationByUniqueName(chatroomId);
                                                                console.log('[ContactChat] serverConvId:', serverConvId);

                                                                if (serverConvId) {
                                                                    // Check if the server's conversation_id matches a syskey in the list
                                                                    const matchInList = currentConvs.find(c => c.syskey === serverConvId);
                                                                    convSyskey = matchInList?.syskey ?? serverConvId;
                                                                }
                                                            }

                                                            if (!convSyskey) {
                                                                // Step 3: Create a brand-new conversation
                                                                convSyskey = await createChat({
                                                                    name: chatroomId,
                                                                    isGroup: 0,
                                                                    type: 'normal',
                                                                    userId: me,
                                                                    role: 'member',
                                                                    participants: [me, user.userid],
                                                                    groupName: '',
                                                                    appid: '004',
                                                                    subAppid: domain,
                                                                    actionType: 1,
                                                                    adminkey: chatroomId,
                                                                });
                                                                console.log('[ContactChat] createChat result:', convSyskey);
                                                            }

                                                            if (convSyskey) {
                                                                // If this conversation isn't in the list yet, inject a stub so the
                                                                // chat room renders immediately without waiting for fetchConversations
                                                                const inList = useChatStore.getState().conversations.some(c => c.syskey === convSyskey);
                                                                if (!inList) {
                                                                    useChatStore.setState(state => ({
                                                                        conversations: [
                                                                            {
                                                                                syskey: convSyskey!,
                                                                                name: chatroomId,
                                                                                opposite_user_name: user.name,
                                                                                group_name: '',
                                                                                image: user.profile ?? null,
                                                                                sender_id: me,
                                                                                content: '',
                                                                                send_at: new Date().toISOString(),
                                                                                count: 0,
                                                                                isRead: true,
                                                                            } as any,
                                                                            ...state.conversations,
                                                                        ],
                                                                    }));
                                                                    console.log('[ContactChat] Stub injected:', convSyskey);
                                                                }
                                                                setShowContacts(false);
                                                                handleSelectConv(convSyskey);
                                                            } else {
                                                                console.error('[ContactChat] Failed to get or create conversation');
                                                            }
                                                        } finally {
                                                            setContactChatLoading(false);
                                                        }
                                                    }}
                                                >
                                                    <MessageSquare size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )
                }
            </aside >

            {/* ── Chat Room ── */}
            <main className={`${styles.chatRoom} ${activeConversationId ? styles.chatRoomActive : ''}`}>
                {
                    activeConv ? (
                        <>
                            <header className={styles.roomHeader}>
                                <button
                                    className={styles.backBtn}
                                    style={{ display: 'none' }}
                                    onClick={() => setActiveConversation(null)}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className={styles.avatar}>
                                    {activeConv.group_name ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white' }}>
                                            <Users size={20} />
                                        </div>
                                    ) : activeConv.image ? (
                                        <img src={activeConv.image} alt="" />
                                    ) : (
                                        getInitials(activeConvName)
                                    )}
                                </div>

                                <div className={styles.roomInfo}>
                                    <h3>{activeConvName}</h3>
                                    <p>{t('chat.online')}</p>
                                </div>
                                <div className={styles.roomSettings}>
                                    <button
                                        className={styles.actionBtn}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px' }}
                                        onClick={() => setShowSettings(!showSettings)}
                                        title="Settings"
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                    {showSettings && (
                                        <div className={styles.dropdownMenu}>
                                            {activeConv.group_name && (
                                                <button className={styles.menuItem} onClick={() => {
                                                    setNewGroupName(activeConvName);
                                                    setShowChangeGroupName(true);
                                                    setShowSettings(false);
                                                }}>
                                                    <div className={styles.menuItemIcon}><SquarePen size={18} /></div>
                                                    <span>Change Group Name</span>
                                                </button>
                                            )}
                                            <button className={styles.menuItem} onClick={() => {
                                                setShowSettings(false);
                                                handleOpenParticipants();
                                            }}>
                                                <div className={styles.menuItemIcon}><UserPlus size={18} /></div>
                                                <span>View Participants</span>
                                            </button>
                                            <button className={styles.menuItem} style={{ color: '#ef4444' }} onClick={() => setShowSettings(false)}>
                                                <div className={styles.menuItemIcon} style={{ color: '#ef4444' }}><Settings size={18} /></div>
                                                <span>Conversation Settings</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </header>

                            <div className={styles.messageList} ref={scrollRef} onScroll={handleMsgListScroll}>
                                {messages.map((msg, idx) => {
                                    const myId = String(userId || '').trim().toLowerCase();
                                    const senderId = String(msg.sender_id || msg.user_id || msg.senderId || '').trim().toLowerCase();
                                    // isMe: robust string comparison (handles numeric IDs, case differences)
                                    const isMe = Boolean(myId && senderId && myId === senderId);
                                    const isDeleted = msg.delete_flag === 4;
                                    // Resolve parent message: prefer embedded parent_message object,
                                    // fall back to looking it up in the message list by syskey.
                                    const parentMsg = (msg as any).parent_message
                                        || (msg.parent_message_id
                                            ? messages.find(m => m.syskey === msg.parent_message_id)
                                            : null);

                                    return (
                                        <React.Fragment key={String(msg.syskey || idx)}>
                                            {/* ── Unread divider ── */}
                                            {firstUnreadIndex !== null && idx === firstUnreadIndex && (
                                                <div className={styles.unreadDivider}>
                                                    <span>NEW MESSAGES</span>
                                                </div>
                                            )}
                                            <div
                                                className={`${styles.messageItem} ${isMe ? styles.messageMe : styles.messageOther}`}
                                                onTouchStart={() => startLongPress(msg)}
                                                onTouchEnd={cancelLongPress}
                                                onTouchMove={cancelLongPress}
                                                onContextMenu={e => { e.preventDefault(); setMobileContextMsg(msg); }}
                                            >
                                                {!isMe && (
                                                    <div className={styles.messageAvatar}>
                                                        {msg.sender_image ? (
                                                            <img src={msg.sender_image} alt="" />
                                                        ) : (
                                                            getInitials(msg.sender_name || 'U')
                                                        )}
                                                    </div>
                                                )}
                                                <div className={styles.messageGroup}>
                                                    {!isMe && activeConv.group_name && (
                                                        <span className={styles.messageSender}>{msg.sender_name}</span>
                                                    )}

                                                    {/* ── Teams hover toolbar ── */}
                                                    {!isDeleted && (
                                                        <div className={`${styles.msgToolbar} ${isMe ? styles.msgToolbarMe : styles.msgToolbarOther}`}>
                                                            {QUICK_REACTIONS.map(r => (
                                                                <button
                                                                    key={r.status}
                                                                    className={styles.msgToolbarEmoji}
                                                                    title={r.label}
                                                                    onClick={e => { e.stopPropagation(); handleQuickReaction(r.emoji, r.status, msg); }}
                                                                >{r.emoji}</button>
                                                            ))}
                                                            <div className={styles.msgToolbarDivider} />
                                                            <button
                                                                className={styles.msgToolbarBtn}
                                                                title="Reply"
                                                                onClick={e => { e.stopPropagation(); handleReplyToMessage(msg); }}
                                                            >
                                                                <CornerUpLeft size={16} strokeWidth={1.8} />
                                                            </button>
                                                            <div style={{ position: 'relative' }} data-moremenu>
                                                                <button
                                                                    className={styles.msgToolbarBtn}
                                                                    title="More options"
                                                                    onClick={e => { e.stopPropagation(); setMoreMenuMsgId(moreMenuMsgId === (msg.syskey || String(idx)) ? null : (msg.syskey || String(idx))); }}
                                                                >
                                                                    <MoreHorizontal size={16} strokeWidth={1.8} />
                                                                </button>
                                                                {moreMenuMsgId === (msg.syskey || String(idx)) && (
                                                                    <div className={`${styles.msgMoreMenu} ${isMe ? styles.msgMoreMenuMe : styles.msgMoreMenuOther}`}>
                                                                        <button className={styles.msgMoreItem} onClick={() => handleCopyMessage(msg)}>
                                                                            <Copy size={15} /> Copy
                                                                        </button>
                                                                        <button className={styles.msgMoreItem} onClick={() => handleReplyToMessage(msg)}>
                                                                            <CornerUpLeft size={15} /> Reply to message
                                                                        </button>
                                                                        {isMe && msg.content && (
                                                                            <button className={styles.msgMoreItem} onClick={() => handleEditMessage(msg)}>
                                                                                <Pencil size={15} /> Edit message
                                                                            </button>
                                                                        )}
                                                                        {isMe && (
                                                                            <button className={`${styles.msgMoreItem} ${styles.msgMoreItemDanger}`} onClick={() => handleDeleteMessage(msg)}>
                                                                                <Trash2 size={15} /> Delete message
                                                                            </button>
                                                                        )}
                                                                        <button className={styles.msgMoreItem} onClick={() => handleShowReadBy(msg)}>
                                                                            <Eye size={15} /> Read by {msg.read_list?.length ?? 0} of {activeParticipants.length}
                                                                        </button>
                                                                        <div className={styles.msgMoreDivider} />
                                                                        <button className={`${styles.msgMoreItem} ${styles.msgMoreCancel}`} onClick={() => setMoreMenuMsgId(null)}>
                                                                            <X size={15} /> Cancel
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={styles.messageBubble}>
                                                        {/* ── Reply quote box ── */}
                                                        {!isDeleted && (msg.parent_message_id || (msg as any).parent_message) && parentMsg && (
                                                            <div className={styles.replyQuote}>
                                                                <span className={styles.replyQuoteSender}>{(parentMsg as any).sender_name || 'Unknown'}</span>
                                                                <span className={styles.replyQuoteContent}>
                                                                    {(parentMsg as any).delete_flag === 4
                                                                        ? 'Original message was deleted'
                                                                        : ((parentMsg as any).content || '[Image/File]')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* ── Deleted message ── */}
                                                        {isDeleted ? (
                                                            <div className={styles.deletedMessage}>
                                                                <Trash2 size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                                                                This message has been deleted.
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {(msg.content_type === 'image' || msg.content_type === '2' || (msg.images && msg.images.length > 0)) && msg.images?.[0] && (
                                                                    <div className={styles.imageGrid}>
                                                                        {(msg.images as any[]).map((img: any, imgIdx: number) => (
                                                                            <div
                                                                                key={imgIdx}
                                                                                className={styles.imageThumb}
                                                                                onClick={e => { e.stopPropagation(); openLightbox(msg.images!, imgIdx); }}
                                                                            >
                                                                                <img
                                                                                    src={getAttachmentUrl(img)}
                                                                                    alt={getAttachmentName(img)}
                                                                                    className={styles.messageImage}
                                                                                />
                                                                                <div className={styles.imageOverlay}>
                                                                                    <ZoomIn size={20} />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {(msg.content_type === 'file' || msg.content_type === '3' || (msg.files && msg.files.length > 0)) && msg.files?.[0] && (
                                                                    <a href={getAttachmentUrl(msg.files[0])} target="_blank" rel="noreferrer" className={styles.messageFile}>
                                                                        <FileIcon size={16} />
                                                                        <span>{getAttachmentName(msg.files[0])}</span>
                                                                    </a>
                                                                )}
                                                                <div className={styles.messageContent}>{formatMessage(msg.content)}</div>
                                                            </>
                                                        )}

                                                        <div className={styles.messageTime}>
                                                            {new Date(msg.send_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {renderReadStatus(msg)}
                                                        </div>
                                                    </div>

                                                    {msg.reactions && msg.reactions.length > 0 && (
                                                        <div className={styles.reactionsList}>
                                                            {msg.reactions.reduce((acc: any[], r: any) => {
                                                                const emoji = getReactionEmoji(r);
                                                                const existing = acc.find(x => x.emoji === emoji);
                                                                if (existing) existing.count++;
                                                                else acc.push({ emoji, count: 1 });
                                                                return acc;
                                                            }, []).map((r, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={styles.reactionItem}
                                                                    title={`Reaction count: ${r.count}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedMessageForReactions(msg);
                                                                        setActiveReactionTab(r.emoji);
                                                                    }}
                                                                >
                                                                    <span>{r.emoji}</span>
                                                                    {r.count > 0 && <span className={styles.reactionCount}>{r.count}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            <div className={styles.inputArea}>
                                {/* ── Pending attachment previews ── */}
                                {pendingFiles.length > 0 && (
                                    <div className={styles.attachPreviewStrip}>
                                        {pendingFiles.map((file, i) => {
                                            const isImg = file.type.startsWith('image/');
                                            return (
                                                <div key={i} className={styles.attachPreviewItem}>
                                                    {isImg ? (
                                                        <img src={pendingPreviews[i]} alt={file.name} className={styles.attachPreviewImg} />
                                                    ) : (
                                                        <div className={styles.attachPreviewFile}>
                                                            <FileIcon size={20} />
                                                            <span className={styles.attachPreviewName}>{file.name}</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        className={styles.attachPreviewRemove}
                                                        onClick={() => {
                                                            URL.revokeObjectURL(pendingPreviews[i]);
                                                            setPendingFiles(prev => prev.filter((_, j) => j !== i));
                                                            setPendingPreviews(prev => prev.filter((_, j) => j !== i));
                                                        }}
                                                        title="Remove"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Reply banner */}
                                {replyToMsg && (
                                    <div className={styles.replyBanner}>
                                        <div className={styles.replyBannerText}>
                                            <span className={styles.replyBannerLabel}>Replying to {replyToMsg.sender_name || 'message'}</span>
                                            <span className={styles.replyBannerContent}>{replyToMsg.content || '[Image]'}</span>
                                        </div>
                                        <button className={styles.replyBannerClose} onClick={() => setReplyToMsg(null)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                                {/* Edit message banner */}
                                {editingMsg && (
                                    <div className={styles.replyBanner} style={{ borderLeftColor: '#f59e0b' }}>
                                        <div className={styles.replyBannerText}>
                                            <span className={styles.replyBannerLabel} style={{ color: '#f59e0b' }}>Editing message</span>
                                            <span className={styles.replyBannerContent}>{editingMsg.content}</span>
                                        </div>
                                        <button className={styles.replyBannerClose} onClick={() => { setEditingMsg(null); setEditText(''); }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* ── Typing Indicator Banner ── */}
                                {activeConversationId && typingStatus[activeConversationId]?.isTyping && (
                                    <div className={styles.replyBanner} style={{ backgroundColor: 'transparent', borderLeft: 'none', padding: '0 12px 0px 12px', minHeight: '20px', marginBottom: '4px' }}>
                                        <div className={styles.replyBannerText} style={{ opacity: 0.7 }}>
                                            <span className={styles.replyBannerContent} style={{ fontSize: '12px', fontStyle: 'italic', fontWeight: 500 }}>
                                                {typingStatus[activeConversationId].username} is typing...
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* ── Mention Suggestions ── */}
                                {mentionQuery !== null && filteredMentionUsers.length > 0 && (
                                    <div className={styles.mentionSuggestions}>
                                        {filteredMentionUsers.map((u) => (
                                            <div
                                                key={u.sender_id}
                                                className={styles.mentionItem}
                                                onClick={() => handleSelectMention(u)}
                                            >
                                                <div className={styles.mentionAvatar}>
                                                    {u.isSpecial ? (
                                                        <Users size={14} />
                                                    ) : u.sender_image ? (
                                                        <img src={u.sender_image} alt="" />
                                                    ) : (
                                                        getInitials(u.sender_name || 'U')
                                                    )}
                                                </div>
                                                <span className={`${styles.mentionName} ${u.isSpecial ? styles.mentionSpecial : ''}`}>
                                                    {u.sender_name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.inputWrapper}>
                                    {/* Hidden file inputs */}
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            const files = Array.from(e.target.files || []);
                                            if (!files.length) return;
                                            const previews = files.map(f => URL.createObjectURL(f));
                                            setPendingFiles(prev => [...prev, ...files]);
                                            setPendingPreviews(prev => [...prev, ...previews]);
                                            e.target.value = ''; // reset so same file can be re-picked
                                        }}
                                    />
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="*/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            const files = Array.from(e.target.files || []);
                                            if (!files.length) return;
                                            const previews = files.map(f => URL.createObjectURL(f));
                                            setPendingFiles(prev => [...prev, ...files]);
                                            setPendingPreviews(prev => [...prev, ...previews]);
                                            e.target.value = '';
                                        }}
                                    />
                                    {/* Attachment buttons */}
                                    <button
                                        className={styles.attachBtn}
                                        onClick={() => imageInputRef.current?.click()}
                                        title="Send image"
                                        type="button"
                                    >
                                        <ImagePlus size={20} />
                                    </button>
                                    <button
                                        className={styles.attachBtn}
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Send file"
                                        type="button"
                                    >
                                        <Paperclip size={20} />
                                    </button>
                                    <input
                                        type="text"
                                        className={styles.inputField}
                                        placeholder={editingMsg ? 'Edit message...' : replyToMsg ? 'Write a reply...' : 'Type your message...'}
                                        value={editingMsg ? editText : inputText}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const pos = e.target.selectionStart || 0;
                                            if (editingMsg) setEditText(val);
                                            else setInputText(val);

                                            if (activeConversationId) {
                                                sendTypingIndicator(activeConversationId, true);
                                            }

                                            // Mention detection
                                            const textBeforeCursor = val.substring(0, pos);
                                            const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\. ]*)$/);
                                            if (mentionMatch) {
                                                setMentionQuery(mentionMatch[1]);
                                                setMentionCursorPos(pos - mentionMatch[0].length);
                                            } else {
                                                setMentionQuery(null);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                if (mentionQuery !== null && filteredMentionUsers.length > 0) {
                                                    // Select first suggestion on Enter if list is open
                                                    e.preventDefault();
                                                    handleSelectMention(filteredMentionUsers[0]);
                                                } else if (pendingFiles.length > 0 && !editingMsg) {
                                                    handleSendWithAttachments();
                                                } else {
                                                    editingMsg ? handleSaveEdit() : handleSend();
                                                }
                                            }
                                            if (e.key === 'Escape') {
                                                if (mentionQuery !== null) {
                                                    setMentionQuery(null);
                                                } else if (editingMsg) {
                                                    setEditingMsg(null);
                                                    setEditText('');
                                                }
                                            }
                                        }}
                                    />

                                    <button
                                        className={styles.sendBtn}
                                        onClick={editingMsg ? handleSaveEdit : (pendingFiles.length > 0 ? handleSendWithAttachments : handleSend)}
                                        disabled={editingMsg ? !editText.trim() : (pendingFiles.length === 0 && !inputText.trim())}
                                    >
                                        {editingMsg ? <Check size={18} /> : <Send size={18} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <MessageSquare size={64} style={{ opacity: 0.1, marginBottom: 20 }} />
                            <h3>{t('chat.selectConversation')}</h3>
                            <p>Stay connected with your team members in real-time.</p>
                            <button className={styles.startBtn} onClick={() => setIsNewChatModalOpen(true)}>
                                {t('chat.newChat')}
                            </button>
                        </div>
                    )}
            </main >

            <NewChatModal
                isOpen={isNewChatModalOpen}
                onClose={() => setIsNewChatModalOpen(false)}
                onChatCreated={handleChatCreated}
            />

            {/* ── Mobile Long-press Sheet (touch only) ─────────────── */}
            {
                mobileContextMsg && (
                    <div className={styles.contextOverlay} onClick={closeMobileContext}>
                        <div className={styles.contextSheet} onClick={e => e.stopPropagation()}>
                            <div className={styles.contextHandle} />
                            <div className={styles.contextReactions}>
                                {QUICK_REACTIONS.map(({ emoji, label, status }) => (
                                    <button key={status} className={styles.contextReactionBtn}
                                        onClick={() => handleQuickReaction(emoji, status, mobileContextMsg)} title={label}>
                                        <span className={styles.contextReactionEmoji}>{emoji}</span>
                                        <span className={styles.contextReactionLabel}>{label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className={styles.contextDivider} />
                            <button className={styles.contextAction} onClick={() => handleCopyMessage(mobileContextMsg)}>
                                <Copy size={20} className={styles.contextActionIcon} />
                                <span>Copy</span>
                            </button>
                            <button className={styles.contextAction} onClick={() => handleReplyToMessage(mobileContextMsg)}>
                                <CornerUpLeft size={20} className={styles.contextActionIcon} />
                                <span>Reply to message</span>
                            </button>
                            {mobileContextMsg.sender_id === userId && mobileContextMsg.content && (
                                <button className={styles.contextAction} onClick={() => handleEditMessage(mobileContextMsg)}>
                                    <Pencil size={20} className={styles.contextActionIcon} />
                                    <span>Edit message</span>
                                </button>
                            )}
                            {mobileContextMsg.sender_id === userId && (
                                <button className={`${styles.contextAction}`} style={{ color: '#ef4444' }} onClick={() => handleDeleteMessage(mobileContextMsg)}>
                                    <Trash2 size={20} className={styles.contextActionIcon} style={{ color: '#ef4444' }} />
                                    <span>Delete message</span>
                                </button>
                            )}
                            {activeConv && (
                                <button className={styles.contextAction} onClick={() => { closeMobileContext(); handleShowReadBy(mobileContextMsg); }}>
                                    <Eye size={20} className={styles.contextActionIcon} />
                                    <span>Read by {mobileContextMsg.read_list?.length ?? 0} of {activeParticipants.length}</span>
                                </button>
                            )}
                            <button className={`${styles.contextAction} ${styles.contextActionCancel}`} onClick={closeMobileContext}>
                                <X size={20} className={styles.contextActionIcon} />
                                <span>Cancel</span>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ── Read-by Modal ──────────────────────────────────────── */}
            {
                readByMsg && (
                    <div className={styles.modalOverlay} onClick={() => setReadByMsg(null)}>
                        <div className={styles.reactorsModal} onClick={e => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h2>Seen by</h2>
                                <button className={styles.closeBtn} onClick={() => setReadByMsg(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            {readByMsg.read_list && readByMsg.read_list.length > 0 ? (
                                <div className={styles.reactorsList}>
                                    {(readByMsg.read_list as string[])
                                        .filter((id: string) => id !== userId)
                                        .map((id: string, i: number) => {
                                            const p = participantMap[id];
                                            const name = p?.sender_name || p?.name || id;
                                            const img = p?.sender_image || p?.profile;
                                            return (
                                                <div key={i} className={styles.reactorItem}>
                                                    <div className={styles.reactorAvatar}>
                                                        {img ? <img src={img} alt="" /> : getInitials(name)}
                                                    </div>
                                                    <div className={styles.reactorName}>{name}</div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                    Not seen yet
                                </div>
                            )}
                            {readByMsg.read_list && readByMsg.read_list.length > 0 && (
                                <div style={{ padding: '12px 20px', fontSize: '13px', color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
                                    {buildReadByText(readByMsg.read_list)}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ── Participants Panel ──────────────────────────────────── */}
            {
                showParticipants && (
                    <div className={styles.modalOverlay} onClick={() => setShowParticipants(false)}>
                        <div className={styles.reactorsModal} onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <div className={styles.modalHeader}>
                                <h2>All Participants</h2>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {activeConv?.group_name && (
                                        <button
                                            className={styles.closeBtn}
                                            title="Add participant"
                                            onClick={() => { setShowParticipants(false); setShowAddParticipants(true); }}
                                            style={{ color: '#3b82f6' }}
                                        >
                                            <UserPlus size={20} />
                                        </button>
                                    )}
                                    <button className={styles.closeBtn} onClick={() => setShowParticipants(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: '8px 16px' }}>
                                <input
                                    type="text"
                                    placeholder="Search participants..."
                                    value={participantSearch}
                                    onChange={e => setParticipantSearch(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                                />
                            </div>
                            {participantsLoading ? (
                                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
                            ) : (
                                <div className={styles.reactorsList}>
                                    {participants
                                        .filter(p => (p.name || p.userid || '').toLowerCase().includes(participantSearch.toLowerCase()))
                                        .map((p, i) => {
                                            const myIdNorm = String(userId || '').trim().toLowerCase();
                                            const pIdNorm = String(p.userid || p.sender_id || p.user_id || '').trim().toLowerCase();
                                            const isCurrentUser = Boolean(myIdNorm && pIdNorm && myIdNorm === pIdNorm);
                                            const roleLabel = p.orgStatus === 'admin' || p.role === 'admin' ? 'Admin'
                                                : p.orgStatus === 'owner' || p.role === 'owner' ? 'Owner'
                                                    : '';
                                            return (
                                                <div key={p.userid || i} className={styles.reactorItem} style={{ justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div className={styles.reactorAvatar}>
                                                            {p.profile ? <img src={p.profile} alt="" /> : getInitials(p.name || 'U')}
                                                        </div>
                                                        <div>
                                                            <div className={styles.reactorName}>
                                                                {p.name || p.userid}
                                                                {isCurrentUser && <span style={{ color: '#64748b', fontSize: 12, marginLeft: 6 }}>(You)</span>}
                                                                {roleLabel && <span style={{ color: '#3b82f6', fontSize: 11, marginLeft: 6, fontWeight: 600 }}>{roleLabel}</span>}
                                                                {(p.orgStatus === 'external' || p.orgStatus === 'external-member') && <span style={{ color: '#ef4444', fontSize: 12, marginLeft: 4 }}>(external)</span>}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.userid}</div>
                                                        </div>
                                                    </div>
                                                    {!isCurrentUser && activeConv?.group_name && (
                                                        <button
                                                            onClick={() => handleRemoveParticipant(p)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                                            title="Remove from group"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>

                            )}
                        </div>
                    </div>
                )
            }

            {/* ── Add Participant Modal ───────────────────────────────── */}
            {
                showAddParticipants && (
                    <div className={styles.modalOverlay} onClick={() => setShowAddParticipants(false)}>
                        <div className={styles.reactorsModal} onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <div className={styles.modalHeader}>
                                <h2>Add Participants</h2>
                                <button className={styles.closeBtn} onClick={() => setShowAddParticipants(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '8px 16px' }}>
                                <input
                                    type="text"
                                    placeholder="Search users to add..."
                                    value={addParticipantSearch}
                                    onChange={e => setAddParticipantSearch(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                                />
                            </div>
                            <div className={styles.reactorsList}>
                                {searchResults
                                    .filter(u => !participants.some(p => p.userid === u.userid))
                                    .map((u, i) => {
                                        const isSelected = selectedToAdd.some(s => s.userid === u.userid);
                                        return (
                                            <div
                                                key={i}
                                                className={styles.reactorItem}
                                                style={{ cursor: 'pointer', background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent', borderRadius: 8 }}
                                                onClick={() => setSelectedToAdd(prev => isSelected ? prev.filter(s => s.userid !== u.userid) : [...prev, u])}
                                            >
                                                <div className={styles.reactorAvatar}>
                                                    {u.profile ? <img src={u.profile} alt="" /> : getInitials(u.name || 'U')}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div className={styles.reactorName}>{u.name}</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{u.userid}</div>
                                                </div>
                                                {isSelected && <Check size={16} style={{ color: '#3b82f6' }} />}
                                            </div>
                                        );
                                    })}
                            </div>
                            {selectedToAdd.length > 0 && (
                                <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
                                    <button
                                        onClick={handleAddParticipants}
                                        style={{ width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Add {selectedToAdd.length} participant{selectedToAdd.length > 1 ? 's' : ''}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ── Change Group Name Modal ─────────────────────────────── */}
            {
                showChangeGroupName && (
                    <div className={styles.modalOverlay} onClick={() => setShowChangeGroupName(false)}>
                        <div className={styles.reactorsModal} onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                            <div className={styles.modalHeader}>
                                <h2>Change Group Name</h2>
                                <button className={styles.closeBtn} onClick={() => setShowChangeGroupName(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '16px 20px' }}>
                                <input
                                    type="text"
                                    placeholder="Enter new group name"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleChangeGroupName()}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 15, marginBottom: 12 }}
                                    autoFocus
                                />
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => setShowChangeGroupName(false)}
                                        style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleChangeGroupName}
                                        disabled={groupNameLoading || !newGroupName.trim()}
                                        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {groupNameLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ── Delete Confirmation Modal ─────────────────────────────── */}
            {
                deleteConfirmMsg && (
                    <div className={styles.modalOverlay} onClick={() => setDeleteConfirmMsg(null)}>
                        <div
                            className={styles.reactorsModal}
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: 360, padding: '28px 24px 20px' }}
                        >
                            <h2 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                                Delete Message
                            </h2>
                            <p style={{ margin: '0 0 24px', fontSize: '0.95rem', color: '#64748b', lineHeight: 1.5 }}>
                                Are you sure you want to delete this message? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setDeleteConfirmMsg(null)}
                                    disabled={deleteInProgress}
                                    style={{
                                        padding: '10px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                        background: 'transparent', cursor: 'pointer', fontWeight: 600,
                                        fontSize: '0.95rem', color: '#475569'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteMessage}
                                    disabled={deleteInProgress}
                                    style={{
                                        padding: '10px 22px', borderRadius: 8, border: 'none',
                                        background: '#ef4444', color: 'white', cursor: 'pointer',
                                        fontWeight: 700, fontSize: '0.95rem',
                                        opacity: deleteInProgress ? 0.6 : 1
                                    }}
                                >
                                    {deleteInProgress ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Image Lightbox Viewer */}
            {
                lightboxOpen && (
                    <div className={styles.lightboxOverlay} onClick={closeLightbox}>
                        <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
                            <div className={styles.lightboxHeader}>
                                <span className={styles.lightboxCounter}>
                                    {lightboxImages.length > 1 ? `${lightboxIndex + 1} / ${lightboxImages.length}` : ''}
                                </span>
                                <div className={styles.lightboxActions}>
                                    <a
                                        href={lightboxImages[lightboxIndex]}
                                        download
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.lightboxBtn}
                                        onClick={e => e.stopPropagation()}
                                        title="Download"
                                    >
                                        <Download size={20} />
                                    </a>
                                    <button className={styles.lightboxBtn} onClick={closeLightbox} title="Close">
                                        <X size={22} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.lightboxImageWrap}>
                                {lightboxImages.length > 1 && (
                                    <button className={`${styles.lightboxNav} ${styles.lightboxNavLeft}`} onClick={lightboxPrev}>
                                        <PrevIcon size={28} />
                                    </button>
                                )}
                                <img
                                    key={lightboxImages[lightboxIndex]}
                                    src={lightboxImages[lightboxIndex]}
                                    alt=""
                                    className={styles.lightboxImage}
                                />
                                {lightboxImages.length > 1 && (
                                    <button className={`${styles.lightboxNav} ${styles.lightboxNavRight}`} onClick={lightboxNext}>
                                        <ChevronRight size={28} />
                                    </button>
                                )}
                            </div>
                            {lightboxImages.length > 1 && (
                                <div className={styles.lightboxThumbs}>
                                    {lightboxImages.map((url, i) => (
                                        <img
                                            key={i}
                                            src={url}
                                            alt=""
                                            className={`${styles.lightboxThumb} ${i === lightboxIndex ? styles.lightboxThumbActive : ''}`}
                                            onClick={() => setLightboxIndex(i)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ── Reactors Modal ──────────────────────────────────────── */}
            {
                selectedMessageForReactions && (
                    <div className={styles.modalOverlay} onClick={() => setSelectedMessageForReactions(null)}>
                        <div className={styles.reactorsModal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h2>Reactions</h2>
                                <button className={styles.closeBtn} onClick={() => setSelectedMessageForReactions(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={styles.tabs}>
                                <button
                                    className={`${styles.tab} ${activeReactionTab === 'all' ? styles.tabActive : ''}`}
                                    onClick={() => setActiveReactionTab('all')}
                                >
                                    All
                                </button>
                                {Array.from(new Set(selectedMessageForReactions.reactions.map((r: any) => getReactionEmoji(r)))).map((emoji: any) => (
                                    <button
                                        key={emoji}
                                        className={`${styles.tab} ${activeReactionTab === emoji ? styles.tabActive : ''}`}
                                        onClick={() => setActiveReactionTab(emoji)}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.reactorsList}>
                                {selectedMessageForReactions.reactions
                                    .filter((r: any) => {
                                        if (activeReactionTab === 'all') return true;
                                        return getReactionEmoji(r) === activeReactionTab;
                                    })
                                    .map((r: any, i: number) => {
                                        const participant = activeParticipants.find((p: any) => p.sender_id === r.user_id);
                                        const emoji = getReactionEmoji(r);
                                        const label = REACTION_LABELS[r.status] || emoji;
                                        return (
                                            <div key={i} className={styles.reactorItem}>
                                                <div className={styles.reactorAvatar}>
                                                    {participant?.sender_image ? (
                                                        <img src={participant.sender_image} alt="" />
                                                    ) : (
                                                        getInitials(r.user_name || 'U')
                                                    )}
                                                    <div className={styles.reactorEmojiBadge}>{emoji}</div>
                                                </div>
                                                <div>
                                                    <div className={styles.reactorName}>{r.user_name || 'Unknown'}</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
