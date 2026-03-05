import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Palmtree, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import LeaveImportModal from './LeaveImportModal';
import type { LeaveType, RequestModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import { LEAVE_TYPES, LEAVE_LIST } from '../../config/api-routes';
import { displayDate } from '../../lib/date-utils';
import styles from './LeavePage.module.css';
import '../../styles/pages.css';

/* ══════════════════════════════════════════════════════════════ */

export default function LeavePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [importModalOpen, setImportModalOpen] = useState(false);

    /* ── Leave types (for resolving syskey → description) ── */
    const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
        queryKey: ['leaveTypes'],
        queryFn: async () => {
            const res = await apiClient.get(LEAVE_TYPES);
            return res.data?.datalist || [];
        },
    });

    /* ── Leave history ── */
    const { data: leaveHistory = [], isLoading } = useQuery<RequestModel[]>({
        queryKey: ['leaveHistory'],
        queryFn: async () => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const fmt = (d: Date) =>
                `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const res = await apiClient.post(LEAVE_LIST, {
                fromdate: fmt(startOfMonth),
                todate: fmt(endOfMonth),
                status: '4',
            });
            return res.data?.datalist || [];
        },
    });

    /* ── Quick stats ── */
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        for (const r of leaveHistory as any[]) {
            const st = String(r.requeststatus);
            if (st === '1') pending++;
            if (st === '2') approved++;
            if (st === '3') rejected++;
        }
        return { total: leaveHistory.length, pending, approved, rejected };
    }, [leaveHistory]);

    /* helper: resolve leave-type syskey → description */
    const resolveLeaveType = (leave: any): string => {
        if (leave.requestsubtypedesc) return leave.requestsubtypedesc;
        if (leave.requestsubtype) {
            const lt = leaveTypes.find((t: LeaveType) => t.syskey === leave.requestsubtype);
            if (lt) return lt.description;
        }
        return leave.requesttypedesc || '—';
    };

    /* ═══════════════════════════ Render ═══════════════════════ */

    return (
        <div className={styles['leave-page']}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">{t('leave.title')}</h1>
                        <p className="page-header__subtitle">
                            {leaveHistory.length} {leaveHistory.length === 1 ? 'leave request' : 'leave requests'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Button variant="ghost" onClick={() => setImportModalOpen(true)}>
                            <FileSpreadsheet size={16} />
                            {t('leave.importExcel')}
                        </Button>
                        <Button onClick={() => navigate('/requests/new?type=leave')}>
                            <Plus size={16} />
                            {t('leave.apply')}
                        </Button>
                    </div>
                </div>
            </div>

            <LeaveImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leaveHistory'] })}
            />

            {/* ── Summary cards ── */}
            <div className={styles['leave-summary']}>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']}>{stats.total}</span>
                    <span className={styles['leave-summary__label']}>Total Requests</span>
                </div>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']} style={{ color: 'var(--color-warning-600)' }}>
                        {stats.pending}
                    </span>
                    <span className={styles['leave-summary__label']}>Pending</span>
                </div>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']} style={{ color: 'var(--color-success-600)' }}>
                        {stats.approved}
                    </span>
                    <span className={styles['leave-summary__label']}>Approved</span>
                </div>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']} style={{ color: 'var(--color-danger-600)' }}>
                        {stats.rejected}
                    </span>
                    <span className={styles['leave-summary__label']}>Rejected</span>
                </div>
            </div>

            {/* ── Leave list table ── */}
            <div className={styles['leave-list-card']}>
                <div className={styles['leave-list-card__header']}>
                    <h3 className={styles['leave-list-card__title']}>All Leave Requests</h3>
                </div>

                {isLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p className="empty-state__desc">{t('common.loading')}</p>
                    </div>
                ) : leaveHistory.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <Palmtree size={48} className="empty-state__icon" />
                        <h3 className="empty-state__title">No leave requests</h3>
                        <p className="empty-state__desc">Your leave requests will appear here.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles['leave-table']}>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(leaveHistory as any[]).map((leave, i) => (
                                    <tr key={leave.syskey || i} onClick={() => navigate(`/requests/${leave.syskey}`)}>
                                        <td>{leave.eid || '—'}</td>
                                        <td>{leave.name || '—'}</td>
                                        <td>{leave.refno || '—'}</td>
                                        <td className={styles['leave-table__dates']}>
                                            {displayDate(leave.startdate || leave.date) || '—'}
                                            {leave.enddate && leave.enddate !== leave.startdate ? ` → ${displayDate(leave.enddate)}` : ''}
                                        </td>
                                        <td>{resolveLeaveType(leave)}</td>
                                        <td>{leave.duration != null && leave.duration !== '' ? `${leave.duration} day(s)` : '—'}</td>
                                        <td>
                                            <StatusBadge status={String(leave.requeststatus)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
