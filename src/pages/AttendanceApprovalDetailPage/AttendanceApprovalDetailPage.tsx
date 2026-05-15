import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, MapPin } from 'lucide-react';
import { Button } from '../../components/ui';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import {
    GET_ATTENDANCE_APPROVAL_LIST,
    SAVE_ATTENDANCE_APPROVAL,
    GET_ATTENDANCE_REASON,
} from '../../config/api-routes';
import styles from './AttendanceApprovalDetailPage.module.css';

/* ── Helpers ── */
function displayDate(raw?: string | unknown): string {
    const s = String(raw || '');
    if (s.length < 8 || s === 'undefined') return s;
    return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className={styles['field']}>
            <span className={styles['field-label']}>{label}</span>
            <span className={`${styles['field-value']} ${!value ? styles['field-value--empty'] : ''}`}>
                {value || '—'}
            </span>
        </div>
    );
}

const PROCESS_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    '1': { label: 'Pending',  color: '#b45309', bg: '#fef3c7' },
    '2': { label: 'Approved', color: '#15803d', bg: '#dcfce7' },
    '3': { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
};

/* ══════════════════════════════════════════════════════════════ */

export default function AttendanceApprovalDetailPage() {
    const { id: syskey, type: urlType } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { userId, domain } = useAuthStore();

    // Try to find the item in the list cache to avoid a network request
    const stateItem = useMemo(() => {
        // 1. Try router state first
        if (location.state?.item) return location.state.item;

        // 2. Try to find in the approvals list cache
        const allApprovalsQueries = queryClient.getQueryCache().findAll({ queryKey: ['approvals'] });
        for (const query of allApprovalsQueries) {
            const data = query.state.data as any;
            // The data is usually an array of items
            if (Array.isArray(data)) {
                const found = data.find((it: any) => String(it.syskey) === syskey);
                if (found) return found;
            }
        }
        return undefined;
    }, [queryClient, location.state, syskey]);

    const [selectedReason, setSelectedReason] = useState<string>(() => {
        const val = stateItem?.attendancereason ?? stateItem?.attendancereasontype;
        return val ? String(val) : '';
    });

    // ── Attendance Reasons ──
    const { data: attendanceReasons = [] } = useQuery({
        queryKey: ['attendance-reasons', userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(GET_ATTENDANCE_REASON, { userid: userId, domain });
            return res.data?.data || [];
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    /* ── Data Fetching ── */
    const { data: itemData, isLoading } = useQuery<Record<string, any>>({
        queryKey: ['att-approval-detail', syskey],
        queryFn: async () => {
            // If we already have the state item, we could technically skip this, 
            // but fetching ensures the most up-to-date status/details.
            const res = await mainClient.post(GET_ATTENDANCE_APPROVAL_LIST, { syskey });
            const list = res.data?.data || res.data?.datalist || (Array.isArray(res.data) ? res.data : []);
            
            // Robust lookup: check syskey as string (UUIDs can vary in case)
            const found = list.find((it: any) => 
                it.syskey && syskey && String(it.syskey).trim().toLowerCase() === String(syskey).trim().toLowerCase()
            ) || list[0];

            if (!found) throw new Error('Attendance approval not found');
            return found;
        },
        enabled: !!syskey,
        initialData: stateItem, // Use passed data immediately
        staleTime: stateItem ? 1000 * 60 * 5 : 0, // If we have data, keep it fresh for 5 mins
    });

    // Final item to render
    const item = itemData || stateItem;

    // Sync reason from loaded record
    useEffect(() => {
        const val = item?.attendancereason ?? item?.attendancereasontype;
        if (val !== undefined && val !== null && val !== '') {
            const valStr = String(val).trim().toLowerCase();
            // Find matching reason in the list to be safe
            const match = (attendanceReasons as any[]).find(
                r => String(r.syskey).trim().toLowerCase() === valStr
            );
            if (match) {
                setSelectedReason(String(match.syskey));
            } else if (!selectedReason) {
                // Only set if not already set by user
                setSelectedReason(String(val));
            }
        }
    }, [item, attendanceReasons, selectedReason]);

    // ── Approve / Reject ──
    const actionMutation = useMutation({
        mutationFn: async (action: 'approve' | 'reject') => {
            const body = {
                syskey: item.syskey,
                type: String(urlType || item.requesttype || item.atttype || '1'),
                status: action === 'approve' ? '2' : '3',
                date: item.date,
                attendancereason: selectedReason || String(item.attendancereason || ''),
                userid: userId,
                domain: domain,
            };
            const res = await mainClient.post(SAVE_ATTENDANCE_APPROVAL, body);
            if (
                res.data?.status !== 201 &&
                res.data?.statuscode !== 200 &&
                res.data?.message_code !== '203'
            ) {
                throw new Error(res.data?.message || t('common.error'));
            }
            return res.data;
        },
        onSuccess: (_data, status) => {
            toast.success(status === 'approve' ? 'Request approved successfully' : 'Request rejected');
            queryClient.invalidateQueries({ queryKey: ['approvals'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['att-approval-detail', syskey] });
            navigate('/attendanceapproval');
        },
        onError: (err: any) => toast.error(err.message || t('common.error')),
    });

    /* ── Loading ── */
    // Initialize reason when data loads
    useEffect(() => {
        if (item && item.attendancereason !== undefined && item.attendancereason !== null && !selectedReason) {
            const reasonVal = String(item.attendancereason);
            // Only set if it's a non-empty value
            if (reasonVal && reasonVal !== 'null' && reasonVal !== 'undefined') {
                setSelectedReason(reasonVal);
            }
        }
    }, [item, selectedReason]);

    if (isLoading) {
        return (
            <div className={styles['page']}>
                <div className={styles['card']}>
                    <div className={styles['skeleton']}>
                        <div className={styles['skeleton-bar']} style={{ width: '60%' }} />
                        <div className={styles['skeleton-bar']} style={{ width: '80%' }} />
                        <div className={styles['skeleton-bar']} style={{ width: '40%' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className={styles['page']}>
                <button className={styles['back']} onClick={() => navigate('/attendanceapproval')}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className={styles['card']}>
                    <div className={styles['empty']}>
                        <FileText size={48} />
                        <h3>Attendance approval not found</h3>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Derived values ── */
    // Attendance API status (int): 1 = Pending, 2 = Approved, 3 = Rejected
    const statusCode = (() => {
        const s = item.status ?? item.requeststatus;
        if (s === 1 || s === '1') return '1';
        if (s === 2 || s === '2') return '2';
        if (s === 3 || s === '3') return '3';
        return null; // Not 1, 2, or 3
    })();
    const isPending  = !statusCode || statusCode === '1';
    const isApproved = statusCode === '2';
    const isRejected = statusCode === '3';

    const fallbackLabel = (urlType === '1' || String(item.requesttype) === '1') ? 'Remote Timein' : 
                          (urlType === '2' || String(item.requesttype) === '2') ? 'Backdate Timein' : 'Attendance';
    const attTypeLabel = String(item.approvetype || fallbackLabel).replace(/Timein/i, item.type || 'Time In');

    const reqName = String(item.name || item.employee_id || 'Employee');

    const resolvedReasonLabel = (() => {
        if (!selectedReason && !item.attendancereason) return null;
        const key = selectedReason || String(item.attendancereason);
        const found = (attendanceReasons as any[]).find((r: any) => String(r.syskey) === key);
        return found?.description || found?.code || key;
    })();

    /* ── Render ── */
    return (
        <div className={styles['page']}>
            <button className={styles['back']} onClick={() => navigate('/attendanceapproval')}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className={styles['card']}>
                {/* ── Header ── */}
                <div className={styles['header']}>
                    <div className={styles['header-left']}>
                        <div className={styles['icon']}>
                            <Clock size={24} />
                        </div>
                        <div className={styles['title-group']}>
                            <h2>{attTypeLabel}</h2>
                            <span>
                                {item.employee_id ? `${item.employee_id}` : ''}
                            </span>
                        </div>
                    </div>
                    {/* Upper corner status badge */}
                    {statusCode && PROCESS_STATUS_MAP[statusCode] && (
                        (() => {
                            const config = PROCESS_STATUS_MAP[statusCode];
                            return (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        borderRadius: '99px',
                                        color: config.color,
                                        background: config.bg,
                                        border: `1px solid ${config.color}22`,
                                    }}
                                >
                                    <span 
                                        style={{ 
                                            width: '6px', 
                                            height: '6px', 
                                            borderRadius: '50%', 
                                            background: config.color 
                                        }} 
                                    />
                                    {config.label}
                                </span>
                            );
                        })()
                    )}
                </div>

                {/* ── Body ── */}
                <div className={styles['body']}>

                    {/* Requested By */}
                    <div>
                        <h4 className={styles['section-title']}>Requested By</h4>
                        <div className={styles['requester']}>
                            <div className={styles['requester-avatar']}>
                                {reqName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className={styles['requester-name']}>{reqName}</div>
                                <div className={styles['requester-meta']}>
                                    {String(item.employee_id || '')}
                                    {item.department ? ` · ${item.department}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div>
                        <h4 className={styles['section-title']}>Date & Time</h4>
                        <div className={styles['grid']}>
                            <Field label="Date"       value={displayDate(item.date)} />
                            <Field label="Time"       value={String(item.time || '')} />
                            <Field label="Attendance Type" value={attTypeLabel} />
                        </div>
                    </div>

                    {/* Location */}
                    {(item.location || (item.latitude && item.latitude !== '0.0')) && (
                        <div>
                            <h4 className={styles['section-title']}>
                                <MapPin size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                Location
                            </h4>
                            <div className={styles['grid']}>
                                <Field label="Location" value={String(item.location || '')} />
                                {item.latitude && item.latitude !== '0.0' && item.longitude && item.longitude !== '0.0' && (
                                    <Field label="Coordinates" value={`${item.latitude}, ${item.longitude}`} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Description / Remark */}
                    {item.description && (
                        <div>
                            <h4 className={styles['section-title']}>Description</h4>
                            <p className={styles['remark']}>{String(item.description)}</p>
                        </div>
                    )}

                    {/* Attendance Reason Type */}
                    <div>
                        {/* Approved by */}
                        {item.approvedby && (
                            <div className={styles['grid']} style={{ marginBottom: 14 }}>
                                <Field
                                    label="Approved By"
                                    value={`${item.approvedby}${item.approveddate ? ` (${displayDate(item.approveddate)})` : ''}`}
                                />
                            </div>
                        )}

                        {/* Reason Type dropdown */}
                        {attendanceReasons.length > 0 && (
                            <div>
                                <label htmlFor="attReasonType" className={styles['select-label']}>
                                    Attendance Reason Type
                                    {resolvedReasonLabel && (
                                        <span style={{ fontWeight: 400, color: 'var(--color-primary-600)', marginLeft: 8 }}>
                                            ({resolvedReasonLabel})
                                        </span>
                                    )}
                                </label>
                                <select
                                    id="attReasonType"
                                    className={styles['select']}
                                    value={selectedReason}
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    disabled={isApproved}
                                >
                                    {(attendanceReasons as any[]).map((r: any) => (
                                        <option key={r.syskey} value={String(r.syskey)}>
                                            {r.description || r.code || r.syskey}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Action Bar ── */}
                {(isPending || isApproved || isRejected) && (
                <div className={styles['actions']}>
                    <div className={styles['action-row']}>
                        <Button
                            variant="success"
                            onClick={() => actionMutation.mutate('approve')}
                            loading={actionMutation.isPending && actionMutation.variables === 'approve'}
                            disabled={isApproved}
                        >
                            <CheckCircle size={16} />
                            {t('request.approve')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => actionMutation.mutate('reject')}
                            loading={actionMutation.isPending && actionMutation.variables === 'reject'}
                            disabled={isRejected}
                        >
                            <XCircle size={16} />
                            {t('request.reject')}
                        </Button>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
