import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useChatStore } from '../../stores/chat-store';
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
    const { user, domain, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'my' : 'en';
        i18n.changeLanguage(nextLang);
    };

    const userInitial = user?.name
        ? user.name.charAt(0).toUpperCase()
        : user?.userid?.charAt(0).toUpperCase() || 'U';

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
                    {navItems.map(({ path, icon: Icon, labelKey }) => {
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

                <div className={styles.sidebar__user}>
                    <div className={styles.sidebar__avatar}>{userInitial}</div>
                    <div className={styles['sidebar__user-info']}>
                        <div className={styles['sidebar__user-name']}>{user?.name || user?.userid || 'User'}</div>
                        <div className={styles['sidebar__user-role']}>{user?.domainName || user?.position || domain || ''}</div>
                    </div>
                    <button className={styles.sidebar__logout} onClick={handleLogout} title={t('auth.logout')}>
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* ── Mobile Overlay ── */}
            <div
                className={`${styles.sidebar__overlay} ${sidebarOpen ? styles['sidebar__overlay--visible'] : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ── Main Content ── */}
            <main className={styles.main}>
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
                            {i18n.language === 'en' ? 'EN' : 'MY'}
                        </button>
                    </div>
                </header>

                <div className={styles.main__content}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
