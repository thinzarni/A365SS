import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon, Save, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';
import mainClient from '../../lib/main-client';
import { CALENDAR_DETAIL, SHIFT_TIME, WORKPOLICY_PERSONALIZE } from '../../config/api-routes';
import toast from 'react-hot-toast';
import styles from './ShiftCalendarModal.module.css';
import apiClient from '../../lib/api-client';

interface ShiftCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: any; // WorkPolicyRow
}

interface ShiftData {
    date: string;
    shiftSyskey: string;
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

export default function ShiftCalendarModal({ isOpen, onClose, employee }: ShiftCalendarModalProps) {
    const { userId, domain } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
    const [shiftData, setShiftData] = useState<ShiftData[]>([]);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    useEffect(() => {
        if (!isOpen || !employee) return;
        fetchData();
    }, [isOpen, employee]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Shift Options
            const shiftRes = await apiClient.get(`api/hxm/setup/getSetupList/shift`);
            let shifts: ShiftOption[] = [];
            if (shiftRes.data?.datalist) {
                shifts = shiftRes.data.datalist;
            } else if (Array.isArray(shiftRes.data)) {
                shifts = shiftRes.data;
            }
            // Add an empty shift option for "Off Day"
            setShiftOptions([{ syskey: '', name: '-', description: '-' }, ...shifts]);

            // Fetch Calendar Detail
            const calRes = await apiClient.post(CALENDAR_DETAIL, {
                syskey: employee.calendarsyskey, // Use employee.calendar as calendarsyskey
                userid: userId || '',
                domain: domain || ''
            });

            if (calRes.data?.datalist && calRes.data.datalist.length > 0) {
                const dataObj = calRes.data.datalist[0];
                if (dataObj.calendarShiftObj) {
                    setShiftData(dataObj.calendarShiftObj);
                    if (dataObj.calendarShiftObj.length > 0) {
                        // Set current month to the start date of the calendar
                        const firstDateStr = dataObj.calendarShiftObj[0].date;
                        if (firstDateStr && firstDateStr.length === 8) {
                            const y = parseInt(firstDateStr.slice(0, 4));
                            const m = parseInt(firstDateStr.slice(4, 6)) - 1;
                            setCurrentMonth(new Date());
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching calendar details:', error);
            toast.error('Failed to load calendar details');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                code: employee.code,
                description: employee.description,
                startdate: employee.startdate,
                enddate: employee.enddate,
                workpolicy: employee.workpolicy || '',
                calendarsyskey: employee.calendar || employee.syskey,
                employeesyskey: employee.employee_syskey,
                shiftData: shiftData,
                isWPExist: true,
                countingpublicholiday: true,
                userid: userId || '',
                domain: domain || ''
            };

            await apiClient.post(WORKPOLICY_PERSONALIZE, payload);
            toast.success('Work policy shifts updated successfully');
            onClose();
        } catch (error) {
            console.error('Error saving shifts:', error);
            toast.error('Failed to save shifts');
        } finally {
            setSaving(false);
        }
    };

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

    if (!isOpen) return null;

    // Helper to format YYYYMMDD to Date
    const parseDateStr = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return new Date();
        const y = parseInt(dateStr.slice(0, 4));
        const m = parseInt(dateStr.slice(4, 6)) - 1;
        const d = parseInt(dateStr.slice(6, 8));
        return new Date(y, m, d);
    };

    // Prepare calendar grid cells for continuous period
    const renderCalendarGrid = () => {
        if (shiftData.length === 0) return <div style={{ textAlign: 'center', padding: 20 }}>No shift data available</div>;

        const cells = [];
        const firstDate = parseDateStr(shiftData[0].date);
        const firstDayOfWeek = firstDate.getDay();

        // Empty cells before start
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push(<div key={`empty-start-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
        }

        // Days
        shiftData.forEach((item) => {
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
                            setShiftData(prev => prev.map(s => s.date === item.date ? { ...s, shiftSyskey: val } : s));
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

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.headerIcon}>
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <h2 className={styles.title}>Edit Shift Calendar</h2>
                            <p className={styles.subtitle}>{employee?.name} - {employee?.description}</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} disabled={saving}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.loader}>
                            <div className={styles.spinner} />
                            <span>Loading calendar details...</span>
                        </div>
                    ) : (
                        renderCalendarGrid()
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
                        Cancel
                    </button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving || loading}>
                        {saving ? <RefreshCw size={16} className={styles.spinner} style={{ border: 'none' }} /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>


        </div>
    );
}
