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
    message_id?: string;
    parent_comment_id?: string;
    userid?: string;
    user_id?: string;
    comment: string;
    username?: string;
    user?: {
        name: string;
        userid: string;
        image?: string;
    };
    createddate?: string;
    modifieddate?: string;
    total_child_comments?: number;
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
    userid: string;
    content: string;
    domain: string;
    content_type: string[];
    user_domain: string;
    appid?: string;
    image?: Array<{
        caption: string;
        data: string; // base64
    }>;
    file?: Array<{
        caption: string;
        data: string; // base64
    }>;
}

export interface GetPostsResponse {
    posts_count: number;
    posts_data: any[];
}
