/**
 * LootDrop Component (Gamification Module)
 *
 * Re-exports the LootDrop component from the loot module.
 * Full-screen overlay animation for opening loot boxes with
 * rarity-based visuals and reward reveals.
 *
 * @example
 * import { LootDrop, useLootDrop } from '@/components/gamification';
 *
 * const { showLootDrop, generateLoot } = useLootDrop();
 *
 * // Generate loot after workout
 * const loot = generateLoot({ totalSets: 20, totalVolume: 5000 });
 * showLootDrop(loot);
 *
 * // Render the loot drop overlay
 * <LootDrop />
 */

// Re-export from loot module
export { LootDrop, default } from '../loot/LootDrop';
