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
    Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { RequestStatus } from '../../types/models';
import type { RequestDetailModel, Approver } from '../../types/models';
import apiClient from '../../lib/api-client';
import { GET_REQUEST_DETAIL, DELETE_REQUEST } from '../../config/api-routes';
import styles from './RequestDetailPage.module.css';

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
    const queryClient = useQueryClient();

    // Mirrors mobile RequestDetail.fromJson — reads datalist + 4 separate person lists
    const { data: detailData, isLoading } = useQuery<{
        detail: RequestDetailModel;
        approverList: Approver[];
        memberList: Approver[];
        accompanyPersonList: Approver[];
        selectedHandovers: Approver[];
    }>({
        queryKey: ['requestDetail', id],
        queryFn: async () => {
            const res = await apiClient.post(GET_REQUEST_DETAIL, { syskey: id });
            const parseList = (key: string): Approver[] =>
                (res.data?.[key] as Approver[] | undefined) || [];
            return {
                detail: res.data?.datalist || {},
                approverList: parseList('approverList'),
                memberList: parseList('memberList'),
                accompanyPersonList: parseList('accompanyPersonList'),
                selectedHandovers: parseList('selectedHandovers'),
            };
        },
        enabled: !!id,
    });

    const detail = detailData?.detail;
    const approverList = detailData?.approverList || [];
    const memberList = detailData?.memberList || [];
    const accompanyPersonList = detailData?.accompanyPersonList || [];

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
                <button className={styles['request-detail__back']} onClick={() => navigate('/requests')}>
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
    const isPending = String(detail.requeststatus) === RequestStatus.Pending;

    return (
        <div className={styles['request-detail']}>
            <button className={styles['request-detail__back']} onClick={() => navigate('/requests')}>
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
                            <span>
                                {detail.refno ? `Ref #${detail.refno}` : ''}
                                {detail.eid ? ` · ${detail.eid}` : ''}
                            </span>
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
                            {(detail.startdate || detail.date) && <Field label="Start Date" value={detail.startdate || detail.date} />}
                            {detail.enddate && <Field label="End Date" value={detail.enddate} />}
                            {(detail.starttime || detail.time) && <Field label="Start Time" value={detail.starttime || detail.time} />}
                            {detail.endtime && <Field label="End Time" value={detail.endtime} />}
                            {detail.duration && <Field label="Duration" value={detail.duration} />}
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
                                        {memberList.map((m) => (
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

                    {/* Travel fields */}
                    {(detail.fromplace || detail.toplace) && detail.requesttypedesc?.toLowerCase().includes('travel') && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Travel</h4>
                            <div className={styles['request-detail__grid']}>
                                {detail.fromplace && <Field label="From" value={detail.fromplace} />}
                                {detail.toplace && <Field label="To" value={detail.toplace} />}
                                {detail.departuredate && <Field label="Departure Date" value={detail.departuredate} />}
                                {detail.arrivaldate && <Field label="Arrival Date" value={detail.arrivaldate} />}
                                {detail.days && <Field label="Days" value={String(detail.days)} />}
                                {detail.modeoftravel?.length > 0 && <Field label="Mode of Travel" value={detail.modeoftravel?.join(', ')} />}
                                {detail.vehicleuse?.length > 0 && <Field label="Vehicle Use" value={detail.vehicleuse?.join(', ')} />}
                                {detail.product && <Field label="Product" value={detail.product} />}
                                {detail.project && <Field label="Project" value={detail.project} />}
                                {detail.estimatedbudget > 0 && <Field label="Estimated Budget" value={String(detail.estimatedbudget)} />}
                            </div>
                        </div>
                    )}

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
                    {(detail.amount > 0 || detail.estimatedbudget > 0) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Financial</h4>
                            <div className={styles['request-detail__grid']}>
                                {detail.amount > 0 && <Field label="Amount" value={String(detail.amount)} />}
                                {detail.currencytype && <Field label="Currency" value={detail.currencytype} />}
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    {detail.locationname && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Location</h4>
                            <div className={styles['request-detail__grid']}>
                                <Field label="Location" value={detail.locationname} />
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    {detail.attachment && detail.attachment.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Attachments</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                {detail.attachment.map((att, i) => {
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

                    {/* Remarks */}
                    {(detail.remark || detail.comment) && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Remarks</h4>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-700)', lineHeight: 'var(--leading-relaxed)' }}>
                                {detail.remark || detail.comment}
                            </p>
                        </div>
                    )}

                    {/* Approvers */}
                    {approverList.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Approvers</h4>
                            <div className={styles['request-detail__approver-list']}>
                                {approverList.map((a) => (
                                    <span key={a.syskey} className={styles['request-detail__approver-chip']}>
                                        <span className={styles['request-detail__approver-avatar']}>
                                            {a.name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                        {a.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Accompanying Persons */}
                    {accompanyPersonList.length > 0 && (
                        <div className={styles['request-detail__section']}>
                            <h4 className={styles['request-detail__section-title']}>Accompanying Persons</h4>
                            <div className={styles['request-detail__approver-list']}>
                                {accompanyPersonList.map((p) => (
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
                </div>

                {/* ── Actions ── */}
                {isPending && (
                    <div className={styles['request-detail__actions']}>
                        <Button
                            variant="danger"
                            size="sm"
                            loading={deleteMutation.isPending}
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this request?')) {
                                    deleteMutation.mutate();
                                }
                            }}
                        >
                            <Trash2 size={14} />
                            Delete
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
