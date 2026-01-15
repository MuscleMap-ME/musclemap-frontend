/**
 * Spirit Animal Wardrobe Service
 *
 * Handles all cosmetic/wardrobe functionality for Spirit Animals:
 * - Browsing and purchasing cosmetics
 * - Equipping/unequipping items
 * - Managing loadout presets
 * - Shop rotation
 * - Gifting cosmetics
 */

import { query, queryOne, queryAll } from '../../db/client';
import { economyService } from '../economy';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Types
export interface SpiritCosmetic {
  id: string;
  itemKey: string;
  name: string;
  description: string | null;
  category: string;
  slot: string | null;
  rarity: string;
  basePrice: number;
  speciesLocked: string[] | null;
  stageRequired: number;
  isPurchasable: boolean;
  isTradeable: boolean;
  isGiftable: boolean;
  achievementRequired: string | null;
  season: string | null;
  releaseDate: string;
  retirementDate: string | null;
  previewUrl: string | null;
  assetUrl: string | null;
}

export interface UserCosmetic {
  id: string;
  cosmeticId: string;
  acquiredAt: string;
  acquisitionMethod: string;
  creditsSpent: number;
  giftedBy: string | null;
  isFavorite: boolean;
  isNew: boolean;
  cosmetic: SpiritCosmetic;
}

export interface SpiritLoadout {
  skinId: string | null;
  eyesId: string | null;
  outfitId: string | null;
  headwearId: string | null;
  footwearId: string | null;
  accessory1Id: string | null;
  accessory2Id: string | null;
  accessory3Id: string | null;
  auraId: string | null;
  emoteVictoryId: string | null;
  emoteIdleId: string | null;
  backgroundId: string | null;
}

export interface ShopItem {
  slotNumber: number;
  cosmeticId: string;
  itemKey: string;
  name: string;
  description: string | null;
  category: string;
  rarity: string;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  isFeatured: boolean;
  owned: boolean;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  cosmetic?: SpiritCosmetic;
  creditsSpent?: number;
  newBalance?: number;
}

export interface GiftResult {
  success: boolean;
  error?: string;
  giftId?: string;
  creditsSpent?: number;
}

