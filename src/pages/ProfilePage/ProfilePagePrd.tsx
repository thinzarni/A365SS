import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Mail, Calendar, Briefcase, Award, CreditCard, Clock, Activity,
    Loader2, KeyRound, Eye, EyeOff, X, CheckCircle2, Circle,

    Building2, User, Phone, BookOpen, Users, MapPin, Plus, Trash2, Edit3,
    FileText, AlertCircle, Save
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import authClient from '../../lib/auth-client';
import apiClient from '../../lib/api-client';
import { APP_ID } from '../../lib/auth-token';
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy';
import { Button, Input, ConfirmModal } from '../../components/ui';
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
    USER_PROFILE_BY_ID,
    FILE_GENERATE_UPLOAD_URL,
    FILE_STREAM_UPLOAD,
    FILE_DIRECT_DOWNLOAD,
} from '../../config/api-routes';
import styles from './ProfilePagePrd.module.css';
import mainClient from '../../lib/main-client';
import toast from 'react-hot-toast';

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
    effectiveFrom?: string;
    id: string;
    orgrecordsyskey?: string;
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
    effectiveFrom?: string;
    id: string;
    type: string;
    qualificationtype: string;
    description: string;
    educationname: string;
    university: string;
    year: string;
    country: string;
    countrysyskey?: string;
    fromdate: string;
    todate: string;
    isheight: string;
    status: string;
    modOption?: string;
    isdelete?: boolean;
}
interface Address {
    syskey: string;
    orgrecordsyskey?: string;
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
    personalprimaryemail: string;
    personalsecondarymail: string;
    personalmobilephone: string;
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
    attachment?: string;           // full signed URL or FS URL (for display)
    attachmentKey?: string;         // raw storage key sent to directdownloadfile API
    isdelete?: boolean;
}

interface EmergencyContact {
    id?: string;
    orgrecordsyskey?: string;
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
    // { id: 'history', label: t('profile.tabs.history', 'Update History'), icon: Clock },
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

/** Returns a phone number format hint — country code followed by generic digit pattern */
function getPhonePlaceholder(code: string): string {
    if (!code) return 'Phone number';
    return `xxxx-xxx-xxx`;
}
const NATIONALITIES = ['Myanmar', 'Chinese', 'Indian', 'Thai', 'Japanese', 'Korean', 'American', 'Other'];
const ETHNICITIES = ['Bamar', 'Shan', 'Karen', 'Rakhine', 'Mon', 'Karenni', 'Chin', 'Kachin', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const MOD_OPTIONS = ['New', 'Correct', 'Update'];

// ── Main Component ─────────────────────────────────────────────────────
export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, domain, userId: loggedInUserId } = useAuthStore();
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

    const queryClient = useQueryClient();

