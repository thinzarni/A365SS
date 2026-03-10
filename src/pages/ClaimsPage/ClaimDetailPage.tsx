import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Receipt, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { StatusBadge } from '../../components/ui/Badge/Badge';
import type { ClaimModel } from '../../types/models';
import apiClient from '../../lib/api-client';
import { CLAIM_DETAIL, DELETE_CLAIM, CURRENCY_TYPES } from '../../config/api-routes';
import type { TypesModel } from '../../types/models';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './ClaimsPage.module.css';


function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
    return (
        <div className={styles['claim-detail__field']}>
            <span className={styles['claim-detail__field-label']}>{label}</span>
            <span className={`${styles['claim-detail__field-value']} ${!value ? styles['claim-detail__field-value--empty'] : ''}`}>
                {value || '—'}
            </span>
        </div>
    );
}

export default function ClaimDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: claim, isLoading } = useQuery<ClaimModel>({
        queryKey: ['claimDetail', id],
        queryFn: async () => {
            const res = await apiClient.post(CLAIM_DETAIL, { syskey: id });
            return res.data?.datalist;
        },
        enabled: !!id,
    });

    const { data: currencyList = [] } = useQuery<TypesModel[]>({
        queryKey: ['currencyTypeList'],
        queryFn: async () => {
            const res = await apiClient.get(CURRENCY_TYPES);
            return res.data?.datalist || [];
        },
    });

    // Resolve syskey → human-readable currency name
    const currencyName = currencyList.find(c => c.syskey === claim?.currencytype)?.description
        || (claim as any)?.currencytypedesc
        || claim?.currencytype
        || 'MMK';

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(DELETE_CLAIM, { syskey: id });
        },
        onSuccess: () => {
            toast.success('Claim deleted');
            queryClient.invalidateQueries({ queryKey: ['claims'] });
            navigate('/claims');
        },
        onError: () => toast.error(t('common.error')),
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = () => setShowDeleteModal(true);


    if (isLoading) {
        return (
            <div className={styles['claim-detail']}>
                <div className={styles['claim-detail__card']}>
                    <div className={styles['claim-detail__skeleton']}>
                        <div className={styles['claim-detail__skeleton-bar']} style={{ width: '60%' }} />
                        <div className={styles['claim-detail__skeleton-bar']} style={{ width: '80%' }} />
                        <div className={styles['claim-detail__skeleton-bar']} style={{ width: '40%' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (!claim) {
        return (
            <div className={styles['claim-detail']}>
                <button className={styles['claim-detail__back']} onClick={() => navigate('/claims')}>
                    <ArrowLeft size={16} /> {t('common.back')}
                </button>
                <div className="empty-state">
                    <Receipt size={48} className="empty-state__icon" />
                    <h3 className="empty-state__title">Claim not found</h3>
                </div>
            </div>
        );
    }

    const isPending = claim.requeststatus === '1';

    return (
        <div className={styles['claim-detail']}>
            <button className={styles['claim-detail__back']} onClick={() => navigate('/claims')}>
                <ArrowLeft size={16} />
                {t('common.back')}
            </button>

            <div className={styles['claim-detail__card']}>
                {/* Header */}
                <div className={styles['claim-detail__header']}>
                    <div className={styles['claim-detail__header-left']}>
                        <div className={styles['claim-detail__icon']}>
                            <Receipt size={22} />
                        </div>
                        <div className={styles['claim-detail__title-group']}>
                            <h2>{claim.claimtype || claim.requesttype || 'Expense Claim'}</h2>
                            <span>Ref #{claim.refno || '—'}</span>
                        </div>
                    </div>
                    <StatusBadge status={claim.requeststatus} />
                </div>

                {/* Body */}
                <div className={styles['claim-detail__body']}>
                    {/* Amount highlight */}
                    <div style={{ marginBottom: 'var(--space-5)', textAlign: 'center' }}>
                        <span className={styles['claim-detail__amount-highlight']}>
                            {currencyName} {(claim.amount || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className={styles['claim-detail__grid']}>
                        <Field label="Date" value={claim.date} />
                        <Field label="Claim Type" value={claim.claimtype || claim.requesttype} />
                        <Field label="From" value={claim.fromPlace} />
                        <Field label="To" value={claim.toPlace} />
                        <Field label="Approved By" value={claim.approvedby} />
                        <Field label="Remark" value={claim.remark} />
                    </div>

                    {/* Approvers */}
                    {claim.selectedApprovers && claim.selectedApprovers.length > 0 && (
                        <div style={{ marginTop: 'var(--space-5)' }}>
                            <div className={styles['claim-detail__field-label']} style={{ marginBottom: 'var(--space-2)' }}>
                                Approvers
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                {claim.selectedApprovers.map((a) => (
                                    <span
                                        key={a.syskey}
                                        style={{
                                            padding: '4px 12px',
                                            background: 'var(--color-neutral-50)',
                                            border: '1px solid var(--color-neutral-100)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--text-sm)',
                                        }}
                                    >
                                        {a.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {isPending && (
                    <div className={styles['claim-detail__actions']}>
                        <Button variant="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
                            <Trash2 size={16} />
                            {t('request.delete')}
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => { deleteMutation.mutate(); setShowDeleteModal(false); }}
                title="Delete Claim"
                message="This will permanently delete this expense claim. This action cannot be undone."
                confirmLabel="Delete Claim"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
