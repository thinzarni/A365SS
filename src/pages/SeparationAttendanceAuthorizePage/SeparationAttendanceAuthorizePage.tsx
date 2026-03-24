import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    Loader2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { SEPARATION_ATTENDANCE_LIST, SEPARATION_ATTENDANCE_STATUS } from '../../config/api-routes';
import { Badge } from '../../components/ui/Badge/Badge';
import AttendanceConflictModal from '../../components/ui/AttendanceConflictModal/AttendanceConflictModal';
import * as XLSX from 'xlsx';
import styles from './SeparationAttendanceAuthorizePage.module.css';

interface SeparationRecord {
    syskey: string;
    employeeid: string;
    employeename: string;
    resigndate: string;
    enddate: string;
    positionname: string;
    officename: string;
    attendanceauthorize: number; // 0/1=Pending, 2=Authorize, 3=Unauthorize
}

interface MissingAttendance {
    date: string;
    missing: string;
}

const statusTabs = [
    { key: 4, label: 'All' },
    { key: 1, label: 'Pending' },
    { key: 2, label: 'Authorized' },
    { key: 3, label: 'Unauthorized' },
];

function formatDate(raw?: string): string {
    if (!raw || raw.length < 8) return raw || '';
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

export default function SeparationAttendanceAuthorizePage() {
    const { userId, domain } = useAuthStore();
    const [searchval, setSearchval] = useState('');
    const [activeTab, setActiveTab] = useState(1); // Default to Pending
    const [page, setPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [missingRecords, setMissingRecords] = useState<MissingAttendance[]>([]);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const pageSize = 20;
    const queryClient = useQueryClient();

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['separation-attendance-list', searchval, activeTab, page, userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(SEPARATION_ATTENDANCE_LIST, {
                searchval,
                pagesize: pageSize,
                currentpage: page,
                userid: userId,
                domain,
                status: activeTab
            });
            return res.data;
        }
    });

    const statusMutation = useMutation({
        mutationFn: async ({ syskey, status }: { syskey: string; status: number }) => {
            const res = await mainClient.post(SEPARATION_ATTENDANCE_STATUS, {
                syskey,
                status,
                userid: userId,
                domain
            });
            return res.data;
        },
        onSuccess: (res, variables) => {
            if (res.statuscode === 210) {
                setMissingRecords(res.datalist || []);
                setIsConflictModalOpen(true);
                return;
            }

            if (res.statuscode === 300) {
                const action = variables.status === 2 ? 'Authorized' : 'Unauthorized';
                toast.success(`Employee Attendance ${action} successfully`);
                queryClient.invalidateQueries({ queryKey: ['separation-attendance-list'] });
            } else {
                toast.error(res.message || 'Failed to update attendance status');
            }
        },
        onError: () => {
            toast.error('Failed to update attendance status');
        }
    });

    const paginatedRecords: SeparationRecord[] = data?.datalist || [];
    const totalCount = data?.totalcount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const handleTabChange = (key: number) => {
        setActiveTab(key);
        setPage(1);
    };

    const handleExport = async () => {
        if (totalCount === 0) {
            toast.error('No data to export');
            return;
        }

        const loadToast = toast.loading('Preparing export...');
        try {
            const res = await mainClient.post(SEPARATION_ATTENDANCE_LIST, {
                searchval,
                pagesize: 0,
                currentpage: 1,
                userid: userId,
                domain,
                status: activeTab
            });

            const allRecords: SeparationRecord[] = res.data?.datalist || [];

            if (allRecords.length === 0) {
                toast.error('No records found for export');
                return;
            }

            const exportData = allRecords.map(rec => ({
                'Employee ID': rec.employeeid,
                'Employee Name': rec.employeename,
                'Resign Date': formatDate(rec.resigndate),
                'End Date': formatDate(rec.enddate),
                'Position': rec.positionname || 'N/A',
                'Office': rec.officename || 'N/A',
                'Status': rec.attendanceauthorize === 2 ? 'Approved' : rec.attendanceauthorize === 3 ? 'Rejected' : 'Pending'
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Separation Attendance');

            // Column widths
            const wscols = [
                { wch: 15 }, // ID
                { wch: 25 }, // Name
                { wch: 15 }, // Resign Date
                { wch: 15 }, // End Date
                { wch: 25 }, // Position
                { wch: 20 }, // Office
                { wch: 15 }  // Status
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Separation_Attendance_Authorize_${statusTabs.find(t => t.key === activeTab)?.label || 'All'}.xlsx`);
            toast.success('Export completed');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export data');
        } finally {
            toast.dismiss(loadToast);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Separation Attendance Authorize</h1>
                <p className={styles.pageSubtitle}>{totalCount} requests</p>
            </div>
            <div className={styles.contentCard}>
                <header className={styles.header}>
                    <div className={styles.tabs}>
                        {statusTabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                                onClick={() => handleTabChange(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.searchWrapper}>
                            <Search className={styles.searchIcon} size={16} />
                            <input
                                type="text"
                                placeholder="Search employee..."
                                value={searchval}
                                onChange={(e) => { setSearchval(e.target.value); setPage(1); }}
                                className={styles.searchInput}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                className={styles.refreshBtn}
                                onClick={handleExport}
                                title="Export to Excel"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <Download size={18} />
                            </button>
                            <button
                                className={styles.refreshBtn}
                                onClick={() => refetch()}
                                disabled={isFetching}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <RefreshCw size={18} className={isFetching ? styles.spinner : ''} />
                            </button>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                    <div className={styles.loadingState}>
                        <Loader2 className={styles.spinner} size={40} />
                        <p>Loading attendance records...</p>
                    </div>
                ) : paginatedRecords.length === 0 ? (
                    <div className={styles.emptyState}>
                        <TrendingUp size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                        <h3>No records found</h3>
                        <p>Try adjusting your filters or search keywords.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>Resign Date</th>
                                        <th>End Date</th>
                                        <th>Details</th>
                                        <th>Attendance Authorize</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRecords.map((rec) => (
                                        <tr key={rec.syskey}>
                                            <td className={styles.empId}>{rec.employeeid}</td>
                                            <td className={styles.empName}>{rec.employeename}</td>
                                            <td>{formatDate(rec.resigndate)}</td>
                                            <td>{formatDate(rec.enddate)}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{rec.positionname || 'N/A'}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{rec.officename || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.actionContainer}>
                                                    {(rec.attendanceauthorize === 1 || rec.attendanceauthorize === 0 || !rec.attendanceauthorize) ? (
                                                        <div
                                                            className={styles.actionTrigger}
                                                            onClick={() => setOpenMenuId(openMenuId === rec.syskey ? null : rec.syskey)}
                                                        >
                                                            <Badge variant="pending" dot>Pending</Badge>
                                                        </div>
                                                    ) : rec.attendanceauthorize === 2 ? (
                                                        <Badge variant="approved-outline" dot>Approved</Badge>
                                                    ) : (
                                                        <Badge variant="rejected-outline" dot>Rejected</Badge>
                                                    )}

                                                    {openMenuId === rec.syskey && (
                                                        <>
                                                            <div className={styles.popoverBackdrop} onClick={() => setOpenMenuId(null)} />
                                                            <div className={styles.popover}>
                                                                <div className={styles.popoverHeader}>Change Approval Status</div>
                                                                <button
                                                                    className={`${styles.popoverBtn} ${styles.btnApprove}`}
                                                                    disabled={statusMutation.isPending}
                                                                    onClick={() => {
                                                                        statusMutation.mutate({ syskey: rec.syskey, status: 2 });
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    className={`${styles.popoverBtn} ${styles.btnReject}`}
                                                                    disabled={statusMutation.isPending}
                                                                    onClick={() => {
                                                                        statusMutation.mutate({ syskey: rec.syskey, status: 3 });
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.pagination}>
                            <div className={styles.pageInfo}>
                                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                            </div>
                            <div className={styles.pageControls}>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={16} />
                                    Prev
                                </button>
                                <button
                                    className={`${styles.pageBtn} ${styles.pageBtnActive}`}
                                >
                                    {page}
                                </button>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <AttendanceConflictModal
                open={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                missingRecords={missingRecords}
            />
        </div>
    );
}
