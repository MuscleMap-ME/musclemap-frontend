import { queryOne, queryAll, transaction } from '../../db/client';
import { PoolClient } from 'pg';

// =====================================================
// TYPES
// =====================================================

export interface DropRates {
  common?: number;
  uncommon?: number;
  rare?: number;
  epic?: number;
  legendary?: number;
  mythic?: number;
  divine?: number;
}

export interface BoxOpeningResult {
  cosmetic: Record<string, unknown>;
  rarity: string;
  wasPityReward: boolean;
  pityCounters: {
    epic: number;
    legendary: number;
  };
}

interface MysteryBox {
  id: string;
  name: string;
  description: string | null;
  box_type: string;
  price: number;
  drop_rates: DropRates;
  item_pool: Array<{ id: string; rarity: string }> | string[];
  available_from: Date | null;
  available_until: Date | null;
  max_purchases_per_day: number | null;
  created_at: Date;
}

interface PityCounters {
  user_id: string;
  box_type: string;
  epic_counter: number;
  legendary_counter: number;
  last_epic_at: Date | null;
  last_legendary_at: Date | null;
  updated_at: Date;
}

interface Cosmetic {
  id: string;
  name: string;
  rarity: string;
  base_price: number;
  preview_url: string | null;
  [key: string]: unknown;
}

// =====================================================
// MYSTERY BOX SERVICE
// =====================================================

// Pity system thresholds
const EPIC_PITY_THRESHOLD = 30;
const LEGENDARY_PITY_THRESHOLD = 100;
const SOFT_PITY_START = 20;

