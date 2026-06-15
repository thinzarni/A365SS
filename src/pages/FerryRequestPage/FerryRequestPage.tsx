/**
 * FerryRequestPage — FORM ONLY
 *
 * Handles /ferry/new (new) and /ferry/:id (edit/view).
 * The list is handled by RequestListPage (PATH_TYPE_MAP '/ferry').
 *
 * Sub-types come from REQUEST_TYPES API filtered to items whose description
 * contains "ferry" or "hr compliant" — exactly as Flutter does.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Bus, Car, Loader2,
    Phone, MapPin, CheckCircle2, XCircle, Clock,
    UserCheck, Paperclip, Calendar, Trash2, Building2,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { Textarea } from '../../components/ui/Input/Input';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import MemberPicker from '../../components/shared/MemberPicker/MemberPicker';
import type { MemberItem } from '../../components/shared/MemberPicker/MemberPicker';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import ApprovalWorkflowModal from '../../components/modals/ApprovalWorkflowModal';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    REQUEST_TYPES,
    GET_REQUEST_DETAIL,
    SAVE_REQUEST,
    PHOTO_UPLOAD,
    FERRY_WORKING_HOURS,
    FERRY_CHANGE_TYPES,
    FERRY_CHANGE_PURPOSES,
    FERRY_OFFICE_LOCATIONS,
    FERRY_ASSIGNED_FERRY_NO,
    USER_PROFILE,
} from '../../config/api-routes';
import type { TypesModel } from '../../types/models';
import { useAuthStore } from '../../stores/auth-store';
import { appConfig } from '../../config/app-config';
import { downloadOrOpenAttachment } from '../../lib/file-utils';
import styles from './FerryRequestPage.module.css';

/* ─────────────────────────────────────────────────
   Types
───────────────────────────────────────────────── */
const FerryRequestType = {
    registration: 'registration',
    change: 'change',
    usercomplaint: 'usercomplaint',
    hrcomplaint: 'hrcomplaint',
} as const;

type FerryRequestType = typeof FerryRequestType[keyof typeof FerryRequestType];

interface FerryTypeOption {
    label: string;
    value: FerryRequestType;
    syskey: string;
    approvaltype?: string | null;
}

interface FerrySetupItem {
    syskey: string;
    code: string;
    description: string;
    name?: string;
    carno?: string;
    officeLocationName?: string;
    ferryCarNo?: string;
    carno?: string;
    name?: string;
}

/* ─────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────── */
function toApiDate(d: string) { return d ? d.replace(/-/g, '') : ''; }

function fromApiDate(d: string) {
    if (!d || d.length < 8) return '';
    if (d.includes('-')) return d.split('T')[0];
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function formatDisplayDate(dateStr: string) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIndex = Number(month) - 1;
    if (isNaN(mIndex) || mIndex < 0 || mIndex > 11) return dateStr;
    return `${day} ${months[mIndex]} ${year}`;
}

const DateInput = ({ id, label, value, onChange, readOnly, error, rightIcon }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <Input
            id={id}
            label={label}
            type={readOnly ? 'text' : (focused ? 'date' : 'text')}
            value={readOnly || !focused ? formatDisplayDate(value) : value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            readOnly={readOnly}
            error={error}
            rightIcon={(!focused && rightIcon) ? rightIcon : undefined}
        />
    );
};

function descToFerryType(desc: string): FerryRequestType {
    const d = desc.toLowerCase();
    if (d.includes('registration') || d.includes('new')) return FerryRequestType.registration;
    if (d.includes('change')) return FerryRequestType.change;
    if (d.includes('hr')) return FerryRequestType.hrcomplaint;
    return FerryRequestType.usercomplaint;
}

const COMPLAINT_OPTS = [
    { id: '1', label: 'Driver Behaviour' },
    { id: '2', label: 'Vehicle Condition' },
    { id: '3', label: 'Other' },
];

