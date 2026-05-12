import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, Search, RefreshCw, Plus, Upload, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mainClient from '../../lib/main-client';
import { SUPERVISE_WORKPOLICY_LIST } from '../../config/api-routes';
import styles from './WorkPolicyChangePage.module.css';
import ShiftCalendarModal from './ShiftCalendarModal';
import WorkPolicyImportModal from './WorkPolicyImportModal';
import WorkPolicyExportModal from './WorkPolicyExportModal';

// ── Types ──────────────────────────────────────────────────────────────────
interface WorkPolicyRow {
    rownum: string;
    syskey: string;           // workpolicyheader syskey
    refno: number;
    code: string;
    description: string;
    workpolicy: string | null;
    startdate: string;
    enddate: string;
    roster: string | null;
    calendar: string | null;
    type: string | null;
    employee: string;
    // employee fields
    name: string;
    eid: string;
    employee_syskey: string;
    rank?: string;
    relationship?: string;
    position?: string;
}

interface PolicyGroup {
    syskey: string;
    refno?: string | number;
    code: string;
    description: string;
    workpolicy: string | null;
    startdate: string;
    enddate: string;
    roster: string | null;
    calendar: string | null;
    employees: WorkPolicyRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDisplayDate(yyyymmdd: string): string {
    if (!yyyymmdd || yyyymmdd.length < 8) return '—';
    const y = yyyymmdd.slice(0, 4);
    const m = yyyymmdd.slice(4, 6);
    const d = yyyymmdd.slice(6, 8);
    return `${d}/${m}/${y}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function WorkPolicyChangePage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchval, setSearchval] = useState('');
    const [viewMode, setViewMode] = useState<'policy' | 'employee'>('policy');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    // const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<WorkPolicyRow | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // ── Fetch workpolicy list ──
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['supervisedWorkpolicy', searchval],
        queryFn: async () => {
            const res = await mainClient.post(SUPERVISE_WORKPOLICY_LIST, {
                order: 'code',
                orderType: 'asc',
                searchval,
                pagesize: 200,
                currentpage: 1,
                searchArray: [],
                paycompany: '',
                type: 2,
                roster_calendar_type: '',
            });
            return (res.data?.data?.datalist ?? res.data?.datalist ?? []) as WorkPolicyRow[];
        },
        staleTime: 30_000,
    });

    // ── Group by syskey (header) ──
    const groups = useMemo<PolicyGroup[]>(() => {
        if (!data) return [];
        const map = new Map<string, PolicyGroup>();
        for (const row of data) {
            if (!map.has(row.syskey)) {
                map.set(row.syskey, {
                    syskey: row.syskey,
                    refno: row.refno,
                    code: row.code,
                    description: row.description,
                    workpolicy: row.workpolicy,
                    startdate: row.startdate,
                    enddate: row.enddate,
                    roster: row.roster,
                    calendar: row.calendar,
                    employees: [],
                });
            }
            map.get(row.syskey)!.employees.push(row);
        }
        return Array.from(map.values());
    }, [data]);

    const paginatedData = useMemo(() => {
        if (!data) return [];
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    }, [data, currentPage]);
    const totalPages = Math.max(1, Math.ceil((data?.length || 0) / pageSize));

    if (isLoading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>{t('workPolicy.loadingList')}</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>
                        <CalendarRange size={22} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('workPolicy.listTitle')}</h1>
                        <p className={styles.subtitle}>
                            {t('workPolicy.listSubtitle')}
                        </p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => navigate('/employeeworkpolicy/new')}
                        title={t('workPolicy.new')}
                        style={{ padding: '8px 16px', background: 'var(--color-primary-600, #4f46e5)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                    >
                        <Plus size={16} style={{ marginRight: '6px' }} /> {t('workPolicy.new')}
                    </button>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => setIsImportModalOpen(true)}
                        title={t('workPolicy.importBtn')}
                        style={{ padding: '8px 16px', background: '#fff', color: 'var(--color-neutral-700, #374151)', border: '1px solid var(--color-neutral-300, #d1d5db)', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                    >
                        <Upload size={16} style={{ marginRight: '6px' }} /> {t('workPolicy.importBtn')}
                    </button>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => setIsExportModalOpen(true)}
                        title="Export"
                        style={{ padding: '8px 16px', background: '#fff', color: 'var(--color-neutral-700, #374151)', border: '1px solid var(--color-neutral-300, #d1d5db)', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                    >
                        <Download size={16} style={{ marginRight: '6px' }} /> Export
                    </button>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => refetch()}
                        disabled={isFetching}
                        title="Refresh"
                    >
                        <RefreshCw size={15} className={isFetching ? styles.spinning : ''} />
                    </button>
                </div>
            </div>

            {/* ── Search bar ── */}
            <div className={styles.searchBar}>
                <Search size={15} className={styles.searchIcon} />
                <input
                    className={styles.searchInput}
                    placeholder={t('workPolicy.searchPlaceholder')}
                    value={searchval}
                    onChange={e => setSearchval(e.target.value)}
                />
            </div>

            {/* ── View Toggle ── */}
            <div className={styles.viewToggle}>
                <label className={styles.radioLabel}>
                    <input
                        type="radio"
                        name="viewMode"
                        checked={viewMode === 'policy'}
                        onChange={() => setViewMode('policy')}
                    />
                    {t('workPolicy.viewByPolicy')}
                </label>
                <label className={styles.radioLabel}>
                    <input
                        type="radio"
                        name="viewMode"
                        checked={viewMode === 'employee'}
                        onChange={() => setViewMode('employee')}
                    />
                    {t('workPolicy.viewByEmployee')}
                </label>
            </div>



            {/* ── Content ── */}
            {viewMode === 'policy' ? (
                <div className={styles.policyTableContainer}>
                    <table className={styles.policyTable}>
                        <thead>
                            <tr>
                                <th>{t('workPolicy.refNo')}</th>
                                <th>{t('workPolicy.code')}</th>
                                <th>{t('workPolicy.description')}</th>
                                <th>{t('workPolicy.workPolicy')}</th>
                                <th>{t('workPolicy.startDate')}</th>
                                <th>{t('workPolicy.endDate')}</th>
                                <th>{t('workPolicy.roster')}</th>
                                <th>{t('workPolicy.calendar')}</th>
                                <th>{t('workPolicy.employee')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(group => (
                                <tr key={group.syskey} onClick={() => navigate(`/employeeworkpolicy/edit/${group.syskey}`)}>
                                    <td>{group.refno || '-'}</td>
                                    <td>{group.code}</td>
                                    <td>{group.description}</td>
                                    <td>{group.workpolicy || '-'}</td>
                                    <td>{formatDisplayDate(group.startdate)}</td>
                                    <td>{formatDisplayDate(group.enddate)}</td>
                                    <td>{group.roster || '-'}</td>
                                    <td>{group.calendar || '-'}</td>
                                    <td>{group.employees.length}</td>
                                </tr>
                            ))}
                            {groups.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                                        {t('workPolicy.noData')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.policyTableContainer}>
                    <table className={styles.policyTable}>
                        <thead>
                            <tr>
                                <th>{t('workPolicy.employee')}</th>
                                <th>{t('workPolicy.rank')}</th>
                                <th>{t('workPolicy.empWorkPolicy')}</th>
                                <th>{t('workPolicy.workPolicy')}</th>
                                <th>{t('workPolicy.startDate')}</th>
                                <th>{t('workPolicy.endDate')}</th>
                                <th>{t('workPolicy.roster')}</th>
                                <th>{t('workPolicy.calendar')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, idx) => (
                                <tr key={`${row.employee_syskey}-${row.syskey}-${idx}`} onClick={() => navigate(`/employeeworkpolicy/edit/${row.syskey}`)}>
                                    <td>{`${row.eid} - ${row.name}`}</td>
                                    <td>{row.rank || row.relationship || row.position || '-'}</td>
                                    <td>{row.description}</td>
                                    <td>{row.workpolicy || 'WP'}</td>
                                    <td>{formatDisplayDate(row.startdate)}</td>
                                    <td>{formatDisplayDate(row.enddate)}</td>
                                    <td>{row.roster || '-'}</td>
                                    <td>{row.calendar || '-'}</td>
                                </tr>
                            ))}
                            {(!data || data.length === 0) && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                                        No work policies found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {data && data.length > 0 && (
                        <div className={styles.pagination}>
                            <button
                                className={styles.pageBtn}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                &laquo; {t('workPolicy.prev')}
                            </button>
                            <span className={styles.pageText}>{currentPage}</span>
                            <button
                                className={styles.pageBtn}
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                {t('workPolicy.next')} &raquo;
                            </button>
                        </div>
                    )}
                </div>
            )}

            <ShiftCalendarModal
                isOpen={!!selectedEmployeeForCalendar}
                onClose={() => setSelectedEmployeeForCalendar(null)}
                employee={selectedEmployeeForCalendar}
            />

            <WorkPolicyImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => refetch()}
            />

            <WorkPolicyExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                viewMode={viewMode}
                searchval={searchval}
            />
        </div>
    );
}
