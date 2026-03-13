import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    LogIn,
    LogOut,
    Activity,
    MapPin,
    FileText,
    CalendarDays,
    Share2
} from 'lucide-react';
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    addWeeks,
    subWeeks
} from 'date-fns';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { useAttendanceStore } from '../../stores/attendance-store';
import styles from './AttendancePage.module.css';
import AddActivityModal from './AddActivityModal';
import { ShareToChatModal } from '../../components/chat/ShareToChatModal';

/* ── Helpers ── */
function formatAttDate(raw?: string): string {
    if (!raw) return '';
    const clean = raw.replace(/-/g, '');
    if (clean.length !== 8) return raw;
    try {
        const d = new Date(+clean.slice(0, 4), +clean.slice(4, 6) - 1, +clean.slice(6, 8));
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return raw; }
}

/* ── Types ── */
interface AttendanceRecord {
    syskey?: string;
    type: number;       // 601=TimeIn, 602=TimeOut, 603=Activity, 604=CheckIn
    time: string;       // "hh:mm AM/PM"
    date: string;       // "yyyyMMdd"
    location?: string;
    description?: string;
    status?: string;
    attType?: string;
    checkInType?: string;
    checkintype?: string;
    activityType?: string;
    activitytype?: string;
    remoteapproval?: number;
    backdateapproval?: number;
    starttime?: string;
    endtime?: string;
    images?: { name: string; mimeType: string; content: string }[];
}

function formatDateYYYYMMDD(d: Date): string {
    return format(d, 'yyyyMMdd');
}

function getAttTypeName(type: number): { label: string; color: string; dot: string } {
    switch (type) {
        case 601: return { label: 'Time In', color: '#22c55e', dot: 'green' };
        case 602: return { label: 'Time Out', color: '#ef4444', dot: 'red' };
        case 603: return { label: 'Activity', color: '#8b5cf6', dot: 'purple' };
        case 604: return { label: 'Check In', color: '#3b82f6', dot: 'blue' };
        default: return { label: 'Record', color: '#64748b', dot: 'blue' };
    }
}

