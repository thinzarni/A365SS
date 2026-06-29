/* ═══════════════════════════════════════════════════════════
   Member Detail View — Individual member profile + attendance
   Mirrors Flutter's team_member_detail_page.dart:
   - Member profile card (UserAndSeniorsTeamCard equivalent)
   - Attendance stats
   - Calendar date picker with status color dots
   - Check-in timeline for selected date
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Briefcase,
    Building2,
    Hash,
    Clock,
    LogIn,
    Activity,
    Palmtree,
    MapPin,
    Layers,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    CalendarDays,
    FileText,
} from 'lucide-react';
import mainClient from '../../lib/main-client';
import { TEAM_LIST, TEAM_MEMBER_ATTENDANCE, CALENDAR_VIEW } from '../../config/api-routes';
import type { TeamMember, AttendanceRecord, TeamPageModel } from '../../types/models';
import {
    getStatusInfo,
    getInitials,
    formatDateApi,
    getAttendanceTypeLabel,
    mapRawMember,
} from './team-utils';
import styles from './MemberDetailView.module.css';
import '../../styles/pages.css';

/* ── Helpers ── */

function parseAttendanceRecords(raw: Record<string, unknown>[]): AttendanceRecord[] {
    return raw.map(r => ({
        syskey: String(r.syskey ?? ''),
        date: String(r.date ?? ''),
        time: String(r.time ?? ''),
        type: Number(r.type ?? 0),
        description: String(r.description ?? ''),
        location: String(r.location ?? ''),
        latitude: r.latitude ? Number(r.latitude) : null,
        longitude: r.longitude ? Number(r.longitude) : null,
        starttime: r.starttime ? String(r.starttime) : null,
        endtime: r.endtime ? String(r.endtime) : null,
        checkInType: String(r.checkintype ?? r.checkInType ?? ''),
        activityType: String(r.activitytype ?? r.activityType ?? ''),
        timezone: String(r.timezone ?? ''),
        employeeName: String(r.employee_name ?? r.employeeName ?? ''),
    }));
}

