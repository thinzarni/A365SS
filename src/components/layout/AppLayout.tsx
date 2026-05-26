import React, { useState, useEffect, useRef } from 'react';
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
    User,
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
    KeyRound,
    MapPin,
    Bell,
    ChevronLeft,
    ChevronRight,
    Contact,
    UserMinus,
    UserX,
    Eye,
    Cpu,
    BookOpen,
    ScanSearch,
    Building2,
    ListTodo,
    CalendarRange,
    LogIn,
    Banknote,
} from 'lucide-react';

import { useAuthStore } from '../../stores/auth-store';
import { useChatStore } from '../../stores/chat-store';
import { useMsal } from '@azure/msal-react';
import authClient from '../../lib/auth-client';
import mainClient from '../../lib/main-client';
import apiClient from '../../lib/api-client';
import { APP_ID } from '../../lib/auth-token';
import { useNotificationStore } from '../../stores/notification-store';
import { MENU_ITEMS } from '../../config/api-routes';
import { appConfig } from '../../config/app-config';
import { chatSocket } from '../../lib/chat-socket';
// import { appSocket } from '../../lib/app-socket';
import styles from './AppLayout.module.css';
import toast from 'react-hot-toast';
// import { useSocket } from '../../hooks/useSocket';
// import { useQueryClient } from '@tanstack/react-query';


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
    '/attendancerequest': LogIn,
    '/locationapproval': MapPin,
    '/supervised-attendance': ListTodo,
    '/employeeworkpolicy': CalendarRange,

    // Leave
    '/leave': TreePalm,
    '/leave-summary': Palmtree,
    '/separation-leave-authorize': UserMinus,
    '/separation-attendance-authorize': UserX,
    '/separationLeaveAuthorize': UserMinus,
    '/separationAttendanceAuthorize': UserX,
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
    '/hrview': Building2,
    // Comms
    '/chat': MessageSquare,
    // Admin
    '/admin': Briefcase,
    // Catch-all
    '/visionai': Eye,
    '/customai': Cpu,
    '/rulesandreg': BookOpen,
    '/objectdetection': ScanSearch,
    // Social Post
    '/socialpost': Globe,
    '/profile': Contact,
    '/payslip/list': Banknote,
};

// ── Router → i18n translation key mapping ──
// Used to translate sidebar labels using our i18n files instead of relying on
// namemm from the API (which is often empty for many menu items).
const ROUTER_TO_I18N_KEY: Record<string, string> = {
    '/': 'nav.dashboard',
    '/dashboard': 'nav.dashboard',
    '/request': 'nav.myRequests',
    '/requests': 'nav.myRequests',
    '/approval': 'nav.approvals',
    '/approvals': 'nav.approvals',
    '/attendanceapproval': 'nav.attendanceApproval',
    '/attendancerequest': 'nav.attendanceRequest',
    '/locationapproval': 'nav.locationApproval',
    '/supervised-attendance': 'nav.supervisedAttendance',
    '/employeeworkpolicy': 'nav.employeeworkpolicy',

    '/leave': 'nav.leave',
    '/leave-summary': 'nav.leaveSummary',
    '/separation-leave-authorize': 'nav.separationLeaveAuthorize',
    '/separation-attendance-authorize': 'nav.separationAttendanceAuthorize',
    '/separationLeaveAuthorize': 'nav.separationLeaveAuthorize',
    '/separationAttendanceAuthorize': 'nav.separationAttendanceAuthorize',
    '/holiday': 'nav.holidays',
    '/holidays': 'nav.holidays',
    '/claim': 'nav.claims',
    '/claims': 'nav.claims',
    '/overtime': 'nav.overtime',
    '/reservation': 'nav.reservations',
    '/reservations': 'nav.reservations',
    '/team': 'nav.team',
    '/hrview': 'nav.hrView',
    '/chat': 'nav.chat',
    '/admin': 'nav.admin',
    '/socialpost': 'nav.socialPost',
    '/visionai': 'nav.visionAi',
    '/customai': 'nav.customAi',
    '/rulesandreg': 'nav.rulesAndReg',
    '/objectdetection': 'nav.objectDetection',
    '/payslip/list': 'nav.payslip',
};

