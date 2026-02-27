import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Building2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import styles from './DomainSelectPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DomainSelectPage() {
    const navigate = useNavigate();
    const { token, userId, domains, setUser, login } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string>('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token || !domains || domains.length === 0) {
            navigate('/login');
        }
    }, [token, domains, navigate]);

    const handleSelect = async (domain: any) => {
        setLoading(true);
        setError('');
        setSelectedId(domain.id || domain.domaincode);

        try {
            const domainId = domain.id || domain.domaincode;
            const domainName = domain.name || domain.domainname;

            // Fetch menu for the selected domain
            // This mirrors SelectComponent.ts: onSubmit
            const menuRes = await authClient.post('get-menu', {
                usersyskey: useAuthStore.getState().user?.usersyskey || '',
                role: useAuthStore.getState().user?.role || '',
                user_id: userId,
                app_id: APP_ID,
                domain: domainId,
                type: userId,
                domain_name: domainName,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = menuRes.data;
            if (data.access_token) {
                // Update store with final token and selected domain
                login({
                    token: data.access_token,
                    refreshToken: data.refresh_token,
                    userId: userId || '',
                    domain: domainId,
                    domains: domains, // keep them
                });

                setUser({
                    ...useAuthStore.getState().user,
                    domainName,
                } as any);

                navigate('/dashboard');
            } else {
                setError('Failed to switch domain.');
            }
        } catch (err: any) {
            console.error('Domain select error:', err);
            setError('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>A</div>
                    <h1 className={styles.title}>Select Organization</h1>
                    <p className={styles.subtitle}>Choose your domain to get started</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.list}>
                    {domains.map((domain: any) => {
                        const id = domain.id || domain.domaincode;
                        const name = domain.name || domain.domainname;
                        const desc = domain.description || '';

                        return (
                            <div
                                key={id}
                                className={`${styles.item} ${selectedId === id ? styles['item--selected'] : ''}`}
                                onClick={() => handleSelect(domain)}
                            >
                                <div className={styles.item__content}>
                                    <div className={styles.item__icon}>
                                        <Building2 size={24} />
                                    </div>
                                    <div className={styles.item__text}>
                                        <span className={styles.item__name}>{name}</span>
                                        {desc && <span className={styles.item__desc}>{desc}</span>}
                                    </div>
                                </div>
                                <div className={styles.item__arrow}>
                                    {loading && selectedId === id ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <ChevronRight size={20} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={styles.footer}>
                    <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => navigate('/login')}
                        disabled={loading}
                    >
                        Back to Login
                    </Button>
                </div>
            </div>
        </div>
    );
}
