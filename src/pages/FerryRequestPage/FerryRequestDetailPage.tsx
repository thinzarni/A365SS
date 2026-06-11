/**
 * FerryRequestDetailPage
 *
 * Read-only detail view — same UI/layout as FerryRequestPage.
 * Route : /ferry_request/:id
 * Edit  : /ferry_request/edit/:id  (FerryRequestPage)
 */
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Car, Loader2,
    Phone, Clock,
    UserCheck, Paperclip, CheckCircle2, XCircle,
    Edit, Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import ApprovalWorkflowModal from '../../components/modals/ApprovalWorkflowModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { useState } from 'react';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    GET_REQUEST_DETAIL,
    DELETE_REQUEST,
    FERRY_WORKING_HOURS,
    USER_PROFILE,
} from '../../config/api-routes';
import { useAuthStore } from '../../stores/auth-store';

import styles from './FerryRequestPage.module.css';

/* ─── helpers ─────────────────────────────────────── */
const FerryRequestType = {
    registration  : 'registration',
    change        : 'change',
    usercomplaint : 'usercomplaint',
    hrcomplaint   : 'hrcomplaint',
} as const;
type FerryRequestType = typeof FerryRequestType[keyof typeof FerryRequestType];

function descToFerryType(desc: string): FerryRequestType {
    const d = desc.toLowerCase();
    if (d.includes('registration') || d.includes('new')) return FerryRequestType.registration;
    if (d.includes('change'))                              return FerryRequestType.change;
    if (d.includes('hr'))                                  return FerryRequestType.hrcomplaint;
    return FerryRequestType.usercomplaint;
}

