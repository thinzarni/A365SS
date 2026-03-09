import React, { useState, useEffect } from 'react';
import { useLocation, NavLink, Outlet, useNavigate, ScrollRestoration } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    ClipboardList,
    CheckSquare,
    Calendar,
    Receipt,
    Palmtree,
    TreePalm,
    LogOut,
    Menu,
    X,
    Globe,
    Users,
    CalendarDays,
    MessageSquare,
    ChevronDown,
    Check,
    Loader2,
    LayoutList,
    Clock,
    Briefcase,
    ShieldCheck,
    UserCheck,
    MapPin,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useChatStore } from '../../stores/chat-store';
import { useMsal } from '@azure/msal-react';
import authClient from '../../lib/auth-client';
import mainClient from '../../lib/main-client';
import apiClient from '../../lib/api-client';
import { APP_ID } from '../../lib/auth-token';
import styles from './AppLayout.module.css';

// ── Router → Lucide icon mapping — keyed by actual API router values ──
// The label always comes from the API name field, so only the icon is needed here.
// Any router not listed gets a generic LayoutList icon.
const ROUTER_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    // Dashboard
    '/': LayoutDashboard,
    '/dashboard': LayoutDashboard,
    // Requests & approvals
    '/request': ClipboardList,
    '/requests': ClipboardList,
    '/approval': CheckSquare,
    '/approvals': CheckSquare,
    '/attendanceapproval': ShieldCheck,
    '/attendancerequest': UserCheck,
    '/locationapproval': MapPin,
    // Leave
    '/leave': TreePalm,
    '/leave-summary': Palmtree,
    '/holiday': CalendarDays,
    '/holidays': CalendarDays,
    // Finance
    '/claim': Receipt,
    '/claims': Receipt,
    '/overtime': Clock,
    // Reservations
    '/reservation': Calendar,
    '/reservations': Calendar,
    // People
    '/team': Users,
    '/hrview': Users,
    // Comms
    '/chat': MessageSquare,
    // Admin
    '/admin': Briefcase,
    // Catch-all
    '/visionai': LayoutList,
    '/customai': LayoutList,
    '/rulesandreg': LayoutList,
    '/objectdetection': LayoutList,
};

// Fallback: shown when API hasn't loaded yet
const DEFAULT_ROUTERS = [
    '/request', '/approval', '/reservation', '/leave',
    '/claim', '/holiday', '/chat', '/team',
];

// Shape of one API menu item (datalist entry from hxm/integration/get/menuitems)
type ApiMenuItem = {
    syskey: string;
    name: string;
    namemm?: string;
    icon: string;
    router: string;
    type?: number;
    buttonright?: string;
};


