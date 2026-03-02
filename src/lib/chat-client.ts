/* ═══════════════════════════════════════════════════════════
   Chat API Client — Axios instance for Chat service
   ═══════════════════════════════════════════════════════════ */

import axios, { type InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '../config/app-config';
import { useAuthStore } from '../stores/auth-store';

const chatClient = axios.create({
    baseURL: appConfig.chatUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor ──
chatClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const { token, userId, domain } = useAuthStore.getState();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Standard body for POST requests
        if (config.method === 'post') {
            let body: Record<string, any> = {};

            if (config.data) {
                body = typeof config.data === 'string'
                    ? JSON.parse(config.data)
                    : config.data;
            }

            // Chat API often expects appid and sub_appid (domain)
            // Flutter uses 'userid', 'appid', 'sub_appid', 'curPage', 'pageSize' in the body
            if (!body.userid && userId) body.userid = userId;
            if (!body.appid) body.appid = '004';

            const currentDomain = domain || 'demouat';
            if (!body.sub_appid) body.sub_appid = currentDomain;

            const { user } = useAuthStore.getState();
            // Use usersyskey for X-User-Id if available, fallback to userId (email)
            const effectiveUserId = user?.usersyskey || userId;

            config.data = body;

            // Strict headers required by some OmniCloud API versions
            config.headers['X-App-Id'] = body.appid;
            if (currentDomain) config.headers['X-Domain'] = currentDomain;
            if (effectiveUserId) config.headers['X-User-Id'] = effectiveUserId;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default chatClient;
