/* ═══════════════════════════════════════════════════════════
   DashboardPage — Modern HR Dashboard
   Features: Greeting, live clock, time in/out, monthly stats,
             attendance records, quick-action tiles
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo } from 'react';
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
    ChevronRight,
    ImageIcon,
    BarChart3,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { ADMIN_ATTENDANCE_COUNTS } from '../../config/api-routes';
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
        case 604: return { label: 'CHECK IN', color: 'var(--color-primary-500)', dot: 'blue' };
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
    { path: '/holidays', icon: CalendarDays, label: 'Holidays', bg: 'var(--color-primary-100)', color: 'var(--color-primary-600)' },
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
    const [now] = useState(new Date());
    // const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    // const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
    const [, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    // ── Fetch admin card data ──
    const { data: adminCardData, isLoading: adminLoading } = useQuery({
        queryKey: ['admin-card-data'],
        queryFn: async () => {
            try {
                const res = await mainClient.post(ADMIN_ATTENDANCE_COUNTS);
                return res.data?.data ?? res.data ?? null;
            } catch {
                return null;
            }
        },
        staleTime: 60_000,
    });

    // Chart data derived from API
    const employeeStatusData = useMemo(() => {
        if (!adminCardData) {
            // Fallback data
            return [
                { name: t('dashboard.presentEmployees'), value: 24, color: '#16a34a' },
                { name: t('dashboard.onLeave'), value: 5, color: '#d97706' },
                { name: t('dashboard.absentEmployees'), value: 3, color: '#dc2626' },
                { name: t('dashboard.remoteWorking'), value: 8, color: '#0891b2' },
            ];
        }

        return [
            { name: t('dashboard.presentEmployees'), value: Number(adminCardData.presentEmployees) || 0, color: '#16a34a' },
            { name: t('dashboard.onLeave'), value: Number(adminCardData.leaveCount) || 0, color: '#d97706' },
            { name: t('dashboard.absentEmployees'), value: Number(adminCardData.absentEmployees) || 0, color: '#dc2626' },
            { name: t('dashboard.remoteWorking'), value: Number(adminCardData.workFromHomeCount) || 0, color: '#0891b2' },
            { name: t('dashboard.lateEmployees'), value: Number(adminCardData.lateEmployees) || 0, color: '#f59e0b' },
            { name: t('dashboard.earlyOutEmployees'), value: Number(adminCardData.earlyOutEmployees) || 0, color: '#8b5cf6' },
        ];
    }, [adminCardData, t]);



    const greeting = getGreeting(new Date().getHours());
    const { time: liveTime, ampm } = formatLiveTime(new Date());
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

    // ── Fetch employees data ──
    // const { data: employees, isLoading: employeesLoading } = useQuery({
    //     queryKey: ['dashboard-employees', todayStr, userId, domain],
    //     queryFn: async () => {
    //         try {
    //             const res = await mainClient.post(ADMIN_ATTENDANCE_LIST, {
    //                 date: todayStr,
    //                 status: '0', // All employees
    //                 searchVal: '',
    //                 page: 1,
    //                 limit: 20,
    //                 type: 0,
    //                 userid: userId,
    //                 domain: domain
    //             });
    //             return res.data?.data ?? res.data ?? [];
    //         } catch {
    //             return [];
    //         }
    //     },
    //     staleTime: 60_000,
    // });

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

    const monthName = now.toLocaleDateString(i18n.language === 'my-MM' ? 'my-MM' : 'en-US', { month: 'long', year: 'numeric' });
    const isLoading = summaryLoading || homeLoading || adminLoading;

    // Handle bar click to fetch specific employee data
    /*
    const handleBarClick = async (data: any) => {
        try {
            // Convert status names to match API expectations (matching admin attendance page)
            let statusValue = '0'; // Default to all
            const statusName = data.name.toLowerCase();

            if (statusName.includes('present')) {
                statusValue = '1'; // Present
            } else if (statusName.includes('leave')) {
                statusValue = '2'; // Leave
            } else if (statusName.includes('absent')) {
                statusValue = '4'; // Absent (Note: '4' not '3')
            } else if (statusName.includes('remote') || statusName.includes('work from home')) {
                statusValue = '4'; // Remote work uses same as absent
            } else if (statusName.includes('late')) {
                statusValue = '5'; // Late In
            } else if (statusName.includes('early')) {
                statusValue = '6'; // Early Out
            }

            setSelectedStatus(data.name);

            // Call API to get filtered employees using the same endpoint as admin attendance
            const res = await mainClient.post(ADMIN_ATTENDANCE_LIST, {
                date: todayStr,
                status: statusValue,
                searchVal: '',
                page: 1,
                limit: 50,
                type: 0,
                userid: userId,
                domain: domain
            });

            setFilteredEmployees(res.data?.data || []);
        } catch (error) {
            console.error('Error fetching filtered employees:', error);
            setFilteredEmployees([]);
        }
    };
    */

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
                <div className={styles.chartsGrid}>
                    {[1, 2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonInsight}`} />)}
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
                        style={{ '--stat-color': 'var(--color-primary-600)', '--stat-bg': 'var(--color-primary-50)' } as React.CSSProperties}
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



            {/* Spacer between sections */}
            <div style={{ marginBottom: '2rem' }} />

            {/* ── Today Record ── */}
            <section>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Activity size={20} style={{ color: 'var(--color-primary-600)' }} />
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

            {/* Spacer between sections */}
            <div style={{ marginBottom: '2rem' }} />

            {/* ───────────────── ADMIN INSIGHTS SECTION ───────────────── */}

            <section>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <BarChart3 size={20} style={{ color: '#2563eb' }} />
                        Workforce Analytics
                    </h2>
                </div>

                {/* ───────────────── ANALYTICS CARD ───────────────── */}
                <div className={styles.analyticsCard} style={{ width: '60%' }}>

                    {/* CARD SUBTITLE */}
                    <div className={styles.cardHeader}>
                        <div>
                            <p className={styles.cardSubtitle}>
                                Employee attendance overview
                            </p>
                        </div>
                    </div>
                    {/* CHART */}
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={employeeStatusData}
                                margin={{
                                    top: 35,
                                    right: 20,
                                    left: 10,
                                    bottom: 35
                                }}
                                barCategoryGap="28%"
                            >

                                {/* GRID */}
                                <CartesianGrid
                                    strokeDasharray="3 10"
                                    stroke="rgba(148,163,184,0.12)"
                                    vertical={false}
                                />

                                {/* X AXIS */}
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    height={50}
                                    tickMargin={14}
                                    tick={{
                                        fill: '#64748b',
                                        fontSize: 13,
                                        fontWeight: 700
                                    }}
                                />

                                {/* Y AXIS */}
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    width={35}
                                    tick={{
                                        fill: '#94a3b8',
                                        fontSize: 12,
                                        fontWeight: 600
                                    }}
                                />

                                {/* TOOLTIP */}
                                <Tooltip
                                    cursor={{
                                        fill: 'rgba(99,102,241,0.04)'
                                    }}
                                    contentStyle={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        color: '#1e293b',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                    }}
                                />

                                {/* BARS */}
                                <Bar
                                    dataKey="value"
                                    maxBarSize={42}
                                    animationDuration={1200}
                                    // onClick={(data: any) => {
                                    //     handleBarClick(data);
                                    // }}
                                    shape={(props: any) => {

                                        const {
                                            x,
                                            y,
                                            width,
                                            height,
                                            value,
                                            index
                                        } = props;

                                        const item = employeeStatusData[index];
                                        const depth = 10;
                                        const isHovered = props.isHovered;

                                        if (!value || value <= 0) {
                                            return (
                                                <g>
                                                    {/* BASE */}
                                                    <rect
                                                        x={x + 4}
                                                        y={y + height + 8}
                                                        width={width - 6}
                                                        height={4}
                                                        rx={4}
                                                        fill="rgba(148,163,184,0.18)"
                                                    />

                                                    {/* VALUE */}
                                                    <text
                                                        x={x + width / 2}
                                                        y={y - 10}
                                                        textAnchor="middle"
                                                        fill="#cbd5e1"
                                                        fontSize={13}
                                                        fontWeight={700}
                                                    >
                                                        0
                                                    </text>
                                                </g>
                                            );
                                        }
                                        return (
                                            <g>
                                                {/* SHADOW */}
                                                <ellipse
                                                    cx={x + width / 2 + 4}
                                                    cy={y + height + 12}
                                                    rx={width / 1.6}
                                                    ry={6}
                                                    fill={isHovered ? "rgba(15,23,42,0.18)" : "rgba(15,23,42,0.12)"}
                                                />
                                                {/* RIGHT FACE */}
                                                <path
                                                    d={`
                                            M ${x + width} ${y}
                                            L ${x + width + depth} ${y - depth}
                                            L ${x + width + depth} ${y + height - depth}
                                            L ${x + width} ${y + height}
                                            Z
                                        `}
                                                    fill={item.color}
                                                    opacity={0.65}
                                                />

                                                {/* TOP FACE */}
                                                <path
                                                    d={`
                                            M ${x} ${y}
                                            L ${x + depth} ${y - depth}
                                            L ${x + width + depth} ${y - depth}
                                            L ${x + width} ${y}
                                            Z
                                        `}
                                                    fill={item.color}
                                                    opacity={0.85}
                                                />

                                                {/* MAIN FACE */}
                                                <rect
                                                    x={x}
                                                    y={y}
                                                    width={width}
                                                    height={height}
                                                    fill={item.color}
                                                    opacity={isHovered ? 0.9 : 1}
                                                />

                                                {/* MAIN GRADIENT OVERLAY */}
                                                <defs>
                                                    <linearGradient id={`barGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                                                        <stop offset="30%" stopColor="rgba(255,255,255,0.15)" />
                                                        <stop offset="70%" stopColor="rgba(0,0,0,0.1)" />
                                                        <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                                                    </linearGradient>
                                                </defs>
                                                <rect
                                                    x={x}
                                                    y={y}
                                                    width={width}
                                                    height={height}
                                                    fill={`url(#barGradient-${index})`}
                                                    opacity={isHovered ? 0.8 : 0.6}
                                                />

                                                {/* LEFT SIDE GLOSS */}
                                                <rect
                                                    x={x + 2}
                                                    y={y + 8}
                                                    width={width * 0.08}
                                                    height={height - 16}
                                                    fill="rgba(255,255,255,0.6)"
                                                    rx={2}
                                                />



                                                {/* BOTTOM SHADOW */}
                                                <rect
                                                    x={x + 2}
                                                    y={y + height - 8}
                                                    width={width - 4}
                                                    height={6}
                                                    fill="rgba(0,0,0,0.15)"
                                                    rx={3}
                                                />


                                                {/* HOVER EFFECTS */}
                                                {isHovered && (
                                                    <>
                                                        {/* ENHANCED RIGHT FACE */}
                                                        <path
                                                            d={`
                                                    M ${x + width} ${y}
                                                    L ${x + width + depth} ${y - depth}
                                                    L ${x + width + depth} ${y + height - depth}
                                                    L ${x + width} ${y + height}
                                                    Z
                                                `}
                                                            fill={item.color}
                                                            opacity={0.8}
                                                        />

                                                        {/* ENHANCED TOP FACE */}
                                                        <path
                                                            d={`
                                                    M ${x} ${y}
                                                    L ${x + depth} ${y - depth}
                                                    L ${x + width + depth} ${y - depth}
                                                    L ${x + width} ${y}
                                                    Z
                                                `}
                                                            fill={item.color}
                                                            opacity={0.9}
                                                        />

                                                        {/* ENHANCED MAIN FACE */}
                                                        <rect
                                                            x={x}
                                                            y={y}
                                                            width={width}
                                                            height={height}
                                                            fill={item.color}
                                                            opacity={0.95}
                                                        />

                                                        {/* ENHANCED GLOSS EFFECTS */}
                                                        <defs>
                                                            <linearGradient id={`hoverGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                                                                <stop offset="40%" stopColor="rgba(255,255,255,0.3)" />
                                                                <stop offset="80%" stopColor="rgba(0,0,0,0.05)" />
                                                                <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
                                                            </linearGradient>
                                                        </defs>
                                                        <rect
                                                            x={x}
                                                            y={y}
                                                            width={width}
                                                            height={height}
                                                            fill={`url(#hoverGradient-${index})`}
                                                            opacity={0.9}
                                                        />

                                                        {/* BRIGHT LEFT GLOSS */}
                                                        <rect
                                                            x={x + 2}
                                                            y={y + 6}
                                                            width={width * 0.1}
                                                            height={height - 12}
                                                            fill="rgba(255,255,255,0.8)"
                                                            rx={2}
                                                        />



                                                    </>
                                                )}

                                                {/* VALUE */}
                                                <text
                                                    x={x + width / 2 + 8}
                                                    y={y - 12}
                                                    textAnchor="middle"
                                                    fill={item.color}
                                                    fontSize={14}
                                                    fontWeight={800}
                                                >
                                                    {value}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ───────────────── RIGHT : EMPLOYEE CARD ───────────────── - COMMENTED OUT */}
                {/* <div className={styles.activityCard}>


        // HEADER
        <div className={styles.cardHeader}>
            <div>
                <h2 className={styles.cardTitle}>
                    Employee Attendance {selectedStatus && `- ${selectedStatus}`}
                </h2>


                <p className={styles.cardSubtitle}>
                    {selectedStatus ? `${selectedStatus} employees` : 'Latest attendance records'}
                </p>
            </div>

            {selectedStatus && (
                <button 
                    className={styles.resetBtn}
                    onClick={() => {
                        setSelectedStatus(null);
                        setFilteredEmployees([]);
                    }}
                >
                    <X size={16} />
                    All
                </button>
            )}
        </div>

        // EMPLOYEE LIST - COMMENTED OUT
        // <div className={styles.employeeList}>
        //     {selectedStatus ? (
        //         // SHOW FILTERED EMPLOYEES WHEN BAR IS CLICKED
        //         filteredEmployees.map((employee: any, index: number) => (
        //             <UserCard
        //                 key={index}
        //                 user={employee}
        //                 onCardTap={() => {}}
        //             />
        //         ))
        //     ) : (
        //         // SHOW DEFAULT EMPLOYEES
        //         employees?.slice(0, 6).map((employee: any, index: number) => (
        //             <UserCard
        //                 key={index}
        //                 user={employee}
        //                 onCardTap={() => {}}
        //             />
        //         ))
        //     )}
        // </div>
    // </div> */}
            </section>

            {/* Spacer between sections */}
            <div style={{ marginBottom: '2rem' }} />

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
        </div>
    );
}