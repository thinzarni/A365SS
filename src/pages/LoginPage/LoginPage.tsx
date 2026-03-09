import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, QrCode, Monitor, Eye, EyeOff, Globe } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../stores/auth-store';
import authClient from '../../lib/auth-client';
import { makeSignInPayload, APP_ID } from '../../lib/auth-token';
import { toast } from 'react-hot-toast';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../../config/msal-config';
import styles from './LoginPage.module.css';

type AuthMode = 'password' | 'otp';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { instance, inProgress } = useMsal();
    const { login, setUser, setLanguage, language, isAuthenticated } = useAuthStore();

    const [mode, setMode] = useState<AuthMode>('otp');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    /* ══════════════════════════════════════════════════════════════
       Auto-login check (Silent SSO)
       ══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (isAuthenticated) return;

        const checkSilentLogin = async () => {
            // ── Block auto-sign-in after intentional logout ──
            // AppLayout.handleLogout sets this flag before calling logout().
            if (sessionStorage.getItem('az_logout_intent') === '1') {
                sessionStorage.removeItem('az_logout_intent');
                // Also clear any remaining MSAL accounts so the next check finds nothing
                try { await instance.clearCache(); } catch { /* ignore */ }
                return;
            }

            const accounts = instance.getAllAccounts();
            if (accounts.length > 0) {
                // ── Step 1: acquire token silently (may fail if no cached session) ──
                let msalResult;
                try {
                    msalResult = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0],
                    });
                } catch {
                    // No cached Azure AD session — silent login not possible, do nothing
                    return;
                }

                // ── Step 2: exchange idToken with A365 backend ──
                if (msalResult?.account) {
                    setLoading(true);
                    try {
                        const res = await authClient.post('sso/azure-ad/signin', {
                            user_id: msalResult.account.username,
                            appid: APP_ID,
                            token: msalResult.idToken,
                        });

                        if (res.data.status === 200 || res.status === 200) {
                            await completeLogin(res.data);
                        } else {
                            const serverMsg = res.data.message;
                            toast.error(serverMsg === 'Invalid'
                                ? 'User does not exist in A365. Please contact your administrator.'
                                : serverMsg || 'Azure AD sign-in failed.');
                        }
                    } catch (err: any) {
                        // Axios throws on 4xx/5xx — extract message from response
                        const serverMsg = err?.response?.data?.message;
                        toast.error(serverMsg === 'Invalid'
                            ? 'User does not exist in A365. Please contact your administrator.'
                            : serverMsg || 'Azure AD sign-in failed.');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        };

        if (inProgress === InteractionStatus.None) {
            checkSilentLogin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instance, inProgress, isAuthenticated]);

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

        // ── Post-login routing — mirrors Flutter's verify_otp.dart ──
        // security_status == false → must set up security questions
        // force_password   == false → must change password
        const securityStatus = nested?.security_status ?? signInData.security_status ?? true;
        const forcePassword = nested?.force_password ?? signInData.force_password ?? true;

        if (securityStatus === false) {
            sessionStorage.setItem('temp_iam_token', iamToken);
            sessionStorage.setItem('temp_user_id', userId);
            navigate('/security-questions', { replace: true });
            return;
        }
        if (forcePassword === false) {
            sessionStorage.setItem('temp_iam_token', iamToken);
            sessionStorage.setItem('temp_user_id', userId);
            navigate('/force-change-password', { replace: true });
            return;
        }


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
                const fetchedMenuList = menuData.datalist || menuData.data?.datalist || menuData.cards || [];

                // Update store with final token and menu list
                login({
                    token: finalToken,
                    refreshToken: finalRefresh || undefined,
                    userId,
                    domain: domainId,
                    domains: domainList,
                    menuList: fetchedMenuList,
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

    const handleAzureLogin = async () => {
        // Prevent multiple simultaneous login attempts
        if (inProgress !== InteractionStatus.None) {
            console.warn('MSAL Interaction already in progress:', inProgress);
            return;
        }

        setError('');

        try {
            // loginRedirect uses the already-registered window.location.origin
            // and returns here after auth; the silent SSO useEffect picks up the account
            await instance.loginRedirect({
                ...loginRequest,
                redirectUri: window.location.origin,
            });
        } catch (err: any) {
            if (err.errorCode !== 'interaction_in_progress') {
                setError(err.message || 'Azure login failed.');
            }
        }
    };

    const handlePasswordLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password.trim()) { setError('Please enter your password.'); return; }

        setLoading(true);
        try {
            const b64Password = btoa(unescape(encodeURIComponent(password)));
            const payload = await makeSignInPayload(email, 2, b64Password);
            const res = await authClient.post('signin', payload);
            const data = res.data;

            if (data.status === 200 || res.status === 200) {
                const nested = data.data as Record<string, any> | undefined;
                const sessionId = nested?.session_id || data.session_id;

                if (sessionId) {
                    // ── OTP 2FA required — navigate to verify page ──
                    navigate('/verify-otp', {
                        state: {
                            userId: email,
                            session: sessionId,
                            b64Password, // for resend
                        },
                    });
                } else {
                    // ── No OTP required — complete login directly ──
                    await completeLogin(data);
                }
            } else {
                setError(data.message || 'Login failed.');
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
            const payload = await makeSignInPayload(email, 2); // reqType=2: OTP, no password
            const res = await authClient.post('signin', payload);
            if (res.data.status === 200 || res.status === 200) {
                const nested = res.data.data;
                const sessionId = nested?.session_id || res.data.session_id;
                if (sessionId) {
                    navigate('/verify-otp', {
                        state: { userId: email, session: sessionId },
                    });
                } else {
                    await completeLogin(res.data);
                }
            } else {
                setError(res.data.message || 'Failed to send OTP.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP.');
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
                    <div className={styles.login__lang_wrapper}>
                        <button
                            type="button"
                            className={styles.login__lang_btn}
                            onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
                        >
                            <Globe size={14} className="mr-2" />
                            {language === 'en' ? 'English' : 'Myanmar'}
                        </button>
                    </div>
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
                            onClick={() => { setMode('password'); setError(''); }}
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
                            <div className={styles.login__forgot}>
                                <button
                                    type="button"
                                    className={styles.login__forgot_btn}
                                    onClick={() => navigate('/forgot-password')}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className={styles.login__form} onSubmit={e => { e.preventDefault(); handleRequestOtp(); }}>
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
                            <Button type="submit" fullWidth loading={loading}>
                                {t('auth.requestOtp')}
                            </Button>
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

                        <Button
                            type="button"
                            variant="ghost"
                            className={styles.login__secondary_button}
                            loading={loading}
                            onClick={handleAzureLogin}
                        >
                            <Monitor size={18} className="mr-2" />
                            {t('auth.azureSignIn')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
