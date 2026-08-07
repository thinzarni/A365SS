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
    X,
    ChevronRight,
    Hash,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestModel, TypesModel, StepLevelData } from '../../types/models';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    APPROVAL_LIST,
    ATTENDANCE_SHIFT_DATA,
    MULTI_SAVE_APPROVAL,
    LEAVE_TYPES,
    REQUEST_TYPES
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
    const [activeStatus, setActiveStatus] = useState<RequestStatus>(RequestStatus.All);
    const [showFilter, setShowFilter] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('');
    const [fromDate, setFromDate] = useState(defaultFromDate);
    const [toDate, setToDate] = useState(defaultToDate);
    const [isAllDate, setIsAllDate] = useState(true);
    const [didInitDates, setDidInitDates] = useState(false);
    const [fromFocused, setFromFocused] = useState(false);
    const [toFocused, setToFocused] = useState(false);
    const { userId, domain, user } = useAuthStore();
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
            const res = await apiClient.get(LEAVE_TYPES, { params: { isPlatform: 'a365' } });
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch request types for the dropdown
    const { data: requestTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['requestTypes'],
        queryFn: async () => {
            const res = await apiClient.get(REQUEST_TYPES, { params: { isPlatform: 'a365' } });
            return res.data?.datalist || [];
        }
    });

    const typeOptions = useMemo(() => {
        const options: { value: string, label: string }[] = [];
        options.push({ value: '', label: 'All Requests' });
        
        requestTypes.forEach(rt => {
            options.push({ value: rt.syskey, label: rt.description });
        });
        
        return options;
    }, [requestTypes]);

    const { data: allApprovals = [], isLoading: approvalsLoading } = useQuery<RequestModel[]>({
        queryKey: ['approvals', fromDate, toDate, isAllDate, activeStatus, selectedType],
        queryFn: async () => {
            const body: Record<string, unknown> = {
                fromdate: isAllDate ? "" : fromDate,
                todate: isAllDate ? "" : toDate,
                type: selectedType,
                status: activeStatus,
            };
            const res = await apiClient.post(APPROVAL_LIST, body);
            const datalist: any[] = res.data?.datalist || [];

            // The approval list API returns:
            //   requesttype    = human-readable name ("claim", "leave", etc.)
            //   requestsubtype = syskey UUID of the specific sub-type
            // The multi-approve API expects:
            //   requesttype    = syskey UUID  (swap from requestsubtype)
            //   requesttypedesc = human-readable name (swap from requesttype)
            return datalist.map((item: any) => ({
                ...item,
                requesttypedesc: item.requesttype || '',      // "claim" → requesttypedesc
                requesttype: item.requestsubtype || item.requesttype || '', // syskey → requesttype
            }));
        },
        enabled: didInitDates,
        staleTime: 0,
        refetchOnMount: true,
    });

    const { data: summaryApprovals = [] } = useQuery<RequestModel[]>({
        queryKey: ['summaryApprovals', fromDate, toDate, isAllDate, selectedType],
        queryFn: async () => {
            const body: Record<string, unknown> = {
                fromdate: isAllDate ? "" : fromDate,
                todate: isAllDate ? "" : toDate,
                type: selectedType,
                status: RequestStatus.All, // Fetch all to calculate overall stats
            };
            const res = await apiClient.post(APPROVAL_LIST, body);
            const datalist: any[] = res.data?.datalist || [];
            return datalist.map((item: any) => ({
                requeststatus: String(item.status ?? item.requeststatus ?? 1),
            })) as RequestModel[];
        },
        enabled: didInitDates,
        staleTime: 30 * 1000,
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

    // All pending requests — filtered below to exclude ones where the logged-in user already approved
    const allPendingRequests = pendingRequests;

    /** Returns true if the logged-in user has a step in this request's stepLevelData
     *  that is already Approved (status 2) — meaning they've already acted on it. */
    const isAlreadyApprovedByMe = (req: RequestModel): boolean => {
        const steps: StepLevelData[] = (req as any).stepLevelData || [];
        if (!steps.length) return false;

        const savedName = String(user?.name || '').trim().toLowerCase();
        const savedId   = String(user?.userid || userId || '').trim().toLowerCase();
        const savedRole = String(user?.role || '').trim().toLowerCase();

        const myStep = steps.find(step => {
            const stepName     = String(step.rankrole_specificperson || '').trim().toLowerCase();
            const approvedById = String((step as any).approvedby_userid || '').trim().toLowerCase();
            return stepName === savedName ||
                   stepName === savedRole ||
                   stepName === savedId ||
                   (savedName !== '' && stepName.includes(savedName)) ||
                   (approvedById !== '' && approvedById === savedId);
        });

        return !!myStep && (myStep.status === 2 || String(myStep.status) === '2');
    };

    const selectablePendingRequests = useMemo(
        () => allPendingRequests.filter(r => !isAlreadyApprovedByMe(r)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [allPendingRequests, userId, user]
    );

    /** Returns an error message if this request has required fields that must be
     *  filled in the detail page before it can be bulk-approved, or null if OK. */
    const getItemRequiredFieldsError = (req: RequestModel): string | null => {
        const name = req.name || req.eid || 'Employee';
        const typeDesc = (req as any).requesttypedesc || req.requesttype || 'Request';
        const label = `${name} · ${typeDesc}`;

        const amt = (req as any).amount;
        const maxAmt = (req as any).max_amount;
        if (amt !== undefined && amt !== null && Number(amt) !== 0)
            return `Required fields for ${label}`;
        if (maxAmt !== undefined && maxAmt !== null && Number(maxAmt) !== 0)
            return `Required fields for ${label}`;

        const tDescLow = String(req.requesttypecode || req.requesttypedesc || req.requesttype || '').toLowerCase().replace(/\s+/g, '');

        // Ferry Registration always needs the detail form (ferry number must be assigned)
        if (tDescLow === 'ferryregistration') {
            return `Required fields for ${label}`;
        }

        // HR / user complaints: only block if the remark (comment) is not yet filled
        if (
            tDescLow === 'ferryusercomplaint' ||
            tDescLow === 'usercomplaint' ||
            tDescLow === 'hrquery' ||
            tDescLow === 'ferryhrquery'
        ) {
            const remark = String((req as any).remark || '').trim();
            if (!remark) return `Required fields for ${label}`;
        }

        return null;
    };


    const isAllSelected = selectablePendingRequests.length > 0 && selectedKeys.size === selectablePendingRequests.length;

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
            setSelectedKeys(new Set(selectablePendingRequests.map(r => String(r.syskey))));
        }
    };

    const handleBulkAction = (status: '2' | '3') => {
        // For Approve only: validate that each selected item has no missing required fields
        if (status === '2') {
            const errors: string[] = [];
            for (const key of Array.from(selectedKeys)) {
                const req = pendingRequests.find(r => String(r.syskey) === key);
                if (!req) continue;
                const err = getItemRequiredFieldsError(req);
                if (err) errors.push(err);
            }
            if (errors.length > 0) {
                // Show one toast per failing item
                errors.forEach(msg => toast.error(msg, { duration: 4000 }));
                return; // Block the approve
            }
        }
        multiApproveMutation.mutate({ status });
    };

    const multiApproveMutation = useMutation({
        mutationFn: async ({ status }: { status: '2' | '3' }) => {
            const selectedList = Array.from(selectedKeys).map(key => {
                const req = pendingRequests.find(r => String(r.syskey) === key);
                if (!req) return null;

                // The approval list returns requesttype as a syskey UUID,
                // which is exactly what the multi-approve API expects — pass through as-is.
                const requesttype = (req as any).requesttype || '';

                return {
                    syskey: req.syskey,
                    eid: (req as any).eid || '',
                    name: req.name || '',
                    refno: req.refno,
                    startdate: req.startdate || (req as any).date || '',
                    enddate: (req as any).enddate || req.startdate || (req as any).date || '',
                    createddate: (req as any).createddate || '',
                    requesttype,
                    requesttypedesc: (req as any).requesttypedesc || '',
                    requestsubtype: (req as any).requestsubtype || '',
                    remark: (req as any).remark || '',
                    isgoing: (req as any).isgoing ?? null,
                    isreturn: (req as any).isreturn ?? null,
                    isgoback: (req as any).isgoback ?? null,
                    ottype: (req as any).ottype ?? 0,
                    requestsubtypedesc: (req as any).requestsubtypedesc || '',
                    approver: (req as any).approver || '',
                    requeststatus: req.requeststatus,
                    duration: (req as any).duration || null,
                    amount: (req as any).amount ?? null,
                    currencytype: (req as any).currencytype ?? null,
                    currencytypedesc: (req as any).currencytypedesc || '',
                    hour: (req as any).hour ?? null,
                    approvedby: (req as any).approvedby || '',
                    rosykey: (req as any).rosykey || '',
                    approvaltype: (req as any).approvaltype || '',
                    timein: (req as any).timein || '',
                    timeout: (req as any).timeout || '',
                    stepLevelData: (req as any).stepLevelData || [],
                    createdtime: (req as any).createdtime || '',
                };
            }).filter(Boolean);

            const payload = {
                userid: userId || '',
                domain: domain || 'dev',
                status: Number(status),
                selectedRequestList: selectedList,
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


    /* Count by status for tab badges / summary header using summaryApprovals */
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        for (const r of summaryApprovals) {
            const st = String(r.requeststatus);
            if (st === '1') pending++;
            if (st === '2') approved++;
            if (st === '3') rejected++;
        }
        return { total: summaryApprovals.length, pending, approved, rejected };
    }, [summaryApprovals]);

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
            </div>

            {/* ── Summary cards ── */}
            <div className={styles['approval-page__summary']}>
                <div className={styles['approval-page__summary-card']}>
                    <span className={styles['approval-page__summary-value']}>{stats.total}</span>
                    <span className={styles['approval-page__summary-label']}>Total Requests</span>
                </div>
                <div className={styles['approval-page__summary-card']}>
                    <span className={styles['approval-page__summary-value']} style={{ color: 'var(--color-warning-600)' }}>
                        {stats.pending}
                    </span>
                    <span className={styles['approval-page__summary-label']}>Pending</span>
                </div>
                <div className={styles['approval-page__summary-card']}>
                    <span className={styles['approval-page__summary-value']} style={{ color: 'var(--color-success-600)' }}>
                        {stats.approved}
                    </span>
                    <span className={styles['approval-page__summary-label']}>Approved</span>
                </div>
                <div className={styles['approval-page__summary-card']}>
                    <span className={styles['approval-page__summary-value']} style={{ color: 'var(--color-danger-600)' }}>
                        {stats.rejected}
                    </span>
                    <span className={styles['approval-page__summary-label']}>Rejected</span>
                </div>
            </div>

            {/* ── Date Filter ── */}
            {showFilter && (
                <div className={styles['approval-page__filter-panel']}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
                        {/* Date Range Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type={isAllDate ? "text" : (fromFocused ? "date" : "text")}
                                    className={styles['approval-page__filter-input']}
                                    style={{ minWidth: 140 }}
                                    value={isAllDate ? "" : (fromFocused ? toInputDate(fromDate) : displayDate(fromDate))}
                                    placeholder={isAllDate ? "dd/MM/yyyy" : "dd/MM/yyyy"}
                                    disabled={isAllDate}
                                    onFocus={() => setFromFocused(true)}
                                    onBlur={() => setFromFocused(false)}
                                    onChange={(e) => {
                                        if (e.target.value) setFromDate(fromInputDate(e.target.value));
                                    }}
                                />
                                <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>→</span>
                                <input
                                    type={isAllDate ? "text" : (toFocused ? "date" : "text")}
                                    className={styles['approval-page__filter-input']}
                                    style={{ minWidth: 140 }}
                                    value={isAllDate ? "" : (toFocused ? toInputDate(toDate) : displayDate(toDate))}
                                    placeholder={isAllDate ? "dd/MM/yyyy" : "dd/MM/yyyy"}
                                    disabled={isAllDate}
                                    onFocus={() => setToFocused(true)}
                                    onBlur={() => setToFocused(false)}
                                    onChange={(e) => {
                                        if (e.target.value) setToDate(fromInputDate(e.target.value));
                                    }}
                                />
                            </div>
                        </div>

                        {/* Request Type Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label className={styles['approval-page__filter-label']} style={{ marginBottom: 0 }}>Request Type</label>
                            <select 
                                className={styles['approval-page__filter-input']}
                                style={{ minWidth: 180 }}
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                {typeOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
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

                <button
                    className={styles['approval-page__filter-btn']}
                    onClick={() => setShowFilter(!showFilter)}
                    title="Filter requests"
                >
                    <Filter size={16} />
                    <span>Filter</span>
                    {showFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
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
                    {selectablePendingRequests.length > 0 && (
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
                        const tDescLow = String(req.requesttypecode || typeDescRaw).toLowerCase().replace(/\s+/g, '');
                        if (tDescLow === 'ferrychange') typeDesc = 'Ferry Change';
                        else if (tDescLow === 'ferryregistration' ) typeDesc = 'Ferry Registration';
                        else if (tDescLow === 'ferryusercomplaint' || tDescLow === 'usercomplaint') typeDesc = 'Ferry User Complaint';
                        else if (tDescLow === 'hrquery' || tDescLow === 'ferryhrquery') typeDesc = 'HR Query';

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
                                    const dStr = String(req.requesttypecode || req.requesttypedesc || '').toLowerCase();
                                    const isFerry = tStr.includes('ferry') || dStr.includes('ferry') ||
                                                    tStr.includes('hr complaint') || tStr.includes('hr query') || dStr.includes('hr complaint') || dStr.includes('hr query') ||
                                                    tStr.includes('hrquery') || dStr.includes('hrquery');
                                    if (isFerry) {
                                        navigate(`/ferry_approval/${req.syskey}`, { state: { item: req } });
                                    } else {
                                        navigate(`/approvals/${req.syskey}`, { state: { item: req } });
                                    }
                                }}
                            >
                                {/* Checkbox — hidden if the logged-in user already approved their step */}
                                {String(req.requeststatus) === '1' && !isAlreadyApprovedByMe(req) && (
                                    <div className={styles['checkbox-wrapper']} onClick={(e) => toggleSelect(String(req.syskey), e)}>
                                        <div className={`${styles['checkbox']} ${selectedKeys.has(String(req.syskey)) ? styles['checkbox--checked'] : ''}`}>
                                            {selectedKeys.has(String(req.syskey)) && <Check size={14} className={styles['checkbox-icon']} />}
                                        </div>
                                    </div>
                                )}

                                {/* Type icon */}
                                <div className={styles['approval-page__card-icon']} style={{ background: bg, color }}>
                                    <Icon size={18} />
                                </div>

                                {/* Body: name / meta / ticker */}
                                <div className={styles['approval-page__card-body']}>
                                    <div className={styles['approval-page__card-top']}>
                                        <span className={styles['approval-page__card-name']}>{reqName}</span>
                                        {typeDesc && (
                                            <span className={styles['approval-page__card-type']} style={{ color, background: bg }}>
                                                {typeDesc}{subTypeDesc ? ` · ${subTypeDesc}` : ''}
                                            </span>
                                        )}
                                    </div>

                                    <div className={styles['approval-page__card-meta']}>
                                        <Calendar size={10} className={styles['meta-icon']} />
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
                                                <Hash size={9} className={styles['meta-icon']} />
                                                <span>{req.eid}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* ── Ticker inside body ── */}
                                    {(() => {
                                        const steps: StepLevelData[] = (req as any).stepLevelData || [];
                                        if (!steps.length) return null;
                                        const getStepConfig = (status: number) => {
                                            switch (status) {
                                                case 2: return { cls: styles['step-pill--approved'], icon: styles['step-circle--approved'], Icon: Check,       label: 'Approved' };
                                                case 3: return { cls: styles['step-pill--rejected'], icon: styles['step-circle--rejected'], Icon: X,           label: 'Rejected' };
                                                case 1: return { cls: styles['step-pill--waiting'],  icon: styles['step-circle--waiting'],  Icon: Clock,        label: 'Waiting'  };
                                                default: return { cls: styles['step-pill--upcoming'], icon: styles['step-circle--upcoming'], Icon: ChevronRight, label: 'Upcoming' };
                                            }
                                        };
                                        return (
                                            <div className={styles['step-ticker']} onClick={(e) => e.stopPropagation()}>
                                                {steps.map((step, si) => {
                                                    const { cls, icon, Icon: StepIcon } = getStepConfig(step.status);
                                                    const isLast = si === steps.length - 1;
                                                    return (
                                                        <div key={si} className={styles['step-ticker__entry']}>
                                                            <div className={`${styles['step-pill']} ${cls}`}>
                                                                <div className={`${styles['step-circle']} ${icon}`}>
                                                                    <StepIcon size={7} />
                                                                </div>
                                                                <span className={styles['step-pill__name']}>
                                                                    {step.rankrole_specificperson || `Level ${step.level}`}
                                                                </span>
                                                            </div>
                                                            {!isLast && (
                                                                <div className={`${styles['step-ticker__arrow']} ${step.status === 2 ? styles['step-ticker__arrow--done'] : ''}`}>
                                                                    <ChevronRight size={10} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Right: status + ref */}
                                <div className={styles['approval-page__card-right']}>
                                    <StatusBadge status={req.requeststatus} />
                                    <span className={styles['approval-page__card-ref']}>#{i + 1}</span>
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
                        onClick={() => handleBulkAction('2')}
                        disabled={multiApproveMutation.isPending}
                    >
                        {multiApproveMutation.isPending ? <RotateCcw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve
                    </button>
                    <button
                        className={`${styles['bulk-btn']} ${styles['bulk-btn--reject']}`}
                        onClick={() => handleBulkAction('3')}
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
