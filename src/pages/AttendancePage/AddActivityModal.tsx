import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { format, isSameDay, addHours } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

import mainClient from '../../lib/main-client';
import { useAuthStore } from '../../stores/auth-store';
import { useAttendanceStore } from '../../stores/attendance-store';
import { SAVE_CHECKIN, ATTENDANCE_SHIFT_DATA } from '../../config/api-routes';
import FileUpload from '../../components/ui/FileUpload/FileUpload';
import styles from './AttendancePage.module.css';

interface AddActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSuccess: () => void;
}

export default function AddActivityModal({ isOpen, onClose, selectedDate, onSuccess }: AddActivityModalProps) {
    const { user, userId, domain } = useAuthStore();
    const { activityTypes, fetchActivityTypes } = useAttendanceStore();

    const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
    const [endTime, setEndTime] = useState(format(addHours(new Date(), 1), 'HH:mm'));
    const [isAllDay, setIsAllDay] = useState(false);
    const [activityTypeSyskey, setActivityTypeSyskey] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper to convert "hh:mm a" to "HH:mm"
    const convertTo24h = (timeStr: string) => {
        if (!timeStr) return '09:00';
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString().padStart(2, '0');
        else hours = hours.padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Helper to convert "HH:mm" to "hh:mm a"
    const formatToBackend = (time24: string) => {
        const [hours, minutes] = time24.split(':');
        const d = new Date();
        d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
        return format(d, 'hh:mm a');
    };

    // Fetch activity types when modal opens if not loaded
    useEffect(() => {
        if (isOpen) {
            fetchActivityTypes();
            // Reset fields
            const now = new Date();
            setStartTime(format(now, 'HH:mm'));
            setEndTime(format(addHours(now, 1), 'HH:mm'));
            setIsAllDay(false);
            setDescription('');
            setFiles([]);
            if (activityTypes.length > 0 && !activityTypeSyskey) {
                setActivityTypeSyskey(activityTypes[0].syskey);
            }
        }
    }, [isOpen, fetchActivityTypes, activityTypes, activityTypeSyskey]);

    // Update default syskey if loaded later
    useEffect(() => {
        if (activityTypes.length > 0 && !activityTypeSyskey) {
            setActivityTypeSyskey(activityTypes[0].syskey);
        }
    }, [activityTypes, activityTypeSyskey]);

    // Fetch shift data for starttime / endtime
    const { data: shiftData } = useQuery({
        queryKey: ['shiftData'],
        queryFn: async () => {
            const res = await mainClient.post(ATTENDANCE_SHIFT_DATA, {});
            return res.data?.data || null;
        },
        staleTime: 5 * 60 * 1000,
        enabled: isOpen,
    });

    // Fetch employee profile for real employee_id and employee_syskey
    const { data: profile } = useQuery({
        queryKey: ['employee-profile', user?.usersyskey],
        queryFn: async () => {
            if (!user?.usersyskey) return null;
            const res = await mainClient.post('api/employees/profile');
            return res.data?.data ?? res.data ?? null;
        },
        staleTime: 5 * 60 * 1000,
        enabled: isOpen && !!user?.usersyskey
    });

    // Update times based on All Day toggle
    useEffect(() => {
        if (isAllDay && shiftData) {
            const s = shiftData.startTime || shiftData.starttime || '09:00 AM';
            const e = shiftData.endTime || shiftData.endtime || '05:30 PM';
            setStartTime(convertTo24h(s));
            setEndTime(convertTo24h(e));
        }
    }, [isAllDay, shiftData]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activityTypeSyskey) {
            toast.error('Please select an activity type');
            return;
        }

        setIsSubmitting(true);

        try {
            const formattedStartTime = formatToBackend(startTime);

            const isBackdate = !isSameDay(selectedDate, new Date());

            // Convert files to base64 format matching the mobile app
            const encodedImages = await Promise.all(
                files.map(async (file) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                            const result = reader.result as string;
                            // Mobile API requires the data uri prefix
                            resolve({
                                name: file.name,
                                mimeType: file.type || 'image/jpeg',
                                content: result,
                            });
                        };
                        reader.onerror = (error) => reject(error);
                    });
                })
            );

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const ms = String(now.getMilliseconds()).padStart(3, '0');
            const clicktime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}000`;

            const payload = {
                date: format(selectedDate, 'yyyyMMdd'),
                time: formattedStartTime,
                location: "Web Activity",
                latitude: "0.0",
                longitude: "0.0",
                type: 603,
                backdate: isBackdate,
                description: description || "",
                timezone: "Asia/Yangon",
                backdateout: null,
                starttime: shiftData?.startTime || '09:00 AM',
                endtime: shiftData?.endTime || '05:30 PM',
                location_syskey: "",
                checkintype_syskey: "",
                project_id: "",
                team_id: "",
                ticket_id: "",
                clicktime: clicktime,
                chk_syskey: null,
                activitytype_syskey: activityTypeSyskey || "",
                qr: null,
                currentlocation: "",
                locationtype: 1,
                remoteapproval: 2,
                backdateapproval: 0,
                devicetype: "",
                images: encodedImages,
                employee_name: profile?.employeeName || profile?.name || user?.name || "",
                employee_id: profile?.employeeID || profile?.eid || "",
                employee_syskey: profile?.employeeSyskey || profile?.syskey || "",
                shiftstarttime: shiftData?.startTime || '09:00 AM',
                shiftendtime: shiftData?.endTime || '05:30 PM',
                timeinoffset: "",
                timeoutoffset: "",
                location_map: true,
                userid: userId || "",
                domain: domain || ""
            };

            const res = await mainClient.post(SAVE_CHECKIN, payload);
            if (res.status === 200 || res.status === 201 || res.data?.status === 200 || res.data?.status === 201) {
                toast.success('Activity added successfully');
                onSuccess();
                onClose();
            } else {
                toast.error(res.data?.message || 'Failed to add activity');
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Error saving activity';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Add Activity Record</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.modalForm} onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>

                        <div className={styles.formGroup}>
                            <label>Date</label>
                            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10, color: '#475569', fontWeight: 500 }}>
                                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </div>
                        </div>

                        <div className={styles.toggleGroup}>
                            <label className={styles.toggleLabel}>
                                <div className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={isAllDay}
                                        onChange={e => setIsAllDay(e.target.checked)}
                                    />
                                    <span className={styles.slider}></span>
                                </div>
                                All Day
                            </label>
                            <button type="button" className={styles.selectTimeBtn} onClick={() => setIsAllDay(false)}>
                                Select Time
                            </button>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={e => {
                                        setStartTime(e.target.value);
                                        setIsAllDay(false);
                                    }}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>End Time</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={e => {
                                        setEndTime(e.target.value);
                                        setIsAllDay(false);
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Activity Type</label>
                            <div className={styles.selectWrap}>
                                <select
                                    value={activityTypeSyskey}
                                    onChange={e => setActivityTypeSyskey(e.target.value)}
                                    required
                                >
                                    {activityTypes.length === 0 && <option value="">Loading...</option>}
                                    {activityTypes.map(type => (
                                        <option key={type.syskey} value={type.syskey}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className={styles.selectIcon} />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What did you do today?"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <FileUpload
                                label="Photo Attachments"
                                files={files}
                                onChange={setFiles}
                                accept="image/*"
                                multiple={true}
                            />
                        </div>

                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <div className={styles.submitSpinner}></div>
                            ) : (
                                'Save Activity'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
