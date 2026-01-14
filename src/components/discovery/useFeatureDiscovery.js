/**
 * useFeatureDiscovery Hook
 *
 * Tracks which features users have visited and which they've dismissed.
 * Integrates with React Router to auto-mark features as used when
 * the user navigates to them.
 *
 * @example
 * const { unusedFeatures, dismiss, markUsed, getUnusedFeatures } = useFeatureDiscovery();
 *
 * // Check if user has explored feature
 * const hasTriedCrews = !unusedFeatures.find(f => f.id === 'crews');
 *
 * // Manually mark a feature as used
 * markUsed('crews');
 *
 * // Dismiss a feature (hide forever)
 * dismiss('martial_arts');
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DISCOVERABLE_FEATURES, sortByPriority } from './featureDefinitions';

/**
 * localStorage keys for feature tracking
 */
const STORAGE_KEYS = {
  USED: 'musclemap_used_features',
  DISMISSED: 'musclemap_dismissed_features',
};

/**
 * Get stored array from localStorage
 */
function getStoredArray(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save array to localStorage
 */
function saveStoredArray(key, array) {
  try {
    localStorage.setItem(key, JSON.stringify(array));
  } catch (e) {
    console.warn(`Failed to save to ${key}:`, e);
  }
}

/**
 * useFeatureDiscovery Hook
 *
 * Tracks feature usage and provides methods to manage discovery state.
 * Automatically marks features as used when user navigates to their routes.
 *
 * @param {Object} options
 * @param {Array} options.features - Custom features array (defaults to DISCOVERABLE_FEATURES)
 * @param {boolean} options.autoTrackRoutes - Auto-mark features when navigating (default true)
 * @returns {Object} Discovery state and methods
 */
export function useFeatureDiscovery(options = {}) {
  const {
    features = DISCOVERABLE_FEATURES,
    autoTrackRoutes = true,
  } = options;

  const location = useLocation();

  // State for used and dismissed features
  const [usedFeatures, setUsedFeatures] = useState(() => getStoredArray(STORAGE_KEYS.USED));
  const [dismissedFeatures, setDismissedFeatures] = useState(() => getStoredArray(STORAGE_KEYS.DISMISSED));

  /**
   * Mark a feature as used (visited)
   */
  const markUsed = useCallback((featureId) => {
    setUsedFeatures((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      saveStoredArray(STORAGE_KEYS.USED, updated);
      return updated;
    });
  }, []);

  /**
   * Dismiss a feature (hide forever)
   */
  const dismiss = useCallback((featureId) => {
    setDismissedFeatures((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      saveStoredArray(STORAGE_KEYS.DISMISSED, updated);
      return updated;
    });
  }, []);

  /**
   * Undismiss a feature (show again)
   */
  const undismiss = useCallback((featureId) => {
    setDismissedFeatures((prev) => {
      const updated = prev.filter((id) => id !== featureId);
      saveStoredArray(STORAGE_KEYS.DISMISSED, updated);
      return updated;
    });
  }, []);

  /**
   * Clear all dismissed features
   */
  const clearDismissed = useCallback(() => {
    setDismissedFeatures([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.DISMISSED);
    } catch (e) {
      console.warn('Failed to clear dismissed features:', e);
    }
  }, []);

  /**
   * Reset all tracking (mark all as unused)
   */
  const resetAll = useCallback(() => {
    setUsedFeatures([]);
    setDismissedFeatures([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.USED);
      localStorage.removeItem(STORAGE_KEYS.DISMISSED);
    } catch (e) {
      console.warn('Failed to reset feature tracking:', e);
    }
  }, []);

  /**
   * Get unused features (not used and not dismissed)
   */
  const getUnusedFeatures = useCallback(
    (customFeatures = features) => {
      const filtered = customFeatures.filter(
        (f) => !usedFeatures.includes(f.id) && !dismissedFeatures.includes(f.id)
      );
      return sortByPriority(filtered);
    },
    [features, usedFeatures, dismissedFeatures]
  );

  /**
   * Check if there are any unused features
   */
  const hasUnusedFeatures = useCallback(
    (customFeatures = features) => {
      return getUnusedFeatures(customFeatures).length > 0;
    },
    [features, getUnusedFeatures]
  );

  /**
   * Check if a specific feature is used
   */
  const isFeatureUsed = useCallback(
    (featureId) => {
      return usedFeatures.includes(featureId);
    },
    [usedFeatures]
  );

  /**
   * Check if a specific feature is dismissed
   */
  const isFeatureDismissed = useCallback(
    (featureId) => {
      return dismissedFeatures.includes(featureId);
    },
    [dismissedFeatures]
  );

  // Computed list of unused features
  const unusedFeatures = useMemo(
    () => getUnusedFeatures(features),
    [features, getUnusedFeatures]
  );

  // Auto-track routes: mark feature as used when user navigates to its path
  useEffect(() => {
    if (!autoTrackRoutes) return;

    const currentPath = location.pathname;

    // Find if current path matches any feature's route
    const matchedFeature = features.find((feature) => {
      // Exact match
      if (feature.route === currentPath || feature.path === currentPath) {
        return true;
      }
      // Path starts with feature route (for nested routes)
      const featurePath = feature.route || feature.path;
      if (featurePath && currentPath.startsWith(featurePath + '/')) {
        return true;
      }
      return false;
    });

    if (matchedFeature && !usedFeatures.includes(matchedFeature.id)) {
      markUsed(matchedFeature.id);
    }
  }, [location.pathname, features, usedFeatures, markUsed, autoTrackRoutes]);

  return {
    // State
    usedFeatures,
    dismissedFeatures,
    unusedFeatures,

    // Actions
    markUsed,
    dismiss,
    undismiss,
    clearDismissed,
    resetAll,

    // Queries
    getUnusedFeatures,
    hasUnusedFeatures,
    isFeatureUsed,
    isFeatureDismissed,
  };
}

export default useFeatureDiscovery;
