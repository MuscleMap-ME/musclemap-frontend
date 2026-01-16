/**
 * Loot Drop Module
 *
 * Components, hooks, and utilities for the loot drop reward system.
 *
 * @example
 * import {
 *   LootDrop,
 *   LootChest,
 *   LootReveal,
 *   useLootDrop,
 *   LOOT_DROP_STATES,
 *   CHEST_STATES,
 *   LOOT_TYPES,
 *   RARITY_COLORS,
 *   generateLootDrop,
 * } from '@/components/loot';
 */

// Main components
export { LootDrop } from './LootDrop';
export { LootChest, CHEST_STATES } from './LootChest';
export { LootReveal } from './LootReveal';

// Hooks
export { useLootDrop, LOOT_DROP_STATES } from './useLootDrop';

// Loot definitions and utilities
export {
  RARITY_COLORS,
  RARITY_WEIGHTS,
  RARITY_ORDER,
  LOOT_TYPES,
  LOOT_POOLS,
  CHEST_TYPES,
  LOOT_SOUNDS,
  generateLootItem,
  createLootInstance,
  generateLootDrop,
  determineChestType,
} from './lootDefinitions';

// Loot tables
export {
  LOOT_TABLES,
  generateItemFromTable,
  generateFromTable,
  getTableForContext,
  adjustTableForPlayer,
} from './lootTables';

// Default export
export { LootDrop as default } from './LootDrop';
