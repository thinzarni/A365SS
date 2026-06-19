/**
 * FerryRequestListPage
 *
 * UI identical to RequestListPage — same page-header, summary cards,
 * filter row, sortable table, status tabs, type badges.
 *
 * Content filtered: requesttypedesc contains 'ferry' OR 'hr'
 * New request → /ferry/new  |  Row tap → /ferry/:id
 */
import { useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Plus,
    ClipboardList,
    Filter,
    Loader2,
    ArrowDown,
    ArrowUp,
    Car,
    Trash2,
    Building2,
    CheckCircle2,
    Circle,
} from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import apiClient from '../../lib/api-client';
import {
    REQUEST_TYPES,
    GET_REQUEST_LIST,
    DELETE_REQUEST,
} from '../../config/api-routes';
import type { TypesModel } from '../../types/models';
import { displayDate } from '../../lib/date-utils';
import { useTranslation } from 'react-i18next';
import styles from '../RequestListPage/RequestListPage.module.css';
import '../../styles/pages.css';

/* ─── helpers ────────────────────────────────────────────── */
function toApiDate(d: string) { return d.replace(/-/g, ''); }

function monthStart() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
}
function monthEnd() {
    const n = new Date();
    const last = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

function formatFilterDate(val: string) {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
}

const STATUS_TABS = [
    { key: 0,  label: 'status.all' },
    { key: 1,  label: 'status.pending' },
    { key: 2,  label: 'status.approved' },
    { key: 3,  label: 'status.rejected' },
];

type SortCol = 'date' | 'time';

/* type badge — ferry variant */
function ferryTypeBadge(desc: string) {
    const d = (desc ?? '').toLowerCase();
    if (d.includes('registration')) return { cls: 'requests-type-badge--wfh',    icon: '📋' };
    if (d.includes('change'))       return { cls: 'requests-type-badge--travel',  icon: '🔄' };
    if (d.includes('hr'))           return { cls: 'requests-type-badge--claim',   icon: '👔' };
    if (d.includes('complaint') || d.includes('compliant')) return { cls: 'requests-type-badge--overtime', icon: '📣' };
    return { cls: 'requests-type-badge--default', icon: '🚌' };
}

/* ═══════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════ */
export default function FerryRequestListPage() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { t }     = useTranslation();
    const qc        = useQueryClient();

    const isHrComplaintView = location.pathname.startsWith('/hr_complaint') || location.pathname.startsWith('/hrcomplaint');
    const basePath = isHrComplaintView ? (location.pathname.startsWith('/hr_complaint') ? '/hr_complaint' : '/hrcomplaint') : '/ferry_request';

    function isMatchedType(desc: string) {
        const d = (desc ?? '').toLowerCase();
        if (isHrComplaintView) {
            return d.includes('hr compliant') || d.includes('hr complaint') || d.includes('hrcomplaint');
        }
        return d.includes('ferry');
    }

    /* ── Filter state ── */
    const [fromDate,    setFromDate]    = useState(monthStart);
    const [toDate,      setToDate]      = useState(monthEnd);
    const [isAllDate,   setIsAllDate]   = useState(true);
    const [typeSyskey,  setTypeSyskey]  = useState('');
    const [activeStatus,setActiveStatus]= useState<number>(1);
    const [filterOpen,  setFilterOpen]  = useState(false);
    const [sortCol,     setSortCol]     = useState<SortCol>('date');
    const [sortDir,     setSortDir]     = useState<'asc'|'desc'>('desc');

    const [fromFocused, setFromFocused] = useState(false);
    const [toFocused, setToFocused] = useState(false);
    const fromRef = useRef<HTMLInputElement>(null);
    const toRef = useRef<HTMLInputElement>(null);

    /* delete confirm */
    const [deleteTarget, setDeleteTarget] = useState<any>(null);

    /* ── Ferry types from API ── */
    const { data: allTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['requestTypes'],
        queryFn:  async () => {
            const res = await apiClient.get(REQUEST_TYPES);
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const ferryTypes = useMemo(() => [
        { syskey: '', description: 'All Types' } as TypesModel,
        ...allTypes.filter(t => isMatchedType(t.description)),
    ], [allTypes, isHrComplaintView]);

    const typeOptions = ferryTypes.map(t => ({ value: t.syskey, label: t.description }));

    /* ── Fetch list ── */
    const { data: rawList = [], isLoading, refetch } = useQuery<any[]>({
        queryKey: ['ferryList', fromDate, toDate, isAllDate, typeSyskey, activeStatus, isHrComplaintView],
        queryFn:  async () => {
            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: isAllDate ? "" : toApiDate(fromDate),
                todate:   isAllDate ? "" : toApiDate(toDate),
                type:     typeSyskey,
                status:   activeStatus === 0 ? '0' : String(activeStatus),
            });
            const all: any[] = res.data?.datalist ?? res.data?.data ?? [];
            return all.filter(r => isMatchedType(r.requesttypedesc ?? r.requesttype ?? ''));
        },
        staleTime: 0,
    });

    /* ── Global Stats Fetch ── */
    const { data: globalStatsList = [] } = useQuery<any[]>({
        queryKey: ['ferryListGlobalStats', isHrComplaintView],
        queryFn: async () => {
            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: "",
                todate: "",
                type: "",
                status: "0",
            });
            const all: any[] = res.data?.datalist ?? res.data?.data ?? [];
            return all.filter(r => isMatchedType(r.requesttypedesc ?? r.requesttype ?? ''));
        },
        staleTime: 5 * 60 * 1000,
    });

    /* ── Sort + display ── */
    const displayList = useMemo(() => {
        const list = [...rawList];
        list.sort((a, b) => {
            const aVal = sortCol === 'date'
                ? (a.startdate || a.date || '')
                : (a.createddate || '');
            const bVal = sortCol === 'date'
                ? (b.startdate || b.date || '')
                : (b.createddate || '');
            return sortDir === 'desc'
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
        });
        return list;
    }, [rawList, sortCol, sortDir]);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total:    globalStatsList.length,
        pending:  globalStatsList.filter(r => String(r.requeststatus) === '1').length,
        approved: globalStatsList.filter(r => String(r.requeststatus) === '2').length,
        rejected: globalStatsList.filter(r => String(r.requeststatus) === '3').length,
    }), [globalStatsList]);

    /* ── Sort toggle ── */
    function toggleSort(col: SortCol) {
        if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortCol(col); setSortDir('desc'); }
    }

    /* ── Delete ── */
    const { mutate: doDelete, isPending: deleting } = useMutation({
        mutationFn: async (syskey: string) => {
            const res = await apiClient.post(DELETE_REQUEST, { syskey });
            return res.data;
        },
        onSuccess: (data) => {
            if (data?.statuscode === 300 || data?.status === 200) {
                toast.success(data?.message ?? 'Deleted successfully');
            } else {
                toast.error(data?.message ?? 'Delete failed');
            }
            qc.invalidateQueries({ queryKey: ['ferryList'] });
            refetch();
        },
        onError: () => toast.error('Delete failed'),
    });

    /* ═══════════════════════════════════════════════
       RENDER — mirrors RequestListPage JSX exactly
    ═══════════════════════════════════════════════ */
    return (
        <div className={styles['requests-page']}>

            {/* ── Page Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isHrComplaintView ? (
                                <Building2 size={22} style={{ color: 'var(--color-primary-600)' }} />
                            ) : (
                                <Car size={22} style={{ color: 'var(--color-primary-600)' }} />
                            )}
                            {isHrComplaintView ? 'HR Complaint' : 'Ferry Request'}
                        </h1>
                        <p className="page-header__subtitle">
                            {displayList.length} {isHrComplaintView ? 'complaint' : 'ferry request'}{displayList.length === 1 ? '' : 's'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Button onClick={() => navigate(`${basePath}/new`)}>
                            <Plus size={16} />
                            {isHrComplaintView ? 'New HR Complaint' : 'New Ferry Request'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className={styles['requests-summary']}>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']}>{stats.total}</span>
                    <span className={styles['requests-summary__label']}>Total Requests</span>
                </div>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']}
                        style={{ color: 'var(--color-warning-600)' }}>
                        {stats.pending}
                    </span>
                    <span className={styles['requests-summary__label']}>Pending</span>
                </div>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']}
                        style={{ color: 'var(--color-success-600)' }}>
                        {stats.approved}
                    </span>
                    <span className={styles['requests-summary__label']}>Approved</span>
                </div>
                <div className={styles['requests-summary__card']}>
                    <span className={styles['requests-summary__value']}
                        style={{ color: 'var(--color-danger-600)' }}>
                        {stats.rejected}
                    </span>
                    <span className={styles['requests-summary__label']}>Rejected</span>
                </div>
            </div>

            {/* ── Filter Row (collapsible) ── */}
            {filterOpen && (
                <div className={styles['filters-row']}>
                    <div className={styles['filter-group']}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <label className={styles['filter-label']} style={{ marginBottom: 0 }}>Date Range</label>
                            <button
                                type="button"
                                onClick={() => setIsAllDate(!isAllDate)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    fontSize: 12, fontWeight: 600,
                                    padding: '4px 12px', borderRadius: 16,
                                    border: '1px solid',
                                    borderColor: isAllDate ? '#0ea5e9' : '#cbd5e1',
                                    backgroundColor: isAllDate ? '#e0f2fe' : '#f8fafc',
                                    color: isAllDate ? '#0369a1' : '#64748b',
                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                    outline: 'none',
                                }}
                            >
                                {isAllDate ? <CheckCircle2 size={15} strokeWidth={2.5} /> : <Circle size={15} strokeWidth={2} />}
                                All Dates
                            </button>
                        </div>
                        <div className={styles['filter-inputs']}>
                            <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
                                <Input 
                                    type="text" 
                                    value={isAllDate ? "" : formatFilterDate(fromDate)}
                                    placeholder="dd/MM/yyyy"
                                    onChange={() => {}}
                                    onClick={() => {
                                        if (!isAllDate && fromRef.current) {
                                            try { fromRef.current.showPicker(); } catch(e) {}
                                        }
                                    }}
                                    disabled={isAllDate}
                                    readOnly={!isAllDate}
                                    className={styles['filter-date']}
                                    style={{ width: '100%', cursor: isAllDate ? 'default' : 'pointer' }}
                                />
                                {!isAllDate && (
                                    <input 
                                        type="date" 
                                        ref={fromRef}
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                        style={{ position: 'absolute', bottom: 0, left: 10, width: 1, height: 1, opacity: 0, border: 0, padding: 0, pointerEvents: 'none' }}
                                    />
                                )}
                            </div>
                            <span className={styles['filter-separator']}>→</span>
                            <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
                                <Input 
                                    type="text" 
                                    value={isAllDate ? "" : formatFilterDate(toDate)}
                                    placeholder="dd/MM/yyyy"
                                    onChange={() => {}}
                                    onClick={() => {
                                        if (!isAllDate && toRef.current) {
                                            try { toRef.current.showPicker(); } catch(e) {}
                                        }
                                    }}
                                    disabled={isAllDate}
                                    readOnly={!isAllDate}
                                    className={styles['filter-date']}
                                    style={{ width: '100%', cursor: isAllDate ? 'default' : 'pointer' }}
                                />
                                {!isAllDate && (
                                    <input 
                                        type="date" 
                                        ref={toRef}
                                        value={toDate}
                                        onChange={e => setToDate(e.target.value)}
                                        style={{ position: 'absolute', bottom: 0, left: 10, width: 1, height: 1, opacity: 0, border: 0, padding: 0, pointerEvents: 'none' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={styles['filter-group']}>
                        <label className={styles['filter-label']}>Request Type</label>
                        <Select
                            options={typeOptions}
                            value={typeSyskey}
                            onChange={e => setTypeSyskey(e.target.value)}
                            className={styles['filter-select']}
                        />
                    </div>
                </div>
            )}

            {/* ── List Card (table) ── */}
            <div className={styles['requests-list-card']}>
                <div className={styles['requests-list-card__header']}>
                    <h3 className={styles['requests-list-card__title']}>{isHrComplaintView ? 'HR Complaints' : 'Ferry Requests'}</h3>
                    <div className={styles['requests-list-card__actions']}>
                        {/* Filter toggle */}
                        <button
                            className={`${styles['filter-toggle-btn']} ${filterOpen ? styles['filter-toggle-btn--active'] : ''}`}
                            onClick={() => setFilterOpen(o => !o)}
                            title="Toggle filters"
                        >
                            <Filter size={14} />
                            Filter
                            {typeSyskey !== '' && <span className={styles['filter-toggle-btn__dot']} />}
                        </button>

                        {/* Status tabs */}
                        <div className={styles['requests-filter-tabs']}>
                            {STATUS_TABS.map(({ key, label }) => (
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

                {/* ── Table body ── */}
                {isLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary-600)' }} />
                        <p className="empty-state__desc">{t('common.loading')}</p>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <ClipboardList size={48} className="empty-state__icon" />
                        <h3 className="empty-state__title">{t('request.noRequests')}</h3>
                        <p className="empty-state__desc">No {isHrComplaintView ? 'HR complaints' : 'ferry requests'} found for the selected filters.</p>
                        <Button onClick={() => navigate(`${basePath}/new`)} style={{ marginTop: '0.5rem' }}>
                            <Plus size={16} />
                            {isHrComplaintView ? 'New HR Complaint' : 'New Ferry Request'}
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
                                    <th
                                        onClick={() => toggleSort('date')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Sort by Date"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            Date
                                            {sortCol === 'date'
                                                ? sortDir === 'desc'
                                                    ? <ArrowDown size={14} color="var(--color-primary-600)" />
                                                    : <ArrowUp size={14} color="var(--color-primary-600)" />
                                                : <ArrowDown size={14} color="var(--color-neutral-300)" />}
                                        </div>
                                    </th>
                                    <th>Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayList.map((req, i) => {
                                    const typeDesc = req.requesttypedesc || req.requesttype || '';
                                    const { cls, icon } = ferryTypeBadge(typeDesc);
                                    return (
                                        <tr key={req.syskey || i}
                                            onClick={() => navigate(`${basePath}/${req.syskey}`, { state: { from: location.pathname } })}>
                                            <td>{req.eid || '—'}</td>
                                            <td>{req.name || '—'}</td>
                                            <td>{req.refno || '—'}</td>
                                            <td className={styles['requests-table__dates']}>
                                                {displayDate(req.startdate || req.date) || '—'}
                                                {req.enddate && req.enddate !== req.startdate
                                                    ? ` → ${displayDate(req.enddate)}`
                                                    : ''}
                                            </td>
                                            <td>
                                                <span className={`${styles['requests-type-badge']} ${styles[cls]}`}>
                                                    <span style={{ marginRight: 3 }}>{icon}</span>
                                                    {typeDesc || '—'}
                                                </span>
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

            {/* ── Delete confirm modal ── */}
            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) doDelete(deleteTarget.syskey);
                    setDeleteTarget(null);
                }}
                title={isHrComplaintView ? 'Delete HR Complaint' : 'Delete Ferry Request'}
                                message={`Delete this ${deleteTarget?.requesttypedesc ?? (isHrComplaintView ? 'HR complaint' : 'ferry')} request? This cannot be undone.`}
                confirmLabel="Delete"
                loading={deleting}
                variant="danger"
                icon={<Trash2 size={28} />}
            />
        </div>
    );
}
