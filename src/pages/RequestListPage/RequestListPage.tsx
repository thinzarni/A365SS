import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    Plus,
    ClipboardList,
    Palmtree,
    Clock,
    Home,
    Car,
    Calendar,
    Plane,
    Banknote,
    FileText,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import { GET_REQUEST_LIST } from '../../config/api-routes';
import { displayDate } from '../../lib/date-utils';
import styles from './RequestListPage.module.css';
import '../../styles/pages.css';

/* helper: yyyyMMdd */
function toApiDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dd}`;
}

/* ── Type display helpers ── */
const statusTabs = [
    { key: RequestStatus.All, label: 'status.all' },
    { key: RequestStatus.Pending, label: 'status.pending' },
    { key: RequestStatus.Approved, label: 'status.approved' },
    { key: RequestStatus.Rejected, label: 'status.rejected' },
];

function getTypeVariant(typedesc: string): string {
    const lower = (typedesc || '').toLowerCase();
    if (lower.includes('leave')) return 'leave';
    if (lower.includes('overtime') || lower.includes('ot')) return 'overtime';
    if (lower.includes('work from home') || lower.includes('wfh')) return 'wfh';
    if (lower.includes('transport')) return 'transport';
    if (lower.includes('reserv')) return 'reservation';
    if (lower.includes('travel')) return 'travel';
    if (lower.includes('claim') || lower.includes('cash') || lower.includes('advance')) return 'claim';
    return 'default';
}

function getTypeIcon(variant: string) {
    switch (variant) {
        case 'leave': return Palmtree;
        case 'overtime': return Clock;
        case 'wfh': return Home;
        case 'transport': return Car;
        case 'reservation': return Calendar;
        case 'travel': return Plane;
        case 'claim': return Banknote;
        default: return FileText;
    }
}

/* ══════════════════════════════════════════════════════════════ */

export default function RequestListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeStatus, setActiveStatus] = useState<RequestStatus>(RequestStatus.All);

    const { data: requests = [], isLoading } = useQuery<RequestModel[]>({
        queryKey: ['requests', activeStatus],
        queryFn: async () => {
            const now = new Date();
            const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: toApiDate(fromDate),
                todate: toApiDate(toDate),
                type: '',
                status: activeStatus,
            });
            return res.data?.datalist || [];
        },
    });

    /* ── Quick stats (always from unfiltered "All" data) ── */
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        for (const r of requests as any[]) {
            const st = String(r.requeststatus);
            if (st === '1') pending++;
            if (st === '2') approved++;
            if (st === '3') rejected++;
        }
        return { total: requests.length, pending, approved, rejected };
    }, [requests]);

    /* ═══════════════════════════ Render ═══════════════════════ */

    return (
        <div className={styles['requests-page']}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">{t('request.title')}</h1>
                        <p className="page-header__subtitle">
                            {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                        </p>
                    </div>
                    <Button onClick={() => navigate('/requests/new')}>
                        <Plus size={16} />
                        {t('request.newRequest')}
                    </Button>
                </div>
            </div>

            {/* ── Summary cards ── */}
            <div className={styles['requests-summary']}>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']}>{stats.total}</span>
                    <span className={styles['requests-summary__label']}>Total Requests</span>
                </div>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']} style={{ color: 'var(--color-warning-600)' }}>
                        {stats.pending}
                    </span>
                    <span className={styles['requests-summary__label']}>Pending</span>
                </div>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']} style={{ color: 'var(--color-success-600)' }}>
                        {stats.approved}
                    </span>
                    <span className={styles['requests-summary__label']}>Approved</span>
                </div>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']} style={{ color: 'var(--color-danger-600)' }}>
                        {stats.rejected}
                    </span>
                    <span className={styles['requests-summary__label']}>Rejected</span>
                </div>
            </div>

            {/* ── Requests table ── */}
            <div className={styles['requests-list-card']}>
                <div className={styles['requests-list-card__header']}>
                    <h3 className={styles['requests-list-card__title']}>All Requests</h3>
                    {/* Filter tabs inside the card header */}
                    <div className={styles['requests-filter-tabs']}>
                        {statusTabs.map(({ key, label }) => (
                            <button
                                key={key}
                                className={`${styles['requests-filter-tabs__btn']} ${activeStatus === key ? styles['requests-filter-tabs__btn--active'] : ''}`}
                                onClick={() => setActiveStatus(key)}
                            >
                                {t(label)}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p className="empty-state__desc">{t('common.loading')}</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <ClipboardList size={48} className="empty-state__icon" />
                        <h3 className="empty-state__title">{t('request.noRequests')}</h3>
                        <p className="empty-state__desc">
                            Submit your first HR request to get started.
                        </p>
                        <Button onClick={() => navigate('/requests/new')} style={{ marginTop: '0.5rem' }}>
                            <Plus size={16} />
                            {t('request.newRequest')}
                        </Button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles['requests-table']}>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Details</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(requests as any[]).map((req, i) => {
                                    const typeDesc = req.requesttypedesc || req.requesttype || '';
                                    const variant = getTypeVariant(typeDesc);
                                    const Icon = getTypeIcon(variant);
                                    return (
                                        <tr key={req.syskey || i} onClick={() => navigate(`/requests/${req.syskey}`)}>
                                            <td>{req.eid || '—'}</td>
                                            <td>{req.name || '—'}</td>
                                            <td>{req.refno || '—'}</td>
                                            <td className={styles['requests-table__dates']}>
                                                {displayDate(req.startdate || req.date) || '—'}
                                                {req.enddate && req.enddate !== req.startdate ? ` → ${displayDate(req.enddate)}` : ''}
                                            </td>
                                            <td>
                                                <span className={`${styles['requests-type-badge']} ${styles[`requests-type-badge--${variant}`]}`}>
                                                    <Icon size={12} />
                                                    {typeDesc || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                {req.requestsubtypedesc
                                                    ? req.requestsubtypedesc
                                                    : req.duration != null && req.duration !== ''
                                                        ? `${req.duration} day(s)`
                                                        : req.amount
                                                            ? `${Number(req.amount).toLocaleString()}`
                                                            : '—'}
                                            </td>
                                            <td>
                                                <StatusBadge status={String(req.requeststatus)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
