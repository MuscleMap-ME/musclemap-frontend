/**
 * useLootDrop Hook
 *
 * Manages loot drop state, generation, and reveal sequence for workout rewards.
 * Provides functions to generate, reveal, and claim loot items.
 *
 * @module useLootDrop
 *
 * @example
 * const {
 *   generateLoot,
 *   pendingLoot,
 *   revealNext,
 *   claimAll,
 *   isRevealing,
 *   showLootDrop,
 *   closeLootDrop,
 *   isOpen,
 *   currentLootDrop,
 *   revealedItems,
 *   currentItemIndex,
 * } = useLootDrop();
 *
 * // Generate loot after workout
 * const loot = generateLoot({
 *   totalSets: 20,
 *   totalVolume: 5000,
 *   duration: 45,
 *   streak: 7,
 * });
 *
 * // Show the loot UI
 * showLootDrop(loot);
 *
 * // Manually reveal next item (or auto-reveal on chest open)
 * revealNext();
 *
 * // Claim all revealed items
 * claimAll();
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  generateLootDrop,
  determineChestType,
} from './lootDefinitions';

// ============================================
// LOOT DROP STATE
// ============================================

/**
 * Loot drop states
 */
export const LOOT_DROP_STATES = {
  HIDDEN: 'hidden',
  SHOWING: 'showing',
  CHEST_CLOSED: 'chest_closed',
  CHEST_OPENING: 'chest_opening',
  CHEST_OPEN: 'chest_open',
  REVEALING: 'revealing',
  ALL_REVEALED: 'all_revealed',
  CLAIMING: 'claiming',
  CLAIMED: 'claimed',
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useLootDrop() {
  // Core state
  const [isOpen, setIsOpen] = useState(false);
  const [currentLootDrop, setCurrentLootDrop] = useState(null);
  const [revealedItems, setRevealedItems] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  const [dropState, setDropState] = useState(LOOT_DROP_STATES.HIDDEN);

  // Pending loot queue (for multiple drops)
  const [pendingLoot, setPendingLoot] = useState([]);

  // Callbacks refs for external handling
  const onClaimRef = useRef(null);
  const onCloseRef = useRef(null);

  // Animation timing ref
  const revealTimerRef = useRef(null);

  // ============================================
  // DERIVED STATE
  // ============================================

  /**
   * Whether currently in reveal sequence
   */
  const isRevealing = useMemo(
    () =>
      dropState === LOOT_DROP_STATES.REVEALING ||
      dropState === LOOT_DROP_STATES.CHEST_OPENING,
    [dropState]
  );

  /**
   * Whether all items have been revealed
   */
  const allRevealed = useMemo(
    () =>
      currentLootDrop &&
      revealedItems.length >= currentLootDrop.items.length,
    [currentLootDrop, revealedItems]
  );

  /**
   * Current item being revealed
   */
  const currentItem = useMemo(
    () =>
      currentLootDrop && currentItemIndex >= 0
        ? currentLootDrop.items[currentItemIndex]
        : null,
    [currentLootDrop, currentItemIndex]
  );

  /**
   * Overall rarity of the loot drop
   */
  const dropRarity = useMemo(
    () => currentLootDrop?.rarity || 'common',
    [currentLootDrop]
  );

  // ============================================
  // GENERATION FUNCTIONS
  // ============================================

  /**
   * Generate loot based on workout metrics
   * @param {Object} workoutMetrics - Workout performance metrics
   * @returns {Object} Generated loot drop
   */
  const generateLoot = useCallback((workoutMetrics = {}) => {
    const { totalSets = 0, totalVolume = 0, duration = 0, streak = 0 } = workoutMetrics;

    // Calculate workout quality score (0-100)
    let quality = 0;
    quality += Math.min(totalSets * 3, 30);       // Up to 30 for sets
    quality += Math.min(totalVolume / 200, 30);   // Up to 30 for volume
    quality += Math.min(duration, 30);            // Up to 30 for duration
    quality += Math.min(streak, 10);              // Up to 10 for streak
    quality = Math.min(Math.round(quality), 100);

    // Determine chest type
    const chestType = determineChestType(workoutMetrics);

    // Generate loot drop
    const loot = generateLootDrop({
      workoutQuality: quality,
      currentStreak: streak,
      chestType,
    });

    // Add to pending queue
    setPendingLoot((prev) => [...prev, loot]);

    return loot;
  }, []);

  /**
   * Generate loot with specific rarity guarantee
   * @param {string} minRarity - Minimum guaranteed rarity
   * @returns {Object} Generated loot drop
   */
  const generateGuaranteedLoot = useCallback((minRarity = 'rare') => {
    const chestTypeMap = {
      common: 'BRONZE',
      rare: 'SILVER',
      epic: 'GOLD',
      legendary: 'DIAMOND',
    };

    const loot = generateLootDrop({
      workoutQuality: 75,
      currentStreak: 7,
      chestType: chestTypeMap[minRarity] || 'SILVER',
    });

    setPendingLoot((prev) => [...prev, loot]);
    return loot;
  }, []);

  // ============================================
  // UI CONTROL FUNCTIONS
  // ============================================

  /**
   * Show the loot drop UI with a specific loot drop
   * @param {Object} lootDrop - Loot drop to display
   * @param {Object} options - Display options
   * @param {Function} options.onClaim - Callback when items are claimed
   * @param {Function} options.onClose - Callback when UI is closed
   */
  const showLootDrop = useCallback((lootDrop, options = {}) => {
    const { onClaim, onClose } = options;

    // Store callbacks
    onClaimRef.current = onClaim;
    onCloseRef.current = onClose;

    // Set up the loot drop
    setCurrentLootDrop(lootDrop);
    setRevealedItems([]);
    setCurrentItemIndex(-1);
    setDropState(LOOT_DROP_STATES.CHEST_CLOSED);
    setIsOpen(true);

    // Remove from pending queue if present
    setPendingLoot((prev) => prev.filter((drop) => drop.id !== lootDrop.id));
  }, []);

  /**
   * Show next pending loot drop
   */
  const showNextPending = useCallback(() => {
    if (pendingLoot.length > 0) {
      showLootDrop(pendingLoot[0]);
    }
  }, [pendingLoot, showLootDrop]);

  /**
   * Close the loot drop UI
   */
  const closeLootDrop = useCallback(() => {
    // Clear any pending timers
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    setIsOpen(false);
    setDropState(LOOT_DROP_STATES.HIDDEN);

    // Call onClose callback
    onCloseRef.current?.();

    // Reset state after animation
    setTimeout(() => {
      setCurrentLootDrop(null);
      setRevealedItems([]);
      setCurrentItemIndex(-1);
    }, 300);
  }, []);

  // ============================================
  // REVEAL FUNCTIONS
  // ============================================

  /**
   * Start chest opening sequence
   */
  const openChest = useCallback(() => {
    if (dropState !== LOOT_DROP_STATES.CHEST_CLOSED) return;

    setDropState(LOOT_DROP_STATES.CHEST_OPENING);

    // After chest open animation, start revealing items
    revealTimerRef.current = setTimeout(() => {
      setDropState(LOOT_DROP_STATES.CHEST_OPEN);

      // Brief delay then start revealing
      revealTimerRef.current = setTimeout(() => {
        setDropState(LOOT_DROP_STATES.REVEALING);
        setCurrentItemIndex(0);
      }, 500);
    }, 1000);
  }, [dropState]);

  /**
   * Reveal the next item in sequence
   */
  const revealNext = useCallback(() => {
    if (!currentLootDrop) return;

    const nextIndex = currentItemIndex + 1;

    if (nextIndex < currentLootDrop.items.length) {
      // Add current item to revealed (if not already)
      if (currentItemIndex >= 0 && !revealedItems.includes(currentLootDrop.items[currentItemIndex])) {
        setRevealedItems((prev) => [...prev, currentLootDrop.items[currentItemIndex]]);
      }

      setCurrentItemIndex(nextIndex);
    } else {
      // All items revealed
      if (currentItemIndex >= 0 && currentItemIndex < currentLootDrop.items.length) {
        setRevealedItems((prev) => [...prev, currentLootDrop.items[currentItemIndex]]);
      }
      setDropState(LOOT_DROP_STATES.ALL_REVEALED);
      setCurrentItemIndex(-1);
    }
  }, [currentLootDrop, currentItemIndex, revealedItems]);

  /**
   * Reveal all remaining items instantly
   */
  const revealAll = useCallback(() => {
    if (!currentLootDrop) return;

    setRevealedItems([...currentLootDrop.items]);
    setCurrentItemIndex(-1);
    setDropState(LOOT_DROP_STATES.ALL_REVEALED);
  }, [currentLootDrop]);

  /**
   * Mark current item as revealed and prepare next
   */
  const completeCurrentReveal = useCallback(() => {
    if (!currentLootDrop || currentItemIndex < 0) return;

    const currentRevealItem = currentLootDrop.items[currentItemIndex];
    if (!revealedItems.find((item) => item.id === currentRevealItem.id)) {
      setRevealedItems((prev) => [...prev, currentRevealItem]);
    }

    // Check if more items to reveal
    const nextIndex = currentItemIndex + 1;
    if (nextIndex < currentLootDrop.items.length) {
      // Auto-reveal next after short delay
      revealTimerRef.current = setTimeout(() => {
        setCurrentItemIndex(nextIndex);
      }, 800);
    } else {
      // All revealed
      setDropState(LOOT_DROP_STATES.ALL_REVEALED);
      setCurrentItemIndex(-1);
    }
  }, [currentLootDrop, currentItemIndex, revealedItems]);

  // ============================================
  // CLAIM FUNCTIONS
  // ============================================

  /**
   * Claim all revealed items
   */
  const claimAll = useCallback(() => {
    if (!currentLootDrop || revealedItems.length === 0) return;

    setDropState(LOOT_DROP_STATES.CLAIMING);

    // Call onClaim callback with claimed items
    onClaimRef.current?.(revealedItems);

    // Close after brief delay for animation
    revealTimerRef.current = setTimeout(() => {
      setDropState(LOOT_DROP_STATES.CLAIMED);

      // Close UI after claim animation
      setTimeout(() => {
        closeLootDrop();
      }, 500);
    }, 600);
  }, [currentLootDrop, revealedItems, closeLootDrop]);

  /**
   * Skip to claim (reveal all then claim)
   */
  const skipToClaim = useCallback(() => {
    if (!currentLootDrop) return;

    // Reveal all items
    setRevealedItems([...currentLootDrop.items]);
    setCurrentItemIndex(-1);
    setDropState(LOOT_DROP_STATES.ALL_REVEALED);
  }, [currentLootDrop]);

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Clear all pending loot
   */
  const clearPending = useCallback(() => {
    setPendingLoot([]);
  }, []);

  // ============================================
  // RETURN VALUE
  // ============================================

  return {
    // State
    isOpen,
    currentLootDrop,
    revealedItems,
    currentItemIndex,
    currentItem,
    dropState,
    dropRarity,
    pendingLoot,

    // Derived state
    isRevealing,
    allRevealed,
    hasPending: pendingLoot.length > 0,
    pendingCount: pendingLoot.length,

    // Generation
    generateLoot,
    generateGuaranteedLoot,

    // UI Control
    showLootDrop,
    showNextPending,
    closeLootDrop,

    // Chest
    openChest,

    // Reveal
    revealNext,
    revealAll,
    completeCurrentReveal,

    // Claim
    claimAll,
    skipToClaim,

    // Utilities
    clearPending,
    LOOT_DROP_STATES,
  };
}

export default useLootDrop;
