import { AlertCircle } from 'lucide-react';
import Modal from '../Modal/Modal';
import styles from './AttendanceConflictModal.module.css';

interface MissingAttendance {
    date: string;
    missing: string;
}

interface AttendanceConflictModalProps {
    open: boolean;
    onClose: () => void;
    missingRecords: MissingAttendance[];
}

export default function AttendanceConflictModal({ open, onClose, missingRecords }: AttendanceConflictModalProps) {
    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
    };

    return (
        <Modal open={open} onClose={onClose} large>
            <div className={styles.container}>
                <div className={styles.iconWrap}>
                    <AlertCircle size={48} className={styles.icon} />
                </div>

                <h2 className={styles.title}>Attendance Validation</h2>
                <p className={styles.subtitle}>
                    The following working days have incomplete attendance records. Please ensure all Time In (601) and Time Out (602) records are complete before authorization:
                </p>

                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {missingRecords.map((record, idx) => (
                                <tr key={idx}>
                                    <td className={styles.dateCol}>{formatDate(record.date)}</td>
                                    <td>
                                        <span className={styles.missingBadge}>Missing {record.missing}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.footer}>
                    <button className={styles.okBtn} onClick={onClose}>
                        OK
                    </button>
                </div>
            </div>
        </Modal>
    );
}
