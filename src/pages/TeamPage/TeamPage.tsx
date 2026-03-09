/* ═══════════════════════════════════════════════════════════
   Team Page — Main Hierarchy View
   Mirrors Flutter's teampage.dart structure:
   - User card (current focus user)
   - Reporting officers (seniors) timeline
   - Team badges (horizontal scrollable)
   - Direct reports & supervisions (juniors)
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Users,
    ChevronRight,
    Briefcase,
    Building2,
    Hash,
    Clock,
    LogIn,
    LogOut,
    Activity,
    Palmtree,
    UserCheck,
    Crown,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import mainClient from '../../lib/main-client';
import apiClient from '../../lib/api-client';
import { TEAM_LIST } from '../../config/api-routes';
import { useAuthStore } from '../../stores/auth-store';
import type { TeamMember, Team, TeamPageModel } from '../../types/models';
import { checkTeamAccess } from './team-utils';
import styles from './TeamPage.module.css';
import '../../styles/pages.css';

/* ── Helpers ── */

function parseTeamResponse(data: Record<string, unknown>, userId: string): TeamPageModel {
    const seniorsRaw = (data.seniorEmployees ?? []) as Record<string, unknown>[];
    const juniorsRaw = (data.juniorEmployees ?? []) as Record<string, unknown>[];
    const teamList = (data.teamList ?? []) as Record<string, unknown>[];

    const mapMember = (raw: Record<string, unknown>, level: string): TeamMember => ({
        syskey: String(raw.syskey ?? ''),
        userName: String(raw.userName ?? raw.username ?? ''),
        employeeId: String(raw.employeeId ?? raw.employeeid ?? ''),
        profile: raw.profile ? String(raw.profile) : null,
        userid: String(raw.userid ?? ''),
        rank: String(raw.rank ?? ''),
        department: String(raw.department ?? ''),
        division: String(raw.division ?? ''),
        teamId: String(raw.teamId ?? raw.teamid ?? ''),
        level: level as TeamMember['level'],
        priority: String(raw.priority ?? '0'),
        role: raw.role ? String(raw.role) : null,
        type: raw.type ? String(raw.type) : null,
        hasJunior: Boolean(raw.hasJunior ?? raw.hasjunior ?? false),
        workingDays: String(raw.workingDays ?? raw.workingdays ?? '0'),
        timeInCount: String(raw.timeInCount ?? raw.timeincount ?? '0'),
        timeOutCount: String(raw.timeOutCount ?? raw.timeoutcount ?? '0'),
        activityCount: String(raw.activityCount ?? raw.activitycount ?? '0'),
        leaveCount: String(raw.leaveCount ?? raw.leavecount ?? '0'),
        requiredWorkDays: String(raw.requiredWorkDays ?? raw.requiredworkdays ?? '0'),
        todayTimeInCount: String(raw.todayTimeInCount ?? raw.todaytimeincount ?? '0'),
        todayTimeOutCount: String(raw.todayTimeOutCount ?? raw.todaytimeoutcount ?? '0'),
        todayIsLeave: String(raw.todayIsLeave ?? raw.todayisleave ?? '0'),
        leaveStatus: Number(raw.leaveStatus ?? raw.leavestatus ?? 0),
        lastRecordTypeName: Number(raw.lastRecordTypeName ?? raw.lastrecordtypename ?? 0),
        timeInTime: String(raw.timeInTime ?? raw.timeintime ?? '0'),
        timeOutTime: String(raw.timeOutTime ?? raw.timeouttime ?? '0'),
        key: userId,
    });

    const seniors = seniorsRaw.map(e => mapMember(e, 'senior'));
    const juniors = juniorsRaw.map(e => mapMember(e, 'junior'));

    // Flutter: seniors.last is the current user
    const user = seniors.length > 0
        ? { ...seniors[seniors.length - 1], level: 'user' as const, key: userId }
        : null;
    const actualSeniors = seniors.length > 1 ? seniors.slice(0, -1) : [];

    const teams: Team[] = teamList.map((t) => ({
        teamId: String(t.teamId ?? t.teamid ?? ''),
        teamName: String(t.teamName ?? t.teamname ?? ''),
        syskey: String(t.syskey ?? ''),
        key: userId,
        role: t.role ? String(t.role) : undefined,
    }));

    return { user, seniors: actualSeniors, juniors, teams };
}

