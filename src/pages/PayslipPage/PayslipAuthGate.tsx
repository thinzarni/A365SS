import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Banknote } from 'lucide-react';
import authClient from '../../lib/auth-client';
import { makePayslipAuthPayload, makeSignInPayload } from '../../lib/auth-token';
import { useAuthStore } from '../../stores/auth-store';

interface Props {
    onAuthenticated: () => void;
}

export default function PayslipAuthGate({ onAuthenticated }: Props) {
    const { userId } = useAuthStore();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password.trim()) { setError('Please enter your password.'); return; }
        if (!userId) { setError('User session not found.'); return; }

        setError('');
        setLoading(true);
        try {
            const b64Password = btoa(unescape(encodeURIComponent(password)));
            const payload = await makePayslipAuthPayload(userId, 2, b64Password, false);
            const res = await authClient.post('signin', payload);
            const data = res.data;

            if (data.status === 200 || res.status === 200) {
                onAuthenticated();
            } else {
                setError(data.message || 'Incorrect password. Please try again.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 80px)',
            padding: '24px',
        }}>
            <div style={{
                background: 'var(--color-surface, #fff)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '20px',
                padding: '48px 40px',
                maxWidth: '400px',
                width: '100%',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}>
                {/* Icon */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '72px', height: '72px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                        marginBottom: '16px', position: 'relative',
                    }}>
                        <Banknote size={32} color="#fff" />
                        <div style={{
                            position: 'absolute', bottom: -4, right: -4,
                            background: '#10b981', borderRadius: '50%',
                            width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid #fff',
                        }}>
                            <ShieldCheck size={13} color="#fff" />
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: 'var(--color-text, #111827)' }}>
                        Verify Identity
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted, #6b7280)', lineHeight: 1.6 }}>
                        Enter your password to access your payslip
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* User ID (read-only) */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text, #374151)', marginBottom: '6px' }}>
                            Employee ID
                        </label>
                        <input
                            type="text"
                            value={userId ?? ''}
                            readOnly
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                background: 'var(--color-neutral-50, #f9fafb)',
                                color: 'var(--color-text-muted, #6b7280)',
                                fontSize: '14px', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text, #374151)', marginBottom: '6px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                <Lock size={16} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                placeholder="••••••••"
                                autoFocus
                                style={{
                                    width: '100%', padding: '10px 40px 10px 38px',
                                    borderRadius: '10px',
                                    border: `1px solid ${error ? '#ef4444' : 'var(--color-border, #e5e7eb)'}`,
                                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                    background: 'var(--color-surface, #fff)',
                                    color: 'var(--color-text, #111827)',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                                onBlur={e => e.currentTarget.style.borderColor = error ? '#ef4444' : 'var(--color-border, #e5e7eb)'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0,
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '8px',
                            background: '#fef2f2', border: '1px solid #fecaca',
                            color: '#dc2626', fontSize: '13px',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px', borderRadius: '10px',
                            background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                            color: '#fff', border: 'none', fontSize: '15px', fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: '16px', height: '16px', border: '2px solid #fff',
                                    borderTopColor: 'transparent', borderRadius: '50%',
                                    display: 'inline-block', animation: 'spin 0.8s linear infinite',
                                }} />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={16} />
                                Verify & View Payslip
                            </>
                        )}
                    </button>
                </form>

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
