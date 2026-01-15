/**
 * Loot Tables
 *
 * Pre-configured loot drop tables for different scenarios.
 * Uses the base lootDefinitions for actual item generation.
 *
 * @module lootTables
 *
 * @example
 * import { LOOT_TABLES, getTableForContext, generateFromTable } from './lootTables';
 *
 * const table = getTableForContext({ isFirstWorkout: true });
 * const items = generateFromTable(table, 3);
 */

import {
  LOOT_TYPES,
  LOOT_POOLS,
  RARITY_ORDER,
  createLootInstance,
} from './lootDefinitions';

// ============================================
// LOOT TABLE DEFINITIONS
// ============================================

/**
 * Loot tables for different game contexts
 * Each table defines custom rarity weights and item pool restrictions
 */
export const LOOT_TABLES = {
  // First workout ever - generous loot
  FIRST_WORKOUT: {
    id: 'first_workout',
    name: 'Welcome Loot',
    description: 'Special rewards for your first workout',
    weights: {
      common: 30,
      rare: 45,
      epic: 20,
      legendary: 5,
    },
    guaranteedItems: ['XP_BONUS', 'CREDITS'], // At least one of these
    excludedItems: [], // No exclusions
    bonusMultiplier: 2, // Double the amounts
  },

  // Daily challenge completion
  DAILY_CHALLENGE: {
    id: 'daily_challenge',
    name: 'Challenge Chest',
    description: 'Rewards for completing daily challenges',
    weights: {
      common: 50,
      rare: 35,
      epic: 12,
      legendary: 3,
    },
    guaranteedItems: [],
    excludedItems: ['PREMIUM_EXERCISE'], // Too rare for daily
    bonusMultiplier: 1,
  },

  // Streak milestone (7, 14, 30, etc days)
  STREAK_MILESTONE: {
    id: 'streak_milestone',
    name: 'Streak Treasure',
    description: 'Rewards for maintaining your streak',
    weights: {
      common: 20,
      rare: 40,
      epic: 30,
      legendary: 10,
    },
    guaranteedItems: ['STREAK_SHIELD'],
    excludedItems: [],
    bonusMultiplier: 1.5,
  },

  // Personal record (PR) achievement
  PERSONAL_RECORD: {
    id: 'personal_record',
    name: 'PR Chest',
    description: 'Rewards for setting a personal record',
    weights: {
      common: 40,
      rare: 35,
      epic: 20,
      legendary: 5,
    },
    guaranteedItems: ['XP_BONUS'],
    excludedItems: [],
    bonusMultiplier: 1.25,
  },

  // Regular workout completion
  WORKOUT_COMPLETE: {
    id: 'workout_complete',
    name: 'Workout Loot',
    description: 'Standard post-workout rewards',
    weights: {
      common: 60,
      rare: 28,
      epic: 10,
      legendary: 2,
    },
    guaranteedItems: [],
    excludedItems: ['RARE_TITLE', 'PREMIUM_EXERCISE'],
    bonusMultiplier: 1,
  },

  // Weekly challenge completion
  WEEKLY_CHALLENGE: {
    id: 'weekly_challenge',
    name: 'Weekly Haul',
    description: 'Rewards for completing weekly objectives',
    weights: {
      common: 25,
      rare: 40,
      epic: 25,
      legendary: 10,
    },
    guaranteedItems: [],
    excludedItems: [],
    bonusMultiplier: 2,
  },

  // Level up reward
  LEVEL_UP: {
    id: 'level_up',
    name: 'Level Up Reward',
    description: 'Rewards for reaching a new level',
    weights: {
      common: 30,
      rare: 35,
      epic: 25,
      legendary: 10,
    },
    guaranteedItems: ['XP_BONUS'],
    excludedItems: [],
    bonusMultiplier: 1.5,
  },

  // Achievement unlocked
  ACHIEVEMENT: {
    id: 'achievement',
    name: 'Achievement Chest',
    description: 'Rewards for unlocking achievements',
    weights: {
      common: 35,
      rare: 35,
      epic: 22,
      legendary: 8,
    },
    guaranteedItems: [],
    excludedItems: [],
    bonusMultiplier: 1.25,
  },

  // Social milestone (followers, high-fives, etc)
  SOCIAL_MILESTONE: {
    id: 'social_milestone',
    name: 'Social Treasure',
    description: 'Rewards for social engagement',
    weights: {
      common: 45,
      rare: 35,
      epic: 15,
      legendary: 5,
    },
    guaranteedItems: [],
    excludedItems: ['DOUBLE_XP', 'WORKOUT_BOOST'],
    bonusMultiplier: 1,
  },

  // Mystery/rare event
  MYSTERY_DROP: {
    id: 'mystery_drop',
    name: 'Mystery Chest',
    description: 'A mysterious treasure with unknown contents',
    weights: {
      common: 10,
      rare: 30,
      epic: 40,
      legendary: 20,
    },
    guaranteedItems: [],
    excludedItems: [],
    bonusMultiplier: 2,
  },

  // Competition winner
  COMPETITION_WINNER: {
    id: 'competition_winner',
    name: "Champion's Chest",
    description: 'Rewards for winning a competition',
    weights: {
      common: 10,
      rare: 25,
      epic: 40,
      legendary: 25,
    },
    guaranteedItems: ['LEADERBOARD_BADGE'],
    excludedItems: [],
    bonusMultiplier: 3,
  },
};