/** Status dot color based on Flutter logic */
function getStatusInfo(member: TeamMember) {
    const todayIn = parseInt(member.todayTimeInCount || '0', 10);
    const todayOut = parseInt(member.todayTimeOutCount || '0', 10);
    const isLeave = member.todayIsLeave === '0';
    const leaveStatus = member.leaveStatus;

    if (isLeave) {
        // On leave
        const statusMap: Record<number, { color: string; label: string }> = {
            1: { color: '#f59e0b', label: 'Leave (Pending)' },
            2: { color: '#f59e0b', label: 'Leave (Approved)' },
            3: { color: '#f59e0b', label: 'Leave (Rejected)' },
        };
        return statusMap[leaveStatus] || { color: '#f59e0b', label: 'On Leave' };
    }

    if (member.lastRecordTypeName === 601) {
        return { color: '#22c55e', label: 'Clocked In' };
    }

    if (todayIn > 0 || todayOut > 0) {
        return { color: '#ef4444', label: 'Clocked Out' };
    }

    return { color: '#94a3b8', label: 'No Records' };
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
}

/* ═══════════════════════════════════ Component ═══════════════════════════════════ */

export default function TeamPage() {
    const { userId } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryUserId = searchParams.get('userId');
    const [viewUserId, setViewUserId] = useState<string>(queryUserId || userId || '');
    const [navStack, setNavStack] = useState<string[]>(queryUserId ? [userId || ''] : []);

    const { data: teamData, isLoading, isError, refetch } = useQuery<TeamPageModel>({
        queryKey: ['team', viewUserId],
        queryFn: async () => {
            const res = await mainClient.post(TEAM_LIST, {
                userid: viewUserId,
            });
            const raw = res.data?.data;
            if (!raw) throw new Error('No team data');
            return parseTeamResponse(raw, viewUserId);
        },
        enabled: !!viewUserId,
    });

    // ── System Config Query ──
    const { data: configData } = useQuery({
        queryKey: ['checkin-config'],
        queryFn: async () => {
            const res = await mainClient.post('api/checkin/config', {
                userid: userId,
                domain: useAuthStore.getState().domain || 'demouat',
            });
            return res.data?.data ?? null;
        },
        staleTime: 5 * 60 * 1000,
    });

    // ── Menu Items Query (to check for HR access via /hrview) ──
    const { data: menuData } = useQuery({
        queryKey: ['menu-items'],
        queryFn: async () => {
            const res = await apiClient.get('hxm/integration/get/menuitems');
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const hasHrAccess = useMemo(() => {
        return (menuData || []).some((item: any) => item.router === '/hrview');
    }, [menuData]);

    const fetchTeamHierarchy = useCallback(async (uid: string) => {
        try {
            const res = await mainClient.post(TEAM_LIST, { userid: uid });
            return res.data?.data?.seniorEmployees || [];
        } catch {
            return null;
        }
    }, []);

    // Separate juniors by type
    const { directReports, supervisions } = useMemo(() => {
        if (!teamData) return { directReports: [], supervisions: [] };

        const directReports = teamData.juniors.filter(
            m => m.type?.toLowerCase() === 'reporting officer'
        );
        const supervisions = teamData.juniors.filter(
            m => m.type?.toLowerCase() !== 'reporting officer'
        );
        return { directReports, supervisions };
    }, [teamData]);

    const navigateToMember = useCallback(async (member: TeamMember) => {
        if (member.hasJunior) {
            const canAccess = await checkTeamAccess({
                targetUserId: member.userid,
                currentUserId: userId || '',
                configData,
                hasHrAccess,
                fetchTeamHierarchy,
                onDenied: (msg) => toast.error(msg),
            });

            if (!canAccess) return;

            // Drill into their hierarchy
            setNavStack(prev => [...prev, viewUserId]);
            setViewUserId(member.userid);
        } else {
            // Navigate to member detail view
            navigate(`/team/member/${member.syskey}`, {
                state: { member, teamId: teamData?.user?.teamId },
            });
        }
    }, [viewUserId, userId, configData, hasHrAccess, fetchTeamHierarchy, navigate, teamData]);

    // Initial check if visiting another user via URL
    useEffect(() => {
        if (queryUserId && queryUserId !== userId && configData && menuData) {
            checkTeamAccess({
                targetUserId: queryUserId,
                currentUserId: userId || '',
                configData,
                hasHrAccess,
                fetchTeamHierarchy,
                onDenied: (msg) => {
                    toast.error(msg);
                    setViewUserId(userId || '');
                    setNavStack([]);
                },
            });
        }
    }, [queryUserId, userId, configData, menuData, hasHrAccess, fetchTeamHierarchy]);

    const navigateBack = useCallback(() => {
        const stack = [...navStack];
        const prev = stack.pop();
        if (prev) {
            setNavStack(stack);
            setViewUserId(prev);
        }
    }, [navStack]);

    /* ═══════════════════════════ Render ═══════════════════════════ */

    return (
        <div className={styles.teamPage}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">
                            <Users size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                            Team Structure
                        </h1>
                        <p className="page-header__subtitle">
                            {teamData
                                ? `${teamData.seniors.length} seniors · ${teamData.juniors.length} members · ${teamData.teams.length} teams`
                                : 'Loading team data…'
                            }
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {navStack.length > 0 && (
                            <button className={styles.backBtn} onClick={navigateBack}>
                                ← Back
                            </button>
                        )}
                        <button className={styles.refreshBtn} onClick={() => refetch()} disabled={isLoading}>
                            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className={styles.loadingBar}>
                    <div className={styles.loadingBarInner} />
                </div>
            )}

            {/* ── Error ── */}
            {isError && (
                <div className={styles.errorCard}>
                    <AlertCircle size={20} />
                    <span>Failed to load team data. Please try again.</span>
                    <button onClick={() => refetch()}>Retry</button>
                </div>
            )}

            {teamData && (
                <>
                    {/* ══════════════════════════════════════════════
                        Section 1: Reporting Officers (Seniors Timeline)
                        ══════════════════════════════════════════════ */}
                    {teamData.seniors.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Crown size={16} />
                                Reporting Officers
                            </h2>
                            <div className={styles.timeline}>
                                {teamData.seniors.map((senior, idx) => (
                                    <div
                                        key={senior.syskey || idx}
                                        className={styles.timelineItem}
                                        onClick={() => senior.hasJunior && navigateToMember(senior)}
                                        style={{ cursor: senior.hasJunior ? 'pointer' : 'default' }}
                                    >
                                        <div className={styles.timelineDot}>
                                            <div
                                                className={styles.timelineDotInner}
                                                style={{ background: getStatusInfo(senior).color }}
                                            />
                                            {idx < teamData.seniors.length - 1 && (
                                                <div className={styles.timelineLine} />
                                            )}
                                        </div>
                                        <div className={styles.timelineContent}>
                                            <div className={styles.memberMini}>
                                                <div className={styles.avatarSm}>
                                                    {senior.profile ? (
                                                        <img src={senior.profile} alt="" className={styles.avatarImg} />
                                                    ) : (
                                                        getInitials(senior.userName)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className={styles.memberName}>{senior.userName}</div>
                                                    <div className={styles.memberMeta}>
                                                        {senior.rank && <span className={styles.rankBadge}>{senior.rank}</span>}
                                                        {senior.type && (
                                                            <span className={styles.typeBadge}>{senior.type}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {senior.hasJunior && <ChevronRight size={16} className={styles.chevron} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════
                        Section 2: Current User Card
                        ══════════════════════════════════════════════ */}
                    {teamData.user && (
                        <div className={styles.section}>
                            <UserCard member={teamData.user} />
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════
                        Section 3: Teams
                        ══════════════════════════════════════════════ */}
                    {teamData.teams.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Building2 size={16} />
                                Teams
                            </h2>
                            <div className={styles.teamBadges}>
                                {teamData.teams.map((team) => (
                                    <div key={team.syskey} className={styles.teamBadge}
                                        onClick={() => navigate(`/team/view/${team.syskey}`, {
                                            state: { teamId: team.teamId, teamName: team.teamName },
                                        })}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className={styles.teamBadgeIcon}>
                                            <Hash size={14} />
                                        </div>
                                        <div className={styles.teamBadgeInfo}>
                                            <span className={styles.teamBadgeId}>{team.teamId}</span>
                                            <span className={styles.teamBadgeName}>{team.teamName}</span>
                                        </div>
                                        {team.role && (
                                            <span className={styles.teamRoleBadge}>{team.role}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════
                        Section 4: Direct Reports
                        ══════════════════════════════════════════════ */}
                    {directReports.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <UserCheck size={16} />
                                Direct Reports
                                <span className={styles.countBadge}>{directReports.length}</span>
                            </h2>
                            <div className={styles.memberGrid}>
                                {directReports.map((member) => (
                                    <MemberCard
                                        key={member.syskey}
                                        member={member}
                                        onClick={() => navigateToMember(member)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════
                        Section 5: Supervisions
                        ══════════════════════════════════════════════ */}
                    {supervisions.length > 0 && (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Users size={16} />
                                Supervisions
                                <span className={styles.countBadge}>{supervisions.length}</span>
                            </h2>
                            <div className={styles.memberGrid}>
                                {supervisions.map((member) => (
                                    <MemberCard
                                        key={member.syskey}
                                        member={member}
                                        onClick={() => navigateToMember(member)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {teamData.seniors.length === 0 && teamData.juniors.length === 0 && teamData.teams.length === 0 && (
                        <div className={styles.emptyState}>
                            <Users size={48} strokeWidth={1} />
                            <h3>No team data available</h3>
                            <p>Your team structure will appear here once configured.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════ Sub-components ═══════════════════════════ */

/** Current user hero card (blue themed) */
function UserCard({ member }: { member: TeamMember }) {
    const status = getStatusInfo(member);

    return (
        <div className={styles.userCard}>
            <div className={styles.userCardGlow} />
            <div className={styles.userCardContent}>
                <div className={styles.userCardTop}>
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
                    <div className={styles.userCardInfo}>
                        <h3 className={styles.userCardName}>{member.userName}</h3>
                        <div className={styles.userCardBadges}>
                            {member.rank && (
                                <span className={styles.rankBadgeUser}>{member.rank}</span>
                            )}
                            {member.department && (
                                <span className={styles.deptBadge}>
                                    <Building2 size={12} />
                                    {member.department}
                                </span>
                            )}
                        </div>
                        <div className={styles.userCardIds}>
                            {member.employeeId && (
                                <span className={styles.idBadge}>
                                    <Briefcase size={11} /> {member.employeeId}
                                </span>
                            )}
                            {member.teamId && (
                                <span className={styles.idBadge}>
                                    <Hash size={11} /> {member.teamId}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className={styles.statsRow}>
                    <StatTile icon={<Clock size={16} />} value={member.workingDays} label="Working Days" />
                    <StatTile icon={<LogIn size={16} />} value={member.timeInCount} label="Check-ins" />
                    <StatTile icon={<Activity size={16} />} value={member.activityCount} label="Activities" />
                    <StatTile icon={<Palmtree size={16} />} value={member.leaveCount} label="Leaves" />
                </div>
            </div>
        </div>
    );
}

/** Member card for juniors */
function MemberCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
    const status = getStatusInfo(member);

    return (
        <div className={styles.memberCard} onClick={onClick}>
            <div className={styles.memberCardHeader}>
                <div className={styles.avatarMd}>
                    {member.profile ? (
                        <img src={member.profile} alt="" className={styles.avatarImg} />
                    ) : (
                        getInitials(member.userName)
                    )}
                    <div
                        className={styles.statusDotSm}
                        style={{ background: status.color }}
                        title={status.label}
                    />
                </div>
                <div className={styles.memberCardInfo}>
                    <div className={styles.memberCardName}>{member.userName}</div>
                    <div className={styles.memberCardMeta}>
                        {member.rank && <span className={styles.rankBadgeSm}>{member.rank}</span>}
                        {member.department && (
                            <span className={styles.metaText}>{member.department}</span>
                        )}
                    </div>
                </div>
                <ChevronRight size={16} className={styles.chevron} />
            </div>

            <div className={styles.memberCardStats}>
                <div className={styles.miniStat}>
                    <LogIn size={12} />
                    <span>{member.timeInCount}</span>
                </div>
                <div className={styles.miniStat}>
                    <LogOut size={12} />
                    <span>{member.timeOutCount}</span>
                </div>
                <div className={styles.miniStat}>
                    <Activity size={12} />
                    <span>{member.activityCount}</span>
                </div>
                <div className={styles.miniStat}>
                    <Palmtree size={12} />
                    <span>{member.leaveCount}</span>
                </div>
            </div>

            {/* ID badges */}
            <div className={styles.memberCardBadges}>
                {member.employeeId && (
                    <span className={styles.idBadgeSm}>
                        <Briefcase size={10} /> {member.employeeId}
                    </span>
                )}
                {member.teamId && (
                    <span className={styles.idBadgeSm}>
                        <Hash size={10} /> {member.teamId}
                    </span>
                )}
                {member.type && (
                    <span className={styles.typeBadgeSm}>{member.type}</span>
                )}
            </div>
        </div>
    );
}

/** Stat tile for the user card */
function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className={styles.statTile}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}
