/* ═══════════════════════════════════════════════════════════
   Post Models — Derived from Flutter post_model.dart
   ═══════════════════════════════════════════════════════════ */

import type { User } from './chat';

export const PostReactionType = {
    LIKE: 1,
    HEART: 2,
    CARE: 3,
    WOW: 5,
    SAD: 6,
    THANK_YOU: 8,
    ALL: 99
} as const;

export type PostReactionType = typeof PostReactionType[keyof typeof PostReactionType];

export interface PostReaction {
    userid: string;
    username: string;
    action_type: PostReactionType;
    syskey?: string;
    profile?: string;
}

export interface PostAttachment {
    syskey?: string;
    ref_id?: string;
    image_url?: string;
    img_url?: string;
    image_title?: string;
    files?: string;
}

export interface Comment {
    syskey: string;
    post_id: string;
    userid: string;
    comment: string;
    username: string;
    created_date: string;
    n1?: number; // actionType or deleteFlag depending on context
    t1?: string;
    t2?: string;
    profile?: string;
}

export interface ReactionOverview {
    reaction_status: number;
    count: number;
}

export interface Post {
    syskey: string;
    user_id: string;
    name: string;
    content: string;
    post_type: string;
    group_ids: string[];
    user_ids: string[];
    status: number;
    comment_count: number;
    likes_count: number;
    domain: string;
    files: PostAttachment[];
    is_liked: boolean;
    my_reaction_type?: number;
    reactions?: ReactionOverview[]; // per-type breakdown from API
    created_date: string;
    user_info?: User;
    comments?: Comment[];
}

export interface CreatePostPayload {
    user_id: string;
    name: string;
    content: string;
    post_type: string;
    domain: string;
    group_ids?: string[];
    user_ids?: string[];
    appid?: string;
    images?: Array<{
        name: string;
        type: string;
        size: string;
        data: string; // base64
    }>;
}

export interface GetPostsResponse {
    posts_count: number;
    posts_data: any[];
}
