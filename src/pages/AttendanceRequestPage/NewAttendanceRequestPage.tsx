import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { Textarea } from '../../components/ui/Input/Input';
import Select from '../../components/ui/Select/Select';
import { useAuthStore } from '../../stores/auth-store';
import mainClient from '../../lib/main-client';
import apiClient from '../../lib/api-client';
import {
    SAVE_ATTENDANCE_REQ,
    FILE_UPLOAD,
    PREPARE_IMPORT_ATTENDANCE_REQ,
    PREVIEW_IMPORT_ATTENDANCE_REQ,
    CONFIRM_IMPORT_ATTENDANCE_REQ,
    CLEAR_IMPORT_ATTENDANCE_REQ
} from '../../config/api-routes';
import styles from './AttendanceRequestPage.module.css';
import '../../styles/pages.css';

/* ── Date/time default helpers ── */
function todayStr(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function nowTimeStr(): string {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

export default function NewAttendanceRequestPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, domain } = useAuthStore();

    // ── State (mirrors mobile AttendanceRequestFormPage) ──
    const [type, setType] = useState('601'); // 601=Time In, 602=Time Out, 601,602=In/Out
    const [date, setDate] = useState(todayStr());
    const [intime, setIntime] = useState(nowTimeStr());
    const [outtime, setOuttime] = useState(nowTimeStr());
    const [reason, setReason] = useState('');

    const [importMode, setImportMode] = useState<'normal' | 'import'>('normal');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewTab, setPreviewTab] = useState<'invalid' | 'valid'>('invalid');

    const toApiDate = (d: string) => d ? d.replace(/-/g, '') : '';
    const toApi12hTime = (t: string) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
    };

    const submitMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                userid: user?.userid || '',
                domain: domain || 'demouat',
                syskey: '0',
                type,
                date: toApiDate(date),
                intime: (type === '601' || type === '601,602') ? toApi12hTime(intime) : '',
                outtime: (type === '602' || type === '601,602') ? toApi12hTime(outtime) : '',
                location: '0',
                latitude: '0',
                longitude: '0',
                description: reason,
                status: 1,
                approvedby: '',
                employee_syskey: user?.usersyskey || '0',
                employee_id: user?.userid || '',
                employee_name: user?.name || '',
                reasonType: 1,
            };

            const res = await mainClient.post(SAVE_ATTENDANCE_REQ, payload);
            const data = res.data;
            // The Main API might return status: 201 and message_code: "203" for success
            const isSuccess = data?.status === 201 || data?.statuscode === 200 || data?.statuscode === 300 || data?.message_code === "203";
            if (!isSuccess) {
                throw new Error(data?.message || t('common.error'));
            }
            return data;
        },
        onSuccess: () => {
            toast.success(t('request.submitSuccess'));
            navigate('/attendancerequest');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : t('common.error');
            toast.error(msg);
        },
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile) throw new Error('Please select a file');

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(selectedFile);
                reader.onload = async () => {
                    const base64String = (reader.result as string).split(',')[1];
                    try {
                        // 1. Upload File
                        const uploadPayload = {
                            base64filename: selectedFile.name,
                            base64String: base64String,
                            domain: domain || 'dev',
                            userid: user?.userid || ''
                        };
                        const uploadRes = await apiClient.post(FILE_UPLOAD, uploadPayload);
                        const uploadedFileName = uploadRes.data?.fileName;

                        if (!uploadedFileName) {
                            throw new Error(uploadRes.data?.message || 'File upload failed');
                        }

                        // 2. Prepare Import
                        const prepareRes = await mainClient.post(`${PREPARE_IMPORT_ATTENDANCE_REQ}?fileName=${uploadedFileName}`);
                        const prepareData = prepareRes.data?.data;
                        const batchid = prepareData?.batchid;

                        if (!batchid) {
                            throw new Error(prepareRes.data?.message || prepareData?.message || 'Failed to prepare import');
                        }

                        // 3. Preview Import
                        const previewPayload = {
                            userid: user?.userid || '',
                            domain: domain || 'dev',
                            type: '3',
                            currentPage: 1,
                            pageSize: 500
                        };
                        const previewRes = await mainClient.post(`${PREVIEW_IMPORT_ATTENDANCE_REQ}/${batchid}`, previewPayload);
                        const previewData = previewRes.data?.data;

                        if (!previewData) throw new Error('Failed to fetch preview data');

                        resolve({ batchid, ...previewData });
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
            toast.success('File processed successfully. Please review the records before confirming.');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : t('common.error');
            toast.error(msg);
        },
    });

    const confirmMutation = useMutation({
        mutationFn: async () => {
            if (!previewData?.batchid) throw new Error('No batch ready to import');
            // 4. Confirm Import
            const confirmRes = await mainClient.post(`${CONFIRM_IMPORT_ATTENDANCE_REQ}/${previewData.batchid}`);
            const confirmData = confirmRes.data;

            const isSuccess = confirmData?.status === 201 || confirmData?.statuscode === 200 || confirmData?.statuscode === 300 || confirmData?.message_code === "203" || confirmData?.data?.statuscode === 300;
            if (!isSuccess) {
                throw new Error(confirmData?.message || confirmData?.data?.message || t('common.error'));
            }

            return confirmData;
        },
        onSuccess: () => {
            toast.success(t('request.submitSuccess') || 'Import successful');
            navigate('/attendancerequest');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : t('common.error');
            toast.error(msg);
        },
    });

    const cancelImport = async () => {
        if (previewData?.batchid) {
            try {
                await mainClient.post(`${CLEAR_IMPORT_ATTENDANCE_REQ}/${previewData.batchid}`, {
                    userid: user?.userid || '',
                    domain: domain || 'dev'
                });
            } catch (err) {
                console.error('Clear failed', err);
            }
        }
        navigate('/attendancerequest');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (importMode === 'import') {
            if (!previewData) {
                if (!selectedFile) {
                    toast.error('Please select an Excel file to import');
                    return;
                }
                uploadMutation.mutate();
            } else {
                confirmMutation.mutate();
            }
        } else {
            if (!reason.trim()) {
                toast.error('Please provide a reason');
                return;
            }
            submitMutation.mutate();
        }
    };

    return (
        <div className={styles['new-request']}>
            <button className={styles['new-request__back']} onClick={() => navigate('/attendancerequest')}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className="page-header">
                <h1 className="page-header__title">New Attendance Request</h1>
                <p className="page-header__subtitle">Request manual time in/out overrides</p>
            </div>

            <div className={styles['mode-toggle']}>
                <button
                    type="button"
                    className={`${styles['mode-btn']} ${importMode === 'normal' ? styles['mode-btn--active'] : ''}`}
                    onClick={() => setImportMode('normal')}
                >
                    Normal Entry
                </button>
                <button
                    type="button"
                    className={`${styles['mode-btn']} ${importMode === 'import' ? styles['mode-btn--active'] : ''}`}
                    onClick={() => setImportMode('import')}
                >
                    Import from File
                </button>
            </div>

            <form className={styles['new-request__card']} onSubmit={handleSubmit}>
                {importMode === 'normal' ? (
                    <div className={styles['new-request__section']}>
                        <h3 className={styles['new-request__section-title']}>Details</h3>
                        <div className={styles['new-request__grid']}>
                            <div className={styles['new-request__full']}>
                                <Select
                                    id="type"
                                    label="Attendance Type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    options={[
                                        { value: '601', label: 'Time In' },
                                        { value: '602', label: 'Time Out' },
                                    ]}
                                />
                            </div>

                            <div className={styles['new-request__full']}>
                                <Input
                                    id="date"
                                    label="Date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            {(type === '601' || type === '601,602') && (
                                <Input
                                    id="intime"
                                    label="In Time"
                                    type="time"
                                    value={intime}
                                    onChange={(e) => setIntime(e.target.value)}
                                    required
                                />
                            )}

                            {(type === '602' || type === '601,602') && (
                                <Input
                                    id="outtime"
                                    label="Out Time"
                                    type="time"
                                    value={outtime}
                                    onChange={(e) => setOuttime(e.target.value)}
                                    required
                                />
                            )}

                            <div className={styles['new-request__full']}>
                                <Textarea
                                    id="reason"
                                    label="Reason / Description"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="State the reason for this manual override…"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles['new-request__section']}>
                        <h3 className={styles['new-request__section-title']}>Import Excel File</h3>
                        {!previewData ? (
                            <div className={styles['new-request__full']} style={{ marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-neutral-600)', marginBottom: '1rem' }}>
                                    Please select the downloaded template with your filled-in data to import.
                                </p>
                                <Input
                                    id="file-upload"
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    required
                                />
                                {selectedFile && (
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-primary-600)' }}>
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className={styles['new-request__full']}>
                                <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--color-neutral-200)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTab('invalid')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0.75rem 0',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            color: previewTab === 'invalid' ? 'var(--color-danger-700)' : 'var(--color-neutral-600)',
                                            fontWeight: previewTab === 'invalid' ? 600 : 400,
                                            borderBottom: previewTab === 'invalid' ? '2px solid var(--color-danger-500)' : '2px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        Invalid Records
                                        <span style={{
                                            background: previewTab === 'invalid' ? 'var(--color-danger-100)' : 'var(--color-neutral-100)',
                                            color: previewTab === 'invalid' ? 'var(--color-danger-700)' : 'var(--color-neutral-600)',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem'
                                        }}>{previewData.invalidCount || 0}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTab('valid')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0.75rem 0',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            color: previewTab === 'valid' ? 'var(--color-success-700)' : 'var(--color-neutral-600)',
                                            fontWeight: previewTab === 'valid' ? 600 : 400,
                                            borderBottom: previewTab === 'valid' ? '2px solid var(--color-success-500)' : '2px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        Valid Records
                                        <span style={{
                                            background: previewTab === 'valid' ? 'var(--color-success-100)' : 'var(--color-neutral-100)',
                                            color: previewTab === 'valid' ? 'var(--color-success-700)' : 'var(--color-neutral-600)',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem'
                                        }}>{previewData.validCount || 0}</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {previewTab === 'invalid' && (
                                        <div>
                                            {(previewData.invalidList && previewData.invalidList.length > 0) ? (
                                                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-danger-200)', borderRadius: 'var(--radius-md)' }}>
                                                    <table className="w-full text-left" style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                                                        <thead style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-800)', position: 'sticky', top: 0, zIndex: 1 }}>
                                                            <tr>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-danger-200)' }}>Employee</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-danger-200)' }}>Date</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-danger-200)' }}>Time</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-danger-200)' }}>Type</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-danger-200)' }}>Subtype</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-danger-200)' }}>Reason & Errors</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {previewData.invalidList.map((row: any, i: number) => {
                                                                const errors = Object.keys(row).filter(k => k.endsWith('_error') && row[k]).map(k => row[k]);
                                                                return (
                                                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-danger-100)', background: 'var(--color-neutral-0)' }}>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>{row.username} ({row.employeeid})</td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>{row.date}</td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>{row.time}</td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>{row.type === 601 ? 'Time In' : row.type === 602 ? 'Time Out' : 'In/Out'}</td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>{row.requesttype}</td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                                            {row.description}
                                                                            {errors.length > 0 ? (
                                                                                <ul style={{ color: 'var(--color-danger-600)', fontSize: '0.75rem', marginTop: '0.25rem', paddingLeft: '1rem', listStyleType: 'disc' }}>
                                                                                    {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                                                                                </ul>
                                                                            ) : (
                                                                                <div style={{ color: 'var(--color-danger-600)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Errors exist in this row.</div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-neutral-500)', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)' }}>
                                                    No invalid records.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {previewTab === 'valid' && (
                                        <div>
                                            {(previewData.validList && previewData.validList.length > 0) ? (
                                                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-success-200)', borderRadius: 'var(--radius-md)' }}>
                                                    <table className="w-full text-left" style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                                                        <thead style={{ background: 'var(--color-success-50)', color: 'var(--color-success-800)', position: 'sticky', top: 0, zIndex: 1 }}>
                                                            <tr>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-success-200)' }}>Employee</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-success-200)' }}>Date</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-success-200)' }}>Time</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-success-200)' }}>Type</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-success-200)' }}>Subtype</th>
                                                                <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-success-200)' }}>Reason</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {previewData.validList.map((row: any, i: number) => (
                                                                <tr key={i} style={{ borderBottom: '1px solid var(--color-success-100)', background: 'var(--color-neutral-0)' }}>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{row.username} ({row.employeeid})</td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{row.date}</td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{row.time}</td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{row.type === 601 ? 'Time In' : row.type === 602 ? 'Time Out' : 'In/Out'}</td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{row.requesttype}</td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{row.description}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-neutral-500)', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)' }}>
                                                    No valid records to import.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles['new-request__footer']}>
                    {importMode === 'import' && previewData ? (
                        <>
                            <Button type="button" variant="secondary" onClick={cancelImport}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" loading={confirmMutation.isPending} disabled={!previewData.validCount || previewData.validCount <= 0}>
                                Confirm Import
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="secondary" onClick={() => navigate('/attendancerequest')}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" loading={importMode === 'normal' ? submitMutation.isPending : uploadMutation.isPending}>
                                {importMode === 'normal' ? t('request.submit') : 'Upload & Preview'}
                            </Button>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}
