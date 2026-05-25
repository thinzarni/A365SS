import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Bell, CheckSquare, Receipt, Clock, Home, Activity, 
    CalendarCheck, Car, Bus, ShoppingBag, Plane, ArrowRightLeft, 
    BookOpen, PartyPopper, ClipboardCheck, Wifi, History, RefreshCw, 
    MapPin, UserPlus, MoreHorizontal 
} from 'lucide-react';
import { useNotificationStore } from '../../stores/notification-store';
import type { NotificationModel } from '../../stores/notification-store';
import { parseApiDate, formatNotiTime, getNotiRoute } from '../../lib/notification-helper';
import styles from './NotificationPage.module.css';

function getNotificationIconConfig(requestType: string = '', isRead: boolean) {
    const dim = isRead ? 0.55 : 1.0;
    
    const type = requestType.trim().toLowerCase();
    let config;
    
    switch(type) {
        case 'leave': config = { Icon: CheckSquare, bg: '#E0F2FE', fg: '#0284C7' }; break;
        case 'claim': config = { Icon: Receipt, bg: '#F0FDF4', fg: '#16A34A' }; break;
        case 'overtime': config = { Icon: Clock, bg: '#FFF7ED', fg: '#EA580C' }; break;
        case 'workfromhome': config = { Icon: Home, bg: '#EFF6FF', fg: '#2563EB' }; break;
        case 'late': config = { Icon: Clock, bg: '#FEF9C3', fg: '#CA8A04' }; break;
        case 'earlyout': config = { Icon: Activity, bg: '#FFF1F2', fg: '#E11D48' }; break;
        case 'reservation': config = { Icon: CalendarCheck, bg: '#F5F3FF', fg: '#7C3AED' }; break;
        case 'ferry taxi': config = { Icon: Car, bg: '#ECFEFF', fg: '#0891B2' }; break;
        case 'transportation': config = { Icon: Bus, bg: '#F0F9FF', fg: '#0369A1' }; break;
        case 'purchase': config = { Icon: ShoppingBag, bg: '#FDF4FF', fg: '#9333EA' }; break;
        case 'travel': config = { Icon: Plane, bg: '#EFFBFF', fg: '#06B6D4' }; break;
        case 'offinlieu': config = { Icon: ArrowRightLeft, bg: '#F0FDF4', fg: '#059669' }; break;
        case 'ruleandregulation': config = { Icon: BookOpen, bg: '#FFFBEB', fg: '#D97706' }; break;
        case 'holiday': config = { Icon: PartyPopper, bg: '#FFF0F6', fg: '#DB2777' }; break;
        case 'attendanceapproval': config = { Icon: ClipboardCheck, bg: '#F0FDF4', fg: '#15803D' }; break;
        case 'remote': config = { Icon: Wifi, bg: '#EFF6FF', fg: '#1D4ED8' }; break;
        case 'backdate': config = { Icon: History, bg: '#FEF3C7', fg: '#B45309' }; break;
        case 'remote and backdate': config = { Icon: RefreshCw, bg: '#EDE9FE', fg: '#6D28D9' }; break;
        case 'location': config = { Icon: MapPin, bg: '#FFF1F2', fg: '#BE123C' }; break;
        case 'employeerequisition': config = { Icon: UserPlus, bg: '#F0FDF4', fg: '#0D9488' }; break;
        case 'other': config = { Icon: MoreHorizontal, bg: '#EEF2FF', fg: '#4F46E5' }; break;
        default: config = { Icon: Bell, bg: '#EFF6FF', fg: '#2563EB' }; break;
    }

    return {
        Icon: config.Icon,
        bgStyle: { backgroundColor: config.bg, opacity: dim },
        fgStyle: { color: config.fg, opacity: dim }
    };
}

