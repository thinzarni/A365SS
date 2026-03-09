import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui';
import authClient from '../../lib/auth-client';
import { makeSignInPayload, APP_ID } from '../../lib/auth-token';
import { toast } from 'react-hot-toast';
import styles from './VerifyOtpPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface OtpState {
    userId: string;
    session: string;
    /** base64-encoded password — only present for password-mode resend */
    b64Password?: string;
    /** true when arriving from Forgot Password flow */
    forgotPassword?: boolean;
}

export default function VerifyOtpPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as OtpState | null;

    // Redirect if arrived without state
    useEffect(() => {
        if (!state?.session) navigate('/login', { replace: true });
    }, [state, navigate]);

    const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [session, setSession] = useState(state?.session || '');
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const otp = digits.join('');
    const isEmail = (state?.userId || '').includes('@');

    /* ── OTP Input helpers ── */
    const handleDigitChange = (idx: number, val: string) => {
        const digit = val.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[idx] = digit;
        setDigits(next);
        if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) {
            const next = Array(6).fill('');
            pasted.split('').forEach((c, i) => { next[i] = c; });
            setDigits(next);
            inputRefs.current[Math.min(pasted.length, 5)]?.focus();
        }
    };

    /* ── Resend OTP ── */
    const handleResend = async () => {
        if (!state?.userId || resending) return;
        setResending(true);
        setDigits(Array(6).fill(''));
        try {
            const payload = await makeSignInPayload(state.userId, 1, state.b64Password || '');
            const res = await authClient.post('signin', payload);
            if (res.data.status === 200) {
                const newSession = res.data.data?.session_id || res.data.session_id || '';
                setSession(newSession);
                toast.success('OTP resent successfully.');
            } else {
                toast.error(res.data.message || 'Failed to resend OTP.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setResending(false);
        }
    };

    /* ── Complete login after OTP verify ── */
    const completeLogin = async (data: Record<string, any>) => {
        // Dynamically import LoginPage helpers via the shared flow
        // We store data in sessionStorage and navigate to a processor route
        const nested = data.data as Record<string, any> | undefined;
        const iamToken = (nested?.access_token || data.access_token || data.token || '') as string;
        const userId = (nested?.user_id || data.user_id || state?.userId || '') as string;
        const usersyskey = (nested?.usersyskey || data.usersyskey || '') as string;
        const role = String(nested?.role || data.approle || '');
        const securityStatus = nested?.security_status ?? data.security_status ?? true;
        const forcePassword = nested?.force_password ?? data.force_password ?? true;

        // ── Intercept special post-login pages ──
        if (!securityStatus) {
            // Need to set up security questions first
            sessionStorage.setItem('temp_iam_token', iamToken);
            sessionStorage.setItem('temp_user_id', userId);
            sessionStorage.setItem('force_password_change', forcePassword ? '0' : '1');
            navigate('/security-questions', { replace: true });
            return;
        }
        if (!forcePassword) {
            // Need force password change
            sessionStorage.setItem('temp_iam_token', iamToken);
            sessionStorage.setItem('temp_user_id', userId);
            navigate('/force-change-password', { replace: true });
            return;
        }

        // ── Normal path: domain → get-menu → dashboard ──
        try {
            let domainId = '', domainName = '';
            let domainList: any[] = [];
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

            // Import auth store dynamically to avoid circular deps
            const { useAuthStore } = await import('../../stores/auth-store');
            const { login, setUser } = useAuthStore.getState();

            login({ token: iamToken, refreshToken: undefined, userId, domain: domainId, domains: domainList });
            setUser({ name: userId, usersyskey, role } as any);

            if (domainList.length > 1) {
                navigate('/select', { replace: true });
            } else {
                // get-menu
                const menuRes = await authClient.post('get-menu', {
                    usersyskey, role, user_id: userId, app_id: APP_ID,
                    domain: domainId, type: userId, domain_name: domainName,
                }, { headers: { Authorization: `Bearer ${iamToken}` } });
                const menuData = menuRes.data;
                const finalToken = menuData.access_token || menuData.data?.access_token || iamToken;
                const finalRefresh = menuData.refresh_token || menuData.data?.refresh_token || '';
                const menuList = menuData.datalist || menuData.data?.datalist || menuData.cards || [];

                login({ token: finalToken, refreshToken: finalRefresh || undefined, userId, domain: domainId, domains: domainList, menuList });
                setUser({ name: userId, domainName, usersyskey, role } as any);

                // Non-blocking profile fetch
                try {
                    const { default: apiClient } = await import('../../lib/api-client');
                    const profileRes = await apiClient.get('/api/employees/profile');
                    const profile = profileRes.data?.datalist || profileRes.data?.data;
                    if (profile) setUser(profile);
                } catch { /* non-blocking */ }

                navigate('/dashboard', { replace: true });
            }
        } catch {
            navigate('/dashboard', { replace: true });
        }
    };

    /* ── Submit OTP ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length < 6) { toast.error('Please enter all 6 digits.'); return; }
        setLoading(true);
        try {
            const res = await authClient.post('verify-otp', {
                user_id: state?.userId,
                otp,
                session,
                app_id: APP_ID,
                sid: '999',
            });
            const status = res.data?.status ?? res.status;
            if (status === 200) {
                // ── Forgot Password flow: go to security questions to verify identity ──
                if (state?.forgotPassword) {
                    const nested = res.data?.data as Record<string, any> | undefined;
                    const iamToken = nested?.access_token || res.data?.access_token || res.data?.token || '';
                    const userId = nested?.user_id || res.data?.user_id || state.userId || '';
                    sessionStorage.setItem('temp_iam_token', iamToken);
                    sessionStorage.setItem('temp_user_id', userId);
                    navigate('/security-questions', { replace: true, state: { forgotPassword: true } });
                    return;
                }
                await completeLogin(res.data);
            } else {
                toast.error(res.data?.message || 'OTP verification failed.');
                setDigits(Array(6).fill(''));
                inputRefs.current[0]?.focus();
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'OTP verification failed.');
            setDigits(Array(6).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    if (!state?.session) return null;

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.iconWrap}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className={styles.title}>Two-Factor Authentication</h1>
                    <p className={styles.subtitle}>
                        {isEmail
                            ? `Enter the 6-digit code sent to your email`
                            : `Enter the 6-digit code sent to your phone`}
                    </p>
                    <p className={styles.userId}>{state.userId}</p>
                </div>

                {/* OTP Input */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.pinRow} onPaste={handlePaste}>
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                id={`otp-digit-${i}`}
                                ref={el => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                className={`${styles.pinBox} ${d ? styles.pinBoxFilled : ''}`}
                                onChange={e => handleDigitChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                autoComplete="one-time-code"
                            />
                        ))}
                    </div>

                    {/* Resend */}
                    <div className={styles.resendRow}>
                        <span className={styles.resendText}>Didn't receive the code?</span>
                        <button
                            type="button"
                            className={styles.resendBtn}
                            onClick={handleResend}
                            disabled={resending}
                        >
                            {resending
                                ? <span className={styles.spinner} />
                                : <><RotateCcw size={13} /> Resend</>
                            }
                        </button>
                    </div>

                    <Button
                        type="submit"
                        fullWidth
                        loading={loading}
                        disabled={loading || otp.length < 6}
                    >
                        Verify Code
                    </Button>

                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={() => navigate('/login')}
                    >
                        ← Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
}
