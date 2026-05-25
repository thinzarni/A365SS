import { useEffect, useState } from 'react';
import { appConfig } from '../../config/app-config';
import { useAuthStore } from '../../stores/auth-store';
import { Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hybridEncrypt } from '../../lib/hybrid-encrypt';
import PayslipAuthGate from './PayslipAuthGate';

const PAYSLIP_PATH = '/payslip/app/menu/detail/payslip/payslipbymonth';

const backBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 12px',
    height: '44px',
    borderBottom: '1px solid var(--color-neutral-200, #e5e7eb)',
    background: 'var(--color-surface, #ffffff)',
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
};

export default function PayslipPage() {
    const { domain, token, userId } = useAuthStore();
    const { t } = useTranslation();

    const [authenticated, setAuthenticated] = useState(false);
    const [iframeUrl, setIframeUrl] = useState('');
    const [isBuilding, setIsBuilding] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [error, setError] = useState('');

    // Use payslipUrl if configured (e.g. MPT port 8083), fall back to mainUrl
    const payslipBase = (appConfig.payslipUrl ?? appConfig.mainUrl).replace(/\/+$/, '');

    useEffect(() => {
        if (!authenticated || !domain || !userId || !token) return;

        setIsBuilding(true);
        setIframeLoaded(false);
        setError('');

        hybridEncrypt(domain, userId)
            .then(({ encryptedData, encryptedKey }) => {
                const params = new URLSearchParams({ encryptedData, encryptedKey, token });
                const url = `${payslipBase}${PAYSLIP_PATH}?${params.toString()}`;
                // console.log('[PayslipPage] Request URL:', url);
                setIframeUrl(url);
            })
            .catch((e) => {
                console.error('[PayslipPage] Encryption failed:', e);
                setError(t('payslipPage.errorPrep'));
            })
            .finally(() => setIsBuilding(false));
    }, [authenticated, domain, userId, token, payslipBase]);

    const handleBack = () => {
        setAuthenticated(false);
        setIframeUrl('');
        setError('');
        setIframeLoaded(false);
    };

    // ── Step 1: Show password gate ──
    if (!authenticated) {
        return <PayslipAuthGate onAuthenticated={() => setAuthenticated(true)} />;
    }

    // ── Step 2a: Building URL ──
    if (isBuilding) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
                <div style={backBarStyle} onClick={handleBack} role="button" aria-label="Back to auth">
                    <ChevronLeft size={20} color="var(--color-neutral-500, #6b7280)" />
                    <span style={{ fontSize: '14px', color: 'var(--color-neutral-600, #4b5563)', fontWeight: 500 }}>{t('payslipPage.title', 'Payslip')}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} className="animate-spin" color="#3b82f6" />
                </div>
            </div>
        );
    }

    // ── Step 2b: Error ──
    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
                <div style={backBarStyle} onClick={handleBack} role="button" aria-label="Back to auth">
                    <ChevronLeft size={20} color="var(--color-neutral-500, #6b7280)" />
                    <span style={{ fontSize: '14px', color: 'var(--color-neutral-600, #4b5563)', fontWeight: 500 }}>{t('payslipPage.back')}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#ef4444' }}>
                    <AlertCircle size={36} />
                    <p style={{ margin: 0, fontSize: '15px' }}>{error}</p>
                    <button
                        onClick={handleBack}
                        style={{ marginTop: '8px', padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '14px', cursor: 'pointer' }}
                    >
                        {t('payslipPage.tryAgain', 'Try Again')}
                    </button>
                </div>
            </div>
        );
    }

    // ── Step 2c: Payslip iframe ──
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', backgroundColor: 'var(--color-neutral-50, #f9fafb)' }}>
            {/* Back bar */}
            <div style={backBarStyle} onClick={handleBack} role="button" aria-label="Back to auth">
                <ChevronLeft size={20} color="var(--color-neutral-500, #6b7280)" />
                <span style={{ fontSize: '14px', color: 'var(--color-neutral-600, #4b5563)', fontWeight: 500 }}>{t('common.back')}</span>
            </div>

            {/* Iframe area */}
            <div style={{ flex: 1, position: 'relative' }}>
                {!iframeLoaded && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-50, #f9fafb)' }}>
                        <Loader2 size={32} className="animate-spin" color="#3b82f6" />
                    </div>
                )}
                <iframe
                    key={iframeUrl}
                    src={iframeUrl}
                    title="Payslip"
                    allow="fullscreen"
                    style={{ width: '100%', height: '100%', border: 'none', opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
                    onLoad={() => setIframeLoaded(true)}
                />
            </div>
        </div>
    );
}