export default function AttendancePage() {
    const { userId, domain } = useAuthStore();
    const { selectedDate, setSelectedDate } = useAttendanceStore();

    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 }));
    const [shareRec, setShareRec] = useState<AttendanceRecord | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Ensure week slider aligns with selected date if changed externally
    useEffect(() => {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        setCurrentWeekStart(weekStart);
    }, [selectedDate]);

    const queryClient = useQueryClient();

    const todayStr = formatDateYYYYMMDD(selectedDate);

    // Fetch records for the selected date
    const { data: recordsData, isLoading: isLoadingRecords, isFetching } = useQuery({
        queryKey: ['attendance-list', todayStr, userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(`api/checkin/list?date=${todayStr}`, {
                userid: userId,
                domain: domain,
            });
            return (res.data?.data ?? res.data ?? []) as AttendanceRecord[];
        },
    });

    // Derive records
    const records = useMemo(() => {
        const list = Array.isArray(recordsData) ? recordsData : ((recordsData as any)?.attendanceList ?? []);
        return list.filter((r: any) => [601, 602, 603, 604].includes(Number(r.type)));
    }, [recordsData]);

    const daysInWeek = useMemo(() => {
        const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: currentWeekStart, end });
    }, [currentWeekStart]);

    const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
    const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
    const handleSelectToday = () => {
        const now = new Date();
        setSelectedDate(now);
        setCurrentWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
    };

    return (
        <div className={styles.page}>
            {/* ── Header Area ── */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Attendance</h1>
                    <div className={styles.pageSubtitle}>Track your daily check-ins and activities</div>
                </div>
                <button className={styles.todayBtn} onClick={handleSelectToday}>
                    <CalendarDays size={16} />
                    Today
                </button>
            </div>

            {/* ── Horizontal Week Calendar ── */}
            <div className={styles.calendarContainer}>
                <div className={styles.monthHeader}>
                    <button className={styles.navBtn} onClick={handlePrevWeek}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className={styles.currentMonth}>
                        {format(currentWeekStart, 'MMMM yyyy')}
                    </div>
                    <button className={styles.navBtn} onClick={handleNextWeek}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className={styles.daysRow}>
                    {daysInWeek.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        return (
                            <button
                                key={day.toISOString()}
                                className={`${styles.dayBtn} ${isSelected ? styles.selected : ''} ${isToday && !isSelected ? styles.today : ''}`}
                                onClick={() => setSelectedDate(day)}
                            >
                                <span className={styles.dayName}>{format(day, 'EEE')}</span>
                                <span className={styles.dayNumber}>{format(day, 'd')}</span>
                                {isToday && <span className={styles.todayDot} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Records List ── */}
            <div className={styles.recordsSection}>
                <div className={styles.recordsHeader}>
                    <h3>{isSameDay(selectedDate, new Date()) ? 'Today\'s Records' : format(selectedDate, 'MMMM d, yyyy')}</h3>
                    {(isLoadingRecords || isFetching) && <span className={styles.loadingSpinner}></span>}
                </div>

                {isLoadingRecords ? (
                    <div className={styles.skeletonList}>
                        {[1, 2, 3].map(i => <div key={i} className={styles.skeletonCard} />)}
                    </div>
                ) : records.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}><Clock size={32} /></div>
                        <h4>No records found</h4>
                        <p>There are no attendance or activity records for this date.</p>
                    </div>
                ) : (
                    <div className={styles.timeline}>
                        {records.map((rec: AttendanceRecord, idx: number) => {
                            const meta = getAttTypeName(rec.type);
                            const displayTime = rec.type === 603
                                ? `${rec.starttime || ''} - ${rec.endtime || ''}`
                                : rec.time;

                            const isRejected = rec.remoteapproval === 3 || rec.backdateapproval === 3;
                            const isPending = rec.remoteapproval === 1 || rec.backdateapproval === 1;

                            return (
                                <div key={idx} className={styles.timelineItem}>
                                    <div className={styles.timelineLine}>
                                        <div className={`${styles.timelineDot} ${styles[meta.dot]}`}>
                                            {rec.type === 601 ? <LogIn size={14} /> :
                                                rec.type === 602 ? <LogOut size={14} /> :
                                                    rec.type === 603 ? <Activity size={14} /> :
                                                        <Clock size={14} />}
                                        </div>
                                    </div>
                                    <div className={styles.recordCard}>
                                        <div className={styles.recordTop}>
                                            <div className={styles.recordTypeInfo}>
                                                <span className={styles.recordTypeName} style={{ color: meta.color }}>
                                                    {(rec.type === 603 || rec.type === 604) ? (rec.activityType || rec.activitytype || rec.checkInType || rec.checkintype || meta.label) : meta.label}
                                                </span>
                                                <span className={styles.recordTime}>{displayTime || '--:--'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div className={`${styles.statusBadge} ${isRejected ? styles.failed : isPending ? styles.pending : styles.success}`}>
                                                    {isRejected ? 'Rejected' : isPending ? 'Pending' : 'Synced'}
                                                </div>
                                                {!isRejected && !isPending && (
                                                    <button
                                                        className={styles.shareBtn}
                                                        title="Share to Chat"
                                                        onClick={() => setShareRec(rec)}
                                                    >
                                                        <Share2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {(rec.activityType || rec.checkInType || rec.attType) && (
                                            <div className={styles.recordDetailRow}>
                                                <FileText size={14} className={styles.detailIcon} />
                                                <span>{rec.activityType || rec.checkInType || rec.attType}</span>
                                            </div>
                                        )}

                                        {rec.location && (
                                            <div className={styles.recordDetailRow}>
                                                <MapPin size={14} className={styles.detailIcon} />
                                                <span>{rec.location}</span>
                                            </div>
                                        )}

                                        {rec.description && (
                                            <div className={styles.recordDesc}>
                                                {rec.description}
                                            </div>
                                        )}

                                        {rec.images && rec.images.length > 0 && (
                                            <div className={styles.imageRow}>
                                                {rec.images.map((img, i) => (
                                                    <a key={i} href={img.content} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={img.content}
                                                            alt={img.name}
                                                            className={styles.recordThumbnail}
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Floating Add Button ── */}
            <button
                className={styles.fab}
                onClick={() => setIsAddModalOpen(true)}
                title="Add Activity"
            >
                <Plus size={24} />
            </button>

            {/* ── Add Activity Modal ── */}
            <AddActivityModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                selectedDate={selectedDate}
                onSuccess={() => {
                    // Refetch records for this date
                    queryClient.invalidateQueries({ queryKey: ['attendance-list', todayStr, userId, domain] });
                }}
            />

            {/* ── Share to Chat Modal ── */}
            {shareRec && (() => {
                const titleEmoji = shareRec.type === 601 ? '⏱️ Time In'
                    : shareRec.type === 602 ? '⏱️ Time Out'
                        : shareRec.type === 604 ? '🏢 Check-In Record'
                            : '📋 Activity Record';
                const lines: string[] = [titleEmoji];
                if (shareRec.type === 603) {
                    lines.push(`⏰ ${shareRec.starttime || ''} – ${shareRec.endtime || ''}`);
                } else {
                    lines.push(`⏰ ${shareRec.time || ''}`);
                }
                if (shareRec.location) lines.push(`📍 ${shareRec.location}`);
                const actName = shareRec.activityType || shareRec.activitytype || shareRec.checkInType || shareRec.checkintype;
                if (actName && shareRec.type !== 601 && shareRec.type !== 602) lines.push(`🏷️ ${actName}`);
                if (shareRec.description) lines.push(`📝 ${shareRec.description}`);
                lines.push(`📅 ${formatAttDate(shareRec.date)}`);
                return (
                    <ShareToChatModal
                        shareText={lines.join('\n')}
                        onClose={() => setShareRec(null)}
                    />
                );
            })()}
        </div>
    );
}
