import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QrCode, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import { GENERATE_QR, QR_SUCCESS } from '../../config/api-routes';
import styles from './LoginPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function QRLoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, setUser } = useAuthStore();

    const [qrCode, setQrCode] = useState('');
    const [qrKey, setQrKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    /* ══════════════════════════════════════════════════════════════
       Generate QR on mount
       ══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const fetchQR = async () => {
            try {
                const res = await authClient.post(GENERATE_QR, { app_id: APP_ID });
                if (res.data?.status === 200 && res.data?.data) {
                    setQrCode(res.data.data.qr_code);
                    setQrKey(res.data.data.qr_key);
                } else {
                    setError('Failed to generate QR code');
                }
            } catch (err) {
                setError('Failed to connect to auth service');
            } finally {
                setLoading(false);
            }
        };

        fetchQR();
    }, []);

    /* ══════════════════════════════════════════════════════════════
       Poll for QR success
       ══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (!qrKey) return;

        const interval = setInterval(async () => {
            try {
                const res = await authClient.post(QR_SUCCESS, {
                    qr_key: qrKey,
                    appid: APP_ID,
                });

                if (res.data?.status === 200 && res.data?.data) {
                    clearInterval(interval);
                    await completeLogin(res.data.data);
                }
            } catch (err) {
                // Ignore polling errors
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [qrKey]);

    const completeLogin = async (signInData: any) => {
        const token = signInData.access_token;
        const refreshToken = signInData.refresh_token;
        const userId = signInData.user_id;
        const usersyskey = signInData.usersyskey;
        const role = String(signInData.approle || '');

        // Fetch domains and complete logic matching LoginPage.tsx
        let domainId = '';
        let domainName = '';
        let domainList: any[] = [];

        try {
            const domRes = await authClient.post('domain',
                { user_id: userId, app_id: APP_ID },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            domainList = domRes.data?.data?.domain || domRes.data?.datalist || [];
            if (Array.isArray(domainList) && domainList.length > 0) {
                domainId = String(domainList[0].id || domainList[0].domaincode || '');
                domainName = String(domainList[0].name || domainList[0].domainname || '');
            }
        } catch (err) {
            console.warn('Domain fetch failed during QR login', err);
        }

        // ──────── Store auth state and determine routing ────────
        login({
            token,
            refreshToken,
            userId,
            domain: domainId,
            domains: domainList,
        });

        setUser({
            name: userId,
            usersyskey,
            role,
        } as any);

        if (domainList.length > 1) {
            navigate('/select');
        } else {
            // ──────── Single domain → Auto-fetch menu and go to dashboard ────────
            try {
                const menuRes = await authClient.post('get-menu', {
                    usersyskey,
                    role,
                    user_id: userId,
                    app_id: APP_ID,
                    domain: domainId,
                    type: userId,
                    domain_name: domainName,
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = menuRes.data;
                const finalToken = data.access_token || data.data?.access_token || token;
                const finalRefresh = data.refresh_token || data.data?.refresh_token || refreshToken;

                login({
                    token: finalToken,
                    refreshToken: finalRefresh,
                    userId,
                    domain: domainId,
                    domains: domainList,
                });

                setUser({
                    name: domainName ? `${userId}` : userId,
                    domainName,
                    usersyskey,
                    role,
                } as any);

                navigate('/dashboard');
            } catch (err) {
                console.warn('get-menu failed, using initial token');
                navigate('/dashboard');
            }
        }
    };

    return (
        <div className={styles.login}>
            <div className={styles.login__hero}>
                <div className={styles['login__hero-content']}>
                    <div className={styles['login__hero-logo']}>
                        <QrCode size={40} />
                    </div>
                    <h1 className={styles['login__hero-title']}>{t('auth.qrSignIn')}</h1>
                    <p className={styles['login__hero-subtitle']}>
                        Scan the QR code with your mobile app to sign in instantly.
                    </p>
                </div>
            </div>

            <div className={styles['login__form-panel']}>
                <div className={styles['login__form-container']} style={{ textAlign: 'center' }}>
                    <div className={styles['login__form-header']}>
                        <button
                            onClick={() => navigate('/login')}
                            className={styles.login__back_btn}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-neutral-500)',
                                cursor: 'pointer',
                                marginBottom: '24px'
                            }}
                        >
                            <ArrowLeft size={18} />
                            {t('common.back')}
                        </button>
                    </div>

                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '16px',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'inline-block',
                        margin: '0 auto'
                    }}>
                        {loading ? (
                            <div style={{ padding: '40px' }}>
                                <Loader2 className="animate-spin" size={48} color="var(--color-primary-500)" />
                                <p style={{ marginTop: '16px', color: 'var(--color-neutral-500)' }}>{t('common.loading')}</p>
                            </div>
                        ) : error ? (
                            <div style={{ padding: '40px', color: 'var(--color-danger-600)' }}>
                                <p>{error}</p>
                                <Button variant="ghost" onClick={() => window.location.reload()} style={{ marginTop: '16px' }}>
                                    {t('common.retry')}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <img
                                    src={qrCode}
                                    alt="Login QR Code"
                                    style={{ width: '240px', height: '240px', display: 'block' }}
                                />
                                <p style={{ marginTop: '24px', fontWeight: 500, color: 'var(--color-neutral-900)' }}>
                                    Waiting for scan...
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--color-neutral-500)', marginTop: '8px' }}>
                                    Code expires in 5 minutes
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
