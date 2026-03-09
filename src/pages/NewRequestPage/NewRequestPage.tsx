import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
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
} from '../../config/api-routes';
import type { LeaveType } from '../../types/models';
import { formatAmount, unformatAmount } from '../../lib/format-utils';
import styles from './NewRequestPage.module.css';

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

interface RequestTypeConfig {
    key: string;
    label: string;
    icon: React.FC<{ size?: number }>;
    color: string;
    bgColor: string;
}

const REQUEST_TYPE_CONFIGS: RequestTypeConfig[] = [
    { key: 'leave', label: 'Leave', icon: Palmtree, color: '#16a34a', bgColor: '#f0fdf4' },
    { key: 'overtime', label: 'Overtime', icon: Clock, color: '#d97706', bgColor: '#fef3c7' },
    { key: 'wfh', label: 'Work from Home', icon: Home, color: '#2563eb', bgColor: '#eff6ff' },
    { key: 'transportation', label: 'Transportation', icon: Car, color: '#9333ea', bgColor: '#faf5ff' },
    { key: 'reservation', label: 'Reservation', icon: Calendar, color: '#0891b2', bgColor: '#ecfeff' },
    { key: 'travel', label: 'Travel', icon: Plane, color: '#ea580c', bgColor: '#fff7ed' },
    { key: 'claim', label: 'Claim', icon: Banknote, color: '#dc2626', bgColor: '#fef2f2' },
    { key: 'cashadvance', label: 'Cash Advance', icon: Banknote, color: '#dc2626', bgColor: '#fef2f2' },
    { key: 'other', label: 'Other', icon: FileText, color: '#64748b', bgColor: '#f1f5f9' },
];

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

/* ── Map UI key → API description for matching requestTypes ── */
const TYPE_DESC_MAP: Record<string, string> = {
    leave: 'Leave',
    overtime: 'Overtime',
    wfh: 'Work From Home',
    transportation: 'Transportation',
    reservation: 'Reservation',
    travel: 'Travel',
    claim: 'Claim',          // mirrors mobile: requestTypes.firstWhere(t => t.description == 'Claim')
    cashadvance: 'Cash Advance',
    other: 'General',
};

/* ══════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════ */

