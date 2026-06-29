import { useRouteError } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function GlobalErrorBoundary() {
    const error = useRouteError() as Error;

    // Catch Vite's dynamic import error when a new build is deployed
    if (error?.message?.includes('Failed to fetch dynamically imported module') || error?.message?.includes('importing a module')) {
        window.location.reload();
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" />
                <span style={{ marginLeft: '12px', color: '#4b5563', fontWeight: 500 }}>Updating app...</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px', textAlign: 'center', background: '#f9fafb' }}>
            <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>Unexpected Error</h1>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
                    {error?.message || 'We encountered an unexpected problem.'}
                </p>
                <button 
                    onClick={() => window.location.href = '/'} 
                    style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 500, width: '100%' }}
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}
