import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal/Modal';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import { Button } from '../../components/ui';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    FILE_UPLOAD,
    EXPORT_LEAVE_TEMPLATE,
    PREPARE_IMPORT_LEAVE,
    PREVIEW_IMPORT_LEAVE,
    CONFIRM_IMPORT_LEAVE,
    CLEAR_IMPORT_LEAVE
} from '../../config/api-routes';
import { useAuthStore } from '../../stores/auth-store';
import styles from './LeaveImportModal.module.css';

interface LeaveImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function LeaveImportModal({ open, onClose, onSuccess }: LeaveImportModalProps) {
    const { t } = useTranslation();
    const { userId, domain } = useAuthStore();
    const queryClient = useQueryClient();

    const [files, setFiles] = useState<File[]>([]);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewTab, setPreviewTab] = useState<'invalid' | 'valid'>('invalid');
    const [exporting, setExporting] = useState(false);

    /* ── Download Template (Export) ── */
    const downloadTemplate = async () => {
        try {
            setExporting(true);
            const res = await mainClient.post(EXPORT_LEAVE_TEMPLATE, {
                userid: userId || '',
                domain: domain || 'dev'
            });
            const data = res.data?.data;
            if (res.data?.status === 201 && data?.base64String) {
                const link = document.createElement('a');
                link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.base64String}`;
                link.download = data.fileName || 'Leave_Import_Template.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Template downloaded successfully');
            } else {
                toast.error(res.data?.message || 'Failed to export template');
            }
        } catch (err) {
            console.error('Export template failed:', err);
            toast.error('An error occurred while exporting the template');
        } finally {
            setExporting(false);
        }
    };

    /* ── Mutations ── */
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    const base64String = (reader.result as string).split(',')[1];
                    try {
                        // 1. Upload File
                        const uploadPayload = {
                            base64filename: file.name,
                            base64String: base64String,
                            domain: domain || 'dev',
                            userid: userId || ''
                        };
                        const uploadRes = await apiClient.post(FILE_UPLOAD, uploadPayload);
                        const uploadedFileName = uploadRes.data?.fileName;

                        if (!uploadedFileName) {
                            throw new Error(uploadRes.data?.message || 'File upload failed');
                        }

                        // 2. Prepare Import
                        const prepareRes = await mainClient.post(`${PREPARE_IMPORT_LEAVE}?fileName=${uploadedFileName}`, {
                            userid: userId || '',
                            domain: domain || 'dev'
                        });
                        const prepareData = prepareRes.data?.data;
                        const batchid = prepareData?.batchid;

                        if (!batchid) {
                            throw new Error(prepareRes.data?.message || prepareData?.message || 'Failed to prepare import');
                        }

                        // 3. Preview Import
                        const previewPayload = {
                            userid: userId || '',
                            domain: domain || 'dev',
                            type: '3',
                            currentPage: 1,
                            pageSize: 500
                        };
                        const previewRes = await mainClient.post(`${PREVIEW_IMPORT_LEAVE}/${batchid}`, previewPayload);
                        const previewResult = previewRes.data?.data;

                        if (!previewResult) throw new Error('Failed to fetch preview data');

                        resolve({ batchid, ...previewResult });
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = error => reject(error);
            });
        },
        onSuccess: (data: any) => {
            setPreviewData(data);
            setPreviewTab(data.invalidCount > 0 ? 'invalid' : 'valid');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || (err instanceof Error ? err.message : t('common.error'));
            toast.error(msg);
            setFiles([]);
        }
    });

    const confirmMutation = useMutation({
        mutationFn: async () => {
            if (!previewData?.batchid) throw new Error('No batch ready to import');
            const res = await mainClient.post(`${CONFIRM_IMPORT_LEAVE}/${previewData.batchid}`, {
                userid: userId || '',
                domain: domain || 'dev'
            });
            const data = res.data;
            const isSuccess = data?.status === 201 || data?.statuscode === 200 || data?.statuscode === 300 || data?.message_code === "203" || (data?.data?.statuscode >= 200 && data?.data?.statuscode < 400);
            if (!isSuccess) {
                throw new Error(data?.message || data?.data?.message || t('common.error'));
            }
            return data;
        },
        onSuccess: () => {
            toast.success('Leave requests imported successfully');
            queryClient.invalidateQueries({ queryKey: ['leaveList'] });
            setFiles([]);
            setPreviewData(null);
            onSuccess();
            onClose();
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : t('common.error');
            toast.error(msg);
        }
    });

    const handleFileChange = useCallback((newFiles: File[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            uploadMutation.mutate(newFiles[0]);
        } else {
            setPreviewData(null);
        }
    }, [uploadMutation]);

    const handleClose = async () => {
        if (previewData?.batchid && !confirmMutation.isSuccess) {
            try {
                await mainClient.post(`${CLEAR_IMPORT_LEAVE}/${previewData.batchid}`, {
                    userid: userId || '',
                    domain: domain || 'dev'
                });
            } catch (err) {
                console.error('Clear batch failed', err);
            }
        }
        setFiles([]);
        setPreviewData(null);
        onClose();
    };

    const handleReset = () => {
        setFiles([]);
        setPreviewData(null);
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Import Leave Requests"
            large
        >
            <div className={styles['import-modal']}>
                <div className={styles['import-modal__steps']}>
                    <div className={styles['import-modal__step']}>
                        <h4 className={styles['import-modal__step-title']}>1. Download Template</h4>
                        <button
                            className={styles['import-modal__template-btn']}
                            onClick={downloadTemplate}
                            disabled={exporting}
                        >
                            <Download size={14} />
                            {exporting ? 'Preparing template...' : 'Download Leave_Import_Template.xlsx'}
                        </button>
                    </div>

                    <div className={styles['import-modal__step']}>
                        <h4 className={styles['import-modal__step-title']}>2. Upload Filled Excel File</h4>
                        <FileUpload
                            files={files}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                            multiple={false}
                        />
                    </div>
                </div>

                {uploadMutation.isPending && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1rem' }}>
                        <Loader2 className="animate-spin" size={32} color="var(--color-primary-600)" />
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>Processing file and preparing preview...</p>
                    </div>
                )}

                {previewData && !uploadMutation.isPending && (
                    <div className={styles['import-modal__preview']}>
                        <div className={styles['import-modal__tabs']}>
                            <button
                                className={`${styles['import-modal__tab-btn']} ${previewTab === 'invalid' ? styles['import-modal__tab-btn--active-invalid'] : ''}`}
                                onClick={() => setPreviewTab('invalid')}
                            >
                                <XCircle size={16} />
                                Invalid Records
                                <span className={`${styles['import-modal__badge']} ${styles['import-modal__badge--invalid']}`}>{previewData.invalidCount || 0}</span>
                            </button>
                            <button
                                className={`${styles['import-modal__tab-btn']} ${previewTab === 'valid' ? styles['import-modal__tab-btn--active-valid'] : ''}`}
                                onClick={() => setPreviewTab('valid')}
                            >
                                <CheckCircle2 size={16} />
                                Valid Records
                                <span className={`${styles['import-modal__badge']} ${styles['import-modal__badge--valid']}`}>{previewData.validCount || 0}</span>
                            </button>
                        </div>

                        <div className={styles['import-modal__table-container']}>
                            <table className={styles['import-modal__table']}>
                                <thead>
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Leave Type</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>{previewTab === 'invalid' ? 'Remark & Errors' : 'Remark'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(previewTab === 'invalid' ? previewData.invalidList : previewData.validList)?.map((row: any, i: number) => {
                                        const errors = previewTab === 'invalid' ? Object.keys(row).filter(k => k.endsWith('_error') && row[k]).map(k => row[k]) : [];
                                        return (
                                            <tr key={i}>
                                                <td>{row.employeeid}</td>
                                                <td>{row.leavetype}</td>
                                                <td>{row.startdate}</td>
                                                <td>{row.enddate}</td>
                                                <td>{row.duration}</td>
                                                <td>{row.status}</td>
                                                <td>
                                                    {row.remark || '—'}
                                                    {errors.length > 0 && (
                                                        <ul className={styles['import-modal__error-list']}>
                                                            {errors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {((previewTab === 'invalid' ? previewData.invalidList : previewData.validList)?.length || 0) === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-neutral-400)' }}>
                                                No {previewTab} records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--color-neutral-50)', borderTop: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="sm" onClick={handleReset} style={{ color: 'var(--color-danger-600)' }}>
                                Remove File
                            </Button>
                        </div>
                    </div>
                )}

                <div className={styles['import-modal__footer']}>
                    <Button variant="ghost" onClick={handleClose} disabled={confirmMutation.isPending}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={() => confirmMutation.mutate()}
                        disabled={!previewData || previewData.validCount <= 0 || confirmMutation.isPending}
                        loading={confirmMutation.isPending}
                    >
                        {confirmMutation.isPending ? 'Importing...' : 'Confirm Import'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
