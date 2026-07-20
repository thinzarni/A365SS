import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Palmtree, Stethoscope, Baby, GraduationCap, Briefcase,
    CalendarDays, ArrowLeft, Wallet, Umbrella, Heart,
    Clock, Plane, Shield, Siren, UserX, RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import type { RequestModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { LEAVE_SUMMARY, LEAVE_LIST, TEAM_LEAVE_SUMMARY } from '../../config/api-routes';
import { displayDate } from '../../lib/date-utils';
import styles from './LeaveSummaryPage.module.css';
import '../../styles/pages.css';

/* ══════════════════════════════════════════════════════════════
   Card colours — keyword-matched (same type = same colour always)
   ══════════════════════════════════════════════════════════════ */

/** Fallback palette for unrecognised leave types */
const FALLBACK_ACCENTS = [
    { accent: '#2563eb', bg: '#eff6ff' },
    { accent: '#059669', bg: '#ecfdf5' },
    { accent: '#d97706', bg: '#fef3c7' },
    { accent: '#9333ea', bg: '#faf5ff' },
    { accent: '#0891b2', bg: '#ecfeff' },
    { accent: '#ea580c', bg: '#fff7ed' },
    { accent: '#be185d', bg: '#fdf2f8' },
    { accent: '#0f766e', bg: '#f0fdfa' },
];

/** Pick a meaningful icon based on keywords in the leave type name. */
function getLeaveIcon(name: string) {
    const n = name.toLowerCase();
    if (/casual|cl\b/.test(n)) return Palmtree;
    if (/medical|sick|health|ml\b/.test(n)) return Stethoscope;
    if (/maternity|paternity|parent|child|baby/.test(n)) return Baby;
    if (/annual|earned|vacation|holiday|al\b/.test(n)) return Umbrella;
    if (/unpaid|without pay|no pay|lwp|wp\b/.test(n)) return Wallet;
    if (/study|training|education|exam/.test(n)) return GraduationCap;
    if (/emergency|urgent/.test(n)) return Siren;
    if (/compassion|compassionate|bereave|funeral|death/.test(n)) return Heart;
    if (/travel|tour|trip/.test(n)) return Plane;
    if (/half|short|compensat/.test(n)) return Clock;
    if (/absent|unauthor/.test(n)) return UserX;
    if (/special|privilege/.test(n)) return Shield;
    if (/substitute|replacement|swap/.test(n)) return RefreshCw;
    if (/work|office|duty/.test(n)) return Briefcase;
    return CalendarDays; // fallback
}

/** Returns a fixed { accent, bg } based on keywords in the leave type name. */
function getLeaveColor(name: string, fallbackIndex: number): { accent: string; bg: string } {
    const n = name.toLowerCase();
    if (/casual|cl\b/.test(n)) return { accent: '#2563eb', bg: '#eff6ff' }; // blue
    if (/medical|sick|health|ml\b/.test(n)) return { accent: '#059669', bg: '#ecfdf5' }; // green
    if (/maternity|paternity|parent|child|baby/.test(n)) return { accent: '#be185d', bg: '#fdf2f8' }; // rose
    if (/annual|earned|vacation|holiday|al\b/.test(n)) return { accent: '#0891b2', bg: '#ecfeff' }; // cyan
    if (/unpaid|without pay|no pay|lwp|wp\b/.test(n)) return { accent: '#d97706', bg: '#fef3c7' }; // amber
    if (/study|training|education|exam/.test(n)) return { accent: '#7c3aed', bg: '#f5f3ff' }; // violet
    if (/emergency|urgent/.test(n)) return { accent: '#dc2626', bg: '#fef2f2' }; // red
    if (/compassion|compassionate|bereave|funeral|death/.test(n)) return { accent: '#9333ea', bg: '#faf5ff' }; // purple
    if (/travel|tour|trip/.test(n)) return { accent: '#0f766e', bg: '#f0fdfa' }; // teal
    if (/half|short|compensat/.test(n)) return { accent: '#475569', bg: '#f8fafc' }; // slate
    if (/absent|unauthor/.test(n)) return { accent: '#b91c1c', bg: '#fff1f2' }; // dark red
    if (/special|privilege/.test(n)) return { accent: '#4338ca', bg: '#eef2ff' }; // indigo
    if (/substitute|replacement|swap/.test(n)) return { accent: '#0284c7', bg: '#f0f9ff' }; // sky
    if (/work|office|duty/.test(n)) return { accent: '#ea580c', bg: '#fff7ed' }; // orange
    // Unrecognised — cycle through fallback palette
    return FALLBACK_ACCENTS[fallbackIndex % FALLBACK_ACCENTS.length];
}

function getCardStyle(name: string, index: number) {
    return { ...getLeaveColor(name, index), Icon: getLeaveIcon(name) };
}

/* ══════════════════════════════════════════════════════════════
   Leave balance item — shape from GET hxm/leave/totalleavetaken
   ══════════════════════════════════════════════════════════════ */
interface LeaveBalanceItem {
    leavetype: string;
    usedleave: string | number;
    balancedleave: string | number;
}

/* ══════════════════════════════════════════════════════════════ */

/* 🧪 TEST MODE — change to true to show all mock leave cards */
// const TEST_MODE = false;

// const MOCK_LEAVE_BALANCES: LeaveBalanceItem[] = [
//     { leavetype: 'Casual Leave', usedleave: 3, balancedleave: 10 },
//     { leavetype: 'Medical Leave', usedleave: 1, balancedleave: 14 },
//     { leavetype: 'Maternity Leave', usedleave: 0, balancedleave: 90 },
//     { leavetype: 'Annual Leave', usedleave: 5, balancedleave: 21 },
//     { leavetype: 'Without Pay Leave', usedleave: 2, balancedleave: 30 },
//     { leavetype: 'Study Leave', usedleave: 0, balancedleave: 7 },
//     { leavetype: 'Emergency Leave', usedleave: 1, balancedleave: 3 },
//     { leavetype: 'Compassionate Leave', usedleave: 0, balancedleave: 5 },
//     { leavetype: 'Travel Leave', usedleave: 0, balancedleave: 10 },
//     { leavetype: 'Half Day Leave', usedleave: 2, balancedleave: 6 },
//     { leavetype: 'Absent / Unauthorised', usedleave: 0, balancedleave: 0 },
//     { leavetype: 'Special Privilege Leave', usedleave: 1, balancedleave: 5 },
//     { leavetype: 'Substitute Leave', usedleave: 0, balancedleave: 4 },
//     { leavetype: 'Work From Home', usedleave: 8, balancedleave: 20 },
//     { leavetype: 'Other Leave', usedleave: 0, balancedleave: 5 },
// ];

function toApiDate(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

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
        totalusedcount?: number;  // new field: sum of all usedleave in datalist
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

    const leaveBalances = summaryData?.datalist ?? [];
    // Use totalusedcount from API (guaranteed to match the cards).
    // Falls back to summing usedleave locally if the backend hasn't been updated yet.
    const totalLeaveTaken = summaryData?.totalcount ?? 0;

    /* ── Leave history (POST — only for own user, not team member) ── */
    const { data: leaveHistory = [], isLoading: loadingHistory } = useQuery<RequestModel[]>({
        queryKey: ['leaveHistorySummary'],
        queryFn: async () => {
            const now = new Date();
            const from = new Date(now.getFullYear(), 0, 1); // Jan 1
            const to = new Date(now.getFullYear(), 11, 31); // Dec 31
            const res = await apiClient.post(LEAVE_LIST, {
                fromdate: toApiDate(from),
                todate: toApiDate(to),
                status: '4', // all statuses
            });
            return res.data?.datalist || [];
        },
        enabled: !isTeamMember, // Only fetch leave history for own user
    });

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
                    <div className={styles['leave-cards']}>
                        {leaveBalances.map((item, i) => {
                            const style = getCardStyle(item.leavetype, i);
                            const used = Number(item.usedleave) || 0;
                            const balance = Number(item.balancedleave) || 0;
                            const remaining = balance - used;
                            const usedPct = balance > 0 ? (used / balance) * 100 : 0;

                            return (
                                <div key={i} className={styles['leave-card']}>
                                    <div className={styles['leave-card__accent']} style={{ background: style.accent }} />
                                    <div className={styles['leave-card__header']}>
                                        <div className={styles['leave-card__icon']} style={{ background: style.bg, color: style.accent }}>
                                            <style.Icon size={20} />
                                        </div>
                                        <span className={styles['leave-card__name']}>{item.leavetype}</span>
                                    </div>

                                    <div className={styles['leave-card__progress']}>
                                        <div
                                            className={styles['leave-card__progress-fill']}
                                            style={{ width: `${Math.min(usedPct, 100)}%`, background: style.accent }}
                                        />
                                    </div>

                                    <div className={styles['leave-card__stats']}>
                                        <div className={styles['leave-card__stat']}>
                                            <span className={styles['leave-card__stat-value']}>{balance}</span>
                                            <span className={styles['leave-card__stat-label']}>{t('leave.balance')}</span>
                                        </div>
                                        <div className={styles['leave-card__stat']}>
                                            <span className={styles['leave-card__stat-value']}>{used}</span>
                                            <span className={styles['leave-card__stat-label']}>{t('leave.used')}</span>
                                        </div>
                                        <div className={styles['leave-card__stat']}>
                                            <span className={styles['leave-card__stat-value']}>{remaining >= 0 ? remaining : 0}</span>
                                            <span className={styles['leave-card__stat-label']}>{t('leave.remaining')}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── Leave history table (only for own user) ── */}
            {!isTeamMember && (
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
            )}
        </div>
    );
}
