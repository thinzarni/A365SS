import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    variant?: 'danger' | 'warning';
}

export default function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title = 'Confirm Deletion',
    message = 'This action cannot be undone. Are you sure you want to delete this?',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    loading = false,
    variant = 'danger',
}: ConfirmModalProps) {
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                {/* Icon */}
                <div className={`${styles.iconWrap} ${styles[`iconWrap--${variant}`]}`}>
                    <AlertTriangle size={28} />
                </div>

                {/* Content */}
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </button>
                    <button
                        className={`${styles.confirmBtn} ${styles[`confirmBtn--${variant}`]}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className={styles.spinner} />
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
