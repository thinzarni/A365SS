import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, Calendar, Briefcase, Award, CreditCard, Clock, Activity, Loader2, KeyRound, Eye, EyeOff, X, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import mainClient from '../../lib/main-client';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy';
import { Button, Input } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { features } from '../../config/features';
import styles from './ProfilePage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ProfileData {
    name: string;
    userid: string;
    eid: string;
    syskey: string;
    role: string;
    rank: string;
    dob: string;
    ic: string;
    maritalstatus: string;
    joineddate: string;
    effectivedate: string;
    paylevel: string;
    profile?: string;
    paycompany?: string;
    domains?: string[];
}

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, domain } = useAuthStore();

    // ── Change Password modal state ──
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    const { requirements, validatePassword } = usePasswordPolicy();
    const allMet = requirements.length === 0 || requirements.every(r => r.check(newPassword));

    const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

    const closeModal = () => {
        setShowChangePwd(false);
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        setShowOld(false); setShowNew(false); setShowConfirm(false);
    };

    const handleChangePwd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword.trim()) { toast.error('Please enter your current password.'); return; }
        if (!newPassword.trim()) { toast.error('Please enter a new password.'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }

        const policyErr = validatePassword(newPassword);
        if (policyErr) { toast.error(policyErr); return; }

        setPwdLoading(true);
        try {
            const token = useAuthStore.getState().token;
            const userId = profile?.userid || useAuthStore.getState().userId || '';
            const res = await authClient.post('change-password', {
                user_id: userId,
                old_password: b64(oldPassword),
                new_password: b64(newPassword),
                confirm_password: b64(confirmPassword),
                appid: APP_ID,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const status = res.data?.status ?? res.status;
            if (status === 200 || status === 201) {
                toast.success('Password changed successfully.');
                closeModal();
            } else {
                toast.error(res.data?.message || 'Failed to change password.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to change password.');
        } finally {
            setPwdLoading(false);
        }
    };

    const { data: profile, isLoading, error } = useQuery<ProfileData | null>({
        queryKey: ['employee-profile', user?.usersyskey],
        queryFn: async () => {
            try {
                const res = await mainClient.post('api/employees/profile');
                return res.data?.data ?? res.data ?? null;
            } catch (err) {
                console.error('Failed to fetch profile', err);
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className="animate-spin" size={40} style={{ color: '#3b82f6' }} />
                <p>Loading profile...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className={styles.errorContainer}>
                <h2>Failed to load profile</h2>
                <p>There was an error communicating with the server.</p>
            </div>
        );
    }

    const initials = profile.name
        ? profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{t('profile', 'My Profile')}</h1>
            </div>

            <div className={styles.profileWrapper}>
                {/* ── Left Column: Avatar + Settings ── */}
                <div className={styles.avatarCard}>
                    <div className={styles.avatarCircle}>
                        {profile.profile ? (
                            <img src={profile.profile} alt={profile.name} className={styles.avatarImage} />
                        ) : (
                            <span className={styles.avatarInitials}>{initials}</span>
                        )}
                    </div>
                    <h2 className={styles.userName}>{profile.name || '-'}</h2>
                    <p className={styles.userRole}>{profile.rank || profile.role || user?.position || 'Employee'}</p>

                    <div className={styles.contactChips}>
                        <div className={styles.chip}>
                            <Briefcase size={14} />
                            <span>{profile.paycompany || user?.domainName || domain}</span>
                        </div>
                        {profile.userid && (
                            <div className={styles.chip}>
                                <Mail size={14} />
                                <span>{profile.userid}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Settings Panel ── */}
                    <div className={styles.settingsPanel}>
                        <p className={styles.settingsPanelTitle}>Settings</p>
                        {features.editProfile && (
                            <button
                                id="edit-profile-btn"
                                className={styles.settingsItem}
                                onClick={() => toast('Edit profile coming soon', { icon: '✏️' })}
                            >
                                <Pencil size={16} />
                                <span>Edit Profile</span>
                            </button>
                        )}
                        <button
                            id="change-password-btn"
                            className={styles.settingsItem}
                            onClick={() => setShowChangePwd(true)}
                        >
                            <KeyRound size={16} />
                            <span>Change Password</span>
                        </button>
                    </div>
                </div>

                {/* ── Right Column: Info Grid ── */}
                <div className={styles.detailsCard}>
                    <h3 className={styles.sectionTitle}>Personal Information</h3>
                    <div className={styles.infoGrid}>
                        <InfoItem icon={<Award size={18} />} label={t('username', 'Username')} value={profile.name} />
                        <InfoItem icon={<Mail size={18} />} label={`${t('email', 'Email')} / ${t('mobile', 'Mobile')}`} value={profile.userid} />
                        <InfoItem icon={<Briefcase size={18} />} label={t('rank', 'Rank')} value={profile.rank} />
                        <InfoItem icon={<CreditCard size={18} />} label={t('nrc', 'NRC')} value={profile.ic} />
                        <InfoItem icon={<Calendar size={18} />} label={t('dob', 'Date of Birth')} value={profile.dob} />
                        <InfoItem icon={<Activity size={18} />} label={t('marital_status', 'Marital Status')} value={profile.maritalstatus} />
                    </div>

                    <h3 className={styles.sectionTitle} style={{ marginTop: '32px' }}>Employment Details</h3>
                    <div className={styles.infoGrid}>
                        <InfoItem icon={<Calendar size={18} />} label={t('joined_date', 'Joined Date')} value={profile.joineddate} />
                        <InfoItem icon={<Clock size={18} />} label={t('effective_date', 'Effective Date')} value={profile.effectivedate} />
                        <InfoItem icon={<Award size={18} />} label={t('pay_level', 'Pay Level')} value={profile.paylevel} />
                    </div>
                </div>
            </div>

            {/* ── Change Password Modal ── */}
            {showChangePwd && (
                <div className={styles.modalBackdrop} onClick={closeModal}>
                    <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalIconWrap}><KeyRound size={20} /></div>
                            <h2 className={styles.modalTitle}>Change Password</h2>
                            <button className={styles.modalClose} onClick={closeModal} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePwd} className={styles.modalForm}>
                            <PwdInput
                                id="old-pwd" label="Current Password"
                                value={oldPassword} onChange={setOldPassword}
                                show={showOld} onToggle={() => setShowOld(v => !v)}
                            />
                            <PwdInput
                                id="new-pwd" label="New Password"
                                value={newPassword} onChange={setNewPassword}
                                show={showNew} onToggle={() => setShowNew(v => !v)}
                            />

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

                            <PwdInput
                                id="confirm-pwd" label="Confirm New Password"
                                value={confirmPassword} onChange={setConfirmPassword}
                                show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                            />

                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                <p className={styles.mismatch}>Passwords do not match</p>
                            )}

                            <div className={styles.modalActions}>
                                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                                <Button type="submit" loading={pwdLoading} disabled={pwdLoading}>
                                    Change Password
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
    return (
        <div className={styles.infoItem}>
            <div className={styles.infoIcon}>{icon}</div>
            <div className={styles.infoContent}>
                <div className={styles.infoLabel}>{label}</div>
                <div className={styles.infoValue}>{value || '-'}</div>
            </div>
        </div>
    );
}

function PwdInput({ id, label, value, onChange, show, onToggle }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
    return (
        <div style={{ position: 'relative' }}>
            <Input
                id={id}
                label={label}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="••••••••"
                required
            />
            <button
                type="button"
                onClick={onToggle}
                tabIndex={-1}
                style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(25%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--color-neutral-400)',
                    display: 'flex', alignItems: 'center', padding: '4px',
                }}
                aria-label="Toggle visibility"
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}
