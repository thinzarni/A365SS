import { useTranslation } from 'react-i18next';
import { RequestStatus } from '../../../types/models';
import styles from './Badge.module.css';

type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'info' | 'neutral' | 'approved-outline' | 'rejected-outline' | 'pending-outline';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    dot?: boolean;
    className?: string;
}

export function Badge({ children, variant = 'neutral', dot, className = '' }: BadgeProps) {
    return (
        <span className={`${styles.badge} ${styles[`badge--${variant}`]} ${className}`}>
            {dot && <span className={styles.badge__dot} />}
            {children}
        </span>
    );
}

interface StatusBadgeProps {
    status: string | number;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const { t } = useTranslation();
    const statusStr = String(status);

    const variantMap: Record<string, BadgeVariant> = {
        [RequestStatus.Pending]: 'pending',
        [RequestStatus.Approved]: 'approved',
        [RequestStatus.Rejected]: 'rejected',
    };

    const labelMap: Record<string, string> = {
        [RequestStatus.Pending]: t('status.pending'),
        [RequestStatus.Approved]: t('status.approved'),
        [RequestStatus.Rejected]: t('status.rejected'),
    };

    return (
        <Badge variant={variantMap[statusStr] || 'neutral'} dot className={className}>
            {labelMap[statusStr] || statusStr}
        </Badge>
    );
}

export default Badge;
