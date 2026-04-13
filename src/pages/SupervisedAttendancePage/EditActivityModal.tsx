import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import apiClient from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
// Reusing identical modal styles from AttendancePage
import modalStyles from '../AttendancePage/AttendancePage.module.css';

interface EditActivityModalProps {
    syskey: string | null;
    initialDate?: string;
    readOnly?: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Parse "20260412" -> "2026-04-12"
const parseDateInput = (str: string | undefined) => {
    if (!str) return '';
    if (str.length === 8 && !str.includes('-')) {
        return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
    }
    if (str.includes('T')) return str.substring(0, 10);
    return str;
};

export default function EditActivityModal({ syskey, initialDate, readOnly = false, onClose, onSuccess }: EditActivityModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields
    const [attendanceType, setAttendanceType] = useState('');
    const [date, setDate] = useState(parseDateInput(initialDate));
    const [time, setTime] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isBackdate, setIsBackdate] = useState(false);
    const { userId, domain } = useAuthStore();
    const [employeeDisplay, setEmployeeDisplay] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [subTypeSyskey, setSubTypeSyskey] = useState('');

    // Fetch primary attendance types
    const { data: attendanceTypesList } = useQuery({
        queryKey: ['setup-attendancetypes-list'],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/attendancetype`);
            return res.data?.datalist || [];
        }
    });

    const selectedAttTypeObj = attendanceTypesList?.find((t: any) => t.syskey === attendanceType);
    const isActivity = selectedAttTypeObj?.name === 603 || selectedAttTypeObj?.name === '603';
    const isCheckIn = selectedAttTypeObj?.name === 604 || selectedAttTypeObj?.name === '604';

    // Fetch subtypes conditionally
    const { data: checkInTypes } = useQuery({
        queryKey: ['setup-checkintypes-list'],
        queryFn: async () => {
            const res = await apiClient.get(`api/hxm/setup/getSetupList/checkintype`);
            return res.data?.datalist || [];
        },
        enabled: isCheckIn
    });

    const { data: activitySubTypes } = useQuery({
        queryKey: ['setup-activitytypes-list'],
        queryFn: async () => {
            // Mapping from getSetupList/activitytype
            const res = await apiClient.get(`api/hxm/setup/getSetupList/activitytype`);
            return res.data?.datalist || [];
        },
        enabled: isActivity
    });

    // Format "03:27 PM" <-> "15:27"
    const parseTime12h = (timeStr: string) => {
        if (!timeStr) return '';
        const match = timeStr.match(/(\d+):(\d+)\s?(AM|PM)/i);
        if (!match) return timeStr;
        let [_, h, m, mod] = match;
        let hours = parseInt(h, 10);
        if (mod.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (mod.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${m}`;
    };

    const formatTime12h = (time24: string) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
    };

    useEffect(() => {
        if (syskey) {
            setDate(parseDateInput(initialDate));
        }
    }, [syskey, initialDate]);

    // Fetch Details
    const { data: details, isLoading } = useQuery({
        queryKey: ['attendance-detail', syskey],
        queryFn: async () => {
            if (!syskey) return null;
            const res = await apiClient.get(`api/hxm/attendance/A365attendance/${syskey}`);
            return res.data?.datalist || res.data;
        },
        enabled: Boolean(syskey)
    });

    useEffect(() => {
        if (details) {
            setEmployeeDisplay(`${details.employee_id || ''} ${details.name || details.username || ''}`.trim());
            setEmployeeId(details.employee_id || '');
            setAttendanceType(details.type || details.attendancetype || '');
            setDate((prev) => prev || parseDateInput(details.date));
            setTime(parseTime12h(details.time));
            setLatitude(details.latitude || '');
            setLongitude(details.longitude || '');
            setLocation(details.location || '');
            setDescription(details.description || '');
            setIsBackdate(details.backdateflag || false);
            setSubTypeSyskey(details.subtype || details.activity_type || details.checkin_type || '');
        }
    }, [details]);

    // Lock body scroll
    useEffect(() => {
        if (syskey) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [syskey]);

    if (!syskey) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                userid: userId,
                domain: domain,
                serverdate: date.replace(/-/g, ''), // e.g. "20260412"
                date: date.replace(/-/g, ''),
                time: formatTime12h(time), // e.g. "03:27 PM"
                latitude,
                longitude,
                attendancetype: attendanceType,
                typeSyskey: "",
                location,
                description,
                backdate: isBackdate,
                remotereason: details?.remotereason || 1,
                backdatereason: details?.backdatereason || 1,
                employeeid: employeeId,
                checkin_type: isCheckIn ? subTypeSyskey : null,
                activity_type: isActivity ? subTypeSyskey : null,
                subtype: (isActivity || isCheckIn) ? subTypeSyskey : null
            };

