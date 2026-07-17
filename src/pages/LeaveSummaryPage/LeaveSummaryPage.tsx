import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Palmtree, CalendarDays, ArrowLeft } from 'lucide-react';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { LEAVE_SUMMARY, TEAM_LEAVE_SUMMARY } from '../../config/api-routes';
import styles from './LeaveSummaryPage.module.css';
import '../../styles/pages.css';

/* ══════════════════════════════════════════════════════════════
   Card colours — cycled per leave type
   ══════════════════════════════════════════════════════════════ */

// const CARD_STYLES = [
//     { accent: '#2563eb', bg: '#eff6ff', Icon: Palmtree },
//     { accent: '#059669', bg: '#ecfdf5', Icon: Stethoscope },
//     { accent: '#d97706', bg: '#fef3c7', Icon: Baby },
//     { accent: '#9333ea', bg: '#faf5ff', Icon: HeartPulse },
//     { accent: '#0891b2', bg: '#ecfeff', Icon: GraduationCap },
//     { accent: '#ea580c', bg: '#fff7ed', Icon: Briefcase },
// ];

// function getCardStyle(index: number) {
//     return CARD_STYLES[index % CARD_STYLES.length];
// }

/* ══════════════════════════════════════════════════════════════
   Leave balance item — shape from GET hxm/leave/totalleavetaken
   ══════════════════════════════════════════════════════════════ */
interface LeaveBalanceItem {
    leavetype: string;
    usedleave: string | number;
    balancedleave: string | number;
}

/* ══════════════════════════════════════════════════════════════ */

// function toApiDate(d: Date): string {
//     return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
// }

