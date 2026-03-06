/* ═══════════════════════════════════════════════════════════
   Post Store — State management for Feed/Posts
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import chatClient from '../lib/chat-client';
import * as routes from '../config/api-routes';
import { useAuthStore } from './auth-store';
import type { Post, CreatePostPayload } from '../types/post';

interface PostState {
    posts: Post[];
    isLoading: boolean;
    isCreating: boolean;
    error: string | null;
    hasMorePosts: boolean;

    // Actions
    fetchPosts: (page?: number) => Promise<void>;
    createPost: (payload: CreatePostPayload) => Promise<boolean>;
    deletePost: (postId: string) => Promise<boolean>;
    toggleReaction: (postId: string, actionType: number) => Promise<void>;

    // Comments
    fetchComments: (postId: string, page?: number) => Promise<void>;
    createComment: (postId: string, content: string) => Promise<boolean>;
    deleteComment: (postId: string, commentId: string) => Promise<boolean>;
}

export const usePostStore = create<PostState>()(
    persist(
        (set, get) => ({
            posts: [],
            isLoading: false,
            isCreating: false,
            error: null,
            hasMorePosts: true,

            fetchPosts: async (page = 1) => {
                if (page === 1) set({ isLoading: true, error: null });
                try {
                    const { userId, domain, user } = useAuthStore.getState();
                    console.log(user);


                    const response = await chatClient.post(
                        `${routes.POST_LIST}?curPage=${page}&pageSize=20`,
                        {
                            user_id: userId,
                            app_id: '004',
                            domain_id: domain || 'demouat',
                            search: '',
                            type: user?.paycompanysyskey || domain || 'demouat', // Use paycompanysyskey
                        }
                    );

                    const rawData = response.data?.data || response.data;
                    console.log('Posts API Response Body:', rawData);

                    const postsList = rawData?.posts_data || [];

                    const mappedPosts: Post[] = postsList.map((item: any) => {
                        const userInfo = item.user_info || {};
                        const postData = item.post_data || {};
                        const isLiked = postData.myReaction?.reacted || false;
                        const reactionType = postData.myReaction?.reaction_status || null;

                        return {
                            ...postData,
                            syskey: postData.post_id || '',
                            user_id: userInfo.userid || '',
                            name: userInfo.name || 'Unknown User',
                            content: postData.caption || '',
                            created_date: postData.created_at || postData.created_date || '',
                            files: postData.images || postData.files || [],
                            likes_count: item.total_reactions || 0,
                            comment_count: item.total_comments_count || 0,
                            is_liked: isLiked,
                            my_reaction_type: reactionType,
                            reactions: Array.isArray(item.reactions) ? item.reactions : [],
                            user_info: {
                                ...userInfo,
                                profile: userInfo.image || userInfo.profile || '',
                                name: userInfo.name || 'Unknown',
                                user_domain: userInfo.user_domain || ''
                            }
                        };
                    });

                    set(state => {
                        const existingMap = new Map(state.posts.map(p => [p.syskey, p]));
                        if (page > 1) {
                            mappedPosts.forEach(p => {
                                if (!existingMap.has(p.syskey)) existingMap.set(p.syskey, p);
                            });
                        }

                        let finalPosts = page === 1 ? [...mappedPosts] : Array.from(existingMap.values());

                        // Sort by created descending
                        finalPosts.sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

                        return {
                            posts: finalPosts,
                            isLoading: false,
                            hasMorePosts: mappedPosts.length >= 20,
                        };
                    });
                } catch (err: any) {
                    console.error('[fetchPosts] Error:', err);
                    set({ error: err.message, isLoading: false });
                }
            },

            createPost: async (payload) => {
                set({ isCreating: true, error: null });
                try {
                    const { userId, domain, user } = useAuthStore.getState();

                    const finalPayload = {
                        ...payload,
                        user_id: userId,
                        name: user?.name || userId,
                        domain: domain || 'demouat',
                        appid: '004',
                    };

                    const res = await chatClient.post(routes.POST_CREATE, finalPayload);

                    if (res.data) {
                        // Refresh feed instantly
                        await get().fetchPosts(1);
                        set({ isCreating: false });
                        return true;
                    }
                    throw new Error("Failed to create post.");
                } catch (err: any) {
                    set({ error: err.message, isCreating: false });
                    return false;
                }
            },

            deletePost: async (postId) => {
                try {
                    const { userId, domain } = useAuthStore.getState();

                    // Optimistic delete
                    set(state => ({
                        posts: state.posts.filter(p => p.syskey !== postId)
                    }));

                    await chatClient.post(routes.POST_DELETE, {
                        syskey: postId,
                        userid: userId,
                        domain: domain || 'demouat',
                        appid: '004'
                    });

                    return true;
                } catch (err) {
                    console.error('[deletePost] Failed:', err);
                    // Rollback could be handled here by refetching
                    return false;
                }
            },

            toggleReaction: async (postId, actionType) => {
                try {
                    const { userId, domain } = useAuthStore.getState();

                    // Optimistic update — flip the reaction state immediately in UI
                    set(state => ({
                        posts: state.posts.map(p => {
                            if (p.syskey !== postId) return p;
                            const removing = actionType === 0;
                            return {
                                ...p,
                                is_liked: !removing,
                                my_reaction_type: removing ? undefined : actionType,
                                likes_count: removing
                                    ? Math.max(0, (p.likes_count || 0) - 1)
                                    : (p.is_liked ? p.likes_count : (p.likes_count || 0) + 1),
                            };
                        })
                    }));

                    await chatClient.post(routes.POST_REACT, {
                        user_id: userId,
                        app_id: '004',
                        domain_id: domain || 'MIT',
                        message_id: postId,
                        type: 'post',
                        reaction_status: actionType, // PostReactionType enum value, or 0 to unreact
                        image_id: null,
                    });

                    // Silent refetch to sync accurate server state
                    await get().fetchPosts(1);
                } catch (err) {
                    console.error('[toggleReaction] Failed:', err);
                    // If API fails, refetch to revert to correct server state
                    get().fetchPosts(1);
                }
            },

            fetchComments: async (postId, page = 1) => {
                try {
                    const res = await chatClient.post(`${routes.COMMENT_LIST}?curPage=${page}&pageSize=20`, {
                        post_id: postId
                    });

                    const rawComments = res.data?.data_list || res.data || [];

                    set(state => ({
                        posts: state.posts.map(p =>
                            p.syskey === postId
                                ? { ...p, comments: page === 1 ? rawComments : [...(p.comments || []), ...rawComments] }
                                : p
                        )
                    }));
                } catch (err) {
                    console.error('[fetchComments] Failed:', err);
                }
            },

            createComment: async (postId, content) => {
                try {
                    const { userId, domain } = useAuthStore.getState();

                    await chatClient.post(routes.COMMENT_CREATE, {
                        post_id: postId,
                        userid: userId,
                        domain: domain || 'demouat',
                        comment: content,
                        appid: '004'
                    });

                    // Refresh comments for this post
                    await get().fetchComments(postId, 1);
                    return true;
                } catch (err) {
                    console.error('[createComment] Failed:', err);
                    return false;
                }
            },

            deleteComment: async (postId, commentId) => {
                try {
                    const { userId } = useAuthStore.getState();

                    // Optimistic update
                    set(state => ({
                        posts: state.posts.map(p =>
                            p.syskey === postId
                                ? { ...p, comments: (p.comments || []).filter(c => c.syskey !== commentId) }
                                : p
                        )
                    }));

                    await chatClient.post(routes.COMMENT_DELETE, {
                        syskey: commentId,
                        post_id: postId,
                        userid: userId,
                        appid: '004'
                    });

                    return true;
                } catch (err) {
                    console.error('[deleteComment] Failed:', err);
                    return false;
                }
            }
        }),
        {
            name: 'post-storage',
            partialize: (state) => ({ posts: state.posts }), // Only persist posts to avoid loading states caching
        }
    )
);
