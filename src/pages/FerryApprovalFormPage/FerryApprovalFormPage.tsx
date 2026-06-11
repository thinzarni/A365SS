import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    Car,
    CheckCircle,
    XCircle,
    Loader2,
    Mail,
    Phone,
    Paperclip,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { Textarea, Input } from '../../components/ui/Input/Input';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import ApprovalWorkflowModal from '../../components/modals/ApprovalWorkflowModal';
import type { ApprovalDetailModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import {
    APPROVAL_DETAIL,
    SAVE_APPROVAL,
    FERRY_ASSIGNED_FERRY_NO,
    FERRY_CHANGE_PURPOSES,
    REQUEST_TYPES,
    FERRY_OFFICE_LOCATIONS,
    FERRY_CHANGE_TYPES,
    FERRY_WORKING_HOURS
} from '../../config/api-routes';
import { useAuthStore } from '../../stores/auth-store';
import styles from './FerryApprovalFormPage.module.css';

/* ── Helpers ── */
function fromApiDate(d?: string) {
    if (!d || d.length < 8) return '';
    let year, month, day;
    if (d.includes('-')) {
        const parts = d.split('T')[0].split('-');
        year = parts[0]; month = parts[1]; day = parts[2];
    } else {
        year = d.slice(0, 4); month = d.slice(4, 6); day = d.slice(6, 8);
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    return `${day} ${months[mIdx]} ${year}`;
}

const FerryRequestType = {
    registration: 'registration',
    change: 'change',
    usercomplaint: 'usercomplaint',
    hrcomplaint: 'hrcomplaint',
} as const;
type FerryRequestType = typeof FerryRequestType[keyof typeof FerryRequestType];

function descToFerryType(desc: string): FerryRequestType {
    const d = desc.toLowerCase();
    if (d.includes('registration') || d.includes('new') || d.includes('request')) return FerryRequestType.registration;
    if (d.includes('change')) return FerryRequestType.change;
    if (d.includes('hr')) return FerryRequestType.hrcomplaint;
    return FerryRequestType.usercomplaint;
}

const COMPLAINT_OPTS = [
    { id: '1', label: 'Driver Behaviour' },
    { id: '2', label: 'Vehicle Condition' },
    { id: '3', label: 'Other' },
];

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
    return (
        <div className={styles['approval-detail__field']}>
            <span className={styles['approval-detail__field-label']}>{label}</span>
            <span className={`${styles['approval-detail__field-value']} ${!value ? styles['approval-detail__field-value--empty'] : ''}`}>
                {value || '—'}
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════ */
export default function FerryApprovalFormPage() {
    const { id: syskey } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const qc = useQueryClient();
    const { userId, domain } = useAuthStore();

    const [comment, setComment] = useState('');
    const [assignedFerrySyskey, setAssignedFerrySyskey] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [gpsInfo, setGpsInfo] = useState('');
    const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

    const goBack = () => {
        const from = (location.state as any)?.from || '/approvals';
        navigate(from);
    };

    // 1. Fetch Approval Detail
    const { data: detailData, isLoading } = useQuery<ApprovalDetailModel>({
        queryKey: ['approval-detail', syskey],
        queryFn: async () => {
            const res = await apiClient.post(APPROVAL_DETAIL, { syskey });
            const payload = res.data;
            if (payload?.statuscode === 300) return payload;
            throw new Error(payload?.message || 'Failed to fetch approval details');
        },
        enabled: !!syskey,
    });

    // 2. Fetch Assigned Ferry Numbers (for Registration approval)
    const { data: ferryNos = [] } = useQuery({
        queryKey: ['getassignferryno', userId, domain],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_ASSIGNED_FERRY_NO);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // 3. Fetch Change Purposes
    const { data: changePurposes = [] } = useQuery({
        queryKey: ['getrequestchangepurposes'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_CHANGE_PURPOSES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // 4. Fetch Request Types
    const { data: requestTypes = [] } = useQuery({
        queryKey: ['getrequesttypelist'],
        queryFn: async () => {
            const res = await apiClient.get(REQUEST_TYPES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // 5. Fetch Office Locations
    const { data: officeLocations = [] } = useQuery({
        queryKey: ['getofficelocation'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_OFFICE_LOCATIONS);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });


    // 6. Fetch Change Types
    const { data: changeTypes = [] } = useQuery({
        queryKey: ['getrequestchangetypes'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_CHANGE_TYPES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // 7. Fetch Working Hours
    const { data: workingHours = [] } = useQuery({
        queryKey: ['getworkinghour', userId, domain],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_WORKING_HOURS);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Cast to 'any' here because ApprovalModel has [key:string]:unknown index signature
    // which would make every property access 'unknown' and un-renderable in JSX.
    const detail: any = detailData?.datalist as any;

    useEffect(() => {
        if (detail) {
            const d = detail as any;
            if (d.changeferry_syskey || d.changeferry) setAssignedFerrySyskey(String(d.changeferry_syskey || d.changeferry));
            if (d.driver_phoneno) setDriverPhone(String(d.driver_phoneno));
            if (d.gps_info) setGpsInfo(String(d.gps_info));
            if (d.comment) setComment(String(d.comment));
        }
    }, [detail]);
    
    const resolvedOfficeLocation = useMemo((): string => {
        if (detail?.locationname) return String(detail.locationname);
        const loc = detail?.location || detail?.officelocation;
        if (!loc) return '';
        const found = officeLocations.find((l: any) => String(l.syskey) === String(loc));
        return found ? String(found.description || found.code || found.locationname || loc) : String(loc);
    }, [detail?.locationname, detail?.location, detail?.officelocation, officeLocations]);
    const ferryTypeDesc = useMemo((): string => {
        if (detail?.requesttypedesc) return String(detail.requesttypedesc);
        if (!detail?.requesttype) return '';
        const found = requestTypes.find((r: any) => String(r.syskey) === String(detail.requesttype));
        return found ? String(found.description || found.code || detail.requesttype) : String(detail.requesttype || '');
    }, [detail?.requesttypedesc, detail?.requesttype, requestTypes]);
    const ferryType = descToFerryType(ferryTypeDesc);
    const isApproved = String(detail?.requeststatus || detail?.status) === '2';
    const isRejected = String(detail?.requeststatus || detail?.status) === '3';

    const displayTitle = useMemo(() => {
        const desc = (ferryTypeDesc || '').toLowerCase().replace(/\s+/g, '');
        if (desc === 'ferrychange') return 'Ferry Change';
        if (desc === 'ferryregistration' || desc === 'ferryregisteration') return 'Ferry Registeration';
        if (desc === 'ferryusercomplaint' || desc === 'usercomplaint') return 'Ferry User Complaint';
        if (desc === 'hrcomplaint' || desc === 'ferryhrcomplaint') return 'HR Complaint';
        return ferryTypeDesc || 'Ferry Request';
    }, [ferryTypeDesc]);

    const detailApprovers = (detailData as any)?.approverList || (detail as any)?.approverList || [];
    const stepLevelData = (detailData as any)?.stepLevelData || (detail as any)?.stepLevelData || [];
    const approvalTypeRaw = detail?.approvaltype;
    const isStepLevel = approvalTypeRaw === '1' || approvalTypeRaw === 1;

    const resolvedChangePurpose = useMemo((): string => {
        if (detail?.changepurposedesc) return String(detail.changepurposedesc);
        const cPurpose = detail?.changepurpose || detail?.changepurpose_syskey;
        if (!cPurpose) return '';
        const found = changePurposes.find((p: any) => String(p.syskey || p.changepurpose_syskey) === String(cPurpose));
        return found ? String(found.description || found.code || cPurpose) : String(cPurpose);
    }, [detail?.changepurposedesc, detail?.changepurpose, detail?.changepurpose_syskey, changePurposes]);

    // d is already 'any' since detail is 'any'
    const d = detail;
    const reqName = String(d?.name || d?.employee_name || d?.eid || 'Employee');
    const selectedComplaints = useMemo((): string[] => {
        if (!d?.ferrycomplaint) return [];
        return String(d.ferrycomplaint).split(',').map((s: string) => s.trim()).filter(Boolean);
    }, [d?.ferrycomplaint]);

    const resolvedChangeType = useMemo((): string => {
        if (detail?.changetypedesc) return String(detail.changetypedesc);
        const cType = detail?.changetype || detail?.changetype_syskey;
        if (!cType) return '';
        const found = changeTypes.find((t: any) => String(t.syskey || t.changetype_syskey) === String(cType));
        return found ? String(found.description || found.code || cType) : String(cType);
    }, [detail?.changetypedesc, detail?.changetype, detail?.changetype_syskey, changeTypes]);

    const resolvedWorkingHour = useMemo((): string => {
        if (detail?.workinghourdesc) return String(detail.workinghourdesc);
        const wHour = detail?.workinghour || detail?.workinghour_syskey;
        if (!wHour) return '';
        const found = workingHours.find((w: any) => String(w.syskey || w.workinghour_syskey) === String(wHour));
        return found ? String(found.description || found.code || wHour) : String(wHour);
    }, [detail?.workinghourdesc, detail?.workinghour, detail?.workinghour_syskey, workingHours]);

    const resolvedDesiredFerry = useMemo((): string => {
        if (detail?.changeferrydesc) return String(detail.changeferrydesc);
        const cFerry = detail?.changeferry || detail?.changeferry_syskey;
        if (!cFerry) return '';
        const found = ferryNos.find((f: any) => String(f.syskey) === String(cFerry));
        return found ? String(found.carno || found.description || found.ferryCarNo || cFerry) : String(cFerry);
    }, [detail?.changeferrydesc, detail?.changeferry, detail?.changeferry_syskey, ferryNos]);

    const resolvedCurrentFerry = useMemo((): string => {
        const fallback = detail?.currentferryno || detail?.currentferry || detail?.ferryno;
        const syskey = detail?.currentferry_syskey || detail?.ferrysyskey || detail?.ferry_syskey;
        if (!syskey && fallback) return String(fallback);
        if (!syskey) return '';
        const found = ferryNos.find((f: any) => String(f.syskey) === String(syskey));
        return found ? String(found.carno || found.description || found.ferryCarNo || fallback || syskey) : String(fallback || syskey);
    }, [detail?.currentferryno, detail?.currentferry, detail?.ferryno, detail?.currentferry_syskey, detail?.ferrysyskey, detail?.ferry_syskey, ferryNos]);

    const isTemporary = resolvedChangeType?.toLowerCase().includes('temporary') && !resolvedChangeType?.toLowerCase().includes('suspension');
    const isShiftChange = resolvedChangeType?.toLowerCase().includes('shift');
    const isSuspension = resolvedChangeType?.toLowerCase().includes('suspension') || String(detail?.changetype || detail?.changetype_syskey) === '71';

    // Validation for Action
    const validateAction = (status: '2' | '3') => {
        const errors: Record<string, string> = {};
        
        if (status === '2') {
            if (ferryType === FerryRequestType.registration) {
                if (!assignedFerrySyskey) errors.assignedFerrySyskey = 'Please select a ferry number to assign';
                if (!driverPhone) errors.driverPhone = 'Please enter driver phone number';
                if (!gpsInfo) errors.gpsInfo = 'Please enter GPS information';
                if (!comment.trim()) errors.comment = 'Comment is required for approval';
            }
        } else if (status === '3') {
            if (displayTitle !== 'HR Complaint' && displayTitle !== 'Ferry Change' && !comment.trim()) {
                errors.comment = 'Comment is required for rejection';
            }
        }

        setActionErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Approval Mutation
    const submitMutation = useMutation({
        mutationFn: async (status: '2' | '3') => {
            const payload: any = {
                syskey,
                domain: domain || 'dev',
                userid: userId,
                status: Number(status),
                comment: comment.trim(),
            };
            if (ferryType === FerryRequestType.registration) {
                const selectedFerry = ferryNos.find((f: any) => String(f.syskey) === String(assignedFerrySyskey));
                payload.changeferry_syskey = assignedFerrySyskey;
                payload.ferryno = selectedFerry ? (selectedFerry.carno || selectedFerry.description || selectedFerry.ferryCarNo || assignedFerrySyskey) : assignedFerrySyskey;
                payload.driver_phoneno = driverPhone;
                payload.gps_info = gpsInfo;
            }
            const res = await apiClient.post(SAVE_APPROVAL, payload);
            if (res.data?.statuscode !== 300) throw new Error(res.data?.message || 'Save failed');
            return res.data;
        },
        onSuccess: (_data, status) => {
            toast.success(status === '2' ? 'Request Approved' : 'Request Rejected');
            qc.invalidateQueries({ queryKey: ['approvals'] });
            qc.invalidateQueries({ queryKey: ['approval-detail', syskey] });
            goBack();
        },
        onError: (err: any) => {
            toast.error(err.message || 'Action failed');
        }
    });

    const handleApprove = () => {
        if (!validateAction('2')) return;
        submitMutation.mutate('2');
    };

    const handleReject = () => {
        if (!validateAction('3')) return;
        submitMutation.mutate('3');
    };


    if (isLoading) {
        return (
            <div className={styles['approval-detail']}>
                <div className={styles['approval-detail__card']}>
                    <div className={styles['approval-detail__skeleton']}>
                        <div className={styles['approval-detail__skeleton-bar']} style={{ width: '60%' }} />
                        <div className={styles['approval-detail__skeleton-bar']} style={{ width: '80%' }} />
                        <div className={styles['approval-detail__skeleton-bar']} style={{ width: '40%' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className={styles['approval-detail']}>
                <button className={styles['approval-detail__back']} onClick={goBack}>
                    <ArrowLeft size={16} /> {t('common.back')}
                </button>
                <div className={styles['approval-detail__empty']}>
                    <h3>Approval not found</h3>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['approval-detail']}>
            <button className={styles['approval-detail__back']} onClick={goBack}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className={styles['approval-detail__card']}>
                {/* ── Header ── */}
                <div className={styles['approval-detail__header']}>
                    <div className={styles['approval-detail__header-left']}>
                        <div className={styles['approval-detail__icon']} style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0c4a6e' }}>
                            <Car size={24} />
                        </div>
                        <div className={styles['approval-detail__title-group']}>
                            <h2>{displayTitle}</h2>
                            <span>
                                {(d.refno) ? `Ref #${d.refno}` : 'Company ferry / bus service'}
                            </span>
                        </div>
                    </div>
                    <StatusBadge status={String(detail.requeststatus || detail.status || '1')} />
                </div>

                {/* ── Body ── */}
                <div className={styles['approval-detail__body']}>
                    {/* Requester */}
                    <div className={styles['approval-detail__section']}>
                        <h4 className={styles['approval-detail__section-title']}>Requested By</h4>
                        <div className={styles['approval-detail__requester']} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className={styles['approval-detail__requester-avatar']}>
                                    {reqName.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles['approval-detail__requester-info']}>
                                    <div className={styles['approval-detail__requester-name']}>{reqName}</div>
                                    <div className={styles['approval-detail__requester-meta']}>
                                        {d.eid && <span>{String(d.eid)}</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ height: 1, background: '#bae6fd', margin: '12px 0' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                                    <Mail size={14} color="#0284c7" />
                                    <span>{(d.email && String(d.email).includes('@')) ? String(d.email) : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a', fontWeight: 500 }}>
                                    <Phone size={14} color="#0284c7" />
                                    <span>{String(d.phoneno || '—')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 1. Registration */}
                    {ferryType === FerryRequestType.registration && (
                        <div className={styles['approval-detail__section']}>
                            <div className={styles['approval-detail__grid']} style={{ marginBottom: 24 }}>
                                <Field label="Contact Phone Number" value={String(d.contactphone || d.phoneno || '')} />
                                <Field label="Current Assigned Ferry Number" value={resolvedCurrentFerry} />
                            </div>
                            
                            <h4 className={styles['approval-detail__section-title']}>Registration Details</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Working Hours" value={resolvedWorkingHour} />
                                <Field label="Township" value={String(d.township || '')} />
                                <Field label="Main Road" value={String(d.road || '')} />
                                <Field label="Nearest Bus Stop" value={String(d.busstop || '')} />
                            </div>
                        </div>
                    )}

                    {/* 2. Change */}
                    {ferryType === FerryRequestType.change && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Change Request Details</h4>
                            <div className={styles['approval-detail__grid']} style={{ gridTemplateColumns: '1fr', marginBottom: 'var(--space-4)' }}>
                                <Field label="Change Type" value={resolvedChangeType} />
                            </div>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Contact Phone Number" value={String(d.contactphone || d.phoneno || '')} />
                                <Field label="Current Assigned Ferry" value={resolvedCurrentFerry} />
                            </div>
                                
                            {/* Temporary */}
                            {isTemporary && (
                                <>
                                    {d.remark && (
                                        <div style={{ marginTop: 16, marginBottom: 16 }}>
                                            <h4 className={styles['approval-detail__section-title']}>Reason for Change Request (Business Requirement)</h4>
                                            <div className={styles['approval-detail__remark']}>{String(d.remark)}</div>
                                        </div>
                                    )}
                                    <div className={styles['approval-detail__grid']}>
                                        <Field label="Desired Ferry Number" value={resolvedDesiredFerry} />
                                        {d.startdate && <Field label="Desired Date From" value={fromApiDate(String(d.startdate))} />}
                                        {d.enddate && <Field label="Desired Date To" value={fromApiDate(String(d.enddate))} />}
                                    </div>
                                </>
                            )}

                            {/* Shift Change */}
                            {isShiftChange && (
                                <>
                                    <div className={styles['approval-detail__grid']} style={{ marginTop: 16 }}>
                                        <Field label="Purpose of Change" value={resolvedChangePurpose} />
                                        {resolvedOfficeLocation && <Field label="New Office Location" value={resolvedOfficeLocation} />}
                                        {d.startdate && <Field label="Desired Start Date" value={fromApiDate(String(d.startdate))} />}
                                    </div>
                                </>
                            )}

                            {/* Office/Home Location Change */}
                            {!isTemporary && !isShiftChange && !isSuspension && (
                                <div style={{ marginTop: 16 }}>
                                    <h4 className={styles['approval-detail__section-title']}>
                                        Permanent Change for Business/Personal Requirement
                                    </h4>
                                    <div className={styles['approval-detail__grid']}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <Field label="Purpose of Change" value={resolvedChangePurpose} />
                                        </div>
                                        {resolvedOfficeLocation && <Field label="New Office Location" value={resolvedOfficeLocation} />}
                                        {d.startdate && <Field label="Desired Start Date of Change" value={fromApiDate(String(d.startdate))} />}
                                        {d.address && <div style={{ gridColumn: '1 / -1' }}><Field label="New Home Address" value={String(d.address)} /></div>}
                                        {d.road && <Field label="Main Road" value={String(d.road)} />}
                                        {d.busstop && <Field label="Nearest Bus Stop" value={String(d.busstop)} />}
                                    </div>
                                </div>
                            )}

                            {/* Suspension */}
                            {isSuspension && (
                                <div style={{ marginTop: 16 }}>
                                    <h4 className={styles['approval-detail__section-title']}>
                                        Temporary Suspension for Ferry Usage
                                    </h4>
                                    <div className={styles['approval-detail__grid']}>
                                        {d.startdate && <Field label="Desired Date For Suspension From" value={fromApiDate(String(d.startdate))} />}
                                        {d.enddate && <Field label="Desired Date For Suspension To" value={fromApiDate(String(d.enddate))} />}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. User Complaint */}
                    {ferryType === FerryRequestType.usercomplaint && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>User Complaint</h4>
                            <div className={styles['approval-detail__grid']} style={{ marginBottom: 16 }}>
                                <Field label="Current Assigned Ferry Number" value={resolvedCurrentFerry} />
                            </div>
                            <div style={{
                                display: 'flex', flexDirection: 'column', gap: 0,
                                border: '1px solid var(--color-neutral-200)', borderRadius: 8, overflow: 'hidden',
                            }}>
                                {COMPLAINT_OPTS.map((opt, i) => {
                                    const checked = selectedComplaints.includes(opt.id);
                                    return (
                                        <label key={opt.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 14px', cursor: 'default',
                                            fontSize: 13, color: 'var(--color-neutral-700)',
                                            background: checked ? 'var(--color-primary-50)' : '#fff',
                                            borderBottom: i < COMPLAINT_OPTS.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled
                                                style={{ accentColor: 'var(--color-primary-600)', width: 16, height: 16, flexShrink: 0 }}
                                                readOnly
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {d.remark && (
                                <div style={{ marginTop: 16 }}>
                                    <div className={styles['approval-detail__field-label']} style={{ marginBottom: 4 }}>Complaint Description</div>
                                    <div className={styles['approval-detail__remark']}>{String(d.remark)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. HR Complaint */}
                    {ferryType === FerryRequestType.hrcomplaint && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>HR Complaint</h4>
                            <div>
                                <div className={styles['approval-detail__field-label']} style={{ marginBottom: 4 }}>Complaint Description</div>
                                <div className={styles['approval-detail__remark']}>{String(d.remark || '—')}</div>
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    {detail.attachment && Array.isArray(detail.attachment) && detail.attachment.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Attachments</h4>
                            <div className={styles['approval-detail__attachment-list']}>
                                {detail.attachment.map((at: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={at.signedURL || at.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles['approval-detail__attachment-item']}
                                    >
                                        <Paperclip size={14} />
                                        <span>{at.filename || at.name || `Attachment ${idx + 1}`}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 9. Step-Level Workflow Tracker */}
                    {isStepLevel && stepLevelData.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <ApprovalWorkflowModal steps={stepLevelData} />
                        </div>
                    )}

                    {/* 10. Normal Approver List */}
                    {(!isStepLevel) && detailApprovers.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Approvers</h4>
                            {detailApprovers.map((a: any) => (
                                <div key={a.userid ?? a.syskey} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 0', borderBottom: '1px solid var(--color-neutral-100)',
                                }}>
                                    <div className={styles['approval-detail__requester-avatar']} style={{ width: 36, height: 36, fontSize: 14 }}>
                                        {(a.name?.[0] ?? 'A').toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{a.userid} · {a.eid ?? ''}</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>
                                        {(a.status === '2' || a.status === 2) && <CheckCircle size={18} color="var(--color-success-500)" />}
                                        {(a.status === '3' || a.status === 3) && <XCircle     size={18} color="var(--color-danger-500)" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Approver Action Details */}
                    {displayTitle !== 'HR Complaint' && displayTitle !== 'Ferry Change' && (
                        <div className={styles['approval-detail__section']} style={{ marginTop: 24, padding: 20, background: 'var(--color-primary-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-200)' }}>
                            <h4 className={styles['approval-detail__section-title']} style={{ color: 'var(--color-primary-700)' }}>
                                Approver Action Details
                            </h4>
                            <div className={styles['approval-detail__grid']} style={{ gridTemplateColumns: '1fr', gap: 16 }}>
                                {ferryType === FerryRequestType.registration && (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: 6 }}>
                                                Assign Ferry Number *
                                            </label>
                                            <select 
                                                value={assignedFerrySyskey} 
                                                onChange={e => { setAssignedFerrySyskey(e.target.value); setActionErrors(p => ({...p, assignedFerrySyskey: ''})); }}
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 6,
                                                    border: `1px solid ${actionErrors.assignedFerrySyskey ? 'var(--color-danger-500)' : 'var(--color-neutral-300)'}`,
                                                    background: '#fff', fontSize: 14, color: 'var(--color-neutral-900)'
                                                }}
                                            >
                                                <option value="">— Select ferry number —</option>
                                                {ferryNos.map((fn: any) => (
                                                    <option key={fn.syskey} value={fn.syskey}>
                                                        {fn.carno ?? fn.description ?? fn.ferryCarNo ?? fn.syskey}
                                                    </option>
                                                ))}
                                            </select>
                                            {actionErrors.assignedFerrySyskey && <span style={{ color: 'var(--color-danger-500)', fontSize: 12, marginTop: 4, display: 'block' }}>{actionErrors.assignedFerrySyskey}</span>}
                                        </div>
                                        
                                        <div>
                                            <Input
                                                label="Driver Phone Number *"
                                                value={driverPhone}
                                                onChange={e => { setDriverPhone(e.target.value); setActionErrors(p => ({...p, driverPhone: ''})); }}
                                                placeholder="Enter driver phone number"
                                                error={actionErrors.driverPhone}
                                            />
                                        </div>

                                        <div>
                                            <Input
                                                label="GPS Information *"
                                                value={gpsInfo}
                                                onChange={e => { setGpsInfo(e.target.value); setActionErrors(p => ({...p, gpsInfo: ''})); }}
                                                placeholder="Enter GPS information"
                                                error={actionErrors.gpsInfo}
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <Textarea
                                        label="Comment *"
                                        value={comment}
                                        onChange={e => { setComment(e.target.value); setActionErrors(p => ({...p, comment: ''})); }}
                                        placeholder="Enter approval/rejection comment here..."
                                        rows={3}
                                        error={actionErrors.comment}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Approval Action */}
                <div className={styles['approval-detail__actions']}>
                    <div className={styles['approval-detail__action-row']}>
                        <Button
                            variant="success"
                            onClick={handleApprove}
                            disabled={submitMutation.isPending || isApproved}
                        >
                            {submitMutation.isPending && submitMutation.variables === '2' ? <Loader2 size={16} className={styles['spin']} /> : <CheckCircle size={16} />}
                            Approve
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleReject}
                            disabled={submitMutation.isPending || isRejected}
                        >
                            {submitMutation.isPending && submitMutation.variables === '3' ? <Loader2 size={16} className={styles['spin']} /> : <XCircle size={16} />}
                            Reject
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
