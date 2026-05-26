import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
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
    Loader2,
    FileSpreadsheet,
    ArrowDown,
    ArrowUp,
} from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
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
import { useAuthStore } from '../../stores/auth-store';
import AttendanceImportModal from '../AttendanceRequestPage/AttendanceImportModal';
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
    if (lower.includes('attendance') || lower.includes('time in') || lower.includes('time out')) return 'attendance';
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
        case 'attendance': return Clock;
        default: return FileText;
    }
}

export default function RequestListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Detect subtype view
    const pathTypeCfg = PATH_TYPE_MAP[location.pathname] ?? null;
    const isSubtypeView = pathTypeCfg !== null;
    const isAttendancePage = location.pathname === '/attendancerequest';

    const { userId, domain } = useAuthStore();

    const [activeStatus, setActiveStatus] = useState<RequestStatus>(RequestStatus.Pending);
    const [fromDate, setFromDate] = useState<string>(dateToInput(DEFAULT_FROM_DATE));
    const [toDate, setToDate] = useState<string>(dateToInput(DEFAULT_TO_DATE));
    const [requestType, setRequestType] = useState<string>('');
    const [attType] = useState(''); // Fetch all attendance types by default
    const [didInitDates, setDidInitDates] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [sortColumn, setSortColumn] = useState<'date' | 'time'>('date');

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
        const options: { value: string, label: string }[] = [];
        const seenLabels = new Set<string>();
        const seenValues = new Set<string>();

        requestTypes.forEach(t => {
            const label = t.description || '';
            const value = t.syskey || '';

            if (label && value && !seenLabels.has(label) && !seenValues.has(value)) {
                seenLabels.add(label);
                seenValues.add(value);
                options.push({ value, label });
            }
        });

        return options;
    }, [requestTypes]);

    const { data: allRequests = [], isLoading: requestsLoading } = useQuery<RequestModel[]>({
        queryKey: ['requests', fromDate, toDate, requestType, attType, location.pathname, activeStatus],
        queryFn: async () => {
            if (isAttendancePage) {
                const reqStatus = activeStatus === RequestStatus.All ? '' : String(activeStatus);
                const res = await mainClient.post(GET_ATTENDANCE_REQ_LIST, {
                    userid: userId || '',
                    domain: domain || 'dev',
                    fromdate: fromDate.replace(/-/g, ''),
                    todate: toDate.replace(/-/g, ''),
                    status: reqStatus,
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
                    type: item.type,
                    atttype: item.atttype || item.attendancerequesttype,
                    requesttype: item.atttype || item.type,
                    requesttypedesc: item.type === '602' ? 'Time Out' : 'Time In',
                    requeststatus: String(item.status || '1'),
                    requestsubtypedesc: item.time || `${item.intime || ''}${item.intime && item.outtime ? ' - ' : ''}${item.outtime || ''}`,
                    intime: item.intime,
                    outtime: item.outtime,
                    remark: item.description,
                    description: item.description,
                    location: item.location,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    processstatus: item.processstatus || item.claimProcessStatus || '',
                    attendancereason: item.attendancereason,
                }));
            }

            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: fromDate.replace(/-/g, ''),
                todate: toDate.replace(/-/g, ''),
                type: isSubtypeView ? '' : requestType,
                status: activeStatus === RequestStatus.All ? "0" : String(activeStatus),
            });
            const datalist: any[] = res.data?.datalist || res.data?.data || [];
            const all: RequestModel[] = datalist.map(item => ({
                ...item,
                eid: item.employeeid || item.employee_id || item.eid || '',
            }));
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
        // Sort by date and time
        return [...allRequests].sort((a, b) => {
            const orderFactor = sortOrder === 'desc' ? 1 : -1;

            const dateA = a.date || a.startdate || (a as any).createddate || '';
            const dateB = b.date || b.startdate || (b as any).createddate || '';

            const timeA = (a as any).intime || (a as any).outtime || a.starttime || a.time || (a as any).createdtime || '';
            const timeB = (b as any).intime || (b as any).outtime || b.starttime || b.time || (b as any).createdtime || '';

            const typeA = String((a as any).requesttype || '');
            const typeB = String((b as any).requesttype || '');

            const parseTime = (t: string) => {
                if (!t) return 0;
                const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (!match) return 0;
                let [, h, m, ampm] = match;
                let hours = parseInt(h, 10);
                if (ampm) {
                    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }
                return hours * 60 + parseInt(m, 10);
            };

            const tA = parseTime(timeA);
            const tB = parseTime(timeB);

            if (sortColumn === 'time') {
                if (tA !== tB) return (tB - tA) * orderFactor;
                if (dateA !== dateB) return dateB.localeCompare(dateA) * orderFactor;
                return typeB.localeCompare(typeA) * orderFactor;
            } else {
                if (dateA !== dateB) return dateB.localeCompare(dateA) * orderFactor;
                if (typeA !== typeB) return typeB.localeCompare(typeA) * orderFactor;
                return (tB - tA) * orderFactor;
            }
        });
    }, [allRequests, sortOrder, sortColumn]);

    const isLoading = shiftLoading || !didInitDates || requestsLoading;

    // Summary stats
    const { data: generalSummaryData = [] } = useQuery<RequestModel[]>({
        queryKey: ['summaryRequests', fromDate, toDate, requestType, attType, location.pathname],
        queryFn: async () => {
            if (isAttendancePage) {
                const res = await mainClient.post(GET_ATTENDANCE_REQ_LIST, {
                    userid: userId || '',
                    domain: domain || 'dev',
                    fromdate: fromDate.replace(/-/g, ''),
                    todate: toDate.replace(/-/g, ''),
                    status: '', // Fetch all for steady summary counts
                    type: attType,
                });
                const list = res.data?.data || res.data?.datalist || [];
                return list.map((item: any) => ({
                    requeststatus: String(item.status || '1'),
                }));
            }

            const res = await apiClient.post(GET_REQUEST_LIST, {
                fromdate: fromDate.replace(/-/g, ''),
                todate: toDate.replace(/-/g, ''),
                type: isSubtypeView ? '' : requestType,
                status: "0", // All statuses
            });
            const datalist: any[] = res.data?.datalist || res.data?.data || [];
            const all: RequestModel[] = datalist.map(item => ({
                ...item,
                eid: item.employeeid || item.employee_id || item.eid || '',
            }));
            if (pathTypeCfg) {
                return all.filter(r => {
                    const desc = ((r as any).requesttypedesc || (r as any).requesttype || '').toLowerCase();
                    return desc.includes(pathTypeCfg.filter);
                });
            }
            return all;
        },
        enabled: didInitDates,
        staleTime: 30 * 1000,
    });

    const stats = useMemo(() => {
        const sourceData = generalSummaryData;
        const total = sourceData.length;
        const pending = sourceData.filter(r => String(r.requeststatus) === '1').length;
        const approved = sourceData.filter(r => String(r.requeststatus) === '2').length;
        const rejected = sourceData.filter(r => String(r.requeststatus) === '3').length;
        return { total, pending, approved, rejected };
    }, [generalSummaryData]);

    const handleExport = async () => {
        if (displayRequests.length === 0) {
            toast.error('No data to export');
            return;
        }

        try {
            setExporting(true);

            // Map data to Excel format
            const exportData = (displayRequests as any[]).map((req, idx) => {
                let statusText = '—';
                const st = String(req.requeststatus);
                if (st === '1') statusText = 'Pending';
                else if (st === '2') statusText = 'Approved';
                else if (st === '3') statusText = 'Rejected';
                else if (st === '4') statusText = 'Draft';

                const typeDesc = req.requesttypedesc || req.requesttype || '—';

                let details = '—';
                const typeStr = typeDesc.toLowerCase();
                if (typeStr.includes('early out') || typeStr.includes('late')) {
                    details = typeDesc; // Just show 'Early Out' or 'Late'
                } else if (req.requestsubtypedesc) {
                    details = req.requestsubtypedesc;
                } else if (req.duration != null && req.duration !== '') {
                    details = `${req.duration} day(s)`;
                } else if (req.amount) {
                    details = `${Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                }

                const exportObj: any = {
                    'Employee ID': req.eid || '—',
                    'Employee Name': req.name || '—',
                    'Ref #': `#${idx + 1}`,
                    'Date': displayDate(req.startdate || req.date) || '—',
                    'Type': typeDesc,
                };

                if (isAttendancePage) {
                    exportObj['Time'] = details;
                } else {
                    exportObj['Details'] = details;
                }
                exportObj['Status'] = statusText;

                return exportObj;
            });

            // SheetJS logic
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, isAttendancePage ? 'Attendance Requests' : 'Requests');

            // Set column widths
            const wscols = [
                { wch: 15 }, // Employee ID
                { wch: 20 }, // Employee Name
                { wch: 10 }, // Ref #
                { wch: 25 }, // Date
                { wch: 20 }, // Type
                { wch: 20 }, // Details
                { wch: 12 }, // Status
            ];
            worksheet['!cols'] = wscols;

            const filenamePrefix = isAttendancePage ? 'Attendance_Requests' : 'Requests';
            XLSX.writeFile(workbook, `${filenamePrefix}_${fromDate.replace(/-/g, '')}_to_${toDate.replace(/-/g, '')}.xlsx`);
            toast.success('Excel file exported successfully');
        } catch (err) {
            console.error('Frontend export failed:', err);
            toast.error('An error occurred during export');
        } finally {
            setExporting(false);
        }
    };


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
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* {isAttendancePage && (
                            <Button
                                onClick={() => setImportModalOpen(true)}
                                variant="ghost"
                                style={{ background: 'var(--color-neutral-0)', border: '1px solid var(--color-neutral-300)' }}
                            >
                                <Download size={16} />
                                Import / Export
                            </Button>
                        )} */}
                        <Button onClick={() => navigate(isSubtypeView ? pathTypeCfg!.newPath : '/requests/new')}>
                            <Plus size={16} />
                            {t('request.newRequest')}
                        </Button>
                    </div>
                </div>
            </div>

            {isAttendancePage && (
                <AttendanceImportModal
                    open={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['requests'] });
                    }}
                />
            )}

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

                    {isAttendancePage && (
                        <div className={styles['filter-group']} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                loading={exporting}
                                onClick={() => setShowExportConfirm(true)}
                                style={{ border: '1px solid var(--color-neutral-200)', height: '42px' }}
                            >
                                {exporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                                Export Excel
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Requests table ── */}
            <div className={styles['requests-list-card']}>
                <div className={styles['requests-list-card__header']}>
                    <h3 className={styles['requests-list-card__title']}>
                        {isSubtypeView ? `${pathTypeCfg!.label.replace(/ Request$/i, '')} Requests` : 'All Requests'}
                    </h3>
                    <div className={styles['requests-list-card__actions']}>
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
                        <Button onClick={() => navigate(isSubtypeView ? pathTypeCfg!.newPath : '/requests/new')} style={{ marginTop: '0.5rem' }}>
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
                                    <th
                                        onClick={() => {
                                            if (sortColumn === 'date') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                                            else { setSortColumn('date'); setSortOrder('desc'); }
                                        }}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by Date"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Date
                                            {sortColumn === 'date' ? (
                                                sortOrder === 'desc' ? <ArrowDown size={14} color="var(--color-primary-600, #4f46e5)" /> : <ArrowUp size={14} color="var(--color-primary-600, #4f46e5)" />
                                            ) : (
                                                <ArrowDown size={14} color="var(--color-neutral-300, #d1d5db)" />
                                            )}
                                        </div>
                                    </th>
                                    <th>Type</th>
                                    <th
                                        onClick={() => {
                                            if (sortColumn === 'time') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                                            else { setSortColumn('time'); setSortOrder('desc'); }
                                        }}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by Time"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {isAttendancePage ? 'Time' : 'Details'}
                                            {sortColumn === 'time' ? (
                                                sortOrder === 'desc' ? <ArrowDown size={14} color="var(--color-primary-600, #4f46e5)" /> : <ArrowUp size={14} color="var(--color-primary-600, #4f46e5)" />
                                            ) : (
                                                <ArrowDown size={14} color="var(--color-neutral-300, #d1d5db)" />
                                            )}
                                        </div>
                                    </th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(displayRequests as any[]).map((req, i) => {
                                    const typeDesc = req.requesttypedesc || req.requesttype || '';
                                    const variant = getTypeVariant(typeDesc);
                                    const Icon = getTypeIcon(variant);
                                    return (
                                        <tr key={req.syskey || i} onClick={() => {
                                            if (isAttendancePage) {
                                                navigate(`/attendancerequest/${req.syskey}`, { state: { item: req, refIndex: i + 1 } });
                                            } else {
                                                navigate(`/requests/${req.syskey}`);
                                            }
                                        }}>
                                            <td>{req.eid || '—'}</td>
                                            <td>{req.name || '—'}</td>
                                            <td>{`#${i + 1}`}</td>
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

            <ConfirmModal
                open={showExportConfirm}
                onClose={() => setShowExportConfirm(false)}
                onConfirm={() => {
                    handleExport();
                    setShowExportConfirm(false);
                }}
                title="Export Excel"
                message="Are you sure you want to export these requests to an Excel file?"
                confirmLabel="Export Excel"
                loading={exporting}
                variant="primary"
                icon={<FileSpreadsheet size={28} />}
            />
        </div>
    );
}
