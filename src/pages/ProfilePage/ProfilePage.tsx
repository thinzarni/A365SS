import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, Calendar, Briefcase, Award, CreditCard, Clock, Activity, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import mainClient from '../../lib/main-client';
import styles from './ProfilePage.module.css';

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
    profile?: string; // S3 Url or base64 equivalent
    paycompany?: string;
    domains?: string[];
}

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, domain } = useAuthStore();

    const { data: profile, isLoading, error } = useQuery<ProfileData | null>({
        queryKey: ['employee-profile', user?.usersyskey],
        queryFn: async () => {
            try {
                const res = await mainClient.post('api/employees/profile');
                return res.data?.data ?? res.data ?? null;
            } catch (err) {
                console.error("Failed to fetch profile", err);
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

    // Determine Initials
    const initials = profile.name
        ? profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{t('profile', 'My Profile')}</h1>
            </div>

            <div className={styles.profileWrapper}>
                {/* ── Left Column: Avatar Card ── */}
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
                </div>

                {/* ── Right Column: Info Grid ── */}
                <div className={styles.detailsCard}>
                    <h3 className={styles.sectionTitle}>Personal Information</h3>

                    <div className={styles.infoGrid}>
                        <InfoItem
                            icon={<Award size={18} />}
                            label={t('username', 'Username')}
                            value={profile.name}
                        />
                        <InfoItem
                            icon={<Mail size={18} />}
                            label={`${t('email', 'Email')} or ${t('mobile', 'Mobile')}`}
                            value={profile.userid}
                        />
                        <InfoItem
                            icon={<Briefcase size={18} />}
                            label={t('rank', 'Rank')}
                            value={profile.rank}
                        />
                        <InfoItem
                            icon={<CreditCard size={18} />}
                            label={t('nrc', 'NRC')}
                            value={profile.ic}
                        />
                        <InfoItem
                            icon={<Calendar size={18} />}
                            label={t('dob', 'Date of Birth')}
                            value={profile.dob}
                        />
                        <InfoItem
                            icon={<Activity size={18} />}
                            label={t('marital_status', 'Marital Status')}
                            value={profile.maritalstatus}
                        />
                    </div>

                    <h3 className={styles.sectionTitle} style={{ marginTop: '32px' }}>Employment Details</h3>

                    <div className={styles.infoGrid}>
                        <InfoItem
                            icon={<Calendar size={18} />}
                            label={t('joined_date', 'Joined Date')}
                            value={profile.joineddate}
                        />
                        <InfoItem
                            icon={<Clock size={18} />}
                            label={t('effective_date', 'Effective Date')}
                            value={profile.effectivedate}
                        />
                        <InfoItem
                            icon={<Award size={18} />}
                            label={t('pay_level', 'Pay Level')}
                            value={profile.paylevel}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
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
