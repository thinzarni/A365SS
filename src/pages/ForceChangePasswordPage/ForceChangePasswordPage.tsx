import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import { toast } from 'react-hot-toast';
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy';
import styles from './ForceChangePasswordPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ForceChangePasswordPage() {
    const navigate = useNavigate();

    const tempToken = sessionStorage.getItem('temp_iam_token') || '';
    const tempUserId = sessionStorage.getItem('temp_user_id') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const { requirements, validatePassword } = usePasswordPolicy();

    const allMet = requirements.length === 0 || requirements.every(r => r.check(newPassword));

    /** base64-encode a string */
    const b64 = (str: string) => btoa(unescape(encodeURIComponent(str)));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPassword.trim()) { toast.error('Please enter a new password.'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }

        const policyErr = validatePassword(newPassword);
        if (policyErr) { toast.error(policyErr); return; }

        setLoading(true);
        try {
            const res = await authClient.post('change-password', {
                user_id: tempUserId,
                old_password: '',
                new_password: b64(newPassword),
                confirm_password: b64(confirmPassword),
                appid: APP_ID,
            }, {
                headers: { Authorization: `Bearer ${tempToken}` },
            });

            const status = res.data?.status ?? res.status;
            if (status === 200 || status === 201) {
                toast.success('Password changed. Please log in again.');
                sessionStorage.removeItem('temp_iam_token');
                sessionStorage.removeItem('temp_user_id');
                navigate('/login', { replace: true });
            } else {
                toast.error(res.data?.message || 'Failed to change password.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.iconWrap}><KeyRound size={32} /></div>
                    <h1 className={styles.title}>Change Your Password</h1>
                    <p className={styles.subtitle}>
                        For security, you must set a new password before continuing.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputWrap}>
                        <Input
                            id="new-password"
                            label="New Password"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                        />
                        <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* ── Password Requirements Checklist ── */}
                    {requirements.length > 0 && (
                        <div className={`${styles.requirementsCard} ${allMet ? styles.requirementsCard__met : ''}`}>
                            <p className={styles.requirementsTitle}>Password requirements</p>
                            {requirements.map((req, i) => {
                                const met = req.check(newPassword);
                                return (
                                    <div key={i} className={styles.requirementRow}>
                                        {met
                                            ? <CheckCircle2 size={14} className={styles.reqIcon__met} />
                                            : <Circle size={14} className={styles.reqIcon__unmet} />
                                        }
                                        <span className={met ? styles.reqLabel__met : styles.reqLabel__unmet}>
                                            {req.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className={styles.inputWrap}>
                        <Input
                            id="confirm-password"
                            label="Confirm Password"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                        />
                        <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className={styles.mismatch}>Passwords do not match</p>
                    )}

                    <Button type="submit" loading={loading} disabled={loading} className={styles.submitBtn}>
                        Set New Password
                    </Button>
                </form>
            </div>
        </div>
    );
}
