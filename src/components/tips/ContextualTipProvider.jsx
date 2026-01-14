/**
 * ContextualTipProvider
 *
 * Context provider for managing contextual tips throughout the app.
 * Handles tip visibility, dismissal persistence, and trigger conditions.
 *
 * Features:
 * - Centralized tip state management
 * - localStorage persistence for dismissed tips
 * - Trigger-based tip activation
 * - Queue management for multiple tips
 *
 * @example
 * // Wrap your app with the provider
 * <ContextualTipProvider>
 *   <App />
 * </ContextualTipProvider>
 *
 * // Use the hook to show tips
 * const { showTip, dismissTip } = useContextualTips();
 * showTip('workout_complete');
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  getTipsByTrigger,
  getPrimaryTipForTrigger,
  getTipById,
  TIP_TRIGGERS,
} from './tipDefinitions';

// LocalStorage key for dismissed tips
const DISMISSED_TIPS_KEY = 'musclemap_dismissed_tips';
const TIP_COOLDOWN_KEY = 'musclemap_tip_cooldowns';

// Default cooldown period (24 hours in ms)
const DEFAULT_COOLDOWN = 24 * 60 * 60 * 1000;

/**
 * Get dismissed tips from localStorage
 * @returns {Set<string>} Set of dismissed tip ids
 */
function getDismissedTips() {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(DISMISSED_TIPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Save dismissed tips to localStorage
 * @param {Set<string>} tips - Set of tip ids to save
 */
function saveDismissedTips(tips) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify([...tips]));
  } catch {
    // localStorage not available
  }
}

/**
 * Get tip cooldowns from localStorage
 * @returns {Object} Map of tip id to last shown timestamp
 */
function getTipCooldowns() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(TIP_COOLDOWN_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save tip cooldowns to localStorage
 * @param {Object} cooldowns - Map of tip id to timestamp
 */
function saveTipCooldowns(cooldowns) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIP_COOLDOWN_KEY, JSON.stringify(cooldowns));
  } catch {
    // localStorage not available
  }
}

// Create context
const ContextualTipContext = createContext(null);

/**
 * ContextualTipProvider Component
 */
