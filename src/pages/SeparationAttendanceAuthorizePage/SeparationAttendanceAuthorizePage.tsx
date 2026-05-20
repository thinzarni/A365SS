import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
    jopositionname: string;
    officename: string;
    divisionname: string;
    departmentname: string;
    teamname: string;
    attendanceauthorize: number; // 0/1=Pending, 2=Authorize, 3=Unauthorize
}

interface MissingAttendance {
    date: string;
    missing: string;
}

function formatDate(raw?: string): string {
    if (!raw || raw.length < 8) return raw || '';
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

export default function SeparationAttendanceAuthorizePage() {
    const { t } = useTranslation();
    const { userId, domain } = useAuthStore();
    const [searchval, setSearchval] = useState('');
    const [activeTab, setActiveTab] = useState(1); // Default to Pending
    const [page, setPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [missingRecords, setMissingRecords] = useState<MissingAttendance[]>([]);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const pageSize = 20;
    const queryClient = useQueryClient();

    const statusTabs = [
        { key: 4, label: t('separation.tabAll') },
        { key: 1, label: t('separation.tabPending') },
        { key: 2, label: t('separation.tabAuthorized') },
        { key: 3, label: t('separation.tabUnauthorized') },
    ];

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
                const msg = variables.status === 2
                    ? t('separation.authorizedSuccess')
                    : t('separation.unauthorizedSuccess');
                toast.success(msg);
                queryClient.invalidateQueries({ queryKey: ['separation-attendance-list'] });
            } else {
                toast.error(res.message || t('separation.updateFailed'));
            }
        },
        onError: () => {
            toast.error(t('separation.updateFailed'));
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
            toast.error(t('separation.noDataExport'));
            return;
        }

        const loadToast = toast.loading(t('separation.preparingExport'));
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
                toast.error(t('separation.noRecordsExport'));
                return;
            }

            const exportData = allRecords.map(rec => ({
                'Employee ID': rec.employeeid,
                'Employee Name': rec.employeename,
                'MPT Position': rec.positionname || '',
                'Job Position': rec.jopositionname || '',
                'Office': rec.officename || '',
                'Division': rec.divisionname || '',
                'Department': rec.departmentname || '',
                'Team': rec.teamname || '',
                'Resign Date': formatDate(rec.resigndate),
                'End Date': formatDate(rec.enddate),
                'Status': rec.attendanceauthorize === 2
                    ? t('separation.statusApproved')
                    : rec.attendanceauthorize === 3
                        ? t('separation.statusRejected')
                        : t('separation.statusPending')
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Separation Attendance');

            const wscols = [
                { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
                { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
                { wch: 15 }, { wch: 15 }, { wch: 15 }
            ];
            worksheet['!cols'] = wscols;

            const activeLabel = statusTabs.find(tab => tab.key === activeTab)?.label || 'All';
            XLSX.writeFile(workbook, `Separation_Attendance_Authorize_${activeLabel}.xlsx`);
            toast.success(t('separation.exportCompleted'));
        } catch (error) {
            console.error('Export failed:', error);
            toast.error(t('separation.exportFailed'));
        } finally {
            toast.dismiss(loadToast);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{t('separation.attendanceTitle')}</h1>
                <p className={styles.pageSubtitle}>{t('separation.requests', { count: totalCount })}</p>
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
                                placeholder={t('separation.searchPlaceholder')}
                                value={searchval}
                                onChange={(e) => { setSearchval(e.target.value); setPage(1); }}
                                className={styles.searchInput}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                className={styles.refreshBtn}
                                onClick={handleExport}
                                title={t('separation.exportToExcel')}
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
                        <p>{t('separation.loading')}</p>
                    </div>
                ) : paginatedRecords.length === 0 ? (
                    <div className={styles.emptyState}>
                        <TrendingUp size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                        <h3>{t('separation.noRecords')}</h3>
                        <p>{t('separation.noRecordsDesc')}</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('separation.colEmployeeId')}</th>
                                        <th>{t('separation.colEmployeeName')}</th>
                                        <th>{t('separation.colMptPosition')}</th>
                                        <th>{t('separation.colJobPosition')}</th>
                                        <th>{t('separation.colOffice')}</th>
                                        <th>{t('separation.colDivision')}</th>
                                        <th>{t('separation.colDepartment')}</th>
                                        <th>{t('separation.colTeam')}</th>
                                        <th>{t('separation.colResignDate')}</th>
                                        <th>{t('separation.colEndDate')}</th>
                                        <th>{t('separation.colAttendanceAuthorize')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRecords.map((rec) => (
                                        <tr key={rec.syskey}>
                                            <td className={styles.empId}>{rec.employeeid}</td>
                                            <td className={styles.empName}>{rec.employeename}</td>
                                            <td>{rec.positionname || ''}</td>
                                            <td>{rec.jopositionname || ''}</td>
                                            <td>{rec.officename || ''}</td>
                                            <td>{rec.divisionname || ''}</td>
                                            <td>{rec.departmentname || ''}</td>
                                            <td>{rec.teamname || ''}</td>
                                            <td>{formatDate(rec.resigndate)}</td>
                                            <td>{formatDate(rec.enddate)}</td>
                                            <td>
                                                <div className={styles.actionContainer}>
                                                    {(rec.attendanceauthorize === 1 || rec.attendanceauthorize === 0 || !rec.attendanceauthorize) ? (
                                                        <div
                                                            className={styles.actionTrigger}
                                                            onClick={() => setOpenMenuId(openMenuId === rec.syskey ? null : rec.syskey)}
                                                        >
                                                            <Badge variant="pending" dot>{t('separation.statusPending')}</Badge>
                                                        </div>
                                                    ) : rec.attendanceauthorize === 2 ? (
                                                        <Badge variant="approved-outline" dot>{t('separation.statusApproved')}</Badge>
                                                    ) : (
                                                        <Badge variant="rejected-outline" dot>{t('separation.statusRejected')}</Badge>
                                                    )}

                                                    {openMenuId === rec.syskey && (
                                                        <>
                                                            <div className={styles.popoverBackdrop} onClick={() => setOpenMenuId(null)} />
                                                            <div className={styles.popover}>
                                                                <div className={styles.popoverHeader}>{t('separation.changeApprovalStatus')}</div>
                                                                <button
                                                                    className={`${styles.popoverBtn} ${styles.btnApprove}`}
                                                                    disabled={statusMutation.isPending}
                                                                    onClick={() => {
                                                                        statusMutation.mutate({ syskey: rec.syskey, status: 2 });
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    {t('separation.approve')}
                                                                </button>
                                                                <button
                                                                    className={`${styles.popoverBtn} ${styles.btnReject}`}
                                                                    disabled={statusMutation.isPending}
                                                                    onClick={() => {
                                                                        statusMutation.mutate({ syskey: rec.syskey, status: 3 });
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                >
                                                                    {t('separation.reject')}
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
                                {t('separation.showing', {
                                    from: (page - 1) * pageSize + 1,
                                    to: Math.min(page * pageSize, totalCount),
                                    total: totalCount
                                })}
                            </div>
                            <div className={styles.pageControls}>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={16} />
                                    {t('separation.prev')}
                                </button>
                                <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
                                    {page}
                                </button>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    {t('separation.next')}
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
