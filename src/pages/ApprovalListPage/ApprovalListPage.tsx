import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    CheckSquare,
    Filter,
    ChevronDown,
    ChevronUp,
    Palmtree,
    Clock,
    Home,
    Car,
    Calendar,
    Plane,
    Banknote,
    FileText,
    ShieldCheck,
    Users,
    Briefcase,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { APPROVAL_LIST, ATTENDANCE_SHIFT_DATA, GET_ATTENDANCE_APPROVAL_LIST } from '../../config/api-routes';
import { useLocation } from 'react-router-dom';
import styles from './ApprovalListPage.module.css';

const statusTabs = [
    { key: RequestStatus.All, label: 'status.all' },
    { key: RequestStatus.Pending, label: 'status.pending' },
    { key: RequestStatus.Approved, label: 'status.approved' },
    { key: RequestStatus.Rejected, label: 'status.rejected' },
];

/* ── Attendance sub-type filter ── */
const attendanceTypes = [
    { key: '1', label: 'Remote Time in' },
    { key: '2', label: 'Backdate Time in' },
];

/* ── Date helpers ── */
function formatYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

/** Convert "yyyymmdd" → "dd/mm/yyyy" for display */
function displayDate(raw?: string): string {
    if (!raw || raw.length < 8) return raw || '';
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

/** Convert "yyyymmdd" → "yyyy-mm-dd" for date input value */
function toInputDate(yyyymmdd: string): string {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** Convert "yyyy-mm-dd" → "yyyymmdd" for API */
function fromInputDate(inputVal: string): string {
    return inputVal.replace(/-/g, '');
}

function defaultFromDate(): string {
    const now = new Date();
    return formatYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultToDate(): string {
    const now = new Date();
    return formatYYYYMMDD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

/* ── Request-type → icon + color mapping ── */
function getTypeVisual(req: RequestModel) {
    const desc = String(req.requesttypedesc || req.requesttype || '').toLowerCase();
    if (desc.includes('leave')) return { Icon: Palmtree, bg: '#f0fdf4', color: '#16a34a' };
    if (desc.includes('overtime') || desc.includes('ot')) return { Icon: Clock, bg: '#fef3c7', color: '#d97706' };
    if (desc.includes('work from home') || desc.includes('wfh')) return { Icon: Home, bg: '#eff6ff', color: '#2563eb' };
    if (desc.includes('transport')) return { Icon: Car, bg: '#faf5ff', color: '#9333ea' };
    if (desc.includes('reserv')) return { Icon: Calendar, bg: '#ecfeff', color: '#0891b2' };
    if (desc.includes('travel')) return { Icon: Plane, bg: '#fff7ed', color: '#ea580c' };
    if (desc.includes('claim') || desc.includes('advance')) return { Icon: Banknote, bg: '#fef2f2', color: '#dc2626' };
    if (desc.includes('purchase')) return { Icon: Briefcase, bg: '#f0f9ff', color: '#0284c7' };
    return { Icon: FileText, bg: '#f1f5f9', color: '#64748b' };
}

export default function ApprovalListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeStatus, setActiveStatus] = useState<RequestStatus>(RequestStatus.Pending);
    const [showFilter, setShowFilter] = useState(false);
    const [fromDate, setFromDate] = useState(defaultFromDate);
    const [toDate, setToDate] = useState(defaultToDate);
    const [didInitDates, setDidInitDates] = useState(false);
    const [attType, setAttType] = useState('1'); // Changed default to '0' for 'All Types'
    const location = useLocation();
    const isAttendance = location.pathname === '/attendanceapproval';

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
                setFromDate(shiftData.transitionFromDate);
            }
            if (shiftData?.transitionToDate) {
                setToDate(shiftData.transitionToDate);
            }
            setDidInitDates(true);
        }
    }, [shiftData, shiftLoading, didInitDates]);

    const { data: allApprovals = [], isLoading: approvalsLoading } = useQuery<RequestModel[]>({
        queryKey: ['approvals', fromDate, toDate, attType],
        queryFn: async () => {
            if (isAttendance) {
                const res = await mainClient.post(GET_ATTENDANCE_APPROVAL_LIST, {
                    fromdate: fromDate,
                    todate: toDate,
                    type: attType, 
                    status: '', // Fetch all for steady summary counts
                });
                const list = res.data?.data || res.data?.datalist || (Array.isArray(res.data) ? res.data : []);
                return list.map((item: any) => ({
                    syskey: item.syskey,
                    eid: item.employee_id,
                    name: item.name,
                    refno: item.syskey,
                    date: item.date,
                    startdate: item.date,
                    requesttype: attType,
                    requesttypedesc: (attType === '1' || item.atttype === '1') ? 'Remote Time in' : (attType === '2' || item.atttype === '2') ? 'Backdate Time in' : (item.type === '601' ? 'Time In' : item.type === '602' ? 'Time Out' : 'Attendance'),
                    requeststatus: String(item.status ?? '1'),
                    requestsubtypedesc: item.time || '',
                    remark: item.description,
                    location: item.location,
                    latitude: item.latitude,
                    longitude: item.longitude,
                }));
            }

            const body: Record<string, unknown> = {
                fromdate: fromDate,
                todate: toDate,
                type: '',
                status: activeStatus,
            };
            const res = await apiClient.post(APPROVAL_LIST, body);
            return res.data?.datalist || [];
        },
        enabled: didInitDates,
        staleTime: 0,
        refetchOnMount: true,
    });

    const isLoading = shiftLoading || !didInitDates || approvalsLoading;

    // For attendance, filter locally so we can have stable summary counts across status tabs
    const displayRequests = useMemo(() => {
        if (!isAttendance) return allApprovals;
        if (activeStatus === RequestStatus.All) return allApprovals;
        return allApprovals.filter(req => String(req.requeststatus) === String(activeStatus));
    }, [allApprovals, activeStatus, isAttendance]);

    /* Filter out pending from 'All' specifically for general (non-attendance) approvals */
    const filteredApprovals = (activeStatus === RequestStatus.All && !isAttendance)
        ? displayRequests.filter(req => String(req.requeststatus) !== '1')
        : displayRequests;

    /* Count by status for tab badges / summary header using all category-specific data */
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        for (const r of allApprovals as any[]) {
            const st = String(r.requeststatus);
            if (st === '1') pending++;
            if (st === '2') approved++;
            if (st === '3') rejected++;
        }
        return { total: allApprovals.length, pending, approved, rejected };
    }, [allApprovals]);

    const pendingCount = stats.pending;

    return (
        <div className={styles['approval-page']}>
            {/* ── Page Header ── */}
            <div className={styles['approval-page__header']}>
                <div className={styles['approval-page__header-left']}>
                    <div className={styles['approval-page__icon-wrapper']}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h1 className={styles['approval-page__title']}>{t('approval.title')}</h1>
                        <p className={styles['approval-page__subtitle']}>
                            {stats.total} {stats.total === 1 ? 'approval' : 'approvals'}
                            {pendingCount > 0 && (
                                <span className={styles['approval-page__pending-badge']}>
                                    {pendingCount} pending
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <button
                    className={styles['approval-page__filter-btn']}
                    onClick={() => setShowFilter(!showFilter)}
                    title="Filter by date"
                >
                    <Filter size={16} />
                    <span>Filter</span>
                    {showFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {/* ── Date Filter ── */}
            {showFilter && (
                <div className={styles['approval-page__filter-panel']}>
                    <div className={styles['approval-page__filter-row']}>
                        <div className={styles['approval-page__filter-field']}>
                            <label className={styles['approval-page__filter-label']}>From</label>
                            <input
                                type="date"
                                className={styles['approval-page__filter-input']}
                                value={toInputDate(fromDate)}
                                onChange={(e) => {
                                    if (e.target.value) setFromDate(fromInputDate(e.target.value));
                                }}
                            />
                        </div>
                        <div className={styles['approval-page__filter-field']}>
                            <label className={styles['approval-page__filter-label']}>To</label>
                            <input
                                type="date"
                                className={styles['approval-page__filter-input']}
                                value={toInputDate(toDate)}
                                onChange={(e) => {
                                    if (e.target.value) setToDate(fromInputDate(e.target.value));
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Tabs ── */}
            <div className={styles['approval-page__tabs-row']}>
                <div className={styles['approval-page__tabs']}>
                    {statusTabs.map(({ key, label }) => (
                        <button
                            key={key}
                            className={`${styles['approval-page__tab']} ${activeStatus === key ? styles['approval-page__tab--active'] : ''
                                }`}
                            onClick={() => setActiveStatus(key)}
                        >
                            {t(label)}
                        </button>
                    ))}
                </div>

                {isAttendance && (
                    <div className={styles['approval-page__att-types']}>
                        {attendanceTypes.map((type) => (
                            <button
                                key={type.key}
                                className={`${styles['approval-page__att-type-btn']} ${attType === type.key ? styles['approval-page__att-type-btn--active'] : ''
                                    }`}
                                onClick={() => setAttType(type.key)}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── List ── */}
            {isLoading ? (
                <div className={styles['approval-page__loading']}>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={styles['approval-page__skeleton-card']}>
                            <div className={styles['approval-page__skeleton-icon']} />
                            <div className={styles['approval-page__skeleton-body']}>
                                <div className={styles['approval-page__skeleton-bar']} style={{ width: '60%' }} />
                                <div className={styles['approval-page__skeleton-bar']} style={{ width: '40%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredApprovals.length === 0 ? (
                <div className={styles['approval-page__empty']}>
                    <div className={styles['approval-page__empty-icon']}>
                        <CheckSquare size={48} />
                    </div>
                    <h3>{t('approval.pendingApprovals')}</h3>
                    <p>No approval requests at this time.</p>
                </div>
            ) : (
                <div className={styles['approval-page__list']}>
                    {filteredApprovals.map((req, i) => {
                        const { Icon, bg, color } = getTypeVisual(req);
                        const reqName = req.name || req.eid || 'Employee';
                        const typeDesc = req.requesttypedesc || req.requesttype || '';
                        const subTypeDesc = req.requestsubtypedesc || '';

                        return (
                            <div
                                key={req.syskey || i}
                                className={styles['approval-page__card']}
                                style={{ animationDelay: `${i * 40}ms` }}
                                onClick={() => navigate(isAttendance ? `/attendanceapproval/${req.syskey}/${req.requesttype}` : `/approvals/${req.syskey}`)}
                            >
                                <div
                                    className={styles['approval-page__card-icon']}
                                    style={{ background: bg, color }}
                                >
                                    <Icon size={20} />
                                </div>

                                <div className={styles['approval-page__card-body']}>
                                    <div className={styles['approval-page__card-top']}>
                                        <span className={styles['approval-page__card-name']}>
                                            {reqName}
                                        </span>
                                        {typeDesc && (
                                            <span
                                                className={styles['approval-page__card-type']}
                                                style={{ color, background: bg }}
                                            >
                                                {typeDesc}
                                                {subTypeDesc ? ` · ${subTypeDesc}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles['approval-page__card-meta']}>
                                        <span>{displayDate(req.startdate || req.date)}</span>
                                        {req.enddate && req.enddate !== req.startdate && (
                                            <>
                                                <span className={styles['approval-page__card-sep']}>→</span>
                                                <span>{displayDate(req.enddate)}</span>
                                            </>
                                        )}
                                        {req.eid && (
                                            <>
                                                <span className={styles['approval-page__card-sep']}>·</span>
                                                <span>{req.eid}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={styles['approval-page__card-right']}>
                                    <StatusBadge status={req.requeststatus} />
                                    {req.refno && (
                                        <span className={styles['approval-page__card-ref']}>
                                            #{req.refno}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Summary Footer ── */}
            {!isLoading && filteredApprovals.length > 0 && (
                <div className={styles['approval-page__footer']}>
                    <div className={styles['approval-page__footer-stat']}>
                        <Users size={14} />
                        <span>{filteredApprovals.length} total</span>
                    </div>
                </div>
            )}
        </div>
    );
}
