import { useState } from 'react';
import { Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import apiClient from '../../lib/api-client';
import { WORKPOLICY_EXPORT_TEMPLATE, PAYROLL_PERIOD, SETUP_ROSTER } from '../../config/api-routes';
import Modal from '../../components/ui/Modal/Modal';
import { Button } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import styles from './WorkPolicyImportModal.module.css'; // Re-use styles

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function WorkPolicyTemplateModal({ isOpen, onClose }: TemplateModalProps) {
    const { t } = useTranslation();
    const [importType, setImportType] = useState<0 | 1>(0); // 0 = Roster, 1 = Calendar
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Map UI import type to backend API type:
    // UI: 0 = Roster, 1 = Calendar
    // Backend: 0 = Roster, 2 = Calendar
    const getImportApiType = () => importType === 1 ? 2 : 0;

    // ── Fetch Periods for Export Template ──
    const { data: periods = [] } = useQuery({
        queryKey: ['setup', importType === 0 ? 'roster' : 'payroll-period'],
        queryFn: async () => {
            const url = importType === 0 ? SETUP_ROSTER : PAYROLL_PERIOD;
            try {
                const res = await apiClient.get(url);
                const list = res.data?.datalist || res.data?.data?.datalist || res.data?.data || res.data;
                return Array.isArray(list) ? list : [];
            } catch (err) {
                console.error('Failed to fetch periods', err);
                return [];
            }
        },
        enabled: isOpen
    });

    const handleExportTemplate = async () => {
        if (!selectedPeriod) {
            toast.error(t('workPolicy.import.selectPeriod'));
            return;
        }

        setIsExporting(true);
        try {
            const res = await apiClient.post(WORKPOLICY_EXPORT_TEMPLATE, {
                type: getImportApiType(),
                period: selectedPeriod
            });

            const { base64String, fileName } = res.data;
            if (!base64String) {
                toast.error(t('workPolicy.import.uploadFail'));
                return;
            }

            // Convert base64 to blob
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'WorkPolicy_Template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(t('workPolicy.import.downloadTemplate'));
        } catch (err) {
            console.error('Export failed', err);
            toast.error(t('workPolicy.saveFail'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        setSelectedPeriod('');
        onClose();
    };

    return (
        <Modal
            open={isOpen}
            onClose={handleClose}
            title={t('workPolicy.import.downloadTemplate')}
        >
            <div className={styles.container}>
                <div className={styles.uploadStep}>
                    <div className={styles.exportSection}>
                        <label className={styles.label}>{t('workPolicy.import.selectTypePeriod')}</label>

                        <div className={styles.typeToggle} style={{ marginBottom: '12px', display: 'flex', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                <input
                                    type="radio"
                                    name="importType"
                                    checked={importType === 0}
                                    onChange={() => { setImportType(0); setSelectedPeriod(''); }}
                                />
                                {t('workPolicy.import.rosterTemplate')}
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                <input
                                    type="radio"
                                    name="importType"
                                    checked={importType === 1}
                                    onChange={() => { setImportType(1); setSelectedPeriod(''); }}
                                />
                                {t('workPolicy.import.calendarTemplate')}
                            </label>
                        </div>

                        <div className={styles.exportRow}>
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
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <Button variant="secondary" onClick={handleClose}>
                        <X size={16} /> {t('workPolicy.cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleExportTemplate} loading={isExporting}>
                        <Download size={16} /> {t('workPolicy.import.downloadTemplate')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
