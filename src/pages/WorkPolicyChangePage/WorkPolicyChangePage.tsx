import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, Users, Search, ChevronDown, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import mainClient from '../../lib/main-client';
import { SUPERVISE_WORKPOLICY_LIST } from '../../config/api-routes';
import toast from 'react-hot-toast';
import styles from './WorkPolicyChangePage.module.css';
import ShiftCalendarModal from './ShiftCalendarModal';

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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchval, setSearchval] = useState('');
    const [viewMode, setViewMode] = useState<'policy' | 'employee'>('policy');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());       // header syskey set
    const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<WorkPolicyRow | null>(null);

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
                // Auto-expand all groups
                setExpandedGroups(prev => new Set([...prev, row.syskey]));
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

    // ── Selection helpers ──
    const toggleGroupExpand = (syskey: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(syskey) ? next.delete(syskey) : next.add(syskey);
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>Loading work policies…</p>
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
                        <h1 className={styles.title}>Employees Work Policy</h1>
                        <p className={styles.subtitle}>
                            Select employees to reassign to a different work policy.
                        </p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => navigate('/calendarshift/new')}
                        title="Create New Policy"
                        style={{ padding: '8px 16px', background: 'var(--color-primary-600, #4f46e5)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                    >
                        <Plus size={16} style={{ marginRight: '6px' }} /> New
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
                    placeholder="Search by policy code, name, or employee…"
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
                    Work Policy
                </label>
                <label className={styles.radioLabel}>
                    <input
                        type="radio"
                        name="viewMode"
                        checked={viewMode === 'employee'}
                        onChange={() => setViewMode('employee')}
                    />
                    Work Policy (by Employee)
                </label>
            </div>



            {/* ── Content ── */}
            {viewMode === 'policy' ? (
                <div className={styles.policyTableContainer}>
                    <table className={styles.policyTable}>
                        <thead>
                            <tr>
                                <th>Ref No.</th>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Work Policy</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Roster</th>
                                <th>Calendar</th>
                                <th>Employee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(group => (
                                <tr key={group.syskey} onClick={() => navigate(`/calendarshift/edit/${group.syskey}`)}>
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
                                        No work policies found.
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
                                <th>Employee</th>
                                <th>Rank</th>
                                <th>Employee Work Policy</th>
                                <th>Work Policy</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Roster</th>
                                <th>Calendar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, idx) => (
                                <tr key={`${row.employee_syskey}-${row.syskey}-${idx}`} onClick={() => navigate(`/calendarshift/edit/${row.syskey}`)}>
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
                                &laquo; Prev
                            </button>
                            <span className={styles.pageText}>{currentPage}</span>
                            <button
                                className={styles.pageBtn}
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next &raquo;
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
        </div>
    );
}
