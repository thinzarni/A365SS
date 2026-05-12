import { useState } from 'react';
import { Download, Upload, X, Check, AlertCircle, Loader2, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import apiClient from '../../lib/api-client';
import {
    WORKPOLICY_PREPARE_IMPORT,
    WORKPOLICY_PREVIEW_IMPORT,
    WORKPOLICY_CONFIRM_IMPORT,
    WORKPOLICY_CLEAR_IMPORT,
    FILE_UPLOAD,
    WORKPOLICY_PREVIEW_DB,
    WORKPOLICY_CHECK_IMPORT_STATUS
} from '../../config/api-routes';
import { useAuthStore } from '../../stores/auth-store';
import Modal from '../../components/ui/Modal/Modal';
import { Button } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import styles from './WorkPolicyImportModal.module.css';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function WorkPolicyImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
    const { t } = useTranslation();
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [importType, setImportType] = useState<0 | 1>(0); // 0 = Roster, 1 = Calendar
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importBatchId, setImportBatchId] = useState<string | null>(null);
    const [validData, setValidData] = useState<any[]>([]);
    const [invalidData, setInvalidData] = useState<any[]>([]);
    const [headerColumns, setHeaderColumns] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<'valid' | 'error'>('valid');
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    // Map UI import type to backend API type:
    // UI: 0 = Roster, 1 = Calendar
    // Backend: 0 = Roster, 2 = Calendar
    const getImportApiType = () => importType === 1 ? 1 : 0;

    const fetchPreview = async (batchId: string, type: '1' | '2') => {
        try {
            console.log(`📤 [Import] Fetching preview for batch: ${batchId}, type: ${type}`);
            const previewRes = await apiClient.post(`${WORKPOLICY_PREVIEW_IMPORT}/${batchId}`, {
                pagesize: 100,
                currentpage: 1,
                type: type
            });
            console.log('✅ [Import] Preview Success:', previewRes.data);

            if (type === '1') {
                setValidData(previewRes.data?.validList || []);
                setInvalidData([]);
            } else {
                setInvalidData(previewRes.data?.invalidList || []);
                setValidData([]);
            }

            if (previewRes.data?.headerColumns) {
                setHeaderColumns(previewRes.data.headerColumns);
            }
        } catch (err) {
            console.error('❌ [Import] Preview failed:', err);
            toast.error('Failed to fetch preview data.');
        }
    };


    // Poll checkinputstatus until is_prepared = true (max 60s)
    const waitForBatchReady = async (batchId: string): Promise<boolean> => {
        const maxAttempts = 30;
        const intervalMs = 2000;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const res = await apiClient.get(
                    `${WORKPOLICY_CHECK_IMPORT_STATUS}/${batchId}`
                );
                console.log(`🔄 [Import] checkInputStatus attempt ${i + 1}:`, res.data);
                if (res.data?.status === true) return true;
            } catch (err) {
                console.warn('[Import] checkInputStatus poll error:', err);
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return false; // timed out
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            console.log('📤 [Import] Starting upload for:', file.name);
            const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(f);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
            });

            const base64Str = await toBase64(file);

            const uploadRes = await apiClient.post(FILE_UPLOAD, {
                base64String: base64Str,
                base64filename: file.name
            });
            const uploadedName = uploadRes.data?.fileName || uploadRes.data?.data?.fileName;
            setUploadedFileName(uploadedName);

            if (!uploadedName) throw new Error('Failed to get fileName from upload API');

            const prepRes = await apiClient.post(`${WORKPOLICY_PREPARE_IMPORT}?fileName=${encodeURIComponent(uploadedName)}`, {
                type: getImportApiType()
            });
            const batchId = prepRes.data?.batchid || prepRes.data?.data?.batchid;

            if (!batchId) throw new Error('No batchid returned from prepare API');
            setImportBatchId(batchId);

            // Step 3: Trigger DB stored procedure
            console.log('📤 [Import] Step 3: Running previewdb procedure...');
            await apiClient.post(`${WORKPOLICY_PREVIEW_DB}/${batchId}`, {
                type: getImportApiType()
            });
            console.log('✅ [Import] Step 3 Success: previewdb triggered.');

            // Step 4: Poll until batch is fully prepared
            console.log('🔄 [Import] Step 4: Polling checkinputstatus...');
            const isReady = await waitForBatchReady(batchId);
            if (!isReady) {
                toast.error('Import preparation timed out. Please try again.');
                return;
            }
            console.log('✅ [Import] Step 4 Success: Batch is ready.');

            // Step 5: Fetch preview
            await fetchPreview(batchId, '1');
            setStep('preview');
            setFilterType('valid');
            toast.success('File uploaded and parsed successfully!');
        } catch (err) {
            console.error('❌ [Import] Upload failed:', err);
            toast.error('Failed to upload or parse Excel file.');
        } finally {
            setIsUploading(false);
        }
    };

    // Effect to re-fetch when filterType changes
    const handleFilterChange = (newType: 'valid' | 'error') => {
        setFilterType(newType);
        if (importBatchId) {
            fetchPreview(importBatchId, newType === 'valid' ? '1' : '2');
        }
    };

    const handleConfirmImport = async () => {
        if (!importBatchId) return;

        setIsImporting(true);
        console.log('📤 [Import] Confirming batch:', importBatchId, 'Type:', getImportApiType());
        try {
            // Include type so the server knows how to process the batch
            const res = await apiClient.post(`${WORKPOLICY_CONFIRM_IMPORT}/${importBatchId}`, {
                type: getImportApiType()
            });
            console.log('✅ [Import] Confirmation Success:', res.data);
            toast.success('Work policies imported successfully!');
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('❌ [Import] Confirmation failed:', err);
            if (err.response) {
                console.error('❌ [Import] Server Error Data:', err.response.data);
            }
            toast.error(err.response?.data?.message || 'Failed to confirm import.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleClearImport = async () => {
        if (!importBatchId) return;
        try {
            await apiClient.post(`${WORKPOLICY_CLEAR_IMPORT}/${importBatchId}`, {});
        } catch (err) {
            console.error('Clear failed', err);
        }
    };

    // Go back to upload step — does NOT call clear API, just resets UI state
    const handleBackToUpload = () => {
        setStep('upload');
        setImportBatchId(null);
        setValidData([]);
        setInvalidData([]);
        setHeaderColumns([]);
        setUploadedFileName(null);
    };

    // Full close — calls clear API to clean up the batch on the server
    const handleClose = () => {
        if (step === 'preview') {
            handleClearImport();
        }
        setStep('upload');
        setImportBatchId(null);
        setValidData([]);
        setInvalidData([]);
        setHeaderColumns([]);
        setUploadedFileName(null);
        setSelectedPeriod('');
        onClose();
    };

    return (
        <Modal
            open={isOpen}
            onClose={handleClose}
            title={t('workPolicy.import.title')}
        >
            <div className={styles.container}>
                {step === 'upload' ? (
                    <div className={styles.uploadStep}>
                        <div className={styles.infoBox}>
                            <AlertCircle size={20} className={styles.infoIcon} />
                            <div>
                                <p className={styles.infoTitle}>{t('workPolicy.import.instructionsTitle')}</p>
                                <ol className={styles.infoList}>
                                    <li>{t('workPolicy.import.instruction2')}</li>
                                    <li>{t('workPolicy.import.instruction3')}</li>
                                </ol>
                            </div>
                        </div>

                        {/* ── Type selection (must choose before upload) ── */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className={styles.label}>{t('workPolicy.import.selectTypePeriod')}</label>
                            <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                                    <input
                                        type="radio"
                                        name="importTypeUpload"
                                        checked={importType === 0}
                                        onChange={() => setImportType(0)}
                                    />
                                    {t('workPolicy.import.rosterTemplate')}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                                    <input
                                        type="radio"
                                        name="importTypeUpload"
                                        checked={importType === 1}
                                        onChange={() => setImportType(1)}
                                    />
                                    {t('workPolicy.import.calendarTemplate')}
                                </label>
                            </div>
                        </div>

                        <div className={styles.uploadSection}>
                            <label className={styles.label}>{t('workPolicy.import.uploadCompletedFile')}</label>
                            <label className={styles.dropZone} style={{ opacity: 1, cursor: 'pointer' }}>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    hidden
                                />
                                {isUploading ? (
                                    <div className={styles.uploadingState}>
                                        <Loader2 size={32} className={styles.spinner} />
                                        <p>Uploading and processing file...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} className={styles.uploadIcon} />
                                        <p className={styles.dropTitle}>{t('workPolicy.import.clickToUpload')}</p>
                                        <p className={styles.dropSub}>{t('workPolicy.import.supportedFormats')}</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className={styles.previewStep}>
                        <div className={styles.topActionsBar}>
                            <div className={styles.actionGroup}>
                                <Button variant="primary" onClick={handleConfirmImport} loading={isImporting} disabled={validData.length === 0}>
                                    <Check size={16} /> {t('workPolicy.save')}
                                </Button>
                                <Button variant="secondary" onClick={handleBackToUpload}>
                                    <List size={16} /> {t('workPolicy.list')}
                                </Button>
                                <select
                                    className={styles.miniSelect}
                                    value={importType}
                                    onChange={(e) => setImportType(Number(e.target.value) as 0 | 1)}
                                >
                                    <option value={0}>{t('workPolicy.roster')}</option>
                                    <option value={1}>{t('workPolicy.calendar')}</option>
                                </select>
                            </div>
                            <div className={styles.filePathDisplay}>
                                {uploadedFileName}
                            </div>
                        </div>

                        <div className={styles.filterBar}>
                            <label className={styles.filterOption}>
                                <input
                                    type="radio"
                                    checked={filterType === 'valid'}
                                    onChange={() => handleFilterChange('valid')}
                                />
                                {t('workPolicy.import.valid')} ({validData.length})
                            </label>
                            <label className={styles.filterOption}>
                                <input
                                    type="radio"
                                    checked={filterType === 'error'}
                                    onChange={() => handleFilterChange('error')}
                                />
                                {t('workPolicy.import.error')} ({invalidData.length})
                            </label>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th className={styles.stickyCol}>{t('workPolicy.import.id')}<span className={styles.required}>*</span></th>
                                        <th className={styles.stickyCol}>{t('workPolicy.import.name')}<span className={styles.required}>*</span></th>
                                        <th>{t('workPolicy.workPolicy')}<span className={styles.required}>*</span></th>
                                        <th>{t('workPolicy.startDate')}<span className={styles.required}>*</span></th>
                                        <th>{t('workPolicy.endDate')}<span className={styles.required}>*</span></th>
                                        <th>{importType === 0 ? t('workPolicy.roster') : t('workPolicy.calendar')}<span className={styles.required}>*</span></th>
                                        <th>{t('workPolicy.countingPublicHoliday')}<span className={styles.required}>*</span></th>
                                        {headerColumns.map((col, idx) => (
                                            <th key={idx} style={{ minWidth: '60px', textAlign: 'center' }}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(filterType === 'valid' ? validData : invalidData).map((row, idx) => (
                                        <tr key={idx} className={row.is_error ? styles.invalidRow : ''}>
                                            <td className={styles.stickyCol} title={row.eid_error}>{row.eid}</td>
                                            <td className={styles.stickyCol} title={row.name_error}>{row.name}</td>
                                            <td title={row.workpolicysetup_error}>{row.workpolicysetup}</td>
                                            <td title={row.startdate_error}>{row.startdate}</td>
                                            <td title={row.enddate_error}>{row.enddate}</td>
                                            <td title={importType === 0 ? row.roster_error : row.calendar_error}>
                                                {importType === 0 ? row.roster : row.calendar}
                                            </td>
                                            <td title={row.countingpublicholiday_error}>{row.countingpublicholiday}</td>
                                            {headerColumns.map((_, hIdx) => (
                                                <td key={hIdx} style={{ textAlign: 'center' }} title={row[`shift${hIdx + 1}_error`]}>
                                                    {row[`shift${hIdx + 1}`]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className={styles.paginationPlaceholder}>
                            <span>« {t('workPolicy.prev')}</span>
                            <span className={styles.pageNumber}>1</span>
                            <span>{t('workPolicy.next')} »</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
