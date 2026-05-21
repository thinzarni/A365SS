import { useEffect, useState } from 'react';
import { appConfig } from '../../config/app-config';
import { useAuthStore } from '../../stores/auth-store';
import { Loader2, AlertCircle } from 'lucide-react';
import { hybridEncrypt } from '../../lib/hybrid-encrypt';
import PayslipAuthGate from './PayslipAuthGate';

const PAYSLIP_PATH = '/payslip/app/menu/detail/payslip/payslipbymonth';

export default function PayslipPage() {
    const { domain, token, userId } = useAuthStore();

    // Step 1 — password gate; Step 2 — encrypted iframe
    const [authenticated, setAuthenticated] = useState(false);
    const [iframeUrl, setIframeUrl] = useState('');
    const [isBuilding, setIsBuilding] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [error, setError] = useState('');

    // Build the encrypted URL only after the user passes the auth gate
    useEffect(() => {
        if (!authenticated || !domain || !userId || !token) return;

        setIsBuilding(true);
        setIframeLoaded(false);
        setError('');

        hybridEncrypt(domain, userId)
            .then(({ encryptedData, encryptedKey }) => {
                const base = appConfig.mainUrl.replace(/\/+$/, '');
                const params = new URLSearchParams({ encryptedData, encryptedKey, token });
                setIframeUrl(`${base}${PAYSLIP_PATH}?${params.toString()}`);
            })
            .catch((e) => {
                console.error('[PayslipPage] Encryption failed:', e);
                setError('Failed to prepare payslip. Please try again.');
            })
            .finally(() => setIsBuilding(false));
    }, [authenticated, domain, userId, token]);

    // ── Step 1: Show password gate ──
    if (!authenticated) {
        return <PayslipAuthGate onAuthenticated={() => setAuthenticated(true)} />;
    }

    // ── Step 2a: Encrypting URL ──
    if (isBuilding) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 80px)' }}>
                <Loader2 size={32} className="animate-spin" color="#3b82f6" />
            </div>
        );
    }

    // ── Step 2b: Error ──
    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 80px)', gap: '12px', color: '#ef4444' }}>
                <AlertCircle size={36} />
                <p style={{ margin: 0, fontSize: '15px' }}>{error}</p>
                <button
                    onClick={() => setAuthenticated(false)}
                    style={{ marginTop: '8px', padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '14px', cursor: 'pointer' }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // ── Step 2c: Payslip iframe ──
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative', backgroundColor: 'var(--color-neutral-50, #f9fafb)' }}>
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
    );
}