function fromApiDate(d: string) {
    if (!d || d.length < 8) return '';
    let year, month, day;
    if (d.includes('-')) {
        const parts = d.split('T')[0].split('-');
        year = parts[0]; month = parts[1]; day = parts[2];
    } else {
        year = d.slice(0, 4); month = d.slice(4, 6); day = d.slice(6, 8);
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIndex = Number(month) - 1;
    if (isNaN(mIndex) || mIndex < 0 || mIndex > 11) return `${day}/${month}/${year}`;
    return `${day} ${months[mIndex]} ${year}`;
}

const COMPLAINT_OPTS = [
    { id: '1', label: 'Driver Behaviour' },
    { id: '2', label: 'Vehicle Condition' },
    { id: '3', label: 'Other' },
];

/* ─── Read-only field row ──────────────────────────── */
function ReadField({ label, value, minLines }: { label: string; value?: string | null; minLines?: number }) {
    if (!value) return null;
    return (
        <div>
            <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: '#64748b', marginBottom: 4, letterSpacing: '0.03em',
            }}>
                {label}
            </label>
            <div style={{
                padding: '10px 12px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 8,
                fontSize: 14, color: '#0f172a',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                minHeight: minLines ? `${(minLines * 20) + 20}px` : 'auto',
            }}>
                {value}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════ */
export default function FerryRequestDetailPage() {
    const navigate    = useNavigate();
    const location    = useLocation();

    const goBack = () => {
        const from = (location.state as any)?.from || '/ferry_request';
        navigate(from);
    };
    const { id }      = useParams<{ id: string }>();
    const { user, userId, domain } = useAuthStore();
    const qc          = useQueryClient();
    const [showDelete, setShowDelete] = useState(false);

    /* ── Fetch ── */
    const { data: detailRes, isLoading } = useQuery({
        queryKey: ['ferryDetail', id],
        queryFn: async () => {
            const res = await apiClient.post(GET_REQUEST_DETAIL, { syskey: id });
            return res.data ?? null;
        },
        enabled: !!id,
    });

    const dl = detailRes?.datalist;
    const detail: any            = Array.isArray(dl) ? (dl[0] || {}) : (dl || {});
    const detailApprovers: any[] = detail?.approverList ?? detailRes?.approverList ?? [];
    const stepLevelData: any[]   = detail?.stepLevelData ?? detailRes?.stepLevelData ?? [];

    /* ── Employee Profile (from API, keyed on the request owner's userid) ── */
    const profileUserId = detail?.userid || detail?.eid || '';
    const { data: employeeProfile } = useQuery({
        queryKey: ['employee-profile', profileUserId],
        queryFn: async () => {
            try {
                const res = await mainClient.post(USER_PROFILE, { userid: profileUserId });
                return res.data?.data ?? res.data ?? null;
            } catch { return null; }
        },
        enabled: !!profileUserId,
        staleTime: 5 * 60 * 1000,
    });
    const ep = employeeProfile as any;

    /* ── Working Hours list (to resolve syskey → description) ── */
    const { data: workingHours = [] } = useQuery<any[]>({
        queryKey: ['ferryWorkingHours'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_WORKING_HOURS, { params: { userid: userId, domain } });
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
        enabled: !!detail?.workinghour_syskey,
    });
    const workingHourDesc = workingHours.find(
        (wh: any) => wh.syskey === detail?.workinghour_syskey
    )?.description ?? detail?.workinghour_desc ?? '';

    /* ── Derived ── */
    const status      = String(detail?.requeststatus ?? '1');
    const isPending   = status === '1';
    const approvalTypeRaw = detail?.approvaltype;
    const isStepLevel = approvalTypeRaw === '1' || approvalTypeRaw === 1;

    const ferryType   = descToFerryType(detail?.requesttypedesc ?? '');

    const selectedComplaints: string[] = detail?.ferrycomplaint
        ? String(detail.ferrycomplaint).split(',').filter(Boolean)
        : [];

    /* Change sub-type codes */
    const changeTypeCode    = (detail?.changetypecode ?? '').toUpperCase();
    const changePurposeCode = (detail?.changepurposecode ?? '').toUpperCase();
    const isPermanent   = changeTypeCode === 'PC' || (detail?.changetypedesc ?? '').toLowerCase().includes('permanent');
    const isTemporary   = changeTypeCode === 'TC' || (detail?.changetypedesc ?? '').toLowerCase().includes('temporary');
    const isSuspension  = !isPermanent && !isTemporary && (!!detail?.changetypesyskey || (detail?.changetypedesc ?? '').toLowerCase().includes('suspension'));
    const isOfficeLocation = changePurposeCode === 'OL' || (detail?.changepurposedesc ?? '').includes('Office');
    const isHomeAddress    = changePurposeCode === 'HA' || (detail?.changepurposedesc ?? '').includes('Home');

    /* ── Can edit / delete ── */
    const myEid = (user as any)?.employee_id ?? (user as any)?.eid ?? userId ?? '';
    const canAct = isPending && (!detail?.eid || detail?.eid === myEid);

    /* ── Delete ── */
    const { mutate: doDelete, isPending: deleting } = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post(DELETE_REQUEST, { syskey: id });
            return res.data;
        },
        onSuccess: (data) => {
            if (data?.statuscode === 300 || data?.status === 200) {
                toast.success(data?.message ?? 'Deleted successfully');
                qc.invalidateQueries({ queryKey: ['ferryList'] });
                goBack();
            } else {
                toast.error(data?.message ?? 'Delete failed');
            }
        },
        onError: () => toast.error('Delete failed'),
    });

    /* ═══════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════ */
    return (
        <div className={styles.page}>

            {/* ── Header ── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={goBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className={styles.headerIcon}>
                        <Car size={22} color="#0c4a6e" />
                    </div>
                    <div>
                        <h1 className={styles.headerTitle}>{detail?.requesttypedesc || 'Ferry Request'}</h1>
                        {detail?.refno
                            ? <p className={styles.headerSub}>Ref # {detail.refno}</p>
                            : <p className={styles.headerSub}>Company ferry / bus service</p>}
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* ── Loading ── */}
            {isLoading ? (
                <div className={styles.loadingCenter}>
                    <Loader2 size={32} className={styles.spin} color="#0c4a6e" />
                </div>
            ) : (
                <div className={styles.formBody}>



                    {/* ── 2. Employee Info ── */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <UserCheck size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Employee
                        </h3>

                        {/* Single blue box */}
                        <div className={styles.employeeCard} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                            {/* Avatar row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={styles.employeeAvatar}>
                                    {((ep?.name || detail?.emp_name || detail?.name || 'E')[0]).toUpperCase()}
                                </div>
                                <div className={styles.employeeInfo}>
                                    {/* Name + EID on same line */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className={styles.employeeName}>{ep?.name || detail?.emp_name || detail?.name || '—'}</div>
                                        {detail?.eid && (
                                            <div style={{ fontSize: 12, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                                                {detail.eid}
                                            </div>
                                        )}
                                    </div>
                                    {/* Rank below name */}
                                    {(ep?.rank || detail?.rank) && (
                                        <div style={{ fontSize: 12, color: '#0369a1', marginTop: 2 }}>
                                            {ep?.rank || detail?.rank}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: '#bae6fd', margin: '12px 0' }} />

                            {/* Department + Join Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {(ep?.department || detail?.department || detail?.dept_name) && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', marginBottom: 2, letterSpacing: '0.03em' }}>Department</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0c4a6e' }}>
                                            {ep?.department || detail?.department || detail?.dept_name}
                                        </div>
                                    </div>
                                )}
                                {(ep?.joineddate || detail?.joindate || detail?.joiningdate) && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', marginBottom: 2, letterSpacing: '0.03em' }}>Join Date</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0c4a6e' }}>
                                            {ep?.joineddate || fromApiDate(detail?.joindate || detail?.joiningdate || '')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── 3. Registration Details (Merged) ── */}
                        {ferryType === FerryRequestType.registration && (
                            <div className={styles.grid} style={{ marginTop: 16 }}>
                                {(detail?.phoneno || ep?.phoneno || ep?.phone) && <ReadField label="Contact Phone Number" value={detail?.phoneno || ep?.phoneno || ep?.phone} />}
                                {(detail?.ferryno || ep?.ferryno) && <ReadField label="Assigned Ferry Number" value={detail?.ferryno || ep?.ferryno} />}
                                {workingHourDesc && (
                                    <div className={styles.fullCol}>
                                        <ReadField label="Working Hours" value={workingHourDesc} />
                                    </div>
                                )}
                                {detail?.township && <ReadField label="Township"         value={detail.township} />}
                                {detail?.road     && <ReadField label="Main Road"        value={detail.road} />}
                                {detail?.busstop  && <ReadField label="Nearest Bus Stop" value={detail.busstop} />}
                            </div>
                        )}
                    </section>

                    {/* ── 4. Change Details ── */}
                    {ferryType === FerryRequestType.change && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Clock size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Change Details
                            </h3>
                            <div className={styles.grid}>
                                {(detail?.phoneno || ep?.phoneno || ep?.phone) && <ReadField label="Contact Phone Number" value={detail?.phoneno || ep?.phoneno || ep?.phone} />}
                                {(detail?.ferryno || ep?.ferryno) && <ReadField label="Assigned Ferry Number" value={detail?.ferryno || ep?.ferryno} />}
                                {detail?.changetypedesc && (
                                    <div className={styles.fullCol}>
                                        <ReadField label="Change Type" value={detail.changetypedesc} />
                                    </div>
                                )}

                                {/* Temporary */}
                                {isTemporary && (<>
                                    <div className={styles.fullCol}>
                                        <ReadField label="Reason for Change Request (Business Requirements)" value={detail?.remark} minLines={3} />
                                    </div>
                                    {detail?.changeferrydesc && (
                                        <div className={styles.fullCol}>
                                            <ReadField label="Desired Ferry Number" value={detail.changeferrydesc} />
                                        </div>
                                    )}
                                    {detail?.startdate && <ReadField label="Desired Date From" value={fromApiDate(detail.startdate)} />}
                                    {detail?.enddate   && <ReadField label="Desired Date To"   value={fromApiDate(detail.enddate)} />}
                                </>)}

                                {/* Permanent */}
                                {isPermanent && (<>
                                    {detail?.changepurposedesc && (
                                        <div className={styles.fullCol}>
                                            <ReadField label="Purpose of Change" value={detail.changepurposedesc} />
                                        </div>
                                    )}
                                    {isOfficeLocation && (<>
                                        {detail?.locationname  && <ReadField label="New Office Location" value={detail.locationname} />}
                                        {detail?.startdate     && <ReadField label="Desired Start Date" value={fromApiDate(detail.startdate)} />}
                                    </>)}
                                    {isHomeAddress && (<>
                                        {detail?.address  && <div className={styles.fullCol}><ReadField label="New Home Address" value={detail.address} /></div>}
                                        {detail?.road     && <ReadField label="Main Road"        value={detail.road} />}
                                        {detail?.busstop  && <ReadField label="Nearest Bus Stop" value={detail.busstop} />}
                                        {detail?.startdate && <ReadField label="Desired Start Date" value={fromApiDate(detail.startdate)} />}
                                    </>)}
                                </>)}

                                {/* Suspension */}
                                {isSuspension && (<>
                                    <div className={styles.fullCol} style={{ marginTop: 8, marginBottom: 4 }}>
                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                            Temporary Suspension For Ferry Usage
                                        </h4>
                                    </div>
                                    {detail?.startdate && <ReadField label="Desired Date For Suspension From" value={fromApiDate(detail.startdate)} />}
                                    {detail?.enddate   && <ReadField label="Desired Date For Suspension To"   value={fromApiDate(detail.enddate)} />}
                                </>)}
                            </div>
                        </section>
                    )}

                    {/* ── 5. User Complaint ── */}
                    {ferryType === FerryRequestType.usercomplaint && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Phone size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                User Complaint
                            </h3>
                            {(detail?.ferryno || ep?.ferryno) && (
                                <div style={{ marginBottom: 16 }}>
                                    <ReadField label="Assigned Ferry Number" value={detail?.ferryno || ep?.ferryno} />
                                </div>
                            )}
                            <div style={{
                                display: 'flex', flexDirection: 'column', gap: 0,
                                border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                            }}>
                                {COMPLAINT_OPTS.map((opt, i) => {
                                    const checked = selectedComplaints.includes(opt.id);
                                    return (
                                        <label key={opt.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 14px', cursor: 'default',
                                            fontSize: 13, color: '#334155',
                                            background: checked ? '#f0f9ff' : '#fff',
                                            borderBottom: i < COMPLAINT_OPTS.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled
                                                style={{ accentColor: '#0c4a6e', width: 16, height: 16, flexShrink: 0 }}
                                                readOnly
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {detail?.remark && (
                                <div style={{ marginTop: 16 }}>
                                    <ReadField label="Complaint Description" value={detail.remark} minLines={3} />
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── 6. HR Complaint ── */}
                    {ferryType === FerryRequestType.hrcomplaint && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>HR Complaint</h3>
                            <ReadField label="Complaint Description" value={detail?.remark || '—'} minLines={3} />
                        </section>
                    )}

                    {/* ── 8. Attachments ── */}
                    {(() => {
                        const attachRaw = detail?.attachment || detailRes?.attachmentList || detailRes?.attachList || [];
                        const attachArr = Array.isArray(attachRaw) ? attachRaw : [];
                        if (attachArr.length === 0) return null;
                        
                        return (
                            <section className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <Paperclip size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                    Attachments
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {attachArr.map((att: any, i: number) => {
                                        const isStr = typeof att === 'string';
                                        const url  = isStr ? att : (att.signedURL || att.url || att.filepath || att.filePath || '');
                                        const name = isStr ? `File ${i + 1}` : (att.filename || att.fileName || att.name || `File ${i + 1}`);
                                        return (
                                            <a key={i} href={url || undefined} target="_blank" rel="noreferrer"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '10px 12px', borderRadius: 8,
                                                    border: '1px solid #e2e8f0', background: '#f8fafc',
                                                    fontSize: 13, color: url ? '#0c4a6e' : '#334155',
                                                    textDecoration: url ? 'underline' : 'none',
                                                }}>
                                                <Paperclip size={13} />
                                                {name}
                                            </a>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })()}

                    {/* ── 9. Step-Level Workflow Tracker ── */}
                    {isStepLevel && stepLevelData.length > 0 && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>Approval Workflow Tracker</h3>
                            <ApprovalWorkflowModal steps={stepLevelData} />
                        </section>
                    )}

                    {/* ── 10. Normal Approver List ── */}
                    {(approvalTypeRaw === '0' || approvalTypeRaw === 0) && detailApprovers.length > 0 && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>Approvers</h3>
                            {detailApprovers.map((a: any) => (
                                <div key={a.userid ?? a.syskey} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 0', borderBottom: '1px solid #f1f5f9',
                                }}>
                                    <div className={styles.employeeAvatar} style={{ width: 36, height: 36, fontSize: 14 }}>
                                        {(a.name?.[0] ?? 'A').toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{a.userid} · {a.eid ?? ''}</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>
                                        {(a.status === '2' || a.status === 2) && <CheckCircle2 size={18} color="#22c55e" />}
                                        {(a.status === '3' || a.status === 3) && <XCircle     size={18} color="#ef4444" />}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* ── 11. Action Bar ── */}
                    {canAct && (
                        <div className={styles.actionBar} style={{ justifyContent: 'flex-start' }}>
                            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Trash2 size={14} /> Delete
                            </Button>
                            <Button size="sm" onClick={() => navigate(`/ferry_request/edit/${id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Edit size={14} /> Edit
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Delete Confirm ── */}
            <ConfirmModal
                open={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={() => { doDelete(); setShowDelete(false); }}
                title="Delete Ferry Request"
                message="This will permanently delete this ferry request. This action cannot be undone."
                confirmLabel="Delete"
                loading={deleting}
                variant="danger"
                icon={<Trash2 size={28} />}
            />
        </div>
    );
}
