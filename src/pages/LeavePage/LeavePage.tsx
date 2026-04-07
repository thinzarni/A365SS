import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Palmtree, FileSpreadsheet, Download, Loader2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Button, Input, Select } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import LeaveImportModal from './LeaveImportModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import type { LeaveType, RequestModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import { LEAVE_TYPES, LEAVE_LIST } from '../../config/api-routes';
import { displayDate } from '../../lib/date-utils';
import styles from './LeavePage.module.css';
import '../../styles/pages.css';

/* ══════════════════════════════════════════════════════════════ */

export default function LeavePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [showExportConfirm, setShowExportConfirm] = useState(false);

    /* ── Date Filters (Default to current month) ── */
    const initialDates = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        return { from: fmt(start), to: fmt(end) };
    }, []);

    const [fromDate, setFromDate] = useState(initialDates.from);
    const [toDate, setToDate] = useState(initialDates.to);

    const apiDates = useMemo(() => {
        const clean = (s: string) => s.replace(/-/g, '');
        return { from: clean(fromDate), to: clean(toDate) };
    }, [fromDate, toDate]);

    const [statusFilter, setStatusFilter] = useState('4');

    const statusOptions = useMemo(() => [
        { value: '4', label: t('leave.all') },
        { value: '1', label: t('profile.options.status.Pending') },
        { value: '2', label: t('profile.options.status.Approved') },
        { value: '3', label: t('profile.options.status.Rejected') },
    ], [t]);

    /* ── Leave types (for resolving syskey → description) ── */
    const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
        queryKey: ['leaveTypes'],
        queryFn: async () => {
            const res = await apiClient.get(LEAVE_TYPES);
            return res.data?.datalist || [];
        },
    });

    /* ── Leave history ── */
    const { data: leaveHistory = [], isLoading } = useQuery<RequestModel[]>({
        queryKey: ['leaveHistory', apiDates.from, apiDates.to, statusFilter],
        queryFn: async () => {
            const res = await apiClient.post(LEAVE_LIST, {
                fromdate: apiDates.from,
                todate: apiDates.to,
                status: statusFilter,
            });
            return res.data?.datalist || [];
        },
    });

    const handleExport = async () => {
        if (leaveHistory.length === 0) {
            toast.error('No data to export');
            return;
        }

        try {
            setExporting(true);

            // Map data to Excel format
            const exportData = (leaveHistory as any[]).map((leave) => {
                let statusText = '—';
                const st = String(leave.requeststatus);
                if (st === '1') statusText = 'Pending';
                else if (st === '2') statusText = 'Approved';
                else if (st === '3') statusText = 'Rejected';
                else if (st === '4') statusText = 'Draft';

                const dateRange = (leave.startdate || leave.date) +
                    (leave.enddate && leave.enddate !== leave.startdate ? ` to ${leave.enddate}` : '');

                return {
                    'Employee ID': leave.eid || '—',
                    'Employee Name': leave.name || '—',
                    'Ref #': leave.refno || '—',
                    'Date': dateRange,
                    'Type': resolveLeaveType(leave),
                    'Duration': leave.duration != null && leave.duration !== '' ? `${leave.duration} day(s)` : '—',
                    'Status': statusText,
                };
            });

            // SheetJS logic
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Requests');

            // Set column widths for better readability
            const wscols = [
                { wch: 15 }, // Employee ID
                { wch: 20 }, // Employee Name
                { wch: 10 }, // Ref #
                { wch: 25 }, // Date
                { wch: 20 }, // Type
                { wch: 15 }, // Duration
                { wch: 12 }, // Status
            ];
            worksheet['!cols'] = wscols;

            XLSX.writeFile(workbook, `Leave_Requests_${apiDates.from}_to_${apiDates.to}.xlsx`);
            toast.success('Excel file exported successfully');
        } catch (err) {
            console.error('Frontend export failed:', err);
            toast.error('An error occurred during export');
        } finally {
            setExporting(false);
        }
    };

    /* ── Quick stats ── */
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        for (const r of leaveHistory as any[]) {
            const st = String(r.requeststatus);
            if (st === '1') pending++;
            if (st === '2') approved++;
            if (st === '3') rejected++;
        }
        return { total: leaveHistory.length, pending, approved, rejected };
    }, [leaveHistory]);

    /* helper: resolve leave-type syskey → description */
    const resolveLeaveType = (leave: any): string => {
        if (leave.requestsubtypedesc) return leave.requestsubtypedesc;
        if (leave.requestsubtype) {
            const lt = leaveTypes.find((t: LeaveType) => t.syskey === leave.requestsubtype);
            if (lt) return lt.description;
        }
        return leave.requesttypedesc || '—';
    };

    /* ═══════════════════════════ Render ═══════════════════════ */

    return (
        <div className={styles['leave-page']}>
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header__row">
                    <div>
                        <h1 className="page-header__title">{t('leave.title')}</h1>
                        <p className="page-header__subtitle">
                            {leaveHistory.length} {leaveHistory.length === 1 ? 'leave request' : 'leave requests'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Button variant="ghost" onClick={() => setImportModalOpen(true)}>
                            <FileSpreadsheet size={16} />
                            {t('leave.importExcel')}
                        </Button>

                        <Button onClick={() => navigate('/requests/new?type=leave')}>
                            <Plus size={16} />
                            {t('leave.apply')}
                        </Button>
                    </div>
                </div>
            </div>

            <LeaveImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['leaveHistory'] })}
            />

            {/* ── Summary cards ── */}
            <div className={styles['leave-summary']}>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']}>{stats.total}</span>
                    <span className={styles['leave-summary__label']}>Total Requests</span>
                </div>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']} style={{ color: 'var(--color-warning-600)' }}>
                        {stats.pending}
                    </span>
                    <span className={styles['leave-summary__label']}>Pending</span>
                </div>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']} style={{ color: 'var(--color-success-600)' }}>
                        {stats.approved}
                    </span>
                    <span className={styles['leave-summary__label']}>Approved</span>
                </div>
                <div className={styles['leave-summary__card']}>
                    <span className={styles['leave-summary__value']} style={{ color: 'var(--color-danger-600)' }}>
                        {stats.rejected}
                    </span>
                    <span className={styles['leave-summary__label']}>Rejected</span>
                </div>
            </div>

            {/* ── Filters ── */}
            {filterOpen && (
                <div className={styles['leave-filters']}>
                    <div className={styles['leave-filters__group']}>
                        <div className={styles['leave-filters__field']}>
                            <label>{t('leave.fromDate')}</label>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className={styles['leave-filters__field']}>
                            <label>{t('leave.toDate')}</label>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                        <div className={styles['leave-filters__field']}>
                            <label>{t('leave.status')}</label>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={statusOptions}
                                className={styles['leave-filters__select']}
                            />
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        loading={exporting}
                        onClick={() => setShowExportConfirm(true)}
                        className={styles['leave-filters__export']}
                    >
                        {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        {t('leave.exportExcel')}
                    </Button>
                </div>
            )}

            {/* ── Leave list table ── */}
            <div className={styles['leave-list-card']}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles['leave-list-card__header']}>
                        <h3 className={styles['leave-list-card__title']}>All Leave Requests</h3>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => setFilterOpen(!filterOpen)}
                        style={{
                            background: filterOpen ? 'var(--color-primary-50)' : 'var(--color-neutral-0)',
                            color: filterOpen ? 'var(--color-primary-600)' : 'inherit',
                            border: `1px solid ${filterOpen ? 'var(--color-primary-200)' : 'var(--color-neutral-300)'}`,
                            marginRight: '20px'
                        }}
                    >
                        <Filter size={14} />
                        {t('common.filter')}
                    </Button>
                </div>
                {isLoading ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <p className="empty-state__desc">{t('common.loading')}</p>
                    </div>
                ) : leaveHistory.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                        <Palmtree size={48} className="empty-state__icon" />
                        <h3 className="empty-state__title">No leave requests</h3>
                        <p className="empty-state__desc">Your leave requests will appear here.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles['leave-table']}>
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Ref #</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(leaveHistory as any[]).map((leave, i) => (
                                    <tr key={leave.syskey || i} onClick={() => navigate(`/requests/${leave.syskey}`)}>
                                        <td>{leave.eid || '—'}</td>
                                        <td>{leave.name || '—'}</td>
                                        <td>{leave.refno || '—'}</td>
                                        <td className={styles['leave-table__dates']}>
                                            {displayDate(leave.startdate || leave.date) || '—'}
                                            {leave.enddate && leave.enddate !== leave.startdate ? ` → ${displayDate(leave.enddate)}` : ''}
                                        </td>
                                        <td>{resolveLeaveType(leave)}</td>
                                        <td>{leave.duration != null && leave.duration !== '' ? `${leave.duration} day(s)` : '—'}</td>
                                        <td>
                                            <StatusBadge status={String(leave.requeststatus)} />
                                        </td>
                                    </tr>
                                ))}
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
                title={t('leave.exportExcel')}
                message={t('leave.exportConfirmMessage')}
                confirmLabel={t('leave.exportExcel')}
                loading={exporting}
                variant="primary"
                icon={<FileSpreadsheet size={28} />}
            />
        </div>
    );
}
