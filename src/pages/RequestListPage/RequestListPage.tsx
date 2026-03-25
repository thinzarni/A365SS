import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    Filter,
} from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestModel, TypesModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { 
    GET_REQUEST_LIST, 
    GET_ATTENDANCE_REQ_LIST, 
    REQUEST_TYPES, 
    ATTENDANCE_SHIFT_DATA 
} from '../../config/api-routes';
import { displayDate } from '../../lib/date-utils';
import styles from './RequestListPage.module.css';
import '../../styles/pages.css';

/** Convert Date → "yyyy-mm-dd" */
function dateToInput(d: Date): string {
    return d.toISOString().split('T')[0];
}

/** Convert "yyyymmdd" → "yyyy-mm-dd" */
function toInputDate(yyyymmdd: string): string {
    if (!yyyymmdd || yyyymmdd.length < 8) return '';
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

const DEFAULT_FROM_DATE = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
const DEFAULT_TO_DATE = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

// Maps API router path → display config + filter keyword
const PATH_TYPE_MAP: Record<string, { filter: string; label: string; newLabel: string; newPath: string }> = {
    '/claim': { filter: 'claim', label: 'Claims', newLabel: 'New Claim', newPath: '/claim/new' },
    '/overtime': { filter: 'overtime', label: 'Overtime', newLabel: 'New Overtime', newPath: '/overtime/new' },
    '/wfh': { filter: 'work from home', label: 'Work From Home', newLabel: 'New WFH Request', newPath: '/wfh/new' },
    '/transportation': { filter: 'transportation', label: 'Transportation', newLabel: 'New Transport', newPath: '/transportation/new' },
    '/travel': { filter: 'travel', label: 'Travel', newLabel: 'New Travel', newPath: '/travel/new' },
    '/cashadvance': { filter: 'cash advance', label: 'Cash Advance', newLabel: 'New Cash Advance', newPath: '/cashadvance/new' },
    '/offinlieu': { filter: 'off in lieu', label: 'Off in Lieu', newLabel: 'New Off in Lieu', newPath: '/offinlieu/new' },
    '/attendancerequest': { filter: 'attendance', label: 'Attendance Request', newLabel: 'New Attendance Request', newPath: '/attendancerequest/new' },
};

/* ── Attendance sub-type filter ── */
const attendanceTypes = [
    { key: '1', label: 'Remote Time in' },
    { key: '2', label: 'Backdate Time in' },
];

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

export default function RequestListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // Detect subtype view
    const pathTypeCfg = PATH_TYPE_MAP[location.pathname] ?? null;
    const isSubtypeView = pathTypeCfg !== null;
    const isAttendancePage = location.pathname === '/attendancerequest';

    const [activeStatus, setActiveStatus] = useState<RequestStatus>(RequestStatus.Pending);
    const [fromDate, setFromDate] = useState<string>(dateToInput(DEFAULT_FROM_DATE));
    const [toDate, setToDate] = useState<string>(dateToInput(DEFAULT_TO_DATE));
    const [requestType, setRequestType] = useState<string>('');
    const [attType, setAttType] = useState('1');
    const [didInitDates, setDidInitDates] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    // Fetch shift data for transition dates
    const { data: shiftData, isLoading: shiftLoading } = useQuery({
        queryKey: ['shiftData'],
        queryFn: async () => {
            const res = await mainClient.post(ATTENDANCE_SHIFT_DATA, {});
            return res.data?.data || null;
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (!shiftLoading && !didInitDates) {
            if (shiftData?.transitionFromDate) {
                setFromDate(toInputDate(shiftData.transitionFromDate));
            }
            if (shiftData?.transitionToDate) {
                setToDate(toInputDate(shiftData.transitionToDate));
            }
            setDidInitDates(true);
        }
    }, [shiftData, shiftLoading, didInitDates]);

    // Fetch request types for the dropdown
    const { data: requestTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['requestTypes'],
        queryFn: async () => {
            const res = await apiClient.get(REQUEST_TYPES);
            return res.data?.datalist || [];
        },
    });

    const typeOptions = useMemo(() => {
        return [
            { value: '', label: 'All Types' },
            ...requestTypes.map(t => ({
                value: t.syskey,
                label: t.description
            }))
        ];
    }, [requestTypes]);

    const { data: allRequests = [], isLoading: requestsLoading } = useQuery<RequestModel[]>({
        queryKey: ['requests', fromDate, toDate, requestType, attType, location.pathname, activeStatus],
        queryFn: async () => {
            if (isAttendancePage) {
                const res = await mainClient.post(GET_ATTENDANCE_REQ_LIST, {
                    fromdate: fromDate.replace(/-/g, ''),
                    todate: toDate.replace(/-/g, ''),
                    status: '', // Fetch all for steady summary counts (as per previous strategy)
                    type: attType,
                });
                const list = res.data?.data || res.data?.datalist || [];
                return list.map((item: any) => ({
                    syskey: item.syskey,
                    eid: item.employee_id,
                    name: item.employee_name,
                    refno: item.syskey,
                    date: item.date,
                    startdate: item.date,
                    requesttype: item.atttype || item.type,
                    requesttypedesc: (attType === '1' || item.atttype === '1') ? 'Remote Time in' : (attType === '2' || item.atttype === '2') ? 'Backdate Time in' : (item.type === '601' ? 'Time In' : item.type === '602' ? 'Time Out' : 'Attendance'),
                    requeststatus: String(item.status ?? '1'),
                    requestsubtypedesc: `${item.intime || ''}${item.intime && item.outtime ? ' - ' : ''}${item.outtime || ''}`,
                    remark: item.description,
                }));
            }

            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: fromDate.replace(/-/g, ''),
                todate: toDate.replace(/-/g, ''),
                type: isSubtypeView ? '' : requestType,
                status: activeStatus === RequestStatus.All ? 0 : Number(activeStatus),
            });
            const all: RequestModel[] = res.data?.datalist || [];
            if (pathTypeCfg) {
                return all.filter(r => {
                    const desc = ((r as any).requesttypedesc || (r as any).requesttype || '').toLowerCase();
                    return desc.includes(pathTypeCfg.filter);
                });
            }
            return all;
        },
        enabled: didInitDates,
    });

    const displayRequests = useMemo(() => {
        // Attendance Page filters locally because it fetches all statuses to maintain steady summary counts
        if (isAttendancePage) {
            if (activeStatus === RequestStatus.All) return allRequests;
            return allRequests.filter(r => r.requeststatus === String(activeStatus));
        }
        // General request list is already filtered by API
        return allRequests;
    }, [allRequests, activeStatus, isAttendancePage]);

    const isLoading = shiftLoading || !didInitDates || requestsLoading;

    // Summary stats
    const { data: generalSummaryData = [] } = useQuery<RequestModel[]>({
        queryKey: ['summaryRequests', fromDate, toDate, requestType, location.pathname],
        queryFn: async () => {
            if (isAttendancePage) return [];
            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: fromDate.replace(/-/g, ''),
                todate: toDate.replace(/-/g, ''),
                type: isSubtypeView ? '' : requestType,
                status: 0, // All statuses
            });
            const all: RequestModel[] = res.data?.datalist || [];
            if (pathTypeCfg) {
                return all.filter(r => {
                    const desc = ((r as any).requesttypedesc || (r as any).requesttype || '').toLowerCase();
                    return desc.includes(pathTypeCfg.filter);
                });
            }
            return all;
        },
        enabled: didInitDates && !isAttendancePage,
        staleTime: 30 * 1000,
    });

    const stats = useMemo(() => {
        const sourceData = isAttendancePage ? allRequests : generalSummaryData;
        const total = sourceData.length;
        const pending = sourceData.filter(r => String(r.requeststatus) === '1').length;
        const approved = sourceData.filter(r => String(r.requeststatus) === '2').length;
        const rejected = sourceData.filter(r => String(r.requeststatus) === '3').length;
        return { total, pending, approved, rejected };
    }, [allRequests, generalSummaryData, isAttendancePage]);

    /* ── Render ── */

    return (
        <div className={styles['requests-page']}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">
                            {isSubtypeView ? pathTypeCfg!.label : t('request.title')}
                        </h1>
                        <p className="page-header__subtitle">
                            {displayRequests.length} {isSubtypeView ? pathTypeCfg!.filter : 'request'}{displayRequests.length === 1 ? '' : 's'}
                        </p>
                    </div>
                    <Button onClick={() => navigate(isSubtypeView ? pathTypeCfg!.newPath : '/requests/new')}>
                        <Plus size={16} />
                        {isSubtypeView ? pathTypeCfg!.newLabel : t('request.newRequest')}
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

            {/* ── Filters (collapsible) ── */}
            {(!isSubtypeView || isAttendancePage) && filterOpen && (
                <div className={styles['filters-row']}>
                    <div className={styles['filter-group']}>
                        <label className={styles['filter-label']}>Date Range</label>
                        <div className={styles['filter-inputs']}>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className={styles['filter-date']}
                            />
                            <span className={styles['filter-separator']}>→</span>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className={styles['filter-date']}
                            />
                        </div>
                    </div>
                    {!isAttendancePage && (
                        <div className={styles['filter-group']}>
                            <label className={styles['filter-label']}>Request Type</label>
                            <Select
                                options={typeOptions}
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value)}
                                className={styles['filter-select']}
                                placeholder="All Types"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── Requests table ── */}
            <div className={styles['requests-list-card']}>
                <div className={styles['requests-list-card__header']}>
                    <h3 className={styles['requests-list-card__title']}>
                        {isSubtypeView ? `${pathTypeCfg!.label} Requests` : 'All Requests'}
                    </h3>
                    <div className={styles['requests-list-card__actions']}>
                        {isAttendancePage && (
                            <div className={styles['requests-att-types']}>
                                {attendanceTypes.map((t) => (
                                    <button
                                        key={t.key}
                                        className={`${styles['requests-att-type-btn']} ${attType === t.key ? styles['requests-att-type-btn--active'] : ''}`}
                                        onClick={() => setAttType(t.key)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {(!isSubtypeView || isAttendancePage) && (
                            <button
                                className={`${styles['filter-toggle-btn']} ${filterOpen ? styles['filter-toggle-btn--active'] : ''}`}
                                onClick={() => setFilterOpen(o => !o)}
                                title="Toggle filters"
                            >
                                <Filter size={14} />
                                Filter
                                {(requestType !== '') && (
                                    <span className={styles['filter-toggle-btn__dot']} />
                                )}
                            </button>
                        )}
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
                </div>

                {isLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p className="empty-state__desc">{t('common.loading')}</p>
                    </div>
                ) : displayRequests.length === 0 ? (
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
                                {(displayRequests as any[]).map((req, i) => {
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
                                                {(() => {
                                                    const typeStr = typeDesc.toLowerCase();
                                                    if (typeStr.includes('early out') || typeStr.includes('late')) {
                                                        return typeDesc; // Just show 'Early Out' or 'Late'
                                                    }
                                                    if (req.requestsubtypedesc) {
                                                        return req.requestsubtypedesc;
                                                    }
                                                    if (req.duration != null && req.duration !== '') {
                                                        return `${req.duration} day(s)`;
                                                    }
                                                    if (req.amount) {
                                                        return `${Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                                                    }
                                                    return '—';
                                                })()}
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
