/**
 * useWebSocket Hook
 *
 * Provides WebSocket connection for real-time community updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(endpoint, options = {}) {
  const { autoConnect = true, onMessage, onSnapshot, token } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [events, setEvents] = useState([]);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let url = `${protocol}//${window.location.host}${endpoint}`;

    // Add token as query param if provided
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'snapshot') {
            setSnapshot(data.data);
            onSnapshot?.(data.data);
          } else if (data.type === 'event') {
            setEvents((prev) => [data.data, ...prev].slice(0, 100));
            onMessage?.(data.data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
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
      setError(err.message);
    }
  }, [endpoint, token, onMessage, onSnapshot]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
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

    const interval = setInterval(sendHeartbeat, 30000);
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
