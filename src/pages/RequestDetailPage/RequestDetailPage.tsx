import { useState, useEffect } from 'react';
 
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    Trash2,
    Star,
    Send,
    Edit,
} from 'lucide-react';
import { Button, Textarea } from '../../components/ui';
import ApprovalWorkflowModal from '../../components/modals/ApprovalWorkflowModal';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestDetailModel, Approver } from '../../types/models';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { GET_REQUEST_DETAIL, GET_ATTENDANCE_REQ_DETAIL, DELETE_REQUEST, SAVE_REQUEST, CURRENCY_TYPES, LEAVE_REASONS, GET_ATTENDANCE_REASON, TRAVEL_TYPE_LIST, VEHICLE_USE_LIST, PRODUCT_LIST, PROJECT_LIST } from '../../config/api-routes';
import { flavor } from '../../config/features';
import type { TypesModel } from '../../types/models';
import styles from './RequestDetailPage.module.css';
import { displayDate } from '../../lib/date-utils';

const CLAIM_PROCESS_STATUS_OPTIONS = [
    { code: '', description: '-' },
    { code: '1', description: 'Review By EB Team' },
    { code: '2', description: 'Review By Third Party Assessor' },
    { code: '3', description: 'Completed' },
];

function getTypeVisual(desc: string) {
    const d = desc?.toLowerCase() || '';
    if (d.includes('leave')) return { Icon: Palmtree, bg: '#f0fdf4', color: '#16a34a' };
    if (d.includes('overtime') || d.includes('ot')) return { Icon: Clock, bg: '#fef3c7', color: '#d97706' };
    if (d.includes('work from home') || d.includes('wfh')) return { Icon: Home, bg: '#eff6ff', color: '#2563eb' };
    if (d.includes('transport')) return { Icon: Car, bg: '#faf5ff', color: '#9333ea' };
    if (d.includes('reserv')) return { Icon: Calendar, bg: '#ecfeff', color: '#0891b2' };
    if (d.includes('travel')) return { Icon: Plane, bg: '#fff7ed', color: '#ea580c' };
    if (d.includes('claim') || d.includes('advance')) return { Icon: Banknote, bg: '#fef2f2', color: '#dc2626' };
    return { Icon: FileText, bg: '#f1f5f9', color: '#64748b' };
}

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
    return (
        <div className={styles['request-detail__field']}>
            <span className={styles['request-detail__field-label']}>{label}</span>
            <span className={`${styles['request-detail__field-value']} ${!value ? styles['request-detail__field-value--empty'] : ''}`}>
                {value || '—'}
            </span>
        </div>
    );
}