            const res = await apiClient.put(`api/hxm/attendance/A365attendance/insert/${syskey}`, payload);

            if (res.status === 200 || res.status === 201 || res.data?.statuscode === 200) {
                toast.success('Attendance record updated successfully');
                onSuccess();
                onClose();
            } else {
                toast.error(res.data?.message || 'Failed to update record');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Error updating record');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={modalStyles.modalOverlay} onClick={onClose}>
            <div className={modalStyles.modalContent} style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div className={modalStyles.modalHeader}>
                    <h2>{readOnly ? 'View Check In Record' : 'Edit Check In Record'}</h2>
                    <button type="button" className={modalStyles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className={modalStyles.modalForm} onSubmit={handleSubmit}>
                    {isLoading ? (
                        <div className={modalStyles.modalBody} style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <div className={modalStyles.submitSpinner} style={{ width: 24, height: 24, borderColor: '#ccc', borderTopColor: '#2563eb' }}></div>
                        </div>
                    ) : (
                        <div className={modalStyles.modalBody}>
                            <div className={modalStyles.formRow} style={{ gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: 24 }}>
                                {/* LEFT COLUMN */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className={modalStyles.formGroup}>
                                        <label>Employee<span style={{ color: 'red' }}>*</span></label>
                                        <input type="text" value={employeeDisplay} disabled style={{ background: '#f1f5f9', color: '#64748b' }} />
                                    </div>

                                    <div className={modalStyles.formGroup}>
                                        <label>Attendance Type<span style={{ color: 'red' }}>*</span></label>
                                        <div className={modalStyles.selectWrap}>
                                            <select
                                                value={attendanceType}
                                                onChange={e => {
                                                    setAttendanceType(e.target.value);
                                                    setSubTypeSyskey('');
                                                }}
                                                required
                                                disabled={readOnly}
                                            >
                                                <option value="">Select Type</option>
                                                {attendanceTypesList?.map((type: any) => (
                                                    <option key={type.syskey} value={type.syskey}>{type.description || type.name}</option>
                                                ))}
                                                {/* Fallback option if missing */}
                                                {attendanceType && !attendanceTypesList?.find((t: any) => t.syskey === attendanceType) && (
                                                    <option value={attendanceType}>Current Type</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {(isCheckIn || isActivity) && (
                                        <div className={modalStyles.formGroup}>
                                            <label>Sub Type<span style={{ color: 'red' }}>*</span></label>
                                            <div className={modalStyles.selectWrap}>
                                                <select
                                                    value={subTypeSyskey}
                                                    onChange={e => setSubTypeSyskey(e.target.value)}
                                                    required
                                                    disabled={readOnly}
                                                >
                                                    <option value="">Select Sub Type</option>
                                                    {isCheckIn && checkInTypes?.map((type: any) => (
                                                        <option key={type.syskey} value={type.syskey}>{type.description || type.name}</option>
                                                    ))}
                                                    {isActivity && activitySubTypes?.map((type: any) => (
                                                        <option key={type.syskey} value={type.syskey}>{type.description || type.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className={modalStyles.formGroup}>
                                        <label>Date<span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            required
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className={modalStyles.formGroup}>
                                        <label>Time<span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={e => setTime(e.target.value)}
                                            required
                                            disabled={readOnly}
                                        />
                                    </div>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className={modalStyles.formGroup}>
                                        <label>Latitude</label>
                                        <input
                                            type="text"
                                            value={latitude}
                                            onChange={e => setLatitude(e.target.value)}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className={modalStyles.formGroup}>
                                        <label>Longitude</label>
                                        <input
                                            type="text"
                                            value={longitude}
                                            onChange={e => setLongitude(e.target.value)}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className={modalStyles.formGroup}>
                                        <label>Location</label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={e => setLocation(e.target.value)}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className={modalStyles.formGroup}>
                                        <label>Description</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            style={{ minHeight: '60px' }}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <label className={modalStyles.toggleLabel} style={{ marginTop: 'auto' }}>
                                        <div className={modalStyles.switch}>
                                            <input
                                                type="checkbox"
                                                checked={isBackdate}
                                                onChange={e => setIsBackdate(e.target.checked)}
                                                disabled={readOnly}
                                            />
                                            <span className={modalStyles.slider}></span>
                                        </div>
                                        <span>Backdate</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={modalStyles.modalFooter} style={{ justifyContent: 'flex-start' }}>
                        {!readOnly && (
                            <button type="submit" className={modalStyles.submitBtn} disabled={isSubmitting || isLoading}>
                                {isSubmitting ? <div className={modalStyles.submitSpinner}></div> : <><Save size={16} /> Save</>}
                            </button>
                        )}
                        <button type="button" className={modalStyles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
                            <X size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {readOnly ? 'Close' : 'Cancel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
