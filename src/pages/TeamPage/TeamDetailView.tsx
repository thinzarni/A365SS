/* ═══════════════════════════════════════════════════════════
   Team Detail View — Shows members of a specific team
   Mirrors Flutter's team_view_page.dart:
   - Team header (ID + name)
   - Management section (priority 1-6 in a grid)
   - Members section (all other members)
   ═══════════════════════════════════════════════════════════ */

import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Hash,
    Users,
    ChevronRight,
    Briefcase,
    Building2,
    LogIn,
    LogOut,
    Activity,
    Palmtree,
    RefreshCw,
    AlertCircle,
    Shield,
} from 'lucide-react';
import mainClient from '../../lib/main-client';
import { TEAM_BY_ID } from '../../config/api-routes';
import type { TeamMember } from '../../types/models';
import { getStatusInfo, getInitials, mapRawMember } from './team-utils';
import styles from './TeamDetailView.module.css';
import '../../styles/pages.css';

/* ═══════════════════════════════════ Component ═══════════════════════════════════ */

export default function TeamDetailView() {
    const { teamSyskey } = useParams<{ teamSyskey: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Passed via route state from TeamPage
    const routeState = (location.state ?? {}) as {
        teamId?: string;
        teamName?: string;
    };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['team-detail', teamSyskey],
        queryFn: async () => {
            const res = await mainClient.post(TEAM_BY_ID, {
                teamsyskey: teamSyskey,
            });
            const raw = res.data?.data;
            if (!raw) throw new Error('No team detail data');

            const teamId = String(raw.teamId ?? raw.teamid ?? routeState.teamId ?? '');
            const teamName = String(raw.teamName ?? raw.teamname ?? routeState.teamName ?? '');
            const membersRaw = (raw.teamMembers ?? raw.teammembers ?? []) as Record<string, unknown>[];

            const members: TeamMember[] = membersRaw.map(m => mapRawMember(m, '', teamSyskey || ''));

            return { teamId, teamName, members };
        },
        enabled: !!teamSyskey,
    });

    // Separate management (priority 1-6) from regular members
    const { management, regularMembers } = useMemo(() => {
        if (!data) return { management: [], regularMembers: [] };
        const mgmtPriorities = ['1', '2', '3', '4', '5', '6'];
        return {
            management: data.members.filter(m => mgmtPriorities.includes(m.priority)),
            regularMembers: data.members.filter(m => !mgmtPriorities.includes(m.priority)),
        };
    }, [data]);

    const handleMemberClick = (member: TeamMember) => {
        if (member.hasJunior) {
            // Navigate to their team hierarchy
            navigate(`/team?userId=${member.userid}`);
        } else {
            // Navigate to member detail
            navigate(`/team/member/${member.syskey}`, {
                state: { member, teamId: data?.teamId },
            });
        }
    };

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
                            <h1 className="page-header__title">
                                Team Members
                            </h1>
                            <p className="page-header__subtitle">
                                {data
                                    ? `${data.members.length} member${data.members.length !== 1 ? 's' : ''}`
                                    : 'Loading…'
                                }
                            </p>
                        </div>
                    </div>
                    <button className={styles.refreshBtn} onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
                    </button>
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
                    <span>Failed to load team details.</span>
                    <button onClick={() => refetch()}>Retry</button>
                </div>
            )}

            {data && (
                <>
                    {/* ══════════════════════════════════
                        Team Header Card
                        ══════════════════════════════════ */}
                    <div className={styles.teamHeader}>
                        <div className={styles.teamHeaderIcon}>
                            <Hash size={20} />
                        </div>
                        <div className={styles.teamHeaderInfo}>
                            <h2 className={styles.teamHeaderId}>{data.teamId}</h2>
                            <p className={styles.teamHeaderName}>{data.teamName}</p>
                        </div>
                        <div className={styles.teamHeaderCount}>
                            <Users size={14} />
                            <span>{data.members.length}</span>
                        </div>
                    </div>

                    {/* ══════════════════════════════════
                        Management Section
                        ══════════════════════════════════ */}
                    {management.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Shield size={16} />
                                <h3 className={styles.sectionTitle}>Management</h3>
                                <span className={styles.countBadge}>{management.length}</span>
                            </div>
                            <div className={styles.mgmtGrid}>
                                {management.map((member) => (
                                    <ManagementCard
                                        key={member.syskey}
                                        member={member}
                                        onClick={() => handleMemberClick(member)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════
                        Members Section
                        ══════════════════════════════════ */}
                    {regularMembers.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <Users size={16} />
                                <h3 className={styles.sectionTitle}>Members</h3>
                                <span className={styles.countBadge}>{regularMembers.length}</span>
                            </div>
                            <div className={styles.memberList}>
                                {regularMembers.map((member) => (
                                    <MemberRow
                                        key={member.syskey}
                                        member={member}
                                        onClick={() => handleMemberClick(member)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty */}
                    {data.members.length === 0 && !isLoading && (
                        <div className={styles.emptyState}>
                            <Users size={48} strokeWidth={1} />
                            <h3>No members found</h3>
                            <p>This team doesn't have any members yet.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════ Sub-components ═══════════════════════════ */

/** Compact card for management-level members (grid layout) */
function ManagementCard({ member, onClick }: { member: TeamMember; onClick: () => void }) {
    const status = getStatusInfo(member);

    return (
        <div className={styles.mgmtCard} onClick={onClick}>
            <div className={styles.mgmtCardAvatar}>
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
            <div className={styles.mgmtCardName}>{member.userName}</div>
            {member.rank && !['1', '2', '3', '4', '5', '6'].includes(member.priority) && (
                <span className={styles.rankBadge}>{member.rank}</span>
            )}
            {member.role && <span className={styles.roleBadge}>{member.role}</span>}
            <div className={styles.mgmtCardIds}>
                {member.employeeId && (
                    <span className={styles.idTag}>
                        <Briefcase size={9} /> {member.employeeId}
                    </span>
                )}
            </div>
        </div>
    );
}

/** Row item for regular members (list layout) */
function MemberRow({ member, onClick }: { member: TeamMember; onClick: () => void }) {
    const status = getStatusInfo(member);

    return (
        <div className={styles.memberRow} onClick={onClick}>
            <div className={styles.memberRowAvatar}>
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

            <div className={styles.memberRowInfo}>
                <div className={styles.memberRowName}>{member.userName}</div>
                <div className={styles.memberRowMeta}>
                    {member.rank && !['1', '2', '3', '4', '5', '6'].includes(member.priority) && (
                        <span className={styles.rankBadgeSm}>{member.rank}</span>
                    )}
                    {member.department && (
                        <span className={styles.metaText}>
                            <Building2 size={10} /> {member.department}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.memberRowStats}>
                <div className={styles.miniStat}><LogIn size={11} /><span>{member.timeInCount}</span></div>
                <div className={styles.miniStat}><LogOut size={11} /><span>{member.timeOutCount}</span></div>
                <div className={styles.miniStat}><Activity size={11} /><span>{member.activityCount}</span></div>
                <div className={styles.miniStat}><Palmtree size={11} /><span>{member.leaveCount}</span></div>
            </div>

            <ChevronRight size={16} className={styles.chevron} />
        </div>
    );
}
