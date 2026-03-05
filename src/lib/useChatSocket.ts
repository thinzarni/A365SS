import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useChatStore } from '../stores/chat-store';
import { APP_ID } from './auth-token';

const WS_URL = 'wss://takmzujdyc.execute-api.ap-southeast-1.amazonaws.com';

export function useChatSocket() {
    const { userId, domain, user } = useAuthStore();
    const receiveSocketMessage = useChatStore(state => state.receiveSocketMessage);
    const setTypingStatus = useChatStore(state => state.setTypingStatus);

    const wsRef = useRef<WebSocket | null>(null);
    const pingTimerRef = useRef<number | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const manuallyClosedRef = useRef(false);

    const connect = useCallback(() => {
        if (!userId || !domain) return;
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

        manuallyClosedRef.current = false;

        const uri = `${WS_URL}/v1?user=${encodeURIComponent(userId)}&app=${encodeURIComponent(APP_ID)}&domain=${encodeURIComponent(domain)}`;

        try {
            const ws = new WebSocket(uri);

            ws.onopen = () => {
                console.log('Chat WebSocket connected');
                startPing();
                if (reconnectTimerRef.current) {
                    window.clearTimeout(reconnectTimerRef.current);
                    reconnectTimerRef.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    if (event.data === 'pong') return;

                    const decoded = JSON.parse(event.data);

                    if (decoded.conversation_id && decoded.is_typing !== undefined) {
                        // Handle Typing Indicator
                        const isTyping = decoded.is_typing === true || decoded.is_typing === 'true';
                        const username = decoded.username;
                        const typerId = decoded.typer_id;

                        // Don't show typing for self
                        if (typerId !== userId) {
                            setTypingStatus(decoded.conversation_id, username, isTyping);
                        }
                    } else if (decoded.conversation_id && decoded.content) {
                        // Handle New Message
                        receiveSocketMessage(decoded);
                    }
                } catch (err) {
                    console.log('WS message parsing error or raw string', err);
                }
            };

            ws.onerror = (error) => {
                console.error('Chat WebSocket error', error);
                ws.close();
            };

            ws.onclose = () => {
                console.log('Chat WebSocket closed');
                stopPing();
                wsRef.current = null;
                scheduleReconnect();
            };

            wsRef.current = ws;

        } catch (e) {
            console.error('Failed to create WebSocket', e);
            scheduleReconnect();
        }
    }, [userId, domain, receiveSocketMessage, setTypingStatus]);

    const disconnect = useCallback(() => {
        manuallyClosedRef.current = true;
        stopPing();
        if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (manuallyClosedRef.current) return;
        if (reconnectTimerRef.current) return;

        console.log('Chat WebSocket scheduling reconnect...');
        reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            connect();
        }, 5000);
    }, [connect]);

    const startPing = () => {
        stopPing();
        pingTimerRef.current = window.setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                // Keep-alive data. The mobile app sometimes uses {"action": "ping"} if needed
                wsRef.current.send(JSON.stringify({ action: "ping" }));
            }
        }, 5000); // 5 sec keepalive per Flutter mobile app reference
    };

    const stopPing = () => {
        if (pingTimerRef.current) {
            window.clearInterval(pingTimerRef.current);
            pingTimerRef.current = null;
        }
    };

    const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean = true) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;

        const payload = {
            action: "typing",
            body: {
                conversation: conversationId,
                user: userId,
                app: APP_ID,
                domain: domain,
                username: user?.name || user?.userid || 'User',
                is_typing: isTyping // Extending payload slightly to allow cancelling typing if needed
            }
        };

        try {
            wsRef.current.send(JSON.stringify(payload));
        } catch (e) {
            console.error("Error sending typing indicator", e);
        }
    }, [userId, domain, user]);

    // Cleanup & Connect on Mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        sendTypingIndicator,
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    };
}