export default function LeaveSummaryPage() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    /* ── Detect if viewing a team member's leave (passed via route state) ── */
    const routeState = (location.state ?? {}) as {
        employeeSyskey?: string;
        userId?: string;
        memberName?: string;
    };
    const isTeamMember = !!(routeState.employeeSyskey && routeState.userId);
    const memberName = routeState.memberName ?? '';

    /* ── Leave balance summary ── */
    const { data: summaryData, isLoading: loadingSummary } = useQuery<{
        totalcount: string;
        datalist: LeaveBalanceItem[];
    }>({
        queryKey: isTeamMember
            ? ['teamMemberLeaveSummary', routeState.employeeSyskey, routeState.userId]
            : ['leaveSummary'],
        queryFn: async () => {
            if (isTeamMember) {
                // Use team API: api/teams/leaveSummary?employee_syskey=X&user_id=Y
                const params = new URLSearchParams({
                    employee_syskey: routeState.employeeSyskey!,
                    user_id: routeState.userId!,
                });
                const res = await mainClient.post(`${TEAM_LEAVE_SUMMARY}?${params.toString()}`);
                const data = res.data?.data ?? res.data ?? {};
                // API returns: { totalLeaveCount, leaveSummry: [...] }
                const totalcount = String(data.totalLeaveCount ?? '0');
                const rawList = data.leaveSummry ?? data.datalist ?? [];
                const datalist: LeaveBalanceItem[] = (rawList as Record<string, unknown>[]).map((item) => ({
                    leavetype: String(item.leavetype ?? '').trim(),
                    usedleave: String(item.usedleave ?? '0'),
                    balancedleave: String(item.balancedleave ?? '0'),
                }));
                return { totalcount, datalist };
            } else {
                // Default: logged-in user's own data
                const res = await apiClient.get(LEAVE_SUMMARY);
                return {
                    totalcount: res.data?.totalcount ?? '0',
                    datalist: res.data?.datalist || [],
                };
            }
        },
    });

    const totalLeaveTaken = summaryData?.totalcount ?? '0';
    const leaveBalances = summaryData?.datalist ?? [];

    /* ── Leave history (POST — only for own user, not team member) ── */
    // const { data: leaveHistory = [], isLoading: loadingHistory } = useQuery<RequestModel[]>({
    //     queryKey: ['leaveHistorySummary'],
    //     queryFn: async () => {
    //         const now = new Date();
    //         const from = new Date(now.getFullYear(), 0, 1); // Jan 1
    //         const to = new Date(now.getFullYear(), 11, 31); // Dec 31
    //         const res = await apiClient.post(LEAVE_LIST, {
    //             fromdate: toApiDate(from),
    //             todate: toApiDate(to),
    //             status: '4', // all statuses
    //         });
    //         return res.data?.datalist || [];
    //     },
    //     enabled: !isTeamMember, // Only fetch leave history for own user
    // });

    /* ═══════════════════════════ Render ═══════════════════════ */

    return (
        <div className={styles['leave-summary']}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isTeamMember && (
                            <button
                                className={styles['back-btn']}
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h1 className="page-header__title">
                                {isTeamMember ? `${memberName}'s Leave` : t('leave.summary')}
                            </h1>
                            <p className="page-header__subtitle">
                                {isTeamMember
                                    ? `Leave balance for ${memberName}`
                                    : 'Track your leave balance and history'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Total stat + balance cards ── */}
            {loadingSummary ? (
                <div className={styles['leave-skeleton']}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles['leave-skeleton__card']} />
                    ))}
                </div>
            ) : leaveBalances.length === 0 ? (
                <div className="empty-state">
                    <Palmtree size={64} className="empty-state__icon" />
                    <h3 className="empty-state__title">No Leave Types</h3>
                    <p className="empty-state__desc">Leave balance information is not available yet.</p>
                </div>
            ) : (
                <>
                    {/* Total leave taken stat */}
                    <div className={styles['total-stat']}>
                        <div className={styles['total-stat__icon']}>
                            <CalendarDays size={24} />
                        </div>
                        <div>
                            <div className={styles['total-stat__label']}>Total Leave Taken</div>
                            <div className={styles['total-stat__value']}>{totalLeaveTaken} <span className={styles['total-stat__unit']}>days</span></div>
                        </div>
                    </div>

                    {/* Balance cards */}
                    {/* Leave Balance List */}
<div className={styles['leave-list']}>
    {leaveBalances.map((item, i) => {
        const used = Number(item.usedleave) || 0;
        const balance = Number(item.balancedleave) || 0;

        return (
            <div key={i} className={styles['leave-list__item']}>
                <div className={styles['leave-list__left']}>
                    <span className={styles['leave-list__name']}>
                        {item.leavetype}
                    </span>
                </div>

                <div className={styles['leave-list__right']}>
                    <span className={styles['leave-list__used']}>
                        {used}
                    </span>
                    <span className={styles['leave-list__separator']}>
                        /
                    </span>
                    <span className={styles['leave-list__balance']}>
                        {balance}
                    </span>
                </div>
            </div>
        );
    })}
</div>
                </>
            )}

            {/* ── Leave history table (only for own user) ── */}
            {/* {!isTeamMember && (
                <div className={styles['leave-history']}>
                    <div className={styles['leave-history__header']}>
                        <h3 className={styles['leave-history__title']}>Leave History</h3>
                        <span className={styles['leave-history__year']}>{new Date().getFullYear()}</span>
                    </div>

                    {loadingHistory ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <p className="empty-state__desc">{t('common.loading')}</p>
                        </div>
                    ) : leaveHistory.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <Palmtree size={40} className="empty-state__icon" />
                            <h3 className="empty-state__title">No leave records</h3>
                            <p className="empty-state__desc">Your leave history will appear here.</p>
                        </div>
                    ) : (
                        <table className={styles['leave-table']}>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveHistory.map((req: any, i: number) => (
                                    <tr key={req.syskey || i}>
                                        <td>
                                            <span className={styles['leave-table__type']}>
                                                {req.requestsubtypedesc || req.requesttypedesc || req.requesttype || 'Leave'}
                                            </span>
                                        </td>
                                        <td>{displayDate(req.startdate || req.date)}</td>
                                        <td>{displayDate(req.enddate || req.startdate || req.date)}</td>
                                        <td><StatusBadge status={req.requeststatus} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )} */}
        </div>
    );
}
