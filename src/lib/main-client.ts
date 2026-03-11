/* ═══════════════════════════════════════════════════════════
   Main API Client — Axios instance for A365 main service
   Base URL: https://a365.omnicloudapi.com
   Used for: Teams, Attendance, Check-in, etc.
   ═══════════════════════════════════════════════════════════ */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '../config/app-config';
import { useAuthStore } from '../stores/auth-store';

const mainClient = axios.create({
    baseURL: appConfig.mainUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor ──
mainClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const { token, userId, domain } = useAuthStore.getState();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Inject userid & domain into POST body (same as Flutter ApiClient.post)
        if (config.method === 'post') {
            let body: Record<string, unknown> = {};

            if (config.data) {
                body = typeof config.data === 'string'
                    ? JSON.parse(config.data)
                    : config.data;
            }

            if (!body.userid && userId) body.userid = userId;
            if (!body.domain && domain) body.domain = domain;

            config.data = body;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor — silent token refresh on 401 ──
mainClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const { useAuthStore } = await import('../stores/auth-store');
                const { refreshToken, renewToken, logout } = useAuthStore.getState();

                if (!refreshToken) {
                    logout();
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                await renewToken(); // silently get new access token

                const { token } = useAuthStore.getState();
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return mainClient(originalRequest); // retry original request
            } catch {
                const { useAuthStore } = await import('../stores/auth-store');
                useAuthStore.getState().logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default mainClient;
