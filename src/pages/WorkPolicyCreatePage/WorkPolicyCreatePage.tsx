import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Save, X, List, Plus, Trash2, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api-client';
import mainClient from '../../lib/main-client';
import {
    WORKPOLICY_INSERT,
    SETUP_WORKPOLICY,
    SETUP_CALENDAR,
    SUPERVISE_USER_LIST,
    SUPERVISE_WORKPOLICY_LIST,
    WORKPOLICY_PERSONALIZE,
    SETUP_ROSTER
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

        // Skip calling the calendar detail API if we are creating a new policy
        if (!selectedSyskey || !syskey) return;

        try {
            const calRes = await apiClient.post('api/hxm/calendar/detail', { syskey: selectedSyskey });
            const detail = calRes.data?.datalist?.[0];
            if (detail) {
                if (detail.calendarObj) {
                    if (detail.calendarObj.fromdate && !startDate) setStartDate(formatFromApiDate(detail.calendarObj.fromdate));
                    if (detail.calendarObj.todate && !endDate) setEndDate(formatFromApiDate(detail.calendarObj.todate));
                }
                if (detail.calendarShiftObj) {
                    setCalendarShiftData(detail.calendarShiftObj);
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

    const handleSave = async () => {
        if (!code || !description || !startDate || !endDate || !workPolicyId) {
            toast.error('Please fill in all required fields.');
            return;
        }

        if (type === 0 && !rosterId) {
            toast.error('Please select a Roster.');
            return;
        }

        if (type === 1 && !calendarId) {
            toast.error('Please select a Calendar.');
            return;
        }

        if (employeeList.length === 0) {
            toast.error('Please add at least one employee.');
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
            roster: type === 0 ? rosterId : null,
            workpolicy: workPolicyId,
            employeeList: employeeList.map((emp, index) => ({
                ...emp,
                rownum: String(index + 1)
            })),
            shiftData: type === 1 ? calendarShiftData : [],
            userid: userId || '',
            domain: domain || ''
        };

        if (syskey) {
            payload.syskey = syskey;
        }

        try {
            const apiEndpoint = syskey ? WORKPOLICY_PERSONALIZE : WORKPOLICY_INSERT;
            await apiClient.post(apiEndpoint, payload);
            toast.success(syskey ? 'Work policy updated successfully!' : 'Work policy created successfully!');
            navigate('/calendarshift');
        } catch (error) {
            console.error('Error creating work policy:', error);
            toast.error('Failed to create work policy.');
        }
    };

    return (
        <div className={styles.page}>
            {/* ── Header ── */}
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>{syskey ? 'Edit Work Policy' : 'New Work Policy'}</h1>
                <div className={styles.headerActions}>
                    <button className={styles.saveBtn} onClick={handleSave}>
                        <Save size={16} /> Save
                    </button>
                    <button className={styles.cancelBtn} onClick={() => navigate('/calendarshift')}>
                        <X size={16} /> Cancel
                    </button>
                    <button className={styles.listBtn} onClick={() => navigate('/calendarshift')}>
                        <List size={16} /> List
                    </button>
                </div>
            </div>

            {/* ── Form Card ── */}
            {isEditLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>Loading policy data...</div>
            ) : (
                <div className={styles.card}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Ref No.<span>*</span></label>
                            <input className={styles.input} value="TBA" disabled />
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '22px' }}>
                            <label className={styles.checkboxGroup}>
                                <input
                                    type="checkbox"
                                    checked={countingPublicHoliday}
                                    onChange={e => setCountingPublicHoliday(e.target.checked)}
                                />
                                Counting Public Holiday
                            </label>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Code<span>*</span></label>
                            <input
                                className={styles.input}
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                disabled
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Description<span>*</span></label>
                            <input
                                className={styles.input}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                disabled
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Date<span>*</span></label>
                            <div className={styles.dateRange}>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                                <span>-</span>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Roster / Calendar<span>*</span></label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="type"
                                        checked={type === 0}
                                        onChange={() => setType(0)}
                                    />
                                    Roster
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="type"
                                        checked={type === 1}
                                        onChange={() => setType(1)}
                                    />
                                    Calendar
                                </label>
                            </div>
                            {type === 0 ? (
                                <select
                                    className={styles.select}
                                    value={rosterId}
                                    onChange={e => setRosterId(e.target.value)}
                                >
                                    <option value="">Select Roster</option>
                                    {rosters.map(r => (
                                        <option key={r.syskey} value={r.syskey}>{r.description || r.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    className={styles.select}
                                    value={calendarId}
                                    onChange={e => handleCalendarChange(e.target.value)}
                                >
                                    <option value="">Select Calendar</option>
                                    {calendars.map(c => (
                                        <option key={c.syskey} value={c.syskey}>{c.description || c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label>Work Policy<span>*</span></label>
                            <select
                                className={styles.select}
                                value={workPolicyId}
                                onChange={e => setWorkPolicyId(e.target.value)}
                            >
                                <option value="">Select Work Policy</option>
                                {workPolicies.map(w => (
                                    <option key={w.syskey} value={w.syskey}>{w.description || w.name}</option>
                                ))}
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
                                        <button className={styles.addBtn} onClick={() => setIsEmpModalOpen(true)}>
                                            <Plus size={16} />
                                        </button>
                                    </th>
                                    <th>No.</th>
                                    <th>Employee</th>
                                    <th>Rank</th>
                                    <th>Department</th>
                                    <th>Branch</th>
                                    <th>Section</th>
                                    <th>Company</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeList.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                                            No employees selected. Click the + button to add.
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
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleRemoveEmployee(emp.syskey)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
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
                onClose={() => { setIsEmpModalOpen(false); setEmpSearch(''); }}
                title="Select Employees"
                footer={
                    <Button variant="secondary" onClick={() => { setIsEmpModalOpen(false); setEmpSearch(''); }}>
                        Done ({employeeList.length} selected)
                    </Button>
                }
            >
                <div style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Search by name or ID…"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        icon={<Search size={18} />}
                        autoFocus
                    />
                </div>

                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {isLoadingEmps ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading employees…</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No employees found</div>
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
        </div>
    );
}