// ============================================
// ITEM POOL BY RARITY
// ============================================

/**
 * Get available items for a rarity, excluding specified items
 */
function getAvailableItems(rarity, excludedItems = []) {
  const pool = LOOT_POOLS[rarity] || [];
  return pool.filter((itemKey) => !excludedItems.includes(itemKey));
}

// ============================================
// GENERATION FUNCTIONS
// ============================================

/**
 * Select a rarity based on table weights
 * @param {Object} weights - Rarity weights { common: 60, rare: 30, ... }
 * @returns {string} Selected rarity
 */
function selectRarity(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [rarity, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return rarity;
    }
  }

  return 'common';
}

/**
 * Generate a single item from a loot table
 * @param {Object} table - Loot table configuration
 * @param {Object} options - Generation options
 * @returns {Object|null} Generated loot item or null
 */
export function generateItemFromTable(table, options = {}) {
  const { forcedRarity = null, forcedItem = null } = options;

  // Use forced item if specified
  if (forcedItem && LOOT_TYPES[forcedItem]) {
    const item = createLootInstance(LOOT_TYPES[forcedItem]);
    if (table.bonusMultiplier > 1 && item.amount) {
      item.amount = Math.round(item.amount * table.bonusMultiplier);
      item.description = item.description.replace(/\d+/, item.amount);
    }
    return item;
  }

  // Select rarity
  const rarity = forcedRarity || selectRarity(table.weights);

  // Get available items for this rarity
  const availableItems = getAvailableItems(rarity, table.excludedItems);

  if (availableItems.length === 0) {
    // Fallback to common if no items available
    const fallbackItems = getAvailableItems('common', table.excludedItems);
    if (fallbackItems.length === 0) return null;
    const itemKey = fallbackItems[Math.floor(Math.random() * fallbackItems.length)];
    return createLootInstance(LOOT_TYPES[itemKey]);
  }

  // Select random item from pool
  const itemKey = availableItems[Math.floor(Math.random() * availableItems.length)];
  const item = createLootInstance(LOOT_TYPES[itemKey]);

  // Apply bonus multiplier to amounts
  if (table.bonusMultiplier > 1 && item.amount) {
    item.amount = Math.round(item.amount * table.bonusMultiplier);
    item.description = item.description.replace(/\d+/, item.amount);
  }

  return item;
}

/**
 * Generate multiple items from a loot table
 * @param {Object} table - Loot table configuration
 * @param {number} count - Number of items to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of generated loot items
 */