function parseTeamResponse(data: Record<string, unknown>, userId: string): TeamPageModel {
    const seniorsRaw = (data.seniorEmployees ?? []) as Record<string, unknown>[];
    const juniorsRaw = (data.juniorEmployees ?? []) as Record<string, unknown>[];
    const seniors = seniorsRaw.map(e => mapRawMember(e, 'senior', userId));
    const juniors = juniorsRaw.map(e => mapRawMember(e, 'junior', userId));
    const user = seniors.length > 0
        ? { ...seniors[seniors.length - 1], level: 'user' as const, key: userId }
        : null;
    const actualSeniors = seniors.length > 1 ? seniors.slice(0, -1) : [];
    return { user, seniors: actualSeniors, juniors, teams: [] };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function formatDisplayDate(date: Date): string {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

/**
 * Convert yyyyMMdd → Date key "yyyy-MM-dd"
 */
function parseDateKey(dateStr: string): string {
    if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
}

/**
 * Get calendar status color & label from status code
 * (Matches Flutter's status_code logic from calendarView API)
 *   10 = Only Time In (green)
 *   11 = Time In + Time Out (green)
 *   30-32 = Leave related (orange)
 *   40-45 = Partial / mixed (amber)
 *   50-59 = Activity records (blue)
 */
function getCalendarStatusColor(statusCode: number): { color: string; label: string } | null {
    if (statusCode === 10 || statusCode === 11) {
        return { color: '#22c55e', label: 'Present' };     // Green
    }
    if (statusCode >= 30 && statusCode <= 32) {
        return { color: '#f59e0b', label: 'Leave' };       // Orange/amber
    }
    if (statusCode >= 40 && statusCode <= 45) {
        return { color: '#f97316', label: 'Partial' };     // Orange
    }
    if (statusCode >= 50 && statusCode <= 59) {
        return { color: '#3b82f6', label: 'Activity' };    // Blue
    }
    return null;
}

/* ═══════════════════════════════════ Component ═══════════════════════════════════ */

export default function MemberDetailView() {
    const { t } = useTranslation();
    const { memberSyskey } = useParams<{ memberSyskey: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Member data from route state
    const routeState = (location.state ?? {}) as {
        member?: TeamMember;
        teamId?: string;
    };
    const member = routeState.member;
    const teamId = routeState.teamId ?? member?.teamId ?? '';

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(true);

    // Fetch member's team data for the profile card
    const { data: teamData } = useQuery<TeamPageModel>({
        queryKey: ['member-team', member?.userid],
        queryFn: async () => {
            const res = await mainClient.post(TEAM_LIST, {
                userid: member!.userid,
            });
            const raw = res.data?.data;
            if (!raw) throw new Error('No team data');
            return parseTeamResponse(raw, member!.userid);
        },
        enabled: !!member?.userid,
    });

    // Fetch monthly calendar status (colored dots for each day)
    const calMonthKey = `${calendarMonth.getFullYear()}${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
    const { data: calendarStatus } = useQuery<Record<string, number>>({
        queryKey: ['calendar-status', member?.userid, calMonthKey],
        queryFn: async () => {
            const year = calendarMonth.getFullYear();
            const month = calendarMonth.getMonth();
            const fromDate = formatDateApi(new Date(year, month, 1));
            const toDate = formatDateApi(new Date(year, month + 1, 0));
            const res = await mainClient.post(CALENDAR_VIEW, {
                fromdate: fromDate,
                todate: toDate,
            });
            const items = res.data?.data ?? [];
            const map: Record<string, number> = {};
            for (const item of items as { date: string; status_code: number }[]) {
                const key = parseDateKey(item.date);
                map[key] = item.status_code;
            }
            return map;
        },
        enabled: !!member?.userid,
    });

    // Fetch attendance data for selected date
    const { data: attendance, isLoading: attLoading, refetch: refetchAtt } = useQuery<AttendanceRecord[]>({
        queryKey: ['member-attendance', member?.userid, formatDateApi(selectedDate)],
        queryFn: async () => {
            const res = await mainClient.post(TEAM_MEMBER_ATTENDANCE, {
                date: formatDateApi(selectedDate),
                employeeSyskey: memberSyskey,
                userid: member!.userid,
                teamid: teamId,
            });
            const raw = res.data?.data ?? [];
            return parseAttendanceRecords(raw as Record<string, unknown>[]);
        },
        enabled: !!member?.userid && !!memberSyskey,
    });

    const displayMember = teamData?.user ?? member;

    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
    }, []);

    const goMonth = useCallback((offset: number) => {
        setCalendarMonth(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + offset);
            return next;
        });
    }, []);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date: Date) => {
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    if (!member) {
        return (
            <div className={styles.page}>
                <div className={styles.errorCard}>
                    <AlertCircle size={20} />
                    <span>{t('team.memberDataMissing')}</span>
                    <button onClick={() => navigate('/team')}>{t('team.goToTeam')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className={styles.backBtn} onClick={() => navigate(-1)}>
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="page-header__title">{member.userName}</h1>
                            <p className="page-header__subtitle">{member.jobposition || t('team.teamMember')}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className={styles.actionBtn}
                            title="Leave Summary"
                            onClick={() => navigate('/leave-summary', {
                                state: {
                                    employeeSyskey: memberSyskey,
                                    userId: member.userid,
                                    memberName: member.userName,
                                },
                            })}
                        >
                            <FileText size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════
                Member Profile Card
                ══════════════════════════════════ */}
            <MemberProfileCard member={displayMember || member} />

            {/* ══════════════════════════════════
                Calendar
                ══════════════════════════════════ */}
            <div className={styles.section}>
                <div className={styles.sectionHeader} onClick={() => setShowCalendar(!showCalendar)}>
                    <CalendarDays size={16} />
                    <h3 className={styles.sectionTitle}>{t('team.attendance', { date: formatDisplayDate(selectedDate) })}</h3>
                    <button
                        className={styles.refreshBtnSm}
                        onClick={(e) => { e.stopPropagation(); refetchAtt(); }}
                    >
                        <RefreshCw size={13} className={attLoading ? styles.spinning : ''} />
                    </button>
                </div>

                {showCalendar && (
                    <CalendarWidget
                        month={calendarMonth}
                        onSelect={handleDateSelect}
                        onMonthChange={goMonth}
                        isToday={isToday}
                        isSelected={isSelected}
                        statusMap={calendarStatus ?? {}}
                    />
                )}
            </div>

            {/* ══════════════════════════════════
                Check-in Timeline
                ══════════════════════════════════ */}
            <div className={styles.section}>
                {attLoading && (
                    <div className={styles.loadingBar}>
                        <div className={styles.loadingBarInner} />
                    </div>
                )}

                {!attLoading && attendance && attendance.length === 0 && (
                    <div className={styles.emptyTimeline}>
                        <Clock size={32} strokeWidth={1} />
                        <p>{t('team.noRecords')}</p>
                    </div>
                )}

                {attendance && attendance.length > 0 && (
                    <div className={styles.timeline}>
                        {attendance.map((record, idx) => (
                            <AttendanceRow key={record.syskey || idx} record={record} isLast={idx === attendance.length - 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════ Sub-components ═══════════════════════════ */

/** Member profile hero card */
function MemberProfileCard({ member }: { member: TeamMember }) {
    const { t } = useTranslation();
    const status = getStatusInfo(member);

    return (
        <div className={styles.profileCard}>
            <div className={styles.profileCardGlow} />
            <div className={styles.profileCardContent}>
                <div className={styles.profileCardTop}>
                    <div className={styles.avatarLg}>
                        {member.profile ? (
                            <img src={member.profile} alt="" className={styles.avatarImg} />
                        ) : (
                            getInitials(member.userName)
                        )}
                        <div
                            className={styles.statusDot}
                            style={{ background: status.color }}
                            title={status.label}
                        />
                    </div>
                    <div className={styles.profileInfo}>
                        <h3 className={styles.profileName}>{member.userName}</h3>
                        <div className={styles.profileBadges}>
                            {member.jobposition && <span className={styles.rankBadge}>{member.jobposition}</span>}
                            <div className={styles.horizontalBadges}>
                                {member.office && (
                                    <span className={styles.deptBadge}>
                                        <MapPin size={12} /> {member.office}
                                    </span>
                                )}
                                {member.division && (
                                    <span className={styles.deptBadge}>
                                        <Layers size={12} /> {member.division}
                                    </span>
                                )}
                                {member.department && (
                                    <span className={styles.deptBadge}>
                                        <Building2 size={12} /> {member.department}
                                    </span>
                                )}
                                {member.team && (
                                    <span className={styles.deptBadge}>
                                        <Hash size={12} /> {member.team}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={styles.profileIds}>
                            {member.employeeId && (
                                <span className={styles.idBadge}>
                                    <Briefcase size={11} /> {member.employeeId}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.statsRow}>
                    <StatTile icon={<Clock size={16} />} value={member.workingDays} label={t('team.workingDays')} />
                    <StatTile icon={<LogIn size={16} />} value={member.timeInCount} label={t('team.checkIns')} />
                    <StatTile icon={<Activity size={16} />} value={member.activityCount} label={t('team.activities')} />
                    <StatTile icon={<Palmtree size={16} />} value={member.leaveCount} label={t('team.leaves')} />
                </div>
            </div>
        </div>
    );
}

/** Stat tile */
function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className={styles.statTile}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}

/** Calendar widget with status color dots */
function CalendarWidget({
    month,
    onSelect,
    onMonthChange,
    isToday,
    isSelected,
    statusMap,
}: {
    month: Date;
    onSelect: (d: Date) => void;
    onMonthChange: (offset: number) => void;
    isToday: (d: Date) => boolean;
    isSelected: (d: Date) => boolean;
    statusMap: Record<string, number>;
}) {
    const year = month.getFullYear();
    const { t } = useTranslation();
    const monthIdx = month.getMonth();
    const daysInMonth = getDaysInMonth(year, monthIdx);
    const firstDayOfWeek = new Date(year, monthIdx, 1).getDay();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));

    return (
        <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
                <button className={styles.calNavBtn} onClick={() => onMonthChange(-1)}>
                    <ChevronLeft size={16} />
                </button>
                <span className={styles.calMonthLabel}>
                    {MONTH_NAMES[monthIdx]} {year}
                </span>
                <button className={styles.calNavBtn} onClick={() => onMonthChange(1)}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Status legend */}
            <div className={styles.calendarLegend}>
                <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#22c55e' }} /> {t('team.present')}</span>
                <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> {t('team.leave')}</span>
                <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#3b82f6' }} /> {t('team.activity')}</span>
            </div>

            <div className={styles.calendarGrid}>
                {DAY_NAMES.map(d => (
                    <div key={d} className={styles.calDayName}>{d}</div>
                ))}
                {cells.map((date, i) => {
                    if (!date) {
                        return <div key={i} className={styles.calCellWrap}><div className={styles.calCellEmpty} /></div>;
                    }

                    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const statusCode = statusMap[dateKey];
                    const statusColor = statusCode !== undefined ? getCalendarStatusColor(statusCode) : null;
                    const today = isToday(date);
                    const selected = isSelected(date);

                    return (
                        <div key={i} className={styles.calCellWrap}>
                            <button
                                className={`${styles.calCell} ${today ? styles.calToday : ''} ${selected ? styles.calSelected : ''}`}
                                onClick={() => onSelect(date)}
                            >
                                <span className={styles.calCellDate}>{date.getDate()}</span>
                                {statusColor && !selected && (
                                    <span
                                        className={styles.calStatusDot}
                                        style={{ background: statusColor.color }}
                                        title={statusColor.label}
                                    />
                                )}
                                {selected && statusColor && (
                                    <span
                                        className={styles.calStatusDotSelected}
                                        style={{ background: statusColor.color }}
                                        title={statusColor.label}
                                    />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Single attendance record row */
function AttendanceRow({ record, isLast }: { record: AttendanceRecord; isLast: boolean }) {
    const typeInfo = getAttendanceTypeLabel(record.type);
    const displayTime = record.type === 603 && record.starttime ? record.starttime : record.time;

    return (
        <div className={styles.timelineItem}>
            <div className={styles.timelineDot}>
                <div className={styles.timelineDotInner} style={{ background: typeInfo.color }} />
                {!isLast && <div className={styles.timelineLine} />}
            </div>
            <div className={styles.timelineContent}>
                <div className={styles.timelineRow}>
                    <span className={styles.timelineTime}>{displayTime}</span>
                    <span className={styles.timelineType} style={{ color: typeInfo.color, background: typeInfo.bg }}>
                        {typeInfo.label}
                    </span>
                </div>
                {record.location && (
                    <div className={styles.timelineLocation}>
                        <MapPin size={11} />
                        <span>{record.location}</span>
                    </div>
                )}
                {record.description && (
                    <div className={styles.timelineDesc}>{record.description}</div>
                )}
                {record.type === 603 && record.starttime && record.endtime && (
                    <div className={styles.timelineActivity}>
                        {record.starttime} → {record.endtime}
                        {record.activityType && ` · ${record.activityType}`}
                    </div>
                )}
            </div>
        </div>
    );
}
