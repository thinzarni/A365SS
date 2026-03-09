/* ═══════════════════════════════════════════════════════════
   Environment Configuration
   ═══════════════════════════════════════════════════════════ */

export interface AppConfig {
    /** HXM Service (requests, approvals, leave, claims) */
    baseUrl: string;
    /** IAM Auth base (login, OTP, domain list) */
    authUrl: string;
    /** IAM base (non-auth IAM endpoints) */
    iamUrl: string;
    /** A365 main service URL */
    mainUrl: string;
    /** Chat service URL */
    chatUrl: string;
    /** WebSocket URL (optional — derived from chatUrl if not set) */
    wsUrl?: string;
    appName: string;
    appVersion: string;
    environment: 'dev' | 'staging' | 'sit' | 'prod';
}

// IAM prd url => https://iam.omnicloudapi.com
// IAM demo url => https://iamdemo.southeastasia.cloudapp.azure.com
const IAM_URL = import.meta.env.VITE_IAM_URL || 'https://iam.omnicloudapi.com';

const configs: Record<string, AppConfig> = {
    dev: {

        baseUrl: import.meta.env.VITE_BASE_URL || 'https://apx002.omnicloudapi.com/',
        authUrl: import.meta.env.VITE_AUTH_URL || IAM_URL + '/api/auth/',
        iamUrl: import.meta.env.VITE_IAM_URL || IAM_URL,
        mainUrl: import.meta.env.VITE_MAIN_URL || 'https://a365.omnicloudapi.com/',
        chatUrl: import.meta.env.VITE_CHAT_URL || IAM_URL + '/api/',
        wsUrl: import.meta.env.VITE_WS_URL || undefined,
        appName: 'A365 HR',
        appVersion: '1.0.0',
        environment: 'dev',
    },
    staging: {
        baseUrl: import.meta.env.VITE_BASE_URL || 'https://apx002.omnicloudapi.com/',
        authUrl: import.meta.env.VITE_AUTH_URL || IAM_URL + '/api/auth/',
        iamUrl: import.meta.env.VITE_IAM_URL || IAM_URL,
        mainUrl: import.meta.env.VITE_MAIN_URL || 'https://a365.omnicloudapi.com/',
        chatUrl: import.meta.env.VITE_CHAT_URL || IAM_URL + '/api/',
        wsUrl: import.meta.env.VITE_WS_URL || undefined,
        appName: 'A365 HR',
        appVersion: '1.0.0',
        environment: 'staging',
    },
    prod: {
        baseUrl: import.meta.env.VITE_BASE_URL || 'https://apx002.omnicloudapi.com/',
        authUrl: import.meta.env.VITE_AUTH_URL || IAM_URL + '/api/auth/',
        iamUrl: import.meta.env.VITE_IAM_URL || IAM_URL,
        mainUrl: import.meta.env.VITE_MAIN_URL || 'https://a365.omnicloudapi.com/',
        chatUrl: import.meta.env.VITE_CHAT_URL || IAM_URL + '/api/',
        wsUrl: import.meta.env.VITE_WS_URL || 'wss://iamdemo.southeastasia.cloudapp.azure.com/api',
        appName: 'A365 HR',
        appVersion: '1.0.0',
        environment: 'prod',
    },
};

const env = import.meta.env.VITE_APP_ENV || 'dev';

export const appConfig: AppConfig = configs[env] || configs.dev;
