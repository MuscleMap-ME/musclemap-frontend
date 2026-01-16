/**
 * useFeatureDiscovery Hook
 *
 * Tracks which features users have discovered (tried) and which they've dismissed.
 * Integrates with React Router to auto-mark features as discovered when
 * the user navigates to them.
 *
 * @example Basic Usage
 * const {
 *   undiscoveredFeatures, // features user hasn't tried
 *   discoveredFeatures,   // features user has tried
 *   markDiscovered,       // mark a feature as discovered
 *   dismissFeature,       // hide a feature from suggestions
 *   resetDiscovery,       // reset all discovery state
 *   discoveryProgress     // { discovered: 5, total: 15, percent: 33 }
 * } = useFeatureDiscovery();
 *
 * @example Auto-tracking on page visit
 * useEffect(() => {
 *   markDiscovered('muscle-map');
 * }, []);
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DISCOVERABLE_FEATURES, sortByPriority } from './featureDefinitions';

/**
 * localStorage key for feature tracking
 */
const STORAGE_KEY = 'musclemap_discovered_features';
const DISMISSED_KEY = 'musclemap_dismissed_features';

/**
 * Get stored object from localStorage
 */
function getStoredData(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save data to localStorage
 */
function saveStoredData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save to ${key}:`, e);
  }
}

/**
 * useFeatureDiscovery Hook
 *
 * Tracks feature discovery state and provides methods to manage it.
 * Automatically marks features as discovered when user navigates to their routes.
 *
 * @param {Object} options
 * @param {Array} options.features - Custom features array (defaults to DISCOVERABLE_FEATURES)
 * @param {boolean} options.autoTrackRoutes - Auto-mark features when navigating (default true)
 * @returns {Object} Discovery state and methods
 */
export function useFeatureDiscovery(options = {}) {
  const { features = DISCOVERABLE_FEATURES, autoTrackRoutes = true } = options;

  const location = useLocation();

  // State for discovered and dismissed feature IDs
  const [discoveredIds, setDiscoveredIds] = useState(() => getStoredData(STORAGE_KEY));
  const [dismissedIds, setDismissedIds] = useState(() => getStoredData(DISMISSED_KEY));

  /**
   * Mark a feature as discovered (visited/tried)
   */
  const markDiscovered = useCallback((featureId) => {
    setDiscoveredIds((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      saveStoredData(STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  /**
   * Dismiss a feature (hide from suggestions forever)
   */
  const dismissFeature = useCallback((featureId) => {
    setDismissedIds((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      saveStoredData(DISMISSED_KEY, updated);
      return updated;
    });
  }, []);

  /**
   * Undismiss a feature (show again)
   */
  const undismissFeature = useCallback((featureId) => {
    setDismissedIds((prev) => {
      const updated = prev.filter((id) => id !== featureId);
      saveStoredData(DISMISSED_KEY, updated);
      return updated;
    });
  }, []);

  /**
   * Reset all discovery state (mark all as undiscovered)
   */
  const resetDiscovery = useCallback(() => {
    setDiscoveredIds([]);
    setDismissedIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DISMISSED_KEY);
    } catch (e) {
      console.warn('Failed to reset feature discovery:', e);
    }
  }, []);

  /**
   * Clear only dismissed features
   */
  const clearDismissed = useCallback(() => {
    setDismissedIds([]);
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch (e) {
      console.warn('Failed to clear dismissed features:', e);
    }
  }, []);

  // Computed: features user has discovered (tried)
  const discoveredFeatures = useMemo(() => {
    return features.filter((f) => discoveredIds.includes(f.id));
  }, [features, discoveredIds]);

  // Computed: features user hasn't tried yet (excluding dismissed)
  const undiscoveredFeatures = useMemo(() => {
    const filtered = features.filter(
      (f) => !discoveredIds.includes(f.id) && !dismissedIds.includes(f.id)
    );
    return sortByPriority(filtered);
  }, [features, discoveredIds, dismissedIds]);

  // Computed: discovery progress
  const discoveryProgress = useMemo(() => {
    const total = features.length;
    const discovered = discoveredIds.filter((id) => features.some((f) => f.id === id)).length;
    const percent = total > 0 ? Math.round((discovered / total) * 100) : 0;
    return { discovered, total, percent };
  }, [features, discoveredIds]);

  /**
   * Check if a specific feature is discovered
   */
  const isDiscovered = useCallback(
    (featureId) => {
      return discoveredIds.includes(featureId);
    },
    [discoveredIds]
  );

  /**
   * Check if a specific feature is dismissed
   */
  const isDismissed = useCallback(
    (featureId) => {
      return dismissedIds.includes(featureId);
    },
    [dismissedIds]
  );

  /**
   * Get undiscovered features filtered by categories
   */
  const getUndiscoveredByCategories = useCallback(
    (categories) => {
      return undiscoveredFeatures.filter((f) => categories.includes(f.category));
    },
    [undiscoveredFeatures]
  );

  /**
   * Get personalized recommendations based on what user has already discovered
   * Prioritizes: high priority features, new features, popular features
   * @param {number} count - Number of recommendations to return (default 3)
   * @returns {Array} Recommended features
   */
  const getRecommendations = useCallback(
    (count = 3) => {
      if (undiscoveredFeatures.length === 0) {
        return [];
      }

      // Score each feature based on multiple factors
      const scored = undiscoveredFeatures.map((feature) => {
        let score = feature.priority || 5;

        // Boost new features
        if (feature.isNew) {
          score += 3;
        }

        // Boost popular features
        if (feature.isPopular) {
          score += 2;
        }

        // Boost features in categories user has shown interest in
        const discoveredCategories = discoveredFeatures.map((f) => f.category);
        if (discoveredCategories.includes(feature.category)) {
          score += 1;
        }

        return { feature, score };
      });

      // Sort by score (highest first) and return top N
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map((s) => s.feature);
    },
    [undiscoveredFeatures, discoveredFeatures]
  );

  // Auto-track routes: mark feature as discovered when user navigates to its path
  useEffect(() => {
    if (!autoTrackRoutes) return;

    const currentPath = location.pathname;

    // Find if current path matches any feature's route
    const matchedFeature = features.find((feature) => {
      // Exact match
      if (feature.route === currentPath) {
        return true;
      }
      // Path starts with feature route (for nested routes)
      if (feature.route && currentPath.startsWith(feature.route + '/')) {
        return true;
      }
      return false;
    });

    if (matchedFeature && !discoveredIds.includes(matchedFeature.id)) {
      markDiscovered(matchedFeature.id);
    }
  }, [location.pathname, features, discoveredIds, markDiscovered, autoTrackRoutes]);

  return {
    // State - matches spec exactly
    undiscoveredFeatures, // features user hasn't tried
    discoveredFeatures, // features user has tried
    discoveryProgress, // { discovered: 5, total: 15, percent: 33 }

    // Actions - matches spec exactly
    markDiscovered, // mark a feature as discovered
    dismissFeature, // hide a feature from suggestions
    resetDiscovery, // reset all discovery state
    getRecommendations, // get personalized recommendations

    // Additional actions
    undismissFeature, // show a dismissed feature again
    clearDismissed, // clear all dismissed features

    // Query helpers
    isDiscovered,
    isDismissed,
    getUndiscoveredByCategories,

    // Raw IDs (for advanced use)
    discoveredIds,
    dismissedIds,
  };
}

export default useFeatureDiscovery;
