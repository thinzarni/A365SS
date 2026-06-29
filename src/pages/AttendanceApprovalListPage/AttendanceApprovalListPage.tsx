import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Filter,
    ChevronDown,
    ChevronUp,
    FileText,
    Users,
    CheckCircle2,
    Circle,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { Input } from '../../components/ui';
import { RequestStatus } from '../../types/models';
import type { RequestModel } from '../../types/models';
import mainClient from '../../lib/main-client';
import {
    ATTENDANCE_SHIFT_DATA,
    GET_ATTENDANCE_APPROVAL_LIST,
} from '../../config/api-routes';
import { useAuthStore } from '../../stores/auth-store';
import styles from './AttendanceApprovalListPage.module.css';
import reqStyles from '../RequestListPage/RequestListPage.module.css';

/* ── Date helpers ── */
function formatYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

function displayDate(raw?: string): string {
    if (!raw || raw.length < 8) return raw || '';
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

function toInputDate(yyyymmdd: string): string {
    if (!yyyymmdd || yyyymmdd.length < 8) return '';
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

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

export default function AttendanceApprovalListPage() {
    const navigate = useNavigate();
    const [activeStatus, setActiveStatus] = useState<RequestStatus>(RequestStatus.All);
    const [showFilter, setShowFilter] = useState(false);
    const [fromDate, setFromDate] = useState(defaultFromDate);
    const [toDate, setToDate] = useState(defaultToDate);
    const [isAllDate, setIsAllDate] = useState(true);
    const [didInitDates, setDidInitDates] = useState(false);
    const [fromFocused, setFromFocused] = useState(false);
    const [toFocused, setToFocused] = useState(false);
    const [attType, setAttType] = useState('2'); // Default to Backdate as per screenshot
    const { userId, domain } = useAuthStore();

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
        queryKey: ['attendance-approvals', fromDate, toDate, isAllDate, attType, activeStatus],
        queryFn: async () => {
            const res = await mainClient.post(GET_ATTENDANCE_APPROVAL_LIST, {
                fromdate: isAllDate ? "" : fromDate,
                todate: isAllDate ? "" : toDate,
                type: attType,
                status: activeStatus === RequestStatus.All ? '' : String(activeStatus),
                userid: userId,
                domain: domain,
            });
            const list = res.data?.data || res.data?.datalist || (Array.isArray(res.data) ? res.data : []);
            return list.map((item: any, idx: number) => {
                const itemType = String(item.requesttype ?? attType);
                return {
                    syskey: item.syskey,
                    eid: item.employee_id,
                    name: item.name,
                    refno: idx + 1,
                    date: item.date,
                    startdate: item.date,
                    requesttype: itemType,
                    requesttypedesc: item.approvetype
                        ? String(item.approvetype)
                            .replace(/\bTimein\b/gi, 'Time In')
                            .replace(/\bTimeout\b/gi, 'Time Out')
                        : (itemType === '1' ? 'Remote' : 'Backdate'),
                    requeststatus: (() => {
                        const s = String(item.status ?? '');
                        if (s === '2') return '2';
                        if (s === '3') return '3';
                        return '1';
                    })() as any,
                    requestsubtypedesc: item.time || '',
                    remark: item.description,
                    location: item.location,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    attendancereason: item.attendancereason,
                    attendancereasontype: item.attendancereason,
                    time: item.time,
                };
            });
        },
        enabled: didInitDates,
        staleTime: 0,
        refetchOnMount: true,
    });

    const isLoading = shiftLoading || !didInitDates || approvalsLoading;

    return (
        <div className={styles['page']}>
            {/* Header */}
            <div className={styles['header']}>
                <div className={styles['title-section']}>
                    <h1>Approvals</h1>
                    <div className={styles['subtitle']}>
                        {allApprovals.length} {allApprovals.length === 1 ? 'approval' : 'approvals'}
                    </div>
                </div>
                <button
                    className={styles['filter-btn']}
                    onClick={() => setShowFilter(!showFilter)}
                >
                    <Filter size={16} />
                    <span>Filter</span>
                    {showFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {showFilter && (
                <div className={reqStyles['filters-row']}>
                    <div className={reqStyles['filter-group']}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <label className={reqStyles['filter-label']} style={{ marginBottom: 0 }}>Date Range</label>
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
                        <div className={reqStyles['filter-inputs']}>
                            <Input
                                type={isAllDate ? "text" : (fromFocused ? "date" : "text")}
                                value={isAllDate ? "" : (fromFocused ? toInputDate(fromDate) : displayDate(fromDate))}
                                placeholder={isAllDate ? "dd/MM/yyyy" : "dd/MM/yyyy"}
                                onChange={(e: any) => {
                                    if (e.target.value) setFromDate(fromInputDate(e.target.value));
                                }}
                                onFocus={() => setFromFocused(true)}
                                onBlur={() => setFromFocused(false)}
                                disabled={isAllDate}
                                className={reqStyles['filter-date']}
                            />
                            <span className={reqStyles['filter-separator']}>→</span>
                            <Input
                                type={isAllDate ? "text" : (toFocused ? "date" : "text")}
                                value={isAllDate ? "" : (toFocused ? toInputDate(toDate) : displayDate(toDate))}
                                placeholder={isAllDate ? "dd/MM/yyyy" : "dd/MM/yyyy"}
                                onChange={(e: any) => {
                                    if (e.target.value) setToDate(fromInputDate(e.target.value));
                                }}
                                onFocus={() => setToFocused(true)}
                                onBlur={() => setToFocused(false)}
                                disabled={isAllDate}
                                className={reqStyles['filter-date']}
                            />
                        </div>
                    </div>


                </div>
            )}

            {/* Tabs Row */}
            <div className={styles['controls-row']}>
                <div className={styles['status-tabs']}>
                    {[
                        { key: RequestStatus.All, label: 'All' },
                        { key: RequestStatus.Pending, label: 'Pending' },
                        { key: RequestStatus.Approved, label: 'Approved' },
                        { key: RequestStatus.Rejected, label: 'Rejected' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`${styles['tab']} ${activeStatus === key ? styles['tab--active'] : ''}`}
                            onClick={() => setActiveStatus(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className={reqStyles['requests-att-types']}>
                    {([['1', 'Remote'], ['2', 'Backdate']] as const).map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setAttType(val)}
                            className={`${reqStyles['requests-att-type-btn']} ${attType === val ? reqStyles['requests-att-type-btn--active'] : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Container */}
            <div className={styles['list-container']}>
                {isLoading ? (
                    <div className={styles['loading']}>
                        {[...Array(3)].map((_, i) => <div key={i} className={styles['skeleton-card']} />)}
                    </div>
                ) : allApprovals.length === 0 ? (
                    <div className={styles['empty']}>
                        <FileText size={48} />
                        <h3>No attendance requests at this time</h3>
                        <p>All pending approvals have been cleared.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles['list']}>
                            {allApprovals.map((req, i) => (
                                <div
                                    key={req.syskey || i}
                                    className={styles['card']}
                                    onClick={() => navigate(`/attendanceapproval/${req.syskey}/${req.requesttype}`, { state: { item: req } })}
                                >
                                    <div className={styles['icon-box']}>
                                        <FileText size={20} />
                                    </div>
                                    <div className={styles['card-content']}>
                                        <div className={styles['card-top']}>
                                            <span className={styles['emp-name']}>{req.name || req.eid}</span>
                                            <span className={styles['type-info']}>
                                                {req.requesttypedesc} · {req.time}
                                            </span>
                                        </div>
                                        <div className={styles['card-meta']}>
                                            {displayDate(req.date)} · {req.eid}
                                        </div>
                                    </div>
                                    <div className={styles['card-right']}>
                                        <StatusBadge status={req.requeststatus} />
                                        <span className={styles['ref-no']}>#{i + 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles['footer']}>
                            <Users size={14} />
                            <span>{allApprovals.length} total</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
