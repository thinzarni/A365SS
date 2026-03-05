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

    // Don't redirect until we know the real auth state
    if (!hydrated) return null;

    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export function GuestOnly() {
    const hydrated = useHasHydrated();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    // Don't redirect until we know the real auth state
    if (!hydrated) return null;

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
