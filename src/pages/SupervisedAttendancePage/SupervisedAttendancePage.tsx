import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQueryClient, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Clock,
    Activity,
    MapPin,
    LogIn,
    LogOut,
    CheckCircle2,
    Users,
    ChevronDown,
    Edit3,
    Eye,
    Loader2,
    Search
} from 'lucide-react';
import { Input, Select } from '../../components/ui';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import styles from './SupervisedAttendancePage.module.css';
import EditActivityModal from './EditActivityModal';

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

    // API-bound states that actually trigger the fetch
    const [apiFromDate, setApiFromDate] = useState<string>(format(new Date(), 'yyyyMMdd'));
    const [apiToDate, setApiToDate] = useState<string>(format(new Date(), 'yyyyMMdd'));
    const [apiSearchKey, setApiSearchKey] = useState<string>('');
    const [apiAttendanceType, setApiAttendanceType] = useState<string>('');
    const [apiPairStatus, setApiPairStatus] = useState<number>(2);

    const handleApplyFilters = () => {
        setApiFromDate(fromDate.replace(/-/g, ''));
        setApiToDate(toDate.replace(/-/g, ''));
        setApiSearchKey(searchKey);
        setApiAttendanceType(attendanceType);
        setApiPairStatus(pairStatus);
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

    const fetchAttendances = async ({ pageParam = 1 }) => {
        const res = await mainClient.post('api/checkin/supervised-attendance', {
            userid: userId,
            domain: domain,
            fromdate: apiFromDate,
            todate: apiToDate,
            searchkey: apiSearchKey,
            attendancetype: apiAttendanceType,
            pairstatus: apiPairStatus,
            page: pageParam,
            limit: 20
        });
        return res.data?.data ?? res.data ?? [];
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isFetching
    } = useInfiniteQuery({
        queryKey: ['supervised-attendance', apiFromDate, apiToDate, apiSearchKey, apiAttendanceType, apiPairStatus, userId, domain],
        queryFn: fetchAttendances,
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 20) return undefined;
            return allPages.length + 1;
        }
    });

    const records = useMemo(() => {
        if (!data) return [];
        return data.pages.flat() as SupervisedRecord[];
    }, [data]);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('supervisedAttendance.title', 'Attendance')}</h1>
                    <p className="page-header__subtitle">
                        {t('supervisedAttendance.subtitle', 'Shows attendance records for your direct reports and supervised members.')}
                    </p>
                </div>

                {isFetching &&
                    <div className={styles.filters}>
                        <Loader2 size={18} className={styles.spinIcon} />
                    </div>
                }
            </header>

            <div style={{ padding: '1rem', background: 'var(--color-neutral-0)', borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease-in-out' }}>
                <div style={{ minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>{t('supervisedAttendance.dateRange', 'Date Range')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <Input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>{t('supervisedAttendance.searchKeyword', 'Search Keyword')}</label>
                    <Input
                        placeholder={t('supervisedAttendance.searchPlaceholder', 'Employee name or details...')}
                        value={searchKey}
                        onChange={(e) => setSearchKey(e.target.value)}
                    />
                </div>
                <div style={{ minWidth: '160px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>{t('supervisedAttendance.attendanceType', 'Attendance Type')}</label>
                    <Select
                        id="att-type-select"
                        value={attendanceType}
                        onChange={(e) => setAttendanceType(e.target.value)}
                        options={[
                            { value: '', label: t('status.all', 'All') },
                            { value: '601', label: t('supervisedAttendance.timeIn', 'Time In') },
                            { value: '602', label: t('supervisedAttendance.timeOut', 'Time Out') },
                            { value: '603', label: t('supervisedAttendance.activity', 'Activity') },
                            { value: '604', label: t('supervisedAttendance.checkIn', 'Check In') }
                        ]}
                    />
                </div>
                <div style={{ minWidth: '160px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>{t('supervisedAttendance.pairStatus', 'Pair Status')}</label>
                    <Select
                        id="pair-status-select"
                        value={String(pairStatus)}
                        onChange={(e) => setPairStatus(Number(e.target.value))}
                        options={[
                            { value: '2', label: t('status.all', 'All') },
                            { value: '0', label: t('supervisedAttendance.new', 'New') },
                            { value: '1', label: t('supervisedAttendance.process', 'Process') }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'transparent', marginBottom: '6px', pointerEvents: 'none', userSelect: 'none' }}>Apply</label>
                    <button
                        onClick={handleApplyFilters}
                        title="Search"
                        style={{
                            background: 'var(--color-primary-600)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            width: '38px',
                            height: '38px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Search size={18} />
                    </button>
                </div>
            </div>

            {(isLoading || (isFetching && !isFetchingNextPage)) ? (
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
                                    <th className={styles.th}>{t('supervisedAttendance.employee', 'Employee')}</th>
                                    <th className={styles.th}>{t('supervisedAttendance.dateTime', 'Date & Time')}</th>
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
                                                    <span className={styles.employeeName}>{rec.employee_name}</span>
                                                    <span className={styles.employeeId}>ID: {rec.employee_id}</span>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.dateTimeCell}>
                                                    <span className={styles.recordTime}>{rec.time || '--:--'}</span>{', '}
                                                    <span className={styles.recordDate} style={{ color: 'var(--text-muted)' }}>
                                                        {rec.date ? format(new Date(rec.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')), 'MMM dd, yyyy') : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={`${styles.badge} ${meta.styleClass}`} style={{ display: 'inline-flex', width: 'auto' }}>
                                                    {meta.icon}
                                                    {meta.label}
                                                </div>
                                                {rec.backdateFlag && (
                                                    <div style={{ fontSize: 11, color: '#eab308', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <CheckCircle2 size={12} /> {t('supervisedAttendance.backdated', 'BACKDATED')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.locationCell}>
                                                    <div className={styles.cellIconRow}>
                                                        {rec.location ? <><MapPin size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--text-muted)' }} /> <span>{rec.location}</span></> : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.descCell}>
                                                    {rec.description || '-'}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.descCell}>
                                                    {rec.relationship || '-'}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <span className={`${styles.badge} ${rec.pair_status === 1 ? styles.type601 : styles.type604}`} style={{ display: 'inline-flex', width: 'auto' }}>
                                                    {rec.pair_status === 1 ? t('supervisedAttendance.process', 'Process') : t('supervisedAttendance.new', 'New')}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <button
                                                    onClick={() => setEditingRecord(rec)}
                                                    className={styles.tableActionBtn}
                                                    title={rec.pair_status === 1 ? t('supervisedAttendance.viewRecord', 'View Record') : t('supervisedAttendance.editRecord', 'Edit Record')}
                                                >
                                                    {rec.pair_status === 1 ? <Eye size={16} /> : <Edit3 size={16} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {hasNextPage && (
                        <div className={styles.loadMore}>
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className={styles.btnLoadMore}
                            >
                                {isFetchingNextPage ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load More')}
                                {!isFetchingNextPage && <ChevronDown size={18} />}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            <EditActivityModal
                syskey={editingRecord?.syskey || null}
                initialDate={editingRecord?.date}
                readOnly={editingRecord?.pair_status === 1}
                onClose={() => setEditingRecord(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['supervised-attendance'] });
                }}
            />
        </div>
    );
}
