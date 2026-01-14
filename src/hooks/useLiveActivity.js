/**
 * useLiveActivity Hook
 *
 * Fetches anonymous live activity data with WebSocket real-time updates.
 * All data is aggregated and anonymous - respects user privacy absolutely.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const WS_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_DELAY = 3000;
const POLL_INTERVAL = 30000; // 30s fallback polling

const TIME_WINDOWS = {
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '24h': 1440,
};

export function useLiveActivity(options = {}) {
  const {
    timeWindow = '1h',
    autoConnect = true,
  } = options;

  const [stats, setStats] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [feed, setFeed] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const pollIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  // Fetch stats via REST API
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/stats?window=${timeWindow}`);
      if (!res.ok) throw new Error('Failed to fetch live stats');
      const json = await res.json();
      setStats(json.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching live stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  // Fetch map data
  const fetchMapData = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/map?window=${timeWindow}`);
      if (!res.ok) throw new Error('Failed to fetch map data');
      const json = await res.json();
      setMapData(json.data || []);
    } catch (err) {
      console.error('Error fetching map data:', err);
    }
  }, [timeWindow]);

  // Fetch feed data
  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/live/feed?limit=50');
      if (!res.ok) throw new Error('Failed to fetch feed');
      const json = await res.json();
      setFeed(json.data || []);
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
  }, []);

  // Fetch trending exercises
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/trending?window=${timeWindow}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch trending');
      const json = await res.json();
      setTrending(json.data || []);
    } catch (err) {
      console.error('Error fetching trending:', err);
    }
  }, [timeWindow]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchMapData(),
      fetchFeed(),
      fetchTrending(),
    ]);
    setLoading(false);
  }, [fetchStats, fetchMapData, fetchFeed, fetchTrending]);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    fetchAllData();
    pollIntervalRef.current = setInterval(fetchAllData, POLL_INTERVAL);
  }, [fetchAllData]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live/stream`;

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

          // Real-time activity event - add to feed
          if (message.type) {
            setFeed((prev) => [message, ...prev].slice(0, 100));

            // Update stats count
            setStats((prev) => prev ? {
              ...prev,
              total: (prev.total || 0) + 1,
            } : prev);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Clear heartbeat on close
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnect
        if (reconnectAttempts.current < WS_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, WS_RECONNECT_DELAY);
        } else {
          // Fall back to polling
          startPolling();
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };

      // Heartbeat to keep connection alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      startPolling();
    }
  }, [startPolling]);

  // Initial fetch and WebSocket connection
  useEffect(() => {
    // Fetch initial data
    fetchAllData();

    // Try to connect WebSocket
    if (autoConnect) {
      connectWebSocket();
    }

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchAllData, connectWebSocket, autoConnect]);

  // Refetch when time window changes
  useEffect(() => {
    fetchStats();
    fetchMapData();
    fetchTrending();
  }, [timeWindow, fetchStats, fetchMapData, fetchTrending]);

  // Format relative time
  const formatRelativeTime = useCallback((timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return then.toLocaleDateString();
  }, []);

  // Computed: activity by muscle group
  const activityByMuscle = useMemo(() => {
    if (!stats?.byMuscle) return [];
    return Object.entries(stats.byMuscle)
      .map(([muscle, count]) => ({ muscle, count }))
      .sort((a, b) => b.count - a.count);
  }, [stats?.byMuscle]);

  // Computed: activity by country
  const activityByCountry = useMemo(() => {
    if (!stats?.byCountry) return [];
    return Object.entries(stats.byCountry)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }, [stats?.byCountry]);

  return {
    // Data
    stats,
    mapData,
    feed,
    trending,
    activityByMuscle,
    activityByCountry,

    // State
    loading,
    connected,
    error,
    timeWindow,

    // Actions
    refresh: fetchAllData,
    refreshStats: fetchStats,
    refreshMap: fetchMapData,
    refreshFeed: fetchFeed,
    refreshTrending: fetchTrending,

    // Helpers
    formatRelativeTime,
    timeWindows: TIME_WINDOWS,
  };
}

export default useLiveActivity;
