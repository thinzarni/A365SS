import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';

/** Wait for Zustand persist to finish rehydrating from localStorage */
function useHasHydrated() {
    const [hasHydrated, setHasHydrated] = useState(
        () => useAuthStore.persist.hasHydrated()
    );
    useEffect(() => {
        if (!hasHydrated) {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
                setHasHydrated(true);
            });
            // In case it already hydrated between the useState init and this effect
            if (useAuthStore.persist.hasHydrated()) setHasHydrated(true);
            return unsub;
        }
    }, [hasHydrated]);
    return hasHydrated;
}

export function RequireAuth() {
    const hydrated = useHasHydrated();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const token = useAuthStore((s) => s.token);
    const logout = useAuthStore((s) => s.logout);

    // Don't redirect until we know the real auth state
    if (!hydrated) return null;

    // ── Self-healing: Break redirect loops by clearing invalid state ──
    if (isAuthenticated && !token) {
        console.warn('Inconsistent auth state detected (authenticated but no token). Logging out...');
        logout();
        return <Navigate to="/login" replace />;
    }

    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export function GuestOnly() {
    const hydrated = useHasHydrated();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const token = useAuthStore((s) => s.token);

    // Don't redirect until we know the real auth state
    if (!hydrated) return null;

    if (isAuthenticated && token) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
