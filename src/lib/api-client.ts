import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '../config/app-config';
import { useAuthStore } from '../stores/auth-store';

/* ══════════════════════════════════════════════════════════════
   HXM API Client
   Flutter uses mainURL (a365.omnicloudapi.com) as the base.
   Every POST injects { userid, domain } into the request body.
   ══════════════════════════════════════════════════════════════ */
const apiClient = axios.create({
    baseURL: appConfig.baseUrl,          // apx002.omnicloudapi.com (Flutter uses baseURL for hxm/ endpoints)
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor ──
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const { token, userId, domain } = useAuthStore.getState();

        // Bearer token (IAMtoken from /get-menu)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Flutter injects userid & domain into every POST body
        if (config.method === 'post' && config.data) {
            if (config.data instanceof FormData) {
                // Multipart upload — append userid/domain to the FormData directly.
                // Do NOT set Content-Type; browser sets it automatically with the boundary.
                if (userId && !config.data.has('userid')) config.data.append('userid', userId);
                if (domain && !config.data.has('domain')) config.data.append('domain', domain);
            } else {
                const body = typeof config.data === 'string'
                    ? JSON.parse(config.data)
                    : config.data;

                if (!body.userid && userId) body.userid = userId;
                if (!body.domain && domain) body.domain = domain;

                config.data = body;
            }
        }

        // For GET requests, inject userid & domain as query params
        if (config.method === 'get') {
            config.params = config.params || {};
            if (!config.params.userid && userId) config.params.userid = userId;
            if (!config.params.domain && domain) config.params.domain = domain;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor ──
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Token expired — attempt silent refresh then retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Lazy-import to avoid circular dep at module init time
                const { useAuthStore } = await import('../stores/auth-store');
                const { refreshToken, renewToken, logout } = useAuthStore.getState();

                if (!refreshToken) {
                    logout();
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                await renewToken(); // updates token in store

                const { token } = useAuthStore.getState();
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return apiClient(originalRequest);
            } catch {
                const { useAuthStore } = await import('../stores/auth-store');
                useAuthStore.getState().logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
