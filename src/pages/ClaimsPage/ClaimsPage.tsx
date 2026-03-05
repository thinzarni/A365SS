import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import type { ClaimModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import { CLAIM_LIST } from '../../config/api-routes';
import { displayDate } from '../../lib/date-utils';
import styles from './ClaimsPage.module.css';
import '../../styles/pages.css';

/* helper: yyyyMMdd */
function toApiDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dd}`;
}

export default function ClaimsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { data: claims = [], isLoading } = useQuery<ClaimModel[]>({
        queryKey: ['claims'],
        queryFn: async () => {
            // Send date range for current month — same pattern as request list
            const now = new Date();
            const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const res = await apiClient.post(CLAIM_LIST, {
                fromdate: toApiDate(fromDate),
                todate: toApiDate(toDate),
                requesttype: 'claim',
                status: '',
            });
            return res.data?.datalist || [];
        },
    });

    const stats = useMemo(() => {
        let total = 0;
        let pending = 0;
        let approved = 0;
        for (const c of claims as any[]) {
            total += c.amount || 0;
            const st = String(c.requeststatus);
            if (st === '1') pending++;
            if (st === '2') approved++;
        }
        return { total, pending, approved, count: claims.length };
    }, [claims]);

    return (
        <div className={styles['claims-page']}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">{t('claim.title')}</h1>
                        <p className="page-header__subtitle">
                            {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
                        </p>
                    </div>
                    <Button onClick={() => navigate('/claims/new')}>
                        <Plus size={16} />
                        {t('claim.newClaim')}
                    </Button>
                </div>
            </div>

            {/* ── Summary cards ── */}
            <div className={styles['claims-summary']}>
                <div className={styles['claims-summary__card']}>
                    <span className={styles['claims-summary__value']}>{stats.count}</span>
                    <span className={styles['claims-summary__label']}>Total Claims</span>
                </div>
                <div className={styles['claims-summary__card']}>
                    <span className={styles['claims-summary__value']}>
                        <DollarSign size={18} style={{ verticalAlign: 'middle' }} />
                        {stats.total.toLocaleString()}
                    </span>
                    <span className={styles['claims-summary__label']}>Total Amount</span>
                </div>
                <div className={styles['claims-summary__card']}>
                    <span className={styles['claims-summary__value']} style={{ color: 'var(--color-warning-600)' }}>
                        {stats.pending}
                    </span>
                    <span className={styles['claims-summary__label']}>Pending</span>
                </div>
                <div className={styles['claims-summary__card']}>
                    <span className={styles['claims-summary__value']} style={{ color: 'var(--color-success-600)' }}>
                        {stats.approved}
                    </span>
                    <span className={styles['claims-summary__label']}>Approved</span>
                </div>
            </div>

            {/* ── Claims table ── */}
            <div className={styles['claims-list-card']}>
                <div className={styles['claims-list-card__header']}>
                    <h3 className={styles['claims-list-card__title']}>All Claims</h3>
                </div>

                {isLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p className="empty-state__desc">{t('common.loading')}</p>
                    </div>
                ) : claims.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <Receipt size={48} className="empty-state__icon" />
                        <h3 className="empty-state__title">No claims yet</h3>
                        <p className="empty-state__desc">Create your first expense claim to get started.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles['claims-table']}>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(claims as any[]).map((claim, i) => (
                                    <tr key={claim.syskey || i} onClick={() => navigate(`/claims/${claim.syskey}`)}>
                                        <td>{claim.eid || '—'}</td>
                                        <td>{claim.name || '—'}</td>
                                        <td>{claim.refno || '—'}</td>
                                        <td>{displayDate(claim.startdate || claim.date) || '—'}</td>
                                        <td>{claim.claimtype || claim.requesttype || '—'}</td>
                                        <td className={styles['claims-table__amount']}>
                                            {(claim.amount || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <StatusBadge status={String(claim.requeststatus)} />
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
