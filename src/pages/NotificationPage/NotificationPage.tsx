import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../stores/notification-store';
import type { NotificationModel } from '../../stores/notification-store';
import { parseApiDate, formatNotiTime, getNotiRoute } from '../../lib/notification-helper';
import styles from './NotificationPage.module.css';

export default function NotificationPage() {
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
                    <h1 className={styles['noti-page__title']}>Notifications</h1>
                    <p className={styles['noti-page__subtitle']}>
                        {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
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
                    <h3>No notifications yet</h3>
                    <p>You're all caught up. New notifications will appear here.</p>
                    <button
                        className={styles['noti-page__refresh-btn']}
                        onClick={() => fetchNotifications({ isRefresh: true })}
                    >
                        Refresh
                    </button>
                </div>
            ) : (
                /* ── Notification list ── */
                <div className={styles['noti-page__list']} ref={listRef}>
                    {items.map((item) => {
                        const isRead = item.read_status;
                        const avatarLetter = item.action_user_name?.charAt(0).toUpperCase() || '?';
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
                                        className={`${styles['noti-page__avatar']} ${isRead ? styles['noti-page__avatar--read'] : styles['noti-page__avatar--unread']
                                            }`}
                                    >
                                        {avatarLetter}
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
                            Load more
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
