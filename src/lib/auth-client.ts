/* ═══════════════════════════════════════════════════════════
   Auth Client — Axios instance for IAM auth endpoints
   Base URL: https://iamdemo.southeastasia.cloudapp.azure.com/api/auth/
   ═══════════════════════════════════════════════════════════ */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '../config/app-config';

/** Dedicated client for IAM auth calls (login, OTP, domain list, change-password) */
const authClient = axios.create({
    baseURL: appConfig.authUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/** Dedicated client for IAM non-auth calls */
export const iamClient = axios.create({
    baseURL: appConfig.iamUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/* ── 401 Token-Refresh Interceptor ──────────────────────────────
   Shared helper: attaches a response interceptor to any Axios instance.
   On 401: calls renewToken(), updates the Authorization header, retries.
   On renewToken failure: logs out and redirects to /login.
   ──────────────────────────────────────────────────────────── */
function attachRefreshInterceptor(client: ReturnType<typeof axios.create>) {
    client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    // Lazy-load auth store to avoid circular dependency at module init
                    const { useAuthStore } = await import('../stores/auth-store');
                    const { refreshToken, renewToken, logout } = useAuthStore.getState();

                    if (!refreshToken) {
                        logout();
                        window.location.href = '/login';
                        return Promise.reject(error);
                    }

                    await renewToken();

                    // Pick up the freshly stored token and retry
                    const { token } = useAuthStore.getState();
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return client(originalRequest);
                } catch {
                    const { useAuthStore } = await import('../stores/auth-store');
                    useAuthStore.getState().logout();
                    window.location.href = '/login';
                }
            }

            return Promise.reject(error);
        }
    );
}

// Attach to both clients (skip for renew-token calls to prevent infinite loops)
attachRefreshInterceptor(authClient);
attachRefreshInterceptor(iamClient);

export default authClient;