// Fallback: shown when API hasn't loaded yet
const DEFAULT_ROUTERS = [
    '/request', '/approval', '/reservation', '/leave',
    '/claim', '/holiday', '/team',
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
    // const queryClient = useQueryClient();
    // const { on, off } = useSocket();

    // useEffect(() => {
    //     const handleApprovalUpdate = (data: any) => {
    //         console.log('🔔 [Global Socket] Approval update received:', data);

    //         // 1. Refresh supervised attendance if the user is on that page or just to keep data fresh
    //         queryClient.invalidateQueries({ queryKey: ['supervisedAttendances'] });

    //         // 2. Refresh general attendance
    //         queryClient.invalidateQueries({ queryKey: ['attendance'] });

    //         // 3. Refresh profile comparison data
    //         queryClient.invalidateQueries({ queryKey: ['profileCompare'] });
    //         queryClient.invalidateQueries({ queryKey: ['emergencyCompare'] });
    //         queryClient.invalidateQueries({ queryKey: ['experienceCompare'] });
    //         queryClient.invalidateQueries({ queryKey: ['qualificationCompare'] });
    //         queryClient.invalidateQueries({ queryKey: ['familyCompare'] });
    //         queryClient.invalidateQueries({ queryKey: ['addressCompare'] });

    //         // 4. Show global toast
    //         const message = data.message || (
    //             data.status === 2 ? 'Request Approved' :
    //                 data.status === 3 ? 'Request Rejected' :
    //                     data.status === 1 ? 'New Request Submitted' :
    //                         'Request Updated'
    //         );

    //         toast.success(message, {
    //             id: `socket-noti-${data.syskey}-${data.status}`, // Deduplicate
    //             icon: data.status === 2 ? '✅' : (data.status === 3 ? '❌' : '🔔'),
    //             position: 'top-right',
    //             duration: 5000
    //         });
    //     };

    //     const handleQrMessage = (data: any) => {
    //         if (data === 'refresh_attendance' || data?.type === 'attendance') {
    //             queryClient.invalidateQueries({ queryKey: ['attendance'] });
    //         }
    //     };

    //     const handleWelcome = (data: any) => {
    //         console.log('👋 [Socket] Welcome message received:', data);
    //     };

    //     on('welcome', handleWelcome);
    //     on('approval_update', handleApprovalUpdate);
    //     on('qrMessage', handleQrMessage);

    //     return () => {
    //         off('welcome', handleWelcome);
    //         off('approval_update', handleApprovalUpdate);
    //         off('qrMessage', handleQrMessage);
    //     };
    // }, [on, off, queryClient]);
    const { instance } = useMsal();
    const { user, domain, domains, token, userId, login, setUser, logout, menuList, setLanguage, language, loginType } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showDomainMenu, setShowDomainMenu] = useState(false);
    const [switchingDomainId, setSwitchingDomainId] = useState<string | null>(null);
    const [pwdExpiry, setPwdExpiry] = useState<{ message: string; daysLeft: number; isExpired: boolean } | null>(null);
    const [sidebarImgError, setSidebarImgError] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });

    // Toggle sidebar collapse
    const toggleSidebarCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
    };

    // Sync persisted language preference into i18next on mount
    useEffect(() => {
        if (language && i18n.language !== language) {
            i18n.changeLanguage(language);
        }
        // Set the HTML lang attribute so CSS :lang(my) selector activates the Myanmar font
        document.documentElement.lang = language || i18n.language || 'en';
    }, []);

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
    // Endpoint: GET MENU_ITEMS
    // Response shape: { statuscode, datalist: [{syskey, name, icon, router, type}...], homemenulist: [...] }
    const { data: menuItemsData } = useQuery({
        queryKey: ['menu-items', userId, domain],
        queryFn: async () => {
            if (!token || !userId) return null;
            const storageKey = `a365_menu_items_${userId}_${domain}`;
            try {
                const res = await apiClient.get(MENU_ITEMS);
                const data = res.data;
                if (data?.statuscode === 200 || data?.statuscode === 300) {
                    const parsedData = {
                        // selfservicewebmenulist = sidebar menu; homemenulist = home screen cards
                        datalist: (data.selfservicewebmenulist ?? []) as ApiMenuItem[],
                        homemenulist: (data.homemenulist ?? []) as ApiMenuItem[],
                    };
                    localStorage.setItem(storageKey, JSON.stringify(parsedData));
                    return parsedData;
                }
                // Fallback to local storage if API returns an error code
                const cached = localStorage.getItem(storageKey);
                if (cached) return JSON.parse(cached);
                return null;
            } catch (error) {
                // Fallback to local storage on network error
                const cached = localStorage.getItem(storageKey);
                if (cached) return JSON.parse(cached);
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!token && !!userId,
        initialData: () => {
            if (!userId) return undefined;
            const storageKey = `a365_menu_items_${userId}_${domain}`;
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                try { return JSON.parse(cached); } catch { return undefined; }
            }
            return undefined;
        },
        initialDataUpdatedAt: 0, // Forces immediate background fetch to update any changes
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
                (item: ApiMenuItem) => item.router && item.router !== '/' && item.router !== '/dashboard' && item.router !== '/team'
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
        if (configData?.chat && configData?.socialpost && import.meta.env.VITE_FLAVOR !== 'prd') {
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
        if (configData?.chat && import.meta.env.VITE_FLAVOR !== 'prd') {
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

    // Close avatar dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
                setShowAvatarMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // pwdCheckRan ref removed — password expiry handled via socket event
    useEffect(() => {
        // Run active check and websocket listening for non-Azure logins
        if (!userId || !domain || !token || loginType === 'azure') {
            console.log("❌ [AppLayout] Returning early. Valid credentials missing.");
            return;
        }

        // 1. Establish the global Chat WS connection (Skip in Prod/MPT flavors)
        if (import.meta.env.VITE_FLAVOR !== 'prd' && import.meta.env.VITE_FLAVOR !== 'mpt') {
            console.log("🔌 [AppLayout] Connecting to CHAT SOCKET (Flavor is not prd/mpt)");
            chatSocket.connect();
        }

        // 1.b. Password Expiry WebSocket — uses per-flavor wsUrl from app-config.ts
        // mpt flavor uses ws:// (internal network), prd flavor uses wss:// (cloud)
        let pwdWsObj: WebSocket | null = null;
        const pwdWsBase = appConfig.wsUrl
            ? appConfig.wsUrl.replace(/\/$/, '')                             // use configured wsUrl as-is
            : (appConfig.iamUrl || '').replace(/^https?/, 'wss') + '/api';  // fallback: derive from iamUrl
        // console.log(`🔌 [PwdSocket] Attempting connection to: ${pwdWsBase}?user_id=${userId}&appid=${appConfig.appId}&domain_id=${domain}`);
        try {
            pwdWsObj = new WebSocket(`${pwdWsBase}?user_id=${encodeURIComponent(userId)}&appid=${encodeURIComponent(appConfig.appId)}&domain_id=${encodeURIComponent(domain)}`);

            pwdWsObj.onopen = (ev) => {
                console.log('✅ [PwdSocket] Connected successfully', ev);
                // Try sending a ping just in case the server expects some traffic
                try { pwdWsObj?.send('ping'); } catch (e) { }
            };

            pwdWsObj.onerror = (err) => {
                console.error('❌ [PwdSocket] Connection error:', err);
            };

            pwdWsObj.onclose = (ev) => {
                console.log(`🔌 [PwdSocket] Closed (code=${ev.code}, reason=${ev.reason || 'none'}, clean=${ev.wasClean})`);
            };

            pwdWsObj.onmessage = (event) => {
                console.log('[PwdSocket] Message received:', event.data);
                try {
                    const decoded = JSON.parse(event.data);
                    if ((decoded?.event === 'password_expiry_warning' || decoded?.event === 'password_expired') && decoded?.data) {
                        const data = decoded.data;
                        if (data.status === true && data.expired_date) {
                            const checkDate = new Date();
                            checkDate.setHours(0, 0, 0, 0);
                            const expiredDate = new Date(data.expired_date);
                            expiredDate.setHours(0, 0, 0, 0);
                            const daysLeft = Math.round(
                                (expiredDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24)
                            );
                            const isExpired = daysLeft < 0;
                            if (daysLeft <= 5) {
                                setPwdExpiry({
                                    message: data.message || 'Your password will expire soon.',
                                    daysLeft,
                                    isExpired
                                });
                            }
                        } else if (data.status === false) {
                            const msg = data.message || 'Your password has expired. Please change it to continue.';
                            toast.error(msg);
                            setTimeout(() => navigate('/force-change-password', { replace: true }), 1500);
                        }
                    }
                } catch (e) {
                    console.warn('[PwdSocket] Non-JSON message:', event.data);
                }
            };
        } catch (e) {
            console.error('[PwdSocket] Failed to create WebSocket:', e);
        }

        // 2. HTTP Verification (Once per day) - Disabled as it is now handled via socket

        return () => {
            console.log("🧹 [PwdSocket] Cleanup triggered, closing socket if open");
            if (pwdWsObj && pwdWsObj.readyState === WebSocket.OPEN) {
                pwdWsObj.close(1000, "Component unmounted");
            }
        };
    }, [userId, domain, token, loginType, navigate, user?.syskey]);

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
        i18n.changeLanguage(nextLang);
        setLanguage(nextLang);
        // Update HTML lang attribute so CSS :lang(my) activates the Myanmar font
        document.documentElement.lang = nextLang;
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
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles['sidebar--open'] : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
                <div className={styles.sidebar__brand}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, cursor: 'pointer', minWidth: 0 }}
                        onClick={() => { setSidebarOpen(false); navigate('/dashboard'); }}
                        title="Go to Dashboard"
                    >
                        <img src={`${import.meta.env.BASE_URL}favicon.png`} className={styles.sidebar__logo} alt="A365 Logo" />
                        <div className={styles['sidebar__brand-text']}>
                            <span className={styles.sidebar__title}>A365 HR</span>
                            <span className={styles.sidebar__subtitle}>Self-Service</span>
                        </div>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    <button
                        className={styles.sidebar__collapse_toggle}
                        onClick={toggleSidebarCollapse}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>

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
                            <span className={styles['sidebar__link-text']}>{t('nav.dashboard')}</span>
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
                            <span className={styles['sidebar__link-text']}>{t('nav.team')}</span>
                        </div>
                    </NavLink>
                    {/* ── All items from MENU_ITEMS datalist ── */}
                    {sidebarItems.map((item) => {
                        // Resolve icon: use ROUTER_ICON_MAP if known, else generic LayoutList
                        const Icon = ROUTER_ICON_MAP[item.router] ?? LayoutList;
                        const isChat = item.router === '/chat';
                        const unreadCount = useChatStore.getState().unreadCount;
                        // Resolve label: i18n key → API namemm (my only) → API name
                        const i18nKey = ROUTER_TO_I18N_KEY[item.router];
                        const label = i18nKey
                            ? t(i18nKey)
                            : (i18n.language === 'my' && item.namemm ? item.namemm : item.name);

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
                                    <span className={styles['sidebar__link-text']}>{label}</span>
                                </div>
                                {isChat && unreadCount > 0 && (
                                    <span className={styles.sidebar__unreadBadge}>{unreadCount}</span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className={`${styles.sidebar__user} domain-switcher-container`} style={{ position: 'relative' }}>
                    {/* Domain Switcher */}
                    {domains && domains.length > 1 && (
                        <button
                            className={styles['sidebar__domain-switch-btn']}
                            onClick={() => setShowDomainMenu(!showDomainMenu)}
                            title="Switch Domain"
                            style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                            <span className={styles['sidebar__user-role']} style={{ color: 'var(--color-neutral-300)' }}>
                                {switchingDomainId ? 'Switching...' : (user?.domainName || user?.position || domain || 'Select Domain')}
                            </span>
                            <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                        </button>
                    )}

                    {/* Domain Dropdown Menu */}
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
                    <div className={styles.sidebar__version} style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '10px 0', marginTop: 'auto' }}>
                        {isSidebarCollapsed ? `v${appConfig.appVersion}` : `Version ${appConfig.appVersion}`}
                    </div>
                </div>
            </aside>

            {/* ── Mobile Overlay ── */}
            <div
                className={`${styles.sidebar__overlay} ${sidebarOpen ? styles['sidebar__overlay--visible'] : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ── Main Content ── */}
            <main className={`${styles.main} ${isSidebarCollapsed ? styles['main--sidebar-collapsed'] : ''} ${isChatPage ? styles['main--chat'] : ''}`}>
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

                        {/* ── Avatar with dropdown ── */}
                        <div className={styles['header__avatar-container']} ref={avatarMenuRef}>
                            <button
                                className={styles['header__avatar-btn']}
                                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                                title={user?.name || user?.userid || 'User'}
                            >
                                {profile?.profile && !sidebarImgError ? (
                                    <img
                                        src={profile.profile}
                                        alt=""
                                        className={styles['header__avatar-img']}
                                        onError={() => setSidebarImgError(true)}
                                    />
                                ) : (
                                    <span className={styles['header__avatar-initial']}>{userInitial}</span>
                                )}
                            </button>

                            {showAvatarMenu && (
                                <div className={styles['header__avatar-menu']}>
                                    <div className={styles['header__avatar-menu-header']}>
                                        <div className={styles['header__avatar-menu-name']}>{user?.name || user?.userid || 'User'}</div>
                                        <div className={styles['header__avatar-menu-role']}>{user?.domainName || user?.position || domain || ''}</div>
                                    </div>
                                    <div className={styles['header__avatar-menu-divider']} />
                                    <button
                                        className={styles['header__avatar-menu-item']}
                                        onClick={() => { setShowAvatarMenu(false); navigate('/profile'); }}
                                    >
                                        <User size={16} />
                                        <span>{t('nav.profile', 'Profile')}</span>
                                    </button>
                                    <button
                                        className={`${styles['header__avatar-menu-item']} ${styles['header__avatar-menu-item--danger']}`}
                                        onClick={() => { setShowAvatarMenu(false); setShowLogoutConfirm(true); }}
                                    >
                                        <LogOut size={16} />
                                        <span>{t('auth.logout')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
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

            {/* ── Logout Confirmation Modal ── */}
            {showLogoutConfirm && (
                <div
                    onClick={() => setShowLogoutConfirm(false)}
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
                            width: '92%', maxWidth: 360,
                            overflow: 'hidden',
                            animation: 'pwdModalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                        }}
                    >
                        <div style={{
                            padding: '24px 24px 16px',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: '#fef2f2', border: '2px solid #fca5a5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <LogOut size={24} style={{ color: '#dc2626' }} />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>
                                {t('auth.logoutConfirmTitle', 'Sign Out')}
                            </div>
                            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                                {t('auth.logoutConfirmMessage', 'Are you sure you want to sign out of your account?')}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, padding: '16px 24px 24px' }}>
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                style={{
                                    flex: 1, padding: '11px',
                                    background: '#f1f5f9', color: '#475569',
                                    border: '1px solid #e2e8f0', borderRadius: 12,
                                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    handleLogout();
                                }}
                                style={{
                                    flex: 1, padding: '11px',
                                    background: '#ef4444', color: '#fff',
                                    border: 'none', borderRadius: 12,
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                }}
                            >
                                {t('auth.logout', 'Sign Out')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