export default function NewRequestPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Derive preset type from URL path (most reliable) then fall back to ?type= query param.
    // e.g. /transportation/new → 'transportation', /claim/new → 'claim'
    const PATH_TO_TYPE: Record<string, string> = {
        '/claim/new': 'claim',
        '/overtime/new': 'overtime',
        '/wfh/new': 'wfh',
        '/transportation/new': 'transportation',
        '/travel/new': 'travel',
        '/cashadvance/new': 'cashadvance',
    };
    const presetType = PATH_TO_TYPE[location.pathname] || searchParams.get('type') || '';

    // ── Request type / subtype ──
    const [selectedType, setSelectedType] = useState(presetType);
    const [subType, setSubType] = useState('');
    const [leaveType, setLeaveType] = useState('');

    // ── Leave-specific AM/PM & duration ──
    const [startPeriod, setStartPeriod] = useState('AM');
    const [endPeriod, setEndPeriod] = useState('AM');
    const [duration, setDuration] = useState('1');

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
    const [fromPlace, setFromPlace] = useState('');
    const [toPlace, setToPlace] = useState('');
    const [modeOfTravel, setModeOfTravel] = useState('');
    const [vehicleUse, setVehicleUse] = useState('');
    const [product, setProduct] = useState('');
    const [project, setProject] = useState('');
    const [estimatedBudget, setEstimatedBudget] = useState('');
    const [departureDate, setDepartureDate] = useState(todayStr);
    const [arrivalDate, setArrivalDate] = useState(todayStr);

    // ── Overtime-specific ──
    const [hour, setHour] = useState('');
    const [otDays, setOtDays] = useState('0');

    // ── Cash Advance-specific ──
    const [amount, setAmount] = useState('');
    const [currencyType, setCurrencyType] = useState('');

    // ── Location (WFH) ──
    const [locationName, setLocationName] = useState('');

    // ── Shared ──
    const [approvers, setApprovers] = useState<MemberItem[]>([]);
    const [transMembers, setTransMembers] = useState<MemberItem[]>([]); // transportation group members (separate from approvers)
    const [accompanyPersons, setAccompanyPersons] = useState<MemberItem[]>([]);
    const [handovers, setHandovers] = useState<MemberItem[]>([]);
    const [files, setFiles] = useState<File[]>([]);

    // ── API Queries for lookups ──
    const { data: requestTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['requestTypes'],
        queryFn: async () => {
            const res = await apiClient.get(REQUEST_TYPES);
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

    // Reset sub-fields when type changes; auto-default subType for ALL types
    useEffect(() => {
        setSubType('');
        setLeaveType('');
        setStartPeriod('AM');
        setEndPeriod('AM');
        if (selectedType && requestTypes.length > 0) {
            const typeDesc = TYPE_DESC_MAP[selectedType] || selectedType;
            const match = requestTypes.find(
                (t) => t.description.trim().toLowerCase() === typeDesc.toLowerCase()
            );
            if (match) setSubType(match.syskey);
        }
    }, [selectedType, requestTypes]);

    // Auto-calculate leave duration when dates or periods change
    useEffect(() => {
        if (selectedType === 'leave') {
            setDuration(calcLeaveDuration(startDate, endDate, startPeriod, endPeriod));
        }
    }, [selectedType, startDate, endDate, startPeriod, endPeriod]);

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
        'reservation', 'earlyout', 'late', 'offinlieu'];
    useEffect(() => {
        if (!TIME_RANGE_TYPES.includes(selectedType) || !startTime) return;
        const [h, m] = startTime.split(':').map(Number);
        const newH = (h + 1) % 24;
        setEndTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startTime, selectedType]);

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
            /* ── Resolve type description from shared map ── */
            const typeDesc = TYPE_DESC_MAP[selectedType] || selectedType;

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
            const matchedType = types.find(
                (t: TypesModel) => t.description.trim().toLowerCase() === typeDesc.toLowerCase()
            );
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
                requesttype: typeSyskey,
                requesttypedesc: typeDesc,
                requestsubtype: subType,        // addIfEmpty — always sent
                requestsubtypedesc: '',          // addIfEmpty — always sent
                remark,
                reason: remark || null,
                description: remark || null,
                travelpurpose: remark || null,
                car: null,
                driver: null,
                comment: null,
                currencytype: '',               // addIfEmpty
                selectedApprovers: approvers.map((a) => ({
                    syskey: a.syskey,
                    name: a.name,
                    userid: '',
                    profilestatus: 0,
                    profile: '',
                    eid: a.employeeid || '',
                    signedURL: '',
                    status: '4',
                    pickupplace: '',
                    dropoffplace: '',
                    leaveDateRange: '',
                    timeintime: '',
                    timeouttime: '',
                    attendancevalidation: true,
                    timeinoffset: '',
                    timeoutoffset: '',
                })),
                selectedAcconpanyPersons: [],   // always sent (Flutter line 424-429)
                selectedHandovers: [],
                attachment: attachmentFileNames,  // Flutter: data.attachment = _attachmentPaths.map((a) => a['fileName']!).toList()
                ottype: 0,                      // always sent for non-overtime
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
                payload.requeststatus = 1;
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
                    payload.selectedHandovers = handovers.map((h) => ({ syskey: h.syskey, name: h.name }));
                } else {
                    payload.starttime = toApi12hTime(startTime);
                    payload.endtime = toApi12hTime(endTime);
                }
                if (selectedType === 'wfh') {
                    payload.locationname = locationName;
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
                payload.requeststatus = 1;
            } else if (selectedType === 'travel') {
                payload.departuredate = toApiDate(departureDate);
                payload.arrivaldate = toApiDate(arrivalDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.date = '';
                payload.selectday = '';
                payload.otday = '';
                payload.fromPlace = fromPlace;
                payload.toPlace = toPlace;
                payload.modeoftravel = modeOfTravel ? [modeOfTravel] : [];
                payload.vehicleuse = vehicleUse ? [vehicleUse] : [];
                payload.product = product;
                payload.project = project;
                payload.estimatedbudget = Number(unformatAmount(String(estimatedBudget))) || 0;
                payload.travelpurpose = remark || null;
                payload.requeststatus = 1;
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
                payload.requeststatus = 1;
            } else if (selectedType === 'cashadvance' || selectedType === 'claim') {
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.amount = Number(unformatAmount(String(amount))) || 0;
                payload.currencytype = currencyType;
                payload.requeststatus = 1;
            } else {
                // General / Employee Requisition / Purchase — Flutter: uses date + time only (no start/end date/time)
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.time = toApi12hTime(startTime);  // Flutter: formData['time'] = single time field
                payload.requeststatus = 1;
            }

            const res = await apiClient.post(SAVE_REQUEST, payload);
            // Flutter: Neocode.statusIsOk(statuscode) == (status === 300)
            // Any statuscode other than 300 is an error — show message and stay on form
            const sc = Number(res.data?.statuscode);
            if (sc !== 300) {
                throw new Error(res.data?.message || t('common.error'));
            }
            return res.data;
        },
        onSuccess: () => {
            toast.success(t('request.submitSuccess'));
            const SUCCESS_RETURN: Record<string, string> = {
                leave: '/leave',
                reservation: '/reservations',
                claim: '/claim',
            };
            navigate(SUCCESS_RETURN[selectedType] || '/requests');
        },
        onError: (err: unknown) => {
            console.error('Submit error:', err);
            const msg = err instanceof Error ? err.message : t('common.error');
            toast.error(msg);
            // Stay on the form — do NOT navigate
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) {
            toast.error('Please select a request type');
            return;
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
        submitMutation.mutate();
    };

    /* ── Map preset type → return page ── */
    const RETURN_PAGE: Record<string, string> = {
        leave: '/leave',
        reservation: '/reservations',
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
                    <div className={styles['new-request__section']}>
                        <h3 className={styles['new-request__section-title']}>Request Type</h3>
                        <div className={styles['new-request__type-grid']}>
                            {REQUEST_TYPE_CONFIGS.map(({ key, label, icon: Icon, color, bgColor }) => (
                                <div
                                    key={key}
                                    className={`${styles['new-request__type-card']} ${selectedType === key ? styles['new-request__type-card--active'] : ''}`}
                                    onClick={() => setSelectedType(key)}
                                >
                                    <div
                                        className={styles['new-request__type-card-icon']}
                                        style={{ background: bgColor, color }}
                                    >
                                        <Icon size={22} />
                                    </div>
                                    <span className={styles['new-request__type-card-label']}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedType && (
                    <>
                        {/* ═════ 2. Sub-type selector (if API has types, hidden for leave — auto-set) ═════ */}
                        {requestTypes.length > 0 && selectedType !== 'leave' && (
                            <div className={styles['new-request__section']}>
                                <div className={styles['new-request__grid']}>
                                    <Select
                                        id="subType"
                                        label="Sub-type"
                                        placeholder="Select sub-type…"
                                        value={subType}
                                        onChange={(e) => setSubType(e.target.value)}
                                        options={requestTypes.map((t) => ({ value: t.syskey, label: t.description }))}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ═════ 3. Date & Time (common) ═════ */}
                        <div className={styles['new-request__section']}>
                            <h3 className={styles['new-request__section-title']}>Date & Time</h3>
                            <div className={styles['new-request__grid']}>
                                {selectedType === 'travel' ? (
                                    <>
                                        <Input id="departureDate" label="Departure Date" type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} required />
                                        <Input id="arrivalDate" label="Arrival Date" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} required />
                                    </>
                                ) : selectedType === 'overtime' ? (
                                    // Overtime: start/end date | OT Day + OT Hours in one row | start/end time
                                    <>
                                        <Input id="startDate" label={t('request.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                        <Input id="endDate" label={t('request.endDate')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                        {/* OT Day + OT Hours — same row */}
                                        <div className={styles['new-request__full']} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                            <Input id="otDays" label="OT Day" type="number" value={otDays} readOnly placeholder="auto" />
                                            <Input id="hour" label="OT Hours" type="number" value={hour} onChange={(e) => setHour(e.target.value)} placeholder="auto-calculated" min="0" step="0.5" readOnly={!!(startTime && endTime)} />
                                        </div>
                                        <Input id="startTime" label={t('request.startTime')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                        <Input id="endTime" label={t('request.endTime')} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                    </>
                                ) : selectedType === 'leave' ? (
                                    <>
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
                                        <div className={styles['new-request__full']}>
                                            <Input
                                                id="duration"
                                                label={t('request.duration')}
                                                type="text"
                                                inputMode="decimal"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value)}
                                                placeholder="e.g. 1.5"
                                            />
                                        </div>
                                    </>
                                ) : (selectedType === 'general' || selectedType === 'employeerequisition' || selectedType === 'purchase' || selectedType === 'other') ? (
                                    // Flutter: General/Employee Requisition/Purchase use single date + time only
                                    <>
                                        <Input id="startDate" label="Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                        <Input id="startTime" label="Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                    </>
                                ) : (
                                    // Generic: wfh, cashadvance, claim, reservation, earlyout, late, offinlieu
                                    // Auto-sync handled centrally via useEffect above
                                    <>
                                        <Input id="startDate" label={t('request.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                        <Input id="endDate" label={t('request.endDate')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                        <Input id="startTime" label={t('request.startTime')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                        <Input id="endTime" label={t('request.endTime')} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                    </>
                                )}
                            </div>
                        </div>

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
                                    <Input id="fromPlace" label="From" value={fromPlace} onChange={(e) => setFromPlace(e.target.value)} placeholder="Origin" required />
                                    <Input id="toPlace" label="To" value={toPlace} onChange={(e) => setToPlace(e.target.value)} placeholder="Destination" required />
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
                                <div className={styles['new-request__grid']}>
                                    <Select
                                        id="leaveType"
                                        label="Leave Type"
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        options={leaveTypeList.map((lt) => ({ value: lt.syskey, label: lt.description }))}
                                        placeholder="Select leave type…"
                                    />
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

                        {/* ── Cash Advance ── */}
                        {selectedType === 'cashadvance' && (
                            <div className={styles['new-request__section']}>
                                <h3 className={styles['new-request__section-title']}>Cash Advance</h3>
                                <div className={styles['new-request__grid']}>
                                    <Input id="amount" label="Amount" type="text" inputMode="decimal" value={formatAmount(amount)} onChange={(e) => setAmount(unformatAmount(e.target.value))} placeholder="0" required />
                                    <Input id="currency" label="Currency" value={currencyType} onChange={(e) => setCurrencyType(e.target.value)} placeholder="e.g. MMK, USD" />
                                </div>
                            </div>
                        )}

                        {/* ═════ 5. Remarks ═════ */}
                        <div className={styles['new-request__section']}>
                            <h3 className={styles['new-request__section-title']}>Additional Info</h3>
                            <Textarea
                                id="remark"
                                label={t('request.remark')}
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
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                />
                            </div>
                        )}

                        {/* ═════ 7. Approvers ═════ */}
                        <div className={styles['new-request__section']}>
                            <MemberPicker
                                label="Approvers"
                                members={approvers}
                                onChange={setApprovers}
                                required
                            />
                        </div>

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
