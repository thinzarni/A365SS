import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { appConfig } from '../config/app-config';
import { useAuthStore } from '../stores/auth-store';

// ── Singleton State ──
let globalSocket: Socket | null = null;
const globalListeners = new Map<string, Set<(data: any) => void>>();

export function useSocket() {
    const { userId, domain } = useAuthStore();

    useEffect(() => {
        if (!userId) return;

        // If socket already exists for this user/domain, don't recreate
        if (globalSocket?.connected && globalSocket.io.opts.query?.['userId'] === userId) {
            return;
        }

        if (globalSocket) {
            console.log('🧹 [Socket] Closing existing global socket');
            globalSocket.disconnect();
        }

        const socketUrl = appConfig.mainUrl.replace(/\/api\/?$/, '').replace(/\/$/, '') || window.location.origin;
        console.log(`🔌 [Socket] Creating singleton connection to ${socketUrl} for user ${userId}`);

        const socket = io(socketUrl, {
            path: '/api/socket.io',
            transports: ['websocket'],
            query: { userId, domain: domain || 'demouat' },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('✅ [Socket] Global Singleton Connected');
            // Re-attach all active listeners to the new socket instance
            globalListeners.forEach((handlers, event) => {
                handlers.forEach(handler => socket.on(event, handler));
            });
        });

        socket.on('disconnect', () => console.log('❌ [Socket] Global Singleton Disconnected'));
        socket.on('error', (err) => console.error('❗ [Socket] Error:', err));

        globalSocket = socket;

        return () => {
            // In a singleton pattern, we might NOT want to disconnect on unmount
            // but we should if the userId changes (which is handled by the dependency array)
        };
    }, [userId, domain]);

    const on = useCallback((event: string, handler: (data: any) => void) => {
        if (!globalListeners.has(event)) {
            globalListeners.set(event, new Set());
        }
        const handlers = globalListeners.get(event)!;
        if (!handlers.has(handler)) {
            handlers.add(handler);
            globalSocket?.on(event, handler);
        }
    }, []);

    const off = useCallback((event: string, handler: (data: any) => void) => {
        const handlers = globalListeners.get(event);
        if (handlers) {
            handlers.delete(handler);
            globalSocket?.off(event, handler);
        }
    }, []);

    const emit = useCallback((event: string, data: any) => {
        globalSocket?.emit(event, data);
    }, []);

    return {
        socket: globalSocket,
        on,
        off,
        emit,
        isConnected: globalSocket?.connected || false
    };
}