export default function RequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { user, domain } = useAuthStore();

    const isAttendance = location.pathname.includes('/attendancerequest');
    const routerState = location.state as { item?: any; refIndex?: number } | null;
    const listRefIndex = routerState?.refIndex;

    // Mirrors mobile RequestDetail.fromJson — reads datalist + 4 separate person lists
    const { data: detailData, isLoading } = useQuery<{
        detail: RequestDetailModel;
        approverList: Approver[];
        memberList: Approver[];
        accompanyPersonList: Approver[];
        selectedHandovers: Approver[];
    }>({
        queryKey: ['requestDetail', id, isAttendance],
        queryFn: async () => {
            if (isAttendance) {
                const res = await mainClient.post(`${GET_ATTENDANCE_REQ_DETAIL}/${id}`, {
                    userid: user?.userid || '',
                    domain: domain || 'dev'
                });
                const raw = res.data?.data || res.data?.datalist || {};

                // Map attendance request specifics to generic detail model
                const requesttypedesc = (raw.type === "601") ? 'Time In' 
                    : (raw.type === "602") ? 'Time Out' 
                    : (raw.attendancerequesttype === 1) ? 'Remote Time in'
                    : (raw.attendancerequesttype === 2) ? 'Backdate Time in'
                    : 'Attendance';

                const mappedDetail: any = {
                    ...raw,
                    requesttypedesc,
                    requeststatus: String(raw.status || '1'),
                    requestsubtypedesc: '', // Do not show time in header — shown in Date & Time section
                    remark: raw.description,
                    employeeid: raw.employee_id,
                    name: raw.employee_name,
                    startdate: raw.date,
                    starttime: raw.intime,
                    endtime: raw.outtime,
                    locationname: raw.location,
                    processstatus: raw.processstatus || raw.claimProcessStatus || '',
                    // refno left undefined — only show if API returns a real refno
                    refno: raw.refno || '',
                };

                const approvers: Approver[] = typeof raw.approvedby === 'string' && raw.approvedby
                    ? [{ syskey: 'app-1', name: raw.approvedby, userid: '', position: '', photo: '' }]
                    : [];

                return {
                    detail: mappedDetail as RequestDetailModel,
                    approverList: approvers,
                    memberList: [],
                    accompanyPersonList: [],
                    selectedHandovers: [],
                };
            }

            const res = await apiClient.post(GET_REQUEST_DETAIL, { syskey: id });
            const detailData = res.data?.datalist || {};
            const parseList = (rootKey: string, detailKey: string): Approver[] =>
                (res.data?.[rootKey] as Approver[] | undefined) ||
                (detailData?.[detailKey] as Approver[] | undefined) || [];

            return {
                detail: detailData,
                approverList: parseList('approverList', 'selectedApprovers'),
                memberList: parseList('memberList', 'selectedMembers'),
                accompanyPersonList: parseList('accompanyPersonList', 'selectedAcconpanyPersons'),
                selectedHandovers: parseList('selectedHandovers', 'selectedHandovers'),
            };
        },
        enabled: !!id,
    });

    const { data: currencyList = [] } = useQuery<TypesModel[]>({
        queryKey: ['currencyTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(CURRENCY_TYPES);
            return res.data?.datalist || [];
        },
    });

    const isLeave = detailData?.detail?.requesttypedesc?.toLowerCase().includes('leave');

    const { data: leaveReasonsList = [] } = useQuery<TypesModel[]>({
        queryKey: ['leaveReasonList'],
        queryFn: async () => {
            const payload = {
                currentpage: 0,
                pagesize: 0,
                searchVal: '',
                searchObj: { order: '', orderType: '' }
            };
            const res = await apiClient.post(LEAVE_REASONS, payload);
            return res.data?.datalist || [];
        },
        enabled: !!isLeave && (flavor === 'prd' || flavor === 'mpt'),
    });

    // Attendance Reason lookup
    const { data: attendanceReasonsList = [] } = useQuery({
        queryKey: ['attendanceReasons'],
        queryFn: async () => {
            const res = await mainClient.post(GET_ATTENDANCE_REASON, {
                userid: user?.userid || '',
                domain: domain || 'dev',
            });
            const raw = res.data?.data || [];
            return raw.map((r: any) => ({ syskey: String(r.syskey), label: r.description || r.code || '' }));
        },
        enabled: isAttendance,
    });

    const isTravel = detailData?.detail?.requesttypedesc?.toLowerCase().includes('travel');

    // Travel-specific lookups — only fetched when request type is Travel
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

    const detail = detailData?.detail;
    const approverList = detailData?.approverList || [];
    const memberList = detailData?.memberList || [];
    const accompanyPersonList = detailData?.accompanyPersonList || [];

    const isClaim = detail?.requesttypedesc?.toLowerCase().includes('claim') || detail?.requesttypedesc?.toLowerCase().includes('advance');
    const hasMaxAmount = detail && detail.max_amount !== undefined && Number(detail.max_amount) !== 0;


    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(DELETE_REQUEST, { syskey: id });
        },
        onSuccess: () => {
            toast.success('Request deleted');
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            navigate('/requests');
        },
        onError: () => toast.error('Failed to delete request'),
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
 
    const [rating, setRating] = useState<number>(0);
    const [feedbacks, setFeedbacks] = useState<string>('');

    useEffect(() => {
        if (detail) {
            setRating(Number((detail as any).claim_rating || 0));
            setFeedbacks((detail as any).claim_feedbacks || '');
        }
    }, [detail]);

    const feedbackMutation = useMutation({
        mutationFn: async () => {
            const { eid, ...rest } = detail as any;
            const payload = {
                ...rest,
                employeeid: eid || (detail as any).employeeid || (detail as any).employee_id,
                claim_rating: rating,
                claim_feedbacks: feedbacks,
            };

            // Ensure selectedApprovers use employeeid instead of eid
            if (payload.selectedApprovers && Array.isArray(payload.selectedApprovers)) {
                payload.selectedApprovers = payload.selectedApprovers.map((app: any) => ({
                    ...app,
                    employeeid: app.employeeid || app.eid || '',
                }));
            }

            await apiClient.post(`${SAVE_REQUEST}/${id}`, payload);
        },
        onSuccess: () => {
            toast.success('Feedbacks sent successfully');
            queryClient.invalidateQueries({ queryKey: ['requestDetail', id] });
        },
        onError: () => toast.error('Failed to send feedbacks'),
    });

    const isPending = String(detail?.requeststatus || '') === RequestStatus.Pending;
    const isApproved = String(detail?.requeststatus || '') === RequestStatus.Approved;
    const isRejected = String(detail?.requeststatus || '') === RequestStatus.Rejected;
    const hasApprovedStep = detail?.approvaltype === '1' && detail.stepLevelData?.some(s => s.status === 2);

    // Restrictions for Claim requests
    const typeDesc = (detail?.requesttypedesc || '').toLowerCase();
    const isStrictClaim = typeDesc.includes('claim');
    const hasPositiveMax = Number(detail?.max_amount || 0) > 0;
    const pStatusVal = String((detail as any)?.processstatus || '').toLowerCase();
    
    // Restricted codes: '1' (EB Team), '2' (Third Party), '3' (Completed)
    const isRestrictedProcess = isStrictClaim && hasPositiveMax && (
        ['1', '2', '3'].includes(pStatusVal) ||
        pStatusVal.includes('eb team') ||
        pStatusVal.includes('third party') ||
        pStatusVal.includes('completed')
    );

    // For attendance requests: only allow edit/delete when status is pending (1)
    const attendanceStatus = String((detail as any)?.requeststatus || '');
    const isAttendanceTerminal = isAttendance && (attendanceStatus === '2' || attendanceStatus === '3');

    const canEdit = isPending && !isRestrictedProcess && !isAttendanceTerminal;
    const canDelete = isPending && !hasApprovedStep && !isRestrictedProcess && !isAttendanceTerminal;

    if (isLoading) {
        return (
            <div className={styles['request-detail']}>
                <div className={styles['request-detail__card']}>
                    <div className={styles['request-detail__body']}>
                        <div className={styles['request-detail__skeleton']}>
                            <div className={styles['request-detail__skeleton-bar']} style={{ width: '60%' }} />
                            <div className={styles['request-detail__skeleton-bar']} style={{ width: '80%' }} />
                            <div className={styles['request-detail__skeleton-bar']} style={{ width: '40%' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!detail) {
        return (
            <div className={styles['request-detail']}>
                <button className={styles['request-detail__back']} onClick={() => isAttendance ? navigate('/attendancerequest') : navigate('/requests')}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="empty-state">
                    <FileText size={48} className="empty-state__icon" />
                    <h3 className="empty-state__title">Request not found</h3>
                </div>
            </div>
        );
    }

    const { Icon, bg, color } = getTypeVisual(detail.requesttypedesc);

    // Resolve currency syskey → readable name
    const currencyName = currencyList.find(c => c.syskey === detail.currencytype)?.description
        || (detail as any).currencytypedesc
        || detail.currencytype
        || '';

    const leaveReasonText = isLeave && (detail as any).leavereason
        ? leaveReasonsList.find(r => r.syskey === (detail as any).leavereason)?.description || (detail as any).leavereason
        : '';

    const rawProcessStatus = (detail as any).processstatus || (detail as any).claimProcessStatus || '';
    const processStatusDesc = CLAIM_PROCESS_STATUS_OPTIONS.find(opt => opt.code === String(rawProcessStatus))?.description || rawProcessStatus;

    // Resolve attendancereason syskey -> label (e.g. "NON" or "Forgotten")
    const attendanceReasonKey = String((detail as any)?.attendancereason || '');
    const resolvedAttendanceReason = attendanceReasonsList.find((r: any) => r.syskey === attendanceReasonKey)?.label
        || (detail as any)?.attendancereasondesc
        || (attendanceReasonKey === '1' ? 'NON' : attendanceReasonKey === '2' ? 'Forgotten' : attendanceReasonKey) || '';

    return (
        <div className={styles['request-detail']}>
            <button className={styles['request-detail__back']} onClick={() => isAttendance ? navigate('/attendancerequest') : navigate('/requests')}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className={styles['request-detail__card']}>
                {/* ── Header ── */}
                <div className={styles['request-detail__header']}>
                    <div className={styles['request-detail__header-left']}>
                        <div className={styles['request-detail__icon']} style={{ background: bg, color }}>
                            <Icon size={24} />
                        </div>
                        <div className={styles['request-detail__title-group']}>
                            <h2>{detail.requesttypedesc}{detail.requestsubtypedesc ? ` — ${detail.requestsubtypedesc}` : ''}</h2>
                            {(detail.refno || listRefIndex || detail.eid) && (
                                <span>
                                    {detail.refno ? `Ref #${detail.refno}` : (listRefIndex ? `#${listRefIndex}` : '')}
                                    {detail.eid ? ` · ${detail.eid}` : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <StatusBadge status={String(detail.requeststatus)} />
                </div>



                {/* ── Body ── */}
                <div className={styles['request-detail__body']}>
                    {/* Core dates */}
                    <div className={styles['request-detail__section']}>
                        <h4 className={styles['request-detail__section-title']}>Date &amp; Time</h4>
                        <div className={styles['request-detail__grid']}>
                            {(detail.startdate || detail.date) && <Field label="Start Date" value={displayDate(detail.startdate || detail.date)} />}
                            {detail.enddate && <Field label="End Date" value={displayDate(detail.enddate)} />}
                            {(detail.starttime || detail.time) && <Field label="Start Time" value={detail.starttime || detail.time} />}
                            {detail.endtime && <Field label="End Time" value={detail.endtime} />}
                            {detail.duration && <Field label="Duration" value={detail.duration} />}
                            {(flavor === 'prd' || flavor === 'mpt') && leaveReasonText && <Field label="Leave Reason" value={leaveReasonText} />}
                            {detail.selectday && <Field label="Select Day" value={detail.selectday} />}
                            {detail.days && <Field label="Days" value={String(detail.days)} />}
                            {detail.hour && <Field label="Hours" value={detail.hour} />}
                            {detail.otday && <Field label="OT Day" value={detail.otday} />}
                        </div>
                    </div>

                    {/* Transportation — triggers on toplace, isgroup or legacy pickupplace */}
                    {(detail.toplace || detail.isgroup !== undefined || detail.pickupplace || detail.requesttypedesc?.toLowerCase().includes('transport')) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Transportation</h4>
                            <div className={styles['request-detail__grid']}>
                                {/* Group / Individual  */}
                                <Field
                                    label="Request For"
                                    value={detail.isgroup === 0 ? 'Group' : detail.isgroup === 1 ? 'Individual' : undefined}
                                />
                                {detail.triptypedesc && <Field label="Trip Type" value={detail.triptypedesc} />}
                                {detail.toplace && <Field label="Destination" value={detail.toplace} />}
                                {/* Legacy fields */}
                                {detail.pickupplace && <Field label="Pick-up Place" value={detail.pickupplace} />}
                                {detail.dropoffplace && <Field label="Drop-off Place" value={detail.dropoffplace} />}
                                {detail.isgoing && <Field label="Arrival Time" value={detail.arrivaltime} />}
                                {detail.isreturn && <Field label="Return Time" value={detail.returntime} />}
                            </div>
                            {/* Group members — shown when Group type */}
                            {detail.isgroup === 0 && memberList.length > 0 && (
                                <div style={{ marginTop: 'var(--space-3)' }}>
                                    <span className={styles['request-detail__section-title']}>Group Members</span>
                                    <div className={styles['request-detail__approver-list']}>
                                        {memberList.map((m: Approver) => (
                                            <span key={m.syskey} className={styles['request-detail__approver-chip']}>
                                                <span className={styles['request-detail__approver-avatar']}>
                                                    {m.name?.charAt(0).toUpperCase() || '?'}
                                                </span>
                                                {m.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {detail.requesttypedesc?.toLowerCase().includes('travel') && (() => {
                        // Resolve UUIDs → readable names using lookup lists
                        const modeNames = Array.isArray(detail.modeoftravel)
                            ? detail.modeoftravel.map((id: string) =>
                                travelTypeList.find(t => t.syskey === id)?.description || id
                              ).join(', ')
                            : String(detail.modeoftravel || '');

                        const vehicleNames = Array.isArray(detail.vehicleuse)
                            ? detail.vehicleuse.map((id: string) =>
                                vehicleUseList.find(v => v.syskey === id)?.description || id
                              ).join(', ')
                            : String(detail.vehicleuse || '');

                        const productName = productList.find(p => p.syskey === detail.product)?.description
                            || (detail as any).productdesc || detail.product || '';

                        const projectName = projectList.find(p => p.syskey === detail.project)?.description
                            || (detail as any).projectdesc || detail.project || '';

                        return (
                            <div className={styles['request-detail__section']}>
                                <h4 className={styles['request-detail__section-title']}>Travel</h4>
                                <div className={styles['request-detail__grid']}>
                                    {detail.departuredate && <Field label="Departure Date" value={displayDate(detail.departuredate)} />}
                                    {detail.arrivaldate && <Field label="Arrival Date" value={displayDate(detail.arrivaldate)} />}
                                    {detail.departuretime && <Field label="Departure Time" value={detail.departuretime} />}
                                    {detail.plannedreturn && <Field label="Planned Return" value={detail.plannedreturn} />}
                                    {detail.travelpurpose && (
                                        <div className={styles['new-request__full']} style={{ gridColumn: '1 / -1', marginTop: 'var(--space-2)' }}>
                                            <Field label="Travel Purpose" value={detail.travelpurpose} />
                                        </div>
                                    )}
                                    {detail.days && <Field label="Days" value={String(detail.days)} />}
                                    {modeNames && <Field label="Mode of Travel" value={modeNames} />}
                                    {vehicleNames && <Field label="Vehicle Use" value={vehicleNames} />}
                                    {productName && <Field label="Product" value={productName} />}
                                    {projectName && <Field label="Project" value={projectName} />}
                                    {(detail.estimatedbudget || 0) > 0 && <Field label="Estimated Budget" value={Number(detail.estimatedbudget).toLocaleString()} />}
                                    {(detail as any).extendDate && <Field label="Extend Date" value={displayDate((detail as any).extendDate)} />}
                                    {(detail as any).extendBudget > 0 && <Field label="Extend Budget" value={Number((detail as any).extendBudget).toLocaleString()} />}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Reservation fields */}
                    {(detail.rooms || detail.roomsdesc) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Reservation</h4>
                            <div className={styles['request-detail__grid']}>
                                <Field label="Room" value={detail.roomsdesc || detail.rooms} />
                                <Field label="Max People" value={detail.maxpeople ? String(detail.maxpeople) : undefined} />
                            </div>
                        </div>
                    )}

                    {/* Overtime */}
                    {(detail.otday || detail.hour) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Overtime</h4>
                            <div className={styles['request-detail__grid']}>
                                <Field label="OT Day" value={detail.otday} />
                                <Field label="Hours" value={detail.hour} />
                            </div>
                        </div>
                    )}

                    {/* Financial */}
                    {((detail.amount || 0) > 0 || (detail.estimatedbudget || 0) > 0 || detail.remaining_balance !== undefined || detail.max_amount !== undefined) && (() => {
                        return (
                            <div className={styles['request-detail__section']}>
                                <h4 className={styles['request-detail__section-title']}>Financial</h4>
                                <div className={styles['request-detail__grid']}>
                                    {hasMaxAmount && detail.remaining_balance !== undefined && <Field label="Remaining Balance" value={Number(detail.remaining_balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} />}
                                    {hasMaxAmount && <Field label="Max Amount" value={Number(detail.max_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} />}
                                    {(detail.amount || 0) > 0 && <Field label="Amount" value={Number(detail.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} />}
                                    {currencyName && <Field label="Currency" value={currencyName} />}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Location */}
                    {detail.locationname && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Location</h4>
                            <div className={styles['request-detail__grid']}>
                                <Field label="Location" value={detail.locationname} />
                                {isAttendance && (detail as any).latitude && (detail as any).latitude !== '0.0' && (detail as any).longitude && (detail as any).longitude !== '0.0' && (
                                    <Field label="Coordinates" value={`${(detail as any).latitude}, ${(detail as any).longitude}`} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    {detail.attachment && detail.attachment.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Attachments</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                {detail.attachment.map((att: any, i: number) => {
                                    const url = typeof att === 'string' ? att : (att as any).signedURL || (att as any).url || '';
                                    const name = typeof att === 'string' ? `File ${i + 1}` : (att as any).filename || `File ${i + 1}`;
                                    return url ? (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', textDecoration: 'underline' }}>
                                            {name}
                                        </a>
                                    ) : <span key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-500)' }}>{name}</span>;
                                })}
                            </div>
                        </div>
                    )}

                    {/* Requester Remark */}
                    {(detail.remark || (detail as any).reason || (detail as any).description || (isAttendance && resolvedAttendanceReason)) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Remarks</h4>
                            <div className={styles['request-detail__remark-container']}>
                                {(detail.remark || (detail as any).reason || (detail as any).description) && (
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-700)', lineHeight: 'var(--leading-relaxed)', whiteSpace: 'pre-wrap' }}>
                                        {detail.remark || (detail as any).reason || (detail as any).description}
                                    </p>
                                )}
                                {isAttendance && resolvedAttendanceReason && (
                                    <div className={styles['request-detail__reason-type-label']} style={{ marginTop: 8 }}>
                                        <span style={{ fontSize: '12px', color: 'var(--color-neutral-500)', fontWeight: 500 }}>Reason Type: </span>
                                        <span style={{ fontSize: '13px', color: 'var(--color-primary-600)', fontWeight: 600 }}>
                                            {resolvedAttendanceReason}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Approval Details */}
                    {((hasMaxAmount && (isPending || isApproved || isRejected)) || 
                      processStatusDesc === 'Review By EB Team' || 
                      ((isApproved || isRejected) && detail.comment)) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Approval Details</h4>
                            <div className={styles['request-detail__grid']}>
                                {/* 1. Confirmed Amount */}
                                {(isApproved || isRejected) && detail.confirmed_amount !== undefined && hasMaxAmount && (
                                    <Field label="Confirmed Amount" value={Number(detail.confirmed_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} />
                                )}

                                {/* 2. Approver Comment */}
                                {(isApproved || isRejected) && detail.comment && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <Field label="Approver Comment" value={detail.comment} />
                                    </div>
                                )}

                                {/* 3. Process Status */}
                                {((hasMaxAmount && (isPending || isApproved || isRejected)) || processStatusDesc === 'Review By EB Team') && (
                                    <Field label="Process Status" value={processStatusDesc || '-'} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Feedback Section */}
                    {isClaim && hasMaxAmount && (isApproved || isRejected) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Claim Feedback</h4>
                            <div className={styles['request-detail__feedback-box']}>
                                <div className={styles['request-detail__rating']}>
                                    <span className={styles['request-detail__field-label']}>Rating</span>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                size={24}
                                                fill={s <= rating ? '#eab308' : 'transparent'}
                                                color={s <= rating ? '#eab308' : '#cbd5e1'}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setRating(s)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <Textarea
                                        label="Your Feedbacks"
                                        value={feedbacks}
                                        onChange={(e) => setFeedbacks(e.target.value)}
                                        placeholder="Enter your feedback here..."
                                        rows={3}
                                    />
                                </div>
                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        size="sm"
                                        loading={feedbackMutation.isPending}
                                        onClick={() => feedbackMutation.mutate()}
                                    >
                                        <Send size={14} style={{ marginRight: 8 }} />
                                        Send Feedbacks
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Approved By */}
                    {detail.approvaltype !== '1' && approverList.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Approvers</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {approverList.map((a: Approver, idx: number) => (
                                    <div
                                        key={a.syskey}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            background: 'var(--color-neutral-50, #f8fafc)',
                                            border: '1px solid var(--color-neutral-100, #f1f5f9)',
                                        }}
                                    >
                                        <span style={{
                                            minWidth: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            background: 'var(--color-primary-100, #dbeafe)',
                                            color: 'var(--color-primary-700, #1d4ed8)',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <span className={styles['request-detail__approver-avatar']} style={{ flexShrink: 0 }}>
                                            {a.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-900)' }}>
                                                {a.name}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>
                                                Approver {idx + 1}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Accompanying Persons */}
                    {accompanyPersonList.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Accompanying Persons</h4>
                            <div className={styles['request-detail__approver-list']}>
                                {accompanyPersonList.map((p: Approver) => (
                                    <span key={p.syskey} className={styles['request-detail__approver-chip']}>
                                        <span className={styles['request-detail__approver-avatar']}>
                                            {p.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        {p.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inline Workflow Form */}
                    {detail.approvaltype === '1' && detail.stepLevelData && detail.stepLevelData.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <ApprovalWorkflowModal steps={detail.stepLevelData} />
                        </div>
                    )}
                </div>

                {/* ── Actions ── */}
                {(canDelete || canEdit) && (
                    <div className={styles['request-detail__actions']}>
                        {canEdit && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate(isAttendance ? `/attendancerequest/edit/${id}` : `/requests/edit/${id}`, { state: { item: detailData?.detail, refIndex: listRefIndex } })}
                            >
                                <Edit size={14} />
                                Edit
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="danger"
                                size="sm"
                                loading={deleteMutation.isPending}
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <Trash2 size={14} />
                                Delete
                            </Button>
                        )}
                    </div>
                )}
            </div>



            <ConfirmModal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => { deleteMutation.mutate(); setShowDeleteModal(false); }}
                title="Delete Request"
                message="This will permanently delete this request. This action cannot be undone."
                confirmLabel="Delete Request"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
