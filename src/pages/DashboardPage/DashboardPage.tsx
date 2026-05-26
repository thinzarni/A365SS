/* ═══════════════════════════════════════════════════════════
   DashboardPage — Modern HR Dashboard
   Features: Greeting, live clock, time in/out, monthly stats,
             attendance records, quick-action tiles
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
    X,
} from 'lucide-react';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { ADMIN_MEMBER_LIST, ADMIN_CARD_DATA } from '../../config/api-routes';
import styles from './DashboardPage.module.css';
import AttendanceOverviewChart from '../../components/admin-attendance/AttendanceOverviewChart';
import UserCard from '../../components/admin-attendance/UserCard';
import apiClient from '../../lib/api-client';

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
    { path: '/attendanceapproval', icon: UserCheck, label: 'Attendance Approval', bg: '#ecfeff', color: '#0891b2' },
];

const STATUS_LABELS: Record<string, string> = {
    '0': 'All',
    '1': 'Present',
    '2': 'Leave',
    '4': 'Absent',
    '5': 'Late In',
    '6': 'Early Out'
};

/* ── Live Header Component ── */
interface LiveHeaderProps {
    user: any;
    timeIn?: AttendanceRecord;
    timeOut?: AttendanceRecord;
    workingHours: string;
}

function LiveHeader({ user, timeIn, timeOut, workingHours }: LiveHeaderProps) {
    const { t, i18n } = useTranslation();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const greeting = getGreeting(now.getHours());
    const { time: liveTime, ampm } = formatLiveTime(now);
    const dateDisplay = now.toLocaleDateString(i18n.language === 'my' ? 'my-MM' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <>
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
        </>
    );
}

/* ── Component ── */
export default function DashboardPage() {
    const { t, i18n } = useTranslation();
    const { user, userId, domain } = useAuthStore();
    
    // Static date for API queries
    const [today] = useState(() => new Date());
    const [selectedStatus, setSelectedStatus] = useState<string>('0');

    const todayStr = formatDateYYYYMMDD(today);

    // ── Fetch admin card data ──
    const { data: adminCardData, isLoading: adminLoading } = useQuery({
        queryKey: ['admin-card-data'],
        queryFn: async () => {
            try {
                const res = await apiClient.post(ADMIN_CARD_DATA, {
                    fromdate: todayStr,
                    todate: todayStr,
                    userid: userId,
                    domain: domain,
                    isPersonal: true
                });
                return res.data?.data ?? res.data ?? null;
            } catch {
                return null;
            }
        },
        staleTime: 60_000,
    });

    // Chart data derived from API
    const chartData = useMemo(() => {
        if (!adminCardData) return undefined;

        const present = Number(adminCardData.timein) || Number(adminCardData.presentEmployees) || 0;
        const leave = Number(adminCardData.leave) || Number(adminCardData.leaveCount) || 0;
        const absent = Number(adminCardData.absent) || Number(adminCardData.absentEmployees) || 0;
        const total = Number(adminCardData.total) || Number(adminCardData.totalEmployees) || (present + leave + absent);

        return {
            total: total,
            timein: present,
            leave: leave,
            absent: absent,
            lateincount: Number(adminCardData.lateincount) || Number(adminCardData.lateEmployees) || 0,
            earlyoutcount: Number(adminCardData.earlyoutcount) || Number(adminCardData.earlyOutEmployees) || 0,
        };
    }, [adminCardData]);


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
    const {
        data: employeesData,
        isLoading: employeesLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['dashboard-employees', todayStr, selectedStatus, userId, domain],
        queryFn: async ({ pageParam = 1 }) => {
            try {
                const res = await apiClient.post(ADMIN_MEMBER_LIST, {
                    date: todayStr,
                    searchval: '',
                    page: pageParam,
                    limit: 20,
                    type: 0,
                    status: selectedStatus,
                    isPersonal: true
                });
                const list = res.data?.datalist ?? res.data?.data ?? res.data ?? [];
                return Array.isArray(list) ? list : [];
            } catch {
                return [];
            }
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === 20 ? allPages.length + 1 : undefined;
        },
        staleTime: 60_000,
    });

    const employees = useMemo(() => employeesData?.pages.flat() ?? [], [employeesData]);

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

    const monthName = today.toLocaleDateString(i18n.language === 'my-MM' ? 'my-MM' : 'en-US', { month: 'long', year: 'numeric' });
    const isLoading = summaryLoading || homeLoading || adminLoading;

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
            {/* ── Live Hero and Clocks ── */}
            <LiveHeader 
                user={user} 
                timeIn={timeIn} 
                timeOut={timeOut} 
                workingHours={workingHours} 
            />

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

                <div className={styles.insightsSection}>
                    {/* ───────────────── ANALYTICS CARD ───────────────── */}
                    <div className={styles.analyticsCard}>

                        {/* CHART */}
                        <div className={styles.chartContainer}>
                            <AttendanceOverviewChart
                                data={chartData}
                                onBarClick={(typeVal) => {
                                    setSelectedStatus(typeVal);
                                }}
                            />
                        </div>
                    </div>

                    {/* ───────────────── RIGHT : EMPLOYEE CARD ───────────────── */}
                    <div className={styles.activityCard}>
                        {/* HEADER */}
                        <div className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.cardTitle}>
                                    Employee Attendance {selectedStatus !== '0' && `- ${STATUS_LABELS[selectedStatus]}`}
                                </h2>
                                <p className={styles.cardSubtitle}>
                                    {selectedStatus !== '0' ? `${STATUS_LABELS[selectedStatus]} employees` : 'Latest attendance records'}
                                </p>
                            </div>

                            {selectedStatus !== '0' && (
                                <button
                                    className={styles.resetBtn}
                                    onClick={() => {
                                        setSelectedStatus('0');
                                    }}
                                >
                                    <X size={16} />
                                    All
                                </button>
                            )}
                        </div>

                        {/* EMPLOYEE LIST */}
                        <div
                            className={styles.employeeList}
                            onScroll={(e) => {
                                const target = e.currentTarget;
                                if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
                                    if (hasNextPage && !isFetchingNextPage) {
                                        fetchNextPage();
                                    }
                                }
                            }}
                        >
                            {employeesLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                                    Loading employees...
                                </div>
                            ) : employees && employees.length > 0 ? (
                                <>
                                    {employees.map((employee: any, index: number) => (
                                        <UserCard
                                            key={`${employee.eid || index}-${index}`}
                                            user={employee}
                                            onCardTap={() => { }}
                                        />
                                    ))}
                                    {isFetchingNextPage && (
                                        <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '13px' }}>
                                            Loading more...
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                                    No employees found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
                            'Team': 'nav.team',
                            'Attendance Approval': 'nav.attendanceApproval'
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