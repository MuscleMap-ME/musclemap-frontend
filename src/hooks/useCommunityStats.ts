/**
 * useCommunityStats Hook
 *
 * Fetches and manages community statistics data.
 */

import { useState, useEffect, useCallback } from 'react';
// authFetch available for future expansion
// import { authFetch } from '../utils/auth';

const CACHE_TTL = 60000; // 1 minute cache
const statsCache = new Map();

export function useCommunityStats(options = {}) {
  const { autoFetch = true, refreshInterval = 60000 } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [archetypes, setArchetypes] = useState(null);
  const [exercises, setExercises] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [credits, setCredits] = useState(null);
  const [geographic, setGeographic] = useState(null);
  const [nowStats, setNowStats] = useState(null);

  const fetchWithCache = useCallback(async (key, url, setter) => {
    const cached = statsCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setter(cached.data);
      return cached.data;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${key}`);
      const json = await res.json();
      const data = json.data;

      statsCache.set(key, { data, ts: Date.now() });
      setter(data);
      return data;
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      throw err;
    }
  }, []);

  const fetchSummary = useCallback(
    (window = '24h') =>
      fetchWithCache(
        `summary:${window}`,
        `/api/community/stats/summary?window=${window}`,
        setSummary
      ),
    [fetchWithCache]
  );

  const fetchArchetypes = useCallback(
    () =>
      fetchWithCache('archetypes', '/api/community/stats/archetypes', setArchetypes),
    [fetchWithCache]
  );

  const fetchExercises = useCallback(
    (window = '7d', limit = 20) =>
      fetchWithCache(
        `exercises:${window}:${limit}`,
        `/api/community/stats/exercises?window=${window}&limit=${limit}`,
        setExercises
      ),
    [fetchWithCache]
  );

  const fetchFunnel = useCallback(
    () => fetchWithCache('funnel', '/api/community/stats/funnel', setFunnel),
    [fetchWithCache]
  );

  const fetchCredits = useCallback(
    () => fetchWithCache('credits', '/api/community/stats/credits', setCredits),
    [fetchWithCache]
  );

  const fetchGeographic = useCallback(
    () =>
      fetchWithCache('geographic', '/api/community/stats/geographic', setGeographic),
    [fetchWithCache]
  );

  const fetchNowStats = useCallback(async () => {
    try {
      const res = await fetch('/api/community/now');
      if (!res.ok) throw new Error('Failed to fetch now stats');
      const json = await res.json();
      setNowStats(json.data);
      return json.data;
    } catch (err) {
      console.error('Error fetching now stats:', err);
      throw err;
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchSummary(),
        fetchArchetypes(),
        fetchExercises(),
        fetchFunnel(),
        fetchCredits(),
        fetchGeographic(),
        fetchNowStats(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    fetchSummary,
    fetchArchetypes,
    fetchExercises,
    fetchFunnel,
    fetchCredits,
    fetchGeographic,
    fetchNowStats,
  ]);

  const refresh = useCallback(() => {
    // Clear cache
    statsCache.clear();
    return fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (autoFetch) {
      fetchAll();
    }
  }, [autoFetch, fetchAll]);

  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchNowStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchNowStats]);

  return {
    loading,
    error,
    summary,
    archetypes,
    exercises,
    funnel,
    credits,
    geographic,
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