export const mysteryBoxService = {
  // =====================================================
  // BOX MANAGEMENT
  // =====================================================

  async getAvailableBoxes() {
    const boxes = await queryAll<MysteryBox>(
      `SELECT * FROM mystery_boxes
       WHERE (available_from IS NULL OR available_from <= NOW())
         AND (available_until IS NULL OR available_until > NOW())
       ORDER BY price ASC`
    );

    return boxes;
  },

  async getBoxDetails(boxId: string) {
    const box = await queryOne<MysteryBox>(
      `SELECT * FROM mystery_boxes WHERE id = $1`,
      [boxId]
    );

    if (!box) {
      return null;
    }

    // Get recent drops for this box
    const recentDrops = await queryAll<{
      rarity_received: string;
      opened_at: Date;
      name: string;
      preview_url: string | null;
      username: string;
    }>(
      `SELECT o.rarity_received, o.opened_at, c.name, c.preview_url, u.username
       FROM mystery_box_openings o
       JOIN spirit_animal_cosmetics c ON o.cosmetic_received_id = c.id
       JOIN users u ON o.user_id = u.id
       WHERE o.box_id = $1
       ORDER BY o.opened_at DESC
       LIMIT 20`,
      [boxId]
    );

    // Get drop rate statistics
    const dropStats = await queryAll<{ rarity_received: string; count: string }>(
      `SELECT rarity_received, COUNT(*) as count
       FROM mystery_box_openings
       WHERE box_id = $1
       GROUP BY rarity_received`,
      [boxId]
    );

    return {
      box,
      recentDrops,
      dropStats,
    };
  },

  // =====================================================
  // BOX OPENING
  // =====================================================

  async openBox(userId: string, boxId: string, quantity = 1): Promise<BoxOpeningResult[]> {
    // Validate box
    const box = await queryOne<MysteryBox>(
      `SELECT * FROM mystery_boxes WHERE id = $1`,
      [boxId]
    );

    if (!box) {
      throw new Error('Mystery box not found');
    }

    // Check availability
    const now = new Date();
    if (box.available_from && new Date(box.available_from) > now) {
      throw new Error('This box is not yet available');
    }
    if (box.available_until && new Date(box.available_until) < now) {
      throw new Error('This box is no longer available');
    }

    // Check purchase limits
    if (box.max_purchases_per_day) {
      const today = new Date().toISOString().split('T')[0];
      const todayOpenings = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM mystery_box_openings
         WHERE user_id = $1 AND box_id = $2 AND DATE(opened_at) = $3`,
        [userId, boxId, today]
      );

      if (Number(todayOpenings?.count || 0) + quantity > box.max_purchases_per_day) {
        throw new Error(`You can only open ${box.max_purchases_per_day} of this box per day`);
      }
    }

    // Calculate total cost
    const totalCost = box.price * quantity;

    // Check user balance
    const balance = await queryOne<{ balance: number }>(
      `SELECT balance FROM credit_balances WHERE user_id = $1`,
      [userId]
    );

    if (!balance || balance.balance < totalCost) {
      throw new Error('Insufficient credits');
    }

    // Get item pool
    let itemPool: Array<{ id: string; rarity: string }> = [];
    if (box.item_pool && Array.isArray(box.item_pool) && box.item_pool.length > 0) {
      // Convert to proper format if needed
      itemPool = box.item_pool.map((item) =>
        typeof item === 'string' ? { id: item, rarity: 'common' } : item
      );
    }

    // If item pool is empty, get all tradeable items of appropriate rarities
    if (itemPool.length === 0) {
      const dropRates = box.drop_rates as DropRates;
      const rarities = Object.keys(dropRates);

      const items = await queryAll<{ id: string; rarity: string }>(
        `SELECT id, rarity FROM spirit_animal_cosmetics
         WHERE rarity = ANY($1) AND is_purchasable = true`,
        [rarities]
      );

      itemPool = items;
    }

    // Get pity counters
    let pityCounters = await queryOne<PityCounters>(
      `SELECT * FROM user_pity_counters WHERE user_id = $1 AND box_type = $2`,
      [userId, box.box_type]
    );

    if (!pityCounters) {
      pityCounters = {
        user_id: userId,
        box_type: box.box_type,
        epic_counter: 0,
        legendary_counter: 0,
        last_epic_at: null,
        last_legendary_at: null,
        updated_at: new Date(),
      };
    }

    const results: BoxOpeningResult[] = [];

    // Process in transaction
    await transaction(async (client: PoolClient) => {
      // Deduct credits
      await client.query(
        `UPDATE credit_balances SET balance = balance - $1 WHERE user_id = $2`,
        [totalCost, userId]
      );

      let currentEpicCounter = pityCounters!.epic_counter;
      let currentLegendaryCounter = pityCounters!.legendary_counter;

      for (let i = 0; i < quantity; i++) {
        // Roll for rarity
        const { rarity, wasPityReward, newCounters } = this.rollRarity(
          box.drop_rates as DropRates,
          currentEpicCounter,
          currentLegendaryCounter
        );

        // Select random item of that rarity
        const itemsOfRarity = itemPool.filter((item) => item.rarity === rarity);

        let selectedItem: { id: string; rarity: string };
        if (itemsOfRarity.length === 0) {
          // Fallback to any item
          if (itemPool.length === 0) {
            throw new Error('No items available in box');
          }
          selectedItem = itemPool[Math.floor(Math.random() * itemPool.length)];
        } else {
          selectedItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
        }

        const cosmeticResult = await client.query<Cosmetic>(
          `SELECT * FROM spirit_animal_cosmetics WHERE id = $1`,
          [selectedItem.id]
        );
        const cosmetic = cosmeticResult.rows[0];

        if (!cosmetic) {
          throw new Error('Cosmetic not found');
        }

        // Award item
        await this.awardCosmeticWithClient(client, userId, cosmetic.id, box.price, boxId, rarity, wasPityReward, currentLegendaryCounter);

        results.push({
          cosmetic,
          rarity: cosmetic.rarity,
          wasPityReward,
          pityCounters: newCounters,
        });

        // Update pity counters for next iteration
        currentEpicCounter = newCounters.epic;
        currentLegendaryCounter = newCounters.legendary;
      }

      // Save final pity counters
      await client.query(
        `INSERT INTO user_pity_counters (user_id, box_type, epic_counter, legendary_counter, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, box_type) DO UPDATE SET
           epic_counter = $3,
           legendary_counter = $4,
           updated_at = NOW()`,
        [userId, box.box_type, currentEpicCounter, currentLegendaryCounter]
      );
    });

    return results;
  },

  // =====================================================
  // RARITY ROLLING
  // =====================================================

  rollRarity(
    dropRates: DropRates,
    epicCounter: number,
    legendaryCounter: number
  ): {
    rarity: string;
    wasPityReward: boolean;
    newCounters: { epic: number; legendary: number };
  } {
    let wasPityReward = false;
    let newEpicCounter = epicCounter + 1;
    let newLegendaryCounter = legendaryCounter + 1;

    // Check legendary pity
    if (newLegendaryCounter >= LEGENDARY_PITY_THRESHOLD) {
      return {
        rarity: 'legendary',
        wasPityReward: true,
        newCounters: { epic: 0, legendary: 0 },
      };
    }

    // Check epic pity
    if (newEpicCounter >= EPIC_PITY_THRESHOLD) {
      wasPityReward = true;
      return {
        rarity: 'epic',
        wasPityReward: true,
        newCounters: { epic: 0, legendary: newLegendaryCounter },
      };
    }

    // Apply soft pity (increased rates after threshold)
    const adjustedRates = { ...dropRates };

    if (newLegendaryCounter >= SOFT_PITY_START) {
      const bonus = (newLegendaryCounter - SOFT_PITY_START) * 0.5;
      if (adjustedRates.legendary) {
        adjustedRates.legendary += bonus;
      }
    }

    if (newEpicCounter >= SOFT_PITY_START) {
      const bonus = (newEpicCounter - SOFT_PITY_START) * 0.3;
      if (adjustedRates.epic) {
        adjustedRates.epic += bonus;
      }
    }

    // Roll
    const roll = Math.random() * 100;
    let cumulative = 0;

    const rarityOrder = ['divine', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];

    for (const rarity of rarityOrder) {
      const rate = adjustedRates[rarity as keyof DropRates];
      if (rate) {
        cumulative += rate;
        if (roll < cumulative) {
          // Reset counters if epic or better
          if (['epic', 'legendary', 'mythic', 'divine'].includes(rarity)) {
            if (['legendary', 'mythic', 'divine'].includes(rarity)) {
              newLegendaryCounter = 0;
            }
            newEpicCounter = 0;
          }

          return {
            rarity,
            wasPityReward,
            newCounters: { epic: newEpicCounter, legendary: newLegendaryCounter },
          };
        }
      }
    }

    // Default to common
    return {
      rarity: 'common',
      wasPityReward: false,
      newCounters: { epic: newEpicCounter, legendary: newLegendaryCounter },
    };
  },

  // =====================================================
  // PITY COUNTERS
  // =====================================================

  async getUserPityCounters(userId: string) {
    const counters = await queryAll<PityCounters>(
      `SELECT * FROM user_pity_counters WHERE user_id = $1`,
      [userId]
    );

    return counters.map((c) => ({
      boxType: c.box_type,
      epicCounter: c.epic_counter,
      legendaryCounter: c.legendary_counter,
      epicThreshold: EPIC_PITY_THRESHOLD,
      legendaryThreshold: LEGENDARY_PITY_THRESHOLD,
      lastEpicAt: c.last_epic_at,
      lastLegendaryAt: c.last_legendary_at,
    }));
  },

  // =====================================================
  // OPENING HISTORY
  // =====================================================

  async getUserOpeningHistory(userId: string, limit = 50) {
    const history = await queryAll<Record<string, unknown>>(
      `SELECT o.*, b.name as box_name, c.name as cosmetic_name, c.preview_url, c.rarity
       FROM mystery_box_openings o
       JOIN mystery_boxes b ON o.box_id = b.id
       JOIN spirit_animal_cosmetics c ON o.cosmetic_received_id = c.id
       WHERE o.user_id = $1
       ORDER BY o.opened_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return history;
  },

  // =====================================================
  // HELPERS
  // =====================================================

  async awardCosmeticWithClient(
    client: PoolClient,
    userId: string,
    cosmeticId: string,
    creditsSpent: number,
    boxId: string,
    rarityReceived: string,
    wasPityReward: boolean,
    pityCounter: number
  ) {
    // Check if user already owns this cosmetic
    const existingResult = await client.query<{ id: string }>(
      `SELECT id FROM user_spirit_cosmetics WHERE user_id = $1 AND cosmetic_id = $2`,
      [userId, cosmeticId]
    );

    const existing = existingResult.rows[0];

    if (existing) {
      // Convert to credits instead (50% of base price)
      const cosmeticResult = await client.query<{ base_price: number; rarity: string }>(
        `SELECT base_price, rarity FROM spirit_animal_cosmetics WHERE id = $1`,
        [cosmeticId]
      );
      const cosmetic = cosmeticResult.rows[0];

      const refundAmount = Math.floor((cosmetic?.base_price || 100) * 0.5);

      await client.query(
        `UPDATE credit_balances SET balance = balance + $1 WHERE user_id = $2`,
        [refundAmount, userId]
      );

      // Still record the opening but mark as duplicate
      await client.query(
        `INSERT INTO mystery_box_openings (
          user_id, box_id, cosmetic_received_id, rarity_received,
          credits_spent, pity_counter_at_open, was_pity_reward
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, boxId, cosmeticId, cosmetic?.rarity || 'common', creditsSpent, pityCounter, false]
      );

      return { duplicate: true, refundAmount };
    }

    // Award the cosmetic
    await client.query(
      `INSERT INTO user_spirit_cosmetics (user_id, cosmetic_id, acquisition_method, credits_spent, is_new)
       VALUES ($1, $2, 'mystery_box', $3, true)`,
      [userId, cosmeticId, creditsSpent]
    );

    // Record opening
    await client.query(
      `INSERT INTO mystery_box_openings (
        user_id, box_id, cosmetic_received_id, rarity_received,
        credits_spent, pity_counter_at_open, was_pity_reward
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, boxId, cosmeticId, rarityReceived, creditsSpent, pityCounter, wasPityReward]
    );

    return { duplicate: false };
  },

  // Get statistics for a box
  async getBoxStatistics(boxId: string) {
    const totalOpenings = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM mystery_box_openings WHERE box_id = $1`,
      [boxId]
    );

    const rarityDistribution = await queryAll<{ rarity_received: string; count: string }>(
      `SELECT rarity_received, COUNT(*) as count
       FROM mystery_box_openings
       WHERE box_id = $1
       GROUP BY rarity_received`,
      [boxId]
    );

    const pityTriggers = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM mystery_box_openings
       WHERE box_id = $1 AND was_pity_reward = true`,
      [boxId]
    );

    const totalCount = Number(totalOpenings?.count || 0);
    const pityCount = Number(pityTriggers?.count || 0);

    return {
      totalOpenings: totalCount,
      rarityDistribution,
      pityTriggerRate: totalCount > 0 ? (pityCount / totalCount) * 100 : 0,
    };
  },
};
