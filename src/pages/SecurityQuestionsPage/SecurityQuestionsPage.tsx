import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import { toast } from 'react-hot-toast';
import styles from './SecurityQuestionsPage.module.css';

interface QuestionItem {
    syskey: string;
    question: string;
    status: number;
}

interface SlotState {
    question_syskey: string;
    answer: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SecurityQuestionsPage() {
    const navigate  = useNavigate();
    const location  = useLocation();

    const forgotPassword = (location.state as any)?.forgotPassword === true;

    const tempToken  = sessionStorage.getItem('temp_iam_token') || '';
    const tempUserId = sessionStorage.getItem('temp_user_id')   || '';

    const [allQuestions, setAllQuestions] = useState<QuestionItem[]>([]);
    const [slotCount,    setSlotCount]    = useState(0);
    const [slots,        setSlots]        = useState<SlotState[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [fetching,     setFetching]     = useState(true);
    const [focusedSlot,  setFocusedSlot]  = useState<number | null>(null);

    useEffect(() => {
        if (!tempToken) navigate('/login', { replace: true });
    }, [tempToken, navigate]);

    useEffect(() => {
        if (!tempToken) return;
        const fetchQuestions = async () => {
            setFetching(true);
            try {
                const res  = await authClient.get('securityQues/005', {
                    headers: { Authorization: `Bearer ${tempToken}` },
                });
                const data = res.data?.data || res.data || {};
                const rawList: QuestionItem[] = Array.isArray(data)
                    ? data
                    : (data?.questions || data?.datalist || []);

                // Only active questions (status === 1)
                const active = rawList.filter((q: any) => Number(q.status) === 1);
                setAllQuestions(active);

                // Slot count driven by API
                const count = forgotPassword
                    ? Number(data?.forgotpw_ques_count ?? 1)
                    : Number(data?.security_ques_count ?? 1);
                setSlotCount(count);
                setSlots(Array.from({ length: count }, () => ({ question_syskey: '', answer: '' })));
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to load security questions.');
            } finally {
                setFetching(false);
            }
        };
        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tempToken]);

    // Questions selected in OTHER slots (for dedup)
    const selectedSyskeys = useMemo(
        () => slots.map(s => s.question_syskey).filter(Boolean),
        [slots],
    );

    const filledCount = slots.filter(s => s.question_syskey && s.answer.trim()).length;

    const updateSlot = (idx: number, field: keyof SlotState, value: string) => {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const filled = slots.filter(s => s.question_syskey && s.answer.trim());
        if (filled.length === 0) {
            toast.error('Please answer at least one security question.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                user_id: tempUserId,
                questionAnswerList: filled.map(s => ({
                    question_syskey: s.question_syskey,
                    answer: s.answer.trim(),
                })),
                appid: APP_ID,
            };

            const endpoint = forgotPassword ? 'checkAnswers' : 'securityAnswer';
            const res = await authClient.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${tempToken}` },
            });

            const status = res.data?.status ?? res.status;
            if (status === 200 || status === 201) {
                if (forgotPassword) {
                    toast.success('Identity verified.');
                    navigate('/force-change-password', { replace: true });
                } else {
                    toast.success('Security answers saved.');
                    const needsForcePwd = sessionStorage.getItem('force_password_change') === '1';
                    sessionStorage.removeItem('force_password_change');
                    if (needsForcePwd) {
                        navigate('/force-change-password', { replace: true });
                    } else {
                        sessionStorage.removeItem('temp_iam_token');
                        sessionStorage.removeItem('temp_user_id');
                        navigate('/dashboard', { replace: true });
                    }
                }
            } else {
                toast.error(res.data?.message || 'Failed. Please try again.');
            }
        } catch (err: any) {
            if (err?.response?.status === 400) {
                toast.error('Your answers are incorrect. Please try again.');
            } else {
                toast.error(err?.response?.data?.message || 'Failed to verify answers.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.loadingBar} />
                    <p className={styles.loadingText}>Loading security questions…</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.iconWrap}>
                        <ShieldCheck size={34} />
                    </div>
                    <h1 className={styles.title}>Security Questions</h1>
                    <p className={styles.subtitle}>
                        {forgotPassword
                            ? 'Answer at least one security question to verify your identity.'
                            : 'Answer at least one security question to protect your account.'}
                    </p>

                    {slotCount > 1 && (
                        <div className={styles.progress}>
                            {slots.map((s, i) => (
                                <div
                                    key={i}
                                    className={[
                                        styles.progressDot,
                                        focusedSlot === i ? styles['progressDot--active'] : '',
                                        (s.question_syskey && s.answer.trim()) ? styles['progressDot--done'] : '',
                                    ].filter(Boolean).join(' ')}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {slots.map((slot, idx) => {
                        const available = allQuestions.filter(
                            q => q.syskey === slot.question_syskey || !selectedSyskeys.includes(q.syskey),
                        );
                        const isDone = !!(slot.question_syskey && slot.answer.trim());

                        return (
                            <div
                                key={idx}
                                className={styles.questionItem}
                                onFocus={() => setFocusedSlot(idx)}
                                onBlur={() => setFocusedSlot(null)}
                                style={isDone ? { borderLeftColor: 'var(--color-success-500)' } : undefined}
                            >
                                <div className={styles.slotHeader}>
                                    <span
                                        className={styles.slotBadge}
                                        style={isDone ? { background: 'var(--color-success-500)', boxShadow: '0 2px 6px rgba(34,197,94,0.3)' } : undefined}
                                    >
                                        {isDone ? '✓' : idx + 1}
                                    </span>
                                    <span className={styles.slotTitle}>
                                        Question {idx + 1} of {slotCount}
                                    </span>
                                </div>

                                {/* Question dropdown */}
                                <div className={styles.selectWrap}>
                                    <label className={styles.selectLabel}>Select question</label>
                                    <div className={styles.selectInner}>
                                        <select
                                            className={styles.select}
                                            value={slot.question_syskey}
                                            onChange={e => updateSlot(idx, 'question_syskey', e.target.value)}
                                        >
                                            <option value="">— Choose a security question —</option>
                                            {available.map(q => (
                                                <option key={q.syskey} value={q.syskey}>
                                                    {q.question}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className={styles.selectIcon} />
                                    </div>
                                </div>

                                {/* Answer input */}
                                <Input
                                    id={`answer-${idx}`}
                                    label="Your answer"
                                    type="text"
                                    value={slot.answer}
                                    onChange={e => updateSlot(idx, 'answer', e.target.value)}
                                    placeholder="Type your answer here…"
                                    disabled={!slot.question_syskey}
                                />
                            </div>
                        );
                    })}

                    {allQuestions.length === 0 && (
                        <p className={styles.emptyText}>No security questions found.</p>
                    )}

                    {slotCount > 1 && (
                        <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-neutral-400)', margin: 0 }}>
                            {filledCount} of {slotCount} answered · at least 1 required
                        </p>
                    )}

                    <Button
                        type="submit"
                        loading={loading}
                        disabled={loading || allQuestions.length === 0}
                        className={styles.submitBtn}
                    >
                        {forgotPassword ? 'Verify Identity' : 'Save Security Answers'}
                        <ChevronRight size={16} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