export function ContextualTipProvider({ children }) {
  // Currently visible tips (queue)
  const [visibleTips, setVisibleTips] = useState([]);

  // Dismissed tips (persisted)
  const [dismissedTips, setDismissedTips] = useState(getDismissedTips);

  // Tip cooldowns
  const [cooldowns, setCooldowns] = useState(getTipCooldowns);

  // Active tip (first in queue)
  const activeTip = visibleTips.length > 0 ? visibleTips[0] : null;

  /**
   * Check if a tip is on cooldown
   * @param {string} tipId - The tip id
   * @param {number} cooldownMs - Cooldown period in ms
   * @returns {boolean} True if on cooldown
   */
  const isOnCooldown = useCallback(
    (tipId, cooldownMs = DEFAULT_COOLDOWN) => {
      const lastShown = cooldowns[tipId];
      if (!lastShown) return false;
      return Date.now() - lastShown < cooldownMs;
    },
    [cooldowns]
  );

  /**
   * Check if a tip should be shown
   * @param {string} tipId - The tip id
   * @returns {boolean} True if tip can be shown
   */
  const canShowTip = useCallback(
    (tipId) => {
      // Check if permanently dismissed
      if (dismissedTips.has(tipId)) return false;
      // Check if on cooldown
      if (isOnCooldown(tipId)) return false;
      // Check if already in queue
      if (visibleTips.some((t) => t.id === tipId)) return false;
      return true;
    },
    [dismissedTips, isOnCooldown, visibleTips]
  );

  /**
   * Show a tip by trigger
   * @param {string} trigger - The trigger type
   * @param {Object} options - Additional options
   * @returns {string|null} The id of the shown tip or null
   */
  const showTip = useCallback(
    (trigger, options = {}) => {
      const { data = {}, forceShow = false } = options;

      // Get the primary tip for this trigger
      const tip = getPrimaryTipForTrigger(trigger);
      if (!tip) return null;

      // Check if we can show it
      if (!forceShow && !canShowTip(tip.id)) return null;

      // Add to visible tips queue
      const tipInstance = {
        ...tip,
        instanceId: `${tip.id}-${Date.now()}`,
        data,
        shownAt: Date.now(),
      };

      setVisibleTips((prev) => [...prev, tipInstance]);

      // Update cooldown
      setCooldowns((prev) => {
        const updated = { ...prev, [tip.id]: Date.now() };
        saveTipCooldowns(updated);
        return updated;
      });

      return tip.id;
    },
    [canShowTip]
  );

  /**
   * Show a specific tip by id
   * @param {string} tipId - The tip id
   * @param {Object} options - Additional options
   * @returns {boolean} True if tip was shown
   */
  const showTipById = useCallback(
    (tipId, options = {}) => {
      const { data = {}, forceShow = false } = options;

      const tip = getTipById(tipId);
      if (!tip) return false;

      if (!forceShow && !canShowTip(tip.id)) return false;

      const tipInstance = {
        ...tip,
        instanceId: `${tip.id}-${Date.now()}`,
        data,
        shownAt: Date.now(),
      };

      setVisibleTips((prev) => [...prev, tipInstance]);

      setCooldowns((prev) => {
        const updated = { ...prev, [tip.id]: Date.now() };
        saveTipCooldowns(updated);
        return updated;
      });

      return true;
    },
    [canShowTip]
  );

  /**
   * Dismiss the current active tip
   * @param {boolean} permanent - Whether to permanently dismiss
   */
  const dismissTip = useCallback(
    (permanent = false) => {
      if (!activeTip) return;

      // Remove from queue
      setVisibleTips((prev) => prev.slice(1));

      // If permanent, add to dismissed set
      if (permanent) {
        setDismissedTips((prev) => {
          const updated = new Set(prev);
          updated.add(activeTip.id);
          saveDismissedTips(updated);
          return updated;
        });
      }
    },
    [activeTip]
  );

  /**
   * Dismiss a specific tip by instance id
   * @param {string} instanceId - The tip instance id
   * @param {boolean} permanent - Whether to permanently dismiss
   */
  const dismissTipById = useCallback(
    (instanceId, permanent = false) => {
      const tip = visibleTips.find((t) => t.instanceId === instanceId);
      if (!tip) return;

      setVisibleTips((prev) => prev.filter((t) => t.instanceId !== instanceId));

      if (permanent) {
        setDismissedTips((prev) => {
          const updated = new Set(prev);
          updated.add(tip.id);
          saveDismissedTips(updated);
          return updated;
        });
      }
    },
    [visibleTips]
  );

  /**
   * Clear all visible tips
   */
  const clearAllTips = useCallback(() => {
    setVisibleTips([]);
  }, []);

  /**
   * Reset dismissed tips (for testing or settings)
   */
  const resetDismissedTips = useCallback(() => {
    setDismissedTips(new Set());
    saveDismissedTips(new Set());
    setCooldowns({});
    saveTipCooldowns({});
  }, []);

  /**
   * Check if a specific tip has been dismissed
   * @param {string} tipId - The tip id
   * @returns {boolean} True if dismissed
   */
  const isTipDismissed = useCallback(
    (tipId) => {
      return dismissedTips.has(tipId);
    },
    [dismissedTips]
  );

  // Memoized context value
  const value = useMemo(
    () => ({
      // State
      activeTip,
      visibleTips,
      hasTips: visibleTips.length > 0,

      // Actions
      showTip,
      showTipById,
      dismissTip,
      dismissTipById,
      clearAllTips,
      resetDismissedTips,

      // Utilities
      canShowTip,
      isTipDismissed,
      isOnCooldown,

      // Constants
      triggers: TIP_TRIGGERS,
    }),
    [
      activeTip,
      visibleTips,
      showTip,
      showTipById,
      dismissTip,
      dismissTipById,
      clearAllTips,
      resetDismissedTips,
      canShowTip,
      isTipDismissed,
      isOnCooldown,
    ]
  );

  return (
    <ContextualTipContext.Provider value={value}>
      {children}
    </ContextualTipContext.Provider>
  );
}

/**
 * Hook to access contextual tips context
 * @returns {Object} The context value
 */
export function useContextualTips() {
  const context = useContext(ContextualTipContext);

  if (!context) {
    throw new Error(
      'useContextualTips must be used within a ContextualTipProvider'
    );
  }

  return context;
}

/**
 * Hook to show a tip when a condition is met
 * @param {string} trigger - The trigger type
 * @param {boolean} condition - Whether to show the tip
 * @param {Object} options - Additional options
 */
export function useTipOnCondition(trigger, condition, options = {}) {
  const { showTip, canShowTip } = useContextualTips();
  const { delay = 0, data = {} } = options;

  useEffect(() => {
    if (!condition) return;

    // Check if we can show the tip before setting timeout
    const tipDef = getPrimaryTipForTrigger(trigger);
    if (!tipDef || !canShowTip(tipDef.id)) return;

    const timer = setTimeout(() => {
      showTip(trigger, { data });
    }, delay);

    return () => clearTimeout(timer);
  }, [condition, trigger, delay, data, showTip, canShowTip]);
}

export default ContextualTipProvider;
