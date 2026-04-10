import { useTranslation } from 'react-i18next';
import { X, Check, Clock, ChevronRight, User, MessageSquare, Info } from 'lucide-react';
import type { StepLevelData } from '../../types/models';
import styles from './ApprovalWorkflowModal.module.css';

interface ApprovalWorkflowModalProps {
    steps: StepLevelData[];
}

export default function ApprovalWorkflowModal({ steps }: ApprovalWorkflowModalProps) {
    const { t } = useTranslation();

    const getStatusConfig = (status: number) => {
        switch (status) {
            case 2: // Approved
                return {
                    label: t('status.approved'),
                    className: styles['workflow__status--approved'],
                    iconClassName: styles['workflow__icon--approved'],
                    Icon: Check,
                };
            case 3: // Rejected
                return {
                    label: t('status.rejected'),
                    className: styles['workflow__status--rejected'],
                    iconClassName: styles['workflow__icon--rejected'],
                    Icon: X,
                };
            case 1: // Pending
                return {
                    label: t('status.pending'),
                    className: styles['workflow__status--pending'],
                    iconClassName: styles['workflow__icon--pending'],
                    Icon: Clock,
                };
            default: // 0 = Upcoming
                return {
                    label: t('approval.upcoming'),
                    className: styles['workflow__status--upcoming'],
                    iconClassName: styles['workflow__icon--upcoming'],
                    Icon: ChevronRight,
                };
        }
    };

    return (
        <div className={styles.workflow}>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--color-neutral-900)' }}>
                    {t('approval.workflowTitle')}
                </h4>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-600)' }}>
                    {t('approval.workflowSubtitle')}
                </p>
            </div>

            {steps.map((step, idx) => {
                    const config = getStatusConfig(step.status);
                    const isLast = idx === steps.length - 1;
                    const nextStepStatus = !isLast ? steps[idx + 1].status : null;
                    const lineActive = step.status === 2 && (nextStepStatus === 2 || nextStepStatus === 1 || nextStepStatus === 3);

                    return (
                        <div key={idx} className={styles.workflow__item}>
                            <div className={styles.workflow__indicator}>
                                <div className={`${styles.workflow__icon} ${config.iconClassName}`}>
                                    <config.Icon size={18} />
                                </div>
                                {!isLast && (
                                    <div className={`${styles.workflow__line} ${lineActive ? styles['workflow__line--active'] : ''}`} />
                                )}
                            </div>

                            <div className={styles.workflow__card}>
                                <div className={styles['workflow__card-header']}>
                                    <div className={styles['workflow__card-title-group']}>
                                        <span className={styles['workflow__card-title']}>
                                            {t('approval.step')} {step.level}: {step.rankrole_specificperson}
                                        </span>
                                        {step.is_ro && (
                                            <span className={styles['workflow__ro-badge']}>
                                                <User size={12} />
                                                {/* Hardcoded acronym is fine, it matches the design */}
                                                Reporting Officer (RO)
                                            </span>
                                        )}
                                    </div>
                                    <span className={`${styles['workflow__status-badge']} ${config.className}`}>
                                        {config.label}
                                    </span>
                                </div>

                                <div className={styles['workflow__card-body']}>
                                    {step.status === 1 && (
                                        <div className={styles['workflow__detail-row']}>
                                            <Clock size={14} style={{ color: 'var(--color-warning-500)' }} />
                                            <span className={styles['workflow__info-text']}>
                                                {t('approval.waitingAction')}
                                            </span>
                                        </div>
                                    )}

                                    {step.status === 0 && (
                                        <div className={styles['workflow__detail-row']}>
                                            <Info size={14} />
                                            <span className={styles['workflow__info-text']}>
                                                {t('approval.lockedUntil')}
                                            </span>
                                        </div>
                                    )}

                                    {step.approvedby && (
                                        <div className={styles['workflow__detail-row']}>
                                            <User size={14} />
                                            <span>
                                                <strong>{t('approval.processedBy')}:</strong> {step.approvedby}
                                            </span>
                                        </div>
                                    )}

                                    {step.remark && (
                                        <div className={styles['workflow__detail-row']}>
                                            <MessageSquare size={14} />
                                            <span>
                                                <strong>{t('approval.remark')}:</strong> {step.remark}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
