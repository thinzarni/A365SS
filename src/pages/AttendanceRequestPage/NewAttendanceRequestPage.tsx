import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { Textarea } from '../../components/ui/Input/Input';
import Select from '../../components/ui/Select/Select';
import EditableSelect from '../../components/ui/Select/EditableSelect';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import { useAuthStore } from '../../stores/auth-store';
import mainClient from '../../lib/main-client';
import { SAVE_ATTENDANCE_REQ, TEAM_LIST, GET_ATTENDANCE_REASON, GET_ATTENDANCE_REQ_DETAIL, DELETE_ATTENDANCE_REQ, LOCATION_LIST } from '../../config/api-routes';
import { RequestStatus } from '../../types/models';
import type { TeamMember } from '../../types/models';
import styles from './AttendanceRequestPage.module.css';
import '../../styles/pages.css';

/* ── Date/time default helpers ── */
function todayStr(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function nowTimeStr(): string {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

export default function NewAttendanceRequestPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { userId, user, domain } = useAuthStore();
    const queryClient = useQueryClient();
    const isEdit = !!id;
    const routerLocation = useLocation();

    // Item data passed from the list page via router state (optional)
    const stateItem = (routerLocation.state as any)?.item || null;
    const refIndex = (routerLocation.state as any)?.refIndex || null;

    // ── Detail Data Query (if id exists but state is empty) ──
    const { data: fetchedDetail, isLoading: isDetailLoading } = useQuery({
        queryKey: ['attendance-detail', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await mainClient.post(`${GET_ATTENDANCE_REQ_DETAIL}/${id}`, {
                userid: userId || '',
                domain: domain || 'dev'
            });
            return res.data?.data || res.data?.datalist || null;
        },
        enabled: !!id && !stateItem,
    });

    const existingDetail = stateItem || fetchedDetail;
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // ── Status & Mode Logic ──
    // Status 1 = Pending, 2 = Approved, 3 = Rejected
    const currentStatus = String(existingDetail?.status || existingDetail?.requeststatus || '1');
    const isViewMode = isEdit && currentStatus !== RequestStatus.Pending;
    const canDelete = isEdit && currentStatus === RequestStatus.Pending;

    // ── Team Data Query ──
    const { data: members = [] } = useQuery<TeamMember[]>({
        queryKey: ['team-members', userId],
        queryFn: async () => {
            const res = await mainClient.post(TEAM_LIST, {
                userid: userId,
            });
            // Try all common response paths
            const raw = res.data?.data || res.data?.datalist || res.data;
            if (!raw) return [];

            const juniorsRaw = Array.isArray(raw.juniorEmployees) ? raw.juniorEmployees : [];
            const seniorsRaw = Array.isArray(raw.seniorEmployees) ? raw.seniorEmployees : [];
            const teamMembersRaw = Array.isArray(raw.teamMembers) ? raw.teamMembers : [];

            const allRaw = [...juniorsRaw, ...seniorsRaw, ...teamMembersRaw];

            // Deduplicate by syskey
            const seen = new Set();
            const uniqueRaw = allRaw.filter(m => {
                const k = m.syskey || m.employee_syskey;
                if (!k || seen.has(k)) return false;
                seen.add(k);
                return true;
            });

            return uniqueRaw.map((m: any) => ({
                syskey: String(m.syskey ?? m.employee_syskey ?? ''),
                userName: String(m.userName ?? m.username ?? m.employee_name ?? m.name ?? ''),
                employeeId: String(m.employee_id ?? m.employeeId ?? m.employeeid ?? ''),
                profile: m.profile ? String(m.profile) : null,
                userid: String(m.employee_userid ?? m.userid ?? m.user_id ?? m.email ?? ''),
                rank: String(m.rank ?? ''),
                department: String(m.department ?? ''),
                division: String(m.division ?? ''),
                teamId: String(m.teamId ?? m.teamid ?? m.team_id ?? ''),
                level: (juniorsRaw.some((j: any) => j.syskey === m.syskey) ? 'junior' : 'senior') as 'junior' | 'senior',
                priority: String(m.priority ?? '0'),
                role: m.role ? String(m.role) : null,
                type: m.type ? String(m.type) : null,
                hasJunior: Boolean(m.hasJunior ?? m.hasjunior ?? false),
                workingDays: '0', timeInCount: '0', timeOutCount: '0', activityCount: '0', leaveCount: '0',
                requiredWorkDays: '0', todayTimeInCount: '0', todayTimeOutCount: '0', todayIsLeave: '0',
                leaveStatus: 0, lastRecordTypeName: 0, timeInTime: '', timeOutTime: '', key: ''
            }));
        },
        enabled: !!userId,
    });

    // ── Attendance Reasons Query ──
    const { data: reasonOptionsRaw = [] } = useQuery({
        queryKey: ['attendance-reasons', userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(GET_ATTENDANCE_REASON, {
                userid: userId,
                domain: domain,
            });
            const raw = res.data?.data || [];
            return raw.map((r: any) => ({
                value: String(r.syskey),
                label: r.description || r.code || '',
            }));
        },
        enabled: !!userId,
    });

    // ── Registered Locations Query ──
    const { data: registeredLocations = [], isLoading: isLocationsLoading } = useQuery({
        queryKey: ['location-list', userId, domain],
        queryFn: async () => {
            const res = await mainClient.post(LOCATION_LIST, {
                userid: userId,
                domain: domain,
            });
            return res.data?.data || [];
        },
        enabled: !!userId,
    });

    const locationOptions = useMemo(() => {
        return registeredLocations.map((loc: any) => ({
            value: String(loc.syskey),
            label: loc.description || loc.name || '',
            lat: String(loc.latitude || '0.0'),
            long: String(loc.longitude || '0.0')
        }));
    }, [registeredLocations]);

    // Use static NON/Forgotten when API returns empty
    const reasonOptions = reasonOptionsRaw.length > 0 ? reasonOptionsRaw : [
        { value: '1', label: 'NON' },
        { value: '2', label: 'Forgotten' },
    ];

    // No extra API call needed — data comes from router state

    // ── State ──
    const [selectedMemberSyskey, setSelectedMemberSyskey] = useState<string>('__SELF__');
    const [type, setType] = useState('601'); // 601=Time In, 602=Time Out
    const [date, setDate] = useState(todayStr());
    const [intime, setIntime] = useState(nowTimeStr());
    const [outtime, setOuttime] = useState(nowTimeStr());
    const [location, setLocation] = useState('');
    const [reason, setReason] = useState('');
    const [requestType, setRequestType] = useState('1'); // 1=Remote, 2=Backdate
    const [reasonType, setReasonType] = useState('1');  // syskey from reasonOptions
    const [lat, setLat] = useState('0.0');
    const [long, setLong] = useState('0.0');
    const [isWaitingLocation, setIsWaitingLocation] = useState(false);
    const [selectedLocationSyskey, setSelectedLocationSyskey] = useState<string>('');


    const toApiDate = (d: string) => d ? d.replace(/-/g, '') : '';
    const toApi12hTime = (t: string) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
    };

    const employeeOptions = useMemo(() => {
        const options = [
            { value: '__SELF__', label: `Myself (${user?.name})` }
        ];
        members.filter(m => {
            if (m.level !== 'junior') return false;

            const t = (m.type || '').toLowerCase();
            if (t === 'reporting officer' || !t) return true;
            if (t === 'attendance supervisor') return true;

            return false;
        }).forEach(m => {
            options.push({ value: m.syskey, label: `${m.userName} (${m.employeeId})` });
        });
        return options;
    }, [user, members]);

    useEffect(() => {
        if (selectedMemberSyskey !== '__SELF__' && !employeeOptions.some(o => o.value === selectedMemberSyskey)) {
            setSelectedMemberSyskey('__SELF__');
        }
    }, [employeeOptions, selectedMemberSyskey]);

    const handleRefreshLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsWaitingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLat(latitude.toFixed(6));
                setLong(longitude.toFixed(6));

                // 1. Try to match with registered locations (Offices)
                let matchedLocationName = '';
                let matchedSyskey = '';

                if (locationOptions.length > 0) {
                    for (const loc of locationOptions) {
                        const locLat = parseFloat(loc.lat || '0');
                        const locLong = parseFloat(loc.long || '0');
                        const dist = Math.sqrt(Math.pow(latitude - locLat, 2) + Math.pow(longitude - locLong, 2));
                        
                        if (dist < 0.001) { // Within ~100m
                            matchedLocationName = loc.label;
                            matchedSyskey = loc.value;
                            break;
                        }
                    }
                }

                if (matchedLocationName) {
                    setLocation(matchedLocationName);
                    setSelectedLocationSyskey(matchedSyskey);
                    setIsWaitingLocation(false);
                    toast.success('Office location detected');
                } else {
                    // 2. Try reverse geocoding for street name
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                            headers: { 'Accept-Language': 'en' }
                        });
                        const data = await response.json();
                        
                        if (data && data.address) {
                            const addr = data.address;
                            // Prefer street name (road) and suburb/neighborhood
                            const components = [
                                addr.road || addr.pedestrian || addr.path,
                                addr.suburb || addr.neighbourhood || addr.village,
                                addr.city || addr.town || addr.county
                            ].filter(Boolean);
                            
                            const streetName = components.length > 0 ? components.join(', ') : data.display_name;
                            setLocation(streetName || 'Current Location');
                        } else {
                            setLocation('Current Location');
                        }
                    } catch (e) {
                        console.error('Geocoding error:', e);
                        setLocation('Current Location');
                    } finally {
                        setSelectedLocationSyskey('');
                        setIsWaitingLocation(false);
                        toast.success('Location updated');
                    }
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                setIsWaitingLocation(false);
                toast.error('Failed to get location');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Auto-fetch location for new request
    useEffect(() => {
        if (!isEdit) {
            handleRefreshLocation();
        }
    }, [isEdit]);

    // Populate form from existing detail
    useEffect(() => {
        if (existingDetail) {
            // Find member syskey from employee_syskey or user_id
            if (existingDetail.employee_syskey) {
                const member = members.find(m => String(m.syskey) === String(existingDetail.employee_syskey));
                if (member) {
                    setSelectedMemberSyskey(member.syskey);
                } else if (String(existingDetail.employee_syskey) === String(user?.syskey)) {
                    setSelectedMemberSyskey('__SELF__');
                }
            }

            setType(String(existingDetail.type || '601'));
            // Request type (Remote/Backdate) can be in atttype, attendancerequesttype or requesttype (if mapped)
            setRequestType(String(existingDetail.atttype || existingDetail.attendancerequesttype || existingDetail.requesttype || '1'));
            setReasonType(String(existingDetail.attendancereason || '1'));

            const rawDate = String(existingDetail.date || '');
            if (rawDate.length === 8) {
                setDate(`${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`);
            }

            const parseTime = (t: string) => {
                if (!t) return nowTimeStr();
                // "08:30 AM" -> "08:30", "01:30 PM" -> "13:30"
                const match = t.match(/(\d+):(\d+)\s+(AM|PM)/i);
                if (!match) return nowTimeStr();
                let h = parseInt(match[1]);
                const m = match[2];
                const ampm = match[3].toUpperCase();
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
                return `${String(h).padStart(2, '0')}:${m}`;
            };

            if (existingDetail.type === '601') setIntime(parseTime(existingDetail.intime));
            if (existingDetail.type === '602') setOuttime(parseTime(existingDetail.outtime));

            setLocation(existingDetail.location || existingDetail.locationname || '');
            setReason(existingDetail.description || existingDetail.remark || '');
            setLat(String(existingDetail.latitude ?? existingDetail.lat ?? '0.0'));
            setLong(String(existingDetail.longitude ?? existingDetail.long ?? '0.0'));
            setSelectedLocationSyskey(existingDetail.location_syskey || '');
        }
    }, [existingDetail, members, user, id]); // Added id to deps for fetching case
    const selectedMemberInfo = useMemo(() => {
        if (selectedMemberSyskey === '__SELF__') {
            // Find myself in the full list to get the real numeric EID and Employee Record syskey
            const myself = [...members].reverse().find(m => String(m.userid).toLowerCase() === String(userId).toLowerCase())
                || members.find(m => m.level === 'senior'); // Fallback to a senior if direct match fails

            return {
                syskey: myself?.syskey || user?.syskey || user?.usersyskey || '0',
                id: (myself?.employeeId || (user as any)?.eid || (user as any)?.employee_id || (user as any)?.employeeId || userId || '') as string,
                userid: userId || '',
                name: user?.name || '',
            };
        }
        const m = members.find(m => String(m.syskey) === String(selectedMemberSyskey));
        return {
            syskey: m?.syskey || '',
            id: (m?.employeeId || '') as string,
            userid: m?.userid || '',
            name: m?.userName || '',
        };
    }, [selectedMemberSyskey, userId, user, members]);

    const submitMutation = useMutation({
        mutationFn: async () => {
            // Find selected member info
            let targetEmp: { syskey: string, id: string, name: string, userid: string };
            const isSelf = selectedMemberSyskey === '__SELF__';

            if (isSelf) {
                targetEmp = {
                    syskey: selectedMemberInfo.syskey,
                    id: selectedMemberInfo.id,
                    name: user?.name || '',
                    userid: selectedMemberInfo.userid,
                };
            } else {
                const member = members.find(m => String(m.syskey) === String(selectedMemberSyskey));
                if (!member) throw new Error('Selected member not found');
                targetEmp = {
                    syskey: selectedMemberInfo.syskey, // Using pre-calculated info
                    id: selectedMemberInfo.id,
                    name: selectedMemberInfo.name,
                    userid: selectedMemberInfo.userid,
                };
            }

            const payload = {
                syskey: id || '0',
                userid: userId || '', // The manager/requester
                domain: domain || 'dev',
                type,
                date: toApiDate(date),
                intime: type === '601' ? toApi12hTime(intime) : '',
                outtime: type === '602' ? toApi12hTime(outtime) : '',
                location: location || 'MIT q',
                latitude: lat || '0.0',
                longitude: long || '0.0',
                description: reason,
                status: existingDetail?.status || 1,
                approvedby: existingDetail?.approvedby || '',
                employee_syskey: targetEmp.syskey,
                employee_id: targetEmp.id,
                employee_name: targetEmp.name,
                employee_userid: targetEmp.userid,
                requesttype: Number(requestType),
                attendancereason: reasonType,
                location_syskey: selectedLocationSyskey,
            };

            // For update: POST /saveattendancerequest/{syskey}  |  For new: POST /saveattendancerequest
            const endpoint = isEdit && id ? `${SAVE_ATTENDANCE_REQ}/${id}` : SAVE_ATTENDANCE_REQ;

            try {
                const res = await mainClient.post(endpoint, payload);
                const data = res.data;
                const isSuccess = data?.status === 201 || data?.statuscode === 200 || data?.statuscode === 300 || data?.message_code === "203" || data?.message === "Save successfully" || data?.message === "Update successfully";

                if (!isSuccess) {
                    // Check for duplicate attendance in response data even if status is 2xx
                    if (data?.message_code === "402" || data?.message === "Attendance already exist") {
                        const typeLabel = type === '601' ? 'Time in' : 'Time out';
                        throw new Error(`${typeLabel} is already request`);
                    }
                    throw new Error(data?.message || t('common.error'));
                }
                return data;
            } catch (err: any) {
                // Handle 400 error from Axios
                const data = err.response?.data;
                if (data?.message_code === "402" || data?.message === "Attendance already exist") {
                    const typeLabel = type === '601' ? 'Time in' : 'Time out';
                    throw new Error(`${typeLabel} is already request`);
                }
                // Rethrow other errors to be caught by onError
                throw err;
            }
        },
        onSuccess: () => {
            toast.success(isEdit ? 'Request updated successfully' : t('request.submitSuccess'));
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['summaryRequests'] });
            navigate('/attendancerequest');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : t('common.error');
            toast.error(msg);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await mainClient.post(`${DELETE_ATTENDANCE_REQ}/${id}`, {
                userid: userId || '',
                domain: domain || 'dev'
            });
        },
        onSuccess: () => {
            toast.success('Request deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['summaryRequests'] });
            navigate('/attendancerequest');
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Failed to delete request';
            toast.error(msg);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewMode) return;
        if (!reason.trim()) {
            toast.error('Please provide a reason');
            return;
        }
        submitMutation.mutate();
    };

    if (isEdit && !existingDetail && isDetailLoading) {
        return (
            <div className={styles['new-request']} style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <div className="loader" />
            </div>
        );
    }

    const pageTitle = isViewMode ? 'Attendance Request Detail' : (isEdit ? 'Edit Attendance Request' : 'New Attendance Request');
    const pageSubtitle = isViewMode
        ? (refIndex ? `Viewing request #${refIndex}` : `Viewing request #${id}`)
        : (isEdit ? (refIndex ? `Editing request #${refIndex}` : `Editing request #${id}`) : 'Request manual time in/out overrides');

    return (
        <div className={styles['new-request']}>
            <button className={styles['new-request__back']} onClick={() => navigate('/attendancerequest')}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="page-header__title">{pageTitle}</h1>
                        <p className="page-header__subtitle">{pageSubtitle}</p>
                    </div>
                    {isViewMode && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <StatusBadge status={currentStatus} />
                        </div>
                    )}
                </div>
            </div>

            <form className={styles['new-request__card']} onSubmit={handleSubmit}>
                <div className={styles['new-request__section']}>
                    <h3 className={styles['new-request__section-title']}>Details</h3>
                    <div className={styles['new-request__grid']}>


                        <div className={styles['new-request__full']} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <Select
                                id="type"
                                label="Attendance Type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                options={[
                                    { value: '601', label: 'Time In' },
                                    { value: '602', label: 'Time Out' },
                                ]}
                                disabled={isViewMode}
                            />
                            <Select
                                id="request-type"
                                label="Request Type"
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value)}
                                options={[
                                    { value: '1', label: 'Remote' },
                                    { value: '2', label: 'Backdate' },
                                ]}
                                disabled={isViewMode}
                            />
                        </div>

                        <div className={styles['new-request__full']}>
                            <Select
                                id="reason-type"
                                label="Reason Type"
                                value={reasonType}
                                onChange={(e) => setReasonType(e.target.value)}
                                options={reasonOptions}
                                disabled={isViewMode}
                            />
                        </div>

                        <div className={styles['new-request__full']}>
                            <Input
                                id="date"
                                label="Date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                disabled={isViewMode}
                            />
                        </div>

                        {type === '601' && (
                            <div className={styles['new-request__full']}>
                                <Input
                                    id="intime"
                                    label="In Time"
                                    type="time"
                                    value={intime}
                                    onChange={(e) => setIntime(e.target.value)}
                                    required
                                    disabled={isViewMode}
                                />
                            </div>
                        )}

                        {type === '602' && (
                            <div className={styles['new-request__full']}>
                                <Input
                                    id="outtime"
                                    label="Out Time"
                                    type="time"
                                    value={outtime}
                                    onChange={(e) => setOuttime(e.target.value)}
                                    required
                                    disabled={isViewMode}
                                />
                            </div>
                        )}

                        <div className={styles['new-request__full']} style={{ marginBottom: 'var(--space-1)' }}>
                            <EditableSelect
                                label="Location"
                                value={location}
                                options={locationOptions}
                                onChange={(val, opt) => {
                                    setLocation(val);
                                    if (opt) {
                                        setSelectedLocationSyskey(opt.value);
                                        const l_lat = Number(opt.lat || 0).toFixed(6);
                                        const l_long = Number(opt.long || 0).toFixed(6);
                                        setLat(l_lat);
                                        setLong(l_long);
                                    } else {
                                        setSelectedLocationSyskey('');
                                    }
                                }}
                                placeholder="Select or type location..."
                                disabled={isViewMode}
                                isLoading={isLocationsLoading}
                            />
                        </div>

                        {!isViewMode && (
                            <div className={styles['new-request__full']} style={{ marginTop: '-8px', marginBottom: 'var(--space-2)' }}>
                                <div className={styles['coordinate-display']} onClick={handleRefreshLocation}>
                                    <span className={styles['coordinate-text']}>
                                        {Number(lat).toFixed(6)} , {Number(long).toFixed(6)}
                                    </span>
                                    {isWaitingLocation ? (
                                        <Loader2 size={14} className={styles['spin']} />
                                    ) : (
                                        <RefreshCw size={14} />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={styles['new-request__full']}>
                            <Textarea
                                id="reason"
                                label="Reason / Description"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="State the reason for this manual override…"
                                required
                                disabled={isViewMode}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles['new-request__footer']}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {canDelete && (
                            <Button type="button" variant="danger" onClick={() => setShowDeleteModal(true)} disabled={deleteMutation.isPending}>
                                <Trash2 size={16} />
                                Delete
                            </Button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Button type="button" variant="secondary" onClick={() => navigate('/attendancerequest')}>
                            {isViewMode ? 'Close' : t('common.cancel')}
                        </Button>
                        {!isViewMode && (
                            <Button type="submit" loading={submitMutation.isPending}>
                                {isEdit ? 'Update Request' : t('request.submit')}
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            <ConfirmModal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => {
                    deleteMutation.mutate();
                    setShowDeleteModal(false);
                }}
                title="Delete Attendance Request"
                message="Are you sure you want to delete this attendance request? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
