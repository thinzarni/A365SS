/* ═══════════════════════════════════════════════════════════
   Notification Store — mirrors Flutter NotiProvider
   ═══════════════════════════════════════════════════════════ */

import { create } from 'zustand';
import mainClient from '../lib/main-client';
import { useAuthStore } from './auth-store';
import { NOTIFICATION_LIST, NOTIFICATION_READ } from '../config/api-routes';

export interface NotificationModel {
    syskey: string;
    action_userid: string;
    action_user_name: string;
    access_userid: string;
    title: string;
    description: string;
    deeplink: string;
    time: string;
    read_status: boolean;
    from_noti_type: string;
    to_noti_type: string;
    createddate: string;
    modifieddate: string;
    request_syskey: string;
    requesttype: string;
    startdate: string;
    enddate: string;
}

interface NotificationState {
    items: NotificationModel[];
    unreadCount: number;
    isLoading: boolean;
    page: number;
    hasMore: boolean;

    // Actions
    fetchNotifications: (opts?: { isRefresh?: boolean }) => Promise<void>;
    markNotificationRead: (syskey: string) => Promise<void>;
    clearNotifications: () => void;
}

const PAGE_SIZE = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
    items: [],
    unreadCount: 0,
    isLoading: false,
    page: 1,
    hasMore: true,

    clearNotifications: () => set({ items: [], unreadCount: 0, page: 1, hasMore: true }),

    fetchNotifications: async ({ isRefresh = false } = {}) => {
        const { isLoading, hasMore } = get();

        // If a refresh is already running, don't start another one
        if (isRefresh && isLoading) return;

        if (!isRefresh && (!hasMore || isLoading)) return;

        const currentPage = isRefresh ? 1 : get().page;

        // Reset state synchronously before async work
        if (isRefresh) {
            set({ items: [], page: 1, hasMore: true, isLoading: true });
        } else {
            set({ isLoading: true });
        }

        try {
            const { userId, domain } = useAuthStore.getState();
            const res = await mainClient.post(
                `${NOTIFICATION_LIST}?page=${currentPage}&limit=${PAGE_SIZE}`,
                { userid: userId, domain, type: 0 }
            );

            // API may wrap items differently — try every known shape
            const body = res.data;
            let rawList: any[] = [];
            if (Array.isArray(body)) {
                rawList = body;                                   // body IS the array
            } else if (Array.isArray(body?.data)) {
                rawList = body.data;                              // { data: [...] }
            } else if (Array.isArray(body?.data?.data)) {
                rawList = body.data.data;                         // { data: { data: [...] } }
            } else if (Array.isArray(body?.datalist)) {
                rawList = body.datalist;                          // { datalist: [...] }
            }

            const newItems: NotificationModel[] = rawList.map((item) => ({
                syskey: item.syskey ?? '',
                action_userid: item.action_userid ?? '',
                action_user_name: item.action_user_name ?? '',
                access_userid: item.access_userid ?? '',
                title: item.title ?? '',
                description: item.description ?? '',
                deeplink: item.deeplink ?? '',
                time: item.time ?? '',
                // API: false/0/'0' = unread, true/1/'1' = read
                read_status: item.read_status === true || item.read_status === 1 || item.read_status === '1',
                from_noti_type: item.from_noti_type ?? '',
                to_noti_type: item.to_noti_type ?? '',
                createddate: item.createddate ?? '',
                modifieddate: item.modifieddate ?? '',
                request_syskey: item.request_syskey ?? '',
                requesttype: item.requesttype ?? '',
                startdate: item.startdate ?? '',
                enddate: item.enddate ?? '',
            }));

            set((state) => {
                const existing = isRefresh ? [] : state.items;
                // Merge by syskey (newer API data wins)
                const map = new Map<string, NotificationModel>();
                for (const item of existing) map.set(item.syskey, item);
                for (const item of newItems) map.set(item.syskey, item);

                const merged = Array.from(map.values()).sort((a, b) =>
                    b.createddate.localeCompare(a.createddate)
                );

                const unreadCount = merged.filter((i) => !i.read_status).length;

                return {
                    items: merged,
                    unreadCount,
                    page: currentPage + 1,
                    hasMore: newItems.length >= PAGE_SIZE,
                };
            });
        } catch (err) {
            console.error('[NotificationStore] fetchNotifications failed:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    markNotificationRead: async (syskey: string) => {
        // Optimistic update
        set((state) => {
            const items = state.items.map((item) =>
                item.syskey === syskey ? { ...item, read_status: true } : item
            );
            const unreadCount = items.filter((i) => !i.read_status).length;
            return { items, unreadCount };
        });

        try {
            const { userId, domain } = useAuthStore.getState();
            await mainClient.post(`${NOTIFICATION_READ}/${syskey}`, {
                userid: userId,
                domain,
            });
        } catch (err) {
            console.error('[NotificationStore] markNotificationRead failed:', err);
        }
    },
}));