// Service
export const spiritWardrobeService = {
  /**
   * Get all available cosmetics with filters
   */
  async getCatalog(filters: {
    category?: string;
    rarity?: string;
    maxPrice?: number;
    purchasableOnly?: boolean;
    season?: string;
  } = {}): Promise<SpiritCosmetic[]> {
    let sql = `
      SELECT
        id, item_key, name, description, category, slot, rarity,
        base_price, species_locked, stage_required, is_purchasable,
        is_tradeable, is_giftable, achievement_required, season,
        release_date::text, retirement_date::text, preview_url, asset_url
      FROM spirit_animal_cosmetics
      WHERE (retirement_date IS NULL OR retirement_date > CURRENT_DATE)
    `;

    const params: unknown[] = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.rarity) {
      paramCount++;
      sql += ` AND rarity = $${paramCount}`;
      params.push(filters.rarity);
    }

    if (filters.maxPrice !== undefined) {
      paramCount++;
      sql += ` AND base_price <= $${paramCount}`;
      params.push(filters.maxPrice);
    }

    if (filters.purchasableOnly) {
      sql += ` AND is_purchasable = TRUE`;
    }

    if (filters.season) {
      paramCount++;
      sql += ` AND season = $${paramCount}`;
      params.push(filters.season);
    }

    sql += ` ORDER BY category, base_price ASC`;

    const rows = await queryAll<{
      id: string;
      item_key: string;
      name: string;
      description: string | null;
      category: string;
      slot: string | null;
      rarity: string;
      base_price: number;
      species_locked: string[] | null;
      stage_required: number;
      is_purchasable: boolean;
      is_tradeable: boolean;
      is_giftable: boolean;
      achievement_required: string | null;
      season: string | null;
      release_date: string;
      retirement_date: string | null;
      preview_url: string | null;
      asset_url: string | null;
    }>(sql, params);

    return rows.map(this.mapCosmetic);
  },

  /**
   * Get a specific cosmetic by ID or item_key
   */
  async getCosmetic(idOrKey: string): Promise<SpiritCosmetic | null> {
    const row = await queryOne<{
      id: string;
      item_key: string;
      name: string;
      description: string | null;
      category: string;
      slot: string | null;
      rarity: string;
      base_price: number;
      species_locked: string[] | null;
      stage_required: number;
      is_purchasable: boolean;
      is_tradeable: boolean;
      is_giftable: boolean;
      achievement_required: string | null;
      season: string | null;
      release_date: string;
      retirement_date: string | null;
      preview_url: string | null;
      asset_url: string | null;
    }>(`
      SELECT * FROM spirit_animal_cosmetics
      WHERE id::text = $1 OR item_key = $1
    `, [idOrKey]);

    return row ? this.mapCosmetic(row) : null;
  },

  /**
   * Get user's owned cosmetics
   */
  async getUserCollection(userId: string, category?: string): Promise<UserCosmetic[]> {
    let sql = `
      SELECT
        uc.id, uc.cosmetic_id, uc.acquired_at::text, uc.acquisition_method,
        uc.credits_spent, uc.gifted_by, uc.is_favorite, uc.is_new,
        c.id as c_id, c.item_key, c.name, c.description, c.category, c.slot,
        c.rarity, c.base_price, c.species_locked, c.stage_required,
        c.is_purchasable, c.is_tradeable, c.is_giftable, c.achievement_required,
        c.season, c.release_date::text, c.retirement_date::text,
        c.preview_url, c.asset_url
      FROM user_spirit_cosmetics uc
      JOIN spirit_animal_cosmetics c ON c.id = uc.cosmetic_id
      WHERE uc.user_id = $1
    `;

    const params: unknown[] = [userId];

    if (category) {
      sql += ` AND c.category = $2`;
      params.push(category);
    }

    sql += ` ORDER BY uc.acquired_at DESC`;

    const rows = await queryAll<{
      id: string;
      cosmetic_id: string;
      acquired_at: string;
      acquisition_method: string;
      credits_spent: number;
      gifted_by: string | null;
      is_favorite: boolean;
      is_new: boolean;
      c_id: string;
      item_key: string;
      name: string;
      description: string | null;
      category: string;
      slot: string | null;
      rarity: string;
      base_price: number;
      species_locked: string[] | null;
      stage_required: number;
      is_purchasable: boolean;
      is_tradeable: boolean;
      is_giftable: boolean;
      achievement_required: string | null;
      season: string | null;
      release_date: string;
      retirement_date: string | null;
      preview_url: string | null;
      asset_url: string | null;
    }>(sql, params);

    return rows.map(row => ({
      id: row.id,
      cosmeticId: row.cosmetic_id,
      acquiredAt: row.acquired_at,
      acquisitionMethod: row.acquisition_method,
      creditsSpent: row.credits_spent,
      giftedBy: row.gifted_by,
      isFavorite: row.is_favorite,
      isNew: row.is_new,
      cosmetic: {
        id: row.c_id,
        itemKey: row.item_key,
        name: row.name,
        description: row.description,
        category: row.category,
        slot: row.slot,
        rarity: row.rarity,
        basePrice: row.base_price,
        speciesLocked: row.species_locked,
        stageRequired: row.stage_required,
        isPurchasable: row.is_purchasable,
        isTradeable: row.is_tradeable,
        isGiftable: row.is_giftable,
        achievementRequired: row.achievement_required,
        season: row.season,
        releaseDate: row.release_date,
        retirementDate: row.retirement_date,
        previewUrl: row.preview_url,
        assetUrl: row.asset_url,
      },
    }));
  },

  /**
   * Check if user owns a specific cosmetic
   */
  async userOwnsCosmetic(userId: string, cosmeticId: string): Promise<boolean> {
    const result = await queryOne<{ owns: boolean }>(`
      SELECT user_owns_cosmetic($1, $2::uuid) as owns
    `, [userId, cosmeticId]);
    return result?.owns ?? false;
  },

  /**
   * Purchase a cosmetic
   */
  async purchaseCosmetic(
    userId: string,
    cosmeticId: string,
    discountPercent: number = 0
  ): Promise<PurchaseResult> {
    // Get cosmetic
    const cosmetic = await this.getCosmetic(cosmeticId);
    if (!cosmetic) {
      return { success: false, error: 'Cosmetic not found' };
    }

    // Check if purchasable
    if (!cosmetic.isPurchasable) {
      return { success: false, error: 'This item cannot be purchased' };
    }

    // Check if already owned
    if (await this.userOwnsCosmetic(userId, cosmeticId)) {
      return { success: false, error: 'You already own this item' };
    }

    // Check stage requirement
    const companionStage = await this.getUserStage(userId);
    if (companionStage < cosmetic.stageRequired) {
      return {
        success: false,
        error: `Your Spirit Animal must be stage ${cosmetic.stageRequired} to use this item`,
      };
    }

    // Calculate price
    const finalPrice = Math.floor(cosmetic.basePrice * (100 - discountPercent) / 100);

    // Check balance
    const balance = await economyService.getBalance(userId);
    if (balance < finalPrice) {
      return { success: false, error: 'Insufficient credits' };
    }

    // Deduct credits
    const deducted = await economyService.charge({
      userId,
      action: 'spirit_cosmetic',
      amount: finalPrice,
      metadata: {
        cosmeticId,
        itemKey: cosmetic.itemKey,
        discountPercent,
      },
      idempotencyKey: `spirit-cosmetic-${userId}-${cosmeticId}-${Date.now()}`,
    });

    if (!deducted.success) {
      return { success: false, error: deducted.error || 'Failed to deduct credits' };
    }

    // Add to inventory
    await query(`
      INSERT INTO user_spirit_cosmetics (user_id, cosmetic_id, acquisition_method, credits_spent)
      VALUES ($1, $2::uuid, 'purchase', $3)
    `, [userId, cosmeticId, finalPrice]);

    // Record purchase
    await query(`
      INSERT INTO spirit_cosmetic_purchases
      (user_id, cosmetic_id, credits_spent, was_discounted, discount_percent, original_price)
      VALUES ($1, $2::uuid, $3, $4, $5, $6)
    `, [userId, cosmeticId, finalPrice, discountPercent > 0, discountPercent, cosmetic.basePrice]);

    const newBalance = await economyService.getBalance(userId);

    return {
      success: true,
      cosmetic,
      creditsSpent: finalPrice,
      newBalance,
    };
  },

  /**
   * Gift a cosmetic to another user
   */
  async giftCosmetic(
    fromUserId: string,
    toUserId: string,
    cosmeticId: string,
    message?: string
  ): Promise<GiftResult> {
    // Get cosmetic
    const cosmetic = await this.getCosmetic(cosmeticId);
    if (!cosmetic) {
      return { success: false, error: 'Cosmetic not found' };
    }

    // Check if giftable
    if (!cosmetic.isGiftable) {
      return { success: false, error: 'This item cannot be gifted' };
    }

    // Check if recipient already owns
    if (await this.userOwnsCosmetic(toUserId, cosmeticId)) {
      return { success: false, error: 'Recipient already owns this item' };
    }

    // Check balance
    const balance = await economyService.getBalance(fromUserId);
    if (balance < cosmetic.basePrice) {
      return { success: false, error: 'Insufficient credits' };
    }

    // Deduct credits
    const deducted = await economyService.charge({
      userId: fromUserId,
      action: 'spirit_gift',
      amount: cosmetic.basePrice,
      metadata: {
        cosmeticId,
        recipientId: toUserId,
      },
      idempotencyKey: `spirit-gift-${fromUserId}-${toUserId}-${cosmeticId}-${Date.now()}`,
    });

    if (!deducted.success) {
      return { success: false, error: deducted.error || 'Failed to deduct credits' };
    }

    // Add to recipient's inventory
    await query(`
      INSERT INTO user_spirit_cosmetics
      (user_id, cosmetic_id, acquisition_method, credits_spent, gifted_by)
      VALUES ($1, $2::uuid, 'gift', 0, $3)
    `, [toUserId, cosmeticId, fromUserId]);

    // Record gift
    const gift = await queryOne<{ id: string }>(`
      INSERT INTO spirit_cosmetic_gifts
      (from_user_id, to_user_id, cosmetic_id, credits_spent, message)
      VALUES ($1, $2, $3::uuid, $4, $5)
      RETURNING id
    `, [fromUserId, toUserId, cosmeticId, cosmetic.basePrice, message || null]);

    return {
      success: true,
      giftId: gift?.id,
      creditsSpent: cosmetic.basePrice,
    };
  },

  /**
   * Get user's current loadout
   */
  async getLoadout(userId: string): Promise<SpiritLoadout> {
    const row = await queryOne<{
      skin_id: string | null;
      eyes_id: string | null;
      outfit_id: string | null;
      headwear_id: string | null;
      footwear_id: string | null;
      accessory_1_id: string | null;
      accessory_2_id: string | null;
      accessory_3_id: string | null;
      aura_id: string | null;
      emote_victory_id: string | null;
      emote_idle_id: string | null;
      background_id: string | null;
    }>(`SELECT * FROM user_spirit_loadout WHERE user_id = $1`, [userId]);

    if (!row) {
      // Initialize loadout if doesn't exist
      await query(`
        INSERT INTO user_spirit_loadout (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      return {
        skinId: null,
        eyesId: null,
        outfitId: null,
        headwearId: null,
        footwearId: null,
        accessory1Id: null,
        accessory2Id: null,
        accessory3Id: null,
        auraId: null,
        emoteVictoryId: null,
        emoteIdleId: null,
        backgroundId: null,
      };
    }

    return {
      skinId: row.skin_id,
      eyesId: row.eyes_id,
      outfitId: row.outfit_id,
      headwearId: row.headwear_id,
      footwearId: row.footwear_id,
      accessory1Id: row.accessory_1_id,
      accessory2Id: row.accessory_2_id,
      accessory3Id: row.accessory_3_id,
      auraId: row.aura_id,
      emoteVictoryId: row.emote_victory_id,
      emoteIdleId: row.emote_idle_id,
      backgroundId: row.background_id,
    };
  },

  /**
   * Update user's loadout
   */
  async updateLoadout(userId: string, updates: Partial<SpiritLoadout>): Promise<{ success: boolean; error?: string }> {
    // Validate that user owns all the cosmetics they're trying to equip
    const cosmeticIds = Object.values(updates).filter(id => id !== null && id !== undefined) as string[];

    for (const cosmeticId of cosmeticIds) {
      if (!await this.userOwnsCosmetic(userId, cosmeticId)) {
        return { success: false, error: `You don't own cosmetic ${cosmeticId}` };
      }
    }

    // Build update query
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [userId];
    let paramCount = 1;

    const slotMap: Record<keyof SpiritLoadout, string> = {
      skinId: 'skin_id',
      eyesId: 'eyes_id',
      outfitId: 'outfit_id',
      headwearId: 'headwear_id',
      footwearId: 'footwear_id',
      accessory1Id: 'accessory_1_id',
      accessory2Id: 'accessory_2_id',
      accessory3Id: 'accessory_3_id',
      auraId: 'aura_id',
      emoteVictoryId: 'emote_victory_id',
      emoteIdleId: 'emote_idle_id',
      backgroundId: 'background_id',
    };

    for (const [key, value] of Object.entries(updates)) {
      const column = slotMap[key as keyof SpiritLoadout];
      if (column) {
        paramCount++;
        if (value === null) {
          setClauses.push(`${column} = NULL`);
        } else {
          setClauses.push(`${column} = $${paramCount}::uuid`);
          params.push(value);
        }
      }
    }

    await query(`
      INSERT INTO user_spirit_loadout (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET ${setClauses.join(', ')}
    `, params);

    return { success: true };
  },

  /**
   * Get today's shop rotation
   */
  async getTodaysShop(userId: string): Promise<ShopItem[]> {
    const rows = await queryAll<{
      slot_number: number;
      cosmetic_id: string;
      item_key: string;
      name: string;
      description: string | null;
      category: string;
      rarity: string;
      base_price: number;
      discount_percent: number;
      final_price: number;
      is_featured: boolean;
    }>(`SELECT * FROM get_todays_spirit_shop()`);

    // Check which items user already owns
    const items: ShopItem[] = [];
    for (const row of rows) {
      const owned = await this.userOwnsCosmetic(userId, row.cosmetic_id);
      items.push({
        slotNumber: row.slot_number,
        cosmeticId: row.cosmetic_id,
        itemKey: row.item_key,
        name: row.name,
        description: row.description,
        category: row.category,
        rarity: row.rarity,
        basePrice: row.base_price,
        discountPercent: row.discount_percent,
        finalPrice: row.final_price,
        isFeatured: row.is_featured,
        owned,
      });
    }

    return items;
  },

  /**
   * Rotate the daily shop (called by scheduler)
   */
  async rotateShop(): Promise<void> {
    // Get available purchasable cosmetics
    const cosmetics = await queryAll<{ id: string; rarity: string }>(`
      SELECT id, rarity FROM spirit_animal_cosmetics
      WHERE is_purchasable = TRUE
        AND (retirement_date IS NULL OR retirement_date > CURRENT_DATE)
    `);

    if (cosmetics.length < 6) {
      log.warn('Not enough cosmetics for shop rotation');
      return;
    }

    // Weighted random selection based on rarity
    const rarityWeights: Record<string, number> = {
      common: 10,
      uncommon: 6,
      rare: 3,
      epic: 1.5,
      legendary: 0.5,
    };

    const weightedCosmetics = cosmetics.map(c => ({
      ...c,
      weight: rarityWeights[c.rarity] || 1,
    }));

    const totalWeight = weightedCosmetics.reduce((sum, c) => sum + c.weight, 0);

    // Select 6 unique items
    const selected: string[] = [];
    const remaining = [...weightedCosmetics];

    for (let i = 0; i < 6 && remaining.length > 0; i++) {
      let random = Math.random() * totalWeight;
      for (let j = 0; j < remaining.length; j++) {
        random -= remaining[j].weight;
        if (random <= 0) {
          selected.push(remaining[j].id);
          remaining.splice(j, 1);
          break;
        }
      }
    }

    // One random item gets a discount
    const discountSlot = Math.floor(Math.random() * selected.length);
    const discountPercent = [10, 15, 20, 25][Math.floor(Math.random() * 4)];

    // First item is featured
    for (let i = 0; i < selected.length; i++) {
      await query(`
        INSERT INTO spirit_shop_rotation
        (rotation_date, slot_number, cosmetic_id, discount_percent, is_featured)
        VALUES (CURRENT_DATE, $1, $2::uuid, $3, $4)
        ON CONFLICT (rotation_date, slot_number) DO UPDATE SET
          cosmetic_id = EXCLUDED.cosmetic_id,
          discount_percent = EXCLUDED.discount_percent,
          is_featured = EXCLUDED.is_featured
      `, [i + 1, selected[i], i === discountSlot ? discountPercent : 0, i === 0]);
    }

    log.info('Spirit shop rotated successfully');
  },

  /**
   * Award a cosmetic to user (for achievements, events, etc.)
   */
  async awardCosmetic(
    userId: string,
    cosmeticId: string,
    method: 'achievement' | 'event' | 'reward' | 'competition' | 'starter'
  ): Promise<boolean> {
    // Check if already owned
    if (await this.userOwnsCosmetic(userId, cosmeticId)) {
      return false;
    }

    await query(`
      INSERT INTO user_spirit_cosmetics
      (user_id, cosmetic_id, acquisition_method, credits_spent)
      VALUES ($1, $2::uuid, $3, 0)
      ON CONFLICT (user_id, cosmetic_id) DO NOTHING
    `, [userId, cosmeticId, method]);

    return true;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: string, cosmeticId: string): Promise<boolean> {
    const result = await queryOne<{ is_favorite: boolean }>(`
      UPDATE user_spirit_cosmetics
      SET is_favorite = NOT is_favorite
      WHERE user_id = $1 AND cosmetic_id = $2::uuid
      RETURNING is_favorite
    `, [userId, cosmeticId]);

    return result?.is_favorite ?? false;
  },

  /**
   * Mark cosmetic as seen (not new)
   */
  async markAsSeen(userId: string, cosmeticIds: string[]): Promise<void> {
    await query(`
      UPDATE user_spirit_cosmetics
      SET is_new = FALSE
      WHERE user_id = $1 AND cosmetic_id = ANY($2::uuid[])
    `, [userId, cosmeticIds]);
  },

  // =====================================================
  // PRESET MANAGEMENT
  // =====================================================

  /**
   * Get all presets for a user
   */
  async getPresets(userId: string): Promise<{
    id: string;
    name: string;
    icon: string;
    loadout: SpiritLoadout;
    createdAt: string;
  }[]> {
    const rows = await queryAll<{
      id: string;
      preset_name: string;
      preset_icon: string;
      loadout: Record<string, string | null>;
      created_at: string;
    }>(`
      SELECT id, preset_name, preset_icon, loadout, created_at::text
      FROM user_spirit_presets
      WHERE user_id = $1
      ORDER BY created_at ASC
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      name: row.preset_name,
      icon: row.preset_icon,
      loadout: {
        skinId: row.loadout.skinId || null,
        eyesId: row.loadout.eyesId || null,
        outfitId: row.loadout.outfitId || null,
        headwearId: row.loadout.headwearId || null,
        footwearId: row.loadout.footwearId || null,
        accessory1Id: row.loadout.accessory1Id || null,
        accessory2Id: row.loadout.accessory2Id || null,
        accessory3Id: row.loadout.accessory3Id || null,
        auraId: row.loadout.auraId || null,
        emoteVictoryId: row.loadout.emoteVictoryId || null,
        emoteIdleId: row.loadout.emoteIdleId || null,
        backgroundId: row.loadout.backgroundId || null,
      },
      createdAt: row.created_at,
    }));
  },

  /**
   * Save current loadout as a preset
   */
  async savePreset(userId: string, name: string, icon: string = 'outfit'): Promise<{ success: boolean; presetId?: string; error?: string }> {
    // Validate name
    if (!name || name.length > 50) {
      return { success: false, error: 'Preset name must be 1-50 characters' };
    }

    // Get current loadout
    const loadout = await this.getLoadout(userId);

    // Check if preset with this name already exists
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM user_spirit_presets WHERE user_id = $1 AND preset_name = $2
    `, [userId, name]);

    if (existing) {
      // Update existing
      await query(`
        UPDATE user_spirit_presets
        SET loadout = $1, preset_icon = $2, updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(loadout), icon, existing.id]);
      return { success: true, presetId: existing.id };
    }

    // Check max presets (limit to 10)
    const count = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM user_spirit_presets WHERE user_id = $1
    `, [userId]);

    if ((count?.count || 0) >= 10) {
      return { success: false, error: 'Maximum 10 presets allowed' };
    }

    // Create new preset
    const result = await queryOne<{ id: string }>(`
      INSERT INTO user_spirit_presets (user_id, preset_name, preset_icon, loadout)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [userId, name, icon, JSON.stringify(loadout)]);

    return { success: true, presetId: result?.id };
  },

  /**
   * Load a preset into current loadout
   */
  async loadPreset(userId: string, presetId: string): Promise<{ success: boolean; error?: string }> {
    const preset = await queryOne<{ loadout: Record<string, string | null> }>(`
      SELECT loadout FROM user_spirit_presets WHERE id = $1 AND user_id = $2
    `, [presetId, userId]);

    if (!preset) {
      return { success: false, error: 'Preset not found' };
    }

    // Apply the loadout
    return this.updateLoadout(userId, {
      skinId: preset.loadout.skinId || null,
      eyesId: preset.loadout.eyesId || null,
      outfitId: preset.loadout.outfitId || null,
      headwearId: preset.loadout.headwearId || null,
      footwearId: preset.loadout.footwearId || null,
      accessory1Id: preset.loadout.accessory1Id || null,
      accessory2Id: preset.loadout.accessory2Id || null,
      accessory3Id: preset.loadout.accessory3Id || null,
      auraId: preset.loadout.auraId || null,
      emoteVictoryId: preset.loadout.emoteVictoryId || null,
      emoteIdleId: preset.loadout.emoteIdleId || null,
      backgroundId: preset.loadout.backgroundId || null,
    });
  },

  /**
   * Delete a preset
   */
  async deletePreset(userId: string, presetId: string): Promise<{ success: boolean; error?: string }> {
    const result = await query(`
      DELETE FROM user_spirit_presets WHERE id = $1 AND user_id = $2
    `, [presetId, userId]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Preset not found' };
    }

    return { success: true };
  },

  /**
   * Rename a preset
   */
  async renamePreset(userId: string, presetId: string, newName: string): Promise<{ success: boolean; error?: string }> {
    if (!newName || newName.length > 50) {
      return { success: false, error: 'Preset name must be 1-50 characters' };
    }

    const result = await query(`
      UPDATE user_spirit_presets
      SET preset_name = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
    `, [newName, presetId, userId]);

    if (result.rowCount === 0) {
      return { success: false, error: 'Preset not found' };
    }

    return { success: true };
  },

  // Helper to get user's Spirit Animal stage
  async getUserStage(userId: string): Promise<number> {
    const result = await queryOne<{ stage: number }>(`
      SELECT COALESCE(stage, 1) as stage FROM user_companion_state WHERE user_id = $1
    `, [userId]);
    return result?.stage ?? 1;
  },

  // Helper to map DB row to SpiritCosmetic
  mapCosmetic(row: {
    id: string;
    item_key: string;
    name: string;
    description: string | null;
    category: string;
    slot: string | null;
    rarity: string;
    base_price: number;
    species_locked: string[] | null;
    stage_required: number;
    is_purchasable: boolean;
    is_tradeable: boolean;
    is_giftable: boolean;
    achievement_required: string | null;
    season: string | null;
    release_date: string;
    retirement_date: string | null;
    preview_url: string | null;
    asset_url: string | null;
  }): SpiritCosmetic {
    return {
      id: row.id,
      itemKey: row.item_key,
      name: row.name,
      description: row.description,
      category: row.category,
      slot: row.slot,
      rarity: row.rarity,
      basePrice: row.base_price,
      speciesLocked: row.species_locked,
      stageRequired: row.stage_required,
      isPurchasable: row.is_purchasable,
      isTradeable: row.is_tradeable,
      isGiftable: row.is_giftable,
      achievementRequired: row.achievement_required,
      season: row.season,
      releaseDate: row.release_date,
      retirementDate: row.retirement_date,
      previewUrl: row.preview_url,
      assetUrl: row.asset_url,
    };
  },
};
