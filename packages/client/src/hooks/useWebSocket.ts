/**
 * useWebSocket Hook
 *
 * Provides WebSocket connection for real-time updates.
 * Platform-agnostic: works in browser and React Native.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_HEARTBEAT_INTERVAL = 30000;

export interface WebSocketMessage<T = unknown> {
  type: 'snapshot' | 'event' | 'heartbeat';
  data?: T;
}

export interface UseWebSocketOptions<TSnapshot = unknown, TEvent = unknown> {
  autoConnect?: boolean;
  onMessage?: (data: TEvent) => void;
  onSnapshot?: (data: TSnapshot) => void;
  token?: string;
  /** Base URL for WebSocket connection (defaults to window.location in browser) */
  baseUrl?: string;
}

export interface UseWebSocketResult<TSnapshot = unknown, TEvent = unknown> {
  connected: boolean;
  error: string | null;
  snapshot: TSnapshot | null;
  events: TEvent[];
  connect: () => void;
  disconnect: () => void;
  sendHeartbeat: () => void;
}

/**
 * Build WebSocket URL from endpoint
 */
function buildWebSocketUrl(endpoint: string, token?: string, baseUrl?: string): string {
  let url: string;

  if (baseUrl) {
    // Use provided base URL (for React Native or custom configs)
    const wsProtocol = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = baseUrl.replace(/^https?:\/\//, '');
    url = `${wsProtocol}//${host}${endpoint}`;
  } else if (typeof window !== 'undefined') {
    // Browser environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    url = `${protocol}//${window.location.host}${endpoint}`;
  } else {
    throw new Error('WebSocket URL cannot be determined. Provide baseUrl option.');
  }

  // Add token as query param if provided
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }

  return url;
}

export function useWebSocket<TSnapshot = unknown, TEvent = unknown>(
  endpoint: string,
  options: UseWebSocketOptions<TSnapshot, TEvent> = {}
): UseWebSocketResult<TSnapshot, TEvent> {
  const { autoConnect = true, onMessage, onSnapshot, token, baseUrl } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TSnapshot | null>(null);
  const [events, setEvents] = useState<TEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const url = buildWebSocketUrl(endpoint, token, baseUrl);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage<TSnapshot | TEvent>;

          if (data.type === 'snapshot') {
            setSnapshot(data.data as TSnapshot);
            onSnapshot?.(data.data as TSnapshot);
          } else if (data.type === 'event') {
            setEvents((prev) => [data.data as TEvent, ...prev].slice(0, 100));
            onMessage?.(data.data as TEvent);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setError('Connection error');
      };

      ws.onclose = (event) => {
        setConnected(false);
        wsRef.current = null;

        // Attempt reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttempts.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          reconnectTimeout.current = setTimeout(connect, WS_RECONNECT_DELAY);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [endpoint, token, baseUrl, onMessage, onSnapshot]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Send heartbeats periodically
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(sendHeartbeat, WS_HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [connected, sendHeartbeat]);

  return {
    connected,
    error,
    snapshot,
    events,
    connect,
    disconnect,
    sendHeartbeat,
  };
}

export default useWebSocket;
