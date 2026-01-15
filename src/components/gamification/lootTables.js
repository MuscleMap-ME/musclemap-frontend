/**
 * Loot Tables (Gamification Module)
 *
 * Re-exports loot table definitions and generation utilities from the loot module.
 * Defines rewards by rarity including XP, credits, streak shields, and cosmetics.
 *
 * Reward Types:
 * - XP amounts (25, 50, 100, 250)
 * - Credit amounts (5, 10, 25, 50)
 * - Achievement progress bonuses
 * - Streak shields (protection)
 * - Cosmetic items (avatar frames, titles, glow effects)
 * - Double XP boosts
 * - Workout credit bonuses
 *
 * Loot Tables:
 * - FIRST_WORKOUT: Generous welcome loot
 * - DAILY_CHALLENGE: Daily challenge rewards
 * - STREAK_MILESTONE: Streak achievement rewards
 * - PERSONAL_RECORD: PR celebration rewards
 * - WORKOUT_COMPLETE: Standard workout loot
 * - WEEKLY_CHALLENGE: Weekly objective rewards
 * - LEVEL_UP: Level up celebration
 * - ACHIEVEMENT: Achievement unlock rewards
 * - MYSTERY_DROP: Rare mystery chests
 * - COMPETITION_WINNER: Competition victory rewards
 *
 * @example
 * import {
 *   LOOT_TABLES,
 *   generateFromTable,
 *   getTableForContext
 * } from '@/components/gamification';
 *
 * // Get appropriate table for context
 * const table = getTableForContext({ isPR: true, streak: 7 });
 *
 * // Generate 3 items from the table
 * const items = generateFromTable(table, 3);
 */

// Re-export all from loot tables
export {
  LOOT_TABLES,
  generateItemFromTable,
  generateFromTable,
  getTableForContext,
  adjustTableForPlayer,
  default,
} from '../loot/lootTables';

// Also re-export core loot definitions for convenience
export {
  RARITY_COLORS,
  RARITY_WEIGHTS,
  RARITY_ORDER,
  LOOT_TYPES,
  LOOT_POOLS,
  CHEST_TYPES,
  generateLootItem,
  createLootInstance,
  generateLootDrop,
  determineChestType,
} from '../loot/lootDefinitions';
