import { useState, useEffect } from 'react';
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
    Users,
    Paperclip,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { Textarea } from '../../components/ui/Input/Input';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus, type ApprovalDetailModel, type TypesModel, type Approver } from '../../types/models';
import apiClient from '../../lib/api-client';
import {
    APPROVAL_DETAIL,
    SAVE_APPROVAL,
    CURRENCY_TYPES,
    CAR_TYPES,
    CARS_LIST,
    DRIVERS_LIST,
    CLAIM_TYPES,
    TRANSPORTATION_TYPES,
    TRAVEL_TYPE_LIST,
    VEHICLE_USE_LIST,
    PRODUCT_LIST,
    PROJECT_LIST,
} from '../../config/api-routes';
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

const CLAIM_PROCESS_STATUS_OPTIONS = [
    { code: '', description: '-' },
    { code: '1', description: 'Review By EB Team' },
    { code: '2', description: 'Review By Third Party Assessor' },
    { code: '3', description: 'Completed' },
];

export default function ApprovalDetailPage() {
    const { id: syskey } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [comment, setComment] = useState('');
    const [confirmedAmount, setConfirmedAmount] = useState('');
    const [processStatus, setProcessStatus] = useState<string>('');

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

    // Travel-specific lookups
    const isTravel = String(detail?.datalist?.requesttypedesc || detail?.datalist?.requesttype || '').toLowerCase().includes('travel');

    const { data: travelTypeList = [] } = useQuery<TypesModel[]>({
        queryKey: ['travelTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(TRAVEL_TYPE_LIST);
            return res.data?.datalist || [];
        },
        enabled: !!isTravel,
        staleTime: 5 * 60 * 1000,
    });

    const { data: vehicleUseList = [] } = useQuery<TypesModel[]>({
        queryKey: ['vehicleUseList'],
        queryFn: async () => {
            const res = await apiClient.get(VEHICLE_USE_LIST);
            return res.data?.datalist || [];
        },
        enabled: !!isTravel,
        staleTime: 5 * 60 * 1000,
    });

    const { data: productList = [] } = useQuery<TypesModel[]>({
        queryKey: ['productList'],
        queryFn: async () => {
            const res = await apiClient.get(PRODUCT_LIST);
            return res.data?.datalist || [];
        },
        enabled: !!isTravel,
        staleTime: 5 * 60 * 1000,
    });

    const { data: projectList = [] } = useQuery<TypesModel[]>({
        queryKey: ['projectList'],
        queryFn: async () => {
            const res = await apiClient.get(PROJECT_LIST);
            return res.data?.datalist || [];
        },
        enabled: !!isTravel,
        staleTime: 5 * 60 * 1000,
    });

    // Sync processStatus from loaded data
    useEffect(() => {
        if (detail) {
            const dl = detail.datalist as Record<string, unknown>;
            setProcessStatus(String(dl?.processstatus || dl?.claimProcessStatus || ''));
        }
    }, [detail]);

    const data = detail?.datalist || ({} as Record<string, unknown>);
    // approverList is at the root of the API response, not inside datalist
    const approverList = (
        (detail as any)?.approverList ||
        (data as Record<string, unknown>)?.approverList ||
        (data as Record<string, unknown>)?.selectedApprovers
    ) as Array<{ syskey: string; name: string; eid?: string }> | undefined;

    // ── Approve / Reject mutation ──
    const actionMutation = useMutation({
        mutationFn: async (status: 'approve' | 'reject') => {
            const statusCode = status === 'approve' ? '2' : '3';
            const payload = {
                syskey: syskey,
                status: statusCode,
                comment,
                confirmed_amount: parseFloat(confirmedAmount),
                selectedApprovers: approverList || [],
                processstatus: processStatus,
            };
            const res = await apiClient.post(SAVE_APPROVAL, payload);
            return res.data;
        },
        onSuccess: (_data, status) => {
            const messages = {
                approve: 'Request approved successfully',
                reject: 'Request rejected',
            };
            toast.success(messages[status]);
            queryClient.invalidateQueries({ queryKey: ['approvals'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['approval-detail', syskey] });
            navigate('/approvals');
        },
        onError: () => toast.error(t('common.error')),
    });

    const processStatusMutation = useMutation({
        mutationFn: async (statusCode: string) => {
            const payload = {
                syskey,
                status: '1',
                processstatus: statusCode,
                comment: '',
                selectedApprovers: approverList || [],
            };
            const res = await apiClient.post(SAVE_APPROVAL, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Process status updated successfully');
            queryClient.invalidateQueries({ queryKey: ['approval-detail', syskey] });
        },
        onError: () => toast.error(t('common.error')),
    });

    const handleAction = (status: 'approve' | 'reject') => {
        if (status === 'approve') {
            const isClaimWithMaxAmount = requestTypeString.includes('claim') && d.max_amount !== undefined && Number(d.max_amount) !== 0;
            if (isClaimWithMaxAmount && (!confirmedAmount || confirmedAmount.trim() === '')) {
                toast.error('Confirmed amount is required for approval.');
                return;
            }
        } else if (status === 'reject') {
            if (!comment || comment.trim() === '') {
                toast.error(t('approval.commentRequired', 'Comment is required for rejection.'));
                return;
            }
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
    const isPending = String(d.requeststatus) === RequestStatus.Pending;
    const isApproved = String(d.requeststatus) === RequestStatus.Approved;
    const isRejected = String(d.requeststatus) === RequestStatus.Rejected;
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

    const isClaim = requestTypeString.includes('claim') || requestTypeString.includes('advance');
    const hasMaxAmount = isClaim && d.max_amount !== undefined && Number(d.max_amount) !== 0;

    const isClaimWithMax = isClaim && hasMaxAmount;
    const canApproveReject = isClaimWithMax
        ? (!isPending || processStatus === '3' || processStatus.trim() === '')
        : true;

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

                    {/* Date & Time — Travel has its own dedicated section with departure/arrival, skip for travel */}
                    {!requestTypeString.includes('travel') && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Date &amp; Time</h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Start Date" value={displayDate(d.startdate || d.date || d.selectday)} />
                                {!requestTypeString.includes('claim') && <Field label="End Date" value={displayDate(d.enddate)} />}
                                <Field label="Start Time" value={String(d.starttime || d.time || '')} />
                                {!requestTypeString.includes('claim') && <Field label="End Time" value={String(d.endtime || '')} />}
                                {!requestTypeString.includes('claim') && <Field label="Duration" value={String(d.duration || '')} />}
                            </div>
                        </div>
                    )}

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
                    {(d.departuredate || d.departuretime || d.modeoftravel) && !requestTypeString.includes('claim') && (() => {
                        // Resolve UUIDs → readable names
                        const modeNames = Array.isArray(d.modeoftravel)
                            ? d.modeoftravel.map((id: string) =>
                                travelTypeList.find((t: TypesModel) => t.syskey === id)?.description || id
                              ).join(', ')
                            : String(d.modeoftravel || '');

                        const vehicleNames = Array.isArray(d.vehicleuse)
                            ? d.vehicleuse.map((id: string) =>
                                vehicleUseList.find((v: TypesModel) => v.syskey === id)?.description || id
                              ).join(', ')
                            : String(d.vehicleuse || '');

                        const productName = productList.find((p: TypesModel) => p.syskey === d.product)?.description
                            || d.productdesc || d.product || '';

                        const projectName = projectList.find((p: TypesModel) => p.syskey === d.project)?.description
                            || d.projectdesc || d.project || '';

                        return (
                            <div className={styles['approval-detail__section']}>
                                <h4 className={styles['approval-detail__section-title']}>Travel</h4>
                                <div className={styles['approval-detail__grid']}>
                                    {/* Only show these when they have values */}
                                    {d.travelRefNo && <Field label="Travel Ref No" value={String(d.travelRefNo)} />}
                                    {d.fromplace && <Field label="From" value={String(d.fromplace)} />}
                                    {d.toplace && <Field label="To" value={String(d.toplace)} />}
                                    {d.departuredate && <Field label="Departure Date" value={displayDate(d.departuredate)} />}
                                    {d.arrivaldate && <Field label="Arrival Date" value={displayDate(d.arrivaldate)} />}
                                    {d.departuretime && <Field label="Departure Time" value={String(d.departuretime)} />}
                                    {d.plannedreturn && <Field label="Planned Return" value={String(d.plannedreturn)} />}
                                    {d.travelpurpose && <Field label="Travel Purpose" value={String(d.travelpurpose)} />}
                                    {d.days && <Field label="Days" value={String(d.days)} />}
                                    {modeNames && <Field label="Mode of Travel" value={modeNames} />}
                                    {vehicleNames && <Field label="Vehicle Use" value={vehicleNames} />}
                                    {productName && <Field label="Product" value={productName} />}
                                    {projectName && <Field label="Project" value={projectName} />}
                                    {d.estimatedbudget > 0 && <Field label="Est. Budget" value={Number(d.estimatedbudget).toLocaleString()} />}
                                    {d.extendDate && <Field label="Extend Date" value={displayDate(d.extendDate)} />}
                                    {d.extendBudget > 0 && <Field label="Extend Budget" value={Number(d.extendBudget).toLocaleString()} />}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Claim / Cash Advance fields */}
                    {isClaim && (d.amount || d.currencytype) && (() => {
                        return (
                            <div className={styles['approval-detail__section']}>
                                <h4 className={styles['approval-detail__section-title']}>Claim / Advance</h4>
                                {/* Claim Type - full row */}
                                <div className={styles['approval-detail__grid']} style={{ gridTemplateColumns: '1fr' }}>
                                    <Field label="Claim Type" value={String(resolvedSubtype || '')} />
                                </div>
                                {/* Amount | Currency */}
                                <div className={styles['approval-detail__grid']} style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
                                    <Field label="Amount" value={d.amount != null ? Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : undefined} />
                                    <Field label="Currency" value={currencyName} />
                                </div>
                                {/* Remaining Balance | Max Amount — only when max_amount is set */}
                                {hasMaxAmount && (
                                    <div className={styles['approval-detail__grid'] ?? ''} style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
                                        <Field label="Remaining Balance" value={d.remaining_balance !== undefined ? Number(d.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : undefined} />
                                        <Field label="Max Amount" value={d.max_amount !== undefined ? Number(d.max_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : undefined} />
                                    </div>
                                )}
                            </div>
                        );
                    })()}

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
                    {(requestTypeString.includes('workfromhome') || requestTypeString.includes('wfh')) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>
                                <Home size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Work From Home Details
                            </h4>
                            <div className={styles['approval-detail__grid']}>
                                <Field label="Location" value={String(d.locationname || d.location || '')} />
                                <Field label="Reason" value={String(d.reason || d.remark || d.comment || '')} />
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

                    {/* Remarks — includes rejectreason when rejected */}
                    {(d.remark || d.comment || d.reason || d.description || d.rejectreason || d.travelpurpose) && !requestTypeString.includes('travel') && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Remarks</h4>
                            <div className={styles['approval-detail__remark-container']}>
                                <p className={styles['approval-detail__remark']} style={{ whiteSpace: 'pre-wrap' }}>
                                    {String(d.remark || d.comment || d.reason || d.description || d.rejectreason || d.travelpurpose)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Reject Reason — when rejected and not yet shown in remarks */}
                    {isRejected && d.rejectreason && (d.remark || d.comment || d.reason || d.description || d.travelpurpose) && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>Reject Reason</h4>
                            <div className={styles['approval-detail__remark-container']}>
                                <p className={styles['approval-detail__remark']} style={{ whiteSpace: 'pre-wrap', color: 'var(--color-danger-600, #dc2626)' }}>
                                    {String(d.rejectreason)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Approvers */}
                    {approverList && approverList.length > 0 && (
                        <div className={styles['approval-detail__section']}>
                            <h4 className={styles['approval-detail__section-title']}>
                                <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Approval Chain
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {approverList.map((a, idx) => (
                                    <div
                                        key={a.syskey}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            background: 'var(--color-neutral-50, #f8fafc)',
                                            border: '1px solid var(--color-neutral-100, #f1f5f9)',
                                        }}
                                    >
                                        {/* Avatar: profile image or initials */}
                                        {(a as any).signedURL ? (
                                            <img
                                                src={(a as any).signedURL}
                                                alt={a.name}
                                                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: 'var(--color-primary-100, #dbeafe)',
                                                color: 'var(--color-primary-700, #1d4ed8)',
                                                fontSize: 13, fontWeight: 700,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {a.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-900)' }}>
                                                {a.name}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>
                                                {a.eid || (a as any).userid || `Approver ${idx + 1}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Accompany Persons — check both root and datalist level */}
                    {(() => {
                        const accompanyList = (detail as any)?.accompanyPersonList || d.accompanyPersonList || [];
                        if (!accompanyList.length) return null;
                        return (
                            <div className={styles['approval-detail__section']}>
                                <h4 className={styles['approval-detail__section-title']}>Accompanying Persons</h4>
                                <div className={styles['approval-detail__approver-list']}>
                                    {accompanyList.map((p: Approver) => (
                                        <span key={p.syskey} className={styles['approval-detail__approver-chip']}>
                                            <span className={styles['approval-detail__approver-dot']}>
                                                {p.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

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
                        <div className={styles['approval-detail__comment-box']}>
                            {(isPending || isApproved || isRejected) && requestTypeString.includes('claim') && d.max_amount !== undefined && Number(d.max_amount) !== 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <label
                                        htmlFor="confirmedAmount"
                                        style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--color-neutral-700)',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Confirmed Amount
                                    </label>
                                    {isApproved ? (
                                        <div style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            border: '1.5px solid var(--color-neutral-200)',
                                            borderRadius: 8,
                                            background: 'var(--color-neutral-50, #f8fafc)',
                                            color: 'var(--color-neutral-900)',
                                            boxSizing: 'border-box',
                                            cursor: 'not-allowed'
                                        }}>
                                            {d.confirmed_amount != null
                                                ? Number(d.confirmed_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                                : (confirmedAmount || '—')}
                                        </div>
                                    ) : (
                                        <input
                                            id="confirmedAmount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={confirmedAmount}
                                            onChange={(e) => setConfirmedAmount(e.target.value)}
                                            placeholder="Enter confirmed amount…"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '14px',
                                                border: '1.5px solid var(--color-neutral-200)',
                                                borderRadius: 8,
                                                outline: 'none',
                                                color: 'var(--color-neutral-900)',
                                                background: 'var(--color-neutral-0, #fff)',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s',
                                            }}
                                            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary-500)')}
                                            onBlur={(e) => (e.target.style.borderColor = 'var(--color-neutral-200)')}
                                        />
                                    )}
                                </div>
                            )}

                            {isPending && (
                                <Textarea
                                    id="approvalComment"
                                    label={t('approval.comment')}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add your comment (required for rejection)…"
                                    rows={3}
                                />
                            )}

                            {isPending && hasMaxAmount && (
                                <div style={{ marginTop: 12 }}>
                                    <label
                                        style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--color-neutral-700)',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Process Status
                                    </label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <select
                                            value={processStatus}
                                            onChange={(e) => setProcessStatus(e.target.value)}
                                            disabled={!isPending || processStatusMutation.isPending}
                                            style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                fontSize: '14px',
                                                border: '1.5px solid var(--color-neutral-200)',
                                                borderRadius: 8,
                                                background: !isPending ? 'var(--color-neutral-50)' : 'var(--color-neutral-0, #fff)',
                                                color: 'var(--color-neutral-900)',
                                                cursor: !isPending ? 'not-allowed' : 'pointer',
                                                outline: 'none',
                                                transition: 'border-color 0.2s',
                                                boxSizing: 'border-box',
                                                height: 40,
                                            }}
                                        >
                                            {CLAIM_PROCESS_STATUS_OPTIONS.map(opt => (
                                                <option key={opt.code} value={opt.code}>{opt.description}</option>
                                            ))}
                                        </select>
                                        <Button
                                            variant="primary"
                                            onClick={() => processStatusMutation.mutate(processStatus)}
                                            loading={processStatusMutation.isPending}
                                            disabled={!isPending}
                                        >
                                            Update
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles['approval-detail__action-row']}>
                            {canApproveReject && (isPending || isApproved) && (
                                <Button
                                    variant="success"
                                    onClick={() => handleAction('approve')}
                                    loading={actionMutation.isPending && actionMutation.variables === 'approve'}
                                    disabled={isApproved}
                                >
                                    <CheckCircle size={16} />
                                    {t('request.approve')}
                                </Button>
                            )}

                            {canApproveReject && (isPending || isRejected) && (
                                <Button
                                    variant="danger"
                                    onClick={() => handleAction('reject')}
                                    loading={actionMutation.isPending && actionMutation.variables === 'reject'}
                                    disabled={isRejected}
                                >
                                    <XCircle size={16} />
                                    {t('request.reject')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
