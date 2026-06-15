import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, useParams } from 'react-router-dom';
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
    Building2,
    Trash2,
    File,
    Image as ImageIcon,
    FileSpreadsheet,
    FileArchive,
    FileVideo,
    FileAudio,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { Textarea } from '../../components/ui/Input/Input';
import Select from '../../components/ui/Select/Select';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import MemberPicker from '../../components/shared/MemberPicker/MemberPicker';
import type { MemberItem } from '../../components/shared/MemberPicker/MemberPicker';
import type { TypesModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import {
    REQUEST_TYPES,
    SAVE_REQUEST,
    PHOTO_UPLOAD,
    RESERVATION_TYPES,
    ROOM_TYPES,
    PRODUCT_LIST,
    PROJECT_LIST,
    TRAVEL_TYPE_LIST,
    VEHICLE_USE_LIST,
    LEAVE_TYPES,
    LEAVE_REASONS,
    CLAIM_TYPES,
    CURRENCY_TYPES,
    ORG_TYPE_LIST,
    ORG_UNIT_LIST,
    TEAM_LIST,
    SAVE_LEAVE_HR,
    GET_REQUEST_DETAIL,
    GET_LEAVE_DURATION_POLICY,
} from '../../config/api-routes';
import type { LeaveType, TeamMember } from '../../types/models';
import { formatAmount, unformatAmount } from '../../lib/format-utils';
import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { appConfig } from '../../config/app-config';
import { downloadOrOpenAttachment } from '../../lib/file-utils';
import { flavor } from '../../config/features';
import styles from './NewRequestPage.module.css';
import React from 'react';

/* ── Date/time default helpers ── */
function todayStr(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function nowTimeStr(): string {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

/* ══════════════════════════════════════════════════════════════
   Request Type Definitions
   ══════════════════════════════════════════════════════════════ */



/* ── Calculate leave duration from dates + AM/PM periods ── */
function calcLeaveDuration(startDate: string, endDate: string, startPeriod: string, endPeriod: string): string {
    const s = new Date(startDate);
    const e = endDate ? new Date(endDate) : new Date(startDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
    const daysDiff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) return '';
    // Each date+period = half-day index: AM=0, PM=1
    // totalHalves counts from start period to end period inclusive
    const totalHalves = (daysDiff * 2) + (startPeriod === 'PM' ? -1 : 0) + (endPeriod === 'AM' ? 0 : 1) + 1;
    const dur = totalHalves * 0.5;
    return dur > 0 ? String(dur) : '0.5';
}

/* ── Map API description → internal key for conditional form rendering ── */
const DESC_TO_KEY: Record<string, string> = {
    'leave': 'leave',
    'overtime': 'overtime',
    'work from home': 'wfh',
    'transportation': 'transportation',
    'reservation': 'reservation',
    'travel': 'travel',
    'claim': 'claim',
    'cash advance': 'cashadvance',
    'off in lieu': 'offinlieu',
    'early out': 'earlyout',
    'late': 'late',
    'general': 'general',
    'employee requisition': 'employeerequisition',
    'purchase': 'purchase',
    'attendance request': 'attendancerequest',
    'organization change request': 'orgchange',
    'organization change': 'orgchange',
};

/* Helper: types that use the generic single-date + time form */
const GENERIC_TYPES = new Set(['general', 'employeerequisition', 'purchase', 'other']);

/* ── Visual style per internal key ── */
const TYPE_VISUAL: Record<string, { icon: React.FC<{ size?: number }>; color: string; bgColor: string }> = {
    leave: { icon: Palmtree, color: '#16a34a', bgColor: '#f0fdf4' },
    overtime: { icon: Clock, color: '#d97706', bgColor: '#fef3c7' },
    wfh: { icon: Home, color: '#2563eb', bgColor: '#eff6ff' },
    transportation: { icon: Car, color: '#9333ea', bgColor: '#faf5ff' },
    reservation: { icon: Calendar, color: '#0891b2', bgColor: '#ecfeff' },
    travel: { icon: Plane, color: '#ea580c', bgColor: '#fff7ed' },
    claim: { icon: Banknote, color: '#dc2626', bgColor: '#fef2f2' },
    cashadvance: { icon: Banknote, color: '#b45309', bgColor: '#fef9c3' },
    offinlieu: { icon: Clock, color: '#0d9488', bgColor: '#f0fdfa' },
    earlyout: { icon: Clock, color: '#7c3aed', bgColor: '#f5f3ff' },
    late: { icon: Clock, color: '#be185d', bgColor: '#fdf2f8' },
    general: { icon: FileText, color: '#64748b', bgColor: '#f1f5f9' },
    employeerequisition: { icon: FileText, color: '#0369a1', bgColor: '#f0f9ff' },
    purchase: { icon: FileText, color: '#b45309', bgColor: '#fffbeb' },
    attendancerequest: { icon: FileText, color: '#7c3aed', bgColor: '#faf5ff' },
    orgchange: { icon: Building2, color: '#0ea5e9', bgColor: '#e0f2fe' },
    other: { icon: FileText, color: '#64748b', bgColor: '#f1f5f9' },
};

/* ══════════════════════════════════════════════════════════════
   TypeCarousel — horizontal scrollable request type picker
   ══════════════════════════════════════════════════════════════ */
function TypeCarousel({
    requestTypes,
    selectedType,
    onSelect,
    styles,
}: {
    requestTypes: TypesModel[];
    selectedType: string;
    onSelect: (key: string) => void;
    styles: Record<string, string>;
}) {
    const carouselRef = useRef<HTMLDivElement>(null);

    const scroll = (dir: 'left' | 'right') => {
        const el = carouselRef.current;
        if (el) el.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' });
    };

    const btnBase: React.CSSProperties = {
        width: 28, height: 28, borderRadius: '50%',
        border: '1px solid var(--color-neutral-200)',
        background: 'var(--color-neutral-0)',
        cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-neutral-500)', transition: 'all 0.15s',
        flexShrink: 0,
    };

    return (
        <div className={styles['new-request__section']}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--color-neutral-800)', margin: 0 }}>Request Type</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" style={btnBase} onClick={() => scroll('left')}
                        onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--color-primary-50)'; b.style.borderColor = 'var(--color-primary-300)'; b.style.color = 'var(--color-primary-600)'; }}
                        onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'var(--color-neutral-0)'; b.style.borderColor = 'var(--color-neutral-200)'; b.style.color = 'var(--color-neutral-500)'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button type="button" style={btnBase} onClick={() => scroll('right')}
                        onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--color-primary-50)'; b.style.borderColor = 'var(--color-primary-300)'; b.style.color = 'var(--color-primary-600)'; }}
                        onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'var(--color-neutral-0)'; b.style.borderColor = 'var(--color-neutral-200)'; b.style.color = 'var(--color-neutral-500)'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
            </div>

            {/* Carousel */}
            <div className={styles['new-request__type-carousel-wrap']}>
                <div ref={carouselRef} className={styles['new-request__type-grid']}>
                    {requestTypes.length === 0 ? (
                        Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} style={{ flex: '0 0 120px', height: '100px', borderRadius: 'var(--radius-xl)', background: 'var(--color-neutral-100)', animation: 'carousel-pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
                        ))
                    ) : requestTypes.map((rt) => {
                        const descLower = (rt.description || '').trim().toLowerCase();
                        const mapped = DESC_TO_KEY[descLower];
                        const key = mapped || `other_${rt.syskey}`;
                        const displayKey = mapped || 'other';
                        const { icon: Icon, color, bgColor } = TYPE_VISUAL[displayKey] || TYPE_VISUAL.other;
                        const isActive = selectedType === key;
                        return (
                            <div
                                key={rt.syskey}
                                className={`${styles['new-request__type-card']} ${isActive ? styles['new-request__type-card--active'] : ''}`}
                                onClick={() => onSelect(key)}
                                style={isActive ? { borderColor: color, boxShadow: `0 0 0 3px ${color}22` } : {}}
                            >
                                <div className={styles['new-request__type-card-icon']} style={{ background: isActive ? color + '22' : bgColor, color }}>
                                    <Icon size={22} />
                                </div>
                                <span className={styles['new-request__type-card-label']} style={isActive ? { color } : {}}>{rt.description}</span>
                            </div>
                        );
                    })}
                </div>
                {/* Right fade edge */}
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 8, width: 48, background: 'linear-gradient(to right, transparent, var(--color-neutral-0))', pointerEvents: 'none' }} />
            </div>
            <style>{`@keyframes carousel-pulse { 0%,100%{opacity:.35} 50%{opacity:.8} }`}</style>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════ */

