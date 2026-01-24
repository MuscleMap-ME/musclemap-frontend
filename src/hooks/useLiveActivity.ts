/**
 * useLiveActivity Hook
 *
 * Fetches anonymous live activity data with WebSocket real-time updates.
 * All data is aggregated and anonymous - respects user privacy absolutely.
 *
 * Uses GraphQL for feed data, with WebSocket fallback for real-time updates.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { COMMUNITY_FEED_QUERY, PUBLIC_COMMUNITY_STATS_QUERY } from '../graphql';

const WS_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_DELAY = 3000;
const POLL_INTERVAL = 30000; // 30s fallback polling

const TIME_WINDOWS: Record<string, number> = {
  '5m': 5,
  '15m': 15,
  '1h': 60,
  '24h': 1440,
};

// Types
interface FeedItem {
  id: string;
  type: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
    level?: number;
  };
  content?: string;
  workout?: {
    id: string;
    totalTU: number;
    duration: number;
  };
  achievement?: {
    id: string;
    name: string;
    icon?: string;
  };
  message?: string;
  timestamp?: string;
  createdAt?: string;
}

interface LiveStats {
  total?: number;
  activeUsers?: number;
  byMuscle?: Record<string, number>;
  byCountry?: Record<string, number>;
}

interface TrendingExercise {
  exerciseId: string;
  name: string;
  count: number;
}

interface UseLiveActivityOptions {
  timeWindow?: string;
  autoConnect?: boolean;
}

export function useLiveActivity(options: UseLiveActivityOptions = {}) {
  const {
    timeWindow = '1h',
    autoConnect = true,
  } = options;

  const [stats, setStats] = useState<LiveStats | null>(null);
  const [_mapData, _setMapData] = useState<unknown[]>([]);
  const [localFeed, setLocalFeed] = useState<FeedItem[]>([]);
  const [_trending, _setTrending] = useState<TrendingExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [_error, _setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // GraphQL queries
  const { data: feedData, refetch: refetchFeed } = useQuery<{ communityFeed: FeedItem[] }>(
    COMMUNITY_FEED_QUERY,
    {
      variables: { limit: 50 },
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: publicStatsData, refetch: refetchStats } = useQuery<{
    publicCommunityStats: {
      activeNow: { value: number };
      totalWorkouts: { value: number };
    };
  }>(PUBLIC_COMMUNITY_STATS_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  });

  // Derive feed from GraphQL data + local WebSocket updates
  const feed = useMemo(() => {
    const graphqlFeed = feedData?.communityFeed || [];
    // Merge local feed (from WebSocket) with GraphQL feed
    const combined = [...localFeed, ...graphqlFeed];
    // Dedupe by id
    const seen = new Set<string>();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 100);
  }, [feedData, localFeed]);

  // Derive stats from public stats
  useEffect(() => {
    if (publicStatsData?.publicCommunityStats) {
      setStats(prev => ({
        ...prev,
        total: publicStatsData.publicCommunityStats.totalWorkouts?.value || 0,
        activeUsers: publicStatsData.publicCommunityStats.activeNow?.value || 0,
      }));
    }
  }, [publicStatsData]);

  // Fetch all data using GraphQL refetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refetchFeed(),
      refetchStats(),
    ]);
    setLoading(false);
  }, [refetchFeed, refetchStats]);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    fetchAllData();
    pollIntervalRef.current = setInterval(fetchAllData, POLL_INTERVAL);
  }, [fetchAllData]);

  // Connect to WebSocket for real-time updates
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

          // Real-time activity event - add to local feed
          if (message.type && message.id) {
            setLocalFeed((prev) => [message, ...prev].slice(0, 50));

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

  // Format relative time
  const formatRelativeTime = useCallback((timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
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
    mapData: _mapData,
    feed,
    trending: _trending,
    activityByMuscle,
    activityByCountry,

    // State
    loading,
    connected,
    error: _error,
    timeWindow,

    // Actions
    refresh: fetchAllData,
    refreshStats: () => refetchStats(),
    refreshMap: () => Promise.resolve(), // Map data not in GraphQL yet
    refreshFeed: () => refetchFeed(),
    refreshTrending: () => Promise.resolve(), // Trending not in GraphQL yet

    // Helpers
    formatRelativeTime,
    timeWindows: TIME_WINDOWS,
  };
}

export default useLiveActivity;
