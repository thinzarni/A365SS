import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import authClient from '../../lib/auth-client';
import { makeSignInPayload } from '../../lib/auth-token';
import styles from './ForgotPasswordPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { setError('Please enter your email or mobile.'); return; }
        setError('');
        setLoading(true);
        try {
            // req_type 3 = forgot password (mirrors Flutter's ForgotPwd)
            const payload = await makeSignInPayload(email, 3);
            const res = await authClient.post('signin', payload);
            const data = res.data;

            if (data.status === 200 || res.status === 200) {
                const nested = data.data as Record<string, any> | undefined;
                const sessionId = nested?.session_id || data.session_id;

                if (sessionId) {
                    // Navigate to OTP verify page, flagging this as forgot-password flow
                    navigate('/verify-otp', {
                        state: {
                            userId: email,
                            session: sessionId,
                            forgotPassword: true,
                        },
                    });
                } else {
                    // Server sent OTP without returning session (some flows)
                    setSent(true);
                }
            } else {
                setError(data.message || 'Failed to send reset link. Please check your email/mobile.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to send reset link.');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successIcon}>✓</div>
                    <h1 className={styles.title}>Check Your Email</h1>
                    <p className={styles.subtitle}>
                        An OTP has been sent to <strong>{email}</strong>. Use it to verify and reset your password.
                    </p>
                    <button className={styles.backLink} onClick={() => navigate('/login')}>
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrap}>
                    <LockKeyhole size={32} />
                </div>
                <h1 className={styles.title}>Forgot Password?</h1>
                <p className={styles.subtitle}>
                    Enter your email or mobile number and we'll send you a one-time code to reset your password.
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <Input
                        id="forgot-email"
                        label="Email or Mobile"
                        type="text"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="user@company.com"
                        icon={<Mail size={18} />}
                        required
                    />
                    <Button type="submit" fullWidth loading={loading}>
                        Send OTP
                    </Button>
                </form>

                <button className={styles.backLink} onClick={() => navigate('/login')}>
                    ← Back to Login
                </button>
            </div>
        </div>
    );
}