export function generateFromTable(table, count = 1, options = {}) {
  const { guaranteeFirst = true, minRarity = null } = options;
  const items = [];

  // First item: guaranteed item if specified
  if (guaranteeFirst && table.guaranteedItems.length > 0) {
    const guaranteedKey = table.guaranteedItems[
      Math.floor(Math.random() * table.guaranteedItems.length)
    ];
    const item = generateItemFromTable(table, { forcedItem: guaranteedKey });
    if (item) items.push(item);
  }

  // Remaining items
  while (items.length < count) {
    const item = generateItemFromTable(table, { forcedRarity: minRarity });
    if (item) items.push(item);
  }

  // Sort by rarity (best first)
  items.sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0));

  return items;
}

/**
 * Get appropriate loot table based on context
 * @param {Object} context - Game context
 * @returns {Object} Selected loot table
 */
export function getTableForContext(context = {}) {
  const {
    isFirstWorkout = false,
    isStreakMilestone = false,
    streakDays = 0,
    isPR = false,
    isLevelUp = false,
    isAchievement = false,
    isCompetitionWinner = false,
    isMystery = false,
    isWeeklyChallenge = false,
    isDailyChallenge = false,
    isSocialMilestone = false,
  } = context;

  // Priority order for table selection
  if (isCompetitionWinner) return LOOT_TABLES.COMPETITION_WINNER;
  if (isMystery) return LOOT_TABLES.MYSTERY_DROP;
  if (isFirstWorkout) return LOOT_TABLES.FIRST_WORKOUT;
  if (isLevelUp) return LOOT_TABLES.LEVEL_UP;
  if (isWeeklyChallenge) return LOOT_TABLES.WEEKLY_CHALLENGE;
  if (isStreakMilestone && streakDays >= 7) return LOOT_TABLES.STREAK_MILESTONE;
  if (isPR) return LOOT_TABLES.PERSONAL_RECORD;
  if (isAchievement) return LOOT_TABLES.ACHIEVEMENT;
  if (isDailyChallenge) return LOOT_TABLES.DAILY_CHALLENGE;
  if (isSocialMilestone) return LOOT_TABLES.SOCIAL_MILESTONE;

  // Default
  return LOOT_TABLES.WORKOUT_COMPLETE;
}

/**
 * Adjust table weights based on player stats
 * @param {Object} table - Base loot table
 * @param {Object} playerStats - Player statistics
 * @returns {Object} Modified loot table
 */
export function adjustTableForPlayer(table, playerStats = {}) {
  const {
    streak = 0,
    level = 1,
    workoutsThisWeek = 0,
    totalWorkouts = 0,
  } = playerStats;

  const adjustedWeights = { ...table.weights };

  // Streak bonus: +5% rare/epic per 7 days of streak
  const streakBonus = Math.floor(streak / 7) * 5;
  if (streakBonus > 0) {
    adjustedWeights.rare = (adjustedWeights.rare || 0) + streakBonus;
    adjustedWeights.epic = (adjustedWeights.epic || 0) + Math.floor(streakBonus / 2);
  }

  // Level bonus: +2% legendary per 10 levels
  const levelBonus = Math.floor(level / 10) * 2;
  if (levelBonus > 0) {
    adjustedWeights.legendary = (adjustedWeights.legendary || 0) + levelBonus;
  }

  // Consistency bonus: +3% rare per workout this week (max 5)
  const consistencyBonus = Math.min(workoutsThisWeek, 5) * 3;
  if (consistencyBonus > 0) {
    adjustedWeights.rare = (adjustedWeights.rare || 0) + consistencyBonus;
  }

  // Veteran bonus: +1% epic per 100 total workouts (max 10%)
  const veteranBonus = Math.min(Math.floor(totalWorkouts / 100), 10);
  if (veteranBonus > 0) {
    adjustedWeights.epic = (adjustedWeights.epic || 0) + veteranBonus;
  }

  return {
    ...table,
    weights: adjustedWeights,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  LOOT_TABLES,
  generateItemFromTable,
  generateFromTable,
  getTableForContext,
  adjustTableForPlayer,
};
