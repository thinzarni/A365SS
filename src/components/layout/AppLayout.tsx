import { useState, useEffect } from 'react';
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
    Loader2
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useChatStore } from '../../stores/chat-store';
import authClient from '../../lib/auth-client';
import mainClient from '../../lib/main-client';
import { APP_ID } from '../../lib/auth-token';
import styles from './AppLayout.module.css';

const navItems = [
    { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { path: '/requests', icon: ClipboardList, labelKey: 'nav.myRequests' },
    { path: '/approvals', icon: CheckSquare, labelKey: 'nav.approvals' },
    { path: '/reservations', icon: Calendar, labelKey: 'nav.reservations' },
    { path: '/leave', icon: TreePalm, labelKey: 'nav.leave' },
    { path: '/claims', icon: Receipt, labelKey: 'nav.claims' },
    { path: '/leave-summary', icon: Palmtree, labelKey: 'nav.leaveSummary' },
    { path: '/holidays', icon: CalendarDays, labelKey: 'nav.holidays' },
    { path: '/chat', icon: MessageSquare, labelKey: 'nav.chat' },
    { path: '/team', icon: Users, labelKey: 'nav.team' },
];

export default function AppLayout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
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

    const handleLogout = () => {
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
                    {navItems.filter(item => {
                        // If menuList is empty, show everything (fallback for when API doesn't provide it)
                        if (!menuList || menuList.length === 0) return true;

                        const menuKeys: Record<string, string[]> = {
                            'nav.dashboard': ['dashboard'],
                            'nav.myRequests': ['request', 'my request', 'requests'],
                            'nav.approvals': ['approval', 'attendance approval', 'approvals'],
                            'nav.reservations': ['reservation', 'reservations'],
                            'nav.leave': ['leave', 'leave request'],
                            'nav.claims': ['claim', 'claim request', 'claims'],
                            'nav.leaveSummary': ['leave summary', 'leave'],
                            'nav.holidays': ['holiday', 'holidays'],
                            'nav.chat': ['chat'],
                            'nav.team': ['team', 'my team'],
                        };

                        const allowedLabels = menuList.map(m => m.label.toLowerCase());
                        const requiredLabels = menuKeys[item.labelKey] || [];

                        // Dashboard is usually always visible or handled separately
                        if (item.labelKey === 'nav.dashboard') return true;

                        return requiredLabels.some(label => allowedLabels.includes(label));
                    }).map(({ path, icon: Icon, labelKey }) => {
                        const isChat = labelKey === 'nav.chat';
                        const unreadCount = useChatStore((state) => state.unreadCount);

                        return (
                            <NavLink
                                key={path}
                                to={path}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `${styles.sidebar__link} ${isActive ? styles['sidebar__link--active'] : ''}`
                                }
                            >
                                <div className={styles['sidebar__link-content']}>
                                    <Icon size={20} className={styles['sidebar__link-icon']} />
                                    {t(labelKey)}
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
