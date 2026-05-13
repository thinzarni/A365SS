import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    Clock,
    Activity,
    ChevronLeft,
    ChevronRight,
    LogIn,
    LogOut,
    CheckCircle2,
    Users,
    Edit3,
    Eye,
    Loader2,
    Search,
    MapPin,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download,
    Plus,
    Upload
} from 'lucide-react';
import { Input, Select } from '../../components/ui';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import styles from './SupervisedAttendancePage.module.css';
import EditActivityModal from './EditActivityModal';
import SupervisedAttendanceImportModal from './SupervisedAttendanceImportModal';

/* ── Types ── */
interface SupervisedRecord {
    autokey: number;
    syskey: string;
    serverDate: string;
    serverTime: string;
    date: string;
    time: string;
    location: string;
    latitude: string;
    longitude: string;
    type: string;
    backdateFlag: boolean;
    description: string;
    clicktime: string;
    employee_syskey: string;
    employee_id: string;
    employee_name: string;
    pair_status: number;
    relationship: string;
}



export default function SupervisedAttendancePage() {
    const { t } = useTranslation();
    const { userId, domain } = useAuthStore();
    const queryClient = useQueryClient();

    const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [editingRecord, setEditingRecord] = useState<SupervisedRecord | null>(null);

    const [searchKey, setSearchKey] = useState<string>('');
    const [attendanceType, setAttendanceType] = useState<string>('');
    const [pairStatus, setPairStatus] = useState<number>(2);


    const [page, setPage] = useState<number>(1);
    const pageSize = 20;

    const [isCreateMode, setIsCreateMode] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // API-bound states that actually trigger the fetch
    const [apiFromDate, setApiFromDate] = useState<string>(format(new Date(), 'yyyyMMdd'));
    const [apiToDate, setApiToDate] = useState<string>(format(new Date(), 'yyyyMMdd'));
    const [apiSearchKey, setApiSearchKey] = useState<string>('');
    const [apiAttendanceType, setApiAttendanceType] = useState<string>('');
    const [apiPairStatus, setApiPairStatus] = useState<number>(2);
    const [apiOrderBy, setApiOrderBy] = useState<string>('date');
    const [apiOrderDir, setApiOrderDir] = useState<string>('DESC');

    const handleApplyFilters = () => {
        setApiFromDate(fromDate.replace(/-/g, ''));
        setApiToDate(toDate.replace(/-/g, ''));
        setApiSearchKey(searchKey);
        setApiAttendanceType(attendanceType);
        setApiPairStatus(pairStatus);
        setPage(1);
    };

    // Fetch setup types for binding labels
    const { data: attendanceTypesList } = useQuery({
        queryKey: ['setup-attendancetypes-list'],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/attendancetype`);
            return res.data?.datalist || [];
        }
    });

    const getAttTypeLabel = (rawType: any) => {
        const strVal = String(rawType || '').toLowerCase();
        const matched = attendanceTypesList?.find((t: any) => t.syskey === rawType || String(t.name) === strVal);
        let label = strVal;

        if (matched) {
            label = matched.description || matched.name;
        } else {
            if (strVal === '601') label = 'Time In';
            if (strVal === '602') label = 'Time Out';
            if (strVal === '603') label = 'Activity';
            if (strVal === '604') label = 'Check In';
        }

        const lowered = String(label).toLowerCase();
        if (lowered.includes('time in') || lowered.includes('timein')) {
            return { label: t('supervisedAttendance.timeIn', 'Time In'), styleClass: styles.type601, icon: <LogIn size={14} /> };
        }
        if (lowered.includes('time out') || lowered.includes('timeout')) {
            return { label: t('supervisedAttendance.timeOut', 'Time Out'), styleClass: styles.type602, icon: <LogOut size={14} /> };
        }
        if (lowered.includes('check in') || lowered.includes('checkin') || lowered.includes('check_in')) {
            return { label: t('supervisedAttendance.checkIn', 'Check In'), styleClass: styles.type604, icon: <CheckCircle2 size={14} /> };
        }
        if (lowered.includes('activity')) {
            return { label: t('supervisedAttendance.activity', 'Activity'), styleClass: styles.type603, icon: <Activity size={14} /> };
        }
        return { label: label || rawType || 'Record', styleClass: styles.typeDefault, icon: <Clock size={14} /> };
    };

    const fetchAttendances = async () => {
        const res = await mainClient.post('api/checkin/supervised-attendance', {
            userid: userId,
            domain: domain,
            fromdate: apiFromDate,
            todate: apiToDate,
            searchkey: apiSearchKey,
            attendancetype: apiAttendanceType,
            pairstatus: apiPairStatus,
            page: page,
            limit: pageSize,
            orderBy: apiOrderBy,
            order: apiOrderDir
        });
        return res.data?.data ?? res.data ?? [];
    };

    const {
        data: recordsData,
        isLoading,
        isFetching,
    } = useQuery({
        queryKey: ['supervised-attendance', apiFromDate, apiToDate, apiSearchKey, apiAttendanceType, apiPairStatus, apiOrderBy, apiOrderDir, userId, domain, page],
        queryFn: fetchAttendances
    });

    const records = useMemo(() => {
        if (!recordsData) return [];
        return recordsData as SupervisedRecord[];
    }, [recordsData]);

    const handleSort = (column: string) => {
        if (apiOrderBy === column) {
            setApiOrderDir(prev => prev === 'DESC' ? 'ASC' : 'DESC');
        } else {
            setApiOrderBy(column);
            setApiOrderDir('DESC');
        }
        setPage(1);
    };

    const renderSortIcon = (column: string) => {
        if (apiOrderBy !== column) return <ArrowUpDown size={14} style={{ marginLeft: 6, opacity: 0.3 }} />;
        return apiOrderDir === 'ASC' ? <ArrowUp size={14} style={{ marginLeft: 6 }} /> : <ArrowDown size={14} style={{ marginLeft: 6 }} />;
    };

    const hasNextPage = records.length === pageSize;

    const handleExport = () => {
        if (!records || records.length === 0) {
            toast.error(t('supervisedAttendance.noRecordsToExport', 'No records to export'));
            return;
        }

        try {
            const exportData = records.map(rec => {
                const meta = getAttTypeLabel(rec.type);
                return {
                    'Employee ID': rec.employee_id,
                    'Employee Name': rec.employee_name,
                    'Date': rec.date ? format(new Date(rec.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')), 'MMM dd, yyyy') : '-',
                    'Time': rec.time || '--:--',
                    'Type': meta.label,
                    'Backdated': rec.backdateFlag ? 'Yes' : 'No',
                    'Location': rec.location || '',
                    'Description': rec.description || '',
                    'User Type': rec.relationship || 'Self',
                    'Status': rec.pair_status === 1 ? 'Process' : 'New'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
            XLSX.writeFile(workbook, `Supervised_Attendance_${apiFromDate}_${apiToDate}.xlsx`);
            toast.success(t('supervisedAttendance.exportSuccess', 'Export completed successfully'));
        } catch (error) {
            console.error('Export failed:', error);
            toast.error(t('supervisedAttendance.exportFailed', 'Failed to export data'));
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('supervisedAttendance.title', 'Attendance')}</h1>
                    <p className="page-header__subtitle">
                        {t('supervisedAttendance.subtitle', 'Shows attendance records for self, your direct reports and supervised members.')}
                    </p>
                </div>

                {isFetching &&
                    <div className={styles.filters}>
                        <Loader2 size={18} className={styles.spinIcon} />
                    </div>
                }

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleExport}
                        className={styles.submitBtn}
                        title={t('supervisedAttendance.export', 'Export to Excel')}
                        style={{
                            padding: '0.5rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            borderRadius: '6px',
                            background: 'var(--color-neutral-100)',
                            color: 'var(--color-neutral-700)',
                            border: '1px solid var(--color-neutral-200)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '14px'
                        }}
                    >
                        <Download size={16} />
                        {t('supervisedAttendance.export', 'Export')}
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className={styles.submitBtn}
                        style={{
                            padding: '0.5rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            borderRadius: '6px',
                            background: 'var(--color-neutral-100)',
                            color: 'var(--color-neutral-700)',
                            border: '1px solid var(--color-neutral-200)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '14px'
                        }}
                    >
                        <Upload size={16} />
                        {t('supervisedAttendance.import', 'Import')}
                    </button>
                    <button
                        onClick={() => setIsCreateMode(true)}
                        className={styles.submitBtn}
                        style={{
                            padding: '0.5rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            borderRadius: '6px',
                            background: 'var(--color-primary-600)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '14px'
                        }}
                    >
                        <Plus size={16} />
                        {t('supervisedAttendance.new', 'New')}
                    </button>
                </div>
            </header>

            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-neutral-0)', borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease-in-out' }}>
                <div style={{ minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: '4px' }}>{t('supervisedAttendance.dateRange', 'Date Range')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            style={{ height: '32px', fontSize: '13px' }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
                        <Input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            style={{ height: '32px', fontSize: '13px' }}
                        />
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: '4px' }}>{t('supervisedAttendance.searchKeyword', 'Search Keyword')}</label>
                    <Input
                        placeholder={t('supervisedAttendance.searchPlaceholder', 'Employee name or details...')}
                        value={searchKey}
                        onChange={(e) => setSearchKey(e.target.value)}
                        style={{ height: '32px', fontSize: '13px' }}
                    />
                </div>
                <div style={{ minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: '4px' }}>{t('supervisedAttendance.attendanceType', 'Type')}</label>
                    <Select
                        id="att-type-select"
                        value={attendanceType}
                        onChange={(e) => setAttendanceType(e.target.value)}
                        style={{ height: '32px', fontSize: '13px' }}
                        options={[
                            { value: '', label: t('status.all', 'All') },
                            { value: '601', label: t('supervisedAttendance.timeIn', 'Time In') },
                            { value: '602', label: t('supervisedAttendance.timeOut', 'Time Out') },
                            { value: '603', label: t('supervisedAttendance.activity', 'Activity') },
                            { value: '604', label: t('supervisedAttendance.checkIn', 'Check In') }
                        ]}
                    />
                </div>
                <div style={{ minWidth: '140px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-neutral-500)', marginBottom: '4px' }}>{t('supervisedAttendance.pairStatus', 'Status')}</label>
                    <Select
                        id="pair-status-select"
                        value={String(pairStatus)}
                        onChange={(e) => setPairStatus(Number(e.target.value))}
                        style={{ height: '32px', fontSize: '13px' }}
                        options={[
                            { value: '2', label: t('status.all', 'All') },
                            { value: '0', label: t('supervisedAttendance.new', 'New') },
                            { value: '1', label: t('supervisedAttendance.process', 'Process') }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'transparent', marginBottom: '4px', pointerEvents: 'none', userSelect: 'none' }}>Apply</label>
                    <button
                        onClick={handleApplyFilters}
                        title="Search"
                        style={{
                            background: 'var(--color-primary-600)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Search size={16} />
                    </button>
                </div>
            </div>

            {(isLoading || isFetching) ? (
                <div className={styles.skeletonTable}>
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className={styles.skeletonRow} />)}
                </div>
            ) : records.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrapper}>
                        <Users size={32} />
                    </div>
                    <h3>{t('supervisedAttendance.noRecords', 'No Records Found')}</h3>
                    <p>{t('supervisedAttendance.noRecordsDesc', 'No team members have recorded attendance or activities on this date.')}</p>
                </div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('eid')}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {'ID'}
                                            {renderSortIcon('eid')}
                                        </div>
                                    </th>
                                    <th className={styles.th} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {t('supervisedAttendance.employee', 'Employee')}
                                            {renderSortIcon('name')}
                                        </div>
                                    </th>
                                    <th className={styles.th} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {t('supervisedAttendance.dateTime', 'Date & Time')}
                                            {renderSortIcon('date')}
                                        </div>
                                    </th>
                                    <th className={styles.th}>{t('supervisedAttendance.type', 'Type')}</th>
                                    <th className={styles.th}>{t('supervisedAttendance.location', 'Location')}</th>
                                    <th className={styles.th}>{t('supervisedAttendance.description', 'Description')}</th>
                                    <th className={styles.th}>{t('supervisedAttendance.userType', 'User Type')}</th>
                                    <th className={styles.th}>{t('request.status', 'Status')}</th>
                                    <th className={styles.th}>{t('common.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((rec) => {
                                    const meta = getAttTypeLabel(rec.type);
                                    return (
                                        <tr key={rec.syskey || Math.random().toString()} className={styles.tr}>
                                            <td className={styles.td}>
                                                <div className={styles.employeeCell}>
                                                    <span className={styles.employeeId}>{rec.employee_id}</span>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.employeeCell}>
                                                    <span style={{ fontWeight: 500 }}>{rec.employee_name}</span>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.dateTimeCell}>
                                                    <span className={styles.recordTime}>{rec.time || '--:--'}</span>
                                                    <span className={styles.recordDate}>
                                                        {rec.date ? format(new Date(rec.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')), 'MMM dd, yyyy') : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.badgeWrapper}>
                                                    <div className={`${styles.badge} ${meta.styleClass}`}>
                                                        {meta.icon}
                                                        {meta.label}
                                                    </div>
                                                    {rec.backdateFlag && (
                                                        <div className={styles.backdateBadge}>
                                                            <CheckCircle2 size={10} /> {t('supervisedAttendance.backdated', 'BACKDATED')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.locationCell}>
                                                    <div className={styles.cellIconRow} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '0.7rem' }}>
                                                        {rec.location ? <><MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--text-muted)' }} /> <span style={{ color: 'var(--text-muted)' }}>{rec.location}</span></> : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.descCell} title={rec.description}>
                                                    {rec.description || '-'}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.descCell}>
                                                    {rec.relationship || 'Self'}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <span className={`${styles.badge} ${rec.pair_status === 1 ? styles.type601 : styles.type604}`}>
                                                    {rec.pair_status === 1 ? t('supervisedAttendance.process', 'Process') : t('supervisedAttendance.new', 'New')}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <button
                                                    onClick={() => setEditingRecord(rec)}
                                                    className={styles.tableActionBtn}
                                                    title={rec.pair_status === 1 ? t('supervisedAttendance.viewRecord', 'View Record') : t('supervisedAttendance.editRecord', 'Edit Record')}
                                                >
                                                    {rec.pair_status === 1 ? <Eye size={14} /> : <Edit3 size={14} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            {t('common.page', 'Page')} {page}
                        </div>
                        <div className={styles.pageControls}>
                            <button
                                className={styles.pageBtn}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={16} />
                                {t('common.prev', 'Prev')}
                            </button>
                            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
                                {page}
                            </button>
                            <button
                                className={styles.pageBtn}
                                onClick={() => setPage(p => p + 1)}
                                disabled={!hasNextPage}
                            >
                                {t('common.next', 'Next')}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Create/Edit Modal */}
            {(editingRecord || isCreateMode) && (
                <EditActivityModal
                    syskey={editingRecord?.syskey || null}
                    initialDate={editingRecord?.date || format(new Date(), 'yyyy-MM-dd')}
                    readOnly={editingRecord?.pair_status === 1}
                    onClose={() => {
                        setEditingRecord(null);
                        setIsCreateMode(false);
                    }}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['supervised-attendance'] });
                    }}
                />
            )}

            <SupervisedAttendanceImportModal
                open={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['supervised-attendance'] });
                }}
            />
        </div>
    );
}
