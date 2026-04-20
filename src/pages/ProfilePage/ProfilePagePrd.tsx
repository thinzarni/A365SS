import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Mail, Calendar, Briefcase, Award, CreditCard, Clock, Activity,
    Loader2, KeyRound, Eye, EyeOff, X, CheckCircle2, Circle,

    Building2, User, Phone, BookOpen, Users, MapPin, Plus, Trash2, Edit3,
    ChevronRight, FileText, AlertCircle, Save
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
    officelocation?: string | null;
    officelocationsyskey?: string | null;
    worklocation?: string | null;
    worklocationsyskey?: string | null;
    roname?: string;
    serviceyearstring?: string;
    serviceyearnumeric?: string;
    nationalitytype?: string;
    nationalitytypesyskey?: string;
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
    industry: string;
    designation: string;
    fromdate: string;
    todate: string;
    salary: string;
    currency: string;
    reasonForChange: string;
    status?: string;
    modOption?: string;
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
}


interface FamilyMember {
    id: string;
    name: string;
    gender: string;
    dob: string;
    relationship: string;
    taxEligible: 'Yes' | 'No';
    modOption: 'New' | 'Correct' | 'Update';
    effectiveFrom: string;
    status: string;
    attachment?: string;
}

interface EmergencyContact {
    id?: string;
    name: string;
    relationship: string;
    contactNumber: string;
    address: string;
    status?: string;
    modOption?: string;
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
            return list.map((item: any) => item.code || item.description);
        },
        enabled: !!userId && isOpen,
        staleTime: 5 * 60 * 1000,
    });
    return relationships;
}
const NATIONALITIES = ['Myanmar', 'Chinese', 'Indian', 'Thai', 'Japanese', 'Korean', 'American', 'Other'];
const ETHNICITIES = ['Bamar', 'Shan', 'Karen', 'Rakhine', 'Mon', 'Karenni', 'Chin', 'Kachin', 'Other'];
const ORG_TYPES = ['Government', 'Private', 'NGO', 'INGO', 'Other'];
const INDUSTRIES = ['IT', 'Banking', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Telecom', 'Other'];
const CURRENCIES = ['MMK', 'USD', 'THB', 'SGD', 'EUR'];
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
                                    <ChevronRight size={14} className={styles.tabChevron} />
                                </button>
                            );
                        })}
                    </nav>
                </div>

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
                <InfoItem icon={<MapPin size={18} />} label={t('profile.employment.officeLocation')} value={profile.officelocation || '-'} />
                <InfoItem icon={<MapPin size={18} />} label={t('profile.employment.workLocation')} value={profile.worklocation || '-'} />
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
        nationality: profile.nationalitytype || '',
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
    const [records, setRecords] = useState<{ current: EmergencyContact[], pending: EmergencyContact[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const relationships = useRelationships(showModal);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const { data: fetchedData } = useQuery({
        queryKey: ['emergency', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(EMERGENCY_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey,
                name: item.name || '',
                relationship: item.relationship || '',
                contactNumber: item.contactnumber || '',
                address: item.address || '',
                status: item.status?.toString() === '1' ? 'Approved' : (item.status?.toString() === '2' ? 'Rejected' : 'Pending'),
                modOption: item.modificationoption || 'New'
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

    const blank = (): EmergencyContact => ({ id: '', name: '', relationship: '', contactNumber: '', address: '', status: 'Pending', modOption: 'New' });
    const [form, setForm] = useState<EmergencyContact>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: EmergencyContact) => { setForm({ ...r }); setEditingId(r.id || null); setShowModal(true); };
    const close = () => { setShowModal(false); setEditingId(null); };

    const save = async () => {
        if (!form.name || !form.contactNumber) { toast.error('Name and Contact Number are required'); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        if (!isUpdate) {
            newRecord.id = Date.now().toString();
            newRecord.status = 'Pending';
        }

        const allRecords = [...records.current, ...records.pending];
        const updatedRecords = isUpdate
            ? allRecords.map(r => r.id === editingId ? newRecord : r)
            : [...allRecords, newRecord];

        const { domain } = useAuthStore.getState();
        const emergencylist = updatedRecords.map(r => ({
            syskey: r.id && r.id.length > 20 ? r.id : "",
            name: r.name,
            relationship: r.relationship,
            contactnumber: r.contactNumber,
            address: r.address,
            modificationoption: r.modOption,
            status: r.status === 'Approved' ? 'Active' : "0"
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
                    current: prev.current.filter(r => r.id !== editingId),
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
        const updatedCurrent = records.current.filter(r => r.id !== id);
        const updatedPending = records.pending.filter(r => r.id !== id);
        const allRecords = [...updatedCurrent, ...updatedPending];

        const { domain } = useAuthStore.getState();
        const emergencylist = allRecords.map(r => ({
            syskey: r.id && r.id.length > 20 ? r.id : "",
            name: r.name,
            relationship: r.relationship,
            contactnumber: r.contactNumber,
            address: r.address,
            modificationoption: r.modOption,
            status: r.status === 'Approved' ? 'Active' : "0"
        }));

        try {
            await mainClient.post(EMERGENCY_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                emergencylist
            });
            setRecords({ current: updatedCurrent, pending: updatedPending });
            toast.success('Removed emergency contact');
        } catch (err) {
            toast.error('Failed to remove emergency contact');
        }
    };

    const fv = (k: keyof EmergencyContact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value as any }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Phone size={20} />} title={t('profile.tabs.emergency')} subtitle={t('profile.emergency.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('common.addContact')}</button>} />

            {records.current.length === 0 && records.pending.length === 0
                ? <EmptyState message={t('profile.emergency.noContact')} onAdd={openAdd} />
                : (
                    <>
                        {records.current.length > 0 && (
                            <div className={styles.tableWrapper}>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: 'var(--color-neutral-800)' }}>{t('common.currentRecords')}</div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.emergency.contactNumber')}</th><th>{t('profile.emergency.address')}</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {records.current.map(r => (
                                            <tr key={r.id}>
                                                <td><strong>{r.name}</strong></td>
                                                <td>{t(`profile.options.relationships.${r.relationship}` as any, r.relationship)}</td>
                                                <td>{r.contactNumber}</td>
                                                <td>{r.address}</td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                                        <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.emergency.contactNumber')}</th><th>{t('profile.emergency.address')}</th><th>{t('common.status')}</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {records.pending.map(r => (
                                            <tr key={r.id} style={{ opacity: 0.85 }}>
                                                <td><strong>{r.name}</strong></td>
                                                <td>{t(`profile.options.relationships.${r.relationship}` as any, r.relationship)}</td>
                                                <td>{r.contactNumber}</td>
                                                <td>{r.address}</td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} /></td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                <FormModal title={editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'} onClose={close} onSave={save}>
                    <FormRow label={`${t('profile.emergency.name')} *`}>
                        <input className={styles.formInput} value={form.name} onChange={fv('name')} placeholder={t('profile.emergency.fullName')} />
                    </FormRow>
                    <FormRow label={t('profile.emergency.relationship')}>
                        <select className={styles.formSelect} value={form.relationship} onChange={fv('relationship')}>
                            <option value="">{t('profile.emergency.selectRelationship')}</option>
                            {relationships.map((r: string) => <option key={r} value={r}>{String(t(`profile.options.relationships.${r}` as any, r))}</option>)}
                        </select>
                    </FormRow>
                    <FormRow label={`${t('profile.emergency.contactNumber')} *`}>
                        <input className={styles.formInput} value={form.contactNumber} onChange={fv('contactNumber')} placeholder="09-xxx-xxx-xxx" />
                    </FormRow>
                    <FormRow label={t('profile.emergency.address')}>
                        <textarea className={styles.formTextarea} value={form.address} onChange={fv('address')} placeholder={t('profile.emergency.fullAddress')} rows={2} />
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
// TAB 4 — Work Experience (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function WorkExperienceTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<{ current: WorkExperience[], pending: WorkExperience[] }>({ current: [], pending: [] });
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const { data: fetchedData } = useQuery({
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
                    return parts.length === 3 ? `${parts[2]}-${parts[1]}` : val;
                }
                if (val.length >= 6) { // Supports YYYYMMDD and YYYYMM
                    return `${val.substring(0, 4)}-${val.substring(4, 6)}`;
                }
                return val;
            };

            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey,
                organization: item.organization,
                orgType: item.organizationtype || '',
                industry: item.industry || '',
                designation: item.designation,
                fromdate: parseExpDate(item.fromdate),
                todate: parseExpDate(item.todate),
                salary: item.previousmonthlysalary || '',
                currency: item.currency || 'MMK',
                reasonForChange: item.reasonforchange || '',
                status: item.status?.toString() === '1' ? 'Approved' : (item.status?.toString() === '2' ? 'Rejected' : 'Pending'),
                modOption: item.modificationoption || 'New'
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
            if (parts.length >= 2) {
                // Return YYYY-MM as 01/MM/YYYY
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

    const blankExp = (): WorkExperience => ({ id: '', organization: '', orgType: '', industry: '', designation: '', fromdate: '', todate: '', salary: '', currency: 'MMK', reasonForChange: '', status: 'Pending', modOption: 'New' });
    const [form, setForm] = useState<WorkExperience>(blankExp());

    const openAdd = () => { setForm(blankExp()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: WorkExperience) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
    const closeExp = () => { setShowModal(false); setEditingId(null); };

    const saveExp = async () => {
        if (!form.organization) { toast.error(t('profile.experience.reqOrg')); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        if (!isUpdate) {
            newRecord.id = Date.now().toString();
            newRecord.status = 'Pending';
        }

        const allRecords = [...records.current, ...records.pending];
        const updatedRecords = isUpdate
            ? allRecords.map(r => r.id === editingId ? newRecord : r)
            : [...allRecords, newRecord];

        const { domain } = useAuthStore.getState();
        const experiencelist = updatedRecords.map(r => ({
            organization: r.organization,
            organizationtype: r.orgType || null,
            industry: r.industry || null,
            designation: r.designation,
            fromdate: r.fromdate ? r.fromdate.replace('-', '') + '01' : '',
            todate: r.todate ? r.todate.replace('-', '') + '01' : '',
            previousmonthlysalary: r.salary ? r.salary.toString() : '',
            currency: r.currency || 'MMK',
            reasonforchange: r.reasonForChange || '',
            modificationoption: r.modOption,
            status: r.status === 'Approved' ? 'Active' : 0
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
        const updatedCurrent = records.current.filter(r => r.id !== id);
        const updatedPending = records.pending.filter(r => r.id !== id);
        const allRecords = [...updatedCurrent, ...updatedPending];

        const { domain } = useAuthStore.getState();
        const experiencelist = allRecords.map(r => ({
            organization: r.organization,
            organizationtype: r.orgType || null,
            industry: r.industry || null,
            designation: r.designation,
            fromdate: r.fromdate ? r.fromdate.replace('-', '') + '01' : '',
            todate: r.todate ? r.todate.replace('-', '') + '01' : '',
            previousmonthlysalary: r.salary ? r.salary.toString() : '',
            currency: r.currency || 'MMK',
            reasonforchange: r.reasonForChange || '',
            modificationoption: r.modOption,
            status: r.status === 'Approved' ? 'Active' : 0
        }));

        try {
            await mainClient.post(EXPERIENCE_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                experiencelist
            });
            setRecords({ current: updatedCurrent, pending: updatedPending });
            toast.success(t('profile.experience.removeSuccess'));
        } catch (err) {
            toast.error('Failed to remove experience');
        }
    };
    const f = (k: keyof WorkExperience) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Building2 size={20} />} title={t('profile.tabs.experience')} subtitle={t('profile.experience.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.experience.addBtn')}</button>} />

            {records.current.length === 0 && records.pending.length === 0
                ? <EmptyState message={t('profile.experience.noData')} onAdd={openAdd} />
                : (
                    <>
                        {records.current.length > 0 && (
                            <div className={styles.tableWrapper}>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 600, color: 'var(--color-neutral-800)' }}>{t('common.currentRecords')}</div>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>{t('profile.experience.org')}</th><th>{t('profile.experience.orgType')}</th><th>{t('profile.experience.industry')}</th>
                                            <th>{t('profile.experience.designation')}</th><th>{t('profile.experience.period')}</th><th>{t('profile.experience.salary')}</th><th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.current.map(r => (
                                            <tr key={r.id}>
                                                <td><strong>{r.organization}</strong></td>
                                                <td>{r.orgType}</td>
                                                <td>{r.industry}</td>
                                                <td>{r.designation}</td>
                                                <td className={styles.noWrap}>{displayExpDate(r.fromdate)} → {displayExpDate(r.todate) || t('profile.experience.present')}</td>
                                                <td className={styles.noWrap}>{r.salary} {r.currency}</td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                                            <th>{t('profile.experience.org')}</th><th>{t('profile.experience.orgType')}</th><th>{t('profile.experience.industry')}</th>
                                            <th>{t('profile.experience.designation')}</th><th>{t('profile.experience.period')}</th><th>{t('profile.experience.salary')}</th><th>{t('common.status')}</th><th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.pending.map(r => (
                                            <tr key={r.id} style={{ opacity: 0.85 }}>
                                                <td><strong>{r.organization}</strong></td>
                                                <td>{r.orgType}</td>
                                                <td>{r.industry}</td>
                                                <td>{r.designation}</td>
                                                <td className={styles.noWrap}>{displayExpDate(r.fromdate)} → {displayExpDate(r.todate) || t('profile.experience.present')}</td>
                                                <td className={styles.noWrap}>{r.salary} {r.currency}</td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} /></td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                <FormModal title={editingId ? t('profile.experience.modalEdit') : t('profile.experience.modalAdd')} onClose={closeExp} onSave={saveExp}>
                    <FormRow label={t('profile.experience.org')}>
                        <input className={styles.formInput} value={form.organization} onChange={f('organization')} placeholder={t('profile.experience.orgPlaceholder')} />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.experience.orgType')}>
                            <select className={styles.formSelect} value={form.orgType} onChange={f('orgType')}>
                                <option value="">{t('profile.experience.selectType')}</option>
                                {ORG_TYPES.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.experience.industry')}>
                            <select className={styles.formSelect} value={form.industry} onChange={f('industry')}>
                                <option value="">{t('profile.experience.selectIndustry')}</option>
                                {INDUSTRIES.map(o => <option key={o}>{o}</option>)}
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
                                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <FormRow label={t('profile.experience.reason')}>
                        <textarea className={styles.formTextarea} value={form.reasonForChange} onChange={f('reasonForChange')} placeholder={t('profile.experience.reasonPlaceholder')} rows={3} />
                    </FormRow>
                </FormModal>
            )}

            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => { if (deleteTarget) { removeExp(deleteTarget); setDeleteTarget(null); } }}
            />
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

    const formatDateForApi = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const parseDateFromApi = (dateStr: string) => {
        if (!dateStr) return '';
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m}-${d}`;
    };

    const { data: fetchedData } = useQuery({
        queryKey: ['qualification', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(QUALIFICATION_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey,
                type: item.type || 'Education',
                qualificationtype: item.qualificationtype || 'Education',
                description: item.description || '',
                educationname: item.educationname || '',
                university: item.university || '',
                year: item.year || '',
                country: item.country || '',
                fromdate: parseDateFromApi(item.fromdate),
                todate: parseDateFromApi(item.todate),
                isheight: item.isheight?.toString() === 'true' ? 'true' : 'false',
                status: item.status?.toString() || '0'
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

    const blank = (): Qualification => ({ id: '', type: 'Education', qualificationtype: 'Education', description: '', educationname: '', university: '', year: '', country: '', fromdate: '', todate: '', isheight: 'false', status: '0' });
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
    const openEdit = (r: Qualification) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
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

        const filtered = [...records.current, ...records.pending].filter(r => r.id !== editingId);
        const allRecords = [...filtered, newRecord];

        const { domain } = useAuthStore.getState();
        const qualificationlist = allRecords.map(r => ({
            syskey: r.id.length < 20 ? '' : r.id, // Only send real syskeys
            type: r.type,
            qualificationtype: r.qualificationtype,
            description: r.description,
            educationname: r.educationname,
            university: r.university,
            year: r.year,
            country: r.country,
            fromdate: formatDateForApi(r.fromdate),
            todate: formatDateForApi(r.todate),
            ishighest: r.isheight,
            status: r.id.length < 20 ? "0" : r.status
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
        const updatedCurrent = records.current.filter(r => r.id !== id);
        const updatedPending = records.pending.filter(r => r.id !== id);
        const allRecords = [...updatedCurrent, ...updatedPending];
        const { domain } = useAuthStore.getState();
        const qualificationlist = allRecords.map(r => ({
            syskey: r.id.length < 20 ? '' : r.id,
            type: r.type,
            qualificationtype: r.qualificationtype,
            description: r.description,
            educationname: r.educationname,
            university: r.university,
            year: r.year,
            country: r.country,
            fromdate: formatDateForApi(r.fromdate),
            todate: formatDateForApi(r.todate),
            isheight: r.isheight,
            status: r.id.length < 20 ? "0" : r.status
        }));

        try {
            await mainClient.post(QUALIFICATION_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                qualificationlist
            });
            setRecords({ current: updatedCurrent, pending: updatedPending });
            toast.success(t('profile.experience.removeSuccess'));
        } catch (err) {
            toast.error('Failed to remove qualification');
        }
    };
    const f = (k: keyof Qualification) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

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
                                                <td className={styles.noWrap}>{formatDateForApi(r.fromdate)} → {formatDateForApi(r.todate) || t('profile.experience.present')}<br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.year && `Class of ${r.year}`}</small></td>
                                                <td>{r.isheight === 'true' ? 'Yes' : 'No'}</td>
                                                <td><StatusBadge status={r.status === '0' ? 'Pending' : 'Active'} /></td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                                            <tr key={r.id} style={{ opacity: 0.85 }}>
                                                <td>{r.type}</td>
                                                <td><strong>{r.description}</strong></td>
                                                <td>{(r as any)._displayEduName || r.educationname} <br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.university}</small></td>
                                                <td className={styles.noWrap}>{formatDateForApi(r.fromdate)} → {formatDateForApi(r.todate) || t('profile.experience.present')}<br /><small style={{ color: 'var(--color-neutral-500)' }}>{r.year && `Class of ${r.year}`}</small></td>
                                                <td>{r.isheight === 'true' ? 'Yes' : 'No'}</td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status || '') as string} /></td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                            <input className={styles.formInput} value={form.year} onChange={f('year')} placeholder="e.g. 2024" />
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

    const { data: fetchedData } = useQuery({
        queryKey: ['family', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(FAMILY_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });

            const processArr = (arr: any[]) => arr.map((item: any) => ({
                id: item.syskey,
                name: item.name,
                gender: item.gender,
                dob: item.dob,
                relationship: item.relationship,
                taxEligible: (item.taxexeligibility || item.taxeligibility) ? 'Yes' : 'No',
                modOption: item.modificationoption || 'New',
                effectiveFrom: item.effectivedate,
                status: item.status?.toString() === '1' ? 'Approved' : (item.status?.toString() === '2' ? 'Rejected' : 'Pending'),
                attachment: item.signurl || item.attachment || ''
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

    const blank = (): FamilyMember => ({ id: '', name: '', gender: '', dob: '', relationship: '', taxEligible: 'No', modOption: 'New', effectiveFrom: '', status: 'Pending', attachment: '' });
    const [form, setForm] = useState<FamilyMember>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: FamilyMember) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
    const close = () => { setShowModal(false); setEditingId(null); };
    const save = async () => {
        if (!form.name) { toast.error(t('profile.family.reqName')); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        if (!isUpdate) {
            newRecord.id = Date.now().toString();
            newRecord.status = 'Pending';
        }

        const allRecords = [...records.current, ...records.pending];
        const updatedRecords = isUpdate
            ? allRecords.map(r => r.id === editingId ? newRecord : r)
            : [...allRecords, newRecord];

        const { domain } = useAuthStore.getState();
        const familylist = updatedRecords.map(r => ({
            name: r.name,
            gender: r.gender,
            dob: r.dob ? r.dob.replace(/-/g, '') : '',
            relationship: r.relationship,
            taxexeligibility: r.taxEligible === 'Yes',
            attachment: r.attachment || null,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            familystatus: r.modOption === 'New' ? '1' : '0',
            status: r.status === 'Approved' ? 'Active' : 0
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
                    current: prev.current.filter(r => r.id !== editingId),
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
        const updatedCurrent = records.current.filter(r => r.id !== id);
        const updatedPending = records.pending.filter(r => r.id !== id);
        const allRecords = [...updatedCurrent, ...updatedPending];

        const { domain } = useAuthStore.getState();
        const familylist = allRecords.map(r => ({
            name: r.name,
            gender: r.gender,
            dob: r.dob ? r.dob.replace(/-/g, '') : '',
            relationship: r.relationship,
            taxexeligibility: r.taxEligible === 'Yes',
            attachment: r.attachment || null,
            modificationoption: r.modOption,
            effectivedate: r.effectiveFrom ? r.effectiveFrom.replace(/-/g, '') : '',
            familystatus: r.modOption === 'New' ? '1' : '0',
            status: r.status === 'Approved' ? 'Active' : 0
        }));

        try {
            await mainClient.post(FAMILY_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                familylist
            });
            setRecords({ current: updatedCurrent, pending: updatedPending });
            toast.success(t('profile.experience.removeSuccess'));
        } catch (err) {
            toast.error('Failed to remove family information');
        }
    };
    const fv = (k: keyof FamilyMember) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value as any }));

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
                                                <td>{t(`profile.options.relationships.${r.relationship}` as any, r.relationship)}</td>
                                                <td><span className={r.taxEligible === 'Yes' ? styles.badgeGreen : styles.badgeGray}>{t(`profile.options.yesno.${r.taxEligible}` as any, r.taxEligible)}</span></td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status)} /></td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                                            <tr key={r.id} style={{ opacity: 0.85 }}>
                                                <td><strong>{r.name}</strong></td>
                                                <td>{t(`profile.options.genders.${r.gender}` as any, r.gender)}</td>
                                                <td>{r.dob}</td>
                                                <td>{t(`profile.options.relationships.${r.relationship}` as any, r.relationship)}</td>
                                                <td><span className={r.taxEligible === 'Yes' ? styles.badgeGreen : styles.badgeGray}>{t(`profile.options.yesno.${r.taxEligible}` as any, r.taxEligible)}</span></td>
                                                <td><StatusBadge status={t(`profile.options.status.${r.status}` as any, r.status)} /></td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button className={styles.iconBtn} onClick={() => setDeleteTarget(r.id || null)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                            <select className={styles.formSelect} value={form.relationship} onChange={fv('relationship')}>
                                <option value="">{t('profile.emergency.selectRelationship')}</option>
                                {relationships.map((r: string) => <option key={r} value={r}>{String(t(`profile.options.relationships.${r}` as any, r))}</option>)}
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
                        <FormRow label={t('profile.family.modOption')}>
                            <select className={styles.formSelect} value={form.modOption} onChange={fv('modOption')}>
                                {MOD_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.family.effectiveFrom')}>
                            <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} />
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
        primaryMobile: ''
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


    const { data: fetchedData, refetch } = useQuery({
        queryKey: ['address', profile.userid, profile.eid],
        queryFn: async () => {
            const res = await mainClient.post(ADDRESS_COMPARE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });

            const processArr = (arr: any[]) => (arr || []).map((item: any) => ({
                syskey: item.syskey,
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
                personalmobilephone: item.personalmobilephone || ''
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
        const curPerm = records.current.find(a => a.addressstatus === 0) || records.pending.find(a => a.addressstatus === 0);
        const curTemp = records.current.find(a => a.addressstatus === 1) || records.pending.find(a => a.addressstatus === 1);

        setForm({
            permanent: curPerm ? { ...curPerm } : { syskey: '', employeeid: profile.eid, address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 0, status: '0', statesyskey: '', districtsyskey: '', townshipsyskey: '', citysyskey: '', wardsyskey: '', countrysyskey: '' },
            temporary: curTemp ? { ...curTemp } : { syskey: '', employeeid: profile.eid, address: '', postalcode: '', state: '', district: '', township: '', city: '', ward: '', country: '', addressstatus: 1, status: '0', statesyskey: '', districtsyskey: '', townshipsyskey: '', citysyskey: '', wardsyskey: '', countrysyskey: '' }
        });

        const contactRef = records.pending[0] || records.current[0] || {} as any;
        setContactDetails({
            primaryEmail: contactRef.personalprimaryemail || '',
            secondaryEmail: contactRef.personalsecondarymail || '',
            primaryMobile: contactRef.personalmobilephone || ''
        });

        setIsEditing(true);
    };

    const cancel = () => setIsEditing(false);

    const save = async () => {
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

    const updateContact = (field: keyof typeof contactDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
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
        return <div className={styles.loadingContainer}><Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-primary-500)' }} /></div>;
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

function StatusBadge({ status }: { status: string | number }) {
    const { t } = useTranslation();
    const s = status?.toString().toLowerCase();
    const isApproved = s === 'approved' || s === '1' || s === 'active';
    const isRejected = s === 'rejected' || s === '2';

    let className = styles.statusBadge__pending;
    let icon = <Clock size={12} />;
    let label = t('profile.options.status.Pending');

    if (isApproved) {
        className = styles.statusBadge__approved;
        icon = <CheckCircle2 size={12} />;
        label = t('profile.options.status.Approved');
    } else if (isRejected) {
        className = styles.statusBadge__rejected;
        icon = <X size={12} />;
        label = t('profile.options.status.Rejected');
    }

    return (
        <span className={`${styles.statusBadge} ${className}`}>
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
