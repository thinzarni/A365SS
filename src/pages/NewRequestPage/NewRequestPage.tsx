import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    TRANSPORTATION_TYPES,
    CARS_LIST,
    DRIVERS_LIST,
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
    cashadvance: 'Cash Advance',
    other: 'General',
};

/* ══════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════ */

export default function NewRequestPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const presetType = searchParams.get('type') || '';

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

    // ── Transportation-specific ──
    const [pickupPlace, setPickupPlace] = useState('');
    const [dropoffPlace, setDropoffPlace] = useState('');
    const [isGoing, setIsGoing] = useState(true);
    const [isReturn, setIsReturn] = useState(false);
    const [userLeaveTime, setUserLeaveTime] = useState(nowTimeStr);
    const [arrivalTime, setArrivalTime] = useState(nowTimeStr);
    const [returnTime, setReturnTime] = useState(nowTimeStr);
    const [car, setCar] = useState('');
    const [driver, setDriver] = useState('');

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
    const [otDay, setOtDay] = useState(todayStr);
    const [hour, setHour] = useState('');

    // ── Cash Advance-specific ──
    const [amount, setAmount] = useState('');
    const [currencyType, setCurrencyType] = useState('');

    // ── Location (WFH) ──
    const [locationName, setLocationName] = useState('');

    // ── Shared ──
    const [approvers, setApprovers] = useState<MemberItem[]>([]);
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

    const { data: transportTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['transportTypes'],
        queryFn: async () => {
            const res = await apiClient.post(TRANSPORTATION_TYPES, {});
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'transportation',
    });

    const { data: carsList = [] } = useQuery<TypesModel[]>({
        queryKey: ['carsList'],
        queryFn: async () => {
            const res = await apiClient.post(CARS_LIST, {});
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'transportation',
    });

    const { data: driversList = [] } = useQuery<TypesModel[]>({
        queryKey: ['driversList'],
        queryFn: async () => {
            const res = await apiClient.post(DRIVERS_LIST, {});
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'transportation',
    });

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
            const res = await apiClient.post(PRODUCT_LIST, {});
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel',
    });

    const { data: projectList = [] } = useQuery<TypesModel[]>({
        queryKey: ['projectList'],
        queryFn: async () => {
            const res = await apiClient.post(PROJECT_LIST, {});
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel',
    });

    const { data: travelTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['modeOfTravel'],
        queryFn: async () => {
            const res = await apiClient.post(TRAVEL_TYPE_LIST, {});
            return res.data?.datalist || [];
        },
        enabled: selectedType === 'travel',
    });

    const { data: vehicleUseList = [] } = useQuery<TypesModel[]>({
        queryKey: ['vehicleUseList'],
        queryFn: async () => {
            const res = await apiClient.post(VEHICLE_USE_LIST, {});
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
                requestsubtype: subType,
                remark,
                reason: remark || null,
                description: remark || null,
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
                selectedHandovers: [],
                attachment: [],
            };

            /* ── Date / time formatting depends on request type ── */
            if (selectedType === 'reservation') {
                // Reservation: startdate=yyyyMMdd, enddate='', times in 12h
                payload.startdate = toApiDate(startDate);
                payload.enddate = '';
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.date = '';
                payload.selectday = '';
                payload.otday = '';
                payload.maxpeople = Number(maxPeople) || 0;
                payload.rooms = room;
                // Find room description
                const selRoom = roomTypes.find((r) => r.syskey === room);
                payload.roomsdesc = selRoom?.description || '';
                // Find reservation sub-type description
                const selResType = reservationTypes.find((r) => r.syskey === subType);
                payload.requestsubtypedesc = selResType?.description || '';
                // Reservation auto-approved (status 2)
                payload.requeststatus = 2;
                // Meeting participants
                if (accompanyPersons.length > 0) {
                    payload.selectedMembers = accompanyPersons.map((p) => ({
                        syskey: p.syskey,
                        name: p.name,
                        userid: '',
                        profilestatus: 0,
                        profile: '',
                        eid: p.employeeid || '',
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
                    }));
                }
            } else if (selectedType === 'leave' || selectedType === 'wfh') {
                payload.startdate = toApiDate(startDate);
                payload.enddate = toApiDate(endDate || startDate);
                payload.date = '';
                payload.selectday = '';
                payload.otday = '';
                payload.requeststatus = 1;
                if (selectedType === 'leave') {
                    // Leave uses AM/PM for time, not full HH:mm
                    payload.starttime = startPeriod;
                    payload.endtime = endPeriod;
                    payload.duration = duration;
                    // Set requestsubtype to the selected leave type (e.g. Casual Leave)
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
                payload.selectday = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.date = '';
                payload.otday = '';
                payload.starttime = '';
                payload.endtime = '';
                payload.pickupplace = pickupPlace;
                payload.dropoffplace = dropoffPlace;
                payload.isgoing = isGoing;
                payload.isreturn = isReturn;
                payload.userleavetime = '';
                payload.arrivaltime = isGoing ? toApi12hTime(arrivalTime) : '';
                payload.returntime = isReturn ? toApi12hTime(returnTime) : '';
                payload.car = car;
                payload.driver = driver;
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
                if (accompanyPersons.length > 0) {
                    payload.selectedAcconpanyPersons = accompanyPersons.map((p) => ({ syskey: p.syskey, name: p.name }));
                }
            } else if (selectedType === 'overtime') {
                payload.startdate = toApiDate(startDate);
                payload.enddate = toApiDate(endDate || startDate);
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.otday = '';
                payload.date = '';
                payload.selectday = '';
                payload.hour = hour;
                payload.requeststatus = 1;
            } else if (selectedType === 'cashadvance') {
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.amount = Number(unformatAmount(String(amount))) || 0;
                payload.currencytype = currencyType;
                payload.requeststatus = 1;
            } else {
                // General / Other
                payload.date = toApiDate(startDate);
                payload.startdate = '';
                payload.enddate = '';
                payload.selectday = '';
                payload.otday = '';
                payload.starttime = toApi12hTime(startTime);
                payload.endtime = toApi12hTime(endTime);
                payload.requeststatus = 1;
            }

            const res = await apiClient.post(SAVE_REQUEST, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success(t('request.submitSuccess'));
            const SUCCESS_RETURN: Record<string, string> = { leave: '/leave', reservation: '/reservations' };
            navigate(SUCCESS_RETURN[selectedType] || '/requests');
        },
        onError: (err: unknown) => {
            console.error('Submit error:', err);
            toast.error(t('common.error'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) {
            toast.error('Please select a request type');
            return;
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
                                    <>
                                        <Input id="otDay" label="OT Day" type="date" value={otDay} onChange={(e) => setOtDay(e.target.value)} required />
                                        <Input id="hour" label="Hours" type="number" value={hour} onChange={(e) => setHour(e.target.value)} placeholder="e.g. 2" required />
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
                                ) : (
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
                                    {transportTypes.length > 0 && (
                                        <Select
                                            id="transportSubType"
                                            label="Transport Type"
                                            value={subType}
                                            onChange={(e) => setSubType(e.target.value)}
                                            options={transportTypes.map((t) => ({ value: t.syskey, label: t.description }))}
                                            placeholder="Select…"
                                        />
                                    )}
                                    <Input id="pickup" label="Pick-up Place" value={pickupPlace} onChange={(e) => setPickupPlace(e.target.value)} placeholder="Building / Location" />
                                    <Input id="dropoff" label="Drop-off Place" value={dropoffPlace} onChange={(e) => setDropoffPlace(e.target.value)} placeholder="Destination" />
                                    <Input id="leaveTime" label="Leave Time" type="time" value={userLeaveTime} onChange={(e) => setUserLeaveTime(e.target.value)} />
                                    <Input id="arrivalTimeInput" label="Arrival Time" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />

                                    <div className={`${styles['new-request__full']} ${styles['new-request__grid']}`} style={{ gap: 'var(--space-4)' }}>
                                        <label className={styles['new-request__checkbox-row']}>
                                            <input type="checkbox" checked={isGoing} onChange={(e) => setIsGoing(e.target.checked)} /> Going
                                        </label>
                                        <label className={styles['new-request__checkbox-row']}>
                                            <input type="checkbox" checked={isReturn} onChange={(e) => setIsReturn(e.target.checked)} /> Return trip
                                        </label>
                                    </div>

                                    {isReturn && (
                                        <Input id="returnTimeInput" label="Return Time" type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
                                    )}

                                    {carsList.length > 0 && (
                                        <Select id="car" label="Car" value={car} onChange={(e) => setCar(e.target.value)} options={carsList.map((c) => ({ value: c.syskey, label: c.description }))} placeholder="Select car…" />
                                    )}
                                    {driversList.length > 0 && (
                                        <Select id="driver" label="Driver" value={driver} onChange={(e) => setDriver(e.target.value)} options={driversList.map((d) => ({ value: d.syskey, label: d.description }))} placeholder="Select driver…" />
                                    )}
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
