import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import apiClient from '../../lib/api-client';
import {
    WORKPOLICY_EXPORT_TEMPLATE,
    WORKPOLICY_EXPORT,
    PAYROLL_PERIOD,
    SETUP_ROSTER,
} from '../../config/api-routes';
import Modal from '../../components/ui/Modal/Modal';
import { Button } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth-store';
import styles from './WorkPolicyImportModal.module.css';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'policy' | 'employee';
    searchval?: string;
}

type ExportMode = 'template' | 'data';

export default function WorkPolicyExportModal({ isOpen, onClose, viewMode, searchval = '' }: ExportModalProps) {
    const { t } = useTranslation();
    const { userId, domain } = useAuthStore();

    const [exportMode, setExportMode] = useState<ExportMode>('template');
    const [templateType, setTemplateType] = useState<0 | 1>(0); // 0 = Roster, 1 = Calendar
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Backend type: Roster=0, Calendar=2
    const getTemplateApiType = () => templateType === 1 ? 2 : 0;

    // Fetch periods for template (roster list or payroll period list)
    const { data: periods = [] } = useQuery({
        queryKey: ['setup-export', templateType === 0 ? 'roster' : 'payroll-period'],
        queryFn: async () => {
            const url = templateType === 0 ? SETUP_ROSTER : PAYROLL_PERIOD;
            try {
                const res = await apiClient.get(url);
                const list = res.data?.datalist || res.data?.data?.datalist || res.data?.data || res.data;
                return Array.isArray(list) ? list : [];
            } catch (err) {
                console.error('Failed to fetch periods', err);
                return [];
            }
        },
        enabled: isOpen && exportMode === 'template'
    });

    const triggerDownload = (base64String: string, fileName: string) => {
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleDownload = async () => {
        setIsLoading(true);
        try {
            if (exportMode === 'template') {
                if (!selectedPeriod) {
                    toast.error(t('workPolicy.import.selectPeriod'));
                    return;
                }
                const res = await apiClient.post(WORKPOLICY_EXPORT_TEMPLATE, {
                    type: getTemplateApiType(),
                    period: selectedPeriod,
                });
                const { base64String, fileName } = res.data;
                if (!base64String) {
                    toast.error(t('workPolicy.import.uploadFail'));
                    return;
                }
                triggerDownload(base64String, fileName || 'WorkPolicy_Template.xlsx');
                toast.success(t('workPolicy.import.downloadTemplate'));
            } else {
                // Data export
                const isEmployeeView = viewMode === 'employee';
                const res = await apiClient.post(WORKPOLICY_EXPORT, {
                    order: isEmployeeView ? 'employee' : 'refno',
                    orderType: 'asc',
                    searchval,
                    pagesize: 1000,
                    currentpage: 1,
                    searchArray: [],
                    paycompany: '',
                    type: 2,
                    roster_calendar_type: '',
                    radiostatus: isEmployeeView ? '2' : '1',
                    userid: userId || '',
                    domain: domain || '',
                    supervised_userid: userId || '',
                });
                const { base64String, fileName } = res.data;
                if (!base64String) {
                    toast.error('Failed to export data');
                    return;
                }
                triggerDownload(base64String, fileName || 'WorkPolicy_Export.xlsx');
                toast.success('Data exported successfully!');
            }
            handleClose();
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Export failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedPeriod('');
        setExportMode('template');
        setTemplateType(0);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={handleClose} title="Export">
            <div className={styles.container}>
                {/* Mode toggle: Template | Data */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                        <input
                            type="radio"
                            name="exportMode"
                            checked={exportMode === 'template'}
                            onChange={() => { setExportMode('template'); setSelectedPeriod(''); }}
                        />
                        {t('workPolicy.import.downloadTemplate')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                        <input
                            type="radio"
                            name="exportMode"
                            checked={exportMode === 'data'}
                            onChange={() => setExportMode('data')}
                        />
                        Data
                    </label>

                    {/* Type dropdown — shown for Template mode */}
                    {exportMode === 'template' && (
                        <select
                            className={styles.select}
                            style={{ minWidth: '140px' }}
                            value={templateType}
                            onChange={(e) => { setTemplateType(Number(e.target.value) as 0 | 1); setSelectedPeriod(''); }}
                        >
                            <option value={0}>{t('workPolicy.roster')}</option>
                            <option value={1}>{t('workPolicy.calendar')}</option>
                        </select>
                    )}
                </div>

                {/* Period selector — only for Template mode */}
                {exportMode === 'template' && (
                    <div style={{ marginBottom: '20px' }}>
                        <label className={styles.label}>{t('workPolicy.import.selectPeriod')}</label>
                        <select
                            className={styles.select}
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option value="">{t('workPolicy.import.selectPeriod')}</option>
                            {periods.map((p: any) => (
                                <option key={p.syskey} value={p.syskey}>
                                    {p.code || p.description || p.desc || p.name || 'No Label'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Data mode info */}
                {exportMode === 'data' && (
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
                        Exports current <strong>{viewMode === 'policy' ? 'Policy' : 'Employee'}</strong> view as Excel.
                    </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Button variant="secondary" onClick={handleClose}>
                        {t('workPolicy.cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleDownload} loading={isLoading}>
                        <Download size={16} style={{ marginRight: '6px' }} />
                        Download
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
