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
    Users,
    Briefcase,
    Check,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Circle,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    APPROVAL_LIST,
    ATTENDANCE_SHIFT_DATA,
    MULTI_SAVE_APPROVAL,
    LEAVE_TYPES
} from '../../config/api-routes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth-store';
import toast from 'react-hot-toast';
import styles from './ApprovalListPage.module.css';

const statusTabs = [
    { key: RequestStatus.All, label: 'status.all' },
    { key: RequestStatus.Pending, label: 'status.pending' },
    { key: RequestStatus.Approved, label: 'status.approved' },
    { key: RequestStatus.Rejected, label: 'status.rejected' },
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
    const [isAllDate, setIsAllDate] = useState(true);
    const [didInitDates, setDidInitDates] = useState(false);
    const { userId, domain } = useAuthStore();
    const queryClient = useQueryClient();

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());


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

    const { data: leaveTypeList = [] } = useQuery<{ syskey: string, description: string }[]>({
        queryKey: ['leaveTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(LEAVE_TYPES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: allApprovals = [], isLoading: approvalsLoading } = useQuery<RequestModel[]>({
        queryKey: ['approvals', fromDate, toDate, isAllDate, activeStatus],
        queryFn: async () => {

            const body: Record<string, unknown> = {
                fromdate: isAllDate ? "" : fromDate,
                todate: isAllDate ? "" : toDate,
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
        if (activeStatus === RequestStatus.All) return allApprovals;
        return allApprovals.filter(req => String(req.requeststatus) === String(activeStatus));
    }, [allApprovals, activeStatus]);

    const filteredApprovals = displayRequests;

    const pendingRequests = useMemo(() =>
        filteredApprovals.filter(r => String(r.requeststatus) === '1'),
        [filteredApprovals]
    );

    const isAllSelected = pendingRequests.length > 0 && selectedKeys.size === pendingRequests.length;

    const toggleSelect = (syskey: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (next.has(syskey)) next.delete(syskey);
            else next.add(syskey);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(pendingRequests.map(r => String(r.syskey))));
        }
    };

    const multiApproveMutation = useMutation({
        mutationFn: async ({ status }: { status: '2' | '3' }) => {
            const selectedList = Array.from(selectedKeys).map(key => {
                const req = pendingRequests.find(r => String(r.syskey) === key);
                return req;
            });
            const payload = {
                userid: userId || '',
                domain: domain || 'dev',
                status: Number(status),
                selectedRequestList: selectedList
            };
            const res = await apiClient.post(MULTI_SAVE_APPROVAL, payload);
            return res.data;
        },
        onSuccess: (_, variables) => {
            const action = variables.status === '2' ? 'approved' : 'rejected';
            toast.success(`Successfully ${action} ${selectedKeys.size} requests`);
            setSelectedKeys(new Set());
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Bulk action failed');
        }
    });

    useEffect(() => {
        setSelectedKeys(new Set());
    }, [activeStatus]);


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
                    {/* <div className={styles['approval-page__icon-wrapper']}>
                        <ShieldCheck size={24} />
                    </div> */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <label className={styles['approval-page__filter-label']} style={{ marginBottom: 0 }}>Date Range</label>
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
                    <div className={styles['approval-page__filter-row']}>
                        <div className={styles['approval-page__filter-field']}>
                            <label className={styles['approval-page__filter-label']}>From</label>
                            <input
                                type={isAllDate ? "text" : "date"}
                                className={styles['approval-page__filter-input']}
                                value={isAllDate ? "" : toInputDate(fromDate)}
                                placeholder={isAllDate ? "MM/dd/yyyy" : undefined}
                                disabled={isAllDate}
                                onChange={(e) => {
                                    if (e.target.value) setFromDate(fromInputDate(e.target.value));
                                }}
                            />
                        </div>
                        <div className={styles['approval-page__filter-field']}>
                            <label className={styles['approval-page__filter-label']}>To</label>
                            <input
                                type={isAllDate ? "text" : "date"}
                                className={styles['approval-page__filter-input']}
                                value={isAllDate ? "" : toInputDate(toDate)}
                                placeholder={isAllDate ? "MM/dd/yyyy" : undefined}
                                disabled={isAllDate}
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
                    {activeStatus === RequestStatus.Pending && pendingRequests.length > 0 && (
                        <div className={styles['select-all-row']} onClick={toggleSelectAll}>
                            <div className={`${styles['checkbox']} ${isAllSelected ? styles['checkbox--checked'] : ''}`}>
                                {isAllSelected && <Check size={14} className={styles['checkbox-icon']} />}
                            </div>
                            <span>Select all pending requests</span>
                        </div>
                    )}

                    {filteredApprovals.map((req, i) => {
                        const { Icon, bg, color } = getTypeVisual(req);
                        const reqName = req.name || req.eid || 'Employee';
                        const typeDescRaw = req.requesttypedesc || req.requesttype || '';
                        let typeDesc = typeDescRaw;
                        const tDescLow = typeDescRaw.toLowerCase().replace(/\s+/g, '');
                        if (tDescLow === 'ferrychange') typeDesc = 'Ferry Change';
                        else if (tDescLow === 'ferryregistration' || tDescLow === 'ferryregisteration') typeDesc = 'Ferry Registeration';
                        else if (tDescLow === 'ferryusercomplaint' || tDescLow === 'usercomplaint') typeDesc = 'Ferry User Complaint';
                        else if (tDescLow === 'hrcomplaint' || tDescLow === 'ferryhrcomplaint') typeDesc = 'HR Complaint';

                        const subTypeDescRaw = req.requestsubtypedesc || '';
                        let subTypeDesc = subTypeDescRaw;
                        
                        if (tDescLow === 'leave' || typeDescRaw === 'Leave' || tDescLow.includes('leave')) {
                            const matchedLeave = leaveTypeList.find(l => l.syskey === (req.requestsubtype || req.requestsubtypedesc));
                            if (matchedLeave) {
                                subTypeDesc = matchedLeave.description;
                            }
                        }

                        return (
                            <div
                                key={req.syskey || i}
                                className={`${styles['approval-page__card']} ${selectedKeys.has(String(req.syskey)) ? styles['approval-page__card--selected'] : ''}`}
                                style={{ animationDelay: `${i * 40}ms` }}
                                onClick={() => {
                                    const tStr = String(req.requesttype || '').toLowerCase();
                                    const dStr = String(req.requesttypedesc || '').toLowerCase();
                                    const isFerry = tStr.includes('ferry') || dStr.includes('ferry') || 
                                                    tStr.includes('hr complaint') || dStr.includes('hr complaint') ||
                                                    tStr.includes('hrcomplaint') || dStr.includes('hrcomplaint');
                                                    
                                    if (isFerry) {
                                        navigate(`/ferry_approval/${req.syskey}`, { state: { item: req } });
                                    } else {
                                        navigate(`/approvals/${req.syskey}`, { state: { item: req } });
                                    }
                                }}
                            >
                                {activeStatus === RequestStatus.Pending && (
                                    <div className={styles['checkbox-wrapper']} onClick={(e) => toggleSelect(String(req.syskey), e)}>
                                        <div className={`${styles['checkbox']} ${selectedKeys.has(String(req.syskey)) ? styles['checkbox--checked'] : ''}`}>
                                            {selectedKeys.has(String(req.syskey)) && <Check size={14} className={styles['checkbox-icon']} />}
                                        </div>
                                    </div>
                                )}

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
                                    {req.refno ? (
                                        <span className={styles['approval-page__card-ref']}>
                                            #{req.refno}
                                        </span>
                                    ) : null}
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
            <div className={`${styles['bulk-actions-bar']} ${selectedKeys.size > 0 ? styles['bulk-actions-bar--visible'] : ''}`}>
                <div className={styles['bulk-actions-info']}>
                    <div className={styles['bulk-actions-count']}>{selectedKeys.size}</div>
                    <span>Selected</span>
                </div>
                <div className={styles['bulk-actions-btns']}>
                    <button
                        className={`${styles['bulk-btn']} ${styles['bulk-btn--approve']}`}
                        onClick={() => multiApproveMutation.mutate({ status: '2' })}
                        disabled={multiApproveMutation.isPending}
                    >
                        {multiApproveMutation.isPending ? <RotateCcw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve
                    </button>
                    <button
                        className={`${styles['bulk-btn']} ${styles['bulk-btn--reject']}`}
                        onClick={() => multiApproveMutation.mutate({ status: '3' })}
                        disabled={multiApproveMutation.isPending}
                    >
                        {multiApproveMutation.isPending ? <RotateCcw size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
