/**
 * CompanionContext
 *
 * Provides state management for the user's personal companion creature.
 * Handles:
 * - Companion state (stage, XP, cosmetics, abilities)
 * - Upgrades and purchasing
 * - Event reactions
 * - Settings persistence
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

const CompanionContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

// Stage progression thresholds
const STAGE_NAMES = {
  1: 'Baby',
  2: 'Adolescent',
  3: 'Capable',
  4: 'Armored',
  5: 'Flying',
  6: 'Magnificent',
};

export function CompanionProvider({ children }) {
  const [state, setState] = useState(null);
  const [upgradesData, setUpgradesData] = useState({ balance: 0, upgrades: [] });
  const [events, setEvents] = useState([]);
  const [reaction, setReaction] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for reduced motion preference
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Auth headers
  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('musclemap_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Fetch companion state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mascot/companion/state`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch companion state:', err);
      setError(err);
    }
  }, [getHeaders]);

  // Fetch available upgrades
  const fetchUpgrades = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mascot/companion/upgrades`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUpgradesData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch upgrades:', err);
    }
  }, [getHeaders]);

  // Fetch recent events (for reactions)
  const fetchEvents = useCallback(async () => {
    if (!state?.is_visible) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/mascot/companion/events/recent?unreacted_only=true&limit=5`,
        { headers: getHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        const newEvents = data.data || [];

        if (newEvents.length > 0) {
          setEvents((prev) => [...newEvents, ...prev].slice(0, 20));

          // Show reaction for first unreacted event
          if (!reducedMotion) {
            showReaction(newEvents[0]);
          }

          // Mark events as reacted
          await fetch(`${API_BASE}/api/mascot/companion/events/mark-reacted`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ eventIds: newEvents.map((e) => e.id) }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getHeaders, state?.is_visible, reducedMotion]);

  // Show a reaction animation
  const showReaction = useCallback((event) => {
    setReaction(event);
    setTimeout(() => setReaction(null), 3500);
  }, []);

  // Update settings
  const updateSettings = useCallback(async (settings) => {
    try {
      await fetch(`${API_BASE}/api/mascot/companion/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(settings),
      });
      setState((prev) => ({ ...prev, ...settings }));
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  }, [getHeaders]);

  // Set nickname
  const setNickname = useCallback(async (nickname) => {
    try {
      const res = await fetch(`${API_BASE}/api/mascot/companion/nickname`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ nickname }),
      });

      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({ ...prev, nickname: data.data.nickname }));
        return { success: true };
      }

      const error = await res.json();
      return { success: false, error: error.error?.message };
    } catch (err) {
      console.error('Failed to set nickname:', err);
      return { success: false, error: err.message };
    }
  }, [getHeaders]);

  // Purchase upgrade
  const purchaseUpgrade = useCallback(async (upgradeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/mascot/companion/upgrades/${upgradeId}/purchase`, {
        method: 'POST',
        headers: getHeaders(),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchState();
        await fetchUpgrades();
        showReaction({ event_type: 'upgrade_purchased', event_data: data.data });
        return { success: true, upgrade: data.data.upgrade };
      }

      return { success: false, error: data.error?.message || 'Purchase failed' };
    } catch (err) {
      console.error('Failed to purchase upgrade:', err);
      return { success: false, error: err.message };
    }
  }, [getHeaders, fetchState, fetchUpgrades, showReaction]);

  // Equip cosmetic
  const equipCosmetic = useCallback(async (slot, upgradeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/mascot/companion/cosmetics/equip`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ slot, upgradeId }),
      });

      if (res.ok) {
        await fetchState();
        return { success: true };
      }

      const error = await res.json();
      return { success: false, error: error.error?.message };
    } catch (err) {
      console.error('Failed to equip cosmetic:', err);
      return { success: false, error: err.message };
    }
  }, [getHeaders, fetchState]);

  // Get next tip
  const getNextTip = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mascot/companion/tips/next`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        return data.data;
      }

      return { tip: null, reason: 'error' };
    } catch (err) {
      console.error('Failed to get tip:', err);
      return { tip: null, reason: 'error' };
    }
  }, [getHeaders]);

  // Refetch all data
  const refetch = useCallback(() => {
    return Promise.all([fetchState(), fetchUpgrades()]);
  }, [fetchState, fetchUpgrades]);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('musclemap_token');
    if (!token) {
      setLoading(false);
      return;
    }

    Promise.all([fetchState(), fetchUpgrades()])
      .finally(() => setLoading(false));
  }, [fetchState, fetchUpgrades]);

  // Poll for events periodically
  useEffect(() => {
    if (!state?.is_visible) return;

    // Initial fetch
    fetchEvents();

    // Poll every 30 seconds
    const interval = setInterval(fetchEvents, 30000);

    return () => clearInterval(interval);
  }, [state?.is_visible, fetchEvents]);

  // Computed values
  const stageName = state ? STAGE_NAMES[state.stage] || 'Unknown' : '';

  const value = useMemo(() => ({
    // State
    state,
    stageName,
    upgradesData,
    events,
    reaction,
    panelOpen,
    loading,
    error,
    reducedMotion,

    // Actions
    setPanelOpen,
    updateSettings,
    setNickname,
    purchaseUpgrade,
    equipCosmetic,
    showReaction,
    getNextTip,
    refetch,
  }), [
    state,
    stageName,
    upgradesData,
    events,
    reaction,
    panelOpen,
    loading,
    error,
    reducedMotion,
    updateSettings,
    setNickname,
    purchaseUpgrade,
    equipCosmetic,
    showReaction,
    getNextTip,
    refetch,
  ]);

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion() {
  const context = useContext(CompanionContext);
  if (!context) {
    throw new Error('useCompanion must be used within a CompanionProvider');
  }
  return context;
}

export default CompanionContext;
