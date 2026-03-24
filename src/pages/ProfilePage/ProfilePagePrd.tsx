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
import mainClient from '../../lib/main-client';
import authClient from '../../lib/auth-client';
import apiClient from '../../lib/api-client';
import { APP_ID } from '../../lib/auth-token';
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy';
import { Button, Input } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { MENU_ITEMS, GET_FAMILY, FAMILY_UPDATE, GET_EXPERIENCE, EXPERIENCE_UPDATE, GET_SETUP_LIST, GET_QUALIFICATION, QUALIFICATION_UPDATE } from '../../config/api-routes';
import styles from './ProfilePagePrd.module.css';

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
    fromDate: string;
    toDate: string;
    salary: string;
    currency: string;
    reasonForChange: string;
}

interface Qualification {
    id: string;
    type: string;
    qualificationtype: string;
    description: string;
    educationname: string;
    fromdate: string;
    todate: string;
    isheight: string;
    status: string;
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
    name: string;
    relationship: string;
    contactNumber: string;
    address: string;
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
const STATES = ['Yangon', 'Mandalay', 'Naypyidaw', 'Sagaing', 'Bago', 'Magway', 'Ayeyarwady', 'Shan', 'Kachin', 'Kayah', 'Kayin', 'Chin', 'Mon', 'Rakhine', 'Tanintharyi'];
const MOD_OPTIONS = ['New', 'Correct', 'Update'];

// ── Mock placeholder data (Emergency, Experience, Qualification, Family, Contact still use mock) ──
const MOCK_EMERGENCY: EmergencyContact[] = [
    { name: 'Daw Kyi Kyi', relationship: 'Mother', contactNumber: '09-123-456-789', address: 'No.5, Strand Road, Yangon' },
    { name: '', relationship: '', contactNumber: '', address: '' },
];

const MOCK_CONTACT = {
    permanentState: 'Yangon', permanentDistrict: 'Bahan', permanentTownship: 'Bahan', permanentTown: 'Bahan',
    temporaryState: '', temporaryDistrict: '', temporaryTownship: '', temporaryTown: '',
    primaryEmail: 'personal@email.com', secondaryEmail: '', primaryMobile: '09-999-888-777',
    status: 'Approved',
};

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
                const endpoint = urlUserId
                    ? `api/teams/employees/profile?userid=${encodeURIComponent(urlUserId)}`
                    : 'api/employees/profile';
                const res = await mainClient.post(endpoint);
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
                    {activeTab === 'emergency' && <EmergencyContactTab />}
                    {activeTab === 'experience' && <WorkExperienceTab profile={profile} />}
                    {activeTab === 'qualification' && <QualificationTab profile={profile} />}
                    {activeTab === 'family' && <FamilyInfoTab profile={profile} />}
                    {activeTab === 'contact' && <ContactInfoTab />}
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
function EmergencyContactTab() {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<EmergencyContact[]>(MOCK_EMERGENCY);
    const [editing, setEditing] = useState<number | null>(null);
    const relationships = useRelationships(editing !== null);
    const [draft, setDraft] = useState<EmergencyContact>({ name: '', relationship: '', contactNumber: '', address: '' });

    const startEdit = (idx: number) => { setEditing(idx); setDraft({ ...contacts[idx] }); };
    const cancel = () => setEditing(null);
    const save = (idx: number) => {
        const updated = [...contacts];
        updated[idx] = draft;
        setContacts(updated);
        setEditing(null);
        toast.success(t('profile.emergency.saveSuccess'));
    };

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Phone size={20} />} title={t('profile.tabs.emergency')} subtitle={t('profile.emergency.subtitle')} />
            <div className={styles.contactsGrid}>
                {contacts.map((c, idx) => (
                    <div key={idx} className={styles.contactPersonCard}>
                        <div className={styles.contactPersonHeader}>
                            <span className={styles.contactPersonLabel}>{t('profile.emergency.personLabel')} {idx + 1}</span>
                            {editing !== idx && (
                                <button className={styles.iconBtn} onClick={() => startEdit(idx)} title={t('profile.personal.editHint')}>
                                    <Edit3 size={15} />
                                </button>
                            )}
                        </div>

                        {editing === idx ? (
                            <div className={styles.inlineForm}>
                                <FormRow label={t('profile.emergency.name')}>
                                    <input className={styles.formInput} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder={t('profile.emergency.fullName')} />
                                </FormRow>
                                <FormRow label={t('profile.emergency.relationship')}>
                                    <select className={styles.formSelect} value={draft.relationship} onChange={e => setDraft({ ...draft, relationship: e.target.value })}>
                                        <option value="">{t('profile.emergency.selectRelationship')}</option>
                                        {relationships.map((r: string) => <option key={r} value={r}>{String(t(`profile.options.relationships.${r}` as any, r))}</option>)}
                                    </select>
                                </FormRow>
                                <FormRow label={t('profile.emergency.contactNumber')}>
                                    <input className={styles.formInput} value={draft.contactNumber} onChange={e => setDraft({ ...draft, contactNumber: e.target.value })} placeholder="09-xxx-xxx-xxx" />
                                </FormRow>
                                <FormRow label={t('profile.emergency.address')}>
                                    <textarea className={styles.formTextarea} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder={t('profile.emergency.fullAddress')} rows={2} />
                                </FormRow>
                                <div className={styles.formActions}>
                                    <button className={styles.btnGhost} onClick={cancel}>{t('common.cancel')}</button>
                                    <button className={styles.btnPrimary} onClick={() => save(idx)}><Save size={14} /> {t('request.save')}</button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.contactFields}>
                                {c.name ? (
                                    <>
                                        <ContactField label={t('profile.emergency.name')} value={c.name} />
                                        <ContactField label={t('profile.emergency.relationship')} value={t(`profile.options.relationships.${c.relationship}` as any, c.relationship)} />
                                        <ContactField label={t('profile.emergency.contactNumber')} value={c.contactNumber} />
                                        <ContactField label={t('profile.emergency.address')} value={c.address} />
                                    </>
                                ) : (
                                    <p className={styles.emptySlot}>{t('profile.emergency.noContact')}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 4 — Work Experience (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function WorkExperienceTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<WorkExperience[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: fetchedData } = useQuery({
        queryKey: ['experience', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_EXPERIENCE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const arr = res.data?.data || [];
            return arr.map((item: any) => ({
                id: item.syskey,
                organization: item.organization,
                orgType: item.organizationtype || '',
                industry: item.industry || '',
                designation: item.designation,
                // API dates are DD/MM/YYYY. We need YYYY-MM for type="month" input
                fromDate: item.fromdate ? `${item.fromdate.split('/')[2]}-${item.fromdate.split('/')[1]}` : '',
                toDate: item.todate ? `${item.todate.split('/')[2]}-${item.todate.split('/')[1]}` : '',
                salary: item.previousmonthlysalary || '',
                currency: item.currency || 'MMK',
                reasonForChange: item.reasonforchange || ''
            })) as WorkExperience[];
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);

    const blankExp = (): WorkExperience => ({ id: '', organization: '', orgType: '', industry: '', designation: '', fromDate: '', toDate: '', salary: '', currency: 'MMK', reasonForChange: '' });
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
        }

        const updatedRecords = isUpdate
            ? records.map(r => r.id === editingId ? newRecord : r)
            : [...records, newRecord];

        const { domain } = useAuthStore.getState();
        const experiencelist = updatedRecords.map(r => ({
            organization: r.organization,
            organizationtype: r.orgType || null,
            industry: r.industry || null,
            designation: r.designation,
            fromdate: r.fromDate ? r.fromDate.replace('-', '') + '01' : '',
            todate: r.toDate ? r.toDate.replace('-', '') + '01' : '',
            previousmonthlysalary: r.salary ? r.salary.toString() : '',
            currency: r.currency || 'MMK',
            reasonforchange: r.reasonForChange || ''
        }));

        try {
            await mainClient.post(EXPERIENCE_UPDATE, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid,
                experiencelist
            });
            setRecords(updatedRecords);
            closeExp();
            toast.success(isUpdate ? t('profile.experience.saveSuccessUpdate') : t('profile.experience.saveSuccessAdd'));
        } catch (err) {
            toast.error('Failed to save experience information');
        }
    };

    const removeExp = (id: string) => { setRecords(rs => rs.filter(r => r.id !== id)); toast.success(t('profile.experience.removeSuccess')); };
    const f = (k: keyof WorkExperience) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Building2 size={20} />} title={t('profile.tabs.experience')} subtitle={t('profile.experience.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.experience.addBtn')}</button>} />

            {records.length === 0
                ? <EmptyState message={t('profile.experience.noData')} onAdd={openAdd} />
                : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{t('profile.experience.org')}</th><th>{t('profile.experience.orgType')}</th><th>{t('profile.experience.industry')}</th>
                                    <th>{t('profile.experience.designation')}</th><th>{t('profile.experience.period')}</th><th>{t('profile.experience.salary')}</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.organization}</strong></td>
                                        <td>{r.orgType}</td>
                                        <td>{r.industry}</td>
                                        <td>{r.designation}</td>
                                        <td className={styles.noWrap}>{r.fromDate} → {r.toDate || t('profile.experience.present')}</td>
                                        <td className={styles.noWrap}>{r.salary} {r.currency}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                <button className={styles.iconBtn} onClick={() => removeExp(r.id)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                            <input className={styles.formInput} type="month" value={form.fromDate} onChange={f('fromDate')} />
                        </FormRow>
                        <FormRow label={t('profile.experience.toDate')}>
                            <input className={styles.formInput} type="month" value={form.toDate} onChange={f('toDate')} />
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
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 5 — Qualification (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function QualificationTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<Qualification[]>([]);
    const [showModal, setShowModal] = useState(false);
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
            const res = await mainClient.post(GET_QUALIFICATION, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const arr = res.data?.data || [];
            return arr.map((item: any) => ({
                id: item.syskey,
                type: item.type || 'Education',
                qualificationtype: item.qualificationtype || 'Education',
                description: item.description || '',
                educationname: item.educationname || '',
                fromdate: parseDateFromApi(item.fromdate),
                todate: parseDateFromApi(item.todate),
                isheight: item.isheight?.toString() === 'true' ? 'true' : 'false',
                status: item.status?.toString() || '0'
            })) as Qualification[];
        },
        enabled: !!profile.userid && !!profile.eid
    });

    useEffect(() => {
        if (fetchedData) {
            setRecords(fetchedData);
        }
    }, [fetchedData]);

    const blank = (): Qualification => ({ id: '', type: 'Education', qualificationtype: 'Education', description: '', educationname: '', fromdate: '', todate: '', isheight: 'false', status: '0' });
    const [form, setForm] = useState<Qualification>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: Qualification) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
    const close = () => { setShowModal(false); setEditingId(null); };

    const save = async () => {
        if (!form.description) { toast.error(t('profile.qualification.reqDegree', 'Description is required')); return; }

        const isUpdate = !!editingId;
        const newRecord = { ...form };
        if (!isUpdate) {
            newRecord.id = Date.now().toString(); // Temporary ID, real syskey provided by backend
        }

        const updatedRecords = isUpdate
            ? records.map(r => r.id === editingId ? newRecord : r)
            : [...records, newRecord];

        const { domain } = useAuthStore.getState();
        const qualificationlist = updatedRecords.map(r => ({
            syskey: r.id.length < 20 ? '' : r.id, // Only send real syskeys
            type: r.type,
            qualificationtype: r.qualificationtype,
            description: r.description,
            educationname: r.educationname,
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
            setRecords(updatedRecords);
            close();
            toast.success(isUpdate ? t('profile.qualification.saveSuccessUpdate') : t('profile.qualification.saveSuccessAdd'));
        } catch (err) {
            toast.error('Failed to save qualification information');
        }
    };

    const remove = (id: string) => { setRecords(rs => rs.filter(r => r.id !== id)); toast.success(t('profile.experience.removeSuccess')); };
    const f = (k: keyof Qualification) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<BookOpen size={20} />} title={t('profile.tabs.qualification')} subtitle={t('profile.qualification.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.qualification.addBtn')}</button>} />

            {records.length === 0
                ? <EmptyState message={t('profile.qualification.noData')} onAdd={openAdd} />
                : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Institution</th>
                                    <th>Period</th>
                                    <th>Highest?</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.type}</td>
                                        <td><strong>{r.description}</strong></td>
                                        <td>{r.educationname}</td>
                                        <td className={styles.noWrap}>{formatDateForApi(r.fromdate)} → {formatDateForApi(r.todate) || t('profile.experience.present')}</td>
                                        <td>{r.isheight === 'true' ? 'Yes' : 'No'}</td>
                                        <td><StatusBadge status={r.status === '0' ? 'Pending' : 'Active'} /></td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title={t('profile.personal.editHint')}><Edit3 size={14} /></button>
                                                <button className={styles.iconBtn} onClick={() => remove(r.id)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            {showModal && (
                <FormModal title={editingId ? t('profile.qualification.modalEdit') : t('profile.qualification.modalAdd')} onClose={close} onSave={save}>
                    <div className={styles.formGrid2}>
                        <FormRow label="Type">
                            <select className={styles.formSelect} value={form.type} onChange={f('type')}>
                                <option value="Education">Education</option>
                                <option value="Certificate">Certificate</option>
                                <option value="Other">Other</option>
                            </select>
                        </FormRow>
                        <FormRow label="Qualification Type">
                            <input className={styles.formInput} value={form.qualificationtype} onChange={f('qualificationtype')} placeholder="Education, Certificate..." />
                        </FormRow>
                    </div>
                    <FormRow label={t('profile.qualification.degree', 'Description / Degree')}>
                        <input className={styles.formInput} value={form.description} onChange={f('description')} placeholder={t('profile.qualification.degreePlaceholder', 'e.g. Computer Science')} />
                    </FormRow>
                    <FormRow label={t('profile.qualification.institution', 'Institution / Education Name')}>
                        <input className={styles.formInput} value={form.educationname} onChange={f('educationname')} placeholder={t('profile.qualification.instPlaceholder', 'Institution name')} />
                    </FormRow>

                    <div className={styles.formGrid2}>
                        <FormRow label="From Date">
                            <input className={styles.formInput} type="date" value={form.fromdate} onChange={f('fromdate')} />
                        </FormRow>
                        <FormRow label="To Date">
                            <input className={styles.formInput} type="date" value={form.todate} onChange={f('todate')} />
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label="Highest Qualification?">
                            <select className={styles.formSelect} value={form.isheight} onChange={f('isheight')}>
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </select>
                        </FormRow>
                    </div>
                </FormModal>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 6 — Family Information for Tax Calculation (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function FamilyInfoTab({ profile }: { profile: ProfileData }) {
    const { t } = useTranslation();
    const [records, setRecords] = useState<FamilyMember[]>([]);
    const [showModal, setShowModal] = useState(false);
    const relationships = useRelationships(showModal);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: fetchedData } = useQuery({
        queryKey: ['family', profile.userid, profile.eid],
        queryFn: async () => {
            const { domain } = useAuthStore.getState();
            const res = await mainClient.post(GET_FAMILY, {
                userid: profile.userid,
                domain: domain || 'demouat',
                employeeid: profile.eid
            });
            const arr = res.data?.data || [];
            return arr.map((item: any) => ({
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

        const updatedRecords = isUpdate
            ? records.map(r => r.id === editingId ? newRecord : r)
            : [...records, newRecord];

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
            setRecords(updatedRecords);
            close();
            toast.success(isUpdate ? t('profile.family.saveSuccessUpdate') : t('profile.family.saveSuccessAdd'));
        } catch (err) {
            toast.error('Failed to save family information');
        }
    };
    const remove = (id: string) => { setRecords(rs => rs.filter(r => r.id !== id)); toast.success(t('profile.experience.removeSuccess')); };
    const fv = (k: keyof FamilyMember) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value as any }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Users size={20} />} title={t('profile.tabs.family')} subtitle={t('profile.family.subtitle')}
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> {t('profile.family.addBtn')}</button>} />

            {records.length === 0
                ? <EmptyState message={t('profile.family.noData')} onAdd={openAdd} />
                : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>{t('profile.emergency.name')}</th><th>{t('profile.personal.gender')}</th><th>{t('profile.personal.dob')}</th><th>{t('profile.emergency.relationship')}</th><th>{t('profile.family.taxEligible')}</th><th>{t('profile.family.status')}</th><th></th></tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
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
                                                <button className={styles.iconBtn} onClick={() => remove(r.id)} title={t('request.delete')} style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                        <input className={styles.formInput} type="file" accept="image/*,.pdf" onChange={e => setForm(prev => ({ ...prev, attachment: e.target.files?.[0]?.name || '' }))} />
                        {form.attachment && <p className={styles.fileHint}>Selected: {form.attachment}</p>}
                    </FormRow>
                </FormModal>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 7 — Contact Information (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function ContactInfoTab() {
    const { t } = useTranslation();
    const [data, setData] = useState(MOCK_CONTACT);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(MOCK_CONTACT);

    const startEdit = () => { setDraft({ ...data }); setIsEditing(true); };
    const cancel = () => setIsEditing(false);
    const save = () => {
        setData(draft);
        setIsEditing(false);
        toast.success(t('profile.contact.saveSuccess'));
    };
    const d = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(prev => ({ ...prev, [k]: e.target.value }));

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
                    <p className={styles.subSectionTitle}>{t('profile.contact.permanentAddress')}</p>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.contact.state')}>
                            <select className={styles.formSelect} value={draft.permanentState} onChange={d('permanentState')}>
                                <option value="">{t('profile.contact.selectState')}</option>
                                {STATES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.district')}>
                            <input className={styles.formInput} value={draft.permanentDistrict} onChange={d('permanentDistrict')} />
                        </FormRow>
                        <FormRow label={t('profile.contact.township')}>
                            <input className={styles.formInput} value={draft.permanentTownship} onChange={d('permanentTownship')} />
                        </FormRow>
                        <FormRow label={t('profile.contact.town')}>
                            <input className={styles.formInput} value={draft.permanentTown} onChange={d('permanentTown')} />
                        </FormRow>
                    </div>

                    {/* Temporary Address */}
                    <p className={styles.subSectionTitle} style={{ marginTop: 'var(--space-6)' }}>{t('profile.contact.temporaryAddress')}</p>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.contact.state')}>
                            <select className={styles.formSelect} value={draft.temporaryState} onChange={d('temporaryState')}>
                                <option value="">{t('profile.contact.selectState')}</option>
                                {STATES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label={t('profile.contact.district')}>
                            <input className={styles.formInput} value={draft.temporaryDistrict} onChange={d('temporaryDistrict')} />
                        </FormRow>
                        <FormRow label={t('profile.contact.township')}>
                            <input className={styles.formInput} value={draft.temporaryTownship} onChange={d('temporaryTownship')} />
                        </FormRow>
                        <FormRow label={t('profile.contact.town')}>
                            <input className={styles.formInput} value={draft.temporaryTown} onChange={d('temporaryTown')} />
                        </FormRow>
                    </div>

                    {/* Email & Phone */}
                    <p className={styles.subSectionTitle} style={{ marginTop: 'var(--space-6)' }}>{t('profile.contact.contactDetails')}</p>
                    <div className={styles.formGrid2}>
                        <FormRow label={t('profile.contact.primaryEmail')}>
                            <input className={styles.formInput} type="email" value={draft.primaryEmail} onChange={d('primaryEmail')} placeholder="primary@email.com" />
                        </FormRow>
                        <FormRow label={t('profile.contact.secondaryEmail')}>
                            <input className={styles.formInput} type="email" value={draft.secondaryEmail} onChange={d('secondaryEmail')} placeholder="secondary@email.com" />
                        </FormRow>
                        <FormRow label={t('profile.contact.primaryMobile')}>
                            <input className={styles.formInput} type="tel" value={draft.primaryMobile} onChange={d('primaryMobile')} placeholder="09-xxx-xxx-xxx" />
                        </FormRow>
                    </div>

                    <div className={styles.formActions} style={{ marginTop: 'var(--space-6)' }}>
                        <button className={styles.btnGhost} onClick={cancel}>{t('common.cancel')}</button>
                        <button className={styles.btnPrimary} onClick={save}><Save size={14} /> {t('request.save')}</button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className={styles.contactSections}>
                        <div className={styles.addressBlock}>
                            <p className={styles.subSectionTitle}>{t('profile.contact.permanentAddress')}</p>
                            <div className={styles.infoGrid}>
                                <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.state')} value={data.permanentState} />
                                <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.district')} value={data.permanentDistrict} />
                                <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.township')} value={data.permanentTownship} />
                                <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.town')} value={data.permanentTown} />
                            </div>
                        </div>
                        <div className={styles.addressBlock}>
                            <p className={styles.subSectionTitle}>{t('profile.contact.temporaryAddress')}</p>
                            {data.temporaryState || data.temporaryDistrict || data.temporaryTownship || data.temporaryTown
                                ? (
                                    <div className={styles.infoGrid}>
                                        <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.state')} value={data.temporaryState} />
                                        <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.district')} value={data.temporaryDistrict} />
                                        <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.township')} value={data.temporaryTownship} />
                                        <InfoItem icon={<MapPin size={18} />} label={t('profile.contact.town')} value={data.temporaryTown} />
                                    </div>
                                )
                                : <p className={styles.emptySlot}>{t('common.noData')}</p>
                            }
                        </div>
                        <div className={styles.addressBlock}>
                            <p className={styles.subSectionTitle}>{t('profile.contact.contactDetails')}</p>
                            <div className={styles.infoGrid}>
                                <InfoItem icon={<Mail size={18} />} label={t('profile.contact.primaryEmail')} value={data.primaryEmail} />
                                <InfoItem icon={<Mail size={18} />} label={t('profile.contact.secondaryEmail')} value={data.secondaryEmail || '-'} />
                                <InfoItem icon={<Phone size={18} />} label={t('profile.contact.primaryMobile')} value={data.primaryMobile} />
                            </div>
                        </div>
                    </div>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>{t('profile.family.status')}:</span>
                        <StatusBadge status={t(`profile.options.status.${data.status}` as any, data.status)} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Shared sub-components
// ═══════════════════════════════════════════════════════════════════════

function SectionHeader({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIconWrap}>{icon}</div>
                <div>
                    <h2 className={styles.sectionTitle}>{title}</h2>
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

function ContactField({ label, value }: { label: string; value: string }) {
    return (
        <div className={styles.contactField}>
            <span className={styles.contactFieldLabel}>{label}:</span>
            <span className={styles.contactFieldValue}>{value || '-'}</span>
        </div>
    );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={styles.formRow}>
            <label className={styles.formLabel}>{label}</label>
            {children}
        </div>
    );
}

function FormModal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalCard} style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{title}</h2>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                <div className={styles.modalActions}>
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={onSave}><Save size={14} style={{ marginRight: 4 }} /> Save</Button>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message, onAdd }: { message: string; onAdd: () => void }) {
    return (
        <div className={styles.emptyState}>
            <FileText size={36} className={styles.emptyStateIcon} />
            <p>{message}</p>
            <button className={styles.addBtn} onClick={onAdd}><Plus size={15} /> Add Now</button>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isApproved = status?.toLowerCase() === 'approved';
    return (
        <span className={`${styles.statusBadge} ${isApproved ? styles.statusBadge__approved : styles.statusBadge__pending}`}>
            {isApproved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
            {status}
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
