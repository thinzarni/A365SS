import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    Palmtree,
    Clock,
    Home,
    Car,
    Calendar,
    Plane,
    Banknote,
    FileText,
    CheckCircle,
    XCircle,
    Forward,
    Send,
    Users,
    Paperclip,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { Textarea } from '../../components/ui/Input/Input';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import MemberPicker from '../../components/shared/MemberPicker/MemberPicker';
import type { MemberItem } from '../../components/shared/MemberPicker/MemberPicker';
import type { ApprovalDetailModel, TypesModel, Approver } from '../../types/models';
import apiClient from '../../lib/api-client';
import { APPROVAL_DETAIL, SAVE_APPROVAL, CURRENCY_TYPES, CAR_TYPES, CARS_LIST, DRIVERS_LIST, CLAIM_TYPES, TRANSPORTATION_TYPES } from '../../config/api-routes';
import styles from './ApprovalDetailPage.module.css';

/** Convert "yyyymmdd" → "dd/mm/yyyy" for display */
function displayDate(raw?: string | unknown): string {
    const s = String(raw || '');
    if (s.length < 8 || s === 'undefined') return s;
    return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

function formatRequestType(type: string): string {
    if (!type) return 'Request';
    const t = String(type).toLowerCase().replace(/\s+/g, '');
    switch (t) {
        case 'cashadvance': return 'Cash Advance';
        case 'claim': return 'Claim';
        case 'earlyout': return 'Early Out';
        case 'employeerequisition': return 'Employee Requisition';
        case 'general': return 'General';
        case 'late': return 'Late';
        case 'leave': return 'Leave';
        case 'offinlieu': return 'Off In Lieu';
        case 'overtime': return 'Overtime';
        case 'purchase': return 'Purchase';
        case 'reservation': return 'Reservation';
        case 'transportation': return 'Transportation';
        case 'travel': return 'Travel';
        case 'workfromhome': return 'Work From Home';
        case 'wfh': return 'Work From Home';
        default:
            return String(type);
    }
}

/* ══════════════════════════════════════════════════════════════ */

function getTypeVisual(data: Record<string, unknown>) {
    const desc = String(data?.requesttypedesc || data?.requesttype || '').toLowerCase();
    if (desc.includes('leave')) return { Icon: Palmtree, bg: '#f0fdf4', color: '#16a34a' };
    if (desc.includes('overtime') || desc.includes('ot')) return { Icon: Clock, bg: '#fef3c7', color: '#d97706' };
    if (desc.includes('work from home') || desc.includes('wfh')) return { Icon: Home, bg: '#eff6ff', color: '#2563eb' };
    if (desc.includes('transport')) return { Icon: Car, bg: '#faf5ff', color: '#9333ea' };
    if (desc.includes('reserv')) return { Icon: Calendar, bg: '#ecfeff', color: '#0891b2' };
    if (desc.includes('travel')) return { Icon: Plane, bg: '#fff7ed', color: '#ea580c' };
    if (desc.includes('claim') || desc.includes('advance')) return { Icon: Banknote, bg: '#fef2f2', color: '#dc2626' };
    return { Icon: FileText, bg: '#f1f5f9', color: '#64748b' };
}

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

/* ══════════════════════════════════════════════════════════════ */

export default function ApprovalDetailPage() {
    const { id: syskey } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [comment, setComment] = useState('');
    const [forwardApprovers, setForwardApprovers] = useState<MemberItem[]>([]);
    const [showForward, setShowForward] = useState(false);

    // Data fetching setup
    const { data: detail, isLoading } = useQuery<ApprovalDetailModel>({
        queryKey: ['approval-detail', syskey],
        queryFn: async () => {
            const res = await apiClient.post(APPROVAL_DETAIL, { syskey });
            const payloadData = res.data;
            if (payloadData?.statuscode === 300) return payloadData;
            throw new Error(payloadData?.message || 'Failed to fetch approval details');
        },
        enabled: !!syskey,
    });

    const { data: currencyList = [] } = useQuery<TypesModel[]>({
        queryKey: ['currencyTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(CURRENCY_TYPES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: carTypesList = [] } = useQuery<TypesModel[]>({
        queryKey: ['carTypeList'],
        queryFn: async () => {
            const res = await apiClient.post(CAR_TYPES, {});
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: carsList = [] } = useQuery<{ syskey: string, carno: string }[]>({
        queryKey: ['carsList'],
        queryFn: async () => {
            const res = await apiClient.get(CARS_LIST);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: driversList = [] } = useQuery<{ syskey: string, name: string }[]>({
        queryKey: ['driversList'],
        queryFn: async () => {
            const res = await apiClient.get(DRIVERS_LIST);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: claimTypesList = [] } = useQuery<TypesModel[]>({
        queryKey: ['claimTypesList'],
        queryFn: async () => {
            const res = await apiClient.get(CLAIM_TYPES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: transportationTypesList = [] } = useQuery<TypesModel[]>({
        queryKey: ['transportationTypesList'],
        queryFn: async () => {
            const res = await apiClient.get(TRANSPORTATION_TYPES);
            return res.data?.datalist || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const data = detail?.datalist || ({} as Record<string, unknown>);
    const approverList = (data as Record<string, unknown>)?.selectedApprovers as Array<{ syskey: string; name: string }> | undefined;

    // ── Approve / Reject / Forward mutation ──
    const actionMutation = useMutation({
        mutationFn: async (status: 'approve' | 'reject' | 'forward') => {
            const statusCode = status === 'approve' ? '2' : status === 'reject' ? '3' : '1';
            const payload = {
                syskey: syskey,
                status: statusCode,
                comment,
                selectedApprovers:
                    status === 'forward' && forwardApprovers.length > 0
                        ? forwardApprovers.map((a) => ({ syskey: a.syskey, name: a.name }))
                        : [],
            };
            const res = await apiClient.post(SAVE_APPROVAL, payload);
            return res.data;
        },
        onSuccess: (_data, status) => {
            const messages = {
                approve: 'Request approved successfully',
                reject: 'Request rejected',
                forward: 'Request forwarded to next approver',
            };
            toast.success(messages[status]);
            queryClient.invalidateQueries({ queryKey: ['approvals'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['approval-detail', syskey] });
            navigate('/approvals');
        },
        onError: () => toast.error(t('common.error')),
    });

    const handleAction = (status: 'approve' | 'reject' | 'forward') => {
        // if (status === 'reject' && !comment.trim()) {
        //     toast.error('Please add a comment before rejecting');
        //     return;
        // }
        if (status === 'forward' && forwardApprovers.length === 0) {
            toast.error('Please select an approver to forward to');
            return;
        }
        actionMutation.mutate(status);
    };

    /* ═══════════════════════ Loading / Empty ═══════════════════ */

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
                <button className={styles['approval-detail__back']} onClick={() => navigate('/approvals')}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className={styles['approval-detail__empty']}>
                    <FileText size={48} />
                    <h3>Approval not found</h3>
                </div>
            </div>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as Record<string, any>;
    const { Icon, bg, color } = getTypeVisual(d);
    const reqName = String(d.name || d.eid || 'Employee');
    const requestTypeString = String(d.requesttypedesc || d.requesttype || '').toLowerCase();
    const isPending = String(d.requeststatus) === '1';
    const isApproved = String(d.requeststatus) === '2';
    const isRejected = String(d.requeststatus) === '3';
    const showActionBar = isPending || isApproved || isRejected;

    // Dictionary Mappings
    const currencyName = currencyList.find(c => c.syskey === d.currencytype)?.description || d.currencytype || '';
    const carTypeName = carTypesList.find(c => c.syskey === d.cartype)?.description || d.cartype || '';
    const carName = carsList.find(c => c.syskey === d.car)?.carno || d.car || '';
    const driverName = driversList.find(c => c.syskey === d.driver)?.name || d.driver || '';

    // Resolve request subtype description
    let resolvedSubtype = d.requestsubtypedesc || '';
    if (!resolvedSubtype && d.requestsubtype) {
        if (requestTypeString.includes('claim') || requestTypeString.includes('advance')) {
            resolvedSubtype = claimTypesList.find(c => c.syskey === d.requestsubtype)?.description || d.requestsubtype;
        } else if (requestTypeString.includes('transportation')) {
            resolvedSubtype = transportationTypesList.find(c => c.syskey === d.requestsubtype)?.description || d.requestsubtype;
        } else {
            resolvedSubtype = d.requestsubtype;
        }
    }

    /* ═══════════════════════════ Render ═════════════════════════ */

    return (
        <div className={styles['approval-detail']}>
            <button className={styles['approval-detail__back']} onClick={() => navigate('/approvals')}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className={styles['approval-detail__card']}>
                {/* ── Header ── */}
                <div className={styles['approval-detail__header']}>
                    <div className={styles['approval-detail__header-left']}>
                        <div className={styles['approval-detail__icon']} style={{ background: bg, color }}>
                            <Icon size={24} />
                        </div>
                        <div className={styles['approval-detail__title-group']}>
                            <h2>
                                {formatRequestType(d.requesttypedesc || d.requesttype)}
                                {resolvedSubtype ? ` — ${String(resolvedSubtype)}` : ''}
                            </h2>
                            <span>
                                {d.refno ? `Ref #${d.refno}` : ''}
                                {d.eid ? ` · ${d.eid}` : ''}
                            </span>
                        </div>
                    </div>
                    <StatusBadge status={String(d.requeststatus || '1')} />
                </div>

                {/* ── Body ── */}
                <div className={styles['approval-detail__body']}>
                    {/* Requester */}
                    <div className={styles['approval-detail__section']}>
                        <h4 className={styles['approval-detail__section-title']}>Requested By</h4>
                        <div className={styles['approval-detail__requester']}>
                            <div className={styles['approval-detail__requester-avatar']}>
                                {reqName.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles['approval-detail__requester-info']}>
                                <div className={styles['approval-detail__requester-name']}>{reqName}</div>
                                <div className={styles['approval-detail__requester-meta']}>
                                    {String(d.eid || '')}
                                    {d.department ? ` · ${String(d.department)}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className={styles['approval-detail__section']}>
                        <h4 className={styles['approval-detail__section-title']}>Date & Time</h4>
                        <div className={styles['approval-detail__grid']}>
                            <Field label="Start Date" value={displayDate(d.startdate || d.date || d.selectday)} />
                            <Field label="End Date" value={displayDate(d.enddate)} />
                            <Field label="Start Time" value={String(d.starttime || d.time || '')} />
                            <Field label="End Time" value={String(d.endtime || '')} />
                            <Field label="Duration" value={String(d.duration || '')} />
                        </div>
                    </div>

                    {/* Transportation fields */}
                    {(d.pickupplace || d.dropoffplace || d.cartype || requestTypeString.includes('transportation')) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Transportation</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field
                                    label="Mode"
                                    value={d.isgroup === 0 ? 'Group' : (d.isgroup === 1 ? 'Individual' : undefined)}
                                />
                                <Field label="Purpose" value={resolvedSubtype} />
                                <Field label="Transportation Place" value={String(d.toplace || '')} />
                                <Field label="Trip Type" value={d.triptype === '0' ? 'One Way Trip' : (d.triptype === '1' ? 'Round Trip' : String(d.triptypedesc || d.triptype || ''))} />
                            </div>

                            {/* One Way Trip Leg */}
                            {(d.triptype === '0' || (!d.triptype && (d.pickupplace || d.dropoffplace || d.gobackarrivaltime || d.gobackreturntime))) && (
                                <div style={{ marginTop: 12 }}>
                                    <h5 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-600)', marginBottom: 8 }}>Trip Details</h5>
                                    <div className={styles['approval-detail__grid']}>
                                        <Field label="Start Location" value={String(d.pickupplace || '')} />
                                        <Field label="End Location" value={String(d.dropoffplace || '')} />
                                        <Field label="Start Time" value={String(d.gobackarrivaltime || '')} />
                                        <Field label="End Time" value={String(d.gobackreturntime || '')} />
                                    </div>
                                </div>
                            )}

                            {/* Round Trip Legs */}
                            {d.triptype === '1' && (
                                <>
                                    <div style={{ marginTop: 12 }}>
                                        <h5 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-600)', marginBottom: 8 }}>Departure</h5>
                                        <div className={styles['approval-detail__grid']}>
                                            <Field label="Start Location" value={String(d.pickupplace || '')} />
                                            <Field label="End Location" value={String(d.dropoffplace || '')} />
                                            <Field label="Start Time" value={String(d.gobackarrivaltime || '')} />
                                            <Field label="End Time" value={String(d.gobackreturntime || '')} />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        <h5 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-600)', marginBottom: 8 }}>Arrival</h5>
                                        <div className={styles['approval-detail__grid']}>
                                            <Field label="Start Location" value={String(d.arrivalstartlocation || '')} />
                                            <Field label="End Location" value={String(d.arrivalendlocation || '')} />
                                            <Field label="Start Time" value={String(d.arrivalstarttime || '')} />
                                            <Field label="End Time" value={String(d.arrivalendtime || '')} />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className={styles['approval-detail__grid']} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-neutral-100)' }}>
                                <Field label="Car" value={carName} />
                                <Field label="Driver" value={driverName} />
                                <Field label="Car Type" value={carTypeName} />
                                <Field label="Leave Time" value={String(d.userleavetime || '')} />
                            </div>
                        </div>
                    )}

                    {/* Travel fields */}
                    {(d.fromplace || d.toplace || d.travelRefNo || d.departuretime) && !requestTypeString.includes('claim') && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Travel</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Travel Ref No" value={String(d.travelRefNo || '')} />
                                <Field label="From" value={String(d.fromplace || '')} />
                                <Field label="To" value={String(d.toplace || '')} />
                                <Field label="Departure Date" value={displayDate(d.departuredate)} />
                                <Field label="Arrival Date" value={displayDate(d.arrivaldate)} />
                                <Field label="Departure Time" value={String(d.departuretime || '')} />
                                <Field label="Planned Return" value={String(d.plannedreturn || '')} />
                                <Field label="Mode of Travel" value={Array.isArray(d.modeoftravel) ? d.modeoftravel.join(', ') : String(d.modeoftravel || '')} />
                                <Field label="Vehicle Use" value={Array.isArray(d.vehicleuse) ? d.vehicleuse.join(', ') : String(d.vehicleuse || '')} />
                                <Field label="Product" value={String(d.product || '')} />
                                <Field label="Project" value={String(d.project || '')} />
                                <Field label="Est. Budget" value={d.estimatedbudget ? String(d.estimatedbudget) : undefined} />
                                <Field label="Extend Date" value={displayDate(d.extendDate)} />
                                <Field label="Extend Budget" value={d.extendBudget ? String(d.extendBudget) : undefined} />
                            </div>
                        </div>
                    )}

                    {/* Claim / Cash Advance fields */}
                    {(requestTypeString.includes('claim') || requestTypeString.includes('advance')) && (d.amount || d.currencytype) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Claim / Advance</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Claim Type" value={String(resolvedSubtype || '')} />
                                <Field label="Amount" value={d.amount ? String(d.amount) : undefined} />
                                <Field label="Currency" value={currencyName} />
                                <Field label="From Place" value={String(d.fromplace || '')} />
                                <Field label="To Place" value={String(d.toplace || '')} />
                                <Field label="Travel Ref No" value={String(d.travelRefNo || '')} />
                            </div>
                        </div>
                    )}

                    {/* Reservation */}
                    {(d.rooms || d.roomsdesc) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Reservation</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Room" value={String(d.roomsdesc || d.rooms || '')} />
                                <Field label="Max People" value={d.maxpeople ? String(d.maxpeople) : undefined} />
                            </div>
                        </div>
                    )}

                    {/* Overtime */}
                    {(d.otday || d.hour || requestTypeString.includes('overtime')) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Overtime</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="OT Day" value={displayDate(d.otday)} />
                                <Field label="Hours" value={String(d.hour || '')} />
                                <Field label="Product" value={String(d.product || '')} />
                                <Field label="Project" value={String(d.project || '')} />
                            </div>
                        </div>
                    )}

                    {/* Work From Home */}
                    {requestTypeString.includes('work from home') && d.locationname && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Location Data</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Location" value={String(d.locationname || '')} />
                            </div>
                        </div>
                    )}

                    {/* Members */}
                    {detail?.memberList && detail.memberList.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Members</h4>
                            <div className={styles['approval-detail__approver-list']}>
                                {detail.memberList.map((m: any) => (
                                    <span key={m.syskey} className={styles['approval-detail__approver-chip']}>
                                        <span className={styles['approval-detail__approver-dot']}>
                                            {m.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        {m.name} {m.eid ? `(${m.eid})` : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    {d.attachment && Array.isArray(d.attachment) && d.attachment.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Attachments</h4>
                            <div className={styles['approval-detail__attachment-list']}>
                                {d.attachment.map((at: any, idx: number) => (
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

                    {/* Remarks */}
                    {(d.remark || d.comment) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Remarks</h4>
                            <p className={styles['approval-detail__remark']}>
                                {String(d.remark || d.comment)}
                            </p>
                        </div>
                    )}

                    {/* Approvers */}
                    {approverList && approverList.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>
                                <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Approval Chain
                            </h4>
                            <div className={styles['approval-detail__approver-list']}>
                                {approverList.map((a) => (
                                    <span key={a.syskey} className={styles['approval-detail__approver-chip']}>
                                        <span className={styles['approval-detail__approver-dot']}>
                                            {a.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        {a.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Accompany / Members */}
                    {detail?.accompanyPersonList && detail.accompanyPersonList.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Accompanying Persons</h4>
                            <div className={styles['approval-detail__approver-list']}>
                                {detail.accompanyPersonList.map((p: Approver) => (
                                    <span key={p.syskey} className={styles['approval-detail__approver-chip']}>
                                        <span className={styles['approval-detail__approver-dot']}>
                                            {p.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Handovers */}
                    {(d as unknown as { selectedHandovers?: Array<{ syskey: string; name: string }> }).selectedHandovers &&
                        (d as unknown as { selectedHandovers?: Array<{ syskey: string; name: string }> }).selectedHandovers!.length > 0 && (
                            <div className={styles['approval-detail__section']}>
                                <h4 className={styles['approval-detail__section-title']}>Handover To</h4>
                                <div className={styles['approval-detail__approver-list']}>
                                    {(d as unknown as { selectedHandovers: Array<{ syskey: string; name: string }> }).selectedHandovers!.map((p) => (
                                        <span key={p.syskey} className={styles['approval-detail__approver-chip']}>
                                            <span className={styles['approval-detail__approver-dot']}>
                                                {p.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                </div>

                {/* ── Action Bar ── */}
                {showActionBar && (
                    <div className={styles['approval-detail__actions']}>
                        {(isPending || isApproved) && (
                            <div className={styles['approval-detail__comment-box']}>
                                <Textarea
                                    id="approvalComment"
                                    label={t('approval.comment')}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add your comment (required for rejection)…"
                                    rows={3}
                                />
                            </div>
                        )}

                        <div className={styles['approval-detail__action-row']}>
                            {(isPending || isRejected) && (
                                <Button
                                    variant="success"
                                    onClick={() => handleAction('approve')}
                                    loading={actionMutation.isPending && actionMutation.variables === 'approve'}
                                >
                                    <CheckCircle size={16} />
                                    {t('request.approve')}
                                </Button>
                            )}

                            {(isPending || isApproved) && (
                                <Button
                                    variant="danger"
                                    onClick={() => handleAction('reject')}
                                    loading={actionMutation.isPending && actionMutation.variables === 'reject'}
                                >
                                    <XCircle size={16} />
                                    {t('request.reject')}
                                </Button>
                            )}

                            {/* comment out forward feature */}
                            {/* {isPending && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowForward(!showForward)}
                                    className={showForward ? styles['approval-detail__forward-btn--active'] : ''}
                                >
                                    {showForward ? <X size={16} /> : <Forward size={16} />}
                                    {showForward ? 'Cancel' : 'Forward'}
                                </Button>
                            )} */}
                        </div>

                        {/* Forward-to-next-approver Panel */}
                        {showForward && isPending && (
                            <div className={styles['approval-detail__forward-section']}>
                                <div className={styles['approval-detail__forward-header']}>
                                    <Forward size={16} />
                                    <span>Forward to Next Approver</span>
                                </div>
                                <p className={styles['approval-detail__forward-desc']}>
                                    Select a person to forward this approval request to. They will become the next approver.
                                </p>

                                <MemberPicker
                                    label="Next Approver"
                                    members={forwardApprovers}
                                    onChange={setForwardApprovers}
                                    multiple={false}
                                />

                                <div className={styles['approval-detail__forward-actions']}>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleAction('forward')}
                                        loading={actionMutation.isPending && actionMutation.variables === 'forward'}
                                        disabled={forwardApprovers.length === 0}
                                    >
                                        <Send size={14} />
                                        Forward Request
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
