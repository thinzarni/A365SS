import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Mail, Calendar, Briefcase, Award, CreditCard, Clock, Activity,
    Loader2, KeyRound, Eye, EyeOff, X, CheckCircle2, Circle, Pencil,
    Building2, User, Phone, BookOpen, Users, MapPin, Plus, Trash2, Edit3,
    ChevronRight, FileText, AlertCircle, Save
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import mainClient from '../../lib/main-client';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import { usePasswordPolicy } from '../../hooks/usePasswordPolicy';
import { Button, Input } from '../../components/ui';
import { toast } from 'react-hot-toast';
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
    degree: string;
    institution: string;
    major: string;
    yearCompleted: string;
    grade: string;
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
const TABS = [
    { id: 'employment', label: 'Employment Profile', icon: Briefcase },
    { id: 'personal', label: 'Personal Profile', icon: User },
    { id: 'emergency', label: 'Emergency Contacts', icon: Phone },
    { id: 'experience', label: 'Work Experience', icon: Building2 },
    { id: 'qualification', label: 'Qualification', icon: BookOpen },
    { id: 'family', label: 'Family Information', icon: Users },
    { id: 'contact', label: 'Contact Information', icon: MapPin },
] as const;
type TabId = typeof TABS[number]['id'];

const RELATIONSHIPS = ['Father', 'Mother', 'Spouse', 'Sibling', 'Son', 'Daughter', 'Relative', 'Friend', 'Other'];
const NATIONALITIES = ['Myanmar', 'Chinese', 'Indian', 'Thai', 'Japanese', 'Korean', 'American', 'Other'];
const ETHNICITIES = ['Bamar', 'Shan', 'Karen', 'Rakhine', 'Mon', 'Karenni', 'Chin', 'Kachin', 'Other'];
const ORG_TYPES = ['Government', 'Private', 'NGO', 'INGO', 'Other'];
const INDUSTRIES = ['IT', 'Banking', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Telecom', 'Other'];
const CURRENCIES = ['MMK', 'USD', 'THB', 'SGD', 'EUR'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const STATES = ['Yangon', 'Mandalay', 'Naypyidaw', 'Sagaing', 'Bago', 'Magway', 'Ayeyarwady', 'Shan', 'Kachin', 'Kayah', 'Kayin', 'Chin', 'Mon', 'Rakhine', 'Tanintharyi'];
const MOD_OPTIONS = ['New', 'Correct', 'Update'];

// ── Mock placeholder data ──────────────────────────────────────────────
const MOCK_EMPLOYMENT = {
    companyName: 'MPT Myanmar', employeeId: 'EMP-0042', employmentType: 'Full-time',
    jobLevel: 'L3', jobTitle: 'Senior Software Engineer', grade: 'G5',
    officeEmail: 'employee@mpt.com.mm', jobDescription: 'Responsible for developing and maintaining enterprise HR systems.',
    officeLocation: 'Head Office – Yangon', workLocation: 'Hybrid',
    department: 'Information Technology', dateOfJoining: '2021-06-01',
    serviceYear: '3 years 9 months', reportingManager: 'U Kyaw Zin Oo',
};
const MOCK_PERSONAL = {
    dob: '1995-04-15', age: '30 years 11 months', nrc: '12/MAKAT(N)123456',
    maritalStatus: 'Single', gender: 'Male', nationality: 'Myanmar', ethnicity: 'Bamar',
};
const MOCK_EMERGENCY: EmergencyContact[] = [
    { name: 'Daw Kyi Kyi', relationship: 'Mother', contactNumber: '09-123-456-789', address: 'No.5, Strand Road, Yangon' },
    { name: '', relationship: '', contactNumber: '', address: '' },
];
const MOCK_EXPERIENCE: WorkExperience[] = [
    { id: '1', organization: 'Yoma Bank', orgType: 'Private', industry: 'Banking', designation: 'Junior Developer', fromDate: '2018-01', toDate: '2021-05', salary: '500000', currency: 'MMK', reasonForChange: 'Career growth' },
];
const MOCK_QUALIFICATIONS: Qualification[] = [
    { id: '1', degree: 'B.Sc. (Computer Science)', institution: 'University of Computer Studies, Yangon', major: 'Computer Science', yearCompleted: '2018', grade: 'Distinction' },
];
const MOCK_FAMILY: FamilyMember[] = [
    { id: '1', name: 'Daw Aye Aye', gender: 'Female', dob: '1965-03-10', relationship: 'Mother', taxEligible: 'Yes', modOption: 'New', effectiveFrom: '2024-01-01', status: 'Approved' },
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
    const [activeTab, setActiveTab] = useState<TabId>('employment');

    // Change password state
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
        queryKey: ['employee-profile', user?.usersyskey],
        queryFn: async () => {
            try {
                const res = await mainClient.post('api/employees/profile');
                return res.data?.data ?? res.data ?? null;
            } catch (err) { console.error('Failed to fetch profile', err); return null; }
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
                {/* ── Left: Avatar + Tab Nav ── */}
                <div className={styles.sidePanel}>
                    {/* Avatar */}
                    <div className={styles.avatarCard}>
                        <div className={styles.avatarCircle}>
                            {profile.profile
                                ? <img src={profile.profile} alt={profile.name} className={styles.avatarImage} />
                                : <span className={styles.avatarInitials}>{initials}</span>
                            }
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
                        <div className={styles.settingsPanel}>
                            <p className={styles.settingsPanelTitle}>Settings</p>
                            <button id="change-password-btn" className={styles.settingsItem} onClick={() => setShowChangePwd(true)}>
                                <KeyRound size={16} /><span>Change Password</span>
                            </button>
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
                                    <ChevronRight size={14} className={styles.tabChevron} />
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* ── Right: Tab Content ── */}
                <div className={styles.tabContent}>
                    {activeTab === 'employment' && <EmploymentTab />}
                    {activeTab === 'personal' && <PersonalTab profile={profile} />}
                    {activeTab === 'emergency' && <EmergencyContactTab />}
                    {activeTab === 'experience' && <WorkExperienceTab />}
                    {activeTab === 'qualification' && <QualificationTab />}
                    {activeTab === 'family' && <FamilyInfoTab />}
                    {activeTab === 'contact' && <ContactInfoTab />}
                </div>
            </div>

            {/* ── Change Password Modal ── */}
            {showChangePwd && (
                <div className={styles.modalBackdrop} onClick={closeModal}>
                    <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalIconWrap}><KeyRound size={20} /></div>
                            <h2 className={styles.modalTitle}>Change Password</h2>
                            <button className={styles.modalClose} onClick={closeModal} aria-label="Close"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleChangePwd} className={styles.modalForm}>
                            <PwdInput id="old-pwd" label="Current Password" value={oldPassword} onChange={setOldPassword} show={showOld} onToggle={() => setShowOld(v => !v)} />
                            <PwdInput id="new-pwd" label="New Password" value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(v => !v)} />
                            {requirements.length > 0 && (
                                <div className={`${styles.requirementsCard} ${allMet ? styles.requirementsCard__met : ''}`}>
                                    <p className={styles.requirementsTitle}>Password requirements</p>
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
                            <PwdInput id="confirm-pwd" label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                <p className={styles.mismatch}>Passwords do not match</p>
                            )}
                            <div className={styles.modalActions}>
                                <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                                <Button type="submit" loading={pwdLoading} disabled={pwdLoading}>Change Password</Button>
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
function EmploymentTab() {
    const d = MOCK_EMPLOYMENT;
    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Briefcase size={20} />} title="Employment Profile" subtitle="View your employment information" />
            <div className={styles.infoGrid}>
                <InfoItem icon={<Building2 size={18} />} label="Company Name" value={d.companyName} />
                <InfoItem icon={<CreditCard size={18} />} label="Employee ID" value={d.employeeId} />
                <InfoItem icon={<Briefcase size={18} />} label="Employment Type" value={d.employmentType} />
                <InfoItem icon={<Award size={18} />} label="Job Level – Job Title" value={`${d.jobLevel} – ${d.jobTitle}`} />
                <InfoItem icon={<Award size={18} />} label="Grade" value={d.grade} />
                <InfoItem icon={<Mail size={18} />} label="Office Email" value={d.officeEmail} />
                <InfoItem icon={<MapPin size={18} />} label="Office Location" value={d.officeLocation} />
                <InfoItem icon={<MapPin size={18} />} label="Work Location" value={d.workLocation} />
                <InfoItem icon={<Building2 size={18} />} label="Department" value={d.department} />
                <InfoItem icon={<Calendar size={18} />} label="Date of Joining" value={d.dateOfJoining} />
                <InfoItem icon={<Clock size={18} />} label="Service Year" value={d.serviceYear} />
                <InfoItem icon={<User size={18} />} label="Reporting Manager" value={d.reportingManager} />
            </div>
            {/* Job Description takes full width */}
            <div className={styles.fullWidthItem}>
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.infoIcon}><FileText size={18} /></div>
                    <div className={styles.infoContent}>
                        <div className={styles.infoLabel}>Job Description</div>
                        <div className={styles.infoValue}>{d.jobDescription}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 2 — Personal Profile (view only)
// ═══════════════════════════════════════════════════════════════════════
function PersonalTab({ profile }: { profile: ProfileData }) {
    const d = MOCK_PERSONAL;
    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<User size={20} />} title="Personal Profile" subtitle="Your personal details — contact HR to make changes" />
            <div className={styles.infoGrid}>
                <InfoItem icon={<Calendar size={18} />} label="Date of Birth" value={d.dob} />
                <InfoItem icon={<Clock size={18} />} label="Age" value={d.age} />
                <InfoItem icon={<CreditCard size={18} />} label="NRC" value={profile.ic || d.nrc} />
                <InfoItem icon={<Activity size={18} />} label="Marital Status" value={profile.maritalstatus || d.maritalStatus} />
                <InfoItem icon={<User size={18} />} label="Gender" value={d.gender} />
                <InfoItem icon={<Award size={18} />} label="Nationality" value={d.nationality} />
                <InfoItem icon={<Award size={18} />} label="Ethnicity" value={d.ethnicity} />
            </div>
            <div className={styles.infoNotice}>
                <AlertCircle size={14} />
                <span>To update personal information, please raise a request with HR.</span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 3 — Emergency Contact Details (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function EmergencyContactTab() {
    const [contacts, setContacts] = useState<EmergencyContact[]>(MOCK_EMERGENCY);
    const [editing, setEditing] = useState<number | null>(null);
    const [draft, setDraft] = useState<EmergencyContact>({ name: '', relationship: '', contactNumber: '', address: '' });

    const startEdit = (idx: number) => { setEditing(idx); setDraft({ ...contacts[idx] }); };
    const cancel = () => setEditing(null);
    const save = (idx: number) => {
        const updated = [...contacts];
        updated[idx] = draft;
        setContacts(updated);
        setEditing(null);
        toast.success('Emergency contact updated.');
    };

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Phone size={20} />} title="Emergency Contacts" subtitle="Up to 2 emergency contacts" />
            <div className={styles.contactsGrid}>
                {contacts.map((c, idx) => (
                    <div key={idx} className={styles.contactPersonCard}>
                        <div className={styles.contactPersonHeader}>
                            <span className={styles.contactPersonLabel}>Person {idx + 1}</span>
                            {editing !== idx && (
                                <button className={styles.iconBtn} onClick={() => startEdit(idx)} title="Edit">
                                    <Edit3 size={15} />
                                </button>
                            )}
                        </div>

                        {editing === idx ? (
                            <div className={styles.inlineForm}>
                                <FormRow label="Name">
                                    <input className={styles.formInput} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" />
                                </FormRow>
                                <FormRow label="Relationship">
                                    <select className={styles.formSelect} value={draft.relationship} onChange={e => setDraft({ ...draft, relationship: e.target.value })}>
                                        <option value="">Select relationship</option>
                                        {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </FormRow>
                                <FormRow label="Contact Number">
                                    <input className={styles.formInput} value={draft.contactNumber} onChange={e => setDraft({ ...draft, contactNumber: e.target.value })} placeholder="09-xxx-xxx-xxx" />
                                </FormRow>
                                <FormRow label="Address">
                                    <textarea className={styles.formTextarea} value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder="Full address" rows={2} />
                                </FormRow>
                                <div className={styles.formActions}>
                                    <button className={styles.btnGhost} onClick={cancel}>Cancel</button>
                                    <button className={styles.btnPrimary} onClick={() => save(idx)}><Save size={14} /> Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.contactFields}>
                                {c.name ? (
                                    <>
                                        <ContactField label="Name" value={c.name} />
                                        <ContactField label="Relationship" value={c.relationship} />
                                        <ContactField label="Contact Number" value={c.contactNumber} />
                                        <ContactField label="Address" value={c.address} />
                                    </>
                                ) : (
                                    <p className={styles.emptySlot}>No contact added. Click <Edit3 size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> to add.</p>
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
function WorkExperienceTab() {
    const [records, setRecords] = useState<WorkExperience[]>(MOCK_EXPERIENCE);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const blankExp = (): WorkExperience => ({ id: Date.now().toString(), organization: '', orgType: '', industry: '', designation: '', fromDate: '', toDate: '', salary: '', currency: 'MMK', reasonForChange: '' });
    const [form, setForm] = useState<WorkExperience>(blankExp());

    const openAdd = () => { setForm(blankExp()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: WorkExperience) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
    const closeExp = () => { setShowModal(false); setEditingId(null); };
    const saveExp = () => {
        if (!form.organization) { toast.error('Organization is required.'); return; }
        if (editingId) setRecords(rs => rs.map(r => r.id === editingId ? form : r));
        else setRecords(rs => [...rs, form]);
        closeExp();
        toast.success(editingId ? 'Work experience updated.' : 'Work experience added.');
    };
    const removeExp = (id: string) => { setRecords(rs => rs.filter(r => r.id !== id)); toast.success('Record removed.'); };
    const f = (k: keyof WorkExperience) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Building2 size={20} />} title="Work Experience" subtitle="Your previous employment history"
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> Add Experience</button>} />

            {records.length === 0
                ? <EmptyState message="No work experience added yet." onAdd={openAdd} />
                : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Organization</th><th>Type</th><th>Industry</th>
                                    <th>Designation</th><th>Period</th><th>Salary</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.organization}</strong></td>
                                        <td>{r.orgType}</td>
                                        <td>{r.industry}</td>
                                        <td>{r.designation}</td>
                                        <td className={styles.noWrap}>{r.fromDate} → {r.toDate || 'Present'}</td>
                                        <td className={styles.noWrap}>{r.salary} {r.currency}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title="Edit"><Edit3 size={14} /></button>
                                                <button className={styles.iconBtn} onClick={() => removeExp(r.id)} title="Delete" style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                <FormModal title={editingId ? 'Edit Work Experience' : 'Add Work Experience'} onClose={closeExp} onSave={saveExp}>
                    <FormRow label="Organization *">
                        <input className={styles.formInput} value={form.organization} onChange={f('organization')} placeholder="Company / Organization name" />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label="Organization Type">
                            <select className={styles.formSelect} value={form.orgType} onChange={f('orgType')}>
                                <option value="">Select type</option>
                                {ORG_TYPES.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label="Industry">
                            <select className={styles.formSelect} value={form.industry} onChange={f('industry')}>
                                <option value="">Select industry</option>
                                {INDUSTRIES.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <FormRow label="Designation">
                        <input className={styles.formInput} value={form.designation} onChange={f('designation')} placeholder="Job title / Role" />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label="From Date">
                            <input className={styles.formInput} type="month" value={form.fromDate} onChange={f('fromDate')} />
                        </FormRow>
                        <FormRow label="To Date">
                            <input className={styles.formInput} type="month" value={form.toDate} onChange={f('toDate')} />
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label="Previous Monthly Salary">
                            <input className={styles.formInput} type="number" value={form.salary} onChange={f('salary')} placeholder="0" />
                        </FormRow>
                        <FormRow label="Currency">
                            <select className={styles.formSelect} value={form.currency} onChange={f('currency')}>
                                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </FormRow>
                    </div>
                    <FormRow label="Reason for Change">
                        <textarea className={styles.formTextarea} value={form.reasonForChange} onChange={f('reasonForChange')} placeholder="Reason for leaving / changing..." rows={3} />
                    </FormRow>
                </FormModal>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 5 — Qualification (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function QualificationTab() {
    const [records, setRecords] = useState<Qualification[]>(MOCK_QUALIFICATIONS);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const blank = (): Qualification => ({ id: Date.now().toString(), degree: '', institution: '', major: '', yearCompleted: '', grade: '' });
    const [form, setForm] = useState<Qualification>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: Qualification) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
    const close = () => { setShowModal(false); setEditingId(null); };
    const save = () => {
        if (!form.degree) { toast.error('Degree is required.'); return; }
        if (editingId) setRecords(rs => rs.map(r => r.id === editingId ? form : r));
        else setRecords(rs => [...rs, form]);
        close();
        toast.success(editingId ? 'Qualification updated.' : 'Qualification added.');
    };
    const remove = (id: string) => { setRecords(rs => rs.filter(r => r.id !== id)); toast.success('Record removed.'); };
    const f = (k: keyof Qualification) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<BookOpen size={20} />} title="Details of Qualification" subtitle="Educational background and certifications"
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> Add Qualification</button>} />

            {records.length === 0
                ? <EmptyState message="No qualifications added yet." onAdd={openAdd} />
                : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Degree</th><th>Institution</th><th>Major</th><th>Year</th><th>Grade</th><th></th></tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.degree}</strong></td>
                                        <td>{r.institution}</td>
                                        <td>{r.major}</td>
                                        <td>{r.yearCompleted}</td>
                                        <td>{r.grade}</td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title="Edit"><Edit3 size={14} /></button>
                                                <button className={styles.iconBtn} onClick={() => remove(r.id)} title="Delete" style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                <FormModal title={editingId ? 'Edit Qualification' : 'Add Qualification'} onClose={close} onSave={save}>
                    <FormRow label="Degree / Certificate *">
                        <input className={styles.formInput} value={form.degree} onChange={f('degree')} placeholder="e.g. B.Sc. Computer Science, MBA" />
                    </FormRow>
                    <FormRow label="Institution">
                        <input className={styles.formInput} value={form.institution} onChange={f('institution')} placeholder="University / College / School" />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label="Major / Field of Study">
                            <input className={styles.formInput} value={form.major} onChange={f('major')} placeholder="e.g. Computer Science" />
                        </FormRow>
                        <FormRow label="Year Completed">
                            <input className={styles.formInput} type="number" value={form.yearCompleted} onChange={f('yearCompleted')} placeholder="e.g. 2020" min="1950" max="2100" />
                        </FormRow>
                    </div>
                    <FormRow label="Grade / GPA">
                        <input className={styles.formInput} value={form.grade} onChange={f('grade')} placeholder="e.g. Distinction, 3.8 GPA" />
                    </FormRow>
                </FormModal>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 6 — Family Information for Tax Calculation (Create/Edit/View)
// ═══════════════════════════════════════════════════════════════════════
function FamilyInfoTab() {
    const [records, setRecords] = useState<FamilyMember[]>(MOCK_FAMILY);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const blank = (): FamilyMember => ({ id: Date.now().toString(), name: '', gender: '', dob: '', relationship: '', taxEligible: 'No', modOption: 'New', effectiveFrom: '', status: 'Pending', attachment: '' });
    const [form, setForm] = useState<FamilyMember>(blank());

    const openAdd = () => { setForm(blank()); setEditingId(null); setShowModal(true); };
    const openEdit = (r: FamilyMember) => { setForm({ ...r }); setEditingId(r.id); setShowModal(true); };
    const close = () => { setShowModal(false); setEditingId(null); };
    const save = () => {
        if (!form.name) { toast.error('Name is required.'); return; }
        if (!form.attachment) { toast.error('Attachment is mandatory.'); return; }
        if (editingId) setRecords(rs => rs.map(r => r.id === editingId ? form : r));
        else setRecords(rs => [...rs, { ...form, status: 'Pending' }]);
        close();
        toast.success(editingId ? 'Family member updated.' : 'Family member added.');
    };
    const remove = (id: string) => { setRecords(rs => rs.filter(r => r.id !== id)); toast.success('Record removed.'); };
    const fv = (k: keyof FamilyMember) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value as any }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<Users size={20} />} title="Family Information for Tax Calculation" subtitle="Family members used for tax deduction purposes"
                action={<button className={styles.addBtn} onClick={openAdd}><Plus size={15} /> Add Member</button>} />

            {records.length === 0
                ? <EmptyState message="No family members added yet." onAdd={openAdd} />
                : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Name</th><th>Gender</th><th>DOB</th><th>Relationship</th><th>Tax Eligible</th><th>Status</th><th></th></tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.name}</strong></td>
                                        <td>{r.gender}</td>
                                        <td>{r.dob}</td>
                                        <td>{r.relationship}</td>
                                        <td><span className={r.taxEligible === 'Yes' ? styles.badgeGreen : styles.badgeGray}>{r.taxEligible}</span></td>
                                        <td><StatusBadge status={r.status} /></td>
                                        <td>
                                            <div className={styles.rowActions}>
                                                <button className={styles.iconBtn} onClick={() => openEdit(r)} title="Edit"><Edit3 size={14} /></button>
                                                <button className={styles.iconBtn} onClick={() => remove(r.id)} title="Delete" style={{ color: 'var(--color-danger-500)' }}><Trash2 size={14} /></button>
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
                <FormModal title={editingId ? 'Edit Family Member' : 'Add Family Member'} onClose={close} onSave={save}>
                    <FormRow label="Name *">
                        <input className={styles.formInput} value={form.name} onChange={fv('name')} placeholder="Full name" />
                    </FormRow>
                    <div className={styles.formGrid2}>
                        <FormRow label="Gender">
                            <select className={styles.formSelect} value={form.gender} onChange={fv('gender')}>
                                <option value="">Select gender</option>
                                {GENDERS.map(g => <option key={g}>{g}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label="Date of Birth">
                            <input className={styles.formInput} type="date" value={form.dob} onChange={fv('dob')} />
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label="Relationship">
                            <select className={styles.formSelect} value={form.relationship} onChange={fv('relationship')}>
                                <option value="">Select relationship</option>
                                {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label="Tax Exclusion Eligibility">
                            <select className={styles.formSelect} value={form.taxEligible} onChange={fv('taxEligible')}>
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </FormRow>
                    </div>
                    <div className={styles.formGrid2}>
                        <FormRow label="Modification Option">
                            <select className={styles.formSelect} value={form.modOption} onChange={fv('modOption')}>
                                {MOD_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label="Effective From">
                            <input className={styles.formInput} type="date" value={form.effectiveFrom} onChange={fv('effectiveFrom')} />
                        </FormRow>
                    </div>
                    <FormRow label="Attachment (Mandatory) *">
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
    const [data, setData] = useState(MOCK_CONTACT);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(MOCK_CONTACT);

    const startEdit = () => { setDraft({ ...data }); setIsEditing(true); };
    const cancel = () => setIsEditing(false);
    const save = () => {
        setData(draft);
        setIsEditing(false);
        toast.success('Contact information updated. Pending HR approval.');
    };
    const d = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <div className={styles.sectionCard}>
            <SectionHeader icon={<MapPin size={20} />} title="Contact Information" subtitle="Residential addresses and personal contact details"
                action={!isEditing
                    ? <button className={styles.editOutlineBtn} onClick={startEdit}><Edit3 size={14} /> Edit</button>
                    : undefined
                }
            />

            {isEditing ? (
                <div className={styles.editForm}>
                    {/* Permanent Address */}
                    <p className={styles.subSectionTitle}>Permanent Address</p>
                    <div className={styles.formGrid2}>
                        <FormRow label="State / Region">
                            <select className={styles.formSelect} value={draft.permanentState} onChange={d('permanentState')}>
                                <option value="">Select state</option>
                                {STATES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label="District">
                            <input className={styles.formInput} value={draft.permanentDistrict} onChange={d('permanentDistrict')} placeholder="District" />
                        </FormRow>
                        <FormRow label="Township">
                            <input className={styles.formInput} value={draft.permanentTownship} onChange={d('permanentTownship')} placeholder="Township" />
                        </FormRow>
                        <FormRow label="Town">
                            <input className={styles.formInput} value={draft.permanentTown} onChange={d('permanentTown')} placeholder="Town" />
                        </FormRow>
                    </div>

                    {/* Temporary Address */}
                    <p className={styles.subSectionTitle} style={{ marginTop: 'var(--space-6)' }}>Temporary Address</p>
                    <div className={styles.formGrid2}>
                        <FormRow label="State / Region">
                            <select className={styles.formSelect} value={draft.temporaryState} onChange={d('temporaryState')}>
                                <option value="">Select state</option>
                                {STATES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </FormRow>
                        <FormRow label="District">
                            <input className={styles.formInput} value={draft.temporaryDistrict} onChange={d('temporaryDistrict')} placeholder="District" />
                        </FormRow>
                        <FormRow label="Township">
                            <input className={styles.formInput} value={draft.temporaryTownship} onChange={d('temporaryTownship')} placeholder="Township" />
                        </FormRow>
                        <FormRow label="Town">
                            <input className={styles.formInput} value={draft.temporaryTown} onChange={d('temporaryTown')} placeholder="Town" />
                        </FormRow>
                    </div>

                    {/* Email & Phone */}
                    <p className={styles.subSectionTitle} style={{ marginTop: 'var(--space-6)' }}>Contact Details</p>
                    <div className={styles.formGrid2}>
                        <FormRow label="Personal Primary Email">
                            <input className={styles.formInput} type="email" value={draft.primaryEmail} onChange={d('primaryEmail')} placeholder="primary@email.com" />
                        </FormRow>
                        <FormRow label="Personal Secondary Email">
                            <input className={styles.formInput} type="email" value={draft.secondaryEmail} onChange={d('secondaryEmail')} placeholder="secondary@email.com" />
                        </FormRow>
                        <FormRow label="Personal Mobile Phone">
                            <input className={styles.formInput} type="tel" value={draft.primaryMobile} onChange={d('primaryMobile')} placeholder="09-xxx-xxx-xxx" />
                        </FormRow>
                    </div>

                    <div className={styles.formActions} style={{ marginTop: 'var(--space-6)' }}>
                        <button className={styles.btnGhost} onClick={cancel}>Cancel</button>
                        <button className={styles.btnPrimary} onClick={save}><Save size={14} /> Save Changes</button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className={styles.contactSections}>
                        <div className={styles.addressBlock}>
                            <p className={styles.subSectionTitle}>Permanent Address</p>
                            <div className={styles.infoGrid}>
                                <InfoItem icon={<MapPin size={18} />} label="State / Region" value={data.permanentState} />
                                <InfoItem icon={<MapPin size={18} />} label="District" value={data.permanentDistrict} />
                                <InfoItem icon={<MapPin size={18} />} label="Township" value={data.permanentTownship} />
                                <InfoItem icon={<MapPin size={18} />} label="Town" value={data.permanentTown} />
                            </div>
                        </div>
                        <div className={styles.addressBlock}>
                            <p className={styles.subSectionTitle}>Temporary Address</p>
                            {data.temporaryState
                                ? (
                                    <div className={styles.infoGrid}>
                                        <InfoItem icon={<MapPin size={18} />} label="State / Region" value={data.temporaryState} />
                                        <InfoItem icon={<MapPin size={18} />} label="District" value={data.temporaryDistrict} />
                                        <InfoItem icon={<MapPin size={18} />} label="Township" value={data.temporaryTownship} />
                                        <InfoItem icon={<MapPin size={18} />} label="Town" value={data.temporaryTown} />
                                    </div>
                                )
                                : <p className={styles.emptySlot}>No temporary address on record.</p>
                            }
                        </div>
                        <div className={styles.addressBlock}>
                            <p className={styles.subSectionTitle}>Contact Details</p>
                            <div className={styles.infoGrid}>
                                <InfoItem icon={<Mail size={18} />} label="Primary Email" value={data.primaryEmail} />
                                <InfoItem icon={<Mail size={18} />} label="Secondary Email" value={data.secondaryEmail || '-'} />
                                <InfoItem icon={<Phone size={18} />} label="Mobile" value={data.primaryMobile} />
                            </div>
                        </div>
                    </div>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Status:</span>
                        <StatusBadge status={data.status} />
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
