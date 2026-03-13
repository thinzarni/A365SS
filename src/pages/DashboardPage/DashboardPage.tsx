/* ═══════════════════════════════════════════════════════════
   DashboardPage — Modern HR Dashboard
   Features: Greeting, live clock, time in/out, monthly stats,
             attendance records, quick-action tiles
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
    Clock,
    LogIn,
    LogOut,
    Timer,
    UserCheck,
    CalendarCheck,
    Activity,
    TreePalm,
    CalendarDays,
    ClipboardList,
    CheckSquare,
    Receipt,
    Calendar,
    Users,
    MapPin,
    X,
    FileText,
    ChevronRight,
    ImageIcon,
} from 'lucide-react';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import styles from './DashboardPage.module.css';

/* ── Types ── */
interface MonthlySummary {
    timeInCount: number;
    requiredWorkDays: number;
    workingDays: number;
    checkinCount: number;
    checkInCount: number;
    activityCount: number;
    leaveCount: number | string;
    submittedLeaveCount: string;
    workingday: string;
}

interface AttendanceRecord {
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

interface HomeData {
    attendanceList?: AttendanceRecord[];
}

type HomeDataResponse = AttendanceRecord[] | HomeData;

/* ── Helpers ── */
function formatDateYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dd}`;
}

function getGreeting(hour: number): string {
    if (hour < 12) return 'dashboard.greetingMorning';
    if (hour < 17) return 'dashboard.greetingAfternoon';
    return 'dashboard.greetingEvening';
}

function formatLiveTime(d: Date): { time: string; ampm: string } {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { time: `${h}:${m}:${s}`, ampm };
}


function getAttTypeName(type: number): { label: string; color: string; dot: string } {
    switch (type) {
        case 601: return { label: 'TIME IN', color: '#22c55e', dot: 'green' };
        case 602: return { label: 'TIME OUT', color: '#ef4444', dot: 'red' };
        case 603: return { label: 'ACTIVITY', color: '#8b5cf6', dot: 'purple' };
        case 604: return { label: 'CHECK IN', color: '#3b82f6', dot: 'blue' };
        default: return { label: 'RECORD', color: '#64748b', dot: 'blue' };
    }
}

function calcWorkingHours(records: AttendanceRecord[]): string {
    const timeEntries = records
        .filter(r => r.type === 601 || r.type === 602)
        .sort((a, b) => a.time.localeCompare(b.time));

    let totalMinutes = 0;
    let lastIn: Date | null = null;

    for (const entry of timeEntries) {
        const dt = parseTimeStr(entry.time);
        if (!dt) continue;
        if (entry.type === 601) {
            lastIn = dt;
        } else if (entry.type === 602 && lastIn) {
            const diff = dt.getTime() - lastIn.getTime();
            if (diff > 0) totalMinutes += diff / 60000;
            lastIn = null;
        }
    }

    // If last is time-in, count until now
    if (lastIn) {
        const now = new Date();
        const ref = new Date(lastIn);
        ref.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        const diff = now.getTime() - ref.getTime();
        if (diff > 0) totalMinutes += diff / 60000;
    }

    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeStr(t: string): Date | null {
    if (!t) return null;
    const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

/* ── Quick Action Items ── */
const quickActions = [
    { path: '/leave', icon: TreePalm, label: 'Leave', bg: '#fef3c7', color: '#d97706' },
    { path: '/claims', icon: Receipt, label: 'Claims', bg: '#fce7f3', color: '#db2777' },
    { path: '/holidays', icon: CalendarDays, label: 'Holidays', bg: '#dbeafe', color: '#2563eb' },
    { path: '/approvals', icon: CheckSquare, label: 'Approvals', bg: '#dcfce7', color: '#16a34a' },
    { path: '/requests', icon: ClipboardList, label: 'Requests', bg: '#f3e8ff', color: '#7c3aed' },
    { path: '/reservations', icon: Calendar, label: 'Reservations', bg: '#e0e7ff', color: '#4338ca' },
    { path: '/leave-summary', icon: TreePalm, label: 'Leave Summary', bg: '#ccfbf1', color: '#0d9488' },
    { path: '/team', icon: Users, label: 'Team', bg: '#fef9c3', color: '#ca8a04' },
];

/* ── Component ── */
export default function DashboardPage() {
    const { t, i18n } = useTranslation();
    const { user, userId, domain } = useAuthStore();
    const [now, setNow] = useState(new Date());
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    // Lock background scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = selectedRecord ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedRecord]);

    // Live clock
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const greeting = getGreeting(now.getHours());
    const { time: liveTime, ampm } = formatLiveTime(now);
    const dateDisplay = now.toLocaleDateString(i18n.language === 'my' ? 'my-MM' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const todayStr = formatDateYYYYMMDD(now);

    // ── Fetch monthly summary ──
    const { data: summary, isLoading: summaryLoading } = useQuery<MonthlySummary | null>({
        queryKey: ['dashboard-summary', todayStr],
        queryFn: async () => {
            try {
                const res = await mainClient.post(`api/checkin/monthly-summary?startDate=${todayStr}`);
                return res.data?.data ?? res.data ?? null;
            } catch {
                return null;
            }
        },
        staleTime: 60_000,
    });

    // ── Fetch today's attendance records ──
    const { data: homeData, isLoading: homeLoading } = useQuery<HomeDataResponse | null>({
        queryKey: ['dashboard-home', todayStr],
        queryFn: async () => {
            try {
                const res = await mainClient.post(`api/checkin/list?date=${todayStr}`, {
                    userid: userId,
                    domain: domain,
                });
                return res.data?.data ?? res.data ?? [];
            } catch {
                return [];
            }
        },
        staleTime: 30_000,
    });

    // ── Derived data ──
    const records: AttendanceRecord[] = useMemo(() => {
        const list = Array.isArray(homeData)
            ? homeData
            : (homeData as HomeData)?.attendanceList ?? [];

        return list.filter(r => [601, 602, 603, 604].includes(Number(r.type)));
    }, [homeData]);

    const timeIn = useMemo(() => records.find(r => r.type === 601), [records]);
    const timeOut = useMemo(() => records.find(r => r.type === 602), [records]);
    const workingHours = useMemo(() => calcWorkingHours(records), [records]);

    const monthName = now.toLocaleDateString(i18n.language === 'my' ? 'my-MM' : 'en-US', { month: 'long', year: 'numeric' });
    const isLoading = summaryLoading || homeLoading;

    // ── Loading state ──
    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
                <div className={styles.clockRow}>
                    <div className={`${styles.skeleton} ${styles.skeletonClock}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonClock}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonClock}`} />
                </div>
                <div className={styles.statsRow}>
                    {[1, 2, 3, 4].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonStat}`} />)}
                </div>
                <div className={styles.recordsGrid}>
                    {[1, 2, 3, 4].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonRecord}`} />)}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* ── Hero / Greeting ── */}
            <section className={styles.hero}>
                <div className={styles.heroLeft}>
                    <div className={styles.greeting}>{t(greeting)},</div>
                    <div className={styles.userName}>{user?.name || user?.userid || 'User'}</div>
                    <div className={styles.dateStr}>{dateDisplay}</div>
                </div>
                <div className={styles.heroRight}>
                    <div className={styles.liveTime}>
                        {liveTime}
                        <span className={styles.ampm}>{ampm}</span>
                    </div>
                </div>
            </section>

            {/* ── Time In / Time Out / Working Hours ── */}
            <section className={styles.clockRow}>
                <div className={styles.clockCard}>
                    <div className={styles.clockLabel}>
                        <LogIn size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {t('dashboard.timeIn')}
                    </div>
                    <div className={`${styles.clockValue} ${!timeIn ? styles.dimmed : ''}`}>
                        {timeIn?.time || liveTime.slice(0, -3)}
                    </div>
                    <span className={`${styles.clockTag} ${styles.tagIn}`}>
                        {timeIn ? t('dashboard.recorded') : t('dashboard.notYet')}
                    </span>
                </div>

                <div className={styles.clockCard}>
                    <div className={styles.clockLabel}>
                        <LogOut size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {t('dashboard.timeOut')}
                    </div>
                    <div className={`${styles.clockValue} ${!timeOut ? styles.dimmed : ''}`}>
                        {timeOut?.time || '--:--'}
                    </div>
                    <span className={`${styles.clockTag} ${styles.tagOut}`}>
                        {timeOut ? t('dashboard.recorded') : t('dashboard.waiting')}
                    </span>
                </div>

                <div className={styles.clockCard}>
                    <div className={styles.clockLabel}>
                        <Timer size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {t('dashboard.workingHours')}
                    </div>
                    <div className={`${styles.clockValue} ${workingHours === '00:00' ? styles.dimmed : ''}`}>
                        {workingHours}
                    </div>
                    <span className={`${styles.clockTag} ${styles.tagHours}`}>
                        {timeIn && !timeOut ? t('dashboard.inProgress') : timeOut ? t('dashboard.complete') : t('dashboard.idle')}
                    </span>
                </div>
            </section>

            {/* ── Monthly Summary Stats ── */}
            <section>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{t('dashboard.monthlyOverview')}</h2>
                    <span className={styles.monthLabel}>{monthName}</span>
                </div>
                <div className={styles.statsRow}>
                    <div
                        className={styles.statCard}
                        style={{ '--stat-color': '#2563eb', '--stat-bg': '#eff6ff' } as React.CSSProperties}
                    >
                        <div className={styles.statIcon}><UserCheck size={20} /></div>
                        <div className={styles.statValue}>
                            {summary?.timeInCount ?? 0}
                            <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>
                                /{summary?.requiredWorkDays ?? summary?.workingDays ?? 0}
                            </span>
                        </div>
                        <div className={styles.statLabel}>{t('dashboard.attendance')}</div>
                    </div>

                    <div
                        className={styles.statCard}
                        style={{ '--stat-color': '#0891b2', '--stat-bg': '#ecfeff' } as React.CSSProperties}
                    >
                        <div className={styles.statIcon}><CalendarCheck size={20} /></div>
                        <div className={styles.statValue}>
                            {summary?.checkinCount ?? summary?.checkInCount ?? 0}
                        </div>
                        <div className={styles.statLabel}>{t('dashboard.checkins')}</div>
                    </div>

                    <div
                        className={styles.statCard}
                        style={{ '--stat-color': '#7c3aed', '--stat-bg': '#f5f3ff' } as React.CSSProperties}
                    >
                        <div className={styles.statIcon}><Activity size={20} /></div>
                        <div className={styles.statValue}>
                            {summary?.activityCount ?? 0}
                        </div>
                        <div className={styles.statLabel}>{t('dashboard.activities')}</div>
                    </div>

                    <div
                        className={styles.statCard}
                        style={{ '--stat-color': '#ea580c', '--stat-bg': '#fff7ed' } as React.CSSProperties}
                    >
                        <div className={styles.statIcon}><TreePalm size={20} /></div>
                        <div className={styles.statValue}>
                            {summary?.leaveCount ?? 0}
                        </div>
                        <div className={styles.statLabel}>{t('dashboard.leaves')}</div>
                    </div>
                </div>
            </section>

            {/* ── Today Record ── */}
            <section>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Activity size={20} style={{ color: '#2563eb' }} />
                        {t('dashboard.todayRecord')}
                        {records.length > 0 && (
                            <span className={styles.sectionBadge}>{records.length}</span>
                        )}
                    </h2>
                    <Link to="/attendance" className={styles.viewAllLink}>
                        {t('dashboard.viewMore')}
                    </Link>
                </div>
                <div className={styles.recordsGrid}>
                    {records.length === 0 ? (
                        <div className={styles.emptyRecord}>
                            <Clock size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                            <div>{t('dashboard.noRecords')}</div>
                        </div>
                    ) : (
                        records.map((rec, idx) => {
                            const meta = getAttTypeName(rec.type);
                            const displayTime = rec.type === 603
                                ? `${rec.starttime || ''} – ${rec.endtime || ''}`
                                : rec.time;
                            return (
                                <div
                                    key={idx}
                                    className={styles.recordCard}
                                    onClick={() => setSelectedRecord(rec)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.recordLeft}>
                                        <div className={`${styles.recordIcon} ${styles[meta.dot]}`}>
                                            {rec.type === 601 ? <LogIn size={18} /> :
                                                rec.type === 602 ? <LogOut size={18} /> :
                                                    rec.type === 603 ? <Activity size={18} /> :
                                                        <Clock size={18} />}
                                        </div>
                                        <div className={styles.recordInfo}>
                                            <div className={styles.recordTypeText}>
                                                {(rec.type === 603 || rec.type === 604)
                                                    ? (rec.activityType || rec.activitytype || rec.checkInType || rec.checkintype || meta.label)
                                                    : meta.label}
                                            </div>
                                            <div className={styles.recordTimeText}>{displayTime || '--:--'}</div>
                                        </div>
                                    </div>

                                    <div className={styles.recordRight}>
                                        {rec.images && rec.images.length > 0 && (
                                            <div className={styles.imageCountBadge}>
                                                <ImageIcon size={12} /> {rec.images.length}
                                            </div>
                                        )}
                                        <span className={`${styles.recordStatus} ${rec.remoteapproval === 3 || rec.backdateapproval === 3
                                            ? styles.failed
                                            : rec.remoteapproval === 1 || rec.backdateapproval === 1
                                                ? styles.pending
                                                : styles.success
                                            }`}>
                                            {rec.remoteapproval === 3 || rec.backdateapproval === 3
                                                ? t('request.reject')
                                                : rec.remoteapproval === 1 || rec.backdateapproval === 1
                                                    ? t('status.pending')
                                                    : t('dashboard.synced')}
                                        </span>
                                        {(rec.location || rec.description) && (
                                            <div className={styles.recordLocation}>
                                                <MapPin size={12} />
                                                <span>{rec.location || rec.description || ''}</span>
                                            </div>
                                        )}
                                        <ChevronRight size={14} style={{ color: '#94a3b8', marginLeft: 4 }} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* ── Quick Actions ── */}
            <section>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{t('dashboard.quickActions')}</h2>
                </div>
                <div className={styles.actionsGrid}>
                    {quickActions.map(({ path, icon: Icon, label, bg, color }) => {
                        const labelKeyMap: Record<string, string> = {
                            'Leave': 'nav.leave',
                            'Claims': 'nav.claims',
                            'Holidays': 'nav.holidays',
                            'Approvals': 'nav.approvals',
                            'Requests': 'nav.myRequests',
                            'Reservations': 'nav.reservations',
                            'Leave Summary': 'nav.leaveSummary',
                            'Team': 'nav.team'
                        };
                        const key = labelKeyMap[label] || label;
                        return (
                            <Link key={path} to={path} className={styles.actionCard}>
                                <div className={styles.actionIcon} style={{ background: bg, color }}>
                                    <Icon size={24} />
                                </div>
                                <span className={styles.actionLabel}>{t(key)}</span>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* ── Attendance Record Detail Modal ── */}
            {selectedRecord && (() => {
                const meta = getAttTypeName(selectedRecord.type);
                const isRejected = selectedRecord.remoteapproval === 3 || selectedRecord.backdateapproval === 3;
                const isPending = selectedRecord.remoteapproval === 1 || selectedRecord.backdateapproval === 1;
                const statusLabel = isRejected ? 'Rejected' : isPending ? 'Pending' : 'Synced';
                const statusColor = isRejected ? '#dc2626' : isPending ? '#d97706' : '#16a34a';
                const statusBg = isRejected ? '#fee2e2' : isPending ? '#fef3c7' : '#dcfce7';
                const displayTime = selectedRecord.type === 603
                    ? `${selectedRecord.starttime || '--'} – ${selectedRecord.endtime || '--'}`
                    : selectedRecord.time || '--:--';
                const formattedDate = (() => {
                    const d = selectedRecord.date;
                    if (d?.length === 8) {
                        const dt = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
                        return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    }
                    return d || '';
                })();

                return (
                    <>
                        {/* Backdrop */}
                        <div
                            onClick={() => setSelectedRecord(null)}
                            style={{
                                position: 'fixed', inset: 0,
                                background: 'rgba(15,23,42,0.5)',
                                zIndex: 200,
                                backdropFilter: 'blur(4px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            {/* Modal card — stop click bubbling to backdrop */}
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    background: 'var(--color-surface, #fff)',
                                    borderRadius: 20,
                                    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                                    width: '92%',
                                    maxWidth: 420,
                                    overflow: 'hidden',
                                    animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                                }}
                            >
                                {/* Colored header banner */}
                                <div style={{
                                    background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}44)`,
                                    borderBottom: `3px solid ${meta.color}33`,
                                    padding: '20px 20px 16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 52, height: 52, borderRadius: '50%',
                                            background: meta.color + '22',
                                            border: `2px solid ${meta.color}44`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: meta.color,
                                        }}>
                                            {selectedRecord.type === 601 ? <LogIn size={24} /> :
                                                selectedRecord.type === 602 ? <LogOut size={24} /> :
                                                    selectedRecord.type === 603 ? <Activity size={24} /> :
                                                        <Clock size={24} />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 17, color: meta.color, letterSpacing: '-0.01em' }}>
                                                {meta.label}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                                Attendance Record
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedRecord(null)}
                                        style={{
                                            background: 'rgba(100,116,139,0.1)', border: 'none',
                                            cursor: 'pointer', width: 32, height: 32,
                                            borderRadius: '50%', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            color: '#64748b',
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Detail rows */}
                                <div style={{ padding: '18px 20px 8px', display: 'flex', flexDirection: 'column', gap: 0 }}>

                                    {/* Time */}
                                    <DetailRow icon={<Clock size={15} />} label="Time" value={displayTime} />

                                    {/* Date */}
                                    {formattedDate && <DetailRow icon={<CalendarDays size={15} />} label="Date" value={formattedDate} />}

                                    {/* Status badge */}
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}><UserCheck size={15} /></span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <span style={{ fontSize: 13, color: '#475569', minWidth: 80 }}>Status</span>
                                            <span style={{
                                                padding: '3px 12px', borderRadius: 20,
                                                fontSize: 12, fontWeight: 700,
                                                background: statusBg, color: statusColor,
                                            }}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {(selectedRecord.location) && (
                                        <DetailRow icon={<MapPin size={15} />} label="Location" value={selectedRecord.location} />
                                    )}

                                    {/* Activity / CheckIn type */}
                                    {(selectedRecord.activityType || selectedRecord.checkInType || selectedRecord.attType) && (
                                        <DetailRow
                                            icon={<FileText size={15} />}
                                            label="Type"
                                            value={selectedRecord.activityType || selectedRecord.checkInType || selectedRecord.attType || ''}
                                        />
                                    )}

                                    {/* Description */}
                                    {selectedRecord.description && (
                                        <div style={{ padding: '12px 0 4px' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ color: '#94a3b8', display: 'flex' }}><FileText size={15} /></span>
                                                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Description</span>
                                            </div>
                                            <div style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: 10,
                                                padding: '10px 14px',
                                                fontSize: 13,
                                                color: '#334155',
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-wrap',
                                            }}>
                                                {selectedRecord.description}
                                            </div>
                                        </div>
                                    )}

                                    {/* Images */}
                                    {selectedRecord.images && selectedRecord.images.length > 0 && (
                                        <div style={{ padding: '12px 0 4px' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ color: '#94a3b8', display: 'flex' }}><ImageIcon size={15} /></span>
                                                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Photos ({selectedRecord.images.length})</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {selectedRecord.images.map((img, i) => (
                                                    <a key={i} href={img.content} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={img.content}
                                                            alt={img.name}
                                                            style={{
                                                                width: 80, height: 80, objectFit: 'cover',
                                                                borderRadius: 10, border: '1px solid #e2e8f0',
                                                                cursor: 'pointer',
                                                            }}
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer close button */}
                                <div style={{ padding: '12px 20px 20px' }}>
                                    <button
                                        onClick={() => setSelectedRecord(null)}
                                        style={{
                                            width: '100%', padding: '11px',
                                            background: meta.color, color: '#fff',
                                            border: 'none', borderRadius: 12,
                                            fontSize: 14, fontWeight: 700,
                                            cursor: 'pointer', letterSpacing: '0.02em',
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>

                        <style>{`
                            @keyframes modalIn {
                                from { opacity: 0; transform: scale(0.88); }
                                to   { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                    </>
                );
            })()}
        </div>
    );
}

/** Reusable detail row inside the modal */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}>{icon}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: '#475569', flexShrink: 0, minWidth: 80 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
            </div>
        </div>
    );
}
