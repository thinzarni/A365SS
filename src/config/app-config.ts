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
    /** Payslip service URL (if different from mainUrl, e.g. MPT runs on a different port) */
    payslipUrl?: string;
    /** Chat service URL */
    chatUrl: string;
    /** WebSocket URL (optional — derived from chatUrl if not set) */
    wsUrl?: string;
    appName: string;
    appVersion: string;
    appId: string;
    environment: 'dev' | 'staging' | 'sit' | 'prod' | 'mpt';
}

// IAM prd url => https://iamdemo.southeastasia.cloudapp.azure.com
// IAM other url => https://iam.omnicloudapi.com
const IAM_URL = import.meta.env.VITE_IAM_URL || 'https://iam.omnicloudapi.com';
const PRD_IAM_URL = 'https://mptiam.mitcloud.com';
// const MPT_IAM_URL = 'http://10.112.16.8:8000';
const MPT_IAM_URL = 'http://iam-uat.mptjo.com.mm:8000';

// ── MPT on-premise (IP-based) ──────────────────────────────────────
// Change these two constants to match the actual server IP and port.
// const MPT_IP = '10.112.16.2';
// const MPT_PORT = { hxm: 8081, main: 8080, iam: 8000 };
// const MPT_BASE = (port: number) => `http://${MPT_IP}:${port}/`;

const configs: Record<string, AppConfig> = {
    dev: {
        baseUrl: import.meta.env.VITE_BASE_URL || 'https://apx002.omnicloudapi.com/',
        authUrl: import.meta.env.VITE_AUTH_URL || IAM_URL + '/api/auth/',
        iamUrl: import.meta.env.VITE_IAM_URL || IAM_URL,
        // mainUrl: import.meta.env.VITE_MAIN_URL || 'https://a365.omnicloudapi.com/',
        mainUrl: import.meta.env.VITE_MAIN_URL || 'http://localhost:3000/',
        chatUrl: import.meta.env.VITE_CHAT_URL || IAM_URL + '/api/',
        wsUrl: import.meta.env.VITE_WS_URL || IAM_URL + '/api/',
        appName: 'A365 HR',
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.15',
        appId: import.meta.env.VITE_APP_ID || '004',
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
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.15',
        appId: import.meta.env.VITE_APP_ID || '004',
        environment: 'staging',
    },
    prod: {
        baseUrl: import.meta.env.VITE_BASE_URL || 'https://mpthxm.mitcloud.com/',
        // baseUrl: import.meta.env.VITE_BASE_URL || 'http://localhost:3001/',
        authUrl: import.meta.env.VITE_AUTH_URL || PRD_IAM_URL + '/api/auth/',
        iamUrl: import.meta.env.VITE_IAM_URL || PRD_IAM_URL,
        mainUrl: import.meta.env.VITE_MAIN_URL || 'https://mpta365.mitcloud.com/',
        // mainUrl: import.meta.env.VITE_MAIN_URL || 'http://localhost:3000/',
        chatUrl: import.meta.env.VITE_CHAT_URL || PRD_IAM_URL + '/api/',
        wsUrl: import.meta.env.VITE_WS_URL || 'wss://mptiam.mitcloud.com/api',
        appName: 'A365 HR',
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.15',
        appId: import.meta.env.VITE_APP_ID || '005',
        environment: 'prod',
    },
    mpt: {
        // Direct IP-based deployment for the MPT internal network.
        baseUrl: import.meta.env.VITE_BASE_URL || 'http://hrms-uat.mptjo.com.mm:8081/',
        authUrl: import.meta.env.VITE_AUTH_URL || MPT_IAM_URL + '/api/auth/',
        iamUrl: import.meta.env.VITE_IAM_URL || MPT_IAM_URL,
        mainUrl: import.meta.env.VITE_MAIN_URL || 'http://hrapp-uat.mptjo.com.mm:8080/',
        payslipUrl: import.meta.env.VITE_PAYSLIP_URL || 'http://hrapp-uat.mptjo.com.mm:8083/',
        chatUrl: import.meta.env.VITE_CHAT_URL || MPT_IAM_URL + '/api/',
        wsUrl: import.meta.env.VITE_WS_URL || 'ws://iam-uat.mptjo.com.mm:8000/api',
        appName: 'A365 HR',
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.15',
        appId: import.meta.env.VITE_APP_ID || '005',
        environment: 'mpt',
    },
};

const env = import.meta.env.VITE_APP_ENV || 'dev';

export const appConfig: AppConfig = configs[env] || configs.dev;