export default function AppLayout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { instance } = useMsal();
    const { user, domain, domains, token, userId, login, setUser, logout, menuList, setLanguage } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDomainMenu, setShowDomainMenu] = useState(false);
    const [switchingDomainId, setSwitchingDomainId] = useState<string | null>(null);

    const location = useLocation();
    const isChatPage = location.pathname.startsWith('/chat');

    // Fetch Profile data for Avatar
    const { data: profile } = useQuery({
        queryKey: ['employee-profile', user?.usersyskey],
        queryFn: async () => {
            if (!user?.usersyskey) return null;
            try {
                const res = await mainClient.post('api/employees/profile');
                return res.data?.data ?? res.data ?? null;
            } catch {
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!user?.usersyskey
    });

    // ── Fetch menu items from HXM API (same as neo_service.dart getMenuItems) ──
    // Endpoint: GET hxm/integration/get/menuitems
    // Response shape: { statuscode, datalist: [{syskey, name, icon, router, type}...], homemenulist: [...] }
    const { data: menuItemsData } = useQuery({
        queryKey: ['menu-items', userId, domain],
        queryFn: async () => {
            if (!token) return null;
            try {
                const res = await apiClient.get('hxm/integration/get/menuitems');
                const data = res.data;
                if (data?.statuscode === 200 || data?.statuscode === 300) {
                    return {
                        // datalist = sidebar menu; homemenulist = home screen cards
                        datalist: (data.datalist ?? []) as ApiMenuItem[],
                        homemenulist: (data.homemenulist ?? []) as ApiMenuItem[],
                    };
                }
                return null;
            } catch {
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!token && !!userId,
    });

    // Build ordered datalist items for the sidebar.
    // Priority: live API datalist → Zustand menuList items → DEFAULT_ROUTERS as stubs
    const sidebarItems: ApiMenuItem[] = React.useMemo(() => {
        if (menuItemsData?.datalist && menuItemsData.datalist.length > 0) {
            // All items from API, excluding dashboard (rendered separately)
            return menuItemsData.datalist.filter(
                item => item.router && item.router !== '/' && item.router !== '/dashboard'
            );
        }
        if (menuList.length > 0) {
            return menuList
                .filter(m => m.router && m.router !== '/' && m.router !== '/dashboard')
                .map(m => ({ syskey: m.id, name: m.label, icon: m.iconPath || '', router: m.router! }));
        }
        // Fallback: build stub items from DEFAULT_ROUTERS
        return DEFAULT_ROUTERS.map(r => ({ syskey: r, name: r.replace('/', ''), icon: '', router: r }));
    }, [menuItemsData, menuList]);

    // Sync Profile data to authStore so global tasks like Chat know the display name
    useEffect(() => {
        if (profile && user) {
            const realName = profile.k_eng_name || profile.username || profile.name || user.name;
            const updatedProfileObj = { ...user, name: realName, photo: profile.profile };
            if (user.name !== realName || user.photo !== profile.profile) {
                setUser(updatedProfileObj as any);
            }
        }
    }, [profile, user, setUser]);

    // Close domain menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.domain-switcher-container')) {
                setShowDomainMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        // 1. Flag intentional logout so LoginPage silent-SSO does NOT auto-sign-in again
        sessionStorage.setItem('az_logout_intent', '1');
        // 2. Clear all MSAL accounts from localStorage so Azure AD session is removed
        try {
            await instance.clearCache();
        } catch { /* ignore if not signed in via Azure */ }
        // 3. Clear A365 auth state and redirect
        logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'my' : 'en';
        setLanguage(nextLang);
    };

    const userInitial = user?.name
        ? user.name.charAt(0).toUpperCase()
        : user?.userid?.charAt(0).toUpperCase() || 'U';

    const handleSwitchDomain = async (targetDomain: any) => {
        const targetId = targetDomain.id || targetDomain.domaincode;
        if (targetId === domain) return;

        setSwitchingDomainId(targetId);
        try {
            const menuRes = await authClient.post('get-menu', {
                usersyskey: user?.usersyskey || '',
                role: user?.role || '',
                user_id: userId,
                app_id: APP_ID,
                domain: targetId,
                type: userId,
                domain_name: targetDomain.name || targetDomain.domainname,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = menuRes.data;
            if (data.access_token) {
                login({
                    token: data.access_token,
                    refreshToken: data.refresh_token,
                    userId: userId || '',
                    domain: targetId,
                    domains: domains,
                });
                setUser({
                    ...user,
                    domainName: targetDomain.name || targetDomain.domainname,
                } as any);

                setShowDomainMenu(false);
                // Reload to refresh all store data across the app for the new domain
                window.location.href = '/';
            }
        } catch (err) {
            console.error('Failed to switch domain:', err);
        } finally {
            setSwitchingDomainId(null);
        }
    };


    return (
        <div className={styles.layout}>
            {/* ── Sidebar ── */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles['sidebar--open'] : ''}`}>
                <div className={styles.sidebar__brand}>
                    <img src="/favicon.png" className={styles.sidebar__logo} alt="A365 Logo" />
                    <div className={styles['sidebar__brand-text']}>
                        <span className={styles.sidebar__title}>A365 HR</span>
                        <span className={styles.sidebar__subtitle}>Self-Service</span>
                    </div>
                    <button
                        className={styles.sidebar__logout}
                        onClick={() => setSidebarOpen(false)}
                        style={{ display: sidebarOpen ? 'flex' : 'none', marginLeft: 'auto' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className={styles.sidebar__nav}>
                    <span className={styles['sidebar__section-label']}>Main</span>

                    {/* ── Dashboard is always visible ── */}
                    <NavLink
                        to="/"
                        end
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `${styles.sidebar__link} ${isActive ? styles['sidebar__link--active'] : ''}`
                        }
                    >
                        <div className={styles['sidebar__link-content']}>
                            <LayoutDashboard size={20} className={styles['sidebar__link-icon']} />
                            {t('nav.dashboard')}
                        </div>
                    </NavLink>

                    {/* ── All items from hxm/integration/get/menuitems datalist ── */}
                    {sidebarItems.map((item) => {
                        // Resolve icon: use ROUTER_ICON_MAP if known, else generic LayoutList
                        const Icon = ROUTER_ICON_MAP[item.router] ?? LayoutList;
                        const isChat = item.router === '/chat';
                        const unreadCount = useChatStore.getState().unreadCount;

                        return (
                            <NavLink
                                key={item.syskey || item.router}
                                to={item.router}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `${styles.sidebar__link} ${isActive ? styles['sidebar__link--active'] : ''}`
                                }
                            >
                                <div className={styles['sidebar__link-content']}>
                                    <Icon size={20} className={styles['sidebar__link-icon']} />
                                    {/* Use API name directly — no i18n key lookup needed */}
                                    {item.name}
                                </div>
                                {isChat && unreadCount > 0 && (
                                    <span className={styles.sidebar__unreadBadge}>{unreadCount}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className={`${styles.sidebar__user} domain-switcher-container`} style={{ position: 'relative' }}>
                    <div className={styles.sidebar__user_meta}>
                        <div
                            className={styles.sidebar__avatar}
                            style={{ cursor: 'pointer', backgroundImage: profile?.profile ? `url(${profile.profile})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: profile?.profile ? 'transparent' : '' }}
                            onClick={() => {
                                if (sidebarOpen) setSidebarOpen(false);
                                navigate('/profile');
                            }}
                            title="View Profile"
                        >
                            {!profile?.profile && userInitial}
                        </div>

                        <div className={styles['sidebar__user-info']}>
                            <div className={styles['sidebar__user-name']}>{user?.name || user?.userid || 'User'}</div>

                            {domains && domains.length > 1 ? (
                                <button
                                    className={styles['sidebar__domain-switch-btn']}
                                    onClick={() => setShowDomainMenu(!showDomainMenu)}
                                    title="Switch Domain"
                                >
                                    <span className={styles['sidebar__user-role']}>
                                        {switchingDomainId ? 'Switching...' : (user?.domainName || user?.position || domain || 'Select Domain')}
                                    </span>
                                    <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                                </button>
                            ) : (
                                <div className={styles['sidebar__user-role']}>{user?.domainName || user?.position || domain || ''}</div>
                            )}
                        </div>
                    </div>

                    <button className={styles.sidebar__logout} onClick={handleLogout}>
                        <LogOut size={16} />
                        <span>{t('auth.logout')}</span>
                    </button>

                    {/* Domain Dropdown Menu - Moved outside info but inside relative container */}
                    {showDomainMenu && domains && domains.length > 1 && (
                        <div className={styles.domainMenu}>
                            <div className={styles.domainMenuHeader}>Switch Organization</div>
                            <div className={styles.domainMenuList}>
                                {domains.map((d: any) => {
                                    const dId = d.id || d.domaincode;
                                    const dName = d.name || d.domainname;
                                    const isActive = dId === domain;
                                    const isSwitching = switchingDomainId === dId;
                                    return (
                                        <button
                                            key={dId}
                                            className={`${styles.domainMenuItem} ${isActive ? styles.domainMenuItemActive : ''}`}
                                            onClick={() => handleSwitchDomain(d)}
                                            disabled={!!switchingDomainId}
                                        >
                                            <span className={styles.domainMenuItemName}>{dName}</span>
                                            {isSwitching ? (
                                                <Loader2 size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
                                            ) : isActive ? (
                                                <Check size={14} style={{ color: '#10b981' }} />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Mobile Overlay ── */}
            <div
                className={`${styles.sidebar__overlay} ${sidebarOpen ? styles['sidebar__overlay--visible'] : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ── Main Content ── */}
            <main className={`${styles.main} ${isChatPage ? styles['main--chat'] : ''}`}>
                <header className={styles.main__header}>
                    <div className={styles['main__header-left']}>
                        <button
                            className={styles.main__hamburger}
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                    <div className={styles['main__header-right']}>
                        <button className={styles['main__lang-btn']} onClick={toggleLanguage}>
                            <Globe size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {i18n.language === 'en' ? 'English' : 'Myanmar'}
                        </button>
                    </div>
                </header>

                <div className={`${styles.main__content} ${isChatPage ? styles['main__content--chat'] : ''}`}>
                    <ScrollRestoration />
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
