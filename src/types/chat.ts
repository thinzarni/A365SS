/* ═══════════════════════════════════════════════════════════
   Chat Models — Derived from Flutter chat_model.dart
   ═══════════════════════════════════════════════════════════ */

export interface Conversation {
    syskey: string;
    name: string;
    sender_id: string; // This might be the chat name or participant
    sender_user_id: string; // The user who sent the last message
    content: string;
    send_at: string;
    user_id: string;
    role?: string;
    image?: string;
    sender_name?: string; // Prefix for last message, e.g. "Kyaw"
    isRead: boolean;
    count: number;
    group_name?: string;
    content_type?: string;
    opposite_user_name?: string;
    opposite_user_image?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface ChatReaction {
    user_id: string;
    user_name: string;
    status: number;
    syskey: string;
}

export interface Message {
    syskey: string;
    conversation_id: string;
    sender_id: string;
    senderId?: string;       // camelCase alias — some API responses use this
    user_id?: string;        // another alias found in certain chat payloads
    content: string;
    content_type: string;
    send_at: string;
    sender_name: string;
    sender_image: string;
    status: MessageStatus;
    parent_message_id?: string;
    images?: string[];
    files?: string[];
    reactions?: ChatReaction[];
    read_list?: string[];
    delete_flag?: number;
    mentions?: string[];
}

export interface ChatListResponse {
    status: number;
    message: string;
    data: {
        data_list: Conversation[];
        count: number;
    };
}

export interface MessageListResponse {
    status: number;
    message: string;
    data: {
        data_list: {
            message: Message[];
            role: any[];
        };
        count: number;
    };
}

export interface CreateChatPayload {
    userId: string;
    participants: string[];
    groupName: string;
    name: string;
    type: string;
    role: string;
    appid: string;
    subAppid: string;
    isGroup: number;
    actionType: number;
    adminkey: string;
}

export interface User {
    userid: string;
    name: string;
    profile: string;
    eid: string;
    phone?: string;
    syskey: string;
    department: string;
    domain?: string;
    orgStatus?: string;
}

export interface SearchUserResponse {
    status: number;
    message: string;
    data_list: User[];
}
