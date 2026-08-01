import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Bell, CheckSquare, Receipt, Clock, Home, Activity, 
    CalendarCheck, Car, Bus, ShoppingBag, Plane, ArrowRightLeft, 
    BookOpen, PartyPopper, ClipboardCheck, Wifi, History, RefreshCw, 
    MapPin, UserPlus, MoreHorizontal, Briefcase,
    ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { useNotificationStore } from '../../stores/notification-store';
import type { NotificationModel } from '../../stores/notification-store';
import { parseApiDate, formatNotiTime, getNotiRoute } from '../../lib/notification-helper';
import styles from './NotificationPage.module.css';
import { downloadOrOpenAttachment } from '../../lib/file-utils';

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
        case 'ferry taxi': 
        case 'ferryregistration':
        case 'ferry registration':
        case 'ferrychange':
        case 'ferry change':
        case 'ferryusercomplaint':
        case 'ferry user complaint':
        case 'ferryhrquery':
        case 'ferry hr query':
            config = { Icon: Car, bg: '#ECFEFF', fg: '#0891B2' }; break;
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
        case 'jobpost': config = { Icon: Briefcase, bg: '#FFF7ED', fg: '#F97316' }; break;
        case 'other': config = { Icon: MoreHorizontal, bg: '#EEF2FF', fg: '#4F46E5' }; break;
        default: config = { Icon: Bell, bg: '#EFF6FF', fg: '#2563EB' }; break;
    }

    return {
        Icon: config.Icon,
        bgStyle: { backgroundColor: config.bg, opacity: dim },
        fgStyle: { color: config.fg, opacity: dim }
    };
}

function NotificationItemView({ item, onTab }: { item: NotificationModel, onTab: (i: NotificationModel) => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isRead = item.read_status;
    const { Icon, bgStyle, fgStyle } = getNotificationIconConfig(item.requesttype, isRead);
    const parsedDate = item.createddate ? parseApiDate(item.createddate) : new Date();
    const timeLabel = formatNotiTime(parsedDate);

    const isImageAttachment = (filePath: string) => {
        const ext = filePath.split('.').pop()?.toLowerCase();
        return ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp';
    };

    return (
        <div
            className={`${styles['noti-page__item']} ${!isRead ? styles['noti-page__item--unread'] : ''}`}
            onClick={() => onTab(item)}
        >
            <div className={styles['noti-page__avatar-wrap']}>
                <div className={styles['noti-page__avatar']} style={bgStyle}>
                    <Icon size={20} style={fgStyle} />
                </div>
                {!isRead && <div className={styles['noti-page__unread-dot']} />}
            </div>

            <div className={styles['noti-page__content']}>
                <div className={styles['noti-page__row']}>
                    <span className={`${styles['noti-page__item-title']} ${isRead ? styles['noti-page__item-title--normal'] : styles['noti-page__item-title--bold']}`}>
                        {item.title}
                    </span>
                    <span className={styles['noti-page__item-time']}>{timeLabel}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <p
                        className={`${styles['noti-page__item-desc']} ${!isRead ? styles['noti-page__item-desc--unread'] : ''}`}
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: isExpanded ? 'unset' : 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            margin: 0,
                            flex: 1
                        }}
                    >
                        {item.description}
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        style={{ background: 'none', border: 'none', padding: '4px', color: 'var(--color-neutral-400)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {item.processstatus && (() => {
                    const pStatus = item.processstatus.toLowerCase();
                    let bg = 'var(--color-primary-50, #eff6ff)';
                    let fg = 'var(--color-primary-700, #1d4ed8)';
                    let bd = 'var(--color-primary-200, #bfdbfe)';

                    if (pStatus.includes('third party') || pStatus.includes('thirdparty')) {
                        bg = 'var(--color-warning-50, #fff7ed)';
                        fg = 'var(--color-warning-700, #c2410c)';
                        bd = 'var(--color-warning-200, #fed7aa)';
                    } else if (pStatus.includes('complete') || pStatus.includes('completed')) {
                        bg = 'var(--color-success-50, #f0fdf4)';
                        fg = 'var(--color-success-700, #15803d)';
                        bd = 'var(--color-success-200, #bbf7d0)';
                    } else if (pStatus.includes('eb team') || pStatus.includes('eb')) {
                        bg = 'var(--color-primary-50, #eff6ff)';
                        fg = 'var(--color-primary-700, #1d4ed8)';
                        bd = 'var(--color-primary-200, #bfdbfe)';
                    } else {
                        bg = 'var(--color-neutral-50, #f9fafb)';
                        fg = 'var(--color-neutral-700, #374151)';
                        bd = 'var(--color-neutral-200, #e5e7eb)';
                    }

                    return (
                        <div style={{ marginTop: '8px' }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: bg,
                                color: fg,
                                border: `1px solid ${bd}`
                            }}>
                                {item.processstatus}
                            </span>
                        </div>
                    );
                })()}

                {item.attachments && item.attachments.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {item.attachments.map((att, idx) => {
                            const fileName = att.filePath ? att.filePath.split('/').pop() : `Attachment ${idx + 1}`;
                            const isImg = att.filePath ? isImageAttachment(att.filePath) : false;

                            return (
                                <a
                                    key={idx}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Pass filename instead of signedURL to bypass spaces/404 issues,
                                        // forcing file-utils to use the direct download API instead of window.open()
                                        downloadOrOpenAttachment({ filename: att.filePath });
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        textDecoration: 'none',
                                        width: 'fit-content',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isImg ? (
                                        <div style={{
                                            border: '1px solid var(--color-neutral-200, #e5e7eb)',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            width: '80px',
                                            height: '80px',
                                            backgroundColor: '#f9fafb'
                                        }}>
                                            <img src={att.signedURL} alt={fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            backgroundColor: 'var(--color-neutral-50, #f9fafb)',
                                            border: '1px solid var(--color-neutral-200, #e5e7eb)',
                                            borderRadius: '8px',
                                            color: 'var(--color-neutral-700)',
                                        }}>
                                            <FileText size={16} color="var(--color-neutral-500)" />
                                            <span style={{ 
                                                maxWidth: '220px', 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                fontSize: '12px',
                                                fontWeight: 500
                                            }} title={fileName}>
                                                {fileName}
                                            </span>
                                        </div>
                                    )}
                                </a>
                            );
                        })}
                    </div>
                )}
                
                {item.date && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-neutral-400)' }}>
                        {item.date.length === 8 ? `${item.date.substring(6,8)}/${item.date.substring(4,6)}/${item.date.substring(2,4)}` : item.date}
                    </div>
                )}
            </div>
        </div>
    );
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
            
            // Handle external deep links (e.g., for JOBPOST)
            if (item.deeplink && item.deeplink.startsWith('http')) {
                window.open(item.deeplink, '_blank', 'noopener,noreferrer');
                return;
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
                    {items.map((item) => (
                        <NotificationItemView key={item.syskey} item={item} onTab={handleItemTap} />
                    ))}

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
