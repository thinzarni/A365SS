import { AlertCircle } from 'lucide-react';
import Modal from '../Modal/Modal';
import styles from './LeaveConflictModal.module.css';

interface PendingLeave {
    requesttypedesc: string;
    startdate: string;
    enddate: string;
    status: number;
}

interface LeaveConflictModalProps {
    open: boolean;
    onClose: () => void;
    pendingLeaves: PendingLeave[];
}

export default function LeaveConflictModal({ open, onClose, pendingLeaves }: LeaveConflictModalProps) {
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

                <h2 className={styles.title}>Pending Leave Requests</h2>
                <p className={styles.subtitle}>
                    The following leave requests must be approved or rejected before authorization:
                </p>

                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Request Type</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingLeaves.map((leave, idx) => (
                                <tr key={idx}>
                                    <td className={styles.typeCol}>{leave.requesttypedesc}</td>
                                    <td>{formatDate(leave.startdate)}</td>
                                    <td>{formatDate(leave.enddate)}</td>
                                    <td>
                                        <span className={styles.pendingBadge}>Pending</span>
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
