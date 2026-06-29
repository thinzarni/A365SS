import { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { appConfig } from '../../config/app-config';
import { APP_ID } from '../../lib/auth-token';
import apiClient from '../../lib/api-client';
import toast from 'react-hot-toast';
import { SAVE_DEVICE_INFO } from '../../config/api-routes';

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
    const userId = useAuthStore((s) => s.userId);
    const domain = useAuthStore((s) => s.domain);
    const user = useAuthStore((s) => s.user);

    const [isValidating, setIsValidating] = useState(true);
    const hasValidated = useRef(false);

    // Key includes userId so it resets automatically when a different user logs in
    const sessionKey = `a365-device-registered-${userId ?? 'unknown'}`;

    useEffect(() => {
        if (!hydrated || !isAuthenticated || !token) {
            if (hydrated) setIsValidating(false);
            return;
        }

        // Skip if already called in-memory (React StrictMode double-invoke guard)
        if (hasValidated.current) {
            setIsValidating(false);
            return;
        }

        // Skip if already called this session (survives page refresh, cleared on logout)
        if (sessionStorage.getItem(sessionKey) === '1') {
            setIsValidating(false);
            return;
        }

        const validateDevice = async () => {
            hasValidated.current = true;
            try {
                const deviceRes = await apiClient.post(SAVE_DEVICE_INFO, {
                    user_id: userId,
                    app_id: APP_ID,
                    mobile: userId,
                    device_name: navigator.userAgent,
                    uuid: localStorage.getItem('a365-device-uuid') || '',
                    date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                    version: appConfig.appVersion,
                    userid: userId,
                    domain: user?.domainName || domain
                });

                if (deviceRes.data?.statuscode === 400) {
                    logout();
                    sessionStorage.removeItem(sessionKey);
                    toast.error(deviceRes.data?.message ?? "Employee not found! You don't have access.");
                } else {
                    // Mark as done for this session
                    sessionStorage.setItem(sessionKey, '1');
                }
            } catch (err: any) {
                if (err?.response?.data?.statuscode === 400) {
                    logout();
                    sessionStorage.removeItem(sessionKey);
                    toast.error(err?.response?.data?.message ?? "Employee not found! You don't have access.");
                }
            } finally {
                setIsValidating(false);
            }
        };

        validateDevice();
    }, [hydrated, isAuthenticated, token, userId, domain, user, logout, sessionKey]);

    // Don't redirect or render layout until we know the real auth state and validation is complete
    if (!hydrated || isValidating) return null;

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
