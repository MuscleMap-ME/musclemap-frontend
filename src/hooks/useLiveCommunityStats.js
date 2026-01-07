/**
 * useLiveCommunityStats Hook
 *
 * Fetches public community stats for landing page with WebSocket real-time updates.
 * No authentication required - designed for anonymous visitors.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_DELAY = 3000;
const POLL_INTERVAL = 60000; // 60s fallback polling

export function useLiveCommunityStats() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pollIntervalRef = useRef(null);

  // Format stat display (handles threshold logic from server)
  const formatStat = useCallback((stat) => {
    if (!stat) return '—';
    return stat.display || stat.value?.toString() || '—';
  }, []);

  // Fetch stats via REST API
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/community/stats/public');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const json = await res.json();
      const data = json.data;

      setStats({
        activeNow: data.activeNow,
        activeWorkouts: data.activeWorkouts,
        totalUsers: data.totalUsers,
        totalWorkouts: data.totalWorkouts,
      });
      setActivity(data.recentActivity || []);
      setMilestone(data.milestone);
      setError(null);
    } catch (err) {
      console.error('Error fetching public stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/community/ws/public`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttempts.current = 0;
        // Stop polling when WS is connected
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'snapshot' || message.type === 'update') {
            const data = message.data;
            setStats({
              activeNow: data.activeNow,
              activeWorkouts: data.activeWorkouts,
              totalUsers: data.totalUsers,
              totalWorkouts: data.totalWorkouts,
            });
            if (data.recentActivity) {
              setActivity(data.recentActivity);
            }
            if (data.milestone !== undefined) {
              setMilestone(data.milestone);
            }
            setLoading(false);
          } else if (message.type === 'activity') {
            // Real-time activity event
            setActivity((prev) => [message.data, ...prev].slice(0, 20));
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Attempt reconnect
        if (reconnectAttempts.current < WS_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          setTimeout(connectWebSocket, WS_RECONNECT_DELAY);
        } else {
          // Fall back to polling
          startPolling();
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      // Store cleanup function
      ws._heartbeatInterval = heartbeat;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      startPolling();
    }
  }, []);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    fetchStats();
    pollIntervalRef.current = setInterval(fetchStats, POLL_INTERVAL);
  }, [fetchStats]);

  // Initial fetch and WebSocket connection
  useEffect(() => {
    // Fetch initial data
    fetchStats();

    // Try to connect WebSocket
    connectWebSocket();

    return () => {
      // Cleanup
      if (wsRef.current) {
        if (wsRef.current._heartbeatInterval) {
          clearInterval(wsRef.current._heartbeatInterval);
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchStats, connectWebSocket]);

  return {
    stats,
    activity,
    milestone,
    loading,
    connected,
    error,
    formatStat,
    refresh: fetchStats,
  };
}

export default useLiveCommunityStats;
