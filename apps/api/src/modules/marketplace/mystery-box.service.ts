import { queryOne, queryAll, execute, transaction } from '../../db/client';

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
    const now = new Date();

    const boxes = await db('mystery_boxes')
      .where(function () {
        this.whereNull('available_from').orWhere('available_from', '<=', now);
      })
      .where(function () {
        this.whereNull('available_until').orWhere('available_until', '>', now);
      })
      .orderBy('price', 'asc');

    return boxes;
  },

  async getBoxDetails(boxId: string) {
    const box = await db('mystery_boxes').where({ id: boxId }).first();

    if (!box) {
      return null;
    }

    // Get recent drops for this box
    const recentDrops = await db('mystery_box_openings')
      .join('spirit_animal_cosmetics', 'mystery_box_openings.cosmetic_received_id', 'spirit_animal_cosmetics.id')
      .join('users', 'mystery_box_openings.user_id', 'users.id')
      .where('mystery_box_openings.box_id', boxId)
      .orderBy('mystery_box_openings.opened_at', 'desc')
      .limit(20)
      .select(
        'mystery_box_openings.rarity_received',
        'mystery_box_openings.opened_at',
        'spirit_animal_cosmetics.name',
        'spirit_animal_cosmetics.preview_url',
        'users.username'
      );

    // Get drop rate statistics
    const dropStats = await db('mystery_box_openings')
      .where({ box_id: boxId })
      .select('rarity_received')
      .count('* as count')
      .groupBy('rarity_received');

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
    const box = await db('mystery_boxes').where({ id: boxId }).first();

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
      const todayOpenings = await db('mystery_box_openings')
        .where({ user_id: userId, box_id: boxId })
        .whereRaw("DATE(opened_at) = ?", [today])
        .count('* as count')
        .first();

      if (Number(todayOpenings?.count || 0) + quantity > box.max_purchases_per_day) {
        throw new Error(`You can only open ${box.max_purchases_per_day} of this box per day`);
      }
    }

    // Calculate total cost
    const totalCost = box.price * quantity;

    // Check user balance
    const balance = await db('credit_balances')
      .where({ user_id: userId })
      .first();

    if (!balance || balance.balance < totalCost) {
      throw new Error('Insufficient credits');
    }

    // Get item pool
    let itemPool = box.item_pool || [];

    // If item pool is empty, get all tradeable items of appropriate rarities
    if (itemPool.length === 0) {
      const dropRates = box.drop_rates as DropRates;
      const rarities = Object.keys(dropRates);

      const items = await db('spirit_animal_cosmetics')
        .whereIn('rarity', rarities)
        .where({ is_purchasable: true })
        .select('id', 'rarity');

      itemPool = items.map((i) => ({ id: i.id, rarity: i.rarity }));
    }

    // Get pity counters
    let pityCounters = await db('user_pity_counters')
      .where({ user_id: userId, box_type: box.box_type })
      .first();

    if (!pityCounters) {
      pityCounters = {
        epic_counter: 0,
        legendary_counter: 0,
      };
    }

    const results: BoxOpeningResult[] = [];

    // Process in transaction
    await db.transaction(async (trx) => {
      // Deduct credits
      await trx('credit_balances')
        .where({ user_id: userId })
        .decrement('balance', totalCost);

      for (let i = 0; i < quantity; i++) {
        // Roll for rarity
        const { rarity, wasPityReward, newCounters } = this.rollRarity(
          box.drop_rates as DropRates,
          pityCounters.epic_counter,
          pityCounters.legendary_counter
        );

        // Select random item of that rarity
        const itemsOfRarity = Array.isArray(itemPool)
          ? itemPool.filter((item: { rarity?: string }) => item.rarity === rarity)
          : [];

        if (itemsOfRarity.length === 0) {
          // Fallback to any item
          const fallbackItems = Array.isArray(itemPool) ? itemPool : [];
          if (fallbackItems.length === 0) {
            throw new Error('No items available in box');
          }
          const randomItem = fallbackItems[Math.floor(Math.random() * fallbackItems.length)];
          const cosmetic = await trx('spirit_animal_cosmetics')
            .where({ id: randomItem.id || randomItem })
            .first();

          // Award item
          await this.awardCosmetic(trx, userId, cosmetic.id, box.price, boxId);

          results.push({
            cosmetic,
            rarity: cosmetic.rarity,
            wasPityReward,
            pityCounters: newCounters,
          });
        } else {
          const randomItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
          const itemId = randomItem.id || randomItem;

          const cosmetic = await trx('spirit_animal_cosmetics')
            .where({ id: itemId })
            .first();

          // Award item
          await this.awardCosmetic(trx, userId, cosmetic.id, box.price, boxId);

          // Record opening
          await trx('mystery_box_openings').insert({
            user_id: userId,
            box_id: boxId,
            cosmetic_received_id: cosmetic.id,
            rarity_received: rarity,
            credits_spent: box.price,
            pity_counter_at_open: pityCounters.legendary_counter,
            was_pity_reward: wasPityReward,
          });

          results.push({
            cosmetic,
            rarity,
            wasPityReward,
            pityCounters: newCounters,
          });
        }

        // Update pity counters for next iteration
        pityCounters = {
          epic_counter: newCounters.epic,
          legendary_counter: newCounters.legendary,
        };
      }

      // Save final pity counters
      await trx('user_pity_counters')
        .insert({
          user_id: userId,
          box_type: box.box_type,
          epic_counter: pityCounters.epic_counter,
          legendary_counter: pityCounters.legendary_counter,
          updated_at: new Date(),
        })
        .onConflict(['user_id', 'box_type'])
        .merge({
          epic_counter: pityCounters.epic_counter,
          legendary_counter: pityCounters.legendary_counter,
          updated_at: new Date(),
        });
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
    const counters = await db('user_pity_counters')
      .where({ user_id: userId });

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
    const history = await db('mystery_box_openings')
      .join('mystery_boxes', 'mystery_box_openings.box_id', 'mystery_boxes.id')
      .join('spirit_animal_cosmetics', 'mystery_box_openings.cosmetic_received_id', 'spirit_animal_cosmetics.id')
      .where('mystery_box_openings.user_id', userId)
      .orderBy('mystery_box_openings.opened_at', 'desc')
      .limit(limit)
      .select(
        'mystery_box_openings.*',
        'mystery_boxes.name as box_name',
        'spirit_animal_cosmetics.name as cosmetic_name',
        'spirit_animal_cosmetics.preview_url',
        'spirit_animal_cosmetics.rarity'
      );

    return history;
  },

  // =====================================================
  // HELPERS
  // =====================================================

  async awardCosmetic(
    trx: typeof db,
    userId: string,
    cosmeticId: string,
    creditsSpent: number,
    boxId: string
  ) {
    // Check if user already owns this cosmetic
    const existing = await trx('user_spirit_cosmetics')
      .where({ user_id: userId, cosmetic_id: cosmeticId })
      .first();

    if (existing) {
      // Convert to credits instead (50% of base price)
      const cosmetic = await trx('spirit_animal_cosmetics')
        .where({ id: cosmeticId })
        .first();

      const refundAmount = Math.floor((cosmetic?.base_price || 100) * 0.5);

      await trx('credit_balances')
        .where({ user_id: userId })
        .increment('balance', refundAmount);

      // Still record the opening but mark as duplicate
      await trx('mystery_box_openings').insert({
        user_id: userId,
        box_id: boxId,
        cosmetic_received_id: cosmeticId,
        rarity_received: cosmetic?.rarity || 'common',
        credits_spent: creditsSpent,
        was_pity_reward: false,
      });

      return { duplicate: true, refundAmount };
    }

    // Award the cosmetic
    await trx('user_spirit_cosmetics').insert({
      user_id: userId,
      cosmetic_id: cosmeticId,
      acquisition_method: 'mystery_box',
      credits_spent: creditsSpent,
      is_new: true,
    });

    return { duplicate: false };
  },

  // Get statistics for a box
  async getBoxStatistics(boxId: string) {
    const totalOpenings = await db('mystery_box_openings')
      .where({ box_id: boxId })
      .count('* as count')
      .first();

    const rarityDistribution = await db('mystery_box_openings')
      .where({ box_id: boxId })
      .select('rarity_received')
      .count('* as count')
      .groupBy('rarity_received');

    const pityTriggers = await db('mystery_box_openings')
      .where({ box_id: boxId, was_pity_reward: true })
      .count('* as count')
      .first();

    return {
      totalOpenings: Number(totalOpenings?.count || 0),
      rarityDistribution,
      pityTriggerRate:
        Number(totalOpenings?.count || 0) > 0
          ? (Number(pityTriggers?.count || 0) / Number(totalOpenings?.count || 0)) * 100
          : 0,
    };
  },
};
