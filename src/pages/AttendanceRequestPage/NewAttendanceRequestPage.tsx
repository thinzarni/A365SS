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
import { SAVE_ATTENDANCE_REQ } from '../../config/api-routes';
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

    // ── State ──
    const [type, setType] = useState('601'); // 601=Time In, 602=Time Out
    const [date, setDate] = useState(todayStr());
    const [intime, setIntime] = useState(nowTimeStr());
    const [outtime, setOuttime] = useState(nowTimeStr());
    const [reason, setReason] = useState('');

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
                intime: type === '601' ? toApi12hTime(intime) : '',
                outtime: type === '602' ? toApi12hTime(outtime) : '',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error('Please provide a reason');
            return;
        }
        submitMutation.mutate();
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

            <form className={styles['new-request__card']} onSubmit={handleSubmit}>
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

                        {type === '601' && (
                            <div className={styles['new-request__full']}>
                                <Input
                                    id="intime"
                                    label="In Time"
                                    type="time"
                                    value={intime}
                                    onChange={(e) => setIntime(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {type === '602' && (
                            <div className={styles['new-request__full']}>
                                <Input
                                    id="outtime"
                                    label="Out Time"
                                    type="time"
                                    value={outtime}
                                    onChange={(e) => setOuttime(e.target.value)}
                                    required
                                />
                            </div>
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

                <div className={styles['new-request__footer']}>
                    <Button type="button" variant="secondary" onClick={() => navigate('/attendancerequest')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" loading={submitMutation.isPending}>
                        {t('request.submit')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
