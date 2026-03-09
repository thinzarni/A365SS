import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import authClient from '../../lib/auth-client';
import { APP_ID } from '../../lib/auth-token';
import { toast } from 'react-hot-toast';
import styles from './SecurityQuestionsPage.module.css';

interface SecurityQuestion {
    syskey: string;
    question: string;
    answer: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SecurityQuestionsPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // forgotPassword=true → verify answers then go to change password
    // forgotPassword=false → save answers (fresh login setup)
    const forgotPassword = (location.state as any)?.forgotPassword === true;

    const tempToken = sessionStorage.getItem('temp_iam_token') || '';
    const tempUserId = sessionStorage.getItem('temp_user_id') || '';

    const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Redirect if no temp token (user accessed page directly)
    useEffect(() => {
        if (!tempToken) {
            navigate('/login', { replace: true });
        }
    }, [tempToken, navigate]);

    // Fetch security questions on mount
    useEffect(() => {
        if (!tempToken) return;

        const fetchQuestions = async () => {
            setFetching(true);
            try {
                const res = await authClient.get('securityQues/019', {
                    headers: { Authorization: `Bearer ${tempToken}` },
                });
                const data = res.data;
                const list: SecurityQuestion[] = Array.isArray(data)
                    ? data
                    : (data?.data || data?.datalist || []);
                setQuestions(list);
                // Pre-fill empty answers map
                const initialAnswers: Record<string, string> = {};
                list.forEach((q: SecurityQuestion) => {
                    initialAnswers[q.syskey] = q.answer || '';
                });
                setAnswers(initialAnswers);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to load security questions.');
            } finally {
                setFetching(false);
            }
        };

        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tempToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const answered = questions.filter(q => answers[q.syskey]?.trim());
        if (answered.length < 1) {
            toast.error('Please answer at least 1 question.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                user_id: tempUserId,
                questionAnswerList: answered.map(q => ({
                    question_syskey: q.syskey,
                    answer: answers[q.syskey].trim(),
                })),
                appid: APP_ID,
            };

            // forgotPassword mode → check/verify answers; fresh-login mode → save answers
            const endpoint = forgotPassword ? 'checkAnswers' : 'securityAnswer';
            const res = await authClient.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${tempToken}` },
            });

            const status = res.data?.status ?? res.status;
            console.log(res.data);
            if (status === 200 || status === 201) {
                if (forgotPassword) {
                    // Answers verified — go to change password
                    toast.success('Identity verified.');
                    navigate('/force-change-password', { replace: true });
                } else {
                    toast.success('Security answers saved.');
                    // Check if force password change is needed
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
            // HTTP 400 = wrong answers (Axios throws on 4xx)
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
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className={styles.title}>Security Questions</h1>
                    <p className={styles.subtitle}>
                        {forgotPassword
                            ? 'Verify your identity by answering your security question(s).'
                            : 'Answer at least one security question to secure your account.'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {questions.map((q, idx) => (
                        <div key={q.syskey} className={styles.questionItem}>
                            <span className={styles.questionLabel}>Question {idx + 1}</span>
                            <p className={styles.questionText}>{q.question}</p>
                            <Input
                                id={`answer-${q.syskey}`}
                                label="Your answer"
                                type="text"
                                value={answers[q.syskey] || ''}
                                onChange={e => setAnswers(prev => ({ ...prev, [q.syskey]: e.target.value }))}
                                placeholder="Type your answer here…"
                            />
                        </div>
                    ))}

                    {questions.length === 0 && (
                        <p className={styles.emptyText}>No security questions found.</p>
                    )}

                    <Button
                        type="submit"
                        loading={loading}
                        disabled={loading || questions.length === 0}
                        className={styles.submitBtn}
                    >
                        Submit Answers <ChevronRight size={16} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