export default function NotificationPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { items, unreadCount, isLoading, hasMore, fetchNotifications, markNotificationRead } =
        useNotificationStore();

    const listRef = useRef<HTMLDivElement>(null);
    const processingRef = useRef<string | null>(null);

    // Only fetch if nothing loaded yet — AppLayout polls on app start so data
    // is usually already in the store when the user navigates here.
    useEffect(() => {
        if (items.length === 0 && !isLoading) {
            fetchNotifications({ isRefresh: true });
        }
    }, []);

    // Infinite scroll
    const handleScroll = useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
            fetchNotifications();
        }
    }, [fetchNotifications]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const handleItemTap = async (item: NotificationModel) => {
        if (processingRef.current === item.syskey) return;
        processingRef.current = item.syskey;

        try {
            if (!item.read_status) {
                await markNotificationRead(item.syskey);
            }
            const route = getNotiRoute(item.requesttype, item.to_noti_type, item.request_syskey);
            if (route) navigate(route);
        } finally {
            processingRef.current = null;
        }
    };

    const totalUnread = unreadCount;

    return (
        <div className={styles['noti-page']}>
            {/* ── Header ── */}
            <div className={styles['noti-page__header']}>
                <div className={styles['noti-page__icon-wrapper']}>
                    <Bell size={22} />
                </div>
                <div>
                    <h1 className={styles['noti-page__title']}>{t('notification.title')}</h1>
                    <p className={styles['noti-page__subtitle']}>
                        {totalUnread > 0 ? t('notification.unreadCount', { count: totalUnread }) : t('notification.allCaughtUp')}
                    </p>
                </div>
            </div>

            {/* ── Progress bar ── */}
            {isLoading && items.length === 0 && (
                <div className={styles['noti-page__progress']} />
            )}

            {/* ── Skeleton ── */}
            {isLoading && items.length === 0 ? (
                <div className={styles['noti-page__skeleton-list']}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={styles['noti-page__skeleton-item']}>
                            <div className={styles['noti-page__skeleton-avatar']} />
                            <div className={styles['noti-page__skeleton-body']}>
                                <div className={styles['noti-page__skeleton-bar']} style={{ width: '62%' }} />
                                <div className={styles['noti-page__skeleton-bar']} style={{ width: '85%' }} />
                                <div className={styles['noti-page__skeleton-bar']} style={{ width: '50%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                /* ── Empty state ── */
                <div className={styles['noti-page__empty']}>
                    <div className={styles['noti-page__empty-icon']}>
                        <Bell size={32} />
                    </div>
                    <h3>{t('notification.noNotifications')}</h3>
                    <p>{t('notification.emptySubtitle')}</p>
                    <button
                        className={styles['noti-page__refresh-btn']}
                        onClick={() => fetchNotifications({ isRefresh: true })}
                    >
                        {t('notification.refresh')}
                    </button>
                </div>
            ) : (
                /* ── Notification list ── */
                <div className={styles['noti-page__list']} ref={listRef}>
                    {items.map((item) => {
                        const isRead = item.read_status;
                        const { Icon, bgStyle, fgStyle } = getNotificationIconConfig(item.requesttype, isRead);
                        const parsedDate = item.createddate ? parseApiDate(item.createddate) : new Date();
                        const timeLabel = formatNotiTime(parsedDate);

                        return (
                            <div
                                key={item.syskey}
                                className={`${styles['noti-page__item']} ${!isRead ? styles['noti-page__item--unread'] : ''}`}
                                onClick={() => handleItemTap(item)}
                            >
                                {/* Avatar */}
                                <div className={styles['noti-page__avatar-wrap']}>
                                    <div
                                        className={styles['noti-page__avatar']}
                                        style={bgStyle}
                                    >
                                        <Icon size={20} style={fgStyle} />
                                    </div>
                                    {!isRead && <div className={styles['noti-page__unread-dot']} />}
                                </div>

                                {/* Content */}
                                <div className={styles['noti-page__content']}>
                                    <div className={styles['noti-page__row']}>
                                        <span
                                            className={`${styles['noti-page__item-title']} ${isRead
                                                ? styles['noti-page__item-title--normal']
                                                : styles['noti-page__item-title--bold']
                                                }`}
                                        >
                                            {item.title}
                                        </span>
                                        <span className={styles['noti-page__item-time']}>{timeLabel}</span>
                                    </div>
                                    <p
                                        className={`${styles['noti-page__item-desc']} ${!isRead ? styles['noti-page__item-desc--unread'] : ''
                                            }`}
                                    >
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load-more trigger / button */}
                    {hasMore && !isLoading && (
                        <button
                            className={styles['noti-page__load-more']}
                            onClick={() => fetchNotifications()}
                        >
                            {t('notification.loadMore')}
                        </button>
                    )}

                    {isLoading && items.length > 0 && (
                        <div className={styles['noti-page__progress']} />
                    )}
                </div>
            )}
        </div>
    );
}
