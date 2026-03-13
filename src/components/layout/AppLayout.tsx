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
    KeyRound,
    MapPin,
    Bell,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useChatStore } from '../../stores/chat-store';
import { useMsal } from '@azure/msal-react';
import authClient from '../../lib/auth-client';
import mainClient from '../../lib/main-client';
import apiClient from '../../lib/api-client';
import { APP_ID } from '../../lib/auth-token';
import { useNotificationStore } from '../../stores/notification-store';
import styles from './AppLayout.module.css';
import toast from 'react-hot-toast';

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
    // Social Post
    '/socialpost': Globe,
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
    const { user, domain, domains, token, userId, login, setUser, logout, menuList, setLanguage, loginType } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDomainMenu, setShowDomainMenu] = useState(false);
    const [switchingDomainId, setSwitchingDomainId] = useState<string | null>(null);
    const [pwdExpiry, setPwdExpiry] = useState<{ message: string; daysLeft: number; isExpired: boolean } | null>(null);

    const location = useLocation();
    const isChatPage = location.pathname.startsWith('/chat');

    // Notification unread count + background polling
    const { unreadCount: notiUnreadCount, fetchNotifications } = useNotificationStore();
    useEffect(() => {
        fetchNotifications({ isRefresh: true });
        const interval = setInterval(() => fetchNotifications({ isRefresh: true }), 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

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

    // ── Fetch Checkin Config for extras like Social tab ──
    const { data: configData } = useQuery({
        queryKey: ['checkin-config', userId, domain],
        queryFn: async () => {
            if (!token || !userId) return null;
            try {
                const res = await mainClient.post('api/checkin/config', {
                    userid: userId,
                    domain: domain || 'demouat',
                });
                return res.data?.data ?? null;
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
        let items: ApiMenuItem[] = [];
        if (menuItemsData?.datalist && menuItemsData.datalist.length > 0) {
            // All items from API, excluding dashboard (rendered separately)
            items = [...menuItemsData.datalist.filter(
                item => item.router && item.router !== '/' && item.router !== '/dashboard' && item.router !== '/team'
            )];
        } else if (menuList.length > 0) {
            items = menuList
                .filter(m => m.router && m.router !== '/' && m.router !== '/dashboard' && m.router !== '/team')
                .map(m => ({ syskey: m.id, name: m.label, icon: m.iconPath || '', router: m.router! }));
        } else {
            // Fallback: build stub items from DEFAULT_ROUTERS
            items = DEFAULT_ROUTERS
                .filter(r => r !== '/team')
                .map(r => ({ syskey: r, name: r.replace('/', ''), icon: '', router: r }));
        }

        // Add extra Social tab if both chat and socialpost are true
        if (configData?.chat && configData?.socialpost) {
            if (!items.some(i => i.router === '/socialpost')) {
                items.push({
                    syskey: 'socialpost_extra',
                    name: 'Social',
                    namemm: 'လူမှုရေး',
                    icon: '',
                    router: '/socialpost',
                });
            }
        }

        // Add extra Chat tab if chat is true
        if (configData?.chat) {
            if (!items.some(i => i.router === '/chat')) {
                items.push({
                    syskey: 'chat_extra',
                    name: 'Chat',
                    namemm: 'စကားပြောရန်',
                    icon: '',
                    router: '/chat',
                });
            }
        }

        return items;
    }, [menuItemsData, menuList, configData]);

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

    // ── Password expiry check (once per component mount, prd + normal login only) ──
    const pwdCheckRan = React.useRef(false);
    useEffect(() => {
        console.log(import.meta.env.VITE_FLAVOR);

        // Only run in prd flavor — IAM endpoint is not available in other environments
        if (import.meta.env.VITE_FLAVOR !== 'prd') return;
        // Skip for Azure AD logins — they don't use IAM passwords
        if (!userId || !domain || !token || loginType === 'azure') return;
        if (pwdCheckRan.current) return;
        pwdCheckRan.current = true;

        const checkPasswordExpiry = async () => {
            try {
                const authUrl = (await import('../../config/app-config')).appConfig.authUrl;
                const res = await fetch(`${authUrl}check/password-expried`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userid: userId, appid: APP_ID, domain }),
                });
                if (!res.ok) return;
                const json = await res.json();
                if (json?.status === 200) {
                    if (json.data?.status === true) {
                        const expiredDateStr: string | undefined = json.data.expired_date;
                        const message: string = json.data.message || 'Your password will expire soon.';
                        if (expiredDateStr) {
                            // Normalize both dates to local midnight to avoid UTC vs local offset
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const expiredDate = new Date(expiredDateStr);
                            expiredDate.setHours(0, 0, 0, 0);
                            const daysLeft = Math.round(
                                (expiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                            );
                            const isExpired = daysLeft < 0;
                            // Show modal if: already expired OR expiring within 5 days
                            if (daysLeft <= 5) {
                                setPwdExpiry({ message, daysLeft, isExpired });
                            }
                        }
                    } else if (json.data?.status === false) {
                        const msg = json.data?.message || 'Your password has expired. Please change it to continue.';
                        toast.error(msg);
                        setTimeout(() => navigate('/force-change-password', { replace: true }), 1500);
                    }
                }
            } catch {
                // silently ignore — non-critical check
            }
        };
        checkPasswordExpiry();
    }, [userId, domain, token]);

    const handleLogout = async () => {
        // 1. Flag intentional logout so LoginPage silent-SSO does NOT auto-sign-in again
        sessionStorage.setItem('az_logout_intent', '1');
        // 2. Clear Azure last-login flag so normal password login works on next visit
        localStorage.removeItem('az_last_login');
        // 3. Clear all MSAL accounts from localStorage so Azure AD session is removed
        try {
            await instance.clearCache();
        } catch { /* ignore if not signed in via Azure */ }
        // 4. Clear A365 auth state and redirect
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
                        className={styles.sidebar__close}
                        onClick={() => setSidebarOpen(false)}
                        style={{ display: sidebarOpen ? 'flex' : 'none' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className={styles.sidebar__nav}>
                    <span className={styles['sidebar__section-label']}>Main</span>

                    {/* ── Dashboard is always visible ── */}
                    {/* ── Dashboard is now the first item again ── */}
                    <NavLink
                        to="/dashboard"
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

                    {/* ── Team is below Dashboard ── */}
                    <NavLink
                        to="/team"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `${styles.sidebar__link} ${isActive ? styles['sidebar__link--active'] : ''}`
                        }
                    >
                        <div className={styles['sidebar__link-content']}>
                            <Users size={20} className={styles['sidebar__link-icon']} />
                            {t('nav.team')}
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
                                    {/* Show Myanmar name when language is 'my', fallback to English name */}
                                    {i18n.language === 'my' && item.namemm ? item.namemm : item.name}
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
                        {/* ── Notification Bell ── */}
                        <button
                            className={styles['main__notif-btn']}
                            onClick={() => navigate('/notifications')}
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <Bell size={20} />
                            {notiUnreadCount > 0 && (
                                <span className={styles['main__notif-badge']}>
                                    {notiUnreadCount > 99 ? '99+' : notiUnreadCount}
                                </span>
                            )}
                        </button>
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

            {/* ── Password Expiry Warning Modal ── */}
            {pwdExpiry && (() => {
                const { isExpired, message } = pwdExpiry;
                const headerBg = isExpired
                    ? 'linear-gradient(135deg,#fef2f2,#fecaca)'
                    : 'linear-gradient(135deg,#fff7ed,#fde68a)';
                const headerBorder = isExpired ? '#fca5a5' : '#fed7aa';
                const iconBg = isExpired ? '#fef2f2' : '#fff7ed';
                const iconBorder = isExpired ? '#fca5a5' : '#fed7aa';
                const iconColor = isExpired ? '#dc2626' : '#f97316';
                const titleColor = isExpired ? '#7f1d1d' : '#7c2d12';
                const btnColor = isExpired ? '#dc2626' : '#f97316';

                return (
                    <div
                        // Only allow backdrop-close when NOT fully expired
                        onClick={() => !isExpired && setPwdExpiry(null)}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(15,23,42,0.55)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#fff',
                                borderRadius: 20,
                                boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
                                width: '92%', maxWidth: 380,
                                overflow: 'hidden',
                                animation: 'pwdModalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                background: headerBg,
                                borderBottom: `3px solid ${headerBorder}`,
                                padding: '28px 24px 20px',
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: '50%',
                                    background: iconBg, border: `2px solid ${iconBorder}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 12px',
                                }}>
                                    <KeyRound size={28} style={{ color: iconColor }} />
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 17, color: titleColor }}>
                                    {isExpired ? 'Password Expired' : 'Password Expiring Soon'}
                                </div>
                                {/* <div style={{
                                    marginTop: 6, display: 'inline-block',
                                    background: badgeBg, color: badgeColor,
                                    padding: '3px 12px', borderRadius: 20,
                                    fontSize: 12, fontWeight: 700,
                                }}>
                                    {badgeText}
                                </div> */}
                            </div>

                            {/* Body */}
                            <div style={{ padding: '20px 24px 8px', textAlign: 'center' }}>
                                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                    {isExpired
                                        ? 'Your password has expired. Please change your password to continue using the app.'
                                        : message}
                                </p>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 10, padding: '16px 24px 24px' }}>
                                {/* Hide "Later" when expired — user must act */}
                                {!isExpired && (
                                    <button
                                        onClick={() => setPwdExpiry(null)}
                                        style={{
                                            flex: 1, padding: '11px',
                                            background: '#f1f5f9', color: '#475569',
                                            border: '1px solid #e2e8f0', borderRadius: 12,
                                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >
                                        Later
                                    </button>
                                )}
                                <button
                                    onClick={() => { setPwdExpiry(null); navigate('/profile'); }}
                                    style={{
                                        flex: 1, padding: '11px',
                                        background: btnColor, color: '#fff',
                                        border: 'none', borderRadius: 12,
                                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    Change Password
                                </button>
                            </div>
                        </div>
                        <style>{`
                            @keyframes pwdModalIn {
                                from { opacity: 0; transform: scale(0.88); }
                                to   { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                    </div>
                );
            })()}
        </div>
    );
}
