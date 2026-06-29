import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    large?: boolean;
    extraLarge?: boolean;
}

export default function Modal({ open, onClose, title, children, footer, large, extraLarge }: ModalProps) {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = '';
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div
                className={`${styles.modal} ${large ? styles['modal--lg'] : ''} ${extraLarge ? styles['modal--xl'] : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className={styles.modal__header}>
                        <h2 className={styles.modal__title}>{title}</h2>
                        <button className={styles.modal__close} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div className={styles.modal__body}>{children}</div>
                {footer && <div className={styles.modal__footer}>{footer}</div>}
            </div>
        </div>,
        document.body
    );
}
