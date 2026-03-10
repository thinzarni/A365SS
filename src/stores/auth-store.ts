import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authClient from '../lib/auth-client';
import type { UserProfile, MenuListItem } from '../types/models';

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    userId: string | null;
    domain: string | null;
    domains: any[];
    menuList: MenuListItem[];
    user: UserProfile | null;
    language: 'en' | 'my';
    isAuthenticated: boolean;
    loginType: 'normal' | 'azure' | null;

    // Actions
    login: (data: { token: string; refreshToken?: string; userId: string; domain?: string; domains?: any[]; menuList?: MenuListItem[]; loginType?: 'normal' | 'azure' }) => void;
    setUser: (user: UserProfile) => void;
    setLanguage: (lang: 'en' | 'my') => void;
    switchDomain: (domainId: string, domainName: string) => Promise<void>;
    logout: () => void;
    renewToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            refreshToken: null,
            userId: null,
            domain: null,
            domains: [],
            menuList: [],
            user: null,
            language: 'en',
            isAuthenticated: false,
            loginType: null,

            login: (data) => {
                set({
                    token: data.token,
                    refreshToken: data.refreshToken || null,
                    userId: data.userId,
                    domain: data.domain || null,
                    domains: data.domains || [],
                    menuList: data.menuList || [],
                    isAuthenticated: true,
                    loginType: data.loginType ?? null,
                });
            },

            setUser: (user) => set({ user }),
            setLanguage: (lang) => set({ language: lang }),
            switchDomain: async (domainId, domainName) => {
                const { token, userId, user } = get();
                if (!token || !userId) return;

                try {
                    const { APP_ID } = await import('../lib/auth-token');

                    const menuRes = await authClient.post('get-menu', {
                        usersyskey: user?.usersyskey || '',
                        role: user?.role || '',
                        user_id: userId,
                        app_id: APP_ID,
                        domain: domainId,
                        type: userId,
                        domain_name: domainName,
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const data = menuRes.data;
                    if (data.access_token) {
                        const fetchedMenuList = data.datalist || data.data?.datalist || data.cards || [];

                        set({
                            token: data.access_token,
                            refreshToken: data.refresh_token || null,
                            domain: domainId,
                            menuList: fetchedMenuList,
                        });

                        set((state) => ({
                            user: state.user ? { ...state.user, domainName } : null
                        }));

                        // Optional: Clear other stores or trigger re-fetch if needed
                        // For example, if you have a way to reset React Query cache
                    }
                } catch (error) {
                    console.error('Failed to switch domain:', error);
                    throw error;
                }
            },

            logout: () => {
                set({
                    token: null,
                    refreshToken: null,
                    userId: null,
                    domain: null,
                    domains: [],
                    menuList: [],
                    user: null,
                    isAuthenticated: false,
                });
            },

            renewToken: async () => {
                const { refreshToken, userId } = get();
                if (!refreshToken || !userId) throw new Error('No refresh token available');

                try {
                    const res = await authClient.post('renew-token', {
                        refresh_token: refreshToken,
                        userid: userId,
                    });

                    if (res.data?.access_token) {
                        set({
                            token: res.data.access_token,
                            refreshToken: res.data.refresh_token || refreshToken,
                        });
                    } else {
                        throw new Error('Failed to refresh token');
                    }
                } catch (error) {
                    console.error('Renew token failed:', error);
                    throw error;
                }
            },
        }),
        {
            name: 'a365-auth',
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                userId: state.userId,
                domain: state.domain,
                domains: state.domains,
                menuList: state.menuList,
                user: state.user,
                language: state.language,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
