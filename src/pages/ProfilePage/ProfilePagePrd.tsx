import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Mail, Calendar, Briefcase, Award, CreditCard, Clock, Activity,
    Loader2, KeyRound, Eye, EyeOff, X, CheckCircle2, Circle,

    Building2, User, Phone, BookOpen, Users, MapPin, Plus, Trash2, Edit3,
    FileText, AlertCircle, Save, RotateCcw
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import authClient from '../../lib/auth-client';
import apiClient from '../../lib/api-client';
import { APP_ID } from '../../lib/auth-token';
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy';
import { Button, Input, ConfirmModal } from '../../components/ui';
import { toast } from 'react-hot-toast';
import {
    MENU_ITEMS,
    FAMILY_UPDATE, FAMILY_COMPARE,
    EXPERIENCE_UPDATE, EXPERIENCE_COMPARE,
    EMERGENCY_UPDATE, EMERGENCY_COMPARE,
    GET_SETUP_LIST, GET_EDUCATION_NAME,
    QUALIFICATION_COMPARE, QUALIFICATION_UPDATE,
    ADDRESS_UPDATE, ADDRESS_COMPARE,
    GET_DISTRICT_LIST,
    GET_TOWNSHIP_LIST,
    GET_CITY_LIST,
    GET_WARD_LIST,
    USER_PROFILE,
    USER_PROFILE_BY_ID
} from '../../config/api-routes';
import styles from './ProfilePagePrd.module.css';
import mainClient from '../../lib/main-client';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ──────────────────────────────────────────────────────────────
interface ProfileData {
    name: string;
    userid: string;
    eid: string;
    syskey: string;
    role: string;
    rank: string;
    ranksyskey?: string;
    dob: string;
    ic: string;
    nrcsr?: string | null;
    nrcregion?: string | null;
    nrctype?: string | null;
    nrcno?: string | null;
    gender?: string;
    maritalstatus: string;
    spouseworking?: string;
    joineddate: string;
    effectivedate: string;
    paylevel?: string | null;
    profile?: string;
    paycompany?: string;
    paycompanysyskey?: string;
    jobdescription?: string;
    officeemail?: string;
    department?: string;
    departmentsyskey?: string;
    employmenttype?: string;
    employmenttypesyskey?: string;
    officelocation?: string[] | string | null;
    officelocationsyskey?: string[] | string | null;
    worklocation?: string[] | string | null;
    worklocationsyskey?: string[] | string | null;
    roname?: string;
    serviceyearstring?: string;
    serviceyearnumeric?: string;
    nationalitytype?: string;
    nationalitytypesyskey?: string;
    nationality?: string;
    nationalitysyskey?: string;
    ethnicity?: string | null;
    ethnicitysyskey?: string;
    isnrcinput?: boolean;
    attendancevalidation?: boolean;
    generateqraccess?: number;
    employeeaccess?: number;
    profilestatus?: number;
    domains?: string[];
    hr_access?: boolean | number;
}

interface WorkExperience {
    id: string;
    organization: string;
    orgType: string;
    orgTypeDesc?: string;
    industry: string;
    industryDesc?: string;
    designation: string;
    fromdate: string;
    todate: string;
    salary: string;
    currency: string;
    currencyDesc?: string;
    reasonForChange: string;
    township?: string;
    townshipSyskey?: string;
    status?: string;
    modOption?: string;
    isdelete?: boolean;
}

interface Qualification {
    id: string;
    type: string;
    qualificationtype: string;
    description: string;
    educationname: string;
    university: string;
    year: string;
    country: string;
    fromdate: string;
    todate: string;
    isheight: string;
    status: string;
    modOption?: string;
    isdelete?: boolean;
}
interface Address {
    syskey: string;
    employeeid: string;
    address: string;
    postalcode: string;
    state: string;
    statesyskey: string;
    district: string;
    districtsyskey: string;
    township: string;
    townshipsyskey: string;
    city: string;
    citysyskey: string;
    ward: string;
    wardsyskey: string;
    country: string;
    countrysyskey: string;
    addressstatus: number;
    status: string;
    personalprimaryemail?: string;
    personalsecondarymail?: string;
    personalmobilephone?: string;
    modificationoption?: string;
    effectivedate?: string;
}


interface FamilyMember {
    id: string;
    name: string;
    gender: string;
    dob: string;
    relationship: string;
    relationshipSyskey?: string;
    taxEligible: 'Yes' | 'No';
    modOption: 'New' | 'Correct' | 'Update';
    effectiveFrom: string;
    status: string;
    attachment?: string;
    isdelete?: boolean;
}

interface EmergencyContact {
    id?: string;
    name: string;
    relationship: string;
    relationshipSyskey?: string;
    contactNumber: string;
    countryCode?: string;
    address: string;
    state?: string;
    stateSyskey?: string;
    township?: string;
    townshipSyskey?: string;
    city?: string;
    citySyskey?: string;
    country?: string;
    countrySyskey?: string;
    postalCode?: string;
    residentPhone?: string;
    residentPhoneCountryCode?: string;
    officePhone?: string;
    officePhoneCountryCode?: string;
    email?: string;
    facebook?: string;
    zip?: string;
    modOption?: string;
    effectiveFrom?: string;
    isdelete?: boolean;
    status?: string;
}

// ── Constants ──────────────────────────────────────────────────────────
const getTabs = (t: any) => [
    { id: 'employment', label: t('profile.tabs.employment'), icon: Briefcase },
    { id: 'personal', label: t('profile.tabs.personal'), icon: User },
    { id: 'emergency', label: t('profile.tabs.emergency'), icon: Phone },
    { id: 'experience', label: t('profile.tabs.experience'), icon: Building2 },
    { id: 'qualification', label: t('profile.tabs.qualification'), icon: BookOpen },
    { id: 'family', label: t('profile.tabs.family'), icon: Users },
    { id: 'contact', label: t('profile.tabs.contact'), icon: MapPin },
    { id: 'history', label: t('profile.tabs.history', 'Update History'), icon: Clock },
] as const;
type TabId = ReturnType<typeof getTabs>[number]['id'];

function useRelationships(isOpen: boolean) {
    const { domain, userId } = useAuthStore();
    const { data: relationships = [] } = useQuery({
        queryKey: ['relationships', userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(GET_SETUP_LIST, {
                userid: userId,
                domain: domain || 'demouat',
                tblname: 'relativetype'
            });
            const list = res.data?.datalist || [];
            return list.map((item: any) => ({
                syskey: item.syskey,
                name: item.description || item.code
            }));
        },
        enabled: !!userId && isOpen,
        staleTime: 5 * 60 * 1000,
    });
    return relationships;
}

