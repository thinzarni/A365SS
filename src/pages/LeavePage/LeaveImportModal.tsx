import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../../components/ui/Modal/Modal';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import { Button } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../../lib/api-client';
import { LEAVE_TYPES, SAVE_LEAVE } from '../../config/api-routes';
import styles from './LeaveImportModal.module.css';
import type { LeaveType } from '../../types/models';
import { useAuthStore } from '../../stores/auth-store';

interface LeaveImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportRow {
    'Employee ID': string;
    'Leave Type': string;
    'Start Date': string;
    'End Date': string;
    'Duration': string | number;
    'Remark': string;
}

const TEMPLATE_HEADERS = ['Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Remark'];

export default function LeaveImportModal({ open, onClose, onSuccess }: LeaveImportModalProps) {
    const { t } = useTranslation();
    const { user, userId } = useAuthStore();
    const [files, setFiles] = useState<File[]>([]);
    const [previewData, setPreviewData] = useState<ImportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    /* ── Leave types for mapping ── */
    const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
        queryKey: ['leaveTypes'],
        queryFn: async () => {
            const res = await apiClient.get(LEAVE_TYPES);
            return res.data?.datalist || [];
        },
        enabled: open,
    });

    const handleFileChange = useCallback(async (newFiles: File[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            setLoading(true);
            try {
                const file = newFiles[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];
                    console.log('Parsed Excel Data:', json);
                    setPreviewData(json);
                    setLoading(false);
                };
                reader.readAsArrayBuffer(file);
            } catch (error) {
                console.error('Failed to parse excel:', error);
                toast.error('Failed to parse excel file');
                setLoading(false);
            }
        } else {
            setPreviewData([]);
        }
    }, []);

    const downloadTemplate = () => {
        const demoData = [
            TEMPLATE_HEADERS,
            ['EMP001', 'Annual Leave', '2024-03-10', '2024-03-12', 3, 'Sample Request']
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(demoData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        XLSX.writeFile(workbook, 'Leave_Import_Template.xlsx');
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;
        setImporting(true);
        let successCount = 0;
        let failCount = 0;

        try {
            console.log('Starting import for', previewData.length, 'rows');
            console.log('Available Leave Types:', leaveTypes);

            for (const row of previewData) {
                // Find leave type syskey
                const typeName = String(row['Leave Type'] || '').trim().toLowerCase();

                // 1. Exact match (Description or Code)
                let lt = leaveTypes.find(t =>
                    t.description.trim().toLowerCase() === typeName ||
                    (t as any).code?.trim().toLowerCase() === typeName
                );

                // 2. Substring match (Fuzzy) if no exact match
                if (!lt) {
                    lt = leaveTypes.find(t =>
                        t.description.toLowerCase().includes(typeName) ||
                        typeName.includes(t.description.toLowerCase())
                    );
                }

                if (!lt) {
                    const msg = `Leave type not found for: "${row['Leave Type']}". Please check if it matches the system categories.`;
                    console.warn(msg);
                    console.log('Available types for comparison:', leaveTypes.map(t => t.description));
                    toast.error(msg, { duration: 4000 });
                    failCount++;
                    continue;
                }

                // Format dates to YYYYMMDD
                const formatDate = (val: any) => {
                    if (!val) return '';

                    let d: Date;
                    if (val instanceof Date) {
                        d = val;
                    } else if (typeof val === 'number') {
                        // Handle Excel serial date
                        d = new Date((val - 25569) * 86400 * 1000);
                    } else {
                        d = new Date(val);
                    }

                    if (isNaN(d.getTime())) {
                        // Fallback: try to strip dashes
                        return String(val).replace(/-/g, '').replace(/\//g, '');
                    }

                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}${m}${day}`;
                };

                const payload = {
                    syskey: '0',
                    eid: String(row['Employee ID'] || userId || user?.userid || ''),
                    name: user?.name || '',
                    approver: '',
                    duration: String(row['Duration'] || '1'),
                    startdate: formatDate(row['Start Date']),
                    enddate: formatDate(row['End Date']),
                    starttime: '09:00',
                    endtime: '18:00',
                    refno: 0,
                    remark: row['Remark'] || 'Imported from Excel',
                    requeststatus: 1, // Pending
                    requesttype: 'leave',
                    requestsubtype: lt.syskey,
                    attachment: []
                };

                console.log('Importing payload:', payload);

                try {
                    const res = await apiClient.post(SAVE_LEAVE, payload);
                    if (res.data?.statuscode === '200' || res.data?.status === 'SUCCESS' || res.data?.statuscode === 200) {
                        successCount++;
                    } else {
                        const errorMsg = res.data?.message || 'Server rejected the record';
                        console.error('Row import failed:', errorMsg, row);
                        toast.error(`Row failed: ${errorMsg}`);
                        failCount++;
                    }
                } catch (err) {
                    console.error('Failed to save row:', row, err);
                    failCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} leave requests`);
                if (failCount > 0) {
                    toast.error(`Failed to import ${failCount} records. Check leave type names.`);
                }
                onSuccess();
                onClose();
            } else {
                toast.error(`Failed to import records. Please check your data.`);
            }
        } catch (error) {
            console.error('Import process error:', error);
            toast.error('An error occurred during import');
        } finally {
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setPreviewData([]);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Import Leave Requests"
            large
        >
            <div className={styles['import-modal']}>
                <div className={styles['import-modal__steps']}>
                    <div className={styles['import-modal__step']}>
                        <h4 className={styles['import-modal__step-title']}>1. Download Template</h4>
                        <button className={styles['import-modal__template-btn']} onClick={downloadTemplate}>
                            <Download size={14} />
                            Download Leave_Import_Template.xlsx
                        </button>
                    </div>

                    <div className={styles['import-modal__step']}>
                        <h4 className={styles['import-modal__step-title']}>2. Upload Filled Excel File</h4>
                        <FileUpload
                            files={files}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls, .csv"
                            multiple={false}
                        />
                        {leaveTypes.length > 0 && (
                            <div style={{
                                marginTop: '0.75rem',
                                padding: '0.75rem',
                                background: 'var(--color-neutral-50)',
                                border: '1px dashed var(--color-neutral-200)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-neutral-600)', marginBottom: '0.25rem' }}>
                                    Allowed Leave Types (use these names):
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {leaveTypes.map(lt => (
                                        <span key={lt.syskey} style={{
                                            fontSize: '11px',
                                            background: 'var(--color-neutral-0)',
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            border: '1px solid var(--color-neutral-200)',
                                            color: 'var(--color-neutral-800)'
                                        }}>
                                            {lt.description}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={32} color="var(--color-primary-600)" />
                    </div>
                )}

                {previewData.length > 0 && !loading && (
                    <div className={styles['import-modal__preview']}>
                        <div className={styles['import-modal__preview-header']}>
                            <span className={styles['import-modal__preview-title']}>
                                Preview: {previewData.length} records found
                            </span>
                            <Button variant="ghost" size="sm" onClick={handleReset} style={{ color: 'var(--color-danger-600)' }}>
                                Remove File
                            </Button>
                        </div>
                        <div className={styles['import-modal__table-container']}>
                            <table className={styles['import-modal__table']}>
                                <thead>
                                    <tr>
                                        {TEMPLATE_HEADERS.map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => {
                                        const formatDatePreview = (val: any) => {
                                            if (!val) return '—';
                                            let d: Date;
                                            if (val instanceof Date) {
                                                d = val;
                                            } else if (typeof val === 'number') {
                                                d = new Date((val - 25569) * 86400 * 1000);
                                            } else {
                                                d = new Date(val);
                                            }
                                            return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
                                        };

                                        return (
                                            <tr key={i}>
                                                <td>{row['Employee ID'] || '—'}</td>
                                                <td>{row['Leave Type'] || '—'}</td>
                                                <td>{formatDatePreview(row['Start Date'])}</td>
                                                <td>{formatDatePreview(row['End Date'])}</td>
                                                <td>{row['Duration']}</td>
                                                <td>{row['Remark'] || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {files.length > 0 && previewData.length === 0 && !loading && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'var(--color-warning-50)',
                        border: '1px solid var(--color-warning-200)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        color: 'var(--color-warning-700)',
                        fontSize: 'var(--text-sm)'
                    }}>
                        <AlertCircle size={18} />
                        <div>
                            <strong>No data found.</strong> Please make sure you have added data rows below the header in your Excel file.
                        </div>
                    </div>
                )}

                <div className={styles['import-modal__footer']}>
                    <Button variant="ghost" onClick={onClose} disabled={importing}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={previewData.length === 0 || importing}
                        loading={importing}
                    >
                        {importing ? 'Importing...' : 'Start Import'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
