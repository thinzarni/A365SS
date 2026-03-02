import { useState, /* useEffect, */ type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Hash, QrCode, /* Monitor, */ Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import authClient from '../../lib/auth-client';
import { makeSignInPayload, APP_ID } from '../../lib/auth-token';
import { toast } from 'react-hot-toast';
// import { useMsal } from '@azure/msal-react';
// import { InteractionStatus } from '@azure/msal-browser';
// import { loginRequest } from '../../config/msal-config';
import styles from './LoginPage.module.css';

type AuthMode = 'password' | 'otp';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    // const { instance, inProgress } = useMsal();
    const { login, setUser, /* isAuthenticated */ } = useAuthStore();

    const [mode, setMode] = useState<AuthMode>('otp');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpSession, setOtpSession] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    /* ══════════════════════════════════════════════════════════════
       Auto-login check (Silent SSO)
       ══════════════════════════════════════════════════════════════ */
    /* 
    useEffect(() => {
        if (isAuthenticated) return;

        const checkSilentLogin = async () => {
            const accounts = instance.getAllAccounts();
            if (accounts.length > 0) {
                try {
                    const result = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });

                    if (result && result.account) {
                        setLoading(true);
                        const res = await authClient.post('azure-ad/signin', {
                            user_id: result.account.username,
                            appid: APP_ID,
                        }, {
                            headers: { Authorization: `Bearer ${result.idToken}` }
                        });

                        if (res.data.status === 200 || res.status === 200) {
                            await completeLogin(res.data);
                        }
                    }
                } catch (e) {
                    // Silent check failed, no auto-login
                } finally {
                    setLoading(false);
                }
            }
        };

        if (inProgress === InteractionStatus.None) {
            checkSilentLogin();
        }
    }, [instance, inProgress, isAuthenticated]);
    */

    /* ══════════════════════════════════════════════════════════════
       Complete login flow — matches Flutter's signin_otp.dart:
       1. Sign-in → access_token, user_id, usersyskey, role
       2. /domain → domain list → pick first
       3. /get-menu → final access_token + refresh_token for HXM
       ══════════════════════════════════════════════════════════════ */
    const completeLogin = async (signInData: Record<string, any>) => {
        const nested = signInData.data as Record<string, any> | undefined;
        const iamToken = (nested?.access_token || signInData.token || signInData.access_token) as string;
        const userId = (nested?.user_id || signInData.user_id || email) as string;
        const usersyskey = (nested?.usersyskey || signInData.usersyskey || '') as string;
        const role = String(nested?.role || signInData.approle || '');

        // ──────── Step 2: Fetch domain list ────────
        let domainId = '';
        let domainName = '';
        let domainList: any[] = [];
        try {
            const domRes = await authClient.post('domain',
                { user_id: userId, app_id: APP_ID },
                { headers: { Authorization: `Bearer ${iamToken}` } },
            );
            const domData = domRes.data;
            domainList = domData?.data?.domain || domData?.datalist || domData?.data || [];
            if (Array.isArray(domainList) && domainList.length > 0) {
                domainId = String(domainList[0].id || domainList[0].domaincode || '');
                domainName = String(domainList[0].name || domainList[0].domainname || '');
            }
        } catch (err) {
            console.warn('Domain list fetch failed, proceeding with defaults', err);
        }

        // ──────── Store auth state and determine routing ────────
        // Initial partial login
        login({
            token: iamToken,
            refreshToken: undefined,
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
            // ──────── Step 3: Single domain → Auto-fetch menu and go to dashboard ────────
            let finalToken = iamToken;
            let finalRefresh = '';
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
                    headers: { Authorization: `Bearer ${iamToken}` },
                });
                const menuData = menuRes.data;
                finalToken = menuData.access_token || menuData.data?.access_token || iamToken;
                finalRefresh = menuData.refresh_token || menuData.data?.refresh_token || '';

                // Update store with final token
                login({
                    token: finalToken,
                    refreshToken: finalRefresh || undefined,
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

                // Profile fetch (non-blocking)
                try {
                    const { default: apiClient } = await import('../../lib/api-client');
                    const profileRes = await apiClient.get('/api/employees/profile');
                    const profile = profileRes.data?.datalist || profileRes.data?.data;
                    if (profile) setUser(profile);
                } catch { /* non-blocking */ }

                navigate('/dashboard');
            } catch (err) {
                console.warn('get-menu failed, using IAM token directly', err);
                navigate('/dashboard');
            }
        }
    };

    /* 
    const handleAzureLogin = async () => {
        // Prevent multiple simultaneous login attempts
        if (inProgress !== InteractionStatus.None) {
            console.warn('MSAL Interaction already in progress:', inProgress);
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('Initiating Azure Login Popup...');
            const result = await instance.loginPopup(loginRequest);

            if (result && result.account) {
                console.log('Azure Auth Success, communicating with backend...');
                const res = await authClient.post('azure-ad/signin', {
                    user_id: result.account.username,
                    appid: APP_ID,
                }, {
                    headers: {
                        Authorization: `Bearer ${result.idToken}`,
                    }
                });

                if (res.data.status === 200 || res.status === 200) {
                    console.log('Backend sync successful, finalizing login...');
                    await completeLogin(res.data);
                } else {
                    const msg = res.data.message || 'Azure login failed on server.';
                    console.error('Backend Login Error:', msg);
                    setError(msg);
                }
            }
        } catch (err: any) {
            console.error('Azure Popup Error:', err);
            if (err.errorCode === 'popup_window_error') {
                setError('Login popup was blocked or closed. Please try again.');
            } else {
                setError(err.message || 'Azure login failed.');
            }
        } finally {
            setLoading(false);
        }
    };
    */

    const handlePasswordLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const b64Password = btoa(password);
            const payload = await makeSignInPayload(email, 1, b64Password);
            const res = await authClient.post('signin', payload);
            if (res.data.status === 200 || res.status === 200) {
                await completeLogin(res.data);
            } else {
                setError(res.data.message || 'Login failed.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async () => {
        setError('');
        setLoading(true);
        try {
            const payload = await makeSignInPayload(email, 2);
            const res = await authClient.post('signin', payload);
            if (res.data.status === 200 || res.status === 200) {
                setOtpSession(res.data.data?.session_id || res.data.session_id || '');
                setOtpSent(true);
                toast.success('OTP sent to your email/phone');
            } else {
                setError(res.data.message || 'Failed to send OTP.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpLogin = async (e: FormEvent) => {
        e.preventDefault();
        if (!otpSent) return handleRequestOtp();
        setError('');
        setLoading(true);
        try {
            const res = await authClient.post('verify-otp', {
                user_id: email,
                otp,
                session: otpSession,
                app_id: APP_ID,
                sid: '999',
            });
            if (res.data.status === 200 || res.status === 200) {
                await completeLogin(res.data);
            } else {
                setError(res.data.message || 'OTP verification failed.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'OTP verification failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.login}>
            <div className={styles.login__hero}>
                <div className={styles['login__hero-content']}>
                    <img src="/favicon.png" className={styles['login__hero-logo']} alt="A365 Logo" />
                    <h1 className={styles['login__hero-title']}>HR Self-Service Portal</h1>
                    <p className={styles['login__hero-subtitle']}>
                        Submit requests, manage approvals, and track your HR activities — all in one place.
                    </p>
                </div>
            </div>

            <div className={styles['login__form-panel']}>
                <div className={styles['login__form-container']}>
                    <div className={styles['login__form-header']}>
                        <h2 className={styles['login__form-title']}>{t('auth.signIn')}</h2>
                        <p className={styles['login__form-desc']}>{t('auth.loginSubtitle')}</p>
                    </div>

                    <div className={styles.login__tabs}>
                        <button
                            className={`${styles.login__tab} ${mode === 'otp' ? styles['login__tab--active'] : ''}`}
                            onClick={() => { setMode('otp'); setError(''); }}
                        >
                            {t('auth.otp')}
                        </button>
                        <button
                            className={`${styles.login__tab} ${mode === 'password' ? styles['login__tab--active'] : ''}`}
                            onClick={() => { setMode('password'); setOtpSent(false); setError(''); }}
                        >
                            {t('auth.password')}
                        </button>
                    </div>

                    {error && <div className={styles.login__error}>{error}</div>}

                    {mode === 'password' ? (
                        <form className={styles.login__form} onSubmit={handlePasswordLogin}>
                            <Input
                                id="email"
                                label={t('auth.email')}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@company.com"
                                icon={<Mail size={18} />}
                                required
                            />
                            <Input
                                id="password"
                                label={t('auth.password')}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                icon={<Lock size={18} />}
                                rightIcon={
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                                required
                            />
                            <Button type="submit" fullWidth loading={loading}>
                                {t('auth.signIn')}
                            </Button>
                        </form>
                    ) : (
                        <form className={styles.login__form} onSubmit={handleOtpLogin}>
                            <Input
                                id="otp-email"
                                label={t('auth.email')}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@company.com"
                                icon={<Mail size={18} />}
                                required
                            />
                            {!otpSent ? (
                                <Button type="button" fullWidth loading={loading} onClick={handleRequestOtp}>
                                    {t('auth.requestOtp')}
                                </Button>
                            ) : (
                                <>
                                    <Input
                                        id="otp-code"
                                        label={t('auth.otp')}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter 6‑digit code"
                                        icon={<Hash size={18} />}
                                        required
                                    />
                                    <Button type="submit" fullWidth loading={loading}>
                                        {t('auth.verifyOtp')}
                                    </Button>
                                    <Button type="button" variant="ghost" fullWidth onClick={handleRequestOtp}>
                                        {t('common.retry')}
                                    </Button>
                                </>
                            )}
                        </form>
                    )}

                    <div className={styles.login__separator}>
                        <span>OR</span>
                    </div>

                    <div className={styles.login__secondary_actions}>
                        <Button
                            type="button"
                            variant="ghost"
                            className={styles.login__secondary_button}
                            onClick={() => navigate('/qr-login')}
                        >
                            <QrCode size={18} className="mr-2" />
                            {t('auth.qrSignIn')}
                        </Button>

                        {/* <Button
                            type="button"
                            variant="ghost"
                            className={styles.login__secondary_button}
                            loading={loading}
                            onClick={handleAzureLogin}
                        >
                            <Monitor size={18} className="mr-2" />
                            {t('auth.azureSignIn')}
                        </Button> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
