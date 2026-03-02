/* ═══════════════════════════════════════════════════════════
   ChatSocketService — WebSocket client for real-time chat
   Mirrors Flutter's SocketService singleton exactly:
     wss://<chatUrl>/v1?user=<userId>&app=004&domain=<domain>
   ═══════════════════════════════════════════════════════════ */

import { appConfig } from '../config/app-config';
import { useAuthStore } from '../stores/auth-store';

export type SocketMessageHandler = (data: Record<string, any>) => void;

class ChatSocketService {
    private static _instance: ChatSocketService | null = null;

    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private backoffMs = 5_000;
    private readonly maxBackoffMs = 60_000;
    private manuallyClosed = false;
    private isConnecting = false;

    private handlers: Set<SocketMessageHandler> = new Set();

    // singleton
    static get instance(): ChatSocketService {
        if (!ChatSocketService._instance) {
            ChatSocketService._instance = new ChatSocketService();
        }
        return ChatSocketService._instance;
    }

    // ── Register / remove message-handlers ──────────────────────
    onMessage(handler: SocketMessageHandler) {
        this.handlers.add(handler);
    }
    offMessage(handler: SocketMessageHandler) {
        this.handlers.delete(handler);
    }

    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // ── Build WebSocket URL (matches Flutter exactly) ────────────
    private buildUrl(): string | null {
        const { userId, domain } = useAuthStore.getState();
        if (!userId) return null;

        const dom = domain || 'demouat';

        // 1. Prefer explicit wsUrl from app-config (set via VITE_WS_URL env var)
        const explicitWs = appConfig.wsUrl || (import.meta as any).env?.VITE_WS_URL as string | undefined;
        if (explicitWs) {
            const base = explicitWs.replace(/\/$/, '');
            return `${base}/v1?user=${encodeURIComponent(userId)}&app=004&domain=${encodeURIComponent(dom)}`;
        }

        // 2. Derive from chatUrl — only works when chatUrl is an absolute https:// URL
        const base = (appConfig.chatUrl || '').replace(/\/$/, '');
        if (base && !base.startsWith('/')) {
            // e.g. https://iam.omnicloudapi.com/api → wss://iam.omnicloudapi.com/api
            const wsBase = base.replace(/^https?/, 'wss');
            return `${wsBase}/v1?user=${encodeURIComponent(userId)}&app=004&domain=${encodeURIComponent(dom)}`;
        }

        // 3. chatUrl is relative ('/' — Vite proxy in dev): proxy /v1 via vite.config.ts ws:true
        //    Uses wss at the same host (vite dev server proxies /v1 to the real chat WS server)
        const wsBase = `wss://${window.location.host}`;
        return `${wsBase}/v1?user=${encodeURIComponent(userId)}&app=004&domain=${encodeURIComponent(dom)}`;
    }

    // ── Connect ──────────────────────────────────────────────────
    connect() {
        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;

        const url = this.buildUrl();
        if (!url) {
            console.warn('[ChatSocket] No userId — skipping connect');
            return;
        }

        this.isConnecting = true;
        this.manuallyClosed = false;
        console.log('[ChatSocket] Connecting to', url);

        try {
            this.ws = new WebSocket(url);
        } catch (err) {
            console.error('[ChatSocket] Failed to create WebSocket:', err);
            this.isConnecting = false;
            this._scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.log('[ChatSocket] Connected ✔');
            this.isConnecting = false;
            this.backoffMs = 5_000; // reset backoff on success
            this._startPing();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data as string);
                this.handlers.forEach(h => h(data));
            } catch {
                // non-JSON frames (pong, ping text) — ignore
            }
        };

        this.ws.onerror = (err) => {
            console.warn('[ChatSocket] Error:', err);
        };

        this.ws.onclose = (ev) => {
            console.log(`[ChatSocket] Closed (code=${ev.code})`);
            this.isConnecting = false;
            this._stopPing();
            if (!this.manuallyClosed) {
                this._scheduleReconnect();
            }
        };
    }

    // ── Disconnect ───────────────────────────────────────────────
    disconnect() {
        this.manuallyClosed = true;
        this._clearReconnect();
        this._stopPing();
        this.ws?.close();
        this.ws = null;
        console.log('[ChatSocket] Disconnected manually');
    }

    // ── Internal helpers ─────────────────────────────────────────
    private _startPing() {
        this._stopPing();
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                try { this.ws.send('ping'); } catch { /* ignore */ }
            }
        }, 30_000);
    }

    private _stopPing() {
        if (this.pingTimer !== null) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    private _scheduleReconnect() {
        this._clearReconnect();
        console.log(`[ChatSocket] Reconnecting in ${this.backoffMs / 1000}s`);
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.backoffMs);
        // Exponential backoff: double until maxBackoff
        this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    }

    private _clearReconnect() {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

export const chatSocket = ChatSocketService.instance;