function useCountryCodes(isOpen: boolean) {
    const { domain, userId } = useAuthStore();
    const { data: codes = [] } = useQuery({
        queryKey: ['countrycodes', userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(GET_SETUP_LIST, {
                userid: userId,
                domain: domain || 'demouat',
                tblname: 'countrycode'
            });
            const list = res.data?.datalist || [];
            return list.map((item: any) => ({
                syskey: item.syskey,
                code: item.code,
                name: item.description
            }));
        },
        enabled: !!userId && isOpen,
        staleTime: 5 * 60 * 1000,
    });
    return codes;
}
const NATIONALITIES = ['Myanmar', 'Chinese', 'Indian', 'Thai', 'Japanese', 'Korean', 'American', 'Other'];
const ETHNICITIES = ['Bamar', 'Shan', 'Karen', 'Rakhine', 'Mon', 'Karenni', 'Chin', 'Kachin', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const MOD_OPTIONS = ['New', 'Correct', 'Update'];

// ── Main Component ─────────────────────────────────────────────────────
export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, domain } = useAuthStore();
    const { userId: urlUserId } = useParams();

    const { data: menuData } = useQuery({
        queryKey: ['menu-items'],
        queryFn: async () => {
            const res = await apiClient.get(MENU_ITEMS);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const hasHrAccess = (menuData || []).some((m: any) => m.router === '/hrview' || m.router === '/employee');
    const [activeTab, setActiveTab] = useState<TabId>('employment');
    const TABS = getTabs(t);
    const isOwnProfile = !urlUserId || urlUserId === user?.userid;

    // Change password state
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    const { requirements, validatePassword } = usePasswordPolicy();
    const allMet = requirements.length === 0 || requirements.every(r => r.check(newPassword));

    useEffect(() => {
        if (showChangePwd) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showChangePwd]);

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
                user_id: userId, old_password: b64(oldPassword),
                new_password: b64(newPassword), confirm_password: b64(confirmPassword), appid: APP_ID,
            }, { headers: { Authorization: `Bearer ${token}` } });
            const status = res.data?.status ?? res.status;
            if (status === 200 || status === 201) { toast.success('Password changed successfully.'); closeModal(); }
            else { toast.error(res.data?.message || 'Failed to change password.'); }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to change password.');
        } finally { setPwdLoading(false); }
    };

    const { data: profile, isLoading, error } = useQuery<ProfileData | null>({
        queryKey: ['employee-profile', urlUserId || user?.usersyskey],
        queryFn: async () => {
            try {
                const endpoint = urlUserId ? USER_PROFILE_BY_ID : USER_PROFILE;
                const res = await mainClient.post(endpoint, {
                    userid: urlUserId || user?.userid
                });
                return res.data?.data ?? res.data ?? null;
            } catch (err) { console.error('Failed to fetch profile', err); return null; }
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className="animate-spin" size={40} style={{ color: '#3b82f6' }} />
                <p>{t('profile.loading')}</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className={styles.errorContainer}>
                <h2>{t('profile.errorTitle')}</h2>
                <p>{t('profile.errorSub')}</p>
            </div>
        );
    }

    const initials = profile.name
        ? profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{t('profile.title', 'My Profile')}</h1>
            </div>

            <div className={styles.profileWrapper}>
                {/* ── Left: Avatar + Tab Nav ── */}
                <div className={styles.sidePanel}>
                    {/* Avatar */}
                    <div className={styles.avatarCard}>
                        <div className={styles.avatarCircle}>
                            {profile.profile && !imgError
                                ? <img
                                    src={profile.profile}
                                    alt={profile.name}
                                    className={styles.avatarImage}
                                    onError={() => setImgError(true)}
                                />
                                : <span className={styles.avatarInitials}>{initials}</span>
                            }
                        </div>
                        <div className={styles.avatarInfo}>
                            <h2 className={styles.userName}>{profile.name || '-'}</h2>
                            <p className={styles.userRole}>{profile.rank || profile.role || user?.position || t('profile.employeeLabel')}</p>
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
                        {(isOwnProfile || hasHrAccess) && (
                            <div className={styles.settingsPanel}>
                                <p className={styles.settingsPanelTitle}>{t('profile.settings')}</p>
                                {isOwnProfile && (
                                    <button id="change-password-btn" className={styles.settingsItem} onClick={() => setShowChangePwd(true)}>
                                        <KeyRound size={16} /><span>{t('profile.changePassword')}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <nav className={styles.tabNav} aria-label="Profile sections">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                id={`tab-${tab.id}`}
                                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtn__active : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={16} className={styles.tabIcon} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className={styles.tabContent}>
                    {activeTab === 'employment' && <EmploymentTab profile={profile} />}
                    {activeTab === 'personal' && (
                        <PersonalTab
                            profile={profile}
                        />
                    )}
                    {activeTab === 'emergency' && <EmergencyContactTab profile={profile} />}
                    {activeTab === 'experience' && <WorkExperienceTab profile={profile} />}
                    {activeTab === 'qualification' && <QualificationTab profile={profile} />}
                    {activeTab === 'family' && <FamilyInfoTab profile={profile} />}
                    {activeTab === 'contact' && <ContactInfoTab profile={profile} />}
                    {activeTab === 'history' && <UpdateHistoryTab profile={profile} />}
                </div>
            </div>

            {/* ── Change Password Modal ── */}
            {showChangePwd && (
                <div className={styles.modalBackdrop} onClick={closeModal}>
                    <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalIconWrap}><KeyRound size={20} /></div>
                            <h2 className={styles.modalTitle}>{t('profile.changePassword')}</h2>
                            <button className={styles.modalClose} onClick={closeModal} aria-label="Close"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleChangePwd} className={styles.modalForm}>
                            <PwdInput id="old-pwd" label={t('profile.currentPassword')} value={oldPassword} onChange={setOldPassword} show={showOld} onToggle={() => setShowOld(v => !v)} />
                            <PwdInput id="new-pwd" label={t('profile.newPassword')} value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(v => !v)} />
                            {requirements.length > 0 && (
                                <div className={`${styles.requirementsCard} ${allMet ? styles.requirementsCard__met : ''}`}>
                                    <p className={styles.requirementsTitle}>{t('profile.passwordRequirements')}</p>
                                    {requirements.map((req, i) => {
                                        const met = req.check(newPassword);
                                        return (
                                            <div key={i} className={styles.requirementRow}>
                                                {met ? <CheckCircle2 size={14} className={styles.reqIcon__met} /> : <Circle size={14} className={styles.reqIcon__unmet} />}
                                                <span className={met ? styles.reqLabel__met : styles.reqLabel__unmet}>{req.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <PwdInput id="confirm-pwd" label={t('profile.confirmNewPassword')} value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                <p className={styles.mismatch}>{t('profile.mismatch')}</p>
                            )}
                            <div className={styles.modalActions}>
                                <Button type="button" variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
                                <Button type="submit" loading={pwdLoading} disabled={pwdLoading}>{t('profile.changePassword')}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 1 — Employment Profile (view only)
// ═══════════════════════════════════════════════════════════════════════
function EmploymentTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Briefcase size={20} />} title={t('profile.tabs.employment')} subtitle={t('profile.employment.subtitle')} />
            <div className={styles.infoGrid}>
                <InfoItem icon={<Building2 size={18} />} label={t('profile.employment.companyName')} value={profile.paycompany || '-'} />
                <InfoItem icon={<CreditCard size={18} />} label={t('profile.employment.employeeId')} value={profile.eid || '-'} />
                <InfoItem icon={<Briefcase size={18} />} label={t('profile.employment.employmentType')} value={profile.employmenttype || '-'} />
                <InfoItem icon={<Award size={18} />} label={t('profile.employment.jobPosition')} value={profile.rank || profile.role || '-'} />
                <InfoItem icon={<Award size={18} />} label={t('profile.employment.grade')} value={profile.paylevel || '-'} />
                <InfoItem icon={<Mail size={18} />} label={t('profile.employment.officeEmail')} value={profile.officeemail || '-'} />
                <InfoItem icon={<MapPin size={18} />} label={t('profile.employment.officeLocation')} value={Array.isArray(profile.officelocation) ? profile.officelocation.join(', ') : (profile.officelocation || '-')} />
                <InfoItem icon={<MapPin size={18} />} label={t('profile.employment.workLocation')} value={Array.isArray(profile.worklocation) ? profile.worklocation.join(', ') : (profile.worklocation || '-')} />
                <InfoItem icon={<Building2 size={18} />} label={t('profile.employment.department')} value={profile.department || '-'} />
                <InfoItem icon={<Calendar size={18} />} label={t('profile.employment.doj')} value={profile.joineddate || '-'} />
                <InfoItem icon={<Clock size={18} />} label={t('profile.employment.serviceYear')} value={profile.serviceyearstring || '-'} />
                <InfoItem icon={<User size={18} />} label={t('profile.employment.reportingManager')} value={profile.roname || '-'} />
            </div>
            {/* Job Description takes full width */}
            <div className={styles.fullWidthItem}>
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.infoIcon}><FileText size={18} /></div>
                    <div className={styles.infoContent}>
                        <div className={styles.infoLabel}>{t('profile.employment.jobDescription')}</div>
                        <div className={styles.infoValue}>{profile.jobdescription || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function calcAge(dob: string): string {
    if (!dob) return '';
    // Accepts dd/MM/yyyy or yyyy-MM-dd
    const parts = dob.includes('/') ? dob.split('/').reverse() : dob.split('-');
    const birth = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(birth.getTime())) return '';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years -= 1; months += 12; }
    if (years <= 0) return '';
    return months > 0 ? `${years} years ${months} months` : `${years} years`;
}

function PersonalTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState({
        dob: profile.dob || '',
        age: calcAge(profile.dob),
        nrc: profile.ic || '',
        maritalStatus: profile.maritalstatus || '',
        gender: profile.gender || '',
        nationality: profile.nationality || '',
        ethnicity: profile.ethnicity || '',
    });


    const cancel = () => setIsEditing(false);

    const save = () => {
        setIsEditing(false);
        toast.success(t('profile.personal.saveSuccess'));
    };

    const handleDraftChange = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setDraft(prev => ({ ...prev, [k]: e.target.value }));
    };

    return (
        <div className={styles.sectionCard}>
            <SectionHeader
                icon={<User size={20} />}
                title={t('profile.tabs.personal')}
                subtitle={t('profile.personal.viewSubtitle')}
            />

            {isEditing ? (
                <div className={styles.inlineForm} style={{ padding: '0 24px 24px' }}>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.personal.dob')}>
                            <input className={styles.formInput} type="date" value={draft.dob} onChange={handleDraftChange('dob')} />
                        </FormRow>
                        <FormRow label={t('profile.personal.age')}>
                            <input className={styles.formInput} value={draft.age} onChange={handleDraftChange('age')} readOnly style={{ backgroundColor: '#f9fafb' }} />
                        </FormRow>
                    </div>
                    <FormRow label={t('profile.personal.nrc')}>
                        <input className={styles.formInput} value={draft.nrc} onChange={handleDraftChange('nrc')} placeholder="xx/xxxxx(N)xxxxxx" />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.personal.maritalStatus')}>
                            <select className={styles.formSelect} value={draft.maritalStatus} onChange={handleDraftChange('maritalStatus')}>
                                <option value="">{t('profile.personal.selectStatus')}</option>
                                {MARITAL_STATUSES.map(m => <option key={m} value={m}>{t(`profile.options.marital.${m}` as const, m)}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.personal.gender')}>
                            <select className={styles.formSelect} value={draft.gender} onChange={handleDraftChange('gender')}>
                                <option value="">{t('profile.personal.selectGender')}</option>
                                {GENDERS.map(g => <option key={g} value={g}>{t(`profile.options.genders.${g}` as const, g)}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.personal.nationality')}>
                            <select className={styles.formSelect} value={draft.nationality} onChange={handleDraftChange('nationality')}>
                                <option value="">{t('profile.personal.selectNationality')}</option>
                                {NATIONALITIES.map(n => <option key={n} value={n}>{t(`profile.options.nationalities.${n}` as any, n)}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.personal.ethnicity')}>
                            <select className={styles.formSelect} value={draft.ethnicity} onChange={handleDraftChange('ethnicity')}>
                                <option value="">{t('profile.personal.selectEthnicity')}</option>
                                {ETHNICITIES.map(e => <option key={e} value={e}>{t(`profile.options.ethnicities.${e}` as any, e)}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <div className={styles.formActions} style={{ marginTop: 16 }}>
                        <button className={styles.btnGhost} onClick={cancel}>{t('common.cancel')}</button>
                        <button className={styles.btnPrimary} onClick={save}><Save size={14} /> {t('request.save')}</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.infoGrid}>
                        <InfoItem icon={<Calendar size={18} />} label={t('profile.personal.dob')} value={draft.dob} />
                        <InfoItem icon={<Clock size={18} />} label={t('profile.personal.age')} value={draft.age} />
                        <InfoItem icon={<CreditCard size={18} />} label={t('profile.personal.nrc')} value={draft.nrc} />
                        <InfoItem icon={<Activity size={18} />} label={t('profile.personal.maritalStatus')} value={t(`profile.options.marital.${draft.maritalStatus}` as any, draft.maritalStatus)} />
                        <InfoItem icon={<User size={18} />} label={t('profile.personal.gender')} value={t(`profile.options.genders.${draft.gender}` as any, draft.gender)} />
                        <InfoItem icon={<Award size={18} />} label={t('profile.personal.nationality')} value={t(`profile.options.nationalities.${draft.nationality}` as any, draft.nationality)} />
                        <InfoItem icon={<Award size={18} />} label={t('profile.personal.ethnicity')} value={t(`profile.options.ethnicities.${draft.ethnicity}` as any, draft.ethnicity)} />
                    </div>
                    <div className={styles.infoNotice}>
                        <AlertCircle size={14} />
                        <span>{t('profile.personal.noticeHR')}</span>
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 3 — Emergency Contact Details (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function EmergencyContactTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const { domain } = useAuthStore();
    const [records, setRecords] = useState<{ current: EmergencyContact[], pending: EmergencyContact[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const relationships = useRelationships(showModal);
    const countryCodes = useCountryCodes(showModal);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const blank = (): EmergencyContact => ({
        id: '', name: '', relationship: '', relationshipSyskey: '', countryCode: '', contactNumber: '', address: '',
        state: '', stateSyskey: '', township: '', townshipSyskey: '', city: '', citySyskey: '', country: '', countrySyskey: '',
        postalCode: '', residentPhone: '', residentPhoneCountryCode: '', officePhone: '', officePhoneCountryCode: '',
        email: '', facebook: '', zip: '',
        status: 'Pending', modOption: 'New', effectiveFrom: ''
    });
    const [form, setForm] = useState<EmergencyContact>(blank());
    const [focusedField, setFocusedField] = useState<'contact' | 'resident' | 'office' | null>(null);
    const fv = (k: keyof EmergencyContact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value as any }));


    const { data: countries } = useQuery({
        queryKey: ['countries', domain],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/country`, {
                params: { userid: profile.userid, domain: domain || 'demouat' }
            });
            return res.data?.datalist || [];
        }
    });

    const { data: states } = useQuery({
        queryKey: ['states', domain],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/state`, {
                params: { userid: profile.userid, domain: domain || 'demouat' }
            });
            return res.data?.datalist || [];
        }
    });

    const { data: townships } = useQuery({
        queryKey: ['townships', domain, form.stateSyskey],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/township`, {
                params: {
                    userid: profile.userid,
                    domain: domain || 'demouat'
                }
            });
            return res.data?.datalist || [];
        }
    });

    const { data: cities } = useQuery({
        queryKey: ['cities', domain, form.stateSyskey, form.townshipSyskey],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/city`, {
                params: {
                    userid: profile.userid,
                    domain: domain || 'demouat',
                    statesyskey: form.stateSyskey,
                    townshipsyskey: form.townshipSyskey
                }
            });
            return res.data?.datalist || [];
        }
    });

    const { data: fetchedData, isLoading } = useQuery({
        queryKey: ['emergency', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(EMERGENCY_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey || item.orgrecordsyskey,
                name: item.name || '',
                relationship: item.relationship || '',
                relationshipSyskey: item.relationshipsyskey || item.relationship || '',
                countryCode: item.countrycode || '+95',
                contactNumber: item.contactnumber || '',
                address: item.address || '',
                state: item.state || '',
                stateSyskey: item.statesyskey || item.state || '',
                township: item.township || '',
                townshipSyskey: item.townshipsyskey || item.township || '',
                city: item.city || '',
                citySyskey: item.citysyskey || item.city || '',
                country: item.country || '',
                countrySyskey: item.countrysyskey || item.country || '',
                postalCode: item.zip || item.postalcode || '',
                zip: item.zip || item.postalcode || '',
                residentPhone: item.residentphone || '',
                residentPhoneCountryCode: item.residentphonecountrycode || item.countrycode || '+95',
                officePhone: item.officephone || '',
                officePhoneCountryCode: item.officephonecountrycode || '+95',
                email: item.email || '',
                facebook: item.facebook || '',
                status: item.status?.toString() === '1' ? 'Approved' : (item.status?.toString() === '2' ? 'Rejected' : 'Pending'),
                modOption: item.modificationoption || 'New',
                effectiveFrom: item.effectivedate && item.effectivedate.length === 8 ? `${item.effectivedate.substring(0, 4)}-${item.effectivedate.substring(4, 6)}-${item.effectivedate.substring(6, 8)}` : (item.effectivedate || ''),
                isdelete: !!item.isdelete
            })) as EmergencyContact[];

            return {
                current: processArr(res.data?.data?.current || []),
                pending: processArr(res.data?.data?.update || [])
            };
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);


    const openAdd = () => {
        if (records.pending.length >= 2) {
            toast.error('Emergency contact can be add max 2 person to pending');
            return;
        }
        setForm(blank());
        setEditingId(null);
        setShowModal(true);
    };
    const openEdit = (r: EmergencyContact) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, modOption: isCurrent ? 'Update' : r.modOption });
        setEditingId(r.id || null);
        setShowModal(true);
    };
    const close = () => { setShowModal(false); setEditingId(null); };

    const save = async () => {
        if (!form.name) { toast.error('Name is required'); return; }
        if (!form.relationshipSyskey) { toast.error('Relative Type is required'); return; }
        if (!form.countryCode) { toast.error('Mobile Country Code is required'); return; }
        if (!form.contactNumber) { toast.error('Mobile (Contact Number) is required'); return; }
        if (!form.stateSyskey) { toast.error('State is required'); return; }
        if (!form.townshipSyskey) { toast.error('Township is required'); return; }
        if (!form.citySyskey) { toast.error('City is required'); return; }
        if (!form.countrySyskey) { toast.error('Country is required'); return; }
        if (form.modOption !== 'Correct' && !form.effectiveFrom) { toast.error('Effective Date is required for New or Update'); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        newRecord.status = 'Pending';
        if (!isUpdate) {
            newRecord.id = Date.now().toString();
        }

        const updatedPending = isUpdate
            ? (records.pending.some(r => r.id === editingId)
                ? records.pending.map(r => r.id === editingId ? newRecord : r)
                : [...records.pending, newRecord])
            : [...records.pending, newRecord];

        const { domain } = useAuthStore.getState();
        const emergencylist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
            name: r.name,
            relationship: r.relationshipSyskey || r.relationship,
            countrycode: r.countryCode || '+95',
            contactnumber: r.contactNumber,
            address: r.address,
            state: r.stateSyskey || r.state,
            township: r.townshipSyskey || r.township,
            city: r.citySyskey || r.city,
            country: r.countrySyskey || r.country,
            postalcode: r.postalCode || r.zip,
            zip: r.zip || r.postalCode,
            residentphone: r.residentPhone,
            residentphonecountrycode: r.residentPhoneCountryCode,
            officephone: r.officePhone,
            officephonecountrycode: r.officePhoneCountryCode,
            email: r.email,
            facebook: r.facebook,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            status: r.status === 'Approved' ? "1" : "0",
            isdelete: !!r.isdelete
        }));

        try {
            await mainClient.post(EMERGENCY_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                emergencylist
            });
            if (isUpdate) {
                setRecords(prev => ({
                    current: prev.current,
                    pending: [...prev.pending.filter(r => r.id !== editingId), newRecord]
                }));
            } else {
                setRecords(prev => ({ ...prev, pending: [...prev.pending, newRecord] }));
            }
            close();
            toast.success(t('profile.emergency.saveSuccess'));
        } catch (err) {
            toast.error('Failed to save emergency contact');
        }
    };

    const remove = async (id?: string) => {
        if (!id) return;
        const isCurrent = records.current.some(r => r.id === id);
        const pendingRecord = records.pending.find(p => p.id === id);

        const isReverting = !!pendingRecord;
        let updatedPending: EmergencyContact[];
        if (pendingRecord) {
            updatedPending = records.pending.filter(r => r.id !== id);
        } else if (isCurrent) {
            const recordToDelete = records.current.find(r => r.id === id);
            if (!recordToDelete) return;
            updatedPending = [...records.pending, { ...recordToDelete, isdelete: true, modOption: 'Correct', status: 'Pending' }];
        } else {
            return;
        }

        const { domain } = useAuthStore.getState();
        const emergencylist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
            name: r.name,
            relationship: r.relationshipSyskey || r.relationship,
            countrycode: r.countryCode || '+95',
            contactnumber: r.contactNumber,
            address: r.address,
            state: r.stateSyskey || r.state,
            township: r.townshipSyskey || r.township,
            city: r.citySyskey || r.city,
            country: r.countrySyskey || r.country,
            postalcode: r.postalCode || r.zip,
            zip: r.zip || r.postalCode,
            residentphone: r.residentPhone,
            residentphonecountrycode: r.residentPhoneCountryCode,
            officephone: r.officePhone,
            officephonecountrycode: r.officePhoneCountryCode,
            email: r.email,
            facebook: r.facebook,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            status: r.status === 'Approved' ? '1' : "0",
            isdelete: !!r.isdelete,
        }));

        try {
            await mainClient.post(EMERGENCY_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                emergencylist
            });
            setRecords(prev => ({
                current: prev.current,
                pending: updatedPending
            }));
            toast.success(isReverting ? 'Reverted deletion' : 'Marked for deletion');
        } catch (err) {
            toast.error('Failed to update record');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Phone size={20} />} title={t('profile.tabs.emergency')} subtitle={t('profile.emergency.subtitle')}
                action={records.pending.length < 2 ? <button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('common.addContact')}</button> : undefined} />

            {records.current.length === 0 && records.pending.length === 0
                ? <EmptyState message={t('profile.emergency.noContact')} onAdd={openAdd} />
                : (
                    <>
                        {records.current.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ padding: '0 0 16px', fontWeight: 600, color: 'var(--color-neutral-800)', fontSize: '14px' }}>{t('common.currentRecords')}</div>
                                <div className={styles.contactsGrid}>
                                    {records.current.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel}>{t('profile.tabs.emergency')}</span>
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                    <button className={styles.iconBtn} onClick={() => remove(r.id)} title={t('request.delete')} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.name')}</span><span className={styles.contactFieldValue} style={{ fontWeight: 700 }}>{r.name}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.relationship')}</span><span className={styles.contactFieldValue}>{r.relationship && r.relationship !== 'null' ? t(`profile.options.relationships.${r.relationship}` as any, r.relationship) : '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.address')}</span><span className={styles.contactFieldValue}>{r.address || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.state')}</span><span className={styles.contactFieldValue}>{r.state || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.township')}</span><span className={styles.contactFieldValue}>{r.township || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.city')}</span><span className={styles.contactFieldValue}>{r.city || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.country')}</span><span className={styles.contactFieldValue}>{r.country || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.postalCode')}</span><span className={styles.contactFieldValue}>{r.postalCode || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.contactNumber')}</span><span className={styles.contactFieldValue}>{r.countryCode} {r.contactNumber}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.residentPhone')}</span><span className={styles.contactFieldValue}>{r.residentPhone || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.officePhone')}</span><span className={styles.contactFieldValue}>{r.officePhone || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.email')}</span><span className={styles.contactFieldValue}>{r.email || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.facebook')}</span><span className={styles.contactFieldValue}>{r.facebook || '-'}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {records.pending.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ padding: '0 0 16px', fontWeight: 600, color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    {t('common.pendingHRApproval')}
                                </div>
                                <div className={styles.contactsGrid}>
                                    {records.pending.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id} style={{
                                            backgroundColor: r.isdelete ? '#fff1f2' : '#fefce8',
                                            borderLeft: r.isdelete ? '4px solid #f43f5e' : '4px solid #eab308'
                                        }}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel} style={{ color: r.isdelete ? '#f43f5e' : '#b45309' }}>{t('profile.tabs.emergency')} (Pending)</span>
                                                <div className={styles.rowActions}>
                                                    {!r.isdelete && (
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                    )}
                                                    <button className={styles.iconBtn} onClick={() => remove(r.id)} title={r.isdelete ? "Revert" : t('request.delete')} style={{ color: r.isdelete ? '#475569' : '#ef4444' }}>
                                                        {r.isdelete ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.name')}</span><span className={styles.contactFieldValue} style={{ fontWeight: 700, textDecoration: r.isdelete ? 'line-through' : 'none', opacity: r.isdelete ? 0.6 : 1 }}>{r.name}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.relationship')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.relationship && r.relationship !== 'null' ? t(`profile.options.relationships.${r.relationship}` as any, r.relationship) : '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.address')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.address || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.state')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.state || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.township')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.township || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.city')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.city || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.country')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.country || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.postalCode')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.postalCode || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.contactNumber')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.countryCode} {r.contactNumber}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.residentPhone')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.residentPhone || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.officePhone')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.officePhone || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.email')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.email || '-'}</span></div>
                                            <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.facebook')}</span><span className={styles.contactFieldValue} style={{ opacity: r.isdelete ? 0.6 : 1 }}>{r.facebook || '-'}</span></div>
                                            <div style={{ marginTop: '12px' }}>
                                                <StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} isDelete={r.isdelete} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {showModal && (
                <FormModal title={editingId ? `${t('profile.emergency.edit')}` : `${t('profile.emergency.add')}`} onClose={close} onSave={save}>
                    <FormRow label={`${t('profile.emergency.name')} *`}>
                        <input className={styles.formInput} value={form.name} onChange={fv('name')} placeholder={t('profile.emergency.fullName')} />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={`${t('profile.emergency.relationship')} *`}>
                            <select className={styles.formSelect} value={form.relationshipSyskey || ''} onChange={e => {
                                const syskey = e.target.value;
                                const desc = relationships.find((r: any) => r.syskey === syskey)?.name || syskey;
                                setForm(prev => ({ ...prev, relationshipSyskey: syskey, relationship: desc }));
                            }}>
                                <option value="">{t('profile.emergency.selectRelationship')}</option>
                                {relationships.map((r: any) => <option key={r.syskey} value={r.syskey}>{r.name && r.name !== 'null' ? String(t(`profile.options.relationships.${r.name}` as any, r.name)) : String(r.name)}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.emergency.contactNumber')} *`}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    className={styles.formSelect}
                                    value={form.countryCode}
                                    onChange={fv('countryCode')}
                                    onFocus={() => setFocusedField('contact')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ flex: 0.5 }}
                                >
                                    <option value="">-</option>
                                    {countryCodes.map((c: any) => (
                                        <option key={c.syskey} value={c.code}>
                                            {focusedField === 'contact' ? `${c.code} (${c.name})` : c.code}
                                        </option>
                                    ))}
                                </select>
                                <input className={styles.formInput} style={{ flex: 1 }} value={form.contactNumber} onChange={fv('contactNumber')} placeholder="09-xxx-xxx-xxx" />
                            </div>
                        </FormRow>
                    </div>

                    <FormRow label={t('profile.emergency.address')}>
                        <textarea className={styles.formTextarea} value={form.address} onChange={fv('address')} placeholder={t('profile.emergency.fullAddress')} rows={2} />
                    </FormRow>

                    <div className={styles.formGrid2}>
                        <FormRow label={`${t('profile.emergency.state')} *`}>
                            <select className={styles.formSelect} value={form.stateSyskey} onChange={e => {
                                const syskey = e.target.value;
                                const desc = states?.find((s: any) => s.syskey === syskey)?.description || syskey;
                                setForm(prev => ({ ...prev, stateSyskey: syskey, state: desc, townshipSyskey: '', township: '', citySyskey: '', city: '' }));
                            }}>
                                <option value="">{t('profile.emergency.selectState')}</option>
                                {states?.map((s: any) => <option key={s.syskey} value={s.syskey}>{s.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.emergency.country')} *`}>
                            <select className={styles.formSelect} value={form.countrySyskey} onChange={e => {
                                const syskey = e.target.value;
                                const desc = countries?.find((c: any) => c.syskey === syskey)?.description || syskey;
                                setForm(prev => ({ ...prev, countrySyskey: syskey, country: desc }));
                            }}>
                                <option value="">{t('profile.emergency.selectCountry')}</option>
                                {countries?.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.emergency.township')} *`}>
                            <select className={styles.formSelect} value={form.townshipSyskey} onChange={e => {
                                const syskey = e.target.value;
                                const desc = townships?.find((t: any) => t.syskey === syskey)?.description || syskey;
                                setForm(prev => ({ ...prev, townshipSyskey: syskey, township: desc, citySyskey: '', city: '' }));
                            }}>
                                <option value="">{t('profile.emergency.selectTownship')}</option>
                                {townships?.map((t: any) => <option key={t.syskey} value={t.syskey}>{t.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.emergency.city')} *`}>
                            <select className={styles.formSelect} value={form.citySyskey} onChange={e => {
                                const syskey = e.target.value;
                                const desc = cities?.find((c: any) => c.syskey === syskey)?.description || syskey;
                                setForm(prev => ({ ...prev, citySyskey: syskey, city: desc }));
                            }}>
                                <option value="">{t('profile.emergency.selectCity')}</option>
                                {cities?.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.emergency.postalCode')}>
                            <input className={styles.formInput} value={form.postalCode} onChange={e => {
                                const val = e.target.value;
                                setForm(prev => ({ ...prev, postalCode: val, zip: val }));
                            }} placeholder="12345" />
                        </FormRow>
                        <FormRow label={t('profile.emergency.email')}>
                            <input className={styles.formInput} type="email" value={form.email} onChange={fv('email')} placeholder="email@example.com" />
                        </FormRow>
                        <FormRow label={t('profile.emergency.residentPhone')}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    className={styles.formSelect}
                                    value={form.residentPhoneCountryCode}
                                    onChange={fv('residentPhoneCountryCode')}
                                    onFocus={() => setFocusedField('resident')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ flex: 0.5 }}
                                >
                                    <option value="">-</option>
                                    {countryCodes.map((c: any) => (
                                        <option key={c.syskey} value={c.code}>
                                            {focusedField === 'resident' ? `${c.code} (${c.name})` : c.code}
                                        </option>
                                    ))}
                                </select>
                                <input className={styles.formInput} style={{ flex: 1 }} value={form.residentPhone} onChange={fv('residentPhone')} placeholder="01-xxxxxx" />
                            </div>
                        </FormRow>
                        <FormRow label={t('profile.emergency.officePhone')}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    className={styles.formSelect}
                                    value={form.officePhoneCountryCode}
                                    onChange={fv('officePhoneCountryCode')}
                                    onFocus={() => setFocusedField('office')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ flex: 0.5 }}
                                >
                                    <option value="">-</option>
                                    {countryCodes.map((c: any) => (
                                        <option key={c.syskey} value={c.code}>
                                            {focusedField === 'office' ? `${c.code} (${c.name})` : c.code}
                                        </option>
                                    ))}
                                </select>
                                <input className={styles.formInput} style={{ flex: 1 }} value={form.officePhone} onChange={fv('officePhone')} placeholder="01-xxxxxx" />
                            </div>
                        </FormRow>
                        <FormRow label={t('profile.emergency.facebook')}>
                            <input className={styles.formInput} value={form.facebook} onChange={fv('facebook')} placeholder="facebook.com/username" />
                        </FormRow>
                    </div>

                    <div className={styles.formGrid2}>
                        <FormRow label={`${t('profile.family.modOption', 'Modification Option')} *`}>
                            <select className={styles.formSelect} value={form.modOption} onChange={e => setForm(prev => ({ ...prev, modOption: e.target.value, effectiveFrom: e.target.value === 'Correct' ? '' : prev.effectiveFrom }))}>
                                {MOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.family.effectiveFrom', 'Effective Date')}${form.modOption !== 'Correct' ? ' *' : ''}`}>
                            <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} disabled={form.modOption === 'Correct'} />
                        </FormRow>
                    </div>
                </FormModal>
            )}

            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => { if (deleteTarget) { remove(deleteTarget); setDeleteTarget(null); } }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 4 — Work Experience (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function WorkExperienceTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<{ current: WorkExperience[], pending: WorkExperience[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: orgTypes = [] } = useQuery({
        queryKey: ['setup', 'org_type'],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_SETUP_LIST, { userid: profile.userid, domain: domain || 'demouat', tblname: 'org_type' });
            return res.data?.datalist || [];
        },
        enabled: showModal
    });

    const { data: industries = [] } = useQuery({
        queryKey: ['setup', 'industry'],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_SETUP_LIST, { userid: profile.userid, domain: domain || 'demouat', tblname: 'industry' });
            return res.data?.datalist || [];
        },
        enabled: showModal
    });

    const { data: currencies = [] } = useQuery({
        queryKey: ['setup', 'currency'],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_SETUP_LIST, { userid: profile.userid, domain: domain || 'demouat', tblname: 'currency' });
            return res.data?.datalist || [];
        },
        enabled: showModal
    });

    const { data: townships = [] } = useQuery({
        queryKey: ['setup', 'township'],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_SETUP_LIST, { userid: profile.userid, domain: domain || 'demouat', tblname: 'township' });
            return res.data?.datalist || [];
        },
        enabled: showModal
    });

    const { data: fetchedData, isLoading } = useQuery({
        queryKey: ['experience', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(EXPERIENCE_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const parseExpDate = (val: string) => {
                if (!val) return '';
                if (val.includes('/')) {
                    const parts = val.split('/');
                    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : val;
                }
                if (val.length >= 8) {
                    return `${val.substring(0, 4)}-${val.substring(4, 6)}-${val.substring(6, 8)}`;
                }
                if (val.length === 6) {
                    return `${val.substring(0, 4)}-${val.substring(4, 6)}-01`;
                }
                return val;
            };

            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey || item.orgrecordsyskey,
                organization: item.organization,
                orgType: item.organizationtypesyskey || item.organizationtype || '',
                orgTypeDesc: item.organizationtype || '',
                industry: item.industrysyskey || item.industry || '',
                industryDesc: item.industry || '',
                designation: item.designation,
                fromdate: parseExpDate(item.fromdate),
                todate: parseExpDate(item.todate),
                salary: item.previousmonthlysalary || '',
                currency: item.currencysyskey || item.currency || 'MMK',
                currencyDesc: item.currency || 'MMK',
                reasonForChange: item.reasonforchange || '',
                township: item.township || '',
                townshipSyskey: item.townshipsyskey || '',
                status: item.status?.toString() === '1' ? 'Approved' : (item.status?.toString() === '2' ? 'Rejected' : 'Pending'),
                modOption: item.modificationoption || 'New',
                isdelete: !!item.isdelete
            })) as WorkExperience[];

            return {
                current: processArr(res.data?.data?.current || []),
                pending: processArr(res.data?.data?.update || [])
            };
        },
        enabled: !!profile.userid && !!profile.eid
    });

    const displayExpDate = (val: string) => {
        if (!val) return '';
        if (val.includes('-')) {
            const parts = val.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            if (parts.length === 2) {
                return `01/${parts[1]}/${parts[0]}`;
            }
        }
        return val;
    };

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);

    const blankExp = (): WorkExperience => ({ id: '', organization: '', orgType: '', industry: '', designation: '', fromdate: '', todate: '', salary: '', currency: 'MMK', reasonForChange: '', township: '', status: 'Pending', modOption: 'New' });
    const [form, setForm] = useState<WorkExperience>(blankExp());

    const openAdd = () => { setForm(blankExp()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: WorkExperience) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, modOption: isCurrent ? 'Update' : (r.modOption || 'New') });
        setEditingId(r.id);
        setShowModal(true);
    };
    const closeExp = () => { setShowModal(false); setEditingId(null); };

    const saveExp = async () => {
        if (!form.organization) { toast.error(t('profile.experience.reqOrg')); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        if (!isUpdate) {
            newRecord.id = Date.now().toString();
            newRecord.status = 'Pending';
        }
        if (orgTypes.length) {
            const sel = orgTypes.find((o: any) => o.syskey === form.orgType);
            if (sel) newRecord.orgTypeDesc = sel.description;
        }
        if (industries.length) {
            const sel = industries.find((i: any) => i.syskey === form.industry);
            if (sel) newRecord.industryDesc = sel.description;
        }
        if (currencies.length) {
            const sel = currencies.find((c: any) => c.syskey === form.currency);
            if (sel) newRecord.currencyDesc = sel.description;
        }

        const updatedPending = isUpdate
            ? (records.pending.some(r => r.id === editingId)
                ? records.pending.map(r => r.id === editingId ? newRecord : r)
                : [...records.pending, newRecord])
            : [...records.pending, newRecord];

        const { domain } = useAuthStore.getState();
        const experiencelist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 15 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 15 && records.current.some(c => c.id === r.id) ? r.id : "",
            organization: r.organization,
            organizationtype: r.orgType || null,
            industry: r.industry || null,
            designation: r.designation,
            fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
            todate: r.todate ? r.todate.replace(/-/g, '') : '',
            previousmonthlysalary: r.salary ? r.salary.toString() : '',
            currency: r.currency || 'MMK',
            reasonforchange: r.reasonForChange || '',
            township: r.townshipSyskey || r.township || '',
            modificationoption: r.modOption,
            status: r.status === 'Approved' ? '1' : 0,
            isdelete: !!r.isdelete
        }));

        try {
            await mainClient.post(EXPERIENCE_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                experiencelist
            });
            if (isUpdate) {
                setRecords(prev => ({
                    current: prev.current.filter(r => r.id !== editingId),
                    pending: [...prev.pending.filter(r => r.id !== editingId), newRecord]
                }));
            } else {
                setRecords(prev => ({ ...prev, pending: [...prev.pending, newRecord] }));
            }
            closeExp();
            toast.success(isUpdate ? t('profile.experience.saveSuccessUpdate') : t('profile.experience.saveSuccessAdd'));
        } catch (err) {
            toast.error('Failed to save experience information');
        }
    };

    const removeExp = async (id: string) => {
        const isCurrent = records.current.some(r => r.id === id);
        const pendingRecord = records.pending.find(p => p.id === id);

        let updatedPending;
        if (pendingRecord) {
            updatedPending = records.pending.filter(r => r.id !== id);
        } else if (isCurrent) {
            const recordToDelete = records.current.find(r => r.id === id);
            if (!recordToDelete) return;
            updatedPending = [...records.pending, { ...recordToDelete, isdelete: true, modOption: 'Correct', status: 'Pending' }];
        } else {
            return;
        }

        const { domain } = useAuthStore.getState();
        const experiencelist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 15 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 15 && records.current.some(c => c.id === r.id) ? r.id : "",
            organization: r.organization,
            organizationtype: r.orgType || null,
            industry: r.industry || null,
            designation: r.designation,
            fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
            todate: r.todate ? r.todate.replace(/-/g, '') : '',
            previousmonthlysalary: r.salary ? r.salary.toString() : '',
            currency: r.currency || 'MMK',
            reasonforchange: r.reasonForChange || '',
            township: r.townshipSyskey || r.township || '',
            modificationoption: r.modOption,
            status: r.status === 'Approved' ? '1' : 0,
            isdelete: !!r.isdelete,
        }));

        try {
            await mainClient.post(EXPERIENCE_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                experiencelist
            });
            setRecords(prev => ({
                current: prev.current,
                pending: updatedPending
            }));
            toast.success(t('profile.experience.deleteSuccess', 'Pending record updated'));
        } catch (err) {
            toast.error('Failed to remove pending experience');
        }
    };

    const f = (k: keyof WorkExperience) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    if (isLoading) {
        return (
            <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Building2 size={20} />} title={t('profile.tabs.experience')} subtitle={t('profile.experience.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.experience.addBtn')}</button>} />

            {records.current.length === 0 && records.pending.length === 0
                ? <EmptyState message={t('profile.experience.noData')} onAdd={openAdd} />
                : (
                    <div style={{ padding: '24px' }}>
                        {/* Current Records Section */}
                        {records.current.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ padding: '0 0 16px', fontWeight: 600, color: 'var(--color-neutral-800)', fontSize: '14px' }}>{t('common.currentRecords')}</div>
                                <div className={styles.contactsGrid}>
                                    {records.current.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel}>{t('profile.tabs.experience')}</span>
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                    <button className={styles.iconBtn} onClick={() => removeExp(r.id)} title={t('request.delete')} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Job Description</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.designation}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Start Date</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{displayExpDate(r.fromdate)}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Township</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.township || '-'}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Position Held</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.designation}</span></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Salary</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.salary} {r.currencyDesc || currencies.find((c: any) => c.syskey === r.currency)?.description || r.currency}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>End Date</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{displayExpDate(r.todate) || 'Present'}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Company</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.organization}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Industry</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.industryDesc || industries.find((i: any) => i.syskey === r.industry)?.description || r.industry}</span></div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '16px' }}>
                                                <StatusBadge status="Approved" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Records Section */}
                        {records.pending.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ padding: '0 0 16px', fontWeight: 600, color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    {t('common.pendingHRApproval')}
                                </div>
                                <div className={styles.contactsGrid}>
                                    {records.pending.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id} style={{
                                            backgroundColor: r.isdelete ? '#fff1f2' : '#fefce8',
                                            borderLeft: r.isdelete ? '4px solid #f43f5e' : '4px solid #eab308'
                                        }}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel} style={{ color: r.isdelete ? '#f43f5e' : '#b45309' }}>{t('profile.tabs.experience')} (Pending)</span>
                                                <div className={styles.rowActions}>
                                                    {!r.isdelete && (
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                    )}
                                                    <button className={styles.iconBtn} onClick={() => removeExp(r.id)} title={r.isdelete ? "Revert" : t('request.delete')} style={{ color: r.isdelete ? '#475569' : '#ef4444' }}>
                                                        {r.isdelete ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', opacity: r.isdelete ? 0.6 : 1 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Job Description</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.designation}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Start Date</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{displayExpDate(r.fromdate)}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Township</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.township || '-'}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Position Held</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.designation}</span></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Salary</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.salary} {r.currencyDesc || currencies.find((c: any) => c.syskey === r.currency)?.description || r.currency}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>End Date</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{displayExpDate(r.todate) || 'Present'}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Company</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.organization}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Industry</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.industryDesc || industries.find((i: any) => i.syskey === r.industry)?.description || r.industry}</span></div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '16px' }}>
                                                <StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} isDelete={r.isdelete} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            {showModal && (
                <FormModal title={editingId ? t('profile.experience.modalEdit') : t('profile.experience.modalAdd')} onClose={closeExp} onSave={saveExp}>
                    <FormRow label={t('profile.experience.org')}>
                        <input className={styles.formInput} value={form.organization} onChange={f('organization')} placeholder={t('profile.experience.orgPlaceholder')} />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.experience.orgType')}>
                            <select className={styles.formSelect} value={form.orgType} onChange={f('orgType')}>
                                <option value="">{t('profile.experience.selectType')}</option>
                                {orgTypes.map((o: any) => <option key={o.syskey} value={o.syskey}>{o.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.experience.industry')}>
                            <select className={styles.formSelect} value={form.industry} onChange={f('industry')}>
                                <option value="">{t('profile.experience.selectIndustry')}</option>
                                {industries.map((o: any) => <option key={o.syskey} value={o.syskey}>{o.description}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <FormRow label={t('profile.experience.designation')}>
                        <input className={styles.formInput} value={form.designation} onChange={f('designation')} placeholder={t('profile.experience.rolePlaceholder')} />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.experience.fromDate')}>
                            <input className={styles.formInput} type="date" value={form.fromdate} onChange={f('fromdate')} />
                        </FormRow>
                        <FormRow label={t('profile.experience.toDate')}>
                            <input className={styles.formInput} type="date" value={form.todate} onChange={f('todate')} />
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.experience.salary')}>
                            <input className={styles.formInput} type="number" value={form.salary} onChange={f('salary')} placeholder="0" />
                        </FormRow>
                        <FormRow label={t('profile.experience.currency')}>
                            <select className={styles.formSelect} value={form.currency} onChange={f('currency')}>
                                {currencies.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <FormRow label="Township">
                        <select className={styles.formSelect} value={form.townshipSyskey || form.township} onChange={f('township')}>
                            <option value="">Select Township</option>
                            {townships.map((t: any) => <option key={t.syskey} value={t.syskey}>{t.description}</option>)}
                        </select>
                    </FormRow>
                    <FormRow label={t('profile.experience.reason')}>
                        <textarea className={styles.formTextarea} value={form.reasonForChange} onChange={f('reasonForChange')} placeholder={t('profile.experience.reasonPlaceholder')} rows={3} />
                    </FormRow>
                </FormModal>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 5 — Qualification (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function QualificationTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<{ current: Qualification[], pending: Qualification[] }>({ current: [], pending: [] });
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const parseDateFromApi = (dateStr: string) => {
        if (!dateStr) return '';
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m}-${d}`;
    };

    const { data: fetchedData, isLoading } = useQuery({
        queryKey: ['qualification', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(QUALIFICATION_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey || item.orgrecordsyskey,
                type: item.type || 'Education',
                qualificationtype: item.qualificationtypesyskey || item.qualificationtype || 'Education',
                description: item.description || '',
                educationname: item.educationnamesyskey || item.educationname || '',
                _displayEduName: item.educationname || '',
                university: item.university || '',
                year: item.year || '',
                country: item.country || '',
                fromdate: parseDateFromApi(item.fromdate),
                todate: parseDateFromApi(item.todate),
                isheight: item.isheight?.toString() === 'true' ? 'true' : 'false',
                status: item.status?.toString() || '0',
                isdelete: !!item.isdelete
            })) as Qualification[];

            return {
                current: processArr(res.data?.data?.current || []),
                pending: processArr(res.data?.data?.update || [])
            };
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);

    const blank = (): Qualification => ({ id: '', type: 'Education', qualificationtype: 'Education', description: '', educationname: '', university: '', year: '', country: '', fromdate: '', todate: '', isheight: 'false', status: '0', modOption: 'New' });
    const [form, setForm] = useState<Qualification>(blank());
    const [showModal, setShowModal] = useState(false);

    const { data: qTypes = [] } = useQuery({
        queryKey: ['setup', 'qualificationtype'],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_SETUP_LIST, {
                userid: profile.userid,
                domain: domain || 'demouat',
                tblname: 'qualificationtype'
            });
            return res.data?.datalist || [];
        },
        enabled: showModal && form.type === 'Education'
    });

    const targetQualification = form.type === 'Education' ? form.qualificationtype : form.type;

    const { data: eduNames = [] } = useQuery({
        queryKey: ['setup', 'educationname', targetQualification],
        queryFn: async () => {
            if (!targetQualification) return [];
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_EDUCATION_NAME, {
                userid: profile.userid,
                domain: domain || 'demouat',
                qualification: targetQualification
            });
            return res.data?.datalist || [];
        },
        enabled: showModal && !!targetQualification
    });

    const { data: countries = [] } = useQuery({
        queryKey: ['setup', 'country'],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_SETUP_LIST, {
                userid: profile.userid,
                domain: domain || 'demouat',
                tblname: 'country'
            });
            return res.data?.datalist || [];
        },
        enabled: showModal
    });

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: Qualification) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, modOption: isCurrent ? 'Update' : (r.modOption || 'New') });
        setEditingId(r.id);
        setShowModal(true);
    };
    const close = () => { setShowModal(false); setEditingId(null); };

    const save = async () => {
        if (!form.description) { toast.error(t('profile.qualification.reqDegree', 'Description is required')); return; }

        const isUpdate = !!editingId;
        const newRecord: Qualification & { _displayEduName?: string } = { ...form };
        if (!isUpdate) {
            newRecord.id = Date.now().toString(); // Temporary ID, real syskey provided by backend
        }

        if (['Education', 'Certificate', 'Training'].includes(form.type)) {
            const selectedEdu = eduNames.find((e: any) => e.syskey === form.educationname);
            if (selectedEdu) {
                newRecord._displayEduName = selectedEdu.description || selectedEdu.code;
            }
        }

        const updatedPending = isUpdate
            ? (records.pending.some(r => r.id === editingId)
                ? records.pending.map(r => r.id === editingId ? newRecord : r)
                : [...records.pending, newRecord])
            : [...records.pending, newRecord];

        const { domain } = useAuthStore.getState();
        const qualificationlist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
            type: r.type,
            qualificationtype: r.qualificationtype,
            description: r.description,
            educationname: r.educationname,
            university: r.university,
            year: r.year,
            country: r.country,
            fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
            todate: r.todate ? r.todate.replace(/-/g, '') : '',
            ishighest: r.isheight,
            modificationoption: r.modOption,
            status: r.id.length < 20 ? "0" : r.status,
            isdelete: !!r.isdelete
        }));

        try {
            await mainClient.post(QUALIFICATION_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                qualificationlist
            });
            if (isUpdate) {
                setRecords(prev => ({
                    current: prev.current.filter(r => r.id !== editingId),
                    pending: [...prev.pending.filter(r => r.id !== editingId), newRecord]
                }));
            } else {
                setRecords(prev => ({ ...prev, pending: [...prev.pending, newRecord] }));
            }
            close();
            toast.success(isUpdate ? t('profile.qualification.saveSuccessUpdate') : t('profile.qualification.saveSuccessAdd'));
        } catch (err) {
            toast.error('Failed to save qualification information');
        }
    };

    const remove = async (id: string) => {
        const isCurrent = records.current.some(r => r.id === id);
        const pendingRecord = records.pending.find(p => p.id === id);

        let updatedPending;
        if (pendingRecord) {
            updatedPending = records.pending.filter(r => r.id !== id);
        } else if (isCurrent) {
            const recordToDelete = records.current.find(r => r.id === id);
            if (!recordToDelete) return;
            updatedPending = [...records.pending, { ...recordToDelete, isdelete: true, modOption: 'Correct', status: '0' }];
        } else {
            return;
        }

        const { domain } = useAuthStore.getState();
        const qualificationlist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
            type: r.type,
            qualificationtype: r.qualificationtype,
            description: r.description,
            educationname: r.educationname,
            university: r.university,
            year: r.year,
            country: r.country,
            fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
            todate: r.todate ? r.todate.replace(/-/g, '') : '',
            isheight: r.isheight,
            modificationoption: r.modOption,
            status: r.id.length < 20 ? "0" : r.status,
            isdelete: !!r.isdelete,
        }));

        try {
            await mainClient.post(QUALIFICATION_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                qualificationlist
            });
            setRecords(prev => ({
                current: prev.current,
                pending: updatedPending
            }));
            toast.success(t('profile.experience.removeSuccess'));
        } catch (err) {
            toast.error('Failed to remove qualification');
        }
    };
    const f = (k: keyof Qualification) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    if (isLoading) {
        return (
            <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<BookOpen size={20} />} title={t('profile.tabs.qualification')} subtitle={t('profile.qualification.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.qualification.addBtn')}</button>} />

            {records.current.length === 0 && records.pending.length === 0
                ? <EmptyState message={t('profile.qualification.noData')} onAdd={openAdd} />
                : (
                    <>
                        {records.current.length > 0 && (
                            <div className={styles.tableWrapper}>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: 'var(--color-neutral-800)' }}>{t('common.currentRecords')}</div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>{t('profile.qualification.type')}</th>
                                            <th>{t('profile.qualification.description')}</th>
                                            <th>{t('profile.qualification.institution')}</th>
                                            <th>{t('profile.qualification.periodYear')}</th>
                                            <th>{t('profile.qualification.highest')}</th>
                                            <th>{t('common.status')}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.current.map(r => (
                                            <tr key={r.id}>
                                                <td>{r.type}</td>
                                                <td><strong>{r.description}</strong></td>
                                                <td>{(r as any)._displayEduName || r.educationname} <br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.university}</small></td>
                                                <td className={styles.noWrap}>{formatDateForDisplay(r.fromdate)} → {formatDateForDisplay(r.todate) || t('profile.experience.present')}<br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.year && `Class of ${r.year}`}</small></td>
                                                <td>{r.isheight === 'true' ? 'Yes' : 'No'}</td>
                                                <td><StatusBadge status={r.status === '0' ? 'Pending' : 'Active'} /></td>
                                                <td>
                                                    <div className={styles.rowActions} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', transition: 'background 0.2s' }}
                                                            onClick={() => openEdit(r)}
                                                            onMouseOver={e => (e.currentTarget.style.background = '#eff6ff')}
                                                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            title={t('profile.personal.editHint')}
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', transition: 'background 0.2s' }}
                                                            onClick={() => setDeleteTarget(r.id || null)}
                                                            onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')}
                                                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            title={t('request.delete')}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {records.pending.length > 0 && (
                            <div className={styles.tableWrapper} style={{ marginTop: '24px', border: '1px solid var(--color-warning-200)' }}>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {t('common.pendingHRApproval')}
                                </div>
                                <table className={styles.table}>
                                    <thead style={{ background: 'var(--color-warning-50)' }}>
                                        <tr>
                                            <th>{t('profile.qualification.type')}</th>
                                            <th>{t('profile.qualification.description')}</th>
                                            <th>{t('profile.qualification.institution')}</th>
                                            <th>{t('profile.qualification.periodYear')}</th>
                                            <th>{t('profile.qualification.highest')}</th>
                                            <th>{t('common.status')}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.pending.map(r => (
                                            <tr key={r.id} style={{
                                                backgroundColor: r.isdelete ? '#fff1f2' : 'transparent',
                                                borderLeft: r.isdelete ? '4px solid #f43f5e' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.type}</td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}><strong>{r.description}</strong></td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{(r as any)._displayEduName || r.educationname} <br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.university}</small></td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }} className={styles.noWrap}>{formatDateForDisplay(r.fromdate)} → {formatDateForDisplay(r.todate) || t('profile.experience.present')}<br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.year && `Class of ${r.year}`}</small></td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.isheight === 'true' ? 'Yes' : 'No'}</td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} isDelete={r.isdelete} /></td>
                                                <td>
                                                    <div className={styles.rowActions} style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                                                        {!r.isdelete && (
                                                            <button
                                                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', transition: 'background 0.2s' }}
                                                                onClick={() => openEdit(r)}
                                                                onMouseOver={e => (e.currentTarget.style.background = '#eff6ff')}
                                                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                                title={t('profile.personal.editHint')}
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setDeleteTarget(r.id || null)}
                                                            title={r.isdelete ? "Cancel delete request" : t('request.delete')}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: r.isdelete ? '6px 12px' : '8px',
                                                                borderRadius: r.isdelete ? '9999px' : '50%',
                                                                backgroundColor: r.isdelete ? '#ffffff' : 'transparent',
                                                                color: r.isdelete ? '#475569' : '#ef4444',
                                                                border: r.isdelete ? '1px solid #e2e8f0' : 'none',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.025em',
                                                                cursor: 'pointer',
                                                                boxShadow: r.isdelete ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                                                                transition: 'all 0.2s',
                                                                outline: 'none',
                                                            }}
                                                            onMouseOver={e => {
                                                                if (r.isdelete) e.currentTarget.style.backgroundColor = '#f8fafc';
                                                                else e.currentTarget.style.backgroundColor = '#fef2f2';
                                                            }}
                                                            onMouseOut={e => {
                                                                if (r.isdelete) e.currentTarget.style.backgroundColor = '#ffffff';
                                                                else e.currentTarget.style.backgroundColor = 'transparent';
                                                            }}
                                                        >
                                                            {r.isdelete ? (
                                                                <>
                                                                    <RotateCcw size={14} />
                                                                    <span>Revert</span>
                                                                </>
                                                            ) : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )
            }

            {showModal && (
                <FormModal title={editingId ? t('profile.qualification.modalEdit') : t('profile.qualification.modalAdd')} onClose={close} onSave={save}>
                    <FormRow label={t('profile.qualification.type')}>
                        <select className={styles.formSelect} value={form.type} onChange={f('type')}>
                            <option value="Education">{t('profile.options.qualTypes.Education')}</option>
                            <option value="Certificate">{t('profile.options.qualTypes.Certificate')}</option>
                            <option value="Training">{t('profile.options.qualTypes.Training')}</option>
                        </select>
                    </FormRow>
                    {form.type === 'Education' &&
                        <FormRow label={t('profile.qualification.qualificationType')}>
                            <select className={styles.formSelect} value={form.qualificationtype} onChange={f('qualificationtype')}>
                                <option value="">{t('profile.qualification.selectQualificationType')}</option>
                                {qTypes.map((q: any) => (
                                    <option key={q.syskey} value={q.syskey}>{q.description}</option>
                                ))}
                            </select>
                        </FormRow>
                    }
                    <FormRow label={t('profile.qualification.educationName')}>
                        {['Education', 'Certificate', 'Training'].includes(form.type) ? (
                            <select className={styles.formSelect} value={form.educationname} onChange={f('educationname')}>
                                <option value="">{t('profile.qualification.selectEducationName')}</option>
                                {eduNames.map((e: any) => (
                                    <option key={e.syskey} value={e.syskey}>{e.description || e.code}</option>
                                ))}
                            </select>
                        ) : (
                            <input className={styles.formInput} value={form.educationname} onChange={f('educationname')} placeholder={t('profile.qualification.instPlaceholder', 'Institution name')} />
                        )}
                    </FormRow>
                    <FormRow label={t('profile.qualification.description', 'Description')}>
                        <input className={styles.formInput} value={form.description} onChange={f('description')} placeholder={t('profile.qualification.degreePlaceholder', 'e.g. Computer Science')} />
                    </FormRow>
                    <FormRow label={t('profile.qualification.universityOrInstitution', 'University/Institution')}>
                        <input className={styles.formInput} value={form.university} onChange={f('university')} placeholder={t('profile.qualification.instPlaceholder', 'University / College / School')} />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.qualification.year', 'Year')}>
                            <input className={styles.formInput} value={form.year} onChange={f('year')} type='number' placeholder="e.g. 2024" />
                        </FormRow>
                        <FormRow label={t('profile.qualification.country', 'Country')}>
                            <select className={styles.formSelect} value={form.country} onChange={f('country')}>
                                <option value="">{t('profile.qualification.selectCountry', 'Select Country...')}</option>
                                {countries.map((c: any) => (
                                    <option key={c.syskey} value={c.code}>{c.description}</option>
                                ))}
                            </select>
                        </FormRow>
                    </div>


                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.qualification.fromDate')}>
                            <input className={styles.formInput} type="date" value={form.fromdate} onChange={f('fromdate')} />
                        </FormRow>
                        <FormRow label={t('profile.qualification.toDate')}>
                            <input className={styles.formInput} type="date" value={form.todate} onChange={f('todate')} />
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.qualification.highestQualification')}>
                            <select className={styles.formSelect} value={form.isheight} onChange={f('isheight')}>
                                <option value="false">{t('profile.options.yesno.No')}</option>
                                <option value="true">{t('profile.options.yesno.Yes')}</option>
                            </select>
                        </FormRow>
                    </div>
                </FormModal>
            )}

            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => { if (deleteTarget) { remove(deleteTarget); setDeleteTarget(null); } }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 6 — Family Information for Tax Calculation (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function FamilyInfoTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<{ current: FamilyMember[], pending: FamilyMember[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const relationships = useRelationships(showModal);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const { data: fetchedData, isLoading } = useQuery({
        queryKey: ['family', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(FAMILY_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });

            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey || item.orgrecordsyskey,
                name: item.name,
                gender: item.gender,
                dob: item.dob && item.dob.length === 8 ? `${item.dob.substring(0, 4)}-${item.dob.substring(4, 6)}-${item.dob.substring(6, 8)}` : (item.dob || ''),
                relationship: item.relationship,
                relationshipSyskey: item.relationshipsyskey || item.relationship || '',
                taxEligible: (item.taxexeligibility || item.taxeligibility) ? 'Yes' : 'No',
                modOption: item.modificationoption || 'New',
                effectiveFrom: item.effectivedate && item.effectivedate.length === 8 ? `${item.effectivedate.substring(0, 4)}-${item.effectivedate.substring(4, 6)}-${item.effectivedate.substring(6, 8)}` : (item.effectivedate || ''),
                status: item.status?.toString() === '1' ? 'Approved' : (item.status?.toString() === '2' ? 'Rejected' : 'Pending'),
                attachment: item.signurl || item.attachment || '',
                isdelete: !!item.isdelete
            })) as FamilyMember[];

            return {
                current: processArr(res.data?.data?.current || []),
                pending: processArr(res.data?.data?.update || [])
            };
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);

    const blank = (): FamilyMember => ({ id: '', name: '', gender: '', dob: '', relationship: '', relationshipSyskey: '', taxEligible: 'No', modOption: 'New', effectiveFrom: '', status: 'Pending', attachment: '' });
    const [form, setForm] = useState<FamilyMember>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: FamilyMember) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, modOption: isCurrent ? 'Update' : r.modOption });
        setEditingId(r.id); setShowModal(true);
    };
    const close = () => { setShowModal(false); setEditingId(null); };
    const save = async () => {
        if (!form.name) { toast.error(t('profile.family.reqName')); return; }
        if (form.modOption !== 'Correct' && !form.effectiveFrom) { toast.error('Effective Date is required for New or Update'); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        newRecord.status = 'Pending';
        if (!isUpdate) {
            newRecord.id = Date.now().toString();
        }

        const updatedPending: FamilyMember[] = isUpdate
            ? (records.pending.some(r => r.id === editingId)
                ? records.pending.map(r => r.id === editingId ? newRecord : r)
                : [...records.pending, newRecord])
            : [...records.pending, newRecord];

        const { domain } = useAuthStore.getState();
        const familylist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
            name: r.name,
            gender: r.gender,
            dob: r.dob ? r.dob.replace(/-/g, '') : '',
            relationship: r.relationshipSyskey || r.relationship,
            taxexeligibility: r.taxEligible === 'Yes',
            attachment: r.attachment || null,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            familystatus: r.modOption === 'New' ? '1' : '0',
            status: r.status === 'Approved' ? '1' : '0',
            isdelete: !!r.isdelete,
        }));

        try {
            await mainClient.post(FAMILY_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                familylist
            });
            // Update local state by pushing to pending
            if (isUpdate) {
                setRecords(prev => ({
                    current: prev.current,
                    pending: [...prev.pending.filter(r => r.id !== editingId), newRecord]
                }));
            } else {
                setRecords(prev => ({ ...prev, pending: [...prev.pending, newRecord] }));
            }
            close();
            toast.success(isUpdate ? t('profile.family.saveSuccessUpdate') : t('profile.family.saveSuccessAdd'));
        } catch (err) {
            toast.error('Failed to save family information');
        }
    };
    const remove = async (id: string) => {
        const isCurrent = records.current.some(r => r.id === id);
        const pendingRecord = records.pending.find(p => p.id === id);

        let updatedPending: FamilyMember[];
        if (pendingRecord) {
            updatedPending = records.pending.filter(r => r.id !== id);
        } else if (isCurrent) {
            const recordToDelete = records.current.find(r => r.id === id);
            if (!recordToDelete) return;
            updatedPending = [...records.pending, { ...recordToDelete, isdelete: true, modOption: 'Correct', status: 'Pending' }];
        } else {
            return;
        }

        const { domain } = useAuthStore.getState();
        const familylist = updatedPending.map(r => ({
            name: r.name,
            gender: r.gender,
            dob: r.dob ? r.dob.replace(/-/g, '') : '',
            relationship: r.relationshipSyskey || r.relationship,
            taxexeligibility: r.taxEligible === 'Yes',
            attachment: r.attachment || null,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            familystatus: r.modOption === 'New' ? '1' : '0',
            status: r.status === 'Approved' ? '1' : '0',
            isdelete: !!r.isdelete,
        }));

        try {
            await mainClient.post(FAMILY_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                familylist
            });
            setRecords(prev => ({
                current: prev.current,
                pending: updatedPending
            }));
            toast.success(pendingRecord ? 'Pending request removed' : 'Marked for deletion');
        } catch (err) {
            toast.error('Failed to update family information');
        }
    };
    const fv = (k: keyof FamilyMember) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value as any }));

    if (isLoading) {
        return (
            <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Users size={20} />} title={t('profile.tabs.family')} subtitle={t('profile.family.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.family.addBtn')}</button>} />

            {records.current.length === 0 && records.pending.length === 0
                ? <EmptyState message={t('profile.family.noData')} onAdd={openAdd} />
                : (
                    <>
                        {records.current.length > 0 && (
                            <div className={styles.tableWrapper}>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: 'var(--color-neutral-800)' }}>{t('common.currentRecords')}</div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.personal.gender')}</th><th>{t('profile.personal.dob')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.family.taxEligible')}</th><th>{t('profile.family.status')}</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {records.current.map(r => (
                                            <tr key={r.id}>
                                                <td><strong>{r.name}</strong></td>
                                                <td>{t(`profile.options.genders.${r.gender}` as any, r.gender)}</td>
                                                <td>{r.dob}</td>
                                                <td>{r.relationship && r.relationship !== 'null' ? t(`profile.options.relationships.${r.relationship}` as any, r.relationship) : '-'}</td>
                                                <td><span className={r.taxEligible === 'Yes' ? styles.badgeGreen : styles.badgeGray}>{t(`profile.options.yesno.${r.taxEligible}` as any, r.taxEligible)}</span></td>
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        <StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status)} />
                                                        {r.isdelete && <span className="text-[10px] font-bold text-red-600 uppercase">Delete</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.rowActions} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginRight: '8px', padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>
                                                            {r.modOption || 'New'}
                                                        </span>
                                                        <button
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', transition: 'background 0.2s' }}
                                                            onClick={() => openEdit(r)}
                                                            onMouseOver={e => (e.currentTarget.style.background = '#eff6ff')}
                                                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            title={t('profile.personal.editHint')}
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', transition: 'background 0.2s' }}
                                                            onClick={() => setDeleteTarget(r.id || null)}
                                                            onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')}
                                                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                            title={t('request.delete')}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {records.pending.length > 0 && (
                            <div className={styles.tableWrapper} style={{ marginTop: '24px', border: '1px solid var(--color-warning-200)' }}>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {t('common.pendingHRApproval')}
                                </div>
                                <table className={styles.table}>
                                    <thead style={{ background: 'var(--color-warning-50)' }}>
                                        <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.personal.gender')}</th><th>{t('profile.personal.dob')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.family.taxEligible')}</th><th>{t('profile.family.status')}</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {records.pending.map(r => (
                                            <tr key={r.id} style={{
                                                backgroundColor: r.isdelete ? '#fff1f2' : 'transparent',
                                                borderLeft: r.isdelete ? '4px solid #f43f5e' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}><strong>{r.name}</strong></td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{t(`profile.options.genders.${r.gender}` as any, r.gender)}</td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.dob}</td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.relationship && r.relationship !== 'null' ? t(`profile.options.relationships.${r.relationship}` as any, r.relationship) : '-'}</td>
                                                <td style={{ opacity: r.isdelete ? 0.6 : 1, textDecoration: r.isdelete ? 'line-through' : 'none' }}><span className={r.taxEligible === 'Yes' ? styles.badgeGreen : styles.badgeGray}>{t(`profile.options.yesno.${r.taxEligible}` as any, r.taxEligible)}</span></td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status)} isDelete={r.isdelete} /></td>
                                                <td>
                                                    <div className={styles.rowActions} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#eab308', marginRight: '8px', padding: '2px 6px', background: '#fef08a', borderRadius: '4px' }}>
                                                            {r.modOption || 'New'}
                                                        </span>
                                                        {!r.isdelete && (
                                                            <button
                                                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', transition: 'background 0.2s' }}
                                                                onClick={() => openEdit(r)}
                                                                onMouseOver={e => (e.currentTarget.style.background = '#eff6ff')}
                                                                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                                title={t('profile.personal.editHint')}
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setDeleteTarget(r.id || null)}
                                                            title={r.isdelete ? "Cancel delete request" : t('request.delete')}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: r.isdelete ? '#64748b' : '#ef4444',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseOver={e => (e.currentTarget.style.background = r.isdelete ? '#f1f5f9' : '#fef2f2')}
                                                            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            {r.isdelete ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )
            }

            {showModal && (
                <FormModal title={editingId ? t('profile.family.modalEdit') : t('profile.family.modalAdd')} onClose={close} onSave={save}>
                    <FormRow label={`${t('profile.emergency.name')} *`}>
                        <input className={styles.formInput} value={form.name} onChange={fv('name')} placeholder={t('profile.emergency.fullName')} />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.personal.gender')}>
                            <select className={styles.formSelect} value={form.gender} onChange={fv('gender')}>
                                <option value="">{t('profile.personal.selectGender')}</option>
                                {GENDERS.map(g => <option key={g} value={g}>{t(`profile.options.genders.${g}` as any, g)}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.personal.dob')}>
                            <input className={styles.formInput} type="date" value={form.dob} onChange={fv('dob')} />
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.emergency.relationship')}>
                            <select className={styles.formSelect} value={form.relationshipSyskey || ''} onChange={e => {
                                const syskey = e.target.value;
                                const desc = relationships.find((r: any) => r.syskey === syskey)?.name || syskey;
                                setForm(prev => ({ ...prev, relationshipSyskey: syskey, relationship: desc }));
                            }}>
                                <option value="">{t('profile.emergency.selectRelationship')}</option>
                                {relationships.map((r: any) => <option key={r.syskey} value={r.syskey}>{String(t(`profile.options.relationships.${r.name}` as any, r.name))}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.family.taxEligible')}>
                            <select className={styles.formSelect} value={form.taxEligible} onChange={fv('taxEligible')}>
                                <option value="No">{t('profile.family.no')}</option>
                                <option value="Yes">{t('profile.family.yes')}</option>
                            </select>
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={`${t('profile.family.modOption')} *`}>
                            <select className={styles.formSelect} value={form.modOption} onChange={e => setForm(prev => ({ ...prev, modOption: e.target.value as any, effectiveFrom: e.target.value === 'Correct' ? '' : prev.effectiveFrom }))}>
                                {MOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.family.effectiveFrom')}${form.modOption !== 'Correct' ? ' *' : ''}`}>
                            <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} disabled={form.modOption === 'Correct'} />
                        </FormRow>
                    </div>
                    <FormRow label={`${t('profile.family.attachment')} *`}>
                        <input className={styles.formInput} type="file" accept=".pdf,.docx,.jpg,.png" onChange={e => setForm(prev => ({ ...prev, attachment: e.target.files?.[0]?.name || '' }))} />
                        {form.attachment && <p className={styles.fileHint}>Selected: {form.attachment}</p>}
                    </FormRow>
                </FormModal>
            )}

            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => { if (deleteTarget) { remove(deleteTarget); setDeleteTarget(null); } }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 7 — Contact Information (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function ContactInfoTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const { domain } = useAuthStore();
    const [records, setRecords] = useState<{ current: Address[], pending: Address[] }>({ current: [], pending: [] });
    const [isEditing, setIsEditing] = useState(false);

    const [contactDetails, setContactDetails] = useState({
        primaryEmail: '',
        secondaryEmail: '',
        primaryMobile: '',
        modOption: 'New',
        effectiveFrom: ''
    });

    const [form, setForm] = useState<{ permanent: Address, temporary: Address }>({
        permanent: {
            syskey: '', employeeid: '', address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 0, status: '0',
            statesyskey: '',
            districtsyskey: '',
            townshipsyskey: '',
            citysyskey: '',
            wardsyskey: '',
            countrysyskey: ''
        },
        temporary: {
            syskey: '', employeeid: '', address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 1, status: '0',
            statesyskey: '',
            districtsyskey: '',
            townshipsyskey: '',
            citysyskey: '',
            wardsyskey: '',
            countrysyskey: ''
        }
    });

    // Fetch countries for the dropdown
    const { data: countries } = useQuery({
        queryKey: ['countries', domain],
        queryFn: async () => {
            const res = await mainClient.post(GET_SETUP_LIST, {
                userid: profile.userid,
                domain: domain || 'demouat',
                tblname: 'country'
            });
            return res.data?.datalist || [];
        }
    });

    // Fetch states for the dropdown
    const { data: states } = useQuery({
        queryKey: ['states', domain],
        queryFn: async () => {
            const res = await mainClient.post(GET_SETUP_LIST, {
                userid: profile.userid,
                domain: domain || 'demouat',
                tblname: 'state'
            });
            return res.data?.datalist || [];
        }
    });

    // Locations for Permanent Address
    const { data: permDistricts } = useQuery({
        queryKey: ['districts', domain, form.permanent.statesyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_DISTRICT_LIST, { statesyskey: form.permanent.statesyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.permanent.statesyskey
    });
    const { data: permTownships } = useQuery({
        queryKey: ['townships', domain, form.permanent.statesyskey, form.permanent.districtsyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_TOWNSHIP_LIST, { statesyskey: form.permanent.statesyskey, districtsyskey: form.permanent.districtsyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.permanent.statesyskey && !!form.permanent.districtsyskey
    });

    // Locations for Temporary Address
    const { data: tempDistricts } = useQuery({
        queryKey: ['districts', domain, form.temporary.statesyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_DISTRICT_LIST, { statesyskey: form.temporary.statesyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.temporary.statesyskey
    });

    const { data: tempTownships } = useQuery({
        queryKey: ['townships', domain, form.temporary.statesyskey, form.temporary.districtsyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_TOWNSHIP_LIST, { statesyskey: form.temporary.statesyskey, districtsyskey: form.temporary.districtsyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.temporary.statesyskey && !!form.temporary.districtsyskey
    });

    // Cities for Permanent Address
    const { data: permCities } = useQuery({
        queryKey: ['cities', domain, form.permanent.statesyskey, form.permanent.districtsyskey, form.permanent.townshipsyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_CITY_LIST, { statesyskey: form.permanent.statesyskey, districtsyskey: form.permanent.districtsyskey, townshipsyskey: form.permanent.townshipsyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.permanent.statesyskey && !!form.permanent.districtsyskey && !!form.permanent.townshipsyskey
    });
    // Wards for Permanent Address
    const { data: permWards } = useQuery({
        queryKey: ['wards', domain, form.permanent.statesyskey, form.permanent.districtsyskey, form.permanent.townshipsyskey, form.permanent.citysyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_WARD_LIST, { statesyskey: form.permanent.statesyskey, districtsyskey: form.permanent.districtsyskey, townshipsyskey: form.permanent.townshipsyskey, citysyskey: form.permanent.citysyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.permanent.statesyskey && !!form.permanent.districtsyskey && !!form.permanent.townshipsyskey && !!form.permanent.citysyskey
    });

    // Cities for Temporary Address
    const { data: tempCities } = useQuery({
        queryKey: ['cities', domain, form.temporary.statesyskey, form.temporary.districtsyskey, form.temporary.townshipsyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_CITY_LIST, { statesyskey: form.temporary.statesyskey, districtsyskey: form.temporary.districtsyskey, townshipsyskey: form.temporary.townshipsyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.temporary.statesyskey && !!form.temporary.districtsyskey && !!form.temporary.townshipsyskey
    });
    // Wards for Temporary Address
    const { data: tempWards } = useQuery({
        queryKey: ['wards', domain, form.temporary.statesyskey, form.temporary.districtsyskey, form.temporary.townshipsyskey, form.temporary.citysyskey],
        queryFn: async () => {
            const res = await mainClient.post(GET_WARD_LIST, { statesyskey: form.temporary.statesyskey, districtsyskey: form.temporary.districtsyskey, townshipsyskey: form.temporary.townshipsyskey, citysyskey: form.temporary.citysyskey, domain: domain || 'demouat' });
            return res.data?.datalist || [];
        },
        enabled: !!form.temporary.statesyskey && !!form.temporary.districtsyskey && !!form.temporary.townshipsyskey && !!form.temporary.citysyskey
    });


    const { data: fetchedData, refetch, isLoading } = useQuery({
        queryKey: ['address', profile.userid, profile.eid],
        queryFn: async () => {
            const res = await mainClient.post(ADDRESS_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });

            const processArr = (arr: any[]) => (arr || []).map((item: any) => ({
                syskey: item.syskey || item.orgrecordsyskey,
                employeeid: item.employeeid,
                address: item.address,
                postalcode: item.postalcode,
                state: item.state || item.state,
                statesyskey: item.statesyskey || item.state,
                districtsyskey: item.districtsyskey || item.district,
                district: item.district || item.district,
                townshipsyskey: item.townshipsyskey || item.township,
                township: item.township || item.township,
                citysyskey: item.citysyskey || item.city,
                city: item.city || item.city,
                wardsyskey: item.wardsyskey || item.ward,
                ward: item.ward || item.ward,
                countrysyskey: item.countrysyskey || item.country,
                country: item.country || item.country,
                addressstatus: Number(item.addressstatus),
                status: item.status?.toString() || '0',
                personalprimaryemail: item.personalprimaryemail || item.personalprimaymail || '',
                personalsecondarymail: item.personalsecondarymail || '',
                personalmobilephone: item.personalmobilephone || '',
                modificationoption: item.modificationoption || '',
                effectivedate: item.effectivedate || ''
            })) as Address[];

            return {
                current: processArr(res.data?.data?.current || []),
                pending: processArr(res.data?.data?.update || [])
            };
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);

    const startEdit = () => {
        const curPerm = records.pending.find(a => a.addressstatus === 0) || records.current.find(a => a.addressstatus === 0);
        const curTemp = records.pending.find(a => a.addressstatus === 1) || records.current.find(a => a.addressstatus === 1);

        setForm({
            permanent: curPerm ? { ...curPerm } : { syskey: '', employeeid: profile.eid, address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 0, status: '0', statesyskey: '', districtsyskey: '', townshipsyskey: '', citysyskey: '', wardsyskey: '', countrysyskey: '' },
            temporary: curTemp ? { ...curTemp } : { syskey: '', employeeid: profile.eid, address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 1, status: '0', statesyskey: '', districtsyskey: '', townshipsyskey: '', citysyskey: '', wardsyskey: '', countrysyskey: '' }
        });

        const contactRef = (records.pending[0] || records.current[0] || {}) as any;
        const isCurrent = !records.pending[0] && !!records.current[0];
        setContactDetails({
            primaryEmail: contactRef.personalprimaryemail || '',
            secondaryEmail: contactRef.personalsecondarymail || '',
            primaryMobile: contactRef.personalmobilephone || '',
            modOption: isCurrent ? 'Update' : (contactRef.modificationoption || 'New'),
            effectiveFrom: contactRef.effectivedate && contactRef.effectivedate.length === 8 ? `${contactRef.effectivedate.substring(0, 4)}-${contactRef.effectivedate.substring(4, 6)}-${contactRef.effectivedate.substring(6, 8)}` : (contactRef.effectivedate || '')
        });

        setIsEditing(true);
    };

    const cancel = () => setIsEditing(false);

    const save = async () => {
        if (contactDetails.modOption !== 'Correct' && !contactDetails.effectiveFrom) { toast.error('Effective Date is required for New or Update'); return; }
        const toPayload = (addr: Address) => ({
            syskey: addr.syskey,
            employeeid: profile.eid,
            address: addr.address,
            postalcode: addr.postalcode,
            state: addr.statesyskey || '',
            district: addr.districtsyskey || '',
            township: addr.townshipsyskey || '',
            city: addr.citysyskey || '',
            ward: addr.wardsyskey || '',
            country: addr.countrysyskey || '',
            addressstatus: addr.addressstatus,
            modificationoption: contactDetails.modOption,
            effectivedate: contactDetails.effectiveFrom ? contactDetails.effectiveFrom.replace(/-/g, '') : '',
            status: '0'
        });
        const addressinfo = [toPayload(form.permanent), toPayload(form.temporary)];

        try {
            await mainClient.post(ADDRESS_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                addressinfo,
                personalprimaymail: contactDetails.primaryEmail,
                personalsecondarymail: contactDetails.secondaryEmail,
                personalmobilephone: contactDetails.primaryMobile
            });
            toast.success(t('profile.contact.saveSuccess'));
            setIsEditing(false);
            refetch();
        } catch (err) {
            toast.error('Failed to update address information');
        }
    };

    const updateAddr = (type: 'permanent' | 'temporary', field: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.value;
        setForm(prev => {
            const updated = { ...prev[type], [field]: val };

            // Sync Name and Syskey fields for cascading logic and form binding
            if (field === 'state') updated.statesyskey = val;
            if (field === 'district') updated.districtsyskey = val;
            if (field === 'township') updated.townshipsyskey = val;
            if (field === 'city') updated.citysyskey = val;
            if (field === 'ward') updated.wardsyskey = val;
            if (field === 'country') updated.countrysyskey = val;

            // Clear child fields when parent changes
            if (field === 'state' || field === 'statesyskey') {
                updated.district = '';
                updated.districtsyskey = '';
                updated.township = '';
                updated.townshipsyskey = '';
                updated.city = '';
                updated.citysyskey = '';
                updated.ward = '';
                updated.wardsyskey = '';
            } else if (field === 'district' || field === 'districtsyskey') {
                updated.township = '';
                updated.townshipsyskey = '';
                updated.city = '';
                updated.citysyskey = '';
                updated.ward = '';
                updated.wardsyskey = '';
            } else if (field === 'township' || field === 'townshipsyskey') {
                updated.city = '';
                updated.citysyskey = '';
                updated.ward = '';
                updated.wardsyskey = '';
            } else if (field === 'city' || field === 'citysyskey') {
                updated.ward = '';
                updated.wardsyskey = '';
            }

            return {
                ...prev,
                [type]: updated
            };
        });
    };

    const updateContact = (field: keyof typeof contactDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setContactDetails(prev => ({ ...prev, [field]: e.target.value }));
    };

    const renderAddressTable = (addrs: Address[], title: string, background: string = 'transparent') => {
        if (addrs.length === 0) return null;
        return (
            <div className={styles.tableWrapper} style={{ marginBottom: '24px' }}>
                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: background === 'transparent' ? 'var(--color-neutral-800)' : 'var(--color-warning-700)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {title}
                </div>
                <table className={styles.table}>
                    <thead style={{ background }}>
                        <tr>
                            <th>{t('profile.contact.type')}</th>
                            <th>{t('profile.contact.address')}</th>
                            <th>{t('profile.contact.cityWard')}</th>
                            <th>{t('profile.contact.districtTownship')}</th>
                            <th>{t('profile.contact.stateCountry')}</th>
                            {typeof background === 'string' && background !== 'transparent' && <th>{t('common.status')}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {addrs.map(a => (
                            <tr key={a.syskey || a.addressstatus}>
                                <td><strong>{a.addressstatus === 0 ? t('profile.contact.permanent') : t('profile.contact.current')}</strong></td>
                                <td>{a.address}</td>
                                <td>{a.city}{a.city && a.ward ? ' / ' : ''}{a.ward}</td>
                                <td>{(a.addressstatus === 0 ? permDistricts : tempDistricts)?.find((d: any) => d.syskey === a.district)?.description || a.district}{a.district && a.township ? ' / ' : ''}{(a.addressstatus === 0 ? permTownships : tempTownships)?.find((t: any) => t.syskey === a.township)?.description || a.township}</td>
                                <td>{states?.find((s: any) => s.syskey === a.state)?.description || a.state}{(a.state && a.country) ? ' / ' : ''}{countries?.find((c: any) => c.syskey === a.country)?.description || a.country}</td>
                                {typeof background === 'string' && background !== 'transparent' && <td><StatusBadge status={a.status} /></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<MapPin size={20} />} title={t('profile.tabs.contact')} subtitle={t('profile.contact.subtitle')}
                action={!isEditing
                    ? <button className={styles.editOutlineBtn} onClick={startEdit}><Edit3 size={14} /> {t('profile.personal.editHint')}</button>
                    : undefined
                }
            />

            {isEditing ? (
                <div className={styles.editForm}>
                    {/* Permanent Address */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <p className={styles.subSectionTitle} style={{ margin: 0 }}>{t('profile.contact.permanentAddress')}</p>
                        <span style={{ fontSize: '12px', background: 'var(--color-neutral-100)', padding: '2px 8px', borderRadius: '4px', color: 'var(--color-neutral-600)' }}>Status: 0</span>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.contact.state')}>
                            <select className={styles.formSelect} value={form.permanent.statesyskey} onChange={updateAddr('permanent', 'state')}>
                                <option value="">{t('profile.contact.selectState')}</option>
                                {states?.map((s: any) => <option key={s.syskey} value={s.syskey}>{s.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.country')}>
                            <select className={styles.formSelect} value={form.permanent.countrysyskey} onChange={updateAddr('permanent', 'country')}>
                                <option value="">{t('profile.contact.selectCountry')}</option>
                                {countries?.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.district')}>
                            <select className={styles.formSelect} value={form.permanent.districtsyskey} onChange={updateAddr('permanent', 'district')}>
                                <option value="">{t('profile.contact.selectDistrict')}</option>
                                {permDistricts?.map((d: any) => <option key={d.syskey} value={d.syskey}>{d.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.township')}>
                            <select className={styles.formSelect} value={form.permanent.townshipsyskey} onChange={updateAddr('permanent', 'township')}>
                                <option value="">{t('profile.contact.selectTownship')}</option>
                                {permTownships?.map((t: any) => <option key={t.syskey} value={t.syskey}>{t.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.city')}>
                            <select className={styles.formSelect} value={form.permanent.citysyskey} onChange={updateAddr('permanent', 'city')}>
                                <option value="">{t('profile.contact.selectCity')}</option>
                                {permCities?.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.ward')}>
                            <select className={styles.formSelect} value={form.permanent.wardsyskey} onChange={updateAddr('permanent', 'ward')}>
                                <option value="">{t('profile.contact.selectWard')}</option>
                                {permWards?.map((w: any) => <option key={w.syskey} value={w.syskey}>{w.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.addressDetails')} fullWidth>
                            <input className={styles.formInput} value={form.permanent.address} onChange={updateAddr('permanent', 'address')} placeholder={t('profile.contact.addressPlaceholder')} />
                        </FormRow>
                    </div>

                    {/* Current Address */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: 'var(--space-8)' }}>
                        <p className={styles.subSectionTitle} style={{ margin: 0 }}>{t('profile.contact.currentAddress')}</p>
                        <span style={{ fontSize: '12px', background: 'var(--color-neutral-100)', padding: '2px 8px', borderRadius: '4px', color: 'var(--color-neutral-600)' }}>Status: 1</span>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.contact.state')}>
                            <select className={styles.formSelect} value={form.temporary.statesyskey} onChange={updateAddr('temporary', 'state')}>
                                <option value="">{t('profile.contact.selectState')}</option>
                                {states?.map((s: any) => <option key={s.syskey} value={s.syskey}>{s.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.country')}>
                            <select className={styles.formSelect} value={form.temporary.countrysyskey} onChange={updateAddr('temporary', 'country')}>
                                <option value="">{t('profile.contact.selectCountry')}</option>
                                {countries?.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.district')}>
                            <select className={styles.formSelect} value={form.temporary.districtsyskey} onChange={updateAddr('temporary', 'district')}>
                                <option value="">{t('profile.contact.selectDistrict')}</option>
                                {tempDistricts?.map((d: any) => <option key={d.syskey} value={d.syskey}>{d.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.township')}>
                            <select className={styles.formSelect} value={form.temporary.townshipsyskey} onChange={updateAddr('temporary', 'township')}>
                                <option value="">{t('profile.contact.selectTownship')}</option>
                                {tempTownships?.map((t: any) => <option key={t.syskey} value={t.syskey}>{t.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.city')}>
                            <select className={styles.formSelect} value={form.temporary.citysyskey} onChange={updateAddr('temporary', 'city')}>
                                <option value="">{t('profile.contact.selectCity')}</option>
                                {tempCities?.map((c: any) => <option key={c.syskey} value={c.syskey}>{c.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.ward')}>
                            <select className={styles.formSelect} value={form.temporary.wardsyskey} onChange={updateAddr('temporary', 'ward')}>
                                <option value="">{t('profile.contact.selectWard')}</option>
                                {tempWards?.map((w: any) => <option key={w.syskey} value={w.syskey}>{w.description}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.addressDetails')} fullWidth>
                            <input className={styles.formInput} value={form.temporary.address} onChange={updateAddr('temporary', 'address')} placeholder={t('profile.contact.addressPlaceholder')} />
                        </FormRow>
                    </div>

                    {/* Email & Phone */}
                    <p className={styles.subSectionTitle} style={{ marginTop: 'var(--space-8)' }}>{t('profile.contact.contactDetails')}</p>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.contact.primaryEmail')}>
                            <input className={styles.formInput} type="email" value={contactDetails.primaryEmail} onChange={updateContact('primaryEmail')} placeholder="primary@email.com" />
                        </FormRow>
                        <FormRow label={t('profile.contact.secondaryEmail')}>
                            <input className={styles.formInput} type="email" value={contactDetails.secondaryEmail} onChange={updateContact('secondaryEmail')} placeholder="secondary@email.com" />
                        </FormRow>
                        <FormRow label={t('profile.contact.primaryMobile')}>
                            <input className={styles.formInput} type="tel" value={contactDetails.primaryMobile} onChange={updateContact('primaryMobile')} placeholder="09-xxx-xxx-xxx" />
                        </FormRow>

                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label={`${t('profile.family.modOption', 'Modification Option')} *`}>
                            <select className={styles.formSelect} value={contactDetails.modOption} onChange={e => setContactDetails(prev => ({ ...prev, modOption: e.target.value, effectiveFrom: e.target.value === 'Correct' ? '' : prev.effectiveFrom }))}>
                                {MOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={`${t('profile.family.effectiveFrom', 'Effective Date')}${contactDetails.modOption !== 'Correct' ? ' *' : ''}`}>
                            <input className={styles.formInput} type="date" value={contactDetails.effectiveFrom} onChange={updateContact('effectiveFrom')} disabled={contactDetails.modOption === 'Correct'} />
                        </FormRow>
                    </div>

                    <div className={styles.formActions} style={{ marginTop: 'var(--space-8)' }}>
                        <button className={styles.btnGhost} onClick={cancel}>{t('common.cancel')}</button>
                        <button className={styles.btnPrimary} onClick={save}><Save size={14} /> {t('request.save')}</button>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '0 16px 16px' }}>
                    {renderAddressTable(records.current, t('profile.contact.currentAddresses'))}
                    {renderAddressTable(records.pending, t('common.pendingHRApproval'), 'var(--color-warning-50)')}

                    {records.current.length === 0 && records.pending.length === 0 && (
                        <p className={styles.emptySlot} style={{ textAlign: 'center', padding: '24px' }}>{t('common.noData')}</p>
                    )}

                    <div className={styles.addressBlock} style={{ marginTop: '24px' }}>
                        <p className={styles.subSectionTitle}>Current Personal Contact Details</p>
                        <div className={styles.infoGrid}>
                            <InfoItem icon={<Mail size={18} />} label={t('profile.contact.primaryEmail')} value={records.current[0]?.personalprimaryemail || '-'} />
                            <InfoItem icon={<Mail size={18} />} label={t('profile.contact.secondaryEmail')} value={records.current[0]?.personalsecondarymail || '-'} />
                            <InfoItem icon={<Phone size={18} />} label={t('profile.contact.primaryMobile')} value={records.current[0]?.personalmobilephone || '-'} />
                        </div>
                    </div>

                    {records.pending.length > 0 && (
                        <div className={styles.addressBlock} style={{ marginTop: '24px', padding: '16px', background: 'var(--color-warning-50)', borderRadius: '8px', border: '1px solid var(--color-warning-200)' }}>
                            <p className={styles.subSectionTitle} style={{ color: 'var(--color-warning-700)' }}>{t('profile.contact.pendingContactDetails')}</p>
                            <div className={styles.infoGrid}>
                                <InfoItem icon={<Mail size={18} />} label={t('profile.contact.primaryEmail')} value={records.pending[0]?.personalprimaryemail || '-'} />
                                <InfoItem icon={<Mail size={18} />} label={t('profile.contact.secondaryEmail')} value={records.pending[0]?.personalsecondarymail || '-'} />
                                <InfoItem icon={<Phone size={18} />} label={t('profile.contact.primaryMobile')} value={records.pending[0]?.personalmobilephone || '-'} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function UpdateHistoryTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const { domain } = useAuthStore();

    const { data: updates = [], isLoading } = useQuery({
        queryKey: ['profile-updates', profile.userid],
        queryFn: async () => {
            const endpoints = [
                { id: 'family', url: FAMILY_COMPARE, label: t('profile.history.familyInfo') },
                { id: 'experience', url: EXPERIENCE_COMPARE, label: t('profile.history.workExperience') },
                { id: 'emergency', url: EMERGENCY_COMPARE, label: t('profile.history.emergencyContacts') },
                { id: 'qualification', url: QUALIFICATION_COMPARE, label: t('profile.history.qualification') },
                { id: 'address', url: ADDRESS_COMPARE, label: t('profile.history.addressContact') }
            ];

            const allUpdates: any[] = [];

            await Promise.all(endpoints.map(async (ep) => {
                try {
                    const res = await mainClient.post(ep.url, {
                        userid: profile.userid,
                        domain: domain || 'dev',
                        employeeid: profile.eid
                    });
                    const pending = res.data?.data?.update || [];
                    pending.forEach((p: any) => {
                        console.log(p);

                        allUpdates.push({
                            ...p,
                            category: ep.label,
                            categoryId: ep.id,
                            displayName: p.name || p.organization || p.educationname || p.address || 'Update'
                        });
                    });
                } catch (err) {
                    console.error(`Failed to fetch ${ep.label} updates`, err);
                }
            }));

            return allUpdates.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        }
    });

    if (isLoading) {
        return (
            <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.sectionCard}>
            <SectionHeader
                icon={<Clock size={20} />}
                title={t('profile.tabs.history')}
                subtitle={t('profile.history.subtitle')}
            />

            {updates.length === 0 ? (
                <div className={styles.emptyState}>
                    <AlertCircle size={36} className={styles.emptyStateIcon} />
                    <p>{t('profile.history.noData')}</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('profile.history.category')}</th>
                                <th>{t('profile.history.description')}</th>
                                <th>{t('profile.history.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {updates.map((up: any, idx: number) => (
                                <tr key={idx}>
                                    <td><span className={styles.badgeGray}>{up.category}</span></td>
                                    <td><strong>{up.displayName}</strong></td>
                                    <td><StatusBadge status={up.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}



// ═══════════════════════════════════════════════════════════════════════
// Shared sub-components
// ═══════════════════════════════════════════════════════════════════════

function SectionHeader({ icon, title, subtitle, action, status }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; status?: string | number }) {
    return (
        <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIconWrap}>{icon}</div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 className={styles.sectionTitle}>{title}</h2>
                        {status !== undefined && <StatusBadge status={status} />}
                    </div>
                    {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
                </div>
            </div>
            {action && <div>{action}</div>}
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


function FormRow({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
    return (
        <div className={`${styles.formRow} ${fullWidth ? styles.fullWidth : ''}`}>
            <label className={styles.formLabel}>{label}</label>
            {children}
        </div>
    );
}

function FormModal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
    const { t } = useTranslation();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalCard} style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{title}</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                <div className={styles.modalActions}>
                    <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button type="button" onClick={onSave}><Save size={14} style={{ marginRight: 4 }} /> {t('common.save')}</Button>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message, onAdd }: { message: string; onAdd: () => void }) {
    const { t } = useTranslation();
    return (
        <div className={styles.emptyState}>
            <FileText size={36} className={styles.emptyStateIcon} />
            <p>{message}</p>
            <button className={styles.addBtn} onClick={onAdd}><Plus size={15} /> {t('common.addNow')}</button>
        </div>
    );
}

function StatusBadge({ status, isDelete }: { status: string | number, isDelete?: boolean }) {
    const { t } = useTranslation();
    const s = status?.toString().toLowerCase();
    const isApproved = s === 'approved' || s === '1' || s === 'active';
    const isRejected = s === 'rejected' || s === '2';

    let className = styles.statusBadge__pending;
    let icon = <Clock size={12} />;
    let label = t('profile.options.status.Pending');

    if (isDelete) {
        className = styles.statusBadge__rejected;
        icon = <AlertCircle size={12} />;
        label = "Pending Delete";
    } else if (isApproved) {
        className = styles.statusBadge__approved;
        icon = <CheckCircle2 size={12} />;
        label = t('profile.options.status.Approved');
    } else if (isRejected) {
        className = styles.statusBadge__rejected;
        icon = <X size={12} />;
        label = t('profile.options.status.Rejected');
    }

    return (
        <span className={`${styles.statusBadge} ${className}`} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '9999px', fontWeight: 600, fontSize: '11px' }}>
            {icon}
            {label}
        </span>
    );
}

function PwdInput({ id, label, value, onChange, show, onToggle }: {
    id: string; label: string; value: string;
    onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
    return (
        <div style={{ position: 'relative' }}>
            <Input id={id} label={label} type={show ? 'text' : 'password'} value={value}
                onChange={e => onChange(e.target.value)} placeholder="••••••••" required />
            <button type="button" onClick={onToggle} tabIndex={-1}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(25%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-400)', display: 'flex', alignItems: 'center', padding: '4px' }}
                aria-label="Toggle visibility">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}
