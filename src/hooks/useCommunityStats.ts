/**
 * useCommunityStats Hook
 *
 * Fetches and manages community statistics data using GraphQL.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  PUBLIC_COMMUNITY_STATS_QUERY,
  COMMUNITY_STATS_QUERY,
} from '../graphql';

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

interface CommunityStats {
  activeUsers: number;
  activeWorkouts: number;
  totalWorkoutsToday: number;
  totalWorkoutsWeek: number;
  topArchetype: string | null;
}

interface UseCommunityStatsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useCommunityStats(options: UseCommunityStatsOptions = {}) {
  const { autoFetch = true, refreshInterval = 60000 } = options;

  // GraphQL queries
  const {
    data: publicStatsData,
    loading: publicLoading,
    error: publicError,
    refetch: refetchPublic,
  } = useQuery<{ publicCommunityStats: PublicCommunityStats }>(PUBLIC_COMMUNITY_STATS_QUERY, {
    skip: !autoFetch,
    fetchPolicy: 'cache-and-network',
    pollInterval: refreshInterval,
  });

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<{ communityStats: CommunityStats }>(COMMUNITY_STATS_QUERY, {
    skip: !autoFetch,
    fetchPolicy: 'cache-and-network',
  });

  // Extract data
  const publicStats = useMemo(() => publicStatsData?.publicCommunityStats || null, [publicStatsData]);
  const communityStats = useMemo(() => statsData?.communityStats || null, [statsData]);

  // Derive summary from public stats
  const summary = useMemo(() => {
    if (!publicStats) return null;
    return {
      activeNow: publicStats.activeNow?.value || 0,
      activeWorkouts: publicStats.activeWorkouts?.value || 0,
      totalUsers: publicStats.totalUsers?.value || 0,
      totalWorkouts: publicStats.totalWorkouts?.value || 0,
    };
  }, [publicStats]);

  // Derive nowStats from public stats
  const nowStats = useMemo(() => {
    if (!publicStats) return null;
    return {
      activeNow: publicStats.activeNow?.value || 0,
      activeWorkouts: publicStats.activeWorkouts?.value || 0,
      recentActivity: publicStats.recentActivity || [],
      milestone: publicStats.milestone,
    };
  }, [publicStats]);

  const loading = publicLoading || statsLoading;
  const error = publicError || statsError || null;

  // Fetch functions for compatibility
  const fetchSummary = useCallback(async () => {
    await refetchPublic();
    return summary;
  }, [refetchPublic, summary]);

  const fetchArchetypes = useCallback(async () => {
    // Using community stats for top archetype
    await refetchStats();
    return communityStats?.topArchetype ? [{ id: communityStats.topArchetype, count: 0 }] : [];
  }, [refetchStats, communityStats]);

  const fetchExercises = useCallback(async () => {
    // Not implemented in GraphQL yet - return empty
    return [];
  }, []);

  const fetchFunnel = useCallback(async () => {
    // Not implemented in GraphQL yet - return null
    return null;
  }, []);

  const fetchCredits = useCallback(async () => {
    // Not implemented in GraphQL yet - return null
    return null;
  }, []);

  const fetchGeographic = useCallback(async () => {
    // Not implemented in GraphQL yet - return null
    return null;
  }, []);

  const fetchNowStats = useCallback(async () => {
    await refetchPublic();
    return nowStats;
  }, [refetchPublic, nowStats]);

  const fetchAll = useCallback(async () => {
    await Promise.all([refetchPublic(), refetchStats()]);
  }, [refetchPublic, refetchStats]);

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  return {
    loading,
    error,
    summary,
    archetypes: communityStats?.topArchetype ? [{ id: communityStats.topArchetype }] : null,
    exercises: null,
    funnel: null,
    credits: null,
    geographic: null,
    nowStats,
    fetchSummary,
    fetchArchetypes,
    fetchExercises,
    fetchFunnel,
    fetchCredits,
    fetchGeographic,
    fetchNowStats,
    fetchAll,
    refresh,
  };
}

export default useCommunityStats;