export default function NewRequestPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;

    // Derive preset type from URL path (most reliable) then fall back to ?type= query param.
    // e.g. /transportation/new → 'transportation', /claim/new → 'claim'
    const PATH_TO_TYPE: Record<string, string> = {
        '/claim/new': 'claim',
        '/overtime/new': 'overtime',
        '/wfh/new': 'wfh',
        '/transportation/new': 'transportation',
        '/travel/new': 'travel',
        '/cashadvance/new': 'cashadvance',
        '/offinlieu/new': 'offinlieu',
        '/orgchange/new': 'orgchange',
    };
    const presetType = PATH_TO_TYPE[location.pathname] || searchParams.get('type') || '';

    // ── Request type / subtype ──
    const [selectedType, setSelectedType] = useState(presetType);
    const [subType, setSubType] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const { user, userId, domain } = useAuthStore();

    // ── Redirect Attendance Request to its specialized page ──
    useEffect(() => {
        if (presetType === 'attendancerequest') {
            navigate('/attendancerequest/new', { replace: true });
        }
    }, [presetType, navigate]);

    // ── Team Data Query (For Leave Request RO) ──
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

    const [selectedMemberSyskey, setSelectedMemberSyskey] = useState<string>('__SELF__');

    const employeeOptions = React.useMemo(() => {
        const options = [
            { value: '__SELF__', label: `Myself (${user?.name})` }
        ];
        members.filter(m => {
            if (m.level !== 'junior') return false;

            const t = (m.type || '').toLowerCase();
            if (t === 'reporting officer' || !t) return true;

            if (t === 'leave supervisor') return selectedType === 'leave';
            if (t === 'ot supervisor' || t === 'overtime supervisor') return selectedType === 'overtime';
            if (t === 'attendance supervisor') return selectedType === 'attendancerequest';

            // Catch-all block: hide this member if they have an unhandled specific supervisor type
            return false;
        }).forEach(m => {
            options.push({ value: m.syskey, label: `${m.userName} (${m.employeeId})` });
        });
        return options;
    }, [user, members, selectedType]);

    React.useEffect(() => {
        if (selectedMemberSyskey !== '__SELF__' && !employeeOptions.some(o => o.value === selectedMemberSyskey)) {
            setSelectedMemberSyskey('__SELF__');
        }
    }, [employeeOptions, selectedMemberSyskey]);

    const selectedMemberInfo = React.useMemo(() => {
        if (selectedMemberSyskey === '__SELF__') {
            const myself = [...members].reverse().find(m => String(m.userid).toLowerCase() === String(userId).toLowerCase())
                || members.find(m => m.level === 'senior');
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
    }, [selectedMemberSyskey, user, userId, members]);

    // ── Organization Change ──
    const [orgUnitSubject, setOrgUnitSubject] = useState('Team');
    const [orgChangeType, setOrgChangeType] = useState('Creation of a new Unit');
    const [orgSummary] = useState('');
    const [orgComment, setOrgComment] = useState('');
    const [orgObjective, setOrgObjective] = useState('');
    const [orgReassignment] = useState('');
    const [orgEffectiveFix, setOrgEffectiveFix] = useState('Yes');
    const [orgProposedDate, setOrgProposedDate] = useState('');
    const [orgRelocation, setOrgRelocation] = useState('Yes');
    const [orgRelocationHeadcounts, setOrgRelocationHeadcounts] = useState('1');
    const [orgRelocationFrom, setOrgRelocationFrom] = useState('');
    const [orgRelocationTo, setOrgRelocationTo] = useState('');

    // ── Leave-specific AM/PM & duration ──
    const [startPeriod, setStartPeriod] = useState('AM');
    const [endPeriod, setEndPeriod] = useState('AM');
    const [duration, setDuration] = useState('1');
    const [durationLoading, setDurationLoading] = useState(false);

    // ── Core fields ──
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [startTime, setStartTime] = useState(nowTimeStr);
    const [endTime, setEndTime] = useState(nowTimeStr);
    const [remark, setRemark] = useState('');

    // ── Transportation-specific (mirrors mobile _buildTransTypeFields) ──
    const [transGroupType, setTransGroupType] = useState<'group' | 'individual'>('group');
    const [transToPlace, setTransToPlace] = useState('');
    const [transTripType, setTransTripType] = useState('');        // syskey
    const [transTripTypeDesc, setTransTripTypeDesc] = useState(''); // description (for conditional UI)
    // One Way Trip fields
    const [transOneWayStart, setTransOneWayStart] = useState('');
    const [transOneWayEnd, setTransOneWayEnd] = useState('');
    const [transOneWayStartTime, setTransOneWayStartTime] = useState(nowTimeStr);
    const [transOneWayEndTime, setTransOneWayEndTime] = useState(nowTimeStr);
    // Round Trip fields
    const [transDepartureStart, setTransDepartureStart] = useState('');
    const [transDepartureEnd, setTransDepartureEnd] = useState('');
    const [transDepartureStartTime, setTransDepartureStartTime] = useState(nowTimeStr);
    const [transDepartureEndTime, setTransDepartureEndTime] = useState(nowTimeStr);
    const [transArrivalStart, setTransArrivalStart] = useState('');
    const [transArrivalEnd, setTransArrivalEnd] = useState('');
    const [transArrivalStartTime, setTransArrivalStartTime] = useState(nowTimeStr);
    const [transArrivalEndTime, setTransArrivalEndTime] = useState(nowTimeStr);

    // ── Reservation-specific ──
    const [room, setRoom] = useState('');
    const [maxPeople, setMaxPeople] = useState('');

    // ── Travel-specific ──
    const [modeOfTravel, setModeOfTravel] = useState('');
    const [vehicleUse, setVehicleUse] = useState('');
    const [product, setProduct] = useState('');
    const [project, setProject] = useState('');
    const [estimatedBudget, setEstimatedBudget] = useState('');
    const [departureDate, setDepartureDate] = useState(todayStr);
    const [arrivalDate, setArrivalDate] = useState(todayStr);
    const [travelDepartureTime, setTravelDepartureTime] = useState(nowTimeStr);
    const [travelReturnTime, setTravelReturnTime] = useState(nowTimeStr);
    const [travelPurpose, setTravelPurpose] = useState('');

    // ── Overtime-specific ──
    const [hour, setHour] = useState('');
    const [otDays, setOtDays] = useState('0');

    // ── Cash Advance / Claim-specific ──
    const [amount, setAmount] = useState('');
    const [currencyType, setCurrencyType] = useState('');
    // ── Claim-specific ──
    const [claimType, setClaimType] = useState('');
    const [claimTypeDesc, setClaimTypeDesc] = useState('');
    const [claimFromPlace, setClaimFromPlace] = useState('');
    const [claimToPlace, setClaimToPlace] = useState('');
    const [remainingBalance, setRemainingBalance] = useState('');

    // ── Location (WFH) ──
    const [locationName, setLocationName] = useState('');

    // ── Shared ──
    const [approvers, setApprovers] = useState<MemberItem[]>([]);
    const [transMembers, setTransMembers] = useState<MemberItem[]>([]); // transportation group members (separate from approvers)
    const [accompanyPersons, setAccompanyPersons] = useState<MemberItem[]>([]);
    const [handovers, setHandovers] = useState<MemberItem[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

    // ── Auto-fetch leave duration from policy API ──
    useEffect(() => {
        if (selectedType !== 'leave') return;
        if (!startDate || !leaveType) return;

        // Convert 'YYYY-MM-DD' → 'yyyyMMdd'
        const toApiDate = (d: string) => d.replace(/-/g, '');

        const fetchDuration = async () => {
            setDurationLoading(true);
            try {
                const [res] = await Promise.all([
                    apiClient.post(GET_LEAVE_DURATION_POLICY, {
                        syskey: '',
                        requesttype: 'leave',
                        requestsubtype: leaveType,
                        startdate: toApiDate(startDate),
                        enddate: toApiDate(endDate || startDate),
                        starttime: startPeriod,
                        endtime: endPeriod,
                        userid: userId || '',
                        domain: domain || '',
                    }),
                    new Promise(resolve => setTimeout(resolve, 1500)), // minimum 1.5s loading
                ]);
                const dur = res.data?.duration;
                if (dur !== undefined && dur !== null) {
                    setDuration(String(dur));
                }
            } catch {
                // silently ignore — user can type duration manually
            } finally {
                setDurationLoading(false);
            }
        };

        fetchDuration();
    }, [selectedType, startDate, endDate, startPeriod, endPeriod, leaveType, userId, domain]);

    // ── Edit Mode: Fetch existing request details ──
    const { data: editData } = useQuery({
        queryKey: ['requestDetail', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await apiClient.post(GET_REQUEST_DETAIL, { syskey: id });
            return res.data || null;
        },
        enabled: isEdit,
    });

    // ── Edit Mode: Populate state from editData ──
    useEffect(() => {
        if (!editData) return;

        const d = editData.datalist || {};
        const typeKey = DESC_TO_KEY[(d.requesttypedesc || '').trim().toLowerCase()] || 'other';
        setSelectedType(typeKey);
        setSubType(d.requestsubtype || '');
        setRemark(d.remark || d.description || d.reason || '');

        // Dates & Times
        const fmtDate = (dateStr: string) => {
            if (!dateStr) return todayStr();
            if (dateStr.length === 8) {
                return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            }
            return dateStr;
        };
        const fmtTime = (timeStr: string) => {
            if (!timeStr) return nowTimeStr();
            // Handle "hh:mm AM/PM" -> "HH:mm"
            if (timeStr.includes('AM') || timeStr.includes('PM')) {
                const [time, period] = timeStr.split(' ');
                let [h, m] = time.split(':').map(Number);
                if (period === 'PM' && h < 12) h += 12;
                if (period === 'AM' && h === 12) h = 0;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
            return timeStr;
        };

        setStartDate(fmtDate(d.startdate || d.date || d.selectday));
        setEndDate(fmtDate(d.enddate || d.startdate || d.date || d.selectday));
        setStartTime(fmtTime(d.starttime || d.time || ''));
        setEndTime(fmtTime(d.endtime || ''));

        // Specific fields
        if (typeKey === 'leave') {
            setLeaveType(d.requestsubtype || '');
            setStartPeriod(d.starttime || 'AM');
            setEndPeriod(d.endtime || 'AM');
            setDuration(String(d.duration || '1'));
            setLeaveReason(d.leavereason || '');
        } else if (typeKey === 'wfh') {
            setLocationName(d.locationname || '');
        } else if (typeKey === 'transportation') {
            setTransToPlace(d.toplace || '');
            setTransTripType(d.triptype || '0');
            setTransGroupType(d.isgroup === 0 ? 'group' : 'individual');
            if (d.triptype === '0') {
                setTransOneWayStart(d.pickupplace || '');
                setTransOneWayEnd(d.dropoffplace || '');
                setTransOneWayStartTime(fmtTime(d.gobackarrivaltime));
                setTransOneWayEndTime(fmtTime(d.gobackreturntime));
            } else {
                setTransDepartureStart(d.pickupplace || '');
                setTransDepartureEnd(d.dropoffplace || '');
                setTransDepartureStartTime(fmtTime(d.gobackarrivaltime));
                setTransDepartureEndTime(fmtTime(d.gobackreturntime));
                setTransArrivalStart(d.arrivalstartlocation || '');
                setTransArrivalEnd(d.arrivalendlocation || '');
                setTransArrivalStartTime(fmtTime(d.arrivalstarttime));
                setTransArrivalEndTime(fmtTime(d.arrivalendtime));
            }
        } else if (typeKey === 'reservation') {
            setRoom(d.rooms || '');
            setMaxPeople(String(d.maxpeople || ''));
        } else if (typeKey === 'travel') {
            setTravelPurpose(d.travelpurpose || '');
            setEstimatedBudget(String(d.estimatedbudget || ''));
            setDepartureDate(fmtDate(d.startdate));
            setArrivalDate(fmtDate(d.enddate));
            setTravelDepartureTime(fmtTime(d.starttime));
            setTravelReturnTime(fmtTime(d.endtime));
        } else if (typeKey === 'claim' || typeKey === 'cashadvance') {
            setAmount(String(d.amount || ''));
            setCurrencyType(d.currencytype || '');
            if (typeKey === 'claim') {
                setClaimType(d.requestsubtype || '');
                setClaimFromPlace(d.fromPlace || '');
                setClaimToPlace(d.toPlace || '');
            }
        }

        // Approvers & Handovers
        const mapToMember = (list: any[]): MemberItem[] => {
            if (!Array.isArray(list)) return [];
            return list.map(m => ({
                syskey: m.syskey || '',
                name: m.name || '',
                employeeid: m.eid || m.employeeid || '',
                position: m.position || '',
                photo: m.profile || '',
                userid: m.userid || '',
            }));
        };

        const approverList = editData.approverList || d.selectedApprovers || d.approverList || [];
        const handoversList = editData.selectedHandovers || d.selectedHandovers || [];
        const accompanyList = editData.selectedAcconpanyPersons || d.selectedAcconpanyPersons || [];

        setApprovers(mapToMember(approverList));
        setHandovers(mapToMember(handoversList));
        setAccompanyPersons(mapToMember(accompanyList));

        // On-behalf-of check
        if (d.employee_syskey && String(d.employee_syskey) !== String(user?.syskey || user?.usersyskey)) {
            setSelectedMemberSyskey(String(d.employee_syskey));
        }

        // Attachments
        setExistingAttachments(Array.isArray(d.attachment) ? d.attachment : []);
    }, [editData, user]);

    // ── API Queries for lookups ──
    const EXCLUDED_REQUEST_TYPES = ['ferry', 'hr complaint'];
    const { data: requestTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['requestTypes'],
        queryFn: async () => {
            const res = await apiClient.get(REQUEST_TYPES);
            return res.data?.datalist || [];
        },
        select: (data) => data.filter((rt) => {
            const desc = (rt.description || '').toLowerCase();
            return !EXCLUDED_REQUEST_TYPES.some((ex) => desc.includes(ex));
        }),
    });

    // ── Organization Change Lookups ──
    const { data: orgChangeTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['orgChangeTypes'],
        queryFn: async () => {
            const payload = { currentpage: 1, pagesize: 100, searchObj: { order: 'code', orderType: 'asc' }, searchVal: '' };
            const res = await apiClient.post(ORG_TYPE_LIST, payload);
            return res.data?.datalist || [];
        },
    });

    const { data: orgUnitSubjects = [] } = useQuery<TypesModel[]>({
        queryKey: ['orgUnitSubjects'],
        queryFn: async () => {
            const payload = { currentpage: 1, pagesize: 100, searchObj: { order: 'code', orderType: 'asc' }, searchVal: '' };
            const res = await apiClient.post(ORG_UNIT_LIST, payload);
            return res.data?.datalist || [];
        },
    });

    // Flutter: tripTypes is a hardcoded static list in request_provider.dart (line 50), NOT from an API
    // List<TypesModel> tripTypes = [TypesModel(syskey: '0', description: 'One Way Trip'), TypesModel(syskey: '1', description: 'Round Trip')]
    const transportTypes: TypesModel[] = [
        { syskey: '0', description: 'One Way Trip' },
        { syskey: '1', description: 'Round Trip' },
    ];

    const { data: reservationTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['reservationTypes'],
        queryFn: async () => {
            const res = await apiClient.get(RESERVATION_TYPES);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'reservation',
    });

    const { data: roomTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['roomTypes', startDate, startTime, endTime],
        queryFn: async () => {
            // Flutter sends date + start/end time so the backend can check availability
            const apiDate = startDate ? startDate.replace(/-/g, '') : todayStr().replace(/-/g, '');
            const fmtTime = (t: string) => {
                if (!t) return '12:00 PM';
                const [h, m] = t.split(':').map(Number);
                const suffix = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
            };
            const res = await apiClient.post(ROOM_TYPES, {
                date: apiDate,
                starttime: fmtTime(startTime),
                endtime: fmtTime(endTime),
            });
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'reservation',
    });

    const { data: productList = [] } = useQuery<TypesModel[]>({
        queryKey: ['productList'],
        queryFn: async () => {
            // Mobile: RequestApi.fetchList(getProductList) — GET
            const res = await apiClient.get(PRODUCT_LIST);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel' || selectedType === 'overtime',
    });

    const { data: projectList = [] } = useQuery<TypesModel[]>({
        queryKey: ['projectList'],
        queryFn: async () => {
            // Mobile: RequestApi.fetchList(getProjectList) — GET
            const res = await apiClient.get(PROJECT_LIST);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel' || selectedType === 'overtime',
    });

    const { data: travelTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['modeOfTravel'],
        queryFn: async () => {
            // Mobile: RequestApi.fetchList(getTravelTypeList) — GET
            const res = await apiClient.get(TRAVEL_TYPE_LIST);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel',
    });

    const { data: vehicleUseList = [] } = useQuery<TypesModel[]>({
        queryKey: ['vehicleUseList'],
        queryFn: async () => {
            // Mobile: RequestApi.fetchList(getusedVehicleList) — GET
            const res = await apiClient.get(VEHICLE_USE_LIST);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel',
    });

    const { data: leaveTypeList = [] } = useQuery<LeaveType[]>({
        queryKey: ['leaveTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(LEAVE_TYPES);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'leave',
    });

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
        enabled: selectedType === 'leave' && (flavor === 'prd' || flavor === 'mpt'),
    });

    const { data: claimTypeList = [] } = useQuery<TypesModel[]>({
        queryKey: ['claimTypeList', selectedMemberInfo?.syskey],
        queryFn: async () => {
            const params = selectedMemberInfo?.syskey && selectedMemberInfo.syskey !== '0' 
                ? { employee_syskey: selectedMemberInfo.syskey } 
                : {};
            const res = await apiClient.get(CLAIM_TYPES, { params });
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'cashadvance' || selectedType === 'claim',
    });

    const { data: currencyList = [] } = useQuery<TypesModel[]>({
        queryKey: ['currencyTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(CURRENCY_TYPES);
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'cashadvance' || selectedType === 'claim',
    });

    // Taxi-type claim types show fromPlace/toPlace
    const isTaxiClaimType = ['taxi fare', 'ferry taxi', 'onsite taxi'].includes(claimTypeDesc.trim().toLowerCase());
    const isBenefitBonusClaimType = ['benefit allowance', 'bonus allowance'].includes(claimTypeDesc.trim().toLowerCase());

    // Auto-populate remaining balance and claim type desc when claim type or list changes
    useEffect(() => {
        if (selectedType === 'claim' && claimType && claimTypeList.length > 0) {
            const sel = claimTypeList.find(ct => ct.syskey === claimType);
            if (sel) {
                setClaimTypeDesc(sel.description || '');
                // only update balance if we haven't already OR if it's the right type
                if (sel.remaining_balance != null) {
                    setRemainingBalance(String(sel.remaining_balance));
                }
            }
        }
    }, [selectedType, claimType, claimTypeList]);

    // Reset sub-fields when type changes; auto-default subType for ALL types
    // In edit mode, skip clearing leave-specific fields — they are already restored from editData
    useEffect(() => {
        if (!isEdit) {
            setLeaveType('');
            setStartPeriod('AM');
            setEndPeriod('AM');
        }
        setSubType('');
        if (selectedType && requestTypes.length > 0) {
            const match = requestTypes.find((t) => {
                if (selectedType.startsWith('other_')) {
                    return t.syskey === selectedType.replace('other_', '');
                }
                return DESC_TO_KEY[(t.description || '').trim().toLowerCase()] === selectedType;
            });
            if (match) setSubType(match.syskey);
        }
    }, [selectedType, requestTypes]);

    // NOTE: Leave duration is fully managed by the getleavedurationpolicy API above.
    // The local calcLeaveDuration fallback was removed to prevent it from overwriting the API result.

    // ── Central auto-sync: startDate → endDate (all types that use both date fields) ──
    // Excludes: travel (departure/arrival), leave (user controls), general/purchase/other (single date)
    const DATE_RANGE_TYPES = ['overtime', 'leave', 'wfh', 'cashadvance', 'claim', 'transportation',
        'reservation', 'earlyout', 'late', 'offinlieu'];
    useEffect(() => {
        if (!DATE_RANGE_TYPES.includes(selectedType) || !startDate) return;
        setEndDate(startDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, selectedType]);

    // ── Central auto-sync: startTime → endTime +1 hr (all types that use both time fields) ──
    // Excludes: travel (departure/arrival times), leave (AM/PM period), general/purchase/other (single time)
    const TIME_RANGE_TYPES = ['overtime', 'wfh', 'cashadvance', 'claim',
        'reservation', 'earlyout', 'late', 'offinlieu', 'transportation'];
    useEffect(() => {
        if (!TIME_RANGE_TYPES.includes(selectedType) || !startTime) return;
        const [h, m] = startTime.split(':').map(Number);
        const newH = (h + 1) % 24;
        setEndTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTime, selectedType]);

    // ── Transportation-specific: auto-adjust each end-time +1 hr from its start-time ──
    const addOneHour = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    useEffect(() => {
        if (selectedType !== 'transportation' || !transOneWayStartTime) return;
        setTransOneWayEndTime(addOneHour(transOneWayStartTime));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transOneWayStartTime, selectedType]);

    useEffect(() => {
        if (selectedType !== 'transportation' || !transDepartureStartTime) return;
        setTransDepartureEndTime(addOneHour(transDepartureStartTime));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transDepartureStartTime, selectedType]);

    useEffect(() => {
        if (selectedType !== 'transportation' || !transArrivalStartTime) return;
        setTransArrivalEndTime(addOneHour(transArrivalStartTime));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transArrivalStartTime, selectedType]);

    // Auto-calculate OT hours from startTime → endTime
    useEffect(() => {
        if (selectedType !== 'overtime' || !startTime || !endTime) return;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60; // overnight span
        const h = diff / 60;
        setHour(h % 1 === 0 ? String(h) : h.toFixed(1));
    }, [selectedType, startTime, endTime]);

    // Auto-calculate OT days from startDate → endDate (inclusive)
    useEffect(() => {
        if (selectedType !== 'overtime' || !startDate) return;
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : start;
        const ms = end.getTime() - start.getTime();
        const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
        setOtDays(String(days));
    }, [selectedType, startDate, endDate]);

    // ── Submit mutation ──
    const submitMutation = useMutation({
        mutationFn: async () => {
            /* ── Resolve type description from API list (reverse of DESC_TO_KEY) ── */
            // Use cached requestTypes; if empty, fetch them now
            let types = requestTypes;
            if (!types.length) {
                try {
                    const res = await apiClient.get(REQUEST_TYPES);
                    types = res.data?.datalist || [];
                } catch {
                    types = [];
                }
            }
            // Find the API entry whose description maps to our selectedType key
            const matchedType = types.find((t: TypesModel) => {
                if (selectedType.startsWith('other_')) {
                    return t.syskey === selectedType.replace('other_', '');
                }
                return DESC_TO_KEY[(t.description || '').trim().toLowerCase()] === selectedType;
            });
            const typeDesc = matchedType?.description || selectedType;
            const typeSyskey = matchedType?.syskey || selectedType;

            /* ── Upload attachments first ──
               Flutter (office_api.dart LeaveApi.uploadOne) sends JSON:
               { base64String: <base64 content>, base64filename: <name> }
               Server returns { fileName } which goes in payload.attachment */
            let attachmentFileNames: string[] = [];
            if (files.length > 0) {
                // Helper: File → base64 string (strips data:...;base64, prefix)
                const toBase64 = (file: File): Promise<string> =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result as string;
                            // Strip "data:<mime>;base64," prefix → raw base64
                            resolve(result.split(',')[1] || result);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                const uploads = files.map(async (file) => {
                    const base64String = await toBase64(file);
                    return apiClient.post(PHOTO_UPLOAD, {
                        base64String,
                        base64filename: file.name,
                    }).catch((err) => {
                        if (err.message === 'Network Error') {
                            throw new Error(`Upload failed for ${file.name}. The file might be too large.`);
                        }
                        throw err;
                    });
                });
                const results = await Promise.all(uploads);
                console.log('[PHOTO_UPLOAD] results:', results.map(r => r.data));
                attachmentFileNames = results
                    .map((r) => {
                        const d = r.data;
                        // Handle various response shapes from the server
                        return d?.fileName          // most likely key
                            || d?.filename          // lowercase variant
                            || d?.file_name         // snake_case variant
                            || d?.name              // short key
                            || d?.datalist?.[0]?.fileName
                            || (typeof d === 'string' ? d : '');
                    })
                    .filter(Boolean);
            }

            /* ── Helper: date yyyy-MM-dd → yyyyMMdd ── */
            const toApiDate = (d: string) => d ? d.replace(/-/g, '') : '';

            /* ── Helper: time HH:mm (24hr) → hh:mm AM/PM ── */
            const toApi12hTime = (t: string) => {
                if (!t) return '';
                const [h, m] = t.split(':').map(Number);
                const suffix = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
            };

            /* ── Base payload (matches Flutter RequestModel.toJson) ── */
            const payload: Record<string, unknown> = {
                syskey: id || "0",
                requesttype: typeSyskey,
                requesttypedesc: typeDesc,
                requestsubtype: subType,        // addIfEmpty — always sent
                requestsubtypedesc: '',          // addIfEmpty — always sent
                remark,
                reason: remark || "",
                description: remark || "",
                travelpurpose: '',              // addIfEmpty — overwritten for travel
                car: "",
                driver: "",
                comment: "",
                fromPlace: "",                  // overwritten for claim taxi / travel
                toPlace: "",
                amount: 0,                      // overwritten for claim / cash advance
                currencytype: '',               // addIfEmpty
                modeoftravel: [],
                vehicleuse: [],
                estimatedbudget: 0,
                extendBudget: 0,
                extendDate: "",
                userleavetime: "",
                selectedApprovers: approvers.map((a) => ({
                    syskey: a.syskey,
                    name: a.name,
                    userid: (a as any).userid || '',      // userrole.userid — socket notification target
                    profilestatus: (a as any).profilestatus || 0,
                    profile: (a as any).profile || '',
                    eid: (a as any).eid || a.employeeid || '',  // e.eid from getMemberList
                    signedURL: '',
                    status: '4',
                    pickupplace: '',
                    dropoffplace: '',
                    leaveDateRange: '',
                    timeintime: '',
                    timeouttime: '',
                    attendancevalidation: (a as any).attendancevalidation ?? true,
                    timeinoffset: '',
                    timeoutoffset: '',
                })),
                selectedAcconpanyPersons: [],   // always sent
                selectedHandovers: [],
                attachment: [
                    ...existingAttachments.map(att => {
                        if (typeof att === 'string') return att;
                        if (att && typeof att === 'object') {
                            return att.filepath || att.filePath || att.filename || att.fileName || att.name || '';
                        }
                        return '';
                    }),
                    ...attachmentFileNames
                ].filter(Boolean),
                ottype: 0,
            };

            /* ── Date / time formatting depends on request type ── */
            if (selectedType === 'reservation') {
                payload.startdate = toApiDate(startDate);
                payload.enddate = '';
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.maxpeople = Number(maxPeople) || 0;
                payload.rooms = room;
                const selRoom = roomTypes.find((r) => r.syskey === room);
                payload.roomsdesc = selRoom?.description || '';
                const selResType = reservationTypes.find((r) => r.syskey === subType);
                payload.requestsubtypedesc = selResType?.description || '';
                payload.requeststatus = 2;
                payload.selectedAcconpanyPersons = accompanyPersons.map((p) => ({
                    syskey: p.syskey, name: p.name, userid: '', profilestatus: 0,
                    profile: '', eid: p.employeeid || '', signedURL: '', status: '4',
                    pickupplace: '', dropoffplace: '', leaveDateRange: '',
                    timeintime: '', timeouttime: '', attendancevalidation: true,
                    timeinoffset: '', timeoutoffset: '',
                }));
            } else if (selectedType === 'leave' || selectedType === 'wfh') {
                payload.startdate = toApiDate(startDate);
                payload.enddate = toApiDate(endDate || startDate);
                payload.requeststatus = "1";
                if (selectedType === 'leave') {
                    payload.starttime = startPeriod;
                    payload.endtime = endPeriod;
                    payload.duration = duration;
                    if (leaveType) {
                        const selectedLt = leaveTypeList.find((lt) => lt.syskey === leaveType);
                        if (selectedLt) {
                            payload.requestsubtype = selectedLt.syskey;
                            payload.requestsubtypedesc = selectedLt.description;
                        }
                    }
                    if ((flavor === 'prd' || flavor === 'mpt') && leaveReason) {
                        payload.leavereason = leaveReason;
                    }
                    payload.selectedHandovers = handovers.map((h) => ({ syskey: h.syskey, name: h.name }));
                } else {
                    // WFH: no starttime/endtime in mobile payload
                    payload.locationname = locationName;
                    payload.locationsyskey = '';   // GPS-based on mobile; empty for web
                    payload.latitude = '';          // not captured on web
                    payload.longitude = '';         // not captured on web
                    payload.duration = 1.0;         // mobile always sends 1.0 for WFH
                }
            } else if (selectedType === 'transportation') {
                // Mirrors Flutter RequestModel.toJson() transportation block (lines 434-451)
                // Flutter uses syskey '0' = One Way Trip, '1' = Round Trip
                const isOneWay = transTripType === '0';
                if (startDate) payload.selectday = toApiDate(startDate); // Only send if not empty
                payload.toplace = transToPlace;
                payload.isgroup = transGroupType === 'group' ? 0 : 1;
                payload.triptype = transTripType || '0';
                payload.userleavetime = '';
                payload.isgoing = isOneWay;           // true for one-way, false for round-trip
                payload.isreturn = !isOneWay;          // false for one-way, true for round-trip
                payload.isgoback = false;
                payload.arrivaltime = '';
                payload.returntime = '';

                if (isOneWay) {
                    payload.gobackarrivaltime = toApi12hTime(transOneWayStartTime);
                    payload.gobackreturntime = toApi12hTime(transOneWayEndTime);
                    payload.arrivalstarttime = '';
                    payload.arrivalendtime = '';
                    payload.arrivalstartlocation = '';
                    payload.arrivalendlocation = '';
                    payload.pickupplace = transOneWayStart;
                    payload.dropoffplace = transOneWayEnd;
                } else {
                    payload.gobackarrivaltime = toApi12hTime(transDepartureStartTime);
                    payload.gobackreturntime = toApi12hTime(transDepartureEndTime);
                    payload.arrivalstarttime = toApi12hTime(transArrivalStartTime);
                    payload.arrivalendtime = toApi12hTime(transArrivalEndTime);
                    payload.arrivalstartlocation = transArrivalStart;
                    payload.arrivalendlocation = transArrivalEnd;
                    payload.pickupplace = transDepartureStart;
                    payload.dropoffplace = transDepartureEnd;
                }
                payload.selectedMembers = transGroupType === 'group'
                    ? transMembers.map((m) => ({
                        syskey: m.syskey, name: m.name, userid: '',
                        profilestatus: 0, profile: '', eid: m.employeeid || '',
                        signedURL: '', status: '4',
                    }))
                    : [];
                payload.requeststatus = "1";
            } else if (selectedType === 'orgchange') {
                payload.requeststatus = "1"; // "Pending"
                payload.startdate = toApiDate(startDate);
                // Map the Organization Change specific fields
                (payload as any).orgunitsubject = orgUnitSubject;
                (payload as any).orgchangetype = orgChangeType;
                (payload as any).orgsummary = orgSummary;
                (payload as any).orgcomment = orgComment;
                (payload as any).orgobjective = orgObjective;
                (payload as any).orgreassignment = orgReassignment;
                (payload as any).orgeffectivefix = orgEffectiveFix;
                if (orgEffectiveFix === 'Yes') {
                    (payload as any).orgproposeddate = orgProposedDate;
                }
                (payload as any).orgrelocation = orgRelocation;
                if (orgRelocation === 'Yes') {
                    (payload as any).orgrelocationheadcounts = orgRelocationHeadcounts;
                    (payload as any).orgrelocationfrom = orgRelocationFrom;
                    (payload as any).orgrelocationto = orgRelocationTo;
                }
            } else if (selectedType === 'travel') {
                payload.departuredate = toApiDate(departureDate);
                payload.arrivaldate = toApiDate(arrivalDate);
                payload.departuretime = toApi12hTime(travelDepartureTime);
                payload.plannedreturn = toApi12hTime(travelReturnTime);
                payload.startdate = '';
                payload.enddate = '';
                payload.date = '';
                payload.selectday = '';
                payload.otday = '';
                payload.fromPlace = "";
                payload.toPlace = "";
                payload.modeoftravel = modeOfTravel ? [modeOfTravel] : [];
                payload.vehicleuse = vehicleUse ? [vehicleUse] : [];
                payload.product = product || "0";
                payload.project = project || "0";
                const budgetVal = Number(unformatAmount(String(estimatedBudget))) || 0;
                payload.estimatedbudget = budgetVal;
                payload.amount = budgetVal;
                payload.travelpurpose = travelPurpose || remark || "";
                payload.requeststatus = "1";
                payload.extendBudget = 0;
                payload.extendDate = "";
                payload.userleavetime = "";

                // Calculate days (arrivalDate - departureDate + 1)
                if (departureDate && arrivalDate) {
                    const d1 = new Date(departureDate);
                    const d2 = new Date(arrivalDate);
                    const diffTime = Math.abs(d2.getTime() - d1.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    payload.days = diffDays || 1;
                } else {
                    payload.days = 1;
                }

                payload.selectedAcconpanyPersons = accompanyPersons.map((p) => ({ syskey: p.syskey, name: p.name }));
            } else if (selectedType === 'overtime') {
                payload.startdate = toApiDate(startDate);
                payload.enddate = toApiDate(endDate || startDate);
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.otday = otDays;   // auto-calc: endDate - startDate + 1 days
                payload.date = '';
                payload.selectday = '';
                payload.hour = hour;
                payload.product = product;   // Flutter: formData['product'] = formData['productList'].syskey
                payload.project = project;   // Flutter: formData['project'] = formData['projectList'].syskey
                payload.requeststatus = "1";
            } else if (selectedType === 'cashadvance' || selectedType === 'claim') {
                // Mirrors mobile ClaimModel.toJson() — matches the working mobile payload exactly
                const numAmount = Number(unformatAmount(String(amount))) || 0;
                const selClaimType = claimTypeList.find(ct => ct.syskey === claimType);
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.remark = payload.remark || '';
                payload.travelpurpose = '';
                payload.car = '';
                payload.driver = '';
                payload.comment = '';
                // Claim type goes as requestsubtype (syskey) + requestsubtypedesc
                payload.requestsubtype = claimType;
                payload.requestsubtypedesc = selClaimType?.description || '';
                payload.remaining_balance = selClaimType?.remaining_balance || '';
                payload.max_amount = selClaimType?.max_amount || '';
                payload.amount = numAmount;
                payload.estimatedbudget = numAmount;  // mobile sends same value as amount
                payload.currencytype = currencyType;
                payload.fromPlace = isTaxiClaimType ? claimFromPlace : '';
                payload.toPlace = isTaxiClaimType ? claimToPlace : '';
                payload.modeoftravel = [];
                payload.vehicleuse = [];
                payload.extendBudget = 0;
                payload.extendDate = '';
                payload.userleavetime = '';
                payload.selectedHandovers = [];
                payload.requeststatus = "1";
            } else if (selectedType === 'offinlieu') {
                // Off In Lieu: selectday + starttime + endtime — mirrors mobile lines 877-884
                payload.selectday = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.date = '';
                payload.otday = '';
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.requeststatus = "1";
            } else if (selectedType === 'late' || selectedType === 'earlyout') {
                // Late / Early Out: mirrors mobile — date + starttime + endtime + duration string
                const [sh, sm] = (startTime || '00:00').split(':').map(Number);
                const [eh, em] = (endTime || '00:00').split(':').map(Number);
                const diffMins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.duration = `${hrs} hr ${mins} min`;
                payload.requeststatus = "1";
            } else {
                // General / Employee Requisition / Purchase — Flutter: uses date + time only (no start/end date/time)
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.time = toApi12hTime(startTime);  // Flutter: formData['time'] = single time field
                payload.requeststatus = "1";
            }

            // ── Generic Subordinate Form Details ──
            if (selectedMemberSyskey !== '__SELF__') {
                payload.employeeid = selectedMemberInfo.id;
                payload.employeename = selectedMemberInfo.name;
                payload.userid = userId || '';
                payload.domain = useAuthStore.getState().domain || 'dev';
            }

            let endpoint = SAVE_REQUEST;
            if (selectedMemberSyskey !== '__SELF__') {
                endpoint = SAVE_LEAVE_HR; // "request/saverequesthr" supports ALL request types for subordinates
            }
            payload.fromRequest = 'self_service';

            if (isEdit) {
                endpoint = `${endpoint}/${id}`;
            }

            const res = await apiClient.post(endpoint, payload);
            // Flutter: Neocode.statusIsOk(statuscode) == (status === 300)
            // Any statuscode other than 300 is an error — show message and stay on form
            const sc = Number(res.data?.statuscode);
            if (sc !== 300 && res.data?.status !== 200 && res.data?.status !== 201) {
                // Adjusting condition: sometimes saverequesthr returns standard 200/201 status
                throw new Error(res.data?.message || t('common.error'));
            }
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            toast.success(t('request.submitSuccess'));
            const SUCCESS_RETURN: Record<string, string> = {
                leave: '/leave',
                reservation: '/reservations',
                claim: '/claim',
                offinlieu: '/offinlieu',
                overtime: '/overtime',
                wfh: '/wfh',
                travel: '/travel',
                transportation: '/transportation',
                cashadvance: '/cashadvance',
            };
            navigate(SUCCESS_RETURN[selectedType] || '/requests');
        },
        onError: (err: any) => {
            console.error('Submit error:', err);
            let msg = err instanceof Error ? err.message : t('common.error');
            if (err?.response?.data) {
                const srvData = err.response.data;
                const errDetail = typeof srvData === 'string' ? srvData : (srvData.message || srvData.error || JSON.stringify(srvData));
                msg = `Server Error: ${errDetail}`;
            }
            toast.error(msg, { duration: 6000 });
            // Stay on the form — do NOT navigate
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) {
            toast.error('Please select a request type');
            return;
        }

        if (selectedType === 'leave') {
            if (!leaveType) {
                toast.error('Please select a leave type');
                return;
            }
            if ((flavor === 'prd' || flavor === 'mpt') && !leaveReason) {
                toast.error('Please select a leave reason');
                return;
            }
        }

        // Mirror Flutter requestform_page.dart lines 939-1015
        if (selectedType === 'transportation') {
            if (!transToPlace.trim()) {
                toast.error('Destination place is required for Transportation');
                return;
            }
            if (transGroupType === 'group' && transMembers.length === 0) {
                toast.error('Member is required for Group transportation');
                return;
            }
            const isOneWay = transTripType === '0'; // Flutter: syskey '0' = One Way, '1' = Round Trip
            if (isOneWay) {
                if (!transOneWayStart.trim()) { toast.error('Start location is required'); return; }
                if (!transOneWayEnd.trim()) { toast.error('End location is required'); return; }
            } else if (transTripTypeDesc) {
                // Round trip
                if (!transDepartureStart.trim()) { toast.error('Departure start location is required'); return; }
                if (!transDepartureEnd.trim()) { toast.error('Departure end location is required'); return; }
                if (!transArrivalStart.trim()) { toast.error('Arrival start location is required'); return; }
                if (!transArrivalEnd.trim()) { toast.error('Arrival end location is required'); return; }
            }
        }
        if (selectedType === 'offinlieu') {
            // Mobile: validates shiftStart < shiftEnd
            if (startTime && endTime && startTime >= endTime) {
                toast.error('Start time must be before end time');
                return;
            }
        }
        if (selectedType === 'claim') {
            if (!claimType) {
                toast.error('Please select a claim type');
                return;
            }
            if (!amount || Number(amount) <= 0) {
                toast.error('Amount must be greater than zero');
                return;
            }

            const selClaimType = claimTypeList.find(ct => ct.syskey === claimType);
            if (selClaimType) {
                const maxAmount = Number(selClaimType.max_amount) || 0;
                const remainingBalance = Number(selClaimType.remaining_balance) || 0;
                const reqAmount = Number(amount) || 0;
                if (maxAmount !== 0 && reqAmount > remainingBalance) {
                    toast.error(`Amount cannot exceed remaining balance (${remainingBalance.toLocaleString()})`);
                    return;
                }
            }

            if (!currencyType) {
                toast.error('Please select a currency');
                return;
            }
            if (isTaxiClaimType) {
                if (!claimFromPlace.trim()) { toast.error('From Place is required'); return; }
                if (!claimToPlace.trim()) { toast.error('To Place is required'); return; }
            }
        }
        if (selectedType === 'cashadvance') {
            if (!amount || Number(amount) <= 0) {
                toast.error('Amount must be greater than zero');
                return;
            }
            if (!currencyType) {
                toast.error('Please select a currency');
                return;
            }
        }
        submitMutation.mutate();
    };

    /* ── Map preset type → return page ── */
    const RETURN_PAGE: Record<string, string> = {
        leave: '/leave',
        reservation: '/reservations',
        wfh: '/wfh',
        overtime: '/overtime',
        travel: '/travel',
        transportation: '/transportation',
        claim: '/requests',
        cashadvance: '/cashadvance',
        offinlieu: '/offinlieu',
    };
    const returnPath = RETURN_PAGE[presetType] || '/requests';

    /* ── Map preset type → page title ── */
    const PAGE_TITLES: Record<string, string> = {
        leave: 'Apply Leave',
        overtime: 'New Overtime Request',
        wfh: 'New Work From Home Request',
        transportation: 'New Transportation Request',
        reservation: 'New Reservation',
        travel: 'New Travel Request',
        claim: 'New Claim Request',
        cashadvance: 'New Cash Advance Request',
        other: 'New Request',
    };

    /* ═══════════════════════════════ Render ═════════════════════════ */

    return (
        <div className={styles['new-request']}>
            <button className={styles['new-request__back']} onClick={() => navigate(returnPath)}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className="page-header">
                <h1 className="page-header__title">{presetType ? PAGE_TITLES[presetType] || t('request.newRequest') : t('request.newRequest')}</h1>
                <p className="page-header__subtitle">
                    {presetType ? 'Fill in the details below' : 'Select a type and fill in the details below'}
                </p>
            </div>

            <form className={styles['new-request__card']} onSubmit={handleSubmit}>
                {/* ═════ 1. Request Type Selector (hidden when pre-selected) ═════ */}
                {!presetType && (
                    <TypeCarousel
                        requestTypes={requestTypes}
                        selectedType={selectedType}
                        styles={styles}
                        onSelect={(key) => {
                            if (key === 'attendancerequest') {
                                navigate('/attendancerequest/new');
                            } else {
                                setSelectedType(key);
                            }
                        }}
                    />
                )}

                {selectedType && (
                    <>


                        {/* ═════ 2. Request Details (for RO Proxy) ═════ */}
                        {['leave', 'overtime'].includes(selectedType) && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Details</h3>
                                <div className={styles['new-request__grid']}>
                                    <div className={styles['new-request__full']} style={{ marginBottom: 'var(--space-2)' }}>
                                        <Select
                                            id="employee"
                                            label="Select Employee"
                                            value={selectedMemberSyskey}
                                            onChange={(e) => setSelectedMemberSyskey(e.target.value)}
                                            options={employeeOptions}
                                        />
                                        {selectedMemberSyskey !== '__SELF__' && (
                                            <div className={styles['new-request__member-info-mini']} style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <strong>Employee ID:</strong> {selectedMemberInfo.id}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═════ 3. Date & Time (common — hidden for claim/cashadvance/orgchange/leave) ═════ */}
                        {selectedType !== 'claim' && selectedType !== 'cashadvance' && selectedType !== 'orgchange' && selectedType !== 'leave' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Date & Time</h3>
                                <div className={styles['new-request__grid']}>
                                    {selectedType === 'travel' ? (
                                        <>
                                            <Input id="departureDate" label="Departure Date" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} required />
                                            <Input id="arrivalDate" label="Arrival Date" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} required />
                                        </>
                                    ) : selectedType === 'overtime' ? (
                                        // Overtime: start/end date | start/end time | OT Day + OT Hours
                                        <>
                                            <Input id="startDate" label={t('request.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                            <Input id="endDate" label={t('request.endDate')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                            <Input id="startTime" label={t('request.startTime')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                            <Input id="endTime" label={t('request.endTime')} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                            {/* OT Day + OT Hours — same row, below times */}
                                            <div className={styles['new-request__full']} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                                <Input id="otDays" label="OT Day" type="number" value={otDays} readOnly placeholder="auto" />
                                                <Input id="hour" label="OT Hours" type="number" value={hour} onChange={(e) => setHour(e.target.value)} placeholder="auto-calculated" min="0" step="0.5" readOnly={!!(startTime && endTime)} />
                                            </div>
                                        </>
                                    ) : selectedType === 'offinlieu' ? (
                                        // Off in Lieu: single date + start/end time (no duration) — mirrors mobile
                                        <>
                                            <Input id="startDate" label="Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                            <Input id="startTime" label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                                            <Input id="endTime" label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                                        </>
                                    ) : GENERIC_TYPES.has(selectedType) || selectedType.startsWith('other_') ? (
                                        // General/Employee Requisition/Purchase/Attendance — single date + time
                                        <>
                                            <Input id="startDate" label="Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                            <Input id="startTime" label="Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                        </>
                                    ) : (selectedType === 'claim' || selectedType === 'cashadvance') ? (
                                        // Claim / Cash Advance: single date only — Flutter uses formData['date']
                                        <>
                                            <Input id="startDate" label="Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                        </>
                                    ) : (selectedType === 'late' || selectedType === 'earlyout') ? (
                                        // Late / Early Out: single date + startTime + endTime + auto-calculated duration
                                        <>
                                            <Input id="startDate" label="Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                            <Input id="startTime" label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                                            <Input id="endTime" label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                                            {startTime && endTime && (() => {
                                                const [sh, sm] = startTime.split(':').map(Number);
                                                const [eh, em] = endTime.split(':').map(Number);
                                                const diff = (eh * 60 + em) - (sh * 60 + sm);
                                                if (diff > 0) {
                                                    const hrs = Math.floor(diff / 60);
                                                    const mins = diff % 60;
                                                    return <div className={styles['new-request__full']}>
                                                        <Input id="duration" label="Duration" value={`${hrs} hr ${mins} min`} readOnly />
                                                    </div>;
                                                }
                                                return null;
                                            })()}
                                        </>
                                    ) : (
                                        // Generic fallback: wfh, reservation, and other types not explicitly handled
                                        <>
                                            <Input id="startDate" label={t('request.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                            <Input id="endDate" label={t('request.endDate')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                            <Input id="startTime" label={t('request.startTime')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                            <Input id="endTime" label={t('request.endTime')} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═════ 4. Type-specific fields ═════ */}

                        {/* ── Transportation ── */}
                        {selectedType === 'transportation' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Transportation Details</h3>
                                <div className={styles['new-request__grid']}>

                                    {/* Group / Individual radio — mirrors mobile _buildTransTypeFields Radio widgets */}
                                    <div className={styles['new-request__full']}>
                                        <label className={styles['new-request__label']}>Request For</label>
                                        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" name="transGroupType" value="group"
                                                    checked={transGroupType === 'group'}
                                                    onChange={() => setTransGroupType('group')} />
                                                Group
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" name="transGroupType" value="individual"
                                                    checked={transGroupType === 'individual'}
                                                    onChange={() => setTransGroupType('individual')} />
                                                Individual
                                            </label>
                                        </div>
                                    </div>

                                    {/* Destination place — mobile field: toplace */}
                                    <Input className={styles['new-request__full']}
                                        id="transToPlace"
                                        label="Destination Place"
                                        value={transToPlace}
                                        onChange={(e) => setTransToPlace(e.target.value)}
                                        placeholder="Enter destination…"
                                    />

                                    {/* Trip type from API — mirrors mobile 'traveltype' dropdown */}
                                    {transportTypes.length > 0 && (
                                        <Select
                                            id="transTripType"
                                            label="Travel Type"
                                            value={transTripType}
                                            onChange={(e) => {
                                                const sel = transportTypes.find(t => t.syskey === e.target.value);
                                                setTransTripType(e.target.value);
                                                setTransTripTypeDesc(sel?.description || '');
                                            }}
                                            options={transportTypes.map((t) => ({ value: t.syskey, label: t.description }))}
                                            placeholder="Select travel type…"
                                        />
                                    )}

                                    {/* One Way Trip fields — mirrors Flutter: _selectedTravelType.syskey == '0' */}
                                    {transTripType === '0' && (
                                        <>
                                            <Input className={styles['new-request__full']} id="transOneWayStart" label="Start Location" value={transOneWayStart}
                                                onChange={(e) => setTransOneWayStart(e.target.value)} placeholder="Start location…" />
                                            <Input className={styles['new-request__full']} id="transOneWayEnd" label="End Location" value={transOneWayEnd}
                                                onChange={(e) => setTransOneWayEnd(e.target.value)} placeholder="End location…" />
                                            <Input id="transOneWayStartTime" label="Start Time" type="time" value={transOneWayStartTime}
                                                onChange={(e) => setTransOneWayStartTime(e.target.value)} />
                                            <Input id="transOneWayEndTime" label="End Time" type="time" value={transOneWayEndTime}
                                                onChange={(e) => setTransOneWayEndTime(e.target.value)} />
                                        </>
                                    )}

                                    {/* Round Trip fields — mirrors Flutter: _selectedTravelType.syskey == '1' */}
                                    {transTripType && transTripType !== '0' && (
                                        <>
                                            <div className={styles['new-request__full']} style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Departure</div>
                                            <Input id="transDepartureStart" label="Start Location" value={transDepartureStart}
                                                onChange={(e) => setTransDepartureStart(e.target.value)} placeholder="Departure start…" />
                                            <Input id="transDepartureEnd" label="End Location" value={transDepartureEnd}
                                                onChange={(e) => setTransDepartureEnd(e.target.value)} placeholder="Departure end…" />
                                            <Input id="transDepartureStartTime" label="Start Time" type="time" value={transDepartureStartTime}
                                                onChange={(e) => setTransDepartureStartTime(e.target.value)} />
                                            <Input id="transDepartureEndTime" label="End Time" type="time" value={transDepartureEndTime}
                                                onChange={(e) => setTransDepartureEndTime(e.target.value)} />
                                            <div className={styles['new-request__full']} style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Arrival</div>
                                            <Input id="transArrivalStart" label="Start Location" value={transArrivalStart}
                                                onChange={(e) => setTransArrivalStart(e.target.value)} placeholder="Arrival start…" />
                                            <Input id="transArrivalEnd" label="End Location" value={transArrivalEnd}
                                                onChange={(e) => setTransArrivalEnd(e.target.value)} placeholder="Arrival end…" />
                                            <Input id="transArrivalStartTime" label="Start Time" type="time" value={transArrivalStartTime}
                                                onChange={(e) => setTransArrivalStartTime(e.target.value)} />
                                            <Input id="transArrivalEndTime" label="End Time" type="time" value={transArrivalEndTime}
                                                onChange={(e) => setTransArrivalEndTime(e.target.value)} />
                                        </>
                                    )}
                                </div>

                                {/* Group members — shown only when Group is selected (same as mobile) */}
                                {transGroupType === 'group' && (
                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        <MemberPicker label="Group Members" members={transMembers} onChange={setTransMembers} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Organization Change ── */}
                        {selectedType === 'orgchange' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Organization Change Details</h3>
                                <div className={styles['new-request__grid']}>
                                    {/* ROW 1 */}
                                    <div className={styles['new-request__full']}>
                                        <Select
                                            id="orgUnitSubject"
                                            label="Unit Subject to Change:*"
                                            value={orgUnitSubject}
                                            onChange={(e) => setOrgUnitSubject(e.target.value)}
                                            options={orgUnitSubjects.map(item => ({
                                                value: item.description,
                                                label: item.description
                                            }))}
                                        />
                                    </div>

                                    {/* ROW 2 */}
                                    <Select
                                        id="orgChangeType"
                                        label="Type of Organization Change*"
                                        value={orgChangeType}
                                        onChange={(e) => setOrgChangeType(e.target.value)}
                                        options={orgChangeTypes.map(item => ({
                                            value: item.description,
                                            label: item.description
                                        }))}
                                    />
                                    <Input id="initiatorDivision" label="Initiator's Division" value={user?.division || ''} readOnly />

                                    {/* ROW 3 */}
                                    <FileUpload label="Summary of Change**" files={files} onChange={setFiles} accept=".pdf,.docx,.jpg,.png" />
                                    <Textarea id="orgComment" label="Comment for Summary Change**" value={orgComment} onChange={e => setOrgComment(e.target.value)} placeholder="Test" required />

                                    {/* ROW 4 */}
                                    <Textarea id="orgObjective" label="Objective of Change**" value={orgObjective} onChange={e => setOrgObjective(e.target.value)} placeholder="TEST" required />
                                    <FileUpload label="Employee Reassignment**" files={files} onChange={setFiles} accept=".pdf,.docx,.jpg,.png" />

                                    {/* ROW 5 */}
                                    <div className={styles['new-request__full']} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                                        <label className={styles['new-request__label']} style={{ marginBottom: '8px' }}>Effective Fix Date</label>
                                        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" value="Yes" checked={orgEffectiveFix === 'Yes'} onChange={() => setOrgEffectiveFix('Yes')} /> Yes
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" value="No" checked={orgEffectiveFix === 'No'} onChange={() => setOrgEffectiveFix('No')} /> No
                                            </label>
                                        </div>
                                        {orgEffectiveFix === 'Yes' && (
                                            <div style={{ maxWidth: '50%' }}>
                                                <Input id="orgProposedDate" label="Proposed Effective Date*" type="date" value={orgProposedDate} onChange={e => setOrgProposedDate(e.target.value)} required />
                                            </div>
                                        )}
                                    </div>

                                    {/* ROW 6 */}
                                    <div className={styles['new-request__full']} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                                        <label className={styles['new-request__label']} style={{ marginBottom: '8px' }}>Relocation Requirement</label>
                                        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" value="Yes" checked={orgRelocation === 'Yes'} onChange={() => setOrgRelocation('Yes')} /> Yes
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" value="No" checked={orgRelocation === 'No'} onChange={() => setOrgRelocation('No')} /> No
                                            </label>
                                        </div>
                                        {orgRelocation === 'Yes' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                                <Input id="orgRelocationHeadcounts" label="Headcounts to relocate*" type="number" value={orgRelocationHeadcounts} onChange={e => setOrgRelocationHeadcounts(e.target.value)} required />
                                                <Input id="orgRelocationFrom" label="Relocation [From]:*" value={orgRelocationFrom} onChange={e => setOrgRelocationFrom(e.target.value)} required />
                                                <Input id="orgRelocationTo" label="Relocation [To]:*" value={orgRelocationTo} onChange={e => setOrgRelocationTo(e.target.value)} required />
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles['new-request__full']} style={{ height: '32px' }} /> {/* Spacing */}

                                    {/* ROW 7 */}
                                    <Input id="orgApplicationDate" label="Application Date*" type="date" value={startDate} readOnly />
                                    <Input id="orgDepartment" label="Initiator's Department" value={user?.department || ''} readOnly />

                                    {/* ROW 8 */}
                                    <Input id="orgApplicantName" label="Applicant Name" value={user?.name || ''} readOnly />
                                    <Input id="orgEmployeeID" label="Employee ID" value={user?.userid || ''} readOnly />

                                    {/* ROW 9 */}
                                    <Input id="orgEmail" label="Email" value={user?.email || ''} readOnly />
                                    <div /> {/* Empty */}

                                    {/* ROW 10 */}
                                    <Input id="orgContactNumber" label="Contact Number" value={(user as any)?.phone || ''} readOnly />
                                    <Input id="orgReferenceNumber" label="Reference Number" placeholder="System Will Generate Automatically" readOnly />
                                </div>
                            </div>
                        )}

                        {/* ── Reservation ── */}
                        {selectedType === 'reservation' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Reservation Details</h3>
                                <div className={styles['new-request__grid']}>
                                    <Select
                                        id="reservationType"
                                        label="Reservation Type"
                                        value={subType}
                                        onChange={(e) => setSubType(e.target.value)}
                                        options={reservationTypes.map((r) => ({ value: r.syskey, label: r.description }))}
                                        placeholder="Select type…"
                                    />
                                    <Select
                                        id="room"
                                        label="Rooms"
                                        value={room}
                                        onChange={(e) => {
                                            setRoom(e.target.value);
                                            // Auto-fill maxPeople from the selected room
                                            const selected = roomTypes.find((r) => r.syskey === e.target.value);
                                            if (selected?.maxpeople) {
                                                setMaxPeople(String(selected.maxpeople));
                                            }
                                        }}
                                        options={roomTypes.map((r) => ({ value: r.syskey, label: r.description }))}
                                        placeholder="Select room…"
                                    />
                                    <Input id="maxPeople" label="Max People" type="number" value={maxPeople} onChange={(e) => setMaxPeople(e.target.value)} placeholder="e.g. 10" />
                                </div>
                                <div style={{ marginTop: 'var(--space-4)' }}>
                                    <MemberPicker label="Meeting Participants" members={accompanyPersons} onChange={setAccompanyPersons} />
                                </div>
                            </div>
                        )}

                        {/* ── Travel ── */}
                        {selectedType === 'travel' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Travel Details</h3>
                                <div className={styles['new-request__grid']}>
                                    <Input id="travelDepartureTime" label="Departure Time" type="time" value={travelDepartureTime} onChange={(e) => setTravelDepartureTime(e.target.value)} />
                                    <Input id="travelReturnTime" label="Planned Return" type="time" value={travelReturnTime} onChange={(e) => setTravelReturnTime(e.target.value)} />
                                    {travelTypes.length > 0 && (
                                        <Select id="modeOfTravel" label="Mode of Travel" value={modeOfTravel} onChange={(e) => setModeOfTravel(e.target.value)} options={travelTypes.map((t) => ({ value: t.syskey, label: t.description }))} placeholder="Select…" />
                                    )}
                                    {vehicleUseList.length > 0 && (
                                        <Select id="vehicleUse" label="Vehicle Use" value={vehicleUse} onChange={(e) => setVehicleUse(e.target.value)} options={vehicleUseList.map((v) => ({ value: v.syskey, label: v.description }))} placeholder="Select…" />
                                    )}
                                    {productList.length > 0 && (
                                        <Select id="product" label="Product" value={product} onChange={(e) => setProduct(e.target.value)} options={productList.map((p) => ({ value: p.syskey, label: p.description }))} placeholder="Select…" />
                                    )}
                                    {projectList.length > 0 && (
                                        <Select id="project" label="Project" value={project} onChange={(e) => setProject(e.target.value)} options={projectList.map((p) => ({ value: p.syskey, label: p.description }))} placeholder="Select…" />
                                    )}
                                    <Input id="budget" label="Estimated Budget" type="text" inputMode="decimal" value={formatAmount(estimatedBudget)} onChange={(e) => setEstimatedBudget(unformatAmount(e.target.value))} placeholder="0" />
                                    <div className={styles['new-request__full']}>
                                        <Textarea
                                            id="travelPurpose"
                                            label="Travel Purpose"
                                            value={travelPurpose}
                                            onChange={(e) => setTravelPurpose(e.target.value)}
                                            placeholder="Purpose of this travel…"
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ marginTop: 'var(--space-4)' }}>
                                    <MemberPicker label="Accompanying Persons" members={accompanyPersons} onChange={setAccompanyPersons} />
                                </div>
                            </div>
                        )}

                        {/* ── Overtime ── */}
                        {selectedType === 'overtime' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Overtime Details</h3>
                                <div className={styles['new-request__grid']}>
                                    {productList.length > 0 && (
                                        <Select id="otProduct" label="Product" value={product} onChange={(e) => setProduct(e.target.value)} options={productList.map((p) => ({ value: p.syskey, label: p.description }))} placeholder="Select product…" />
                                    )}
                                    {projectList.length > 0 && (
                                        <Select id="otProject" label="Project" value={project} onChange={(e) => setProject(e.target.value)} options={projectList.map((p) => ({ value: p.syskey, label: p.description }))} placeholder="Select project…" />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Leave ── */}
                        {selectedType === 'leave' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Leave Details</h3>
                                <div className={styles['new-request__full']}>
                                    <Select
                                        id="leaveType"
                                        label="Leave Type"
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        options={leaveTypeList.map((lt) => ({ value: lt.syskey, label: lt.description }))}
                                        placeholder="Select leave type…"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Leave Reason ── */}
                        {(flavor === 'prd' || flavor === 'mpt') && selectedType === 'leave' && (
                            <div className={styles['new-request__full']} style={{ marginBottom: 'var(--space-4)' }}>
                                <Select
                                    id="leaveReason"
                                    label="Leave Reason"
                                    value={leaveReason}
                                    onChange={(e) => setLeaveReason(e.target.value)}
                                    options={leaveReasonsList.map((r) => ({ value: r.syskey, label: r.description }))}
                                    placeholder="Choose your reason..."
                                    required
                                />
                            </div>
                        )}

                        {/* ── Leave Date & Time (placed below Leave Reason) ── */}
                        {selectedType === 'leave' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Date & Time</h3>
                                <div className={styles['new-request__grid']}>
                                    <Input id="startDate" label={t('request.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                    <Select
                                        id="startPeriod"
                                        label={t('request.startTime')}
                                        value={startPeriod}
                                        onChange={(e) => setStartPeriod(e.target.value)}
                                        options={[{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]}
                                    />
                                    <Input id="endDate" label={t('request.endDate')} type="date" value={endDate || startDate} onChange={(e) => setEndDate(e.target.value)} />
                                    <Select
                                        id="endPeriod"
                                        label={t('request.endTime')}
                                        value={endPeriod}
                                        onChange={(e) => setEndPeriod(e.target.value)}
                                        options={[{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }]}
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <style>{`
                                            @keyframes duration-shimmer {
                                                0% { background-position: -200% 0; }
                                                100% { background-position: 200% 0; }
                                            }
                                        `}</style>

                                        {durationLoading ? (
                                            <div>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: 'var(--color-neutral-500)',
                                                    marginBottom: 6,
                                                    letterSpacing: '0.03em',
                                                }}>
                                                    {t('request.duration')}
                                                </label>
                                                <div style={{
                                                    height: 42,
                                                    borderRadius: 8,
                                                    border: '1.5px solid var(--color-neutral-200)',
                                                    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                                                    backgroundSize: '200% 100%',
                                                    animation: 'duration-shimmer 1.2s ease-in-out infinite',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    paddingLeft: 12,
                                                    gap: 8,
                                                }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                        stroke="var(--color-primary-400)" strokeWidth="2.5" strokeLinecap="round"
                                                        style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                    </svg>
                                                    <span style={{ fontSize: '13px', color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>
                                                        Calculating…
                                                    </span>
                                                </div>
                                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                            </div>
                                        ) : (
                                            <Input
                                                id="duration"
                                                label={t('request.duration')}
                                                type="text"
                                                inputMode="decimal"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                placeholder="e.g. 1.5"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── WFH ── */}
                        {selectedType === 'wfh' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Work From Home</h3>
                                <div className={styles['new-request__grid']}>
                                    <div className={styles['new-request__full']}>
                                        <Input id="locationName" label="Location" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Where you'll be working from" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Claim / Cash Advance ── */}
                        {(selectedType === 'cashadvance' || selectedType === 'claim') && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Claim Details</h3>

                                {/* Row 1: Claim Type | Remaining Balance */}
                                {selectedType === 'claim' && (
                                    <div className={styles['new-request__grid']} style={{ marginBottom: 'var(--space-4)' }}>
                                        <Select
                                            id="claimType"
                                            label="Claim Type"
                                            value={claimType}
                                            onChange={(e) => {
                                                setClaimType(e.target.value);
                                                const sel = claimTypeList.find(ct => ct.syskey === e.target.value);
                                                setClaimTypeDesc(sel?.description || '');
                                                setRemainingBalance(sel?.remaining_balance != null ? String(sel.remaining_balance) : '');
                                                setClaimFromPlace('');
                                                setClaimToPlace('');
                                            }}
                                            required
                                            placeholder="Select claim type"
                                            options={claimTypeList.map((ct) => ({ value: ct.syskey, label: ct.description }))}
                                        />
                                        {/* Remaining Balance — only shown when max_amount is set */}
                                        {(() => {
                                            const selCt = claimTypeList.find(ct => ct.syskey === claimType);
                                            const hasMaxAmount = selCt?.max_amount && Number(selCt.max_amount) !== 0;
                                            return hasMaxAmount ? (
                                                <Input
                                                    id="remainingBalance"
                                                    label="Remaining Balance"
                                                    value={remainingBalance
                                                        ? parseFloat(remainingBalance).toLocaleString()
                                                        : '—'}
                                                    readOnly
                                                    disabled
                                                />
                                            ) : null;
                                        })()}
                                    </div>
                                )}

                                {/* Row 2: Date */}
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <Input
                                        id="claimDate"
                                        label="Date"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                    />
                                </div>

                                {/* Row 3: Amount | Currency */}
                                <div className={styles['new-request__grid']}>
                                    <Input
                                        id="amount"
                                        label="Amount"
                                        type="text"
                                        inputMode="decimal"
                                        value={formatAmount(amount)}
                                        onChange={(e) => setAmount(unformatAmount(e.target.value))}
                                        placeholder="0"
                                        required
                                    />
                                    <Select
                                        id="claimCurrency"
                                        label="Currency"
                                        value={currencyType}
                                        onChange={(e) => setCurrencyType(e.target.value)}
                                        placeholder="Select currency"
                                        options={currencyList.map((c) => ({ value: c.syskey, label: c.description }))}
                                    />
                                </div>

                                {/* From / To Place — only for Taxi Fare, Ferry Taxi, Onsite Taxi */}
                                {isTaxiClaimType && (
                                    <div className={styles['new-request__grid']} style={{ marginTop: 'var(--space-4)' }}>
                                        <Input
                                            id="claimFromPlace"
                                            label="From Place"
                                            value={claimFromPlace}
                                            onChange={(e) => setClaimFromPlace(e.target.value)}
                                            placeholder="Origin"
                                            required
                                        />
                                        <Input
                                            id="claimToPlace"
                                            label="To Place"
                                            value={claimToPlace}
                                            onChange={(e) => setClaimToPlace(e.target.value)}
                                            placeholder="Destination"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedType !== 'orgchange' && (
                            <>
                                {/* ═════ 5. Remarks ═════ */}
                                <div className={styles['new-request__section']}>
                                    <h3 className={styles['new-request__section-title']}>Additional Info</h3>
                                    <Textarea
                                        id="remark"
                                        label={isBenefitBonusClaimType ? 'Reason' : t('request.remark')}
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        placeholder="Any additional notes or comments…"
                                    />
                                </div>

                                {/* ═════ 6. Attachments (hidden for reservations) ═════ */}
                                {selectedType !== 'reservation' && (
                                    <div className={styles['new-request__section']}>
                                        <FileUpload
                                            label="Attachments"
                                            files={files}
                                            onChange={setFiles}
                                            accept=".pdf,.docx,.jpg,.png"
                                        />
                                        {existingAttachments.length > 0 && (
                                            <div style={{ marginTop: '12px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '8px' }}>
                                                    Existing Attachments
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {existingAttachments.map((att, i) => {
                                                        // Extract true filename robustly
                                                        let rawName = '';
                                                        if (typeof att === 'string') {
                                                            rawName = att;
                                                        } else if (att && typeof att === 'object') {
                                                            const potentialName = att.filename || att.fileName || att.name || att.filepath || att.filePath || att.url || att.signedURL;
                                                            if (typeof potentialName === 'string') {
                                                                rawName = potentialName;
                                                            } else if (Array.isArray(potentialName) && potentialName.length > 0 && typeof potentialName[0] === 'string') {
                                                                rawName = potentialName[0];
                                                            }
                                                        }
                                                        
                                                        let displayName = typeof rawName === 'string' ? rawName : '';
                                                        
                                                        if (displayName) {
                                                            displayName = displayName.split('/').pop() || displayName;
                                                            displayName = displayName.split('\\').pop() || displayName;
                                                            displayName = displayName.split('?')[0]; // remove query params
                                                        }
                                                        
                                                        displayName = displayName || `File ${i + 1}`;
                                                        
                                                        // Ensure it's absolutely a string to prevent [object Object] rendering issues
                                                        if (typeof displayName !== 'string') {
                                                            displayName = `File ${i + 1}`;
                                                        }

                                                        // Determine icon based on extension
                                                        const ext = displayName.split('.').pop()?.toLowerCase() || '';
                                                        let FileIcon = File;
                                                        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
                                                            FileIcon = ImageIcon;
                                                        } else if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
                                                            FileIcon = FileText;
                                                        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                                                            FileIcon = FileSpreadsheet;
                                                        } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
                                                            FileIcon = FileArchive;
                                                        } else if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
                                                            FileIcon = FileVideo;
                                                        } else if (['mp3', 'wav'].includes(ext)) {
                                                            FileIcon = FileAudio;
                                                        }

                                                        return (
                                                            <div key={i} style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'space-between', 
                                                                padding: '8px 12px', 
                                                                background: 'var(--color-primary-50)', 
                                                                border: '1px solid var(--color-primary-200)', 
                                                                borderRadius: '6px' 
                                                            }}>
                                                                <button type="button" onClick={() => downloadOrOpenAttachment(att)} 
                                                                    style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        gap: '8px', 
                                                                        fontSize: 'var(--text-sm)', 
                                                                        color: 'var(--color-primary-600)', 
                                                                        background: 'none', 
                                                                        border: 'none', 
                                                                        cursor: 'pointer', 
                                                                        padding: 0,
                                                                        textAlign: 'left'
                                                                    }}
                                                                    title={displayName}
                                                                >
                                                                    <FileIcon size={16} color="var(--color-primary-500)" />
                                                                    <span style={{ fontWeight: 500 }}>{displayName}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExistingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center', padding: 4 }}
                                                                    title="Remove Attachment"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ═════ 7. Approvers ═════ */}
                                <div className={styles['new-request__section']}>
                                    <MemberPicker
                                        label="Approvers"
                                        members={approvers}
                                        onChange={setApprovers}
                                        excludeSyskeys={[
                                            selectedMemberInfo?.syskey,
                                            selectedMemberInfo?.id,
                                            selectedMemberInfo?.userid,
                                            userId,
                                            user?.usersyskey,
                                            (user as any)?.syskey,
                                            (user as any)?.eid,
                                            (user as any)?.employee_id
                                        ].filter(Boolean) as string[]}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {/* ── Leave-specific handover ── */}
                        {selectedType === 'leave' && (
                            <div className={styles['new-request__section']}>
                                <MemberPicker
                                    label="Handover Persons"
                                    members={handovers}
                                    onChange={setHandovers}
                                />
                            </div>
                        )}

                        {/* ═════ 8. Submit ═════ */}
                        <div className={styles['new-request__footer']}>
                            <Button type="button" variant="secondary" onClick={() => navigate(presetType === 'reservation' ? '/reservations' : presetType === 'leave' ? '/leave' : '/requests')}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" loading={submitMutation.isPending}>
                                {t('request.submit')}
                            </Button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
