import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Save, X, List, Plus, Trash2, Search, Check, Pencil, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    WORKPOLICY_INSERT,
    WORKPOLICY_DELETE,
    SETUP_WORKPOLICY,
    SETUP_CALENDAR,
    SUPERVISE_USER_LIST,
    SUPERVISE_WORKPOLICY_LIST,
    SETUP_ROSTER,
    CALENDAR_DETAIL
} from '../../config/api-routes';
import Modal from '../../components/ui/Modal/Modal';
import Input from '../../components/ui/Input/Input';
import { Button } from '../../components/ui';
import styles from './WorkPolicyCreatePage.module.css';
import { useAuthStore } from '../../stores/auth-store';
import { useParams } from 'react-router-dom';

// ── Types ──
interface EmployeeItem {
    rownum?: string;
    syskey: string;
    eid: string;
    name: string;
    joineddate: string;
    rank: string;
    department: string | null;
    branch: string;
    section: string;
    company: string;
    calendersyskey: string | null;
    flag: boolean;
    isexist: boolean;
}

interface SelectOption {
    syskey: string;
    description: string;
    name?: string;
}

interface ShiftOption {
    syskey: string;
    name?: string;
    description?: string;
    starttime?: string;
    endtime?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function WorkPolicyCreatePage() {
    const navigate = useNavigate();
    const { syskey } = useParams<{ syskey: string }>();
    const { userId, domain } = useAuthStore();
    const { t } = useTranslation();

    // ── Form State ──
    const [code, setCode] = useState('TBA');
    const [description, setDescription] = useState('TBA');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [countingPublicHoliday, setCountingPublicHoliday] = useState(true);

    const [workPolicyId, setWorkPolicyId] = useState('');
    const [type, setType] = useState<0 | 1>(0); // 0 = Roster, 1 = Calendar
    const [rosterId, setRosterId] = useState('');
    const [calendarId, setCalendarId] = useState('');
    const [calendarShiftData, setCalendarShiftData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'employee' | 'calendar'>('employee');

    const [employeeList, setEmployeeList] = useState<EmployeeItem[]>([]);
    const [isEditLoading, setIsEditLoading] = useState(!!syskey);
    // In edit mode, start as view-only; for new, start as editing
    const [isEditing, setIsEditing] = useState(!syskey);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ── Setup Lists ──
    const { data: workPolicies = [] } = useQuery<SelectOption[]>({
        queryKey: ['setup', 'workpolicy'],
        queryFn: async () => {
            const res = await apiClient.get(SETUP_WORKPOLICY);
            return res.data?.datalist || res.data || [];
        }
    });

    const { data: rosters = [] } = useQuery<SelectOption[]>({
        queryKey: ['setup', 'roster'],
        queryFn: async () => {
            const res = await apiClient.get(SETUP_ROSTER);
            return res.data?.datalist || res.data || [];
        }
    });

    const { data: calendars = [] } = useQuery<SelectOption[]>({
        queryKey: ['setup', 'calendar'],
        queryFn: async () => {
            const res = await apiClient.get(SETUP_CALENDAR);
            return res.data?.datalist || res.data || [];
        }
    });

    const { data: shiftOptions = [] } = useQuery<ShiftOption[]>({
        queryKey: ['setup', 'shift'],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/shift`);
            let shifts = res.data?.datalist || res.data || [];
            if (!Array.isArray(shifts)) shifts = [];
            return [{ syskey: '', name: '-', description: '-' }, ...shifts];
        }
    });

    const getShiftLabel = (syskey: string) => {
        const opt = shiftOptions.find(s => s.syskey === syskey);
        if (!opt) return 'Off Day / None';
        if (!opt.syskey) return opt.description || opt.name || 'Off Day / None';
        const baseName = opt.name || opt.description || 'Unknown Shift';
        if (opt.starttime) {
            return `${baseName} (${opt.starttime.replace(/ (AM|PM)/i, '')})`;
        }
        return baseName;
    };

    const parseDateStr = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return new Date();
        const y = parseInt(dateStr.slice(0, 4));
        const m = parseInt(dateStr.slice(4, 6)) - 1;
        const d = parseInt(dateStr.slice(6, 8));
        return new Date(y, m, d);
    };

    const renderCalendarGrid = () => {
        if (calendarShiftData.length === 0) return <div style={{ textAlign: 'center', padding: 20 }}>No shift data available. Please select a Calendar first.</div>;

        const cells = [];
        const firstDate = parseDateStr(calendarShiftData[0].date);
        const firstDayOfWeek = firstDate.getDay();

        // Empty cells before start
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push(<div key={`empty-start-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
        }

        // Days
        calendarShiftData.forEach((item) => {
            const dateObj = parseDateStr(item.date);

            cells.push(
                <div key={item.date} className={styles.dayCell}>
                    <div className={styles.dayNumber}>
                        {dateObj.getDate()} {MONTH_NAMES[dateObj.getMonth()]}
                    </div>
                    <select
                        className={styles.inlineSelect}
                        value={item.shiftSyskey || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setCalendarShiftData(prev => prev.map(s => s.date === item.date ? { ...s, shiftSyskey: val } : s));
                        }}
                        disabled={!isEditing}
                    >
                        {shiftOptions.map(opt => (
                            <option key={opt.syskey} value={opt.syskey}>
                                {getShiftLabel(opt.syskey)}
                            </option>
                        ))}
                    </select>
                </div>
            );
        });

        const remainingToCompleteWeek = cells.length % 7;
        if (remainingToCompleteWeek > 0) {
            for (let i = 0; i < 7 - remainingToCompleteWeek; i++) {
                cells.push(<div key={`empty-end-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
            }
        }

        return (
            <div className={styles.calendarGrid}>
                {DAY_NAMES.map(d => (
                    <div key={d} className={styles.dayHeader}>{d}</div>
                ))}
                {cells}
            </div>
        );
    };

    // ── Employee Search Modal State ──
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [empSearchInput, setEmpSearchInput] = useState('');
    const [empSearch, setEmpSearch] = useState('');

    const { data: allEmployees = [], isLoading: isLoadingEmps } = useQuery<any[]>({
        queryKey: ['supervised-employees'],
        queryFn: async () => {
            const res = await mainClient.post(SUPERVISE_USER_LIST);
            return res.data?.data || [];
        },
        enabled: isEmpModalOpen
    });

    const filteredEmployees = useMemo(() => {
        if (!empSearch.trim()) return allEmployees;
        const q = empSearch.toLowerCase();
        return allEmployees.filter(e =>
            e.employee_name?.toLowerCase().includes(q) ||
            e.employee_id?.toLowerCase().includes(q)
        );
    }, [allEmployees, empSearch]);

    const handleSelectEmployee = (emp: any) => {
        if (employeeList.some(e => e.syskey === emp.employee_syskey)) {
            setEmployeeList(prev => prev.filter(e => e.syskey !== emp.employee_syskey));
        } else {
            const newItem: EmployeeItem = {
                rownum: String(employeeList.length + 1),
                syskey: emp.employee_syskey,
                eid: emp.employee_id || '',
                name: emp.employee_name || '',
                joineddate: null as any,
                rank: emp.relationship || null,
                department: null,
                branch: null as any,
                section: null as any,
                company: 'MIT',
                calendersyskey: null,
                flag: true,
                isexist: false
            };
            setEmployeeList(prev => [...prev, newItem]);
        }
    };

    const handleRemoveEmployee = (syskey: string) => {
        setEmployeeList(prev => prev.filter(e => e.syskey !== syskey));
    };

    // ── Handlers ──
    const formatPayloadDate = (dashDate: string) => dashDate.replace(/-/g, '');
    const formatFromApiDate = (apiDate: string) => {
        if (!apiDate || apiDate.length < 8) return '';
        // "20260426" -> "2026-04-26"
        return `${apiDate.substring(0, 4)}-${apiDate.substring(4, 6)}-${apiDate.substring(6, 8)}`;
    };

    const handleCalendarChange = async (selectedSyskey: string) => {
        setCalendarId(selectedSyskey);

        // Skip calling the calendar detail API if no syskey is selected
        if (!selectedSyskey) return;

        try {
            const calRes = await apiClient.post(CALENDAR_DETAIL, { syskey: selectedSyskey });
            console.log('📅 [Calendar Detail] API Response:', calRes.data);

            const detail = calRes.data?.datalist?.[0] || calRes.data?.data?.[0] || calRes.data?.[0];

            if (detail) {
                // Support both lowercase and camelCase just in case
                const calObj = detail.calendarObj || detail.calendarobj;
                if (calObj) {
                    const from = calObj.fromdate || calObj.fromDate;
                    const to = calObj.todate || calObj.toDate;

                    if (from) setStartDate(formatFromApiDate(String(from)));
                    if (to) setEndDate(formatFromApiDate(String(to)));

                    console.log('✅ [Calendar Detail] Dates Bound:', { from, to });
                }

                const shiftData = detail.calendarShiftObj || detail.calendarshiftobj;
                if (shiftData) {
                    setCalendarShiftData(shiftData);
                }
            }
        } catch (err) {
            console.error('Failed to fetch calendar details', err);
            toast.error('Failed to load calendar details.');
        }
    };

    // ── Fetch Edit Data ──
    useEffect(() => {
        if (!syskey) return;
        const loadEditData = async () => {
            try {
                const res = await mainClient.post(SUPERVISE_WORKPOLICY_LIST, {
                    userid: userId || '',
                    domain: domain || '',
                    pagesize: 500,
                    currentpage: 1,
                    searchval: ''
                });

                const allData: any[] = res.data?.data?.datalist || res.data?.datalist || [];
                const policyRows = allData.filter(row => row.syskey === syskey);

                if (policyRows.length > 0) {
                    const header = policyRows[0];
                    setCode(header.code || '');
                    setDescription(header.description || '');
                    setStartDate(formatFromApiDate(header.startdate || ''));
                    setEndDate(formatFromApiDate(header.enddate || ''));
                    setWorkPolicyId(header.workpolicysyskey || '');
                    setType(header.headertype === 1 ? 1 : 0);

                    if (header.headertype === 1) {
                        setCalendarId(header.calendarsyskey || '');
                        // Fetch calendar details to get shiftData for the edit payload
                        if (header.calendarsyskey) {
                            handleCalendarChange(header.calendarsyskey);
                        }
                    } else {
                        setRosterId(header.rostersyskey || '');
                    }

                    const mappedEmployees: EmployeeItem[] = policyRows.map((row, index) => ({
                        rownum: String(index + 1),
                        syskey: row.employee_syskey,
                        eid: row.eid,
                        name: row.name,
                        joineddate: null as any,
                        rank: null as any, // Not returned in list
                        department: null,
                        branch: null as any,
                        section: null as any,
                        company: 'MIT',
                        calendersyskey: row.calendarsyskey || null,
                        flag: true,
                        isexist: false
                    }));
                    setEmployeeList(mappedEmployees);
                }
            } catch (err) {
                console.error("Failed to load edit data", err);
                toast.error("Failed to load policy data");
            } finally {
                setIsEditLoading(false);
            }
        };
        loadEditData();
    }, [syskey, userId, domain]);

    const handleDelete = async () => {
        if (!syskey) return;
        setIsDeleteConfirmOpen(false);
        try {
            await apiClient.get(`${WORKPOLICY_DELETE}/${syskey}`, {
                params: { userid: userId || '', domain: domain || '' }
            });
            toast.success(t('workPolicy.deleteSuccess'));
            navigate('/employeeworkpolicy');
        } catch (error) {
            console.error('Error deleting work policy:', error);
            toast.error(t('workPolicy.deleteFail'));
        }
    };

    const handleSave = async () => {
        if (!code || !description || !startDate || !endDate || !workPolicyId) {
            toast.error(t('workPolicy.validationFull'));
            return;
        }

        if (type === 0 && !rosterId) {
            toast.error(t('workPolicy.validationRoster'));
            return;
        }

        if (type === 1 && !calendarId) {
            toast.error(t('workPolicy.validationCalendar'));
            return;
        }

        if (employeeList.length === 0) {
            toast.error(t('workPolicy.validationEmployee'));
            return;
        }

        const payload: any = {
            refno: "",
            code,
            description,
            countingpublicholiday: countingPublicHoliday,
            startdate: formatPayloadDate(startDate),
            enddate: formatPayloadDate(endDate),
            type,
            calendar: type === 1 ? calendarId : "",
            roster: type === 0 ? rosterId : "",
            workpolicy: workPolicyId,
            employeeList: employeeList.map((emp, index) => ({
                rownum: String(index + 1),
                syskey: emp.syskey,
                eid: emp.eid,
                name: emp.name,
                joineddate: emp.joineddate || "",
                rank: emp.rank || null,
                department: emp.department || null,
                branch: emp.branch || null,
                section: emp.section || null,
                company: emp.company || null,
                calendersyskey: emp.calendersyskey || null,
                flag: true,
                isexist: false
            })),
            shiftData: type === 1 ? calendarShiftData : [],
            userid: userId || '',
            domain: domain || ''
        };

        setIsSaving(true);
        try {
            // For edit: PUT to WORKPOLICY_INSERT/{syskey}
            // For create: POST to WORKPOLICY_INSERT
            let response;
            if (syskey) {
                response = await apiClient.put(`${WORKPOLICY_INSERT}/${syskey}`, payload);
            } else {
                response = await apiClient.post(WORKPOLICY_INSERT, payload);
            }

            // The backend might return HTTP 200 but include an error statuscode inside the payload
            // Note: The legacy backend returns statuscode: 300 for success.
            const statusCode = response.data?.statuscode;
            if (response.data && statusCode && statusCode !== 200 && statusCode !== 300) {
                toast.error(response.data.message || t('workPolicy.saveFail'));
                return; // Remain in form
            }

            toast.success(syskey ? t('workPolicy.updateSuccess') : t('workPolicy.saveSuccess'));
            navigate('/employeeworkpolicy');
        } catch (error: any) {
            console.error('Error saving work policy:', error);
            const errorMsg = error.response?.data?.message || t('workPolicy.saveFail');
            toast.error(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>{syskey ? t('workPolicy.detailTitle') : t('workPolicy.newTitle')}</h1>
                <div className={styles.headerActions}>
                    {/* Save — only visible when editing */}
                    {isEditing && (
                        <>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                                {isSaving ? t('workPolicy.saving', 'Saving...') : t('workPolicy.save')}
                            </button>
                            <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>
                                <X size={16} /> {t('workPolicy.cancel')}
                            </button>
                        </>
                    )}
                    {/* Edit — only visible in view mode (existing record) */}
                    {syskey && !isEditing && (
                        <button className={styles.saveBtn} onClick={() => setIsEditing(true)}>
                            <Pencil size={16} /> {t('workPolicy.edit')}
                        </button>
                    )}
                    {syskey && !isEditing && (
                        <button className={styles.headerDeleteBtn} onClick={() => setIsDeleteConfirmOpen(true)}>
                            <Trash2 size={16} /> {t('workPolicy.delete')}
                        </button>
                    )}
                    <button className={styles.listBtn} onClick={() => navigate('/employeeworkpolicy')}>
                        <List size={16} /> {t('workPolicy.list')}
                    </button>
                </div>
            </div>

            {/* ── Form Card ── */}
            {isEditLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>{t('workPolicy.loading')}</div>
            ) : (
                <div className={styles.card}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>{t('workPolicy.refNo')}<span>*</span></label>
                            <input className={styles.input} value="TBA" disabled />
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '22px' }}>
                            <label className={styles.checkboxGroup}>
                                <input
                                    type="checkbox"
                                    checked={countingPublicHoliday}
                                    onChange={e => setCountingPublicHoliday(e.target.checked)}
                                    disabled={!isEditing}
                                />
                                {t('workPolicy.countingPublicHoliday')}
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('workPolicy.code')}<span>*</span></label>
                            <input className={styles.input} value={code} onChange={e => setCode(e.target.value)} disabled />
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('workPolicy.description')}<span>*</span></label>
                            <input className={styles.input} value={description} onChange={e => setDescription(e.target.value)} disabled />
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('workPolicy.date')}<span>*</span></label>
                            <div className={styles.dateRange}>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    disabled={!isEditing || type === 1}
                                />
                                <span>-</span>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    disabled={!isEditing || type === 1}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('workPolicy.rosterCalendar')}<span>*</span></label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input type="radio" name="type" checked={type === 0} onChange={() => setType(0)} disabled={!isEditing} />
                                    {t('workPolicy.roster')}
                                </label>
                                <label className={styles.radioLabel}>
                                    <input type="radio" name="type" checked={type === 1} onChange={() => setType(1)} disabled={!isEditing} />
                                    {t('workPolicy.calendar')}
                                </label>
                            </div>
                            {type === 0 ? (
                                <select className={styles.select} value={rosterId} onChange={e => setRosterId(e.target.value)} disabled={!isEditing}>
                                    <option value="">{t('workPolicy.selectRoster')}</option>
                                    {rosters.map(r => <option key={r.syskey} value={r.syskey}>{r.description || r.name}</option>)}
                                </select>
                            ) : (
                                <select className={styles.select} value={calendarId} onChange={e => handleCalendarChange(e.target.value)} disabled={!isEditing}>
                                    <option value="">{t('workPolicy.selectCalendar')}</option>
                                    {calendars.map(c => <option key={c.syskey} value={c.syskey}>{c.description || c.name}</option>)}
                                </select>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('workPolicy.workPolicy')}<span>*</span></label>
                            <select className={styles.select} value={workPolicyId} onChange={e => setWorkPolicyId(e.target.value)} disabled={!isEditing}>
                                <option value="">{t('workPolicy.selectWorkPolicy')}</option>
                                {workPolicies.map(w => <option key={w.syskey} value={w.syskey}>{w.description || w.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Employee Tab Card ── */}
            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'employee' ? styles.active : ''}`}
                        onClick={() => setActiveTab('employee')}
                    >
                        Employee
                    </button>
                    {type === 1 && (
                        <button
                            className={`${styles.tab} ${activeTab === 'calendar' ? styles.active : ''}`}
                            onClick={() => setActiveTab('calendar')}
                        >
                            Calendar
                        </button>
                    )}
                </div>

                {activeTab === 'employee' ? (
                    <div style={{ padding: '0 16px 24px' }}>
                        <table className={styles.employeeTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: 40, textAlign: 'center' }}>
                                        {isEditing && (
                                            <button className={styles.addBtn} onClick={() => setIsEmpModalOpen(true)}>
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </th>
                                    <th>{t('workPolicy.no')}</th>
                                    <th>{t('workPolicy.employee')}</th>
                                    <th>{t('workPolicy.rank')}</th>
                                    <th>{t('workPolicy.department')}</th>
                                    <th>{t('workPolicy.branch')}</th>
                                    <th>{t('workPolicy.section')}</th>
                                    <th>{t('workPolicy.company')}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeList.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                                            {t('workPolicy.noEmployees')}
                                        </td>
                                    </tr>
                                ) : (
                                    employeeList.map((emp, index) => (
                                        <tr key={emp.syskey}>
                                            <td></td>
                                            <td>{index + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{emp.name}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>{emp.eid}</div>
                                            </td>
                                            <td>{emp.rank}</td>
                                            <td>{emp.department || '-'}</td>
                                            <td>{emp.branch || '-'}</td>
                                            <td>{emp.section || '-'}</td>
                                            <td>{emp.company}</td>
                                            <td>
                                                {isEditing && (
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={() => handleRemoveEmployee(emp.syskey)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '0 16px 24px' }}>
                        {renderCalendarGrid()}
                    </div>
                )}
            </div>

            {/* ── Employee Search Modal ── */}
            <Modal
                open={isEmpModalOpen}
                onClose={() => { setIsEmpModalOpen(false); setEmpSearch(''); setEmpSearchInput(''); }}
                title={t('workPolicy.selectEmployees')}
                footer={
                    <Button variant="secondary" onClick={() => { setIsEmpModalOpen(false); setEmpSearch(''); setEmpSearchInput(''); }}>
                        {t('workPolicy.done', { count: employeeList.length })}
                    </Button>
                }
            >
                <div style={{ marginBottom: 16, display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            placeholder={t('workPolicy.searchEmployee')}
                            value={empSearchInput}
                            onChange={(e) => setEmpSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setEmpSearch(empSearchInput)}
                            icon={<Search size={18} />}
                            autoFocus
                        />
                    </div>
                    <Button onClick={() => setEmpSearch(empSearchInput)}>
                        {t('common.search', 'Search')}
                    </Button>
                    {(empSearchInput || empSearch) && (
                        <Button variant="secondary" onClick={() => { setEmpSearchInput(''); setEmpSearch(''); }}>
                            {t('common.clear', 'Clear')}
                        </Button>
                    )}
                </div>

                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {isLoadingEmps ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>{t('common.loading')}</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>{t('workPolicy.noEmployeesFound')}</div>
                    ) : (
                        filteredEmployees.map((emp) => {
                            const isSelected = employeeList.some(e => e.syskey === emp.employee_syskey);
                            return (
                                <div
                                    key={emp.employee_syskey}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: 12,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--color-primary-50, #eef2ff)' : '#fff',
                                        border: `1px solid ${isSelected ? 'var(--color-primary-200, #c7d2fe)' : 'var(--color-neutral-200, #e5e7eb)'}`
                                    }}
                                    onClick={() => handleSelectEmployee(emp)}
                                >
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 600, color: '#4b5563', fontSize: 13
                                    }}>
                                        {emp.employee_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>{emp.employee_name}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                                            {emp.employee_id} • {emp.relationship}
                                        </div>
                                    </div>
                                    {isSelected && <Check size={18} color="var(--color-primary-600, #4f46e5)" />}
                                </div>
                            );
                        })
                    )}
                </div>
            </Modal>

            {/* ── Delete Confirmation Modal ── */}
            <Modal
                open={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title={t('workPolicy.confirmDelete')}
                footer={
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button className={styles.cancelBtn} onClick={() => setIsDeleteConfirmOpen(false)}>
                            <X size={16} /> {t('workPolicy.cancel')}
                        </button>
                        <button className={styles.headerDeleteBtn} onClick={handleDelete}>
                            <Trash2 size={16} /> {t('workPolicy.delete')}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                    <p style={{ margin: 0, fontSize: 15, color: '#111827' }}>
                        {t('workPolicy.confirmDeleteMsg')}
                    </p>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#991b1b' }}>{code}</div>
                        <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 2 }}>{description}</div>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                        {t('workPolicy.cannotUndo')}
                    </p>
                </div>
            </Modal>
        </div>
    );
}