/* ═══════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════ */
export default function FerryRequestPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { user, userId, domain } = useAuthStore();

    const isHrComplaintView = location.pathname.startsWith('/hr_complaint') || location.pathname.startsWith('/hrcomplaint');
    const basePath = isHrComplaintView ? (location.pathname.startsWith('/hr_complaint') ? '/hr_complaint' : '/hrcomplaint') : '/ferry_request';

    const isNew = !id;

    /* ───────── Request Types from API (filtered for ferry) ───────── */
    const { data: allRequestTypes = [] } = useQuery<TypesModel[]>({
        queryKey: ['requestTypes'],
        queryFn: async () => {
            const res = await apiClient.get(REQUEST_TYPES);
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const ferryTypeOptions: FerryTypeOption[] = (() => {
        const raw = allRequestTypes.filter((t) => {
            const d = (t.description ?? '').toLowerCase();
            if (isHrComplaintView) {
                return d.includes('hr compliant') || d.includes('hr complaint') || d.includes('hrcomplaint');
            }
            return d.includes('ferry');
        });
        const options: FerryTypeOption[] = raw.map((t) => ({
            label: t.description,
            value: descToFerryType(t.description),
            syskey: t.syskey,
            approvaltype: (t as any).approvaltype ?? null,
        }));
        const ORDER = isHrComplaintView
            ? [FerryRequestType.hrcomplaint]
            : [FerryRequestType.registration, FerryRequestType.change, FerryRequestType.usercomplaint];
        options.sort((a, b) => ORDER.indexOf(a.value) - ORDER.indexOf(b.value));
        return options;
    })();

    /* ───────── Ferry Setup APIs ───────── */
    const { data: workingHours = [] } = useQuery<FerrySetupItem[]>({
        queryKey: ['ferryWorkingHours'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_WORKING_HOURS, { params: { userid: userId, domain } });
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const { data: changeTypes = [] } = useQuery<FerrySetupItem[]>({
        queryKey: ['ferryChangeTypes'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_CHANGE_TYPES, { params: { userid: userId, domain } });
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const { data: changePurposes = [] } = useQuery<FerrySetupItem[]>({
        queryKey: ['ferryChangePurposes'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_CHANGE_PURPOSES, { params: { userid: userId, domain } });
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const { data: officeLocations = [] } = useQuery<FerrySetupItem[]>({
        queryKey: ['ferryOfficeLocations'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_OFFICE_LOCATIONS, { params: { userid: userId, domain } });
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const { data: ferryNos = [] } = useQuery<FerrySetupItem[]>({
        queryKey: ['ferryAssignedNos'],
        queryFn: async () => {
            const res = await apiClient.get(FERRY_ASSIGNED_FERRY_NO, { params: { userid: userId, domain } });
            return res.data?.datalist ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });

    /* ───────── Employee Profile (for ferryno) ───────── */
    const { data: employeeProfile } = useQuery({
        queryKey: ['employee-profile', (user as any)?.userid],
        queryFn: async () => {
            try {
                const res = await mainClient.post(USER_PROFILE, { userid: (user as any)?.userid });
                return res.data?.data ?? res.data ?? null;
            } catch {
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const profileFerryNo: string = (employeeProfile as any)?.ferryno ?? '';

    /* ───────── Detail (edit mode) ───────── */
    const { data: detailRes, isLoading: detailLoading } = useQuery({
        queryKey: ['ferryDetail', id],
        queryFn: async () => {
            const res = await apiClient.post(GET_REQUEST_DETAIL, { syskey: id });
            return res.data ?? null;
        },
        enabled: !!id,
    });
    const dl = detailRes?.datalist;
    const detail = Array.isArray(dl) ? (dl[0] || {}) : (dl || {});
    const detailApprovers: any[] = detailRes?.approverList ?? [];
    const stepLevelData: any[] = detailRes?.stepLevelData ?? [];

    /* ═══════════════════════════════════════════════
       FORM STATE
    ═══════════════════════════════════════════════ */
    const [selectedOpt, setSelectedOpt] = useState<FerryTypeOption | null>(null);
    const [selectedType, setSelectedType] = useState<FerryRequestType>(
        isHrComplaintView ? FerryRequestType.hrcomplaint : FerryRequestType.registration
    );
    const [approvalType, setApprovalType] = useState<string | null>('0');

    // Common
    const [phoneNumber, setPhoneNumber] = useState('');
    const [currentFerryNo, setCurrentFerryNo] = useState('');
    const [remark, setRemark] = useState('');
    const [approvers, setApprovers] = useState<MemberItem[]>([]);
    const [files, setFiles] = useState<File[]>([]);

    // Registration fields
    const [workingHourSyskey, setWorkingHourSyskey] = useState('');
    const [mainRoad, setMainRoad] = useState('');
    const [busStop, setBusStop] = useState('');
    const [township, setTownship] = useState('');

    // Change fields
    const [changeTypeSyskey, setChangeTypeSyskey] = useState('');
    const [changePurposeSyskey, setChangePurposeSyskey] = useState('');
    const [officeLocationSyskey, setOfficeLocationSyskey] = useState('');
    const [officeChangeStartDate, setOfficeChangeStartDate] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [homeMainRoad, setHomeMainRoad] = useState('');
    const [homeBusStop, setHomeBusStop] = useState('');
    const [homeChangeStartDate, setHomeChangeStartDate] = useState('');
    const [temporaryReason, setTemporaryReason] = useState('');
    const [desiredFerryNoSyskey, setDesiredFerryNoSyskey] = useState('');
    const [tempDateFrom, setTempDateFrom] = useState('');
    const [tempDateTo, setTempDateTo] = useState('');
    const [suspDateFrom, setSuspDateFrom] = useState('');
    const [suspDateTo, setSuspDateTo] = useState('');

    // User Complaint
    const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);

    // HR Complaint
    const [hrComplaintText, setHrComplaintText] = useState('');
    const [userComplaintText, setUserComplaintText] = useState('');

    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

    // Field-level validation errors (Registration)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearFieldError = (key: string) =>
        setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });

    /* ── Change type derived flags ── */
    const selChangeTypeItem = changeTypes.find(t => t.syskey === changeTypeSyskey);
    const isPermanent = selChangeTypeItem?.code === 'PC';
    const isTemporary = selChangeTypeItem?.code === 'TC';
    const isSuspension = !!(changeTypeSyskey && !isPermanent && !isTemporary);

    const selPurposeItem = changePurposes.find(t => t.syskey === changePurposeSyskey);
    const isOfficeLocation = selPurposeItem?.code === 'OL' || (selPurposeItem?.description ?? '').includes('Office');
    const isHomeAddress = selPurposeItem?.code === 'HA' || (selPurposeItem?.description ?? '').includes('Home');
    const isShiftChange = selPurposeItem?.code === 'SC' || (selPurposeItem?.description ?? '').includes('Shift');

    /* ── Auto-select first type when options load (new mode) ── */
    useEffect(() => {
        if (ferryTypeOptions.length === 0 || selectedOpt) return;
        if (isNew) {
            const first = ferryTypeOptions[0];
            setSelectedOpt(first);
            setSelectedType(first.value);
            setApprovalType(first.approvaltype ?? '0');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ferryTypeOptions.length, isNew]);

    /* ── Clear field errors when request type changes ── */
    useEffect(() => { setFieldErrors({}); }, [selectedType]);

    /* ── Seed currentFerryNo from profile (new mode only) ── */
    useEffect(() => {
        if (isNew && profileFerryNo && !currentFerryNo) {
            setCurrentFerryNo(profileFerryNo);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileFerryNo, isNew]);

    /* ── Populate form in edit mode ── */
    useEffect(() => {
        if (!detail?.syskey) return;
        const d = detail;

        const opt = ferryTypeOptions.find(o => o.syskey === d.requesttype);
        if (opt) {
            setSelectedOpt(opt);
            setSelectedType(opt.value);
            setApprovalType(opt.approvaltype ?? d.approvaltype ?? '0');
        } else {
            const t = descToFerryType(d.requesttypedesc ?? '');
            setSelectedType(t);
            setSelectedOpt(ferryTypeOptions.find(o => o.value === t) ?? null);
            // fallback: read approvaltype directly from the API response
            setApprovalType(String(d.approvaltype ?? '0'));
        }

        setPhoneNumber(d.phoneno ?? '');
        setCurrentFerryNo(d.ferryno ?? '');
        setRemark(d.remark ?? '');
        setWorkingHourSyskey(d.workinghour_syskey ?? '');
        setMainRoad(d.road ?? '');
        setBusStop(d.busstop ?? '');
        setTownship(d.township ?? '');
        let ctSyskey = d.changetypesyskey ?? d.changetype_syskey ?? d.changetype ?? '';
        if (!ctSyskey && d.changetypecode) {
            ctSyskey = changeTypes.find(t => t.code === d.changetypecode)?.syskey ?? ctSyskey;
        }
        setChangeTypeSyskey(ctSyskey);

        let cpSyskey = d.changepurpose_syskey ?? d.changepurposesyskey ?? d.changepurpose ?? '';
        if (!cpSyskey && d.changepurposecode) {
            cpSyskey = changePurposes.find(t => t.code === d.changepurposecode)?.syskey ?? cpSyskey;
        }
        setChangePurposeSyskey(cpSyskey);

        setOfficeLocationSyskey(d.locationsyskey ?? d.location_syskey ?? '');
        setHomeAddress(d.address ?? '');
        setHomeMainRoad(d.road ?? '');
        setHomeBusStop(d.busstop ?? '');
        setDesiredFerryNoSyskey(d.changeferrysyskey ?? d.changeferry_syskey ?? d.changeferry ?? '');
        setTemporaryReason(d.remark ?? '');
        setHrComplaintText(d.remark ?? '');
        setUserComplaintText(d.remark ?? '');

        if (d.startdate) {
            const s = fromApiDate(d.startdate);
            setOfficeChangeStartDate(s); setHomeChangeStartDate(s);
            setTempDateFrom(s); setSuspDateFrom(s);
        }
        if (d.enddate) {
            const e = fromApiDate(d.enddate);
            setTempDateTo(e); setSuspDateTo(e);
        }
        if (d.ferrycomplaint) {
            setSelectedComplaints(String(d.ferrycomplaint).split(',').filter(Boolean));
        }
        
        if (d.attachment) {
            setExistingAttachments(Array.isArray(d.attachment) ? d.attachment : []);
        }
        const mapToMember = (list: any[]): MemberItem[] =>
            (list ?? []).map(m => ({
                syskey: m.syskey ?? '',
                name: m.name ?? '',
                employeeid: m.eid ?? m.employeeid ?? '',
                position: m.position ?? '',
                photo: m.profile ?? m.photo ?? '',
                userid: m.userid ?? '',
            }));
        setApprovers(mapToMember(detailApprovers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.syskey, detailApprovers.length, ferryTypeOptions.length, changeTypes.length, changePurposes.length]);

    /* ── File upload ── */
    const uploadFiles = async (): Promise<string[]> => {
        if (!files.length) return [];
        const toBase64 = (f: File): Promise<string> => new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res((reader.result as string).split(',')[1] ?? '');
            reader.onerror = rej;
            reader.readAsDataURL(f);
        });
        const results = await Promise.all(files.map(async (f) => {
            const base64String = await toBase64(f);
            const r = await apiClient.post(PHOTO_UPLOAD, { base64String, base64filename: f.name });
            return r.data?.fileName ?? r.data?.filename ?? '';
        }));
        return results.filter(Boolean);
    };

    /* ── Form validation (Registration + Change sub-types) ── */
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (selectedType === FerryRequestType.registration) {
            if (!phoneNumber.trim()) errors.phoneNumber = 'Contact phone number is required';
            if (!township.trim())    errors.township    = 'Township is required';
            if (!mainRoad.trim())    errors.mainRoad    = 'Main road is required';
            if (!busStop.trim())     errors.busStop     = 'Nearest bus stop is required';
        }

        if (selectedType === FerryRequestType.change && isPermanent) {
            if (!phoneNumber.trim()) errors.phoneNumber = 'Contact phone number is required';

            if (isHomeAddress) {
                if (!homeAddress.trim())        errors.homeAddress        = 'New home address is required';
                if (!homeMainRoad.trim())        errors.homeMainRoad       = 'Main road is required';
                if (!homeBusStop.trim())         errors.homeBusStop        = 'Nearest bus stop is required';
                if (!homeChangeStartDate.trim()) errors.homeChangeStartDate = 'Desired start date is required';
            }

            if (isOfficeLocation) {
                if (!officeLocationSyskey.trim())    errors.officeLocationSyskey = 'Please select an office location';
                if (!officeChangeStartDate.trim())   errors.officeChangeStartDate = 'Desired start date is required';
            }
        }

        if (selectedType === FerryRequestType.usercomplaint) {
            if (selectedComplaints.length === 0) errors.complaints = 'Please choose at least one issue';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            toast.error('Please fill in all required fields');
            return false;
        }
        setFieldErrors({});
        return true;
    };

    /* ── Submit ── */
    const { mutate: submitRequest, isPending: submitting } = useMutation({
        mutationFn: async () => {
            const uploadedFiles = await uploadFiles();
            const opt = selectedOpt ?? ferryTypeOptions.find(o => o.value === selectedType);
            if (!opt) throw new Error('Please select a request type');
            
            const attachment = [
                ...existingAttachments.map((a: any) => typeof a === 'string' ? a : a),
                ...uploadedFiles
            ].filter(Boolean);

            const base: Record<string, unknown> = {
                syskey: !isNew ? (detail?.syskey || id) : '0',
                requesttype: opt.syskey,
                requesttypedesc: opt.label,
                requeststatus: '1',
                remark,
                reason: remark,
                description: remark,
                employeeid: (employeeProfile as any)?.eid
                    ?? (user as any)?.employee_id
                    ?? (user as any)?.eid
                    ?? '',
                employee_syskey: (employeeProfile as any)?.syskey
                    ?? (user as any)?.syskey
                    ?? (user as any)?.usersyskey
                    ?? '',
                userid: userId,
                domain,
                attachment,
                selectedApprovers: approvers.map(a => ({
                    syskey: a.syskey,
                    name: a.name,
                    userid: (a as any).userid ?? '',
                    eid: a.employeeid ?? '',
                    status: '4',
                })),
            };

            if (selectedType === FerryRequestType.registration) {
                base.workinghour_syskey = workingHourSyskey;
                base.road = mainRoad;
                base.busstop = busStop;
                base.township = township;
                base.phoneno = phoneNumber;
                base.ferryno = currentFerryNo;
            } else if (selectedType === FerryRequestType.usercomplaint) {
                const sorted = [...selectedComplaints].sort();
                base.ferrycomplaint = sorted.join(',');
                base.ferryno = currentFerryNo || profileFerryNo;
                base.phoneno = phoneNumber;
                base.remark = userComplaintText;
            } else if (selectedType === FerryRequestType.hrcomplaint) {
                base.remark = hrComplaintText;
                base.ferryno = currentFerryNo || profileFerryNo;
                base.phoneno = phoneNumber;
            } else {
                // Ferry Change
                base.ferryno = currentFerryNo;
                base.changetype_syskey = changeTypeSyskey;
                base.phoneno = phoneNumber;
                base.changepurpose_syskey = '';
                base.locationsyskey = '';
                base.locationname = '';
                base.startdate = '';
                base.enddate = '';
                base.address = '';
                base.road = '';
                base.busstop = '';
                base.township = '';
                base.changeferry_syskey = '';

                if (isPermanent) {
                    base.changepurpose_syskey = changePurposeSyskey;
                    if (isOfficeLocation) {
                        base.locationsyskey = officeLocationSyskey;
                        const loc = officeLocations.find(o => o.syskey === officeLocationSyskey);
                        base.locationname = loc?.name ?? loc?.officeLocationName ?? loc?.description ?? '';
                        base.startdate = toApiDate(officeChangeStartDate);
                    } else if (isHomeAddress) {
                        base.address = homeAddress;
                        base.road = homeMainRoad;
                        base.busstop = homeBusStop;
                        base.startdate = toApiDate(homeChangeStartDate);
                    }
                } else if (isTemporary) {
                    base.remark = temporaryReason;
                    base.changeferry_syskey = desiredFerryNoSyskey;
                    base.startdate = toApiDate(tempDateFrom);
                    base.enddate = toApiDate(tempDateTo);
                } else {
                    base.startdate = toApiDate(suspDateFrom);
                    base.enddate = toApiDate(suspDateTo);
                }
            }

            const endpoint = !isNew ? `${SAVE_REQUEST}/${id}` : SAVE_REQUEST;
            await apiClient.post(endpoint, base);
        },
        onSuccess: () => {
            toast.success(isHrComplaintView ? 'HR complaint submitted successfully' : 'Ferry request submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            navigate(basePath);
        },
        onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Submission failed'),
    });

    /* ── Toggle complaint ── */
    const toggleComplaint = useCallback((cid: string) => {
        setSelectedComplaints(prev =>
            prev.includes(cid) ? prev.filter(c => c !== cid) : [...prev, cid]
        );
    }, []);

    /* ═══════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════ */
    const isApproved = !isNew && (detail?.requeststatus === 2 || detail?.requeststatus === '2');
    const isRejected = !isNew && (detail?.requeststatus === 3 || detail?.requeststatus === '3');
    const isReadOnly = isApproved || isRejected;

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => navigate(isNew ? basePath : `${basePath}/${id}`)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className={styles.headerIcon}>
                        {isHrComplaintView ? (
                            <Building2 size={22} color="#0c4a6e" />
                        ) : (
                            <Car size={22} color="#0c4a6e" />
                        )}
                    </div>
                    <div>
                        <h1 className={styles.headerTitle}>
                            {isNew ? `New ${selectedOpt?.label || (isHrComplaintView ? 'HR Complaint' : 'Ferry Request')}` : (detail?.requesttypedesc || selectedOpt?.label || (isHrComplaintView ? 'HR Complaint' : 'Ferry Request'))}
                        </h1>
                        {!isNew && detail?.refno ? (
                            <p className={styles.headerSub}>Ref # {detail.refno}</p>
                        ) : (
                            !isHrComplaintView ? <p className={styles.headerSub}>Company ferry / bus service</p> : null
                        )}
                    </div>
                </div>
                {!isNew && <StatusBadge status={String(detail?.requeststatus ?? '1')} />}
            </div>

            {(!isNew && detailLoading) ? (
                <div className={styles.loadingCenter}>
                    <Loader2 size={32} className={styles.spin} color="#0c4a6e" />
                </div>
            ) : (
                <div className={styles.formBody}>

                    {/* ── 1. Request Type (from API, filtered ferry/HR) ── */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            {isHrComplaintView ? (
                                <Building2 size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            ) : (
                                <Bus size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            )}
                            Request Type
                        </h3>
                        {ferryTypeOptions.length === 0 ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[0,1,2,3].map(i => (
                                    <div key={i} style={{ flex: 1, height: 60, borderRadius: 10,
                                        background: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.typeGrid}>
                                {ferryTypeOptions.map(opt => (
                                    <button
                                        key={opt.syskey}
                                        id={`ferry-type-${opt.value}`}
                                        type="button"
                                        disabled={isReadOnly}
                                        className={`${styles.typeCard} ${selectedType === opt.value ? styles.typeCardActive : ''}`}
                                        onClick={() => {
                                            setSelectedOpt(opt);
                                            setSelectedType(opt.value);
                                            setApprovalType(opt.approvaltype ?? '0');
                                        }}
                                    >
                                        <span style={{ fontSize: 20 }}>
                                            {opt.value === FerryRequestType.registration && '📋'}
                                            {opt.value === FerryRequestType.change && '🔄'}
                                            {opt.value === FerryRequestType.usercomplaint && '📣'}
                                            {opt.value === FerryRequestType.hrcomplaint && '👔'}
                                        </span>
                                        <span className={styles.typeCardLabel}>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ── 2. Employee Info ── */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <UserCheck size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Employee
                        </h3>
                        <div className={styles.employeeCard} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                            {/* Avatar row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={styles.employeeAvatar}>
                                    {((user as any)?.name ?? (user as any)?.username ?? 'U')[0].toUpperCase()}
                                </div>
                                <div className={styles.employeeInfo}>
                                    {/* Name + EID on same line */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className={styles.employeeName}>{(user as any)?.name ?? (user as any)?.username}</div>
                                        {((user as any)?.employee_id ?? (user as any)?.eid ?? userId) && (
                                            <div style={{ fontSize: 12, color: '#0369a1', background: '#e0f2fe', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                                                {(user as any)?.employee_id ?? (user as any)?.eid ?? userId}
                                            </div>
                                        )}
                                    </div>
                                    {/* Rank below name */}
                                    {(employeeProfile as any)?.rank && (
                                        <div style={{ fontSize: 12, color: '#0369a1', marginTop: 2 }}>
                                            {(employeeProfile as any).rank}
                                        </div>
                                    )}
                                </div>
                                <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0 }} />
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: '#bae6fd', margin: '12px 0' }} />

                            {/* Department + Join Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {(employeeProfile as any)?.department && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', marginBottom: 2, letterSpacing: '0.03em' }}>Department</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0c4a6e' }}>
                                            {(employeeProfile as any).department}
                                        </div>
                                    </div>
                                )}
                                {(employeeProfile as any)?.joineddate && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', marginBottom: 2, letterSpacing: '0.03em' }}>Join Date</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0c4a6e' }}>
                                            {(employeeProfile as any).joineddate}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Phone + Current Ferry No shown for Registration & Change */}
                        {(selectedType === FerryRequestType.registration || selectedType === FerryRequestType.change) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                                <Input id="ferry-phone" label="Contact Phone Number *" type="tel"
                                    value={phoneNumber}
                                    onChange={e => { setPhoneNumber(e.target.value); clearFieldError('phoneNumber'); }}
                                    placeholder="+95 9xxx" readOnly={isReadOnly}
                                    error={selectedType === FerryRequestType.registration ? fieldErrors.phoneNumber : undefined} />
                                {(profileFerryNo || currentFerryNo) && (
                                    <Input id="ferry-current-no" label="Current Ferry Number"
                                        value={currentFerryNo || profileFerryNo}
                                        onChange={e => setCurrentFerryNo(e.target.value)}
                                        readOnly />
                                )}
                            </div>
                        )}

                        {/* ════════════════════════════════
                            REGISTRATION (Merged into upper box)
                        ════════════════════════════════ */}
                        {selectedType === FerryRequestType.registration && (
                            <div className={styles.grid} style={{ marginTop: 14 }}>
                                <div className={styles.fullCol}>
                                    <label className={styles.fieldLabel}>
                                        Working Hours <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select id="ferry-working-hours" className={styles.select}
                                        value={workingHourSyskey} disabled={isReadOnly}
                                        onChange={e => setWorkingHourSyskey(e.target.value)}>
                                        <option value="">— Select working hours —</option>
                                        {workingHours.map(wh => (
                                            <option key={wh.syskey} value={wh.syskey}>{wh.description}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input id="ferry-township" label="Township *" value={township}
                                    placeholder="e.g. Hlaing"
                                    onChange={e => { setTownship(e.target.value); clearFieldError('township'); }}
                                    readOnly={isReadOnly}
                                    error={fieldErrors.township} />
                                <Input id="ferry-main-road" label="Main Road *" value={mainRoad}
                                    placeholder="e.g. Pyay Road"
                                    onChange={e => { setMainRoad(e.target.value); clearFieldError('mainRoad'); }}
                                    readOnly={isReadOnly}
                                    error={fieldErrors.mainRoad} />
                                <Input id="ferry-bus-stop" label="Nearest Bus Stop *"
                                    value={busStop} placeholder="e.g. Hledan Junction"
                                    onChange={e => { setBusStop(e.target.value); clearFieldError('busStop'); }}
                                    readOnly={isReadOnly}
                                    error={fieldErrors.busStop} />
                            </div>
                        )}
                    </section>

                    {/* ════════════════════════════════
                        CHANGE
                    ════════════════════════════════ */}
                    {selectedType === FerryRequestType.change && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Clock size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Change Details
                            </h3>
                            <div className={styles.grid}>
                                <div className={styles.fullCol}>
                                    <label className={styles.fieldLabel}>
                                        Change Type <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select id="ferry-change-type" className={styles.select}
                                        value={changeTypeSyskey} disabled={isReadOnly}
                                        onChange={e => {
                                            setChangeTypeSyskey(e.target.value);
                                            setChangePurposeSyskey('');
                                            setOfficeLocationSyskey('');
                                        }}>
                                        <option value="">— Select change type —</option>
                                        {changeTypes.map(ct => (
                                            <option key={ct.syskey} value={ct.syskey}>{ct.description}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Temporary Change */}
                                {isTemporary && changeTypeSyskey && (<>
                                    <div className={styles.fullCol}>
                                        <Textarea id="ferry-temp-reason"
                                            label="Reason for Change Request (Business Requirements) *"
                                            value={temporaryReason}
                                            onChange={e => setTemporaryReason(e.target.value)}
                                            placeholder="Please specify reason..."
                                            rows={3}
                                            readOnly={isReadOnly} />
                                    </div>
                                    <div className={styles.fullCol}>
                                        <label className={styles.fieldLabel}>Desired Ferry Number</label>
                                        <select id="ferry-desired-no" className={styles.select}
                                            value={desiredFerryNoSyskey} disabled={isReadOnly}
                                            onChange={e => setDesiredFerryNoSyskey(e.target.value)}>
                                            <option value="">— Select ferry number —</option>
                                            {ferryNos.map(fn => (
                                                <option key={fn.syskey} value={fn.syskey}>
                                                    {fn.carno ?? fn.description ?? fn.ferryCarNo ?? fn.syskey}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <DateInput id="ferry-temp-from" label="Desired Date From *"
                                        value={tempDateFrom} onChange={(e: any) => setTempDateFrom(e.target.value)}
                                        readOnly={isReadOnly}
                                        rightIcon={<Calendar size={18} color="#94a3b8" />} />
                                    <DateInput id="ferry-temp-to" label="Desired Date To *"
                                        value={tempDateTo} onChange={(e: any) => setTempDateTo(e.target.value)}
                                        readOnly={isReadOnly}
                                        rightIcon={<Calendar size={18} color="#94a3b8" />} />
                                </>)}

                                {/* Permanent Change */}
                                {isPermanent && changeTypeSyskey && (
                                    <div className={styles.fullCol}>
                                        <p className={styles.sectionSubtitle}>Purpose of Change</p>
                                        <div className={styles.radioGroup}>
                                            {changePurposes.map(cp => (
                                                <label key={cp.syskey} className={styles.radioLabel}>
                                                    <input type="radio" name="changePurpose"
                                                        value={cp.syskey}
                                                        checked={changePurposeSyskey === cp.syskey}
                                                        disabled={isReadOnly}
                                                        onChange={() => {
                                                            setChangePurposeSyskey(cp.syskey);
                                                            setOfficeLocationSyskey('');
                                                        }} />
                                                    <span>{cp.description}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {/* Office Location sub-fields */}
                                        {isOfficeLocation && changePurposeSyskey && (
                                            <div className={styles.grid} style={{ marginTop: 14 }}>
                                                <div className={styles.fullCol}>
                                                    <label className={styles.fieldLabel}>New Office Location *</label>
                                                    <select id="ferry-office-loc"
                                                        className={`${styles.select} ${fieldErrors.officeLocationSyskey ? styles.selectError : ''}`}
                                                        value={officeLocationSyskey} disabled={isReadOnly}
                                                        onChange={e => { setOfficeLocationSyskey(e.target.value); clearFieldError('officeLocationSyskey'); }}>
                                                        <option value="">— Select office location —</option>
                                                        {officeLocations.map(ol => (
                                                            <option key={ol.syskey} value={ol.syskey}>
                                                                {ol.name ?? ol.officeLocationName ?? ol.description}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {fieldErrors.officeLocationSyskey && (
                                                        <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
                                                            {fieldErrors.officeLocationSyskey}
                                                        </span>
                                                    )}
                                                </div>
                                                <DateInput id="ferry-office-start" label="Desired Start Date *"
                                                    value={officeChangeStartDate}
                                                    onChange={(e: any) => { setOfficeChangeStartDate(e.target.value); clearFieldError('officeChangeStartDate'); }}
                                                    readOnly={isReadOnly}
                                                    error={fieldErrors.officeChangeStartDate}
                                                    rightIcon={<Calendar size={18} color="#94a3b8" />} />
                                            </div>
                                        )}

                                        {/* Home Address sub-fields */}
                                        {isHomeAddress && changePurposeSyskey && (
                                            <div className={styles.grid} style={{ marginTop: 14 }}>
                                                <div className={styles.fullCol}>
                                                    <Input id="ferry-home-addr" label="New Home Address *"
                                                        value={homeAddress} placeholder="Full address"
                                                        onChange={e => { setHomeAddress(e.target.value); clearFieldError('homeAddress'); }}
                                                        readOnly={isReadOnly}
                                                        error={fieldErrors.homeAddress} />
                                                </div>
                                                <Input id="ferry-home-road" label="Main Road *"
                                                    value={homeMainRoad}
                                                    onChange={e => { setHomeMainRoad(e.target.value); clearFieldError('homeMainRoad'); }}
                                                    readOnly={isReadOnly}
                                                    error={fieldErrors.homeMainRoad} />
                                                <Input id="ferry-home-bus" label="Nearest Bus Stop *"
                                                    value={homeBusStop}
                                                    onChange={e => { setHomeBusStop(e.target.value); clearFieldError('homeBusStop'); }}
                                                    readOnly={isReadOnly}
                                                    error={fieldErrors.homeBusStop} />
                                                <DateInput id="ferry-home-start" label="Desired Start Date *"
                                                    value={homeChangeStartDate}
                                                    onChange={(e: any) => { setHomeChangeStartDate(e.target.value); clearFieldError('homeChangeStartDate'); }}
                                                    readOnly={isReadOnly}
                                                    error={fieldErrors.homeChangeStartDate}
                                                    rightIcon={<Calendar size={18} color="#94a3b8" />} />
                                            </div>
                                        )}

                                        {isShiftChange && changePurposeSyskey && (
                                            <p style={{ marginTop: 12, fontSize: 13, color: '#0c4a6e',
                                                background: '#e0f2fe', borderRadius: 8, padding: '8px 12px' }}>
                                                ℹ️ Your shift change request will be noted. Please submit to proceed.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Temporary Suspension */}
                                {isSuspension && changeTypeSyskey && (<>
                                    <div className={styles.fullCol} style={{ marginTop: 8, marginBottom: 4 }}>
                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                            Temporary Suspension For Ferry Usage
                                        </h4>
                                    </div>
                                    <DateInput id="ferry-susp-from" label="Desired Date For Suspension From *"
                                        value={suspDateFrom} onChange={(e: any) => setSuspDateFrom(e.target.value)}
                                        readOnly={isReadOnly}
                                        rightIcon={<Calendar size={18} color="#94a3b8" />} />
                                    <DateInput id="ferry-susp-to" label="Desired Date For Suspension To *"
                                        value={suspDateTo} onChange={(e: any) => setSuspDateTo(e.target.value)}
                                        readOnly={isReadOnly}
                                        rightIcon={<Calendar size={18} color="#94a3b8" />} />
                                </>)}
                            </div>
                        </section>
                    )}

                    {/* ════════════════════════════════
                        USER COMPLAINT
                    ════════════════════════════════ */}
                    {selectedType === FerryRequestType.usercomplaint && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Phone size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                User Complaint
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0,
                                border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                {COMPLAINT_OPTS.map((opt, i) => {
                                    const checked = selectedComplaints.includes(opt.id);
                                    return (
                                        <label key={opt.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '12px 14px',
                                                cursor: isReadOnly ? 'default' : 'pointer',
                                                fontSize: 13,
                                                color: '#334155',
                                                background: checked ? '#f0f9ff' : '#fff',
                                                borderBottom: i < COMPLAINT_OPTS.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                transition: 'background 0.12s',
                                            }}>
                                            <input id={`ferry-complaint-${opt.id}`} type="checkbox"
                                                checked={checked}
                                                disabled={isReadOnly}
                                                style={{ accentColor: '#0c4a6e', width: 16, height: 16, flexShrink: 0 }}
                                                onChange={() => { toggleComplaint(opt.id); clearFieldError('complaints'); }} />
                                            <span>{opt.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {fieldErrors.complaints && (
                                <span style={{ color: '#ef4444', fontSize: 12, marginTop: 6, display: 'block' }}>
                                    {fieldErrors.complaints}
                                </span>
                            )}

                            <div style={{ marginTop: 16 }}>
                                <Textarea id="ferry-user-text" label="Please Describe Your Complaint"
                                    value={userComplaintText}
                                    onChange={e => setUserComplaintText(e.target.value)}
                                    placeholder="Write your complaint here..."
                                    rows={3}
                                    readOnly={isReadOnly} />
                            </div>

                        </section>
                    )}

                    {/* ════════════════════════════════
                        HR COMPLAINT
                    ════════════════════════════════ */}
                    {selectedType === FerryRequestType.hrcomplaint && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>HR Complaint</h3>
                            <Textarea id="ferry-hr-text" label="Complaint Description *"
                                value={hrComplaintText}
                                onChange={e => setHrComplaintText(e.target.value)}
                                placeholder="Describe your complaint in detail..."
                                rows={4}
                                readOnly={isReadOnly} />

                        </section>
                    )}





                    {/* ── Attachments ── */}
                    {!isReadOnly && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <Paperclip size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Attachments
                            </h3>
                            {existingAttachments.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                    {existingAttachments.map((att: any, i: number) => {
                                        const name = typeof att === 'string' ? `File ${i + 1}` : att.filename || att.fileName || att.name || `File ${i + 1}`;
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                <button type="button" onClick={() => downloadOrOpenAttachment(att)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0c4a6e', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                    <Paperclip size={13} />
                                                    {name}
                                                </button>
                                                <button type="button" onClick={() => setExistingAttachments(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <FileUpload files={files} onChange={setFiles} />
                        </section>
                    )}

                    {/* ── Approvers (manual approval only) ── */}
                    {approvalType === '0' && !isReadOnly && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <UserCheck size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                Approvers
                            </h3>
                            <MemberPicker
                                label=""
                                members={approvers}
                                onChange={setApprovers}
                                excludeSyskeys={[
                                    (user as any)?.syskey,
                                    (user as any)?.usersyskey,
                                    userId,
                                ].filter(Boolean) as string[]}
                            />
                        </section>
                    )}

                    {/* ── Step-Level Workflow Tracker (approvalType === '1') ── */}
                    {!isNew && (detail?.approvaltype === '1' || detail?.approvaltype === 1) && stepLevelData.length > 0 && (
                        <section className={styles.section}>
                            <ApprovalWorkflowModal steps={stepLevelData} />
                        </section>
                    )}

                    {/* ── Read-only approver list (approvalType === '0') ── */}
                    {!isNew && (detail?.approvaltype === '0' || detail?.approvaltype === 0 || !detail?.approvaltype) && detailApprovers.length > 0 && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>Approvers</h3>
                            {detailApprovers.map((a: any) => (
                                <div key={a.userid ?? a.syskey} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 0', borderBottom: '1px solid #f1f5f9'
                                }}>
                                    <div className={styles.employeeAvatar} style={{ width: 36, height: 36, fontSize: 14 }}>
                                        {(a.name?.[0] ?? 'A').toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{a.userid} · {a.eid ?? ''}</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>
                                        {a.status === '2' && <CheckCircle2 size={18} color="#22c55e" />}
                                        {a.status === '3' && <XCircle size={18} color="#ef4444" />}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* ── Action Bar ── */}
                    {!isReadOnly && (
                        <div className={styles.actionBar}>
                            <Button variant="secondary" onClick={() => navigate(isNew ? basePath : `${basePath}/${id}`)}>Cancel</Button>
                            <Button id="ferry-submit-btn"
                                onClick={() => { if (validateForm()) submitRequest(); }}
                                disabled={submitting}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {submitting && <Loader2 size={15} className={styles.spin} />}
                                {submitting ? 'Submitting…' : 'Submit Request'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
