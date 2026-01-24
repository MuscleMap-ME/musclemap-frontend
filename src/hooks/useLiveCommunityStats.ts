/**
 * useLiveCommunityStats Hook
 *
 * Fetches public community stats for landing page with WebSocket real-time updates.
 * No authentication required - designed for anonymous visitors.
 *
 * Uses GraphQL for initial data fetch, with WebSocket fallback for real-time updates.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { PUBLIC_COMMUNITY_STATS_QUERY } from '../graphql';

const WS_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_DELAY = 3000;
const POLL_INTERVAL = 60000; // 60s fallback polling

// Types
interface StatValue {
  value: number;
  display: string;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

interface Milestone {
  type: string;
  value: number;
  reached: boolean;
}

interface PublicCommunityStats {
  activeNow: StatValue;
  activeWorkouts: StatValue;
  totalUsers: StatValue;
  totalWorkouts: StatValue;
  recentActivity: RecentActivity[];
  milestone: Milestone | null;
}

export function useLiveCommunityStats() {
  const [localActivity, setLocalActivity] = useState<RecentActivity[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // GraphQL query for public community stats
  const { data, loading, error, refetch } = useQuery<{
    publicCommunityStats: PublicCommunityStats;
  }>(PUBLIC_COMMUNITY_STATS_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: connected ? 0 : POLL_INTERVAL, // Only poll when WebSocket disconnected
  });

  // Derive stats from GraphQL data
  const stats = useMemo(() => {
    if (!data?.publicCommunityStats) return null;
    const d = data.publicCommunityStats;
    return {
      activeNow: d.activeNow,
      activeWorkouts: d.activeWorkouts,
      totalUsers: d.totalUsers,
      totalWorkouts: d.totalWorkouts,
    };
  }, [data]);

  // Merge GraphQL activity with local WebSocket activity
  const activity = useMemo(() => {
    const graphqlActivity = data?.publicCommunityStats?.recentActivity || [];
    const combined = [...localActivity, ...graphqlActivity];
    // Dedupe by id
    const seen = new Set<string>();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 20);
  }, [data, localActivity]);

  // Derive milestone from GraphQL data
  const milestone = useMemo(() => {
    return data?.publicCommunityStats?.milestone || null;
  }, [data]);

  // Format stat display (handles threshold logic from server)
  const formatStat = useCallback((stat: StatValue | null | undefined) => {
    if (!stat) return '—';
    return stat.display || stat.value?.toString() || '—';
  }, []);

  // Fetch stats via GraphQL refetch
  const fetchStats = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    fetchStats();
    pollIntervalRef.current = setInterval(fetchStats, POLL_INTERVAL);
  }, [fetchStats]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Clear any existing heartbeat before creating new connection
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

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
            // Refetch GraphQL data for snapshot/update
            refetch();
          } else if (message.type === 'activity') {
            // Real-time activity event - add to local state
            setLocalActivity((prev) => [message.data, ...prev].slice(0, 20));
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
  }, [startPolling, refetch]);

  // Initial WebSocket connection
  useEffect(() => {
    // Try to connect WebSocket for real-time updates
    connectWebSocket();

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
  }, [connectWebSocket]);

  return {
    stats,
    activity,
    milestone,
    loading,
    connected,
    error: error?.message || null,
    formatStat,
    refresh: fetchStats,
  };
}

export default useLiveCommunityStats;