    const { data: profile, isLoading, error } = useQuery<ProfileData | null>({
        queryKey: ['employee-profile', urlUserId || loggedInUserId],
        queryFn: async () => {
            try {
                const endpoint = urlUserId ? USER_PROFILE_BY_ID : USER_PROFILE;
                const res = await mainClient.post(endpoint, {
                    userid: urlUserId || loggedInUserId
                });
                return res.data?.data ?? res.data ?? null;
            } catch (err) { console.error('Failed to fetch profile', err); return null; }
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (!profile?.userid || !profile?.eid) return;

        // Force refetch comparison queries on tab change
        const compareKeys = [
            ['address', profile.userid, profile.eid],
            ['emergency', profile.userid, profile.eid],
            ['experience', profile.userid, profile.eid],
            ['qualification', profile.userid, profile.eid],
            ['family', profile.userid, profile.eid]
        ];

        compareKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
        });
    }, [activeTab, queryClient, profile?.userid, profile?.eid]);

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
                                onClick={(e) => {
                                    setActiveTab(tab.id);
                                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                }}
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
                    {/* {activeTab === 'history' && <UpdateHistoryTab profile={profile} />} */}
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
    const [saving, setSaving] = useState(false);
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

    const save = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 400));
        setSaving(false);
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
                        <button className={styles.btnGhost} onClick={cancel} disabled={saving}>{t('common.cancel')}</button>
                        <button className={styles.btnPrimary} onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {t('request.save')}
                        </button>
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
    const [records, setRecords] = useState<{ current: EmergencyContact[], pending: EmergencyContact[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const relationships = useRelationships(showModal);
    const countryCodes = useCountryCodes(showModal);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
                orgrecordsyskey: item.orgrecordsyskey || '',
                syskey: item.syskey || '',
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

            console.log(res.data?.data?.update);


            return {
                current: processArr(res.data?.data?.current || []),
                pending: processArr(res.data?.data?.update || [])
            };
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            console.log(fetchedData);
            setRecords(fetchedData);
        }
    }, [fetchedData]);


    const openAdd = () => {
        setForm(blank());
        setEditingId(null);
        setShowModal(true);
    };
    const openEdit = (r: EmergencyContact) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, isdelete: r.isdelete || false, modOption: isCurrent ? 'Update' : (r.modOption || 'Correct') });
        setEditingId(r.id || null);
        setShowModal(true);
    };

    const cancelPending = async (id: string) => {
        const updatedPending = records.pending.filter(r => r.id !== id);
        const { domain } = useAuthStore.getState();
        const emergencylist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 ? r.id : "",
            orgrecordsyskey: r.orgrecordsyskey || "",
            name: r.name, relationship: r.relationshipSyskey || r.relationship,
            countrycode: r.countryCode || '+95', contactnumber: r.contactNumber,
            address: r.address, state: r.stateSyskey || r.state,
            township: r.townshipSyskey || r.township, city: r.citySyskey || r.city,
            country: r.countrySyskey || r.country, postalcode: r.postalCode || r.zip,
            zip: r.zip || r.postalCode, residentphone: r.residentPhone,
            residentphonecountrycode: r.residentPhoneCountryCode, officephone: r.officePhone,
            officephonecountrycode: r.officePhoneCountryCode, email: r.email, facebook: r.facebook,
            modificationoption: r.modOption, effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            status: r.status === 'Approved' ? '1' : '0', isdelete: !!r.isdelete,
        }));
        try {
            await mainClient.post(EMERGENCY_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, emergencylist });
            setRecords(prev => ({ current: prev.current, pending: updatedPending }));
            close();
            toast.success('Pending request cancelled');
        } catch { toast.error('Failed to cancel pending request'); }
    };
    const close = () => { setShowModal(false); setEditingId(null); };

    const save = async () => {
        // If marked for delete, handle deletion flow
        if (form.isdelete && editingId) {
            if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }
            const isCurrent = records.current.some(r => r.id === editingId);
            const pendingRecord = records.pending.find(p => p.id === editingId);
            let updatedPending: EmergencyContact[];
            if (pendingRecord) {
                updatedPending = records.pending.filter(r => r.id !== editingId);
            } else if (isCurrent) {
                const rec = records.current.find(r => r.id === editingId);
                if (!rec) return;
                updatedPending = [...records.pending, { ...rec, isdelete: true, modOption: form.modOption, effectiveFrom: form.effectiveFrom, status: 'Pending' }];
            } else { return; }
            const { domain } = useAuthStore.getState();
            setSaving(true);
            const emergencylist = updatedPending.map(r => ({
                syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
                orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
                name: r.name, relationship: r.relationshipSyskey || r.relationship,
                countrycode: r.countryCode || '+95', contactnumber: r.contactNumber,
                address: r.address, state: r.stateSyskey || r.state,
                township: r.townshipSyskey || r.township, city: r.citySyskey || r.city,
                country: r.countrySyskey || r.country, postalcode: r.postalCode || r.zip,
                zip: r.zip || r.postalCode, residentphone: r.residentPhone,
                residentphonecountrycode: r.residentPhoneCountryCode, officephone: r.officePhone,
                officephonecountrycode: r.officePhoneCountryCode, email: r.email, facebook: r.facebook,
                modificationoption: r.modOption, effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
                status: r.status === 'Approved' ? '1' : '0', isdelete: !!r.isdelete,
            }));
            try {
                await mainClient.post(EMERGENCY_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, emergencylist });
                setRecords(prev => ({ current: prev.current, pending: updatedPending }));
                close();
                toast.success('Marked for deletion');
            } catch { toast.error('Failed to update record'); } finally { setSaving(false); }
            return;
        }

        if (!form.name) { toast.error('Name is required'); return; }
        if (!form.relationshipSyskey) { toast.error('Relative Type is required'); return; }
        if (!form.countryCode) { toast.error('Mobile Country Code is required'); return; }
        if (!form.contactNumber) { toast.error('Mobile (Contact Number) is required'); return; }

        if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        newRecord.status = 'Pending';
        if (!isUpdate) { newRecord.id = Date.now().toString(); }

        const updatedPending = isUpdate
            ? (records.pending.some(r => r.id === editingId)
                ? records.pending.map(r => r.id === editingId ? newRecord : r)
                : [...records.pending, newRecord])
            : [...records.pending, newRecord];

        const { domain } = useAuthStore.getState();
        setSaving(true);
        const emergencylist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
            orgrecordsyskey: r.orgrecordsyskey || (r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : ""),
            name: r.name, relationship: r.relationshipSyskey || r.relationship,
            countrycode: r.countryCode || '+95', contactnumber: r.contactNumber,
            address: r.address, state: r.stateSyskey || r.state,
            township: r.townshipSyskey || r.township, city: r.citySyskey || r.city,
            country: r.countrySyskey || r.country, postalcode: r.postalCode || r.zip,
            zip: r.zip || r.postalCode, residentphone: r.residentPhone,
            residentphonecountrycode: r.residentPhoneCountryCode, officephone: r.officePhone,
            officephonecountrycode: r.officePhoneCountryCode, email: r.email, facebook: r.facebook,
            modificationoption: r.modOption, effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            status: r.status === 'Approved' ? "1" : "0", isdelete: !!r.isdelete
        }));

        try {
            await mainClient.post(EMERGENCY_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, emergencylist });
            if (isUpdate) {
                setRecords(prev => ({ current: prev.current, pending: [...prev.pending.filter(r => r.id !== editingId), newRecord] }));
            } else {
                setRecords(prev => ({ ...prev, pending: [...prev.pending, newRecord] }));
            }
            close();
            toast.success(t('profile.emergency.saveSuccess'));
        } catch (err) {
            toast.error('Failed to save emergency contact');
        } finally {
            setSaving(false);
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
                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                            </div>
                                            <div className={styles.cardFieldGrid}>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.name')}</span><span className={styles.cardFieldValue} style={{ fontWeight: 700 }}>{r.name}</span></div>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.contactNumber')}</span><span className={styles.cardFieldValue}>{r.countryCode} {r.contactNumber}</span></div>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.relationship')}</span><span className={styles.cardFieldValue}>{r.relationship && r.relationship !== 'null' ? t(`profile.options.relationships.${r.relationship}` as any, r.relationship) : '-'}</span></div>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.address')}</span><span className={styles.cardFieldValue}>{r.address || '-'}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {records.pending.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ padding: '0 0 16px', fontWeight: 600, color: '#b45309', fontSize: '14px' }}>{t('common.pendingHRApproval')}</div>
                                <div className={styles.contactsGrid}>
                                    {records.pending.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id} style={{ backgroundColor: r.isdelete ? '#fff1f2' : '#fefce8', borderLeft: r.isdelete ? '4px solid #f43f5e' : '4px solid #eab308' }}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel} style={{ color: r.isdelete ? '#f43f5e' : '#b45309' }}>
                                                    {t('profile.tabs.emergency')} — {r.isdelete ? (r.status === 'Approved' ? 'Delete Approved' : r.status === 'Rejected' ? 'Delete Rejected' : 'Pending Delete') : r.status}
                                                </span>
                                                {
                                                    r.status == 'Pending' && (
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                    )
                                                }
                                            </div>
                                            <div className={styles.cardFieldGrid} style={{ opacity: r.isdelete ? 0.7 : 1 }}>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.name')}</span><span className={styles.cardFieldValue} style={{ fontWeight: 700, textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.name}</span></div>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.contactNumber')}</span><span className={styles.cardFieldValue}>{r.countryCode} {r.contactNumber}</span></div>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.relationship')}</span><span className={styles.cardFieldValue}>{r.relationship && r.relationship !== 'null' ? t(`profile.options.relationships.${r.relationship}` as any, r.relationship) : '-'}</span></div>
                                                <div className={styles.contactField}><span className={styles.contactFieldLabel}>{t('profile.emergency.address')}</span><span className={styles.cardFieldValue}>{r.address || '-'}</span></div>
                                            </div>
                                            <div style={{ marginTop: '14px' }}><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} isDelete={r.isdelete} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {showModal && (
                <FormModal title={editingId ? `${t('profile.emergency.edit')}` : `${t('profile.emergency.add')}`} onClose={close} onSave={save} saving={saving}>
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
                                <input type="tel" className={styles.formInput} style={{ flex: 1 }} value={form.contactNumber} onChange={fv('contactNumber')} placeholder={getPhonePlaceholder(form.countryCode || '')} />
                            </div>
                        </FormRow>
                    </div>

                    <FormRow label={t('profile.emergency.address')}>
                        <textarea className={styles.formTextarea} value={form.address} onChange={fv('address')} placeholder={t('profile.emergency.fullAddress')} rows={2} />
                    </FormRow>


                    {/* Modification Type — New badge for add, Update/Correct toggle for edit */}
                    {!editingId && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 8px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Modification Type:</span>
                                <span style={{ padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>New</span>
                            </div>
                            <FormRow label="Effective Date *">
                                <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} />
                            </FormRow>
                        </>
                    )}
                    {editingId && (
                        <>
                            <div style={{ display: 'flex', gap: '8px', margin: '4px 0 8px' }}>
                                {(['Update', 'Correct'] as const).map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => setForm(prev => ({ ...prev, modOption: opt, effectiveFrom: opt === 'Correct' ? '' : prev.effectiveFrom }))}
                                        style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1.5px solid ${form.modOption === opt ? (opt === 'Correct' ? '#f59e0b' : '#3b82f6') : '#e2e8f0'}`, background: form.modOption === opt ? (opt === 'Correct' ? '#fef3c7' : '#dbeafe') : '#f8fafc', color: form.modOption === opt ? (opt === 'Correct' ? '#92400e' : '#1d4ed8') : '#64748b', fontWeight: form.modOption === opt ? 700 : 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {form.modOption === 'Update' && (
                                <FormRow label="Effective Date *">
                                    <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} />
                                </FormRow>
                            )}
                        </>
                    )}

                    {/* Delete toggle — only shown when editing an existing record */}
                    {editingId && (
                        <div style={{ marginTop: '8px', padding: '12px 16px', borderRadius: '10px', border: `1.5px solid ${form.isdelete ? '#f43f5e' : '#e2e8f0'}`, background: form.isdelete ? '#fff1f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Trash2 size={15} style={{ color: form.isdelete ? '#f43f5e' : '#94a3b8' }} />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: form.isdelete ? '#f43f5e' : '#64748b' }}>Mark for Deletion</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Submits a delete request pending HR approval</div>
                                </div>
                            </div>
                            <button type="button"
                                onClick={() => {
                                    if (records.pending.some(p => p.id === editingId)) return;
                                    setForm(prev => ({ ...prev, isdelete: !prev.isdelete }));
                                }}
                                disabled={records.pending.some(p => p.id === editingId)}
                                style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: records.pending.some(p => p.id === editingId) ? 'not-allowed' : 'pointer', background: form.isdelete ? '#f43f5e' : '#cbd5e1', transition: 'background 0.2s', flexShrink: 0, opacity: records.pending.some(p => p.id === editingId) ? 0.6 : 1 }}
                            >
                                <span style={{ position: 'absolute', top: '3px', left: form.isdelete ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </button>
                        </div>
                    )}

                    {/* Cancel pending request — shown when editing a pending record */}
                    {editingId && records.pending.some(p => p.id === editingId) && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <button type="button" onClick={() => cancelPending(editingId)}
                                style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>
                                Cancel Pending Request
                            </button>
                        </div>
                    )}
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
    const [saving, setSaving] = useState(false);

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
                orgrecordsyskey: item.orgrecordsyskey || '',
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

    const blankExp = (): WorkExperience => ({
        id: '', orgrecordsyskey: '', organization: '', orgType: '', industry: '', designation: '', fromdate: '', todate: '', salary: '', currency: 'MMK', reasonForChange: '', township: '', townshipSyskey: '', status: 'Pending', modOption: 'New',
        effectiveFrom: undefined
    });
    const [form, setForm] = useState<WorkExperience>(blankExp());

    const openAdd = () => { setForm(blankExp()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: WorkExperience) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, isdelete: r.isdelete || false, modOption: isCurrent ? 'Update' : (r.modOption || 'Correct') });
        setEditingId(r.id);
        setShowModal(true);
    };
    const closeExp = () => { setShowModal(false); setEditingId(null); };

    const cancelPendingExp = async (id: string) => {
        const updatedPending = records.pending.filter(r => r.id !== id);
        const { domain } = useAuthStore.getState();
        const experiencelist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 15 ? r.id : "", orgrecordsyskey: r.orgrecordsyskey || "",
            organization: r.organization, organizationtype: r.orgType || null, industry: r.industry || null,
            designation: r.designation, fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
            todate: r.todate ? r.todate.replace(/-/g, '') : '',
            previousmonthlysalary: r.salary ? r.salary.toString() : '', currency: r.currency || 'MMK',
            reasonforchange: r.reasonForChange || '', township: r.townshipSyskey || r.township || '',
            modificationoption: r.modOption, status: r.status === 'Approved' ? '1' : 0, isdelete: !!r.isdelete,
        }));
        try {
            await mainClient.post(EXPERIENCE_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, experiencelist });
            setRecords(prev => ({ current: prev.current, pending: updatedPending }));
            closeExp();
            toast.success('Pending request cancelled');
        } catch { toast.error('Failed to cancel pending request'); }
    };

    const saveExp = async () => {
        // Delete flow via form toggle
        if (form.isdelete && editingId) {
            if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }
            const isCurrent = records.current.some(r => r.id === editingId);
            const pendingRecord = records.pending.find(p => p.id === editingId);
            let updatedPending: WorkExperience[];
            if (pendingRecord) {
                updatedPending = records.pending.filter(r => r.id !== editingId);
            } else if (isCurrent) {
                const rec = records.current.find(r => r.id === editingId);
                if (!rec) return;
                updatedPending = [...records.pending, { ...rec, isdelete: true, modOption: form.modOption, effectiveFrom: form.effectiveFrom, status: 'Pending' }];
            } else { return; }
            const { domain } = useAuthStore.getState();
            setSaving(true);
            const experiencelist = updatedPending.map(r => ({
                syskey: (r.id && r.id.length > 15 && records.pending.some(p => p.id === r.id)) ? r.id : "",
                orgrecordsyskey: r.orgrecordsyskey || "",
                organization: r.organization, organizationtype: r.orgType || null, industry: r.industry || null,
                designation: r.designation, fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
                todate: r.todate ? r.todate.replace(/-/g, '') : '',
                previousmonthlysalary: r.salary ? r.salary.toString() : '', currency: r.currency || 'MMK',
                reasonforchange: r.reasonForChange || '', township: r.townshipSyskey || r.township || '',
                modificationoption: r.modOption, status: r.status === 'Approved' ? '1' : 0, isdelete: !!r.isdelete,
            }));
            try {
                await mainClient.post(EXPERIENCE_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, experiencelist });
                setRecords(prev => ({ current: prev.current, pending: updatedPending }));
                closeExp();
                toast.success('Marked for deletion');
            } catch { toast.error('Failed to remove pending experience'); } finally { setSaving(false); }
            return;
        }

        const orgTrim = form.organization?.trim() || '';
        if (!orgTrim) { toast.error(t('profile.experience.reqOrg')); return; }
        if (!form.designation?.trim()) { toast.error(t('profile.experience.reqDesignation')); return; }

        if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form, organization: orgTrim, designation: form.designation.trim() };
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
        setSaving(true);
        const experiencelist = updatedPending.map(r => ({
            syskey: (r.id && r.id.length > 15 && records.pending.some(p => p.id === r.id)) ? r.id : "",
            orgrecordsyskey: r.orgrecordsyskey || "",
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
        } finally {
            setSaving(false);
        }
    };

    // const removeExp = async (id: string) => {
    //     const isCurrent = records.current.some(r => r.id === id);
    //     const pendingRecord = records.pending.find(p => p.id === id);

    //     let updatedPending;
    //     if (pendingRecord) {
    //         updatedPending = records.pending.filter(r => r.id !== id);
    //     } else if (isCurrent) {
    //         const recordToDelete = records.current.find(r => r.id === id);
    //         if (!recordToDelete) return;
    //         updatedPending = [...records.pending, { ...recordToDelete, isdelete: true, modOption: 'Correct', status: 'Pending' }];
    //     } else {
    //         return;
    //     }

    //     const { domain } = useAuthStore.getState();
    //     const experiencelist = updatedPending.map(r => ({
    //         syskey: (r.id && r.id.length > 15 && records.pending.some(p => p.id === r.id)) ? r.id : "",
    //         orgrecordsyskey: r.orgrecordsyskey || "",
    //         organization: r.organization,
    //         organizationtype: r.orgType || null,
    //         industry: r.industry || null,
    //         designation: r.designation,
    //         fromdate: r.fromdate ? r.fromdate.replace(/-/g, '') : '',
    //         todate: r.todate ? r.todate.replace(/-/g, '') : '',
    //         previousmonthlysalary: r.salary ? r.salary.toString() : '',
    //         currency: r.currency || 'MMK',
    //         reasonforchange: r.reasonForChange || '',
    //         township: r.townshipSyskey || r.township || '',
    //         modificationoption: r.modOption,
    //         status: r.status === 'Approved' ? '1' : 0,
    //         isdelete: !!r.isdelete,
    //     }));

    //     try {
    //         await mainClient.post(EXPERIENCE_UPDATE, {
    //             userid: profile.userid,
    //             domain: domain || 'demouat',
    //             employeeid: profile.eid,
    //             experiencelist
    //         });
    //         setRecords(prev => ({
    //             current: prev.current,
    //             pending: updatedPending
    //         }));
    //         toast.success(t('profile.experience.deleteSuccess', 'Pending record updated'));
    //     } catch (err) {
    //         toast.error('Failed to remove pending experience');
    //     }
    // };

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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {records.current.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel}>{t('profile.tabs.experience')}</span>
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Start Date</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{displayExpDate(r.fromdate)}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Position Held</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.designation}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Salary</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.salary} {r.currencyDesc || currencies.find((c: any) => c.syskey === r.currency)?.description || r.currency}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Organization Type</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.orgTypeDesc || orgTypes.find((o: any) => o.syskey === r.orgType)?.description || r.orgType}</span></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>End Date</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{displayExpDate(r.todate) || 'Present'}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Company</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.organization}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Industry</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.industryDesc || industries.find((i: any) => i.syskey === r.industry)?.description || r.industry}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Reason To Leave</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.reasonForChange || '-'}</span></div>
                                                </div>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {records.pending.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id} style={{
                                            backgroundColor: r.isdelete ? '#fff1f2' : '#fefce8',
                                            borderLeft: r.isdelete ? '4px solid #f43f5e' : '4px solid #eab308'
                                        }}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel} style={{ color: r.isdelete ? '#f43f5e' : '#b45309' }}>
                                                    {t('profile.tabs.experience')} — {r.isdelete ? (r.status === 'Approved' ? 'Delete Approved' : r.status === 'Rejected' ? 'Delete Rejected' : 'Pending Delete') : r.status}
                                                </span>
                                                {
                                                    r.status === 'Pending' && (
                                                        <div className={styles.rowActions}>
                                                            {!r.isdelete && (
                                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                            )}
                                                        </div>
                                                    )
                                                }
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', opacity: r.isdelete ? 0.6 : 1 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Start Date</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{displayExpDate(r.fromdate)}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Position Held</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.designation}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Salary</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.salary} {r.currencyDesc || currencies.find((c: any) => c.syskey === r.currency)?.description || r.currency}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Organization Type</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.orgTypeDesc || orgTypes.find((o: any) => o.syskey === r.orgType)?.description || r.orgType}</span></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>End Date</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{displayExpDate(r.todate) || 'Present'}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Company</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.organization}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Industry</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.industryDesc || industries.find((i: any) => i.syskey === r.industry)?.description || r.industry}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Reason To Leave</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.reasonForChange || '-'}</span></div>
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
                <FormModal title={editingId ? t('profile.experience.modalEdit') : t('profile.experience.modalAdd')} onClose={closeExp} onSave={saveExp} saving={saving}>
                    <FormRow label={`${t('profile.experience.org')} *`}>
                        <input className={styles.formInput} value={form.organization} onChange={f('organization')} placeholder={t('profile.experience.orgPlaceholder')} required aria-required />
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
                    <FormRow label={`${t('profile.experience.jobDescriptionPosition')} *`}>
                        <input className={styles.formInput} value={form.designation} onChange={f('designation')} placeholder={t('profile.experience.jobDescriptionPositionPlaceholder')} required aria-required />
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

                    <FormRow label={t('profile.experience.reason')}>
                        <textarea className={styles.formTextarea} value={form.reasonForChange} onChange={f('reasonForChange')} placeholder={t('profile.experience.reasonPlaceholder')} rows={3} />
                    </FormRow>

                    {/* Modification Type — New badge for add, Update/Correct toggle for edit */}
                    {!editingId && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 8px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Modification Type:</span>
                                <span style={{ padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>New</span>
                            </div>
                            <FormRow label="Effective Date *">
                                <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={f('effectiveFrom')} />
                            </FormRow>
                        </>
                    )}
                    {editingId && (
                        <>
                            <div style={{ display: 'flex', gap: '8px', margin: '4px 0 8px' }}>
                                {(['Update', 'Correct'] as const).map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => setForm(prev => ({ ...prev, modOption: opt, effectiveFrom: opt === 'Correct' ? '' : prev.effectiveFrom }))}
                                        style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1.5px solid ${form.modOption === opt ? (opt === 'Correct' ? '#f59e0b' : '#3b82f6') : '#e2e8f0'}`, background: form.modOption === opt ? (opt === 'Correct' ? '#fef3c7' : '#dbeafe') : '#f8fafc', color: form.modOption === opt ? (opt === 'Correct' ? '#92400e' : '#1d4ed8') : '#64748b', fontWeight: form.modOption === opt ? 700 : 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {form.modOption === 'Update' && (
                                <FormRow label="Effective Date *">
                                    <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={f('effectiveFrom')} />
                                </FormRow>
                            )}
                        </>
                    )}

                    {/* Delete toggle — only shown when editing */}
                    {editingId && (
                        <div style={{ marginTop: '8px', padding: '12px 16px', borderRadius: '10px', border: `1.5px solid ${form.isdelete ? '#f43f5e' : '#e2e8f0'}`, background: form.isdelete ? '#fff1f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Trash2 size={15} style={{ color: form.isdelete ? '#f43f5e' : '#94a3b8' }} />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: form.isdelete ? '#f43f5e' : '#64748b' }}>Mark for Deletion</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Submits a delete request pending HR approval</div>
                                </div>
                            </div>
                            <button type="button"
                                onClick={() => {
                                    if (records.pending.some(p => p.id === editingId)) return;
                                    setForm(prev => ({ ...prev, isdelete: !prev.isdelete }));
                                }}
                                disabled={records.pending.some(p => p.id === editingId)}
                                style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: records.pending.some(p => p.id === editingId) ? 'not-allowed' : 'pointer', background: form.isdelete ? '#f43f5e' : '#cbd5e1', transition: 'background 0.2s', flexShrink: 0, opacity: records.pending.some(p => p.id === editingId) ? 0.6 : 1 }}
                            >
                                <span style={{ position: 'absolute', top: '3px', left: form.isdelete ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </button>
                        </div>
                    )}

                    {/* Cancel pending request */}
                    {editingId && records.pending.some(p => p.id === editingId) && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <button type="button" onClick={() => cancelPendingExp(editingId)}
                                style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>
                                Cancel Pending Request
                            </button>
                        </div>
                    )}
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
    const [saving, setSaving] = useState(false);

    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const parseDateFromApi = (val: string) => {
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

    const mapQualificationPayload = (list: Qualification[]) => {
        return list.map(r => ({
            syskey:
                r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id)
                    ? r.id
                    : "",
            orgrecordsyskey:
                r.id && r.id.length > 20 && records.current.some(c => c.id === r.id)
                    ? r.id
                    : "",
            countrysyskey: r.countrysyskey || '',
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
            isdelete: !!r.isdelete,
            effectivedate: r.effectiveFrom
                ? r.effectiveFrom.replace(/-/g, '')
                : ''
        }));
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
                university: item.institution || '',
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

    const blank = (): Qualification => ({
        id: '', type: 'Education', qualificationtype: 'Education', description: '', educationname: '', university: '', year: '', country: '', fromdate: '', todate: '', isheight: 'false', status: '0', modOption: 'New',
        effectiveFrom: undefined
    });
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
        setForm({ ...r, isdelete: r.isdelete || false, modOption: isCurrent ? 'Update' : (r.modOption || 'Correct') });
        setEditingId(r.id);
        setShowModal(true);
    };
    const close = () => { setShowModal(false); setEditingId(null); };

    const cancelPendingQual = async (id: string) => {
        const updatedPending = records.pending.filter(r => r.id !== id);
        const { domain } = useAuthStore.getState();
        const qualificationlist = mapQualificationPayload(updatedPending);
        try {
            await mainClient.post(QUALIFICATION_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, qualificationlist });
            setRecords(prev => ({ current: prev.current, pending: updatedPending }));
            close();
            toast.success('Pending request cancelled');
        } catch { toast.error('Failed to cancel pending request'); }
    };

    const save = async () => {
        // Delete flow via form toggle
        if (form.isdelete && editingId) {
            if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }
            const isCurrent = records.current.some(r => r.id === editingId);
            const pendingRecord = records.pending.find(p => p.id === editingId);
            let updatedPending: Qualification[];
            if (pendingRecord) {
                updatedPending = records.pending.filter(r => r.id !== editingId);
            } else if (isCurrent) {
                const rec = records.current.find(r => r.id === editingId);
                if (!rec) return;
                updatedPending = [...records.pending, { ...rec, isdelete: true, modOption: form.modOption, effectiveFrom: form.effectiveFrom, status: '0' }];
            } else { return; }
            const { domain } = useAuthStore.getState();
            setSaving(true);
            const qualificationlist = mapQualificationPayload(updatedPending);
            try {
                await mainClient.post(QUALIFICATION_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, qualificationlist });
                setRecords(prev => ({ current: prev.current, pending: updatedPending }));
                close();
                toast.success('Marked for deletion');
            } catch { toast.error('Failed to remove qualification'); } finally { setSaving(false); }
            return;
        }

        if (!form.description) { toast.error(t('profile.qualification.reqDegree', 'Description is required')); return; }
        if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }

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
        setSaving(true);
        const qualificationlist = mapQualificationPayload(updatedPending);

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
        } finally {
            setSaving(false);
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
            updatedPending = [...records.pending, { ...recordToDelete, isdelete: true, status: '0' }];
        } else {
            return;
        }

        const { domain } = useAuthStore.getState();

        const qualificationlist = mapQualificationPayload(updatedPending);

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
                    <div style={{ padding: '24px' }}>
                        {/* Current Records Section */}
                        {records.current.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ padding: '0 0 16px', fontWeight: 600, color: 'var(--color-neutral-800)', fontSize: '14px' }}>{t('common.currentRecords')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {records.current.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel}>{t('profile.tabs.qualification')}</span>
                                                <div className={styles.rowActions}>
                                                    <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 50px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.type')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.type}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.description')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.description}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.fromDate')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{formatDateForDisplay(r.fromdate)}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.year')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.year || '-'}</span></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.educationName')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{(r as any)._displayEduName || r.educationname || '-'}</span></div>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.universityOrInstitution')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.university || '-'}</span></div>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.toDate')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{formatDateForDisplay(r.todate) || t('profile.experience.present')}</span></div>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.highestQualification')}</span><span style={{ fontWeight: 500, fontSize: '13px' }}>{r.isheight === 'true' ? 'Yes' : 'No'}</span></div>
                                                </div>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {records.pending.map(r => (
                                        <div className={styles.contactPersonCard} key={r.id} style={{
                                            backgroundColor: r.isdelete ? '#fff1f2' : '#fefce8',
                                            borderLeft: r.isdelete ? '4px solid #f43f5e' : '4px solid #eab308'
                                        }}>
                                            <div className={styles.contactPersonHeader}>
                                                <span className={styles.contactPersonLabel} style={{ color: r.isdelete ? '#f43f5e' : '#b45309' }}>
                                                    {t('profile.tabs.qualification')} — {r.isdelete ? (r.status === 'Approved' ? 'Delete Approved' : r.status === 'Rejected' ? 'Delete Rejected' : 'Pending Delete') : r.status}
                                                </span>
                                                {
                                                    r.status === 'Pending' || r.status == '0' && (
                                                        <div className={styles.rowActions}>
                                                            <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                        </div>
                                                    )
                                                }

                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', opacity: r.isdelete ? 0.6 : 1 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.type')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.type}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.description')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.description}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.fromDate')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{formatDateForDisplay(r.fromdate)}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.year')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.year || '-'}</span></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.educationName')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{(r as any)._displayEduName || r.educationname || '-'}</span></div>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.universityOrInstitution')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.university || '-'}</span></div>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.toDate')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{formatDateForDisplay(r.todate) || t('profile.experience.present')}</span></div>
                                                    <div style={{ display: 'flex', gap: '10px' }}><span style={{ width: '130px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{t('profile.qualification.highestQualification')}</span><span style={{ fontWeight: 500, fontSize: '13px', textDecoration: r.isdelete ? 'line-through' : 'none' }}>{r.isheight === 'true' ? 'Yes' : 'No'}</span></div>
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
                )
            }

            {showModal && (
                <FormModal title={editingId ? t('profile.qualification.modalEdit') : t('profile.qualification.modalAdd')} onClose={close} onSave={save} saving={saving}>
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
                            <select className={styles.formSelect} value={form.countrysyskey} onChange={f('countrysyskey')}>
                                <option value="">{t('profile.qualification.selectCountry', 'Select Country...')}</option>
                                {countries.map((c: any) => (
                                    <option key={c.syskey} value={c.syskey}>{c.description}</option>
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

                    {/* Modification Type — 3-state */}
                    {!editingId && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 8px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Modification Type:</span>
                                <span style={{ padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>New</span>
                            </div>
                            <FormRow label="Effective Date *">
                                <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={f('effectiveFrom')} />
                            </FormRow>
                        </>
                    )}
                    {editingId && (
                        <>
                            <div style={{ display: 'flex', gap: '8px', margin: '4px 0 8px' }}>
                                {(['Update', 'Correct'] as const).map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => setForm(prev => ({ ...prev, modOption: opt, effectiveFrom: opt === 'Correct' ? '' : prev.effectiveFrom }))}
                                        style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1.5px solid ${form.modOption === opt ? (opt === 'Correct' ? '#f59e0b' : '#3b82f6') : '#e2e8f0'}`, background: form.modOption === opt ? (opt === 'Correct' ? '#fef3c7' : '#dbeafe') : '#f8fafc', color: form.modOption === opt ? (opt === 'Correct' ? '#92400e' : '#1d4ed8') : '#64748b', fontWeight: form.modOption === opt ? 700 : 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {form.modOption === 'Update' && (
                                <FormRow label="Effective Date *">
                                    <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={f('effectiveFrom')} />
                                </FormRow>
                            )}
                        </>
                    )}

                    {/* Delete toggle — only shown when editing */}
                    {editingId && (
                        <div style={{ marginTop: '8px', padding: '12px 16px', borderRadius: '10px', border: `1.5px solid ${form.isdelete ? '#f43f5e' : '#e2e8f0'}`, background: form.isdelete ? '#fff1f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Trash2 size={15} style={{ color: form.isdelete ? '#f43f5e' : '#94a3b8' }} />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: form.isdelete ? '#f43f5e' : '#64748b' }}>Mark for Deletion</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Submits a delete request pending HR approval</div>
                                </div>
                            </div>
                            <button type="button"
                                onClick={() => {
                                    if (records.pending.some(p => p.id === editingId)) return;
                                    setForm(prev => ({ ...prev, isdelete: !prev.isdelete }));
                                }}
                                disabled={records.pending.some(p => p.id === editingId)}
                                style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: records.pending.some(p => p.id === editingId) ? 'not-allowed' : 'pointer', background: form.isdelete ? '#f43f5e' : '#cbd5e1', transition: 'background 0.2s', flexShrink: 0, opacity: records.pending.some(p => p.id === editingId) ? 0.6 : 1 }}
                            >
                                <span style={{ position: 'absolute', top: '3px', left: form.isdelete ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </button>
                        </div>
                    )}

                    {/* Cancel pending request */}
                    {editingId && records.pending.some(p => p.id === editingId) && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <button type="button" onClick={() => cancelPendingQual(editingId)}
                                style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>
                                Cancel Pending Request
                            </button>
                        </div>
                    )}
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

/** Resolves an attachment value to a viewable URL.
 *  - If it is already a full URL (starts with http/https) → return as-is
 *  - If it is a raw FS storage key (e.g. dev/employee/family/2026/5/file.jpg)
 *    → build: mainUrl + 'api/' + key
 */
/** Calls HXM directdownloadfile API and opens the file in a new browser tab.
 *  Works for both image and document attachments.
 */
async function openAttachment(fileName: string | undefined | null): Promise<void> {
    if (!fileName) return;
    const { userId, domain } = useAuthStore.getState();
    try {
        const response = await apiClient.get(FILE_DIRECT_DOWNLOAD, {
            params: { fileName, userid: userId, domain: domain || 'dev' },
            responseType: 'blob',
        });
        const blob = new Blob([response.data], {
            type: response.headers['content-type'] || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // For viewable types (images, PDF) — open inline; others trigger download
        const ct = response.headers['content-type'] || '';
        if (ct.startsWith('image/') || ct === 'application/pdf') {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
        } else {
            link.download = fileName.split('/').pop() || 'attachment';
            link.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
        toast.error('Failed to open attachment');
    }
}

function FamilyInfoTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<{ current: FamilyMember[], pending: FamilyMember[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const relationships = useRelationships(showModal);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
                attachment: item.signurl || item.attachment || '',   // full URL for display
                attachmentKey: item.attachment || '',                // raw key for API
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

    const blank = (): FamilyMember => ({ id: '', name: '', gender: '', dob: '', relationship: '', relationshipSyskey: '', taxEligible: 'No', modOption: 'New', effectiveFrom: '', status: 'Pending', attachment: '', attachmentKey: '' });
    const [form, setForm] = useState<FamilyMember>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: FamilyMember) => {
        const isCurrent = records.current.some(c => c.id === r.id);
        setForm({ ...r, isdelete: r.isdelete || false, modOption: isCurrent ? 'Update' : (r.modOption || 'Correct') });
        setEditingId(r.id); setShowModal(true);
    };
    const close = () => { setShowModal(false); setEditingId(null); };

    const cancelPendingFamily = async (id: string) => {
        const updatedPending = records.pending.filter(r => r.id !== id);
        const { domain } = useAuthStore.getState();
        const familylist = updatedPending.map(r => ({
            syskey: r.id && r.id.length > 20 ? r.id : "", orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
            name: r.name, gender: r.gender, dob: r.dob ? r.dob.replace(/-/g, '') : '',
            relationship: r.relationshipSyskey || r.relationship, taxexeligibility: r.taxEligible === 'Yes',
            attachment: r.attachment || null,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            familystatus: r.modOption === 'New' ? '1' : '0', status: r.status === 'Approved' ? '1' : '0',
            isdelete: !!r.isdelete,
        }));
        try {
            await mainClient.post(FAMILY_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, familylist });
            setRecords(prev => ({ current: prev.current, pending: updatedPending }));
            close();
            toast.success('Pending request cancelled');
        } catch { toast.error('Failed to cancel pending request'); }
    };
    const save = async () => {
        // Delete flow via form toggle
        if (form.isdelete && editingId) {
            console.log(form);

            if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }
            const isCurrent = records.current.some(r => r.id === editingId);
            const pendingRecord = records.pending.find(p => p.id === editingId);
            let updatedPending: FamilyMember[];
            if (pendingRecord) {
                updatedPending = records.pending.filter(r => r.id !== editingId);
            } else if (isCurrent) {
                const rec = records.current.find(r => r.id === editingId);
                if (!rec) return;
                updatedPending = [...records.pending, { ...rec, isdelete: true, modOption: form.modOption, effectiveFrom: form.effectiveFrom, status: 'Pending' }];
            } else { return; }
            const { domain } = useAuthStore.getState();
            setSaving(true);
            const familylist = updatedPending.map(r => ({
                syskey: r.id && r.id.length > 20 && records.pending.some(p => p.id === r.id) ? r.id : "",
                orgrecordsyskey: r.id && r.id.length > 20 && records.current.some(c => c.id === r.id) ? r.id : "",
                name: r.name, gender: r.gender, dob: r.dob ? r.dob.replace(/-/g, '') : '',
                relationship: r.relationshipSyskey || r.relationship, taxexeligibility: r.taxEligible === 'Yes',
                attachment: r.attachment || null,
                modificationoption: r.modOption,
                effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
                familystatus: r.modOption === 'New' ? '1' : '0', status: r.status === 'Approved' ? '1' : '0',
                isdelete: !!r.isdelete,
            }));
            try {
                await mainClient.post(FAMILY_UPDATE, { userid: profile.userid, domain: domain || 'demouat', employeeid: profile.eid, familylist });
                setRecords(prev => ({ current: prev.current, pending: updatedPending }));
                close();
                toast.success('Marked for deletion');
            } catch { toast.error('Failed to update family information'); } finally { setSaving(false); }
            return;
        }

        if (!form.name) { toast.error(t('profile.family.reqName')); return; }
        if ((form.modOption === 'Update' || form.modOption === 'New') && !form.effectiveFrom) { toast.error('Effective Date is required'); return; }

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
        setSaving(true);
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
        } finally {
            setSaving(false);
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
                                        <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.personal.gender')}</th><th>{t('profile.personal.dob')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.family.taxEligible')}</th><th>{t('profile.family.attachment')}</th><th></th></tr>
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
                                                    {r.attachmentKey || r.attachment ? (
                                                        <button
                                                            onClick={() => openAttachment(r.attachmentKey || r.attachment)}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer' }}
                                                        >
                                                            <FileText size={12} /> View
                                                        </button>
                                                    ) : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>}
                                                </td>
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
                                        <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.personal.gender')}</th><th>{t('profile.personal.dob')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.family.taxEligible')}</th><th>{t('profile.family.attachment')}</th><th>{t('profile.family.status')}</th><th></th></tr>
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
                                                <td>
                                                    {r.attachmentKey || r.attachment ? (
                                                        <button
                                                            onClick={() => openAttachment(r.attachmentKey || r.attachment)}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', opacity: r.isdelete ? 0.6 : 1 }}
                                                        >
                                                            <FileText size={12} /> View
                                                        </button>
                                                    ) : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>}
                                                </td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status)} isDelete={r.isdelete} /></td>
                                                <td>
                                                    <div className={styles.rowActions} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#eab308', marginRight: '8px', padding: '2px 6px', background: '#fef08a', borderRadius: '4px' }}>
                                                            {r.modOption || 'New'}
                                                        </span>
                                                        {
                                                            r.status === 'Pending' && (
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
                <FormModal title={editingId ? t('profile.family.modalEdit') : t('profile.family.modalAdd')} onClose={close} onSave={save} saving={saving}>
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
                    {/* Modification Type — 3-state */}
                    {!editingId && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 8px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Modification Type:</span>
                                <span style={{ padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>New</span>
                            </div>
                            <FormRow label="Effective Date *">
                                <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} />
                            </FormRow>
                        </>
                    )}
                    {editingId && (
                        <>
                            <div style={{ display: 'flex', gap: '8px', margin: '4px 0 8px' }}>
                                {(['Update', 'Correct'] as const).map(opt => (
                                    <button key={opt} type="button"
                                        onClick={() => setForm(prev => ({ ...prev, modOption: opt, effectiveFrom: opt === 'Correct' ? '' : prev.effectiveFrom }))}
                                        style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: `1.5px solid ${form.modOption === opt ? (opt === 'Correct' ? '#f59e0b' : '#3b82f6') : '#e2e8f0'}`, background: form.modOption === opt ? (opt === 'Correct' ? '#fef3c7' : '#dbeafe') : '#f8fafc', color: form.modOption === opt ? (opt === 'Correct' ? '#92400e' : '#1d4ed8') : '#64748b', fontWeight: form.modOption === opt ? 700 : 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {form.modOption === 'Update' && (
                                <FormRow label="Effective Date *">
                                    <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} />
                                </FormRow>
                            )}
                        </>
                    )}
                    <FormRow label={editingId && form.attachment ? t('profile.family.attachment') : `${t('profile.family.attachment')} *`}>
                        {/* Show existing attachment when editing */}
                        {editingId && (form.attachmentKey || form.attachment) && (() => {
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                    <FileText size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
                                    <button
                                        type="button"
                                        onClick={() => openAttachment(form.attachmentKey || form.attachment)}
                                        style={{ flex: 1, fontSize: '12px', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        View current attachment
                                    </button>
                                    <button type="button" onClick={() => setForm(prev => ({ ...prev, attachment: '', attachmentKey: '' }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', flexShrink: 0 }}
                                        title="Remove attachment"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            );
                        })()}
                        <input
                            className={styles.formInput}
                            type="file"
                            accept=".pdf,.docx,.jpg,.png"
                            onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const uploadingToast = toast.loading(`Uploading ${file.name}...`);
                                try {
                                    // Step 1: get presigned upload URL from HXM
                                    const { data } = await apiClient.get(FILE_GENERATE_UPLOAD_URL, {
                                        params: { fileName: file.name }
                                    });
                                    const { uploadUrl, fileName } = data;

                                    // Step 2: PUT raw file binary to the stream endpoint
                                    await mainClient.put(
                                        uploadUrl.startsWith('http') ? uploadUrl : `${FILE_STREAM_UPLOAD}?path=${encodeURIComponent(fileName)}`,
                                        file,
                                        { headers: { 'Content-Type': file.type } }
                                    );

                                    // Step 3: store the returned fileName key (no base64)
                                    setForm(prev => ({ ...prev, attachment: fileName, attachmentKey: fileName }));
                                    toast.success('File uploaded', { id: uploadingToast });
                                } catch (err) {
                                    toast.error('File upload failed', { id: uploadingToast });
                                }
                            }}
                        />
                        {form.attachment && <p className={styles.fileHint}>Selected: {form.attachment}</p>}
                    </FormRow>

                    {/* Delete toggle — only shown when editing */}
                    {editingId && (
                        <div style={{ marginTop: '8px', padding: '12px 16px', borderRadius: '10px', border: `1.5px solid ${form.isdelete ? '#f43f5e' : '#e2e8f0'}`, background: form.isdelete ? '#fff1f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Trash2 size={15} style={{ color: form.isdelete ? '#f43f5e' : '#94a3b8' }} />
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: form.isdelete ? '#f43f5e' : '#64748b' }}>Mark for Deletion</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Submits a delete request pending HR approval</div>
                                </div>
                            </div>
                            <button type="button"
                                onClick={() => {
                                    if (records.pending.some(p => p.id === editingId)) return;
                                    setForm(prev => ({ ...prev, isdelete: !prev.isdelete }));
                                }}
                                disabled={records.pending.some(p => p.id === editingId)}
                                style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: records.pending.some(p => p.id === editingId) ? 'not-allowed' : 'pointer', background: form.isdelete ? '#f43f5e' : '#cbd5e1', transition: 'background 0.2s', flexShrink: 0, opacity: records.pending.some(p => p.id === editingId) ? 0.6 : 1 }}
                            >
                                <span style={{ position: 'absolute', top: '3px', left: form.isdelete ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </button>
                        </div>
                    )}

                    {/* Cancel pending request */}
                    {editingId && records.pending.some(p => p.id === editingId) && (
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <button type="button" onClick={() => cancelPendingFamily(editingId)}
                                style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>
                                Cancel Pending Request
                            </button>
                        </div>
                    )}
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
    const [saving, setSaving] = useState(false);

    const [contactDetails, setContactDetails] = useState({
        primaryEmail: '',
        secondaryEmail: '',
        primaryMobile: '',
        modOption: 'New',
        effectiveFrom: ''
    });

    const [form, setForm] = useState<{ permanent: Address, temporary: Address }>({
        permanent: {
            syskey: '', orgrecordsyskey: '', employeeid: '', address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 0, status: '0',
            statesyskey: '',
            districtsyskey: '',
            townshipsyskey: '',
            citysyskey: '',
            wardsyskey: '',
            countrysyskey: '',
            personalprimaryemail: '',
            personalsecondarymail: '',
            personalmobilephone: ''
        },
        temporary: {
            syskey: '', employeeid: '', address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 1, status: '0',
            statesyskey: '',
            districtsyskey: '',
            townshipsyskey: '',
            citysyskey: '',
            wardsyskey: '',
            countrysyskey: '',
            personalprimaryemail: '',
            personalsecondarymail: '',
            personalmobilephone: ''
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
                syskey: item.syskey || '',
                orgrecordsyskey: item.orgrecordsyskey || '',
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
            permanent: curPerm ? { ...curPerm } : { syskey: '', orgrecordsyskey: '', employeeid: profile.eid, address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 0, status: '0', statesyskey: '', districtsyskey: '', townshipsyskey: '', citysyskey: '', wardsyskey: '', countrysyskey: '', personalprimaryemail: '', personalsecondarymail: '', personalmobilephone: '' },
            temporary: curTemp ? { ...curTemp } : { syskey: '', orgrecordsyskey: '', employeeid: profile.eid, address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 1, status: '0', statesyskey: '', districtsyskey: '', townshipsyskey: '', citysyskey: '', wardsyskey: '', countrysyskey: '', personalprimaryemail: '', personalsecondarymail: '', personalmobilephone: '' }
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
        if ((contactDetails.modOption === 'Update' || contactDetails.modOption === 'New') && !contactDetails.effectiveFrom) { toast.error('Effective Date is required'); return; }
        
        setSaving(true);
        const toPayload = (addr: Address) => ({
            syskey: addr.syskey,
            orgrecordsyskey: addr.orgrecordsyskey || (records.current.find(c => c.addressstatus === addr.addressstatus)?.syskey || ''),
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
        } finally {
            setSaving(false);
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
                        <button className={styles.btnGhost} onClick={cancel} disabled={saving}>{t('common.cancel')}</button>
                        <button className={styles.btnPrimary} onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {t('request.save')}
                        </button>
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

// function UpdateHistoryTab({ profile }: { profile: ProfileData }) {
//     const { t } = useTranslation();
//     const { domain } = useAuthStore();

//     const { data: updates = [], isLoading } = useQuery({
//         queryKey: ['profile-updates', profile.userid],
//         queryFn: async () => {
//             const endpoints = [
//                 { id: 'family', url: FAMILY_COMPARE, label: t('profile.history.familyInfo') },
//                 { id: 'experience', url: EXPERIENCE_COMPARE, label: t('profile.history.workExperience') },
//                 { id: 'emergency', url: EMERGENCY_COMPARE, label: t('profile.history.emergencyContacts') },
//                 { id: 'qualification', url: QUALIFICATION_COMPARE, label: t('profile.history.qualification') },
//                 { id: 'address', url: ADDRESS_COMPARE, label: t('profile.history.addressContact') }
//             ];

//             const allUpdates: any[] = [];

//             await Promise.all(endpoints.map(async (ep) => {
//                 try {
//                     const res = await mainClient.post(ep.url, {
//                         userid: profile.userid,
//                         domain: domain || 'dev',
//                         employeeid: profile.eid
//                     });
//                     const pending = res.data?.data?.update || [];
//                     pending.forEach((p: any) => {
//                         console.log(p);

//                         allUpdates.push({
//                             ...p,
//                             category: ep.label,
//                             categoryId: ep.id,
//                             displayName: p.name || p.organization || p.educationname || p.address || 'Update'
//                         });
//                     });
//                 } catch (err) {
//                     console.error(`Failed to fetch ${ep.label} updates`, err);
//                 }
//             }));

//             return allUpdates.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
//         }
//     });

//     if (isLoading) {
//         return (
//             <div className={styles.sectionCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', minHeight: '300px' }}>
//                 <Loader2 className="animate-spin" size={32} style={{ color: '#3b82f6', marginBottom: '16px' }} />
//                 <p style={{ color: 'var(--color-neutral-500)' }}>{t('profile.loading', 'Loading...')}</p>
//             </div>
//         );
//     }

//     return (
//         <div className={styles.sectionCard}>
//             <SectionHeader
//                 icon={<Clock size={20} />}
//                 title={t('profile.tabs.history')}
//                 subtitle={t('profile.history.subtitle')}
//             />

//             {updates.length === 0 ? (
//                 <div className={styles.emptyState}>
//                     <AlertCircle size={36} className={styles.emptyStateIcon} />
//                     <p>{t('profile.history.noData')}</p>
//                 </div>
//             ) : (
//                 <div className={styles.tableWrapper}>
//                     <table className={styles.table}>
//                         <thead>
//                             <tr>
//                                 <th>{t('profile.history.category')}</th>
//                                 <th>{t('profile.history.description')}</th>
//                                 <th>{t('profile.history.status')}</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {updates.map((up: any, idx: number) => (
//                                 <tr key={idx}>
//                                     <td><span className={styles.badgeGray}>{up.category}</span></td>
//                                     <td><strong>{up.displayName}</strong></td>
//                                     <td><StatusBadge status={up.status} /></td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             )}
//         </div>
//     );
// }



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

function FormModal({ title, onClose, onSave, saving, children }: { title: string; onClose: () => void; onSave: () => void; saving?: boolean; children: React.ReactNode }) {
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
                    <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
                    <Button type="button" onClick={onSave} loading={saving} disabled={saving}><Save size={14} style={{ marginRight: 4 }} /> {t('common.save')}</Button>
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
        if (isApproved) {
            className = styles.statusBadge__approved;
            icon = <CheckCircle2 size={12} />;
            label = "Delete Approved";
        } else if (isRejected) {
            className = styles.statusBadge__rejected;
            icon = <X size={12} />;
            label = "Delete Rejected";
        } else {
            className = styles.statusBadge__rejected;
            icon = <AlertCircle size={12} />;
            label = "Pending Delete";
        }
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
