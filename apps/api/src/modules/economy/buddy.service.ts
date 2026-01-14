/**
 * Buddy Service
 *
 * Handles the Training Buddy/Companion system:
 * - Buddy creation with species selection
 * - XP and level progression
 * - Stage evolution (6 stages per species)
 * - Cosmetic equipping (aura, armor, wings, tools, skins)
 * - Ability unlocking
 * - Display settings
 */

import { queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { storeService } from './store.service';

const log = loggers.economy;

// Safe JSON parse helper - handles both strings and already-parsed JSONB values
function safeJsonParse<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;
  // If it's already an object/array (from JSONB), return it directly
  if (typeof value === 'object') return value as T;
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    if (value.trim() === '') return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

// Species options
export const BUDDY_SPECIES = ['wolf', 'bear', 'eagle', 'phoenix', 'dragon', 'tiger', 'ox', 'shark'] as const;
export type BuddySpecies = typeof BUDDY_SPECIES[number];

// Level thresholds (diminishing returns)
function calculateXpForLevel(level: number): number {
  // XP required for next level: base * level^1.5
  const base = 100;
  return Math.floor(base * Math.pow(level, 1.5));
}

export interface Buddy {
  userId: string;
  species: BuddySpecies;
  nickname?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  stage: number;
  stageName: string;
  stageDescription?: string;

  // Equipped cosmetics
  equippedAura?: string;
  equippedArmor?: string;
  equippedWings?: string;
  equippedTool?: string;
  equippedSkin?: string;
  equippedEmotePack?: string;
  equippedVoicePack?: string;

  // Unlocked abilities
  unlockedAbilities: string[];

  // Display settings
  visible: boolean;
  showOnProfile: boolean;
  showInWorkouts: boolean;

  // Stats
  totalXpEarned: number;
  workoutsTogether: number;
  streaksWitnessed: number;
  prsCelebrated: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface EvolutionStage {
  species: BuddySpecies;
  stage: number;
  minLevel: number;
  stageName: string;
  description?: string;
  unlockedFeatures: string[];
}

export const buddyService = {
  /**
   * Get user's buddy
   */
  async getBuddy(userId: string): Promise<Buddy | null> {
    const row = await queryOne<{
      user_id: string;
      species: string;
      nickname: string | null;
      level: number;
      xp: number;
      xp_to_next_level: number;
      stage: number;
      equipped_aura: string | null;
      equipped_armor: string | null;
      equipped_wings: string | null;
      equipped_tool: string | null;
      equipped_skin: string | null;
      equipped_emote_pack: string | null;
      equipped_voice_pack: string | null;
      unlocked_abilities: unknown;
      visible: boolean;
      show_on_profile: boolean;
      show_in_workouts: boolean;
      total_xp_earned: number;
      workouts_together: number;
      streaks_witnessed: number;
      prs_celebrated: number;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM training_buddies WHERE user_id = $1', [userId]);

    if (!row) return null;

    // Get stage info
    const stageInfo = await this.getStageInfo(row.species as BuddySpecies, row.stage);

    return {
      userId: row.user_id,
      species: row.species as BuddySpecies,
      nickname: row.nickname ?? undefined,
      level: row.level,
      xp: row.xp,
      xpToNextLevel: row.xp_to_next_level,
      stage: row.stage,
      stageName: stageInfo?.stageName || `${row.species} Stage ${row.stage}`,
      stageDescription: stageInfo?.description,
      equippedAura: row.equipped_aura ?? undefined,
      equippedArmor: row.equipped_armor ?? undefined,
      equippedWings: row.equipped_wings ?? undefined,
      equippedTool: row.equipped_tool ?? undefined,
      equippedSkin: row.equipped_skin ?? undefined,
      equippedEmotePack: row.equipped_emote_pack ?? undefined,
      equippedVoicePack: row.equipped_voice_pack ?? undefined,
      unlockedAbilities: safeJsonParse<string[]>(row.unlocked_abilities, []),
      visible: row.visible,
      showOnProfile: row.show_on_profile,
      showInWorkouts: row.show_in_workouts,
      totalXpEarned: row.total_xp_earned || 0,
      workoutsTogether: row.workouts_together || 0,
      streaksWitnessed: row.streaks_witnessed || 0,
      prsCelebrated: row.prs_celebrated || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Create a new buddy for user
   */
  async createBuddy(userId: string, species: BuddySpecies, nickname?: string): Promise<Buddy> {
    // Check if user already has a buddy
    const existing = await this.getBuddy(userId);
    if (existing) {
      throw new ValidationError('You already have a training buddy');
    }

    // Validate species
    if (!BUDDY_SPECIES.includes(species)) {
      throw new ValidationError(`Invalid species. Choose from: ${BUDDY_SPECIES.join(', ')}`);
    }

    // Check if user owns this species (wolf is free, others require purchase)
    if (species !== 'wolf') {
      const sku = `buddy_species_${species}`;
      const owns = await storeService.ownsItem(userId, sku);
      if (!owns) {
        throw new ValidationError(`You need to purchase the ${species} companion first`);
      }
    }

    const xpToNextLevel = calculateXpForLevel(1);

    await query(
      `INSERT INTO training_buddies (user_id, species, nickname, xp_to_next_level)
       VALUES ($1, $2, $3, $4)`,
      [userId, species, nickname || null, xpToNextLevel]
    );

    log.info({ userId, species, nickname }, 'Training buddy created');

    const buddy = await this.getBuddy(userId);
    return buddy!;
  },

  /**
   * Change buddy species (if user owns the new species)
   */
  async changeSpecies(userId: string, newSpecies: BuddySpecies): Promise<Buddy> {
    const buddy = await this.getBuddy(userId);
    if (!buddy) {
      throw new NotFoundError('You don\'t have a training buddy');
    }

    if (buddy.species === newSpecies) {
      throw new ValidationError('Your buddy is already this species');
    }

    // Validate species
    if (!BUDDY_SPECIES.includes(newSpecies)) {
      throw new ValidationError(`Invalid species. Choose from: ${BUDDY_SPECIES.join(', ')}`);
    }

    // Check ownership (wolf is free)
    if (newSpecies !== 'wolf') {
      const sku = `buddy_species_${newSpecies}`;
      const owns = await storeService.ownsItem(userId, sku);
      if (!owns) {
        throw new ValidationError(`You need to purchase the ${newSpecies} companion first`);
      }
    }

    // Update species (keep level, XP, etc.)
    await query(
      `UPDATE training_buddies SET species = $1, updated_at = NOW() WHERE user_id = $2`,
      [newSpecies, userId]
    );

    // Update stage based on new species thresholds
    await this.checkEvolution(userId);

    log.info({ userId, oldSpecies: buddy.species, newSpecies }, 'Buddy species changed');

    return (await this.getBuddy(userId))!;
  },

  /**
   * Set buddy nickname
   */
  async setNickname(userId: string, nickname: string | null): Promise<void> {
    if (nickname && nickname.length > 30) {
      throw new ValidationError('Nickname must be 30 characters or less');
    }

    await query(
      `UPDATE training_buddies SET nickname = $1, updated_at = NOW() WHERE user_id = $2`,
      [nickname, userId]
    );

    log.info({ userId, nickname }, 'Buddy nickname updated');
  },

  /**
   * Add XP to buddy
   */
  async addXp(userId: string, xp: number): Promise<{
    newXp: number;
    newLevel: number;
    leveledUp: boolean;
    newStage: number;
    evolved: boolean;
  }> {
    if (xp <= 0) {
      return { newXp: 0, newLevel: 1, leveledUp: false, newStage: 1, evolved: false };
    }

    const buddy = await this.getBuddy(userId);
    if (!buddy) {
      // No buddy - just track XP on user for later
      await query(
        `UPDATE users SET buddy_xp_total = COALESCE(buddy_xp_total, 0) + $1 WHERE id = $2`,
        [xp, userId]
      );
      return { newXp: xp, newLevel: 0, leveledUp: false, newStage: 0, evolved: false };
    }

    const result = await serializableTransaction(async (client) => {
      // Get current state with lock
      const current = await client.query<{
        level: number;
        xp: number;
        xp_to_next_level: number;
        stage: number;
      }>(
        'SELECT level, xp, xp_to_next_level, stage FROM training_buddies WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (current.rows.length === 0) {
        throw new NotFoundError('Buddy not found');
      }

      let { level, xp: currentXp, xp_to_next_level: xpToNextLevel, stage } = current.rows[0];
      currentXp += xp;
      let leveledUp = false;
      let _evolved = false;

      // Process level ups
      while (currentXp >= xpToNextLevel && level < 100) {
        currentXp -= xpToNextLevel;
        level++;
        xpToNextLevel = calculateXpForLevel(level);
        leveledUp = true;
      }

      // Cap at level 100
      if (level >= 100) {
        level = 100;
        currentXp = Math.min(currentXp, 0);
        xpToNextLevel = 0;
      }

      // Update buddy
      await client.query(
        `UPDATE training_buddies
         SET xp = $1, level = $2, xp_to_next_level = $3,
             total_xp_earned = COALESCE(total_xp_earned, 0) + $4,
             updated_at = NOW()
         WHERE user_id = $5`,
        [currentXp, level, xpToNextLevel, xp, userId]
      );

      return { newXp: currentXp, newLevel: level, leveledUp, currentStage: stage };
    });

    // Check for evolution (outside transaction for simplicity)
    let newStage = result.currentStage;
    let evolved = false;

    if (result.leveledUp) {
      const evolutionResult = await this.checkEvolution(userId);
      if (evolutionResult.evolved) {
        newStage = evolutionResult.newStage;
        evolved = true;
      }
    }

    log.info({
      userId,
      xpAdded: xp,
      newLevel: result.newLevel,
      leveledUp: result.leveledUp,
      newStage,
      evolved,
    }, 'XP added to buddy');

    return {
      newXp: result.newXp,
      newLevel: result.newLevel,
      leveledUp: result.leveledUp,
      newStage,
      evolved,
    };
  },

  /**
   * Check and apply evolution based on level
   */
  async checkEvolution(userId: string): Promise<{ evolved: boolean; newStage: number; stageName?: string }> {
    const buddy = await this.getBuddy(userId);
    if (!buddy) {
      return { evolved: false, newStage: 0 };
    }

    // Get evolution thresholds for this species
    const thresholds = await queryAll<{
      stage: number;
      min_level: number;
      stage_name: string;
    }>(
      `SELECT stage, min_level, stage_name
       FROM buddy_evolution_thresholds
       WHERE species = $1
       ORDER BY stage DESC`,
      [buddy.species]
    );

    // Find the highest stage the buddy qualifies for
    let newStage = 1;
    let stageName = '';
    for (const threshold of thresholds) {
      if (buddy.level >= threshold.min_level) {
        newStage = threshold.stage;
        stageName = threshold.stage_name;
        break;
      }
    }

    if (newStage !== buddy.stage) {
      await query(
        `UPDATE training_buddies SET stage = $1, updated_at = NOW() WHERE user_id = $2`,
        [newStage, userId]
      );

      log.info({
        userId,
        species: buddy.species,
        oldStage: buddy.stage,
        newStage,
        stageName,
      }, 'Buddy evolved!');

      return { evolved: true, newStage, stageName };
    }

    return { evolved: false, newStage: buddy.stage };
  },

  /**
   * Get stage info for a species
   */
  async getStageInfo(species: BuddySpecies, stage: number): Promise<EvolutionStage | null> {
    const row = await queryOne<{
      species: string;
      stage: number;
      min_level: number;
      stage_name: string;
      description: string | null;
      unlocked_features: unknown;
    }>(
      'SELECT * FROM buddy_evolution_thresholds WHERE species = $1 AND stage = $2',
      [species, stage]
    );

    if (!row) return null;

    return {
      species: row.species as BuddySpecies,
      stage: row.stage,
      minLevel: row.min_level,
      stageName: row.stage_name,
      description: row.description ?? undefined,
      unlockedFeatures: safeJsonParse<string[]>(row.unlocked_features, []),
    };
  },

  /**
   * Get all evolution stages for a species
   */
  async getEvolutionPath(species: BuddySpecies): Promise<EvolutionStage[]> {
    const rows = await queryAll<{
      species: string;
      stage: number;
      min_level: number;
      stage_name: string;
      description: string | null;
      unlocked_features: unknown;
    }>(
      'SELECT * FROM buddy_evolution_thresholds WHERE species = $1 ORDER BY stage',
      [species]
    );

    return rows.map((r) => ({
      species: r.species as BuddySpecies,
      stage: r.stage,
      minLevel: r.min_level,
      stageName: r.stage_name,
      description: r.description ?? undefined,
      unlockedFeatures: safeJsonParse<string[]>(r.unlocked_features, []),
    }));
  },

  /**
   * Equip a cosmetic item
   */
  async equipCosmetic(userId: string, sku: string, slot: string): Promise<void> {
    const buddy = await this.getBuddy(userId);
    if (!buddy) {
      throw new NotFoundError('You don\'t have a training buddy');
    }

    // Validate slot
    const validSlots = ['aura', 'armor', 'wings', 'tool', 'skin', 'emote_pack', 'voice_pack'];
    if (!validSlots.includes(slot)) {
      throw new ValidationError(`Invalid slot. Choose from: ${validSlots.join(', ')}`);
    }

    // Check ownership
    const owns = await storeService.ownsItem(userId, sku);
    if (!owns) {
      throw new ValidationError('You don\'t own this item');
    }

    // Verify item is for this slot
    const item = await storeService.getItem(sku);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    const expectedCategory = `buddy_${slot}`;
    if (item.category !== expectedCategory) {
      throw new ValidationError(`This item is not for the ${slot} slot`);
    }

    // Equip
    const column = `equipped_${slot}`;
    await query(
      `UPDATE training_buddies SET ${column} = $1, updated_at = NOW() WHERE user_id = $2`,
      [sku, userId]
    );

    log.info({ userId, sku, slot }, 'Buddy cosmetic equipped');
  },

  /**
   * Unequip a cosmetic from a slot
   */
  async unequipCosmetic(userId: string, slot: string): Promise<void> {
    const buddy = await this.getBuddy(userId);
    if (!buddy) {
      throw new NotFoundError('You don\'t have a training buddy');
    }

    const validSlots = ['aura', 'armor', 'wings', 'tool', 'skin', 'emote_pack', 'voice_pack'];
    if (!validSlots.includes(slot)) {
      throw new ValidationError(`Invalid slot. Choose from: ${validSlots.join(', ')}`);
    }

    const column = `equipped_${slot}`;
    await query(
      `UPDATE training_buddies SET ${column} = NULL, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );

    log.info({ userId, slot }, 'Buddy cosmetic unequipped');
  },

  /**
   * Unlock an ability for the buddy
   */
  async unlockAbility(userId: string, abilitySku: string): Promise<void> {
    const buddy = await this.getBuddy(userId);
    if (!buddy) {
      throw new NotFoundError('You don\'t have a training buddy');
    }

    // Check ownership
    const owns = await storeService.ownsItem(userId, abilitySku);
    if (!owns) {
      throw new ValidationError('You don\'t own this ability');
    }

    // Verify it's an ability item
    const item = await storeService.getItem(abilitySku);
    if (!item || item.category !== 'buddy_ability') {
      throw new ValidationError('This is not a buddy ability');
    }

    // Check if already unlocked
    if (buddy.unlockedAbilities.includes(abilitySku)) {
      throw new ValidationError('This ability is already unlocked');
    }

    // Add to unlocked abilities
    const newAbilities = [...buddy.unlockedAbilities, abilitySku];
    await query(
      `UPDATE training_buddies SET unlocked_abilities = $1, updated_at = NOW() WHERE user_id = $2`,
      [JSON.stringify(newAbilities), userId]
    );

    log.info({ userId, abilitySku }, 'Buddy ability unlocked');
  },

  /**
   * Update display settings
   */
  async updateDisplaySettings(userId: string, settings: {
    visible?: boolean;
    showOnProfile?: boolean;
    showInWorkouts?: boolean;
  }): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (settings.visible !== undefined) {
      updates.push(`visible = $${paramIndex++}`);
      params.push(settings.visible);
    }

    if (settings.showOnProfile !== undefined) {
      updates.push(`show_on_profile = $${paramIndex++}`);
      params.push(settings.showOnProfile);
    }

    if (settings.showInWorkouts !== undefined) {
      updates.push(`show_in_workouts = $${paramIndex++}`);
      params.push(settings.showInWorkouts);
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    await query(
      `UPDATE training_buddies SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      params
    );

    log.info({ userId, settings }, 'Buddy display settings updated');
  },

  /**
   * Increment buddy stats
   */
  async incrementStats(userId: string, stats: {
    workoutsTogether?: number;
    streaksWitnessed?: number;
    prsCelebrated?: number;
  }): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (stats.workoutsTogether) {
      updates.push(`workouts_together = COALESCE(workouts_together, 0) + $${paramIndex++}`);
      params.push(stats.workoutsTogether);
    }

    if (stats.streaksWitnessed) {
      updates.push(`streaks_witnessed = COALESCE(streaks_witnessed, 0) + $${paramIndex++}`);
      params.push(stats.streaksWitnessed);
    }

    if (stats.prsCelebrated) {
      updates.push(`prs_celebrated = COALESCE(prs_celebrated, 0) + $${paramIndex++}`);
      params.push(stats.prsCelebrated);
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    await query(
      `UPDATE training_buddies SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      params
    );
  },

  /**
   * Get buddy leaderboard (by level)
   */
  async getLeaderboard(options: {
    species?: BuddySpecies;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    entries: Array<{
      rank: number;
      userId: string;
      username: string;
      species: BuddySpecies;
      nickname?: string;
      level: number;
      stage: number;
      stageName: string;
    }>;
    total: number;
  }> {
    const { species, limit = 50, offset = 0 } = options;

    let whereClause = 'tb.visible = TRUE';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (species) {
      whereClause += ` AND tb.species = $${paramIndex++}`;
      params.push(species);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      user_id: string;
      username: string;
      species: string;
      nickname: string | null;
      level: number;
      stage: number;
    }>(
      `SELECT tb.user_id, u.username, tb.species, tb.nickname, tb.level, tb.stage
       FROM training_buddies tb
       JOIN users u ON u.id = tb.user_id
       WHERE ${whereClause}
       ORDER BY tb.level DESC, tb.total_xp_earned DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM training_buddies tb WHERE ${whereClause}`,
      species ? [species] : []
    );

    // Get stage names for each entry
    const entries = await Promise.all(
      rows.map(async (r, i) => {
        const stageInfo = await this.getStageInfo(r.species as BuddySpecies, r.stage);
        return {
          rank: offset + i + 1,
          userId: r.user_id,
          username: r.username,
          species: r.species as BuddySpecies,
          nickname: r.nickname ?? undefined,
          level: r.level,
          stage: r.stage,
          stageName: stageInfo?.stageName || `${r.species} Stage ${r.stage}`,
        };
      })
    );

    return {
      entries,
      total: parseInt(countResult?.count || '0', 10),
    };
  },
};

export default buddyService;
