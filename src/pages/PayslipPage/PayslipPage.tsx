import { useMemo } from 'react';
import { appConfig } from '../../config/app-config';
import { useAuthStore } from '../../stores/auth-store';
import { Loader2 } from 'lucide-react';

export default function PayslipPage() {
    const { domain, token, userId } = useAuthStore();

    const iframeUrl = useMemo(() => {
        if (!domain || !userId || !token) return '';
        const cleanMainUrl = appConfig.mainUrl.replace(/\/+$/, '');
        const params = new URLSearchParams({
            domain: domain,
            userid: userId,
            token: token,
        });
        return `${cleanMainUrl}/payslip/app/menu/list?${params.toString()}`;
    }, [domain, userId, token]);

    if (!iframeUrl) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 80px)', backgroundColor: 'var(--color-neutral-50)', position: 'relative' }}>
            <iframe
                src={iframeUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Payslip"
                allow="fullscreen"
            />
        </div>
    );
}
