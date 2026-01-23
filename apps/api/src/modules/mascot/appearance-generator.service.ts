/**
 * Mascot Appearance Generator Service
 *
 * Generates deterministic visual traits for mascots based on user ID and archetype.
 * Uses seeded random generation to ensure consistency while allowing uniqueness.
 *
 * Key features:
 * - Deterministic: Same user ID always produces the same base appearance
 * - Archetype-influenced: User's archetype affects base traits
 * - Stage-dependent: More features unlock at higher stages
 * - Cosmetic-override: Equipped cosmetics replace generated traits
 */

import crypto from 'crypto';
import { queryOne } from '../../db/client';

// =====================================================
// TYPES
// =====================================================

export interface MascotBaseTraits {
  // Core identity
  species: string;
  bodyShape: string;
  baseColor: string;
  secondaryColor: string;
  accentColor: string;

  // Facial features
  eyeStyle: string;
  eyeColor: string;
  mouthStyle: string;
  expressionDefault: string;

  // Body features
  earStyle: string;
  tailStyle: string;
  patternType: string;
  patternIntensity: number; // 0.0-1.0

  // Personality indicators (affects animations)
  energyLevel: 'calm' | 'moderate' | 'energetic' | 'hyperactive';
  demeanor: 'shy' | 'friendly' | 'confident' | 'bold';
}

export interface MascotAppearance {
  // Base traits (seeded, never change)
  base: MascotBaseTraits;

  // Stage-dependent features
  stageFeatures: {
    stage: number;
    auraUnlocked: boolean;
    wingsUnlocked: boolean;
    specialEffectsUnlocked: boolean;
    evolutionGlow: boolean;
  };

  // Equipped cosmetics (override base)
  equipped: {
    skin: string | null;
    eyes: string | null;
    outfit: string | null;
    headwear: string | null;
    footwear: string | null;
    accessory1: string | null;
    accessory2: string | null;
    accessory3: string | null;
    aura: string | null;
    background: string | null;
    emoteVictory: string | null;
    emoteIdle: string | null;
  };

  // Computed final appearance
  final: {
    renderSeed: string; // Unique seed for 3D renderer
    colorPalette: string[]; // Final colors to use
    activeEffects: string[]; // Active visual effects
  };
}

export interface SeededRandom {
  next(): number;
  nextInt(max: number): number;
  pick<T>(array: T[]): T;
  pickWeighted<T>(items: { item: T; weight: number }[]): T;
}

// =====================================================
// CONSTANTS
// =====================================================

// Species by archetype affinity
const SPECIES_BY_ARCHETYPE: Record<string, { item: string; weight: number }[]> = {
  strength: [
    { item: 'bear', weight: 30 },
    { item: 'wolf', weight: 25 },
    { item: 'gorilla', weight: 20 },
    { item: 'dragon', weight: 15 },
    { item: 'lion', weight: 10 },
  ],
  endurance: [
    { item: 'wolf', weight: 30 },
    { item: 'hawk', weight: 25 },
    { item: 'stag', weight: 20 },
    { item: 'cheetah', weight: 15 },
    { item: 'fox', weight: 10 },
  ],
  flexibility: [
    { item: 'cat', weight: 30 },
    { item: 'serpent', weight: 25 },
    { item: 'phoenix', weight: 20 },
    { item: 'octopus', weight: 15 },
    { item: 'fox', weight: 10 },
  ],
  power: [
    { item: 'tiger', weight: 30 },
    { item: 'dragon', weight: 25 },
    { item: 'lion', weight: 20 },
    { item: 'bull', weight: 15 },
    { item: 'eagle', weight: 10 },
  ],
  balance: [
    { item: 'fox', weight: 25 },
    { item: 'owl', weight: 20 },
    { item: 'deer', weight: 20 },
    { item: 'crane', weight: 20 },
    { item: 'turtle', weight: 15 },
  ],
  default: [
    { item: 'fox', weight: 20 },
    { item: 'wolf', weight: 20 },
    { item: 'bear', weight: 15 },
    { item: 'cat', weight: 15 },
    { item: 'owl', weight: 15 },
    { item: 'dragon', weight: 15 },
  ],
};

const BODY_SHAPES = ['athletic', 'stocky', 'lean', 'fluffy', 'sleek', 'muscular'];

const BASE_COLORS = [
  // Warm tones
  '#FF6B6B', '#FF8E53', '#FFA94D', '#FFD93D', '#F9844A',
  // Cool tones
  '#4ECDC4', '#45B7D1', '#6C5CE7', '#A29BFE', '#74B9FF',
  // Earth tones
  '#8B7355', '#A0522D', '#CD853F', '#D2691E', '#BC8F8F',
  // Neutral tones
  '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7',
  // Special
  '#E056FD', '#F8B500', '#00CED1', '#9B59B6', '#1ABC9C',
];

const EYE_STYLES = ['round', 'almond', 'wide', 'narrow', 'fierce', 'gentle', 'mystical'];
const EYE_COLORS = ['#3498DB', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C', '#E056FD', '#34495E', '#FFD700'];
const MOUTH_STYLES = ['smile', 'grin', 'neutral', 'determined', 'playful', 'content'];
const EAR_STYLES = ['pointed', 'rounded', 'folded', 'long', 'small', 'tufted'];
const TAIL_STYLES = ['bushy', 'sleek', 'short', 'long', 'curled', 'none'];
const PATTERN_TYPES = ['solid', 'striped', 'spotted', 'gradient', 'patches', 'marbled'];
const EXPRESSIONS = ['happy', 'focused', 'determined', 'relaxed', 'excited', 'peaceful'];

// =====================================================
// SEEDED RANDOM GENERATOR
// =====================================================

function createSeededRandom(seed: string): SeededRandom {
  // Create a hash from the seed
  const hash = crypto.createHash('sha256').update(seed).digest();
  let index = 0;

  const next = (): number => {
    // Use 4 bytes at a time to generate a number between 0 and 1
    const value = hash.readUInt32BE(index % (hash.length - 4));
    index = (index + 4) % (hash.length - 4);
    return value / 0xFFFFFFFF;
  };

  const nextInt = (max: number): number => {
    return Math.floor(next() * max);
  };

  const pick = <T>(array: T[]): T => {
    return array[nextInt(array.length)];
  };

  const pickWeighted = <T>(items: { item: T; weight: number }[]): T => {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let random = next() * totalWeight;

    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }

    return items[items.length - 1].item;
  };

  return { next, nextInt, pick, pickWeighted };
}

// =====================================================
// SERVICE
// =====================================================

export const appearanceGeneratorService = {
  /**
   * Generate base traits for a mascot based on user ID and archetype
   * These traits are deterministic and never change once generated
   */
  generateBaseTraits(userId: string, archetype: string | null = null): MascotBaseTraits {
    // Create a stable seed from user ID
    const seed = `mascot-v1-${userId}`;
    const rng = createSeededRandom(seed);

    // Select species based on archetype affinity
    const archetypeKey = archetype?.toLowerCase() || 'default';
    const speciesOptions = SPECIES_BY_ARCHETYPE[archetypeKey] || SPECIES_BY_ARCHETYPE.default;
    const species = rng.pickWeighted(speciesOptions);

    // Generate colors
    const baseColor = rng.pick(BASE_COLORS);
    const secondaryColor = rng.pick(BASE_COLORS.filter(c => c !== baseColor));
    const accentColor = rng.pick(BASE_COLORS.filter(c => c !== baseColor && c !== secondaryColor));

    // Generate features
    const bodyShape = rng.pick(BODY_SHAPES);
    const eyeStyle = rng.pick(EYE_STYLES);
    const eyeColor = rng.pick(EYE_COLORS);
    const mouthStyle = rng.pick(MOUTH_STYLES);
    const earStyle = rng.pick(EAR_STYLES);
    const tailStyle = rng.pick(TAIL_STYLES);
    const patternType = rng.pick(PATTERN_TYPES);
    const patternIntensity = Math.round(rng.next() * 100) / 100;
    const expressionDefault = rng.pick(EXPRESSIONS);

    // Generate personality traits
    const energyLevel = rng.pick(['calm', 'moderate', 'energetic', 'hyperactive'] as const);
    const demeanor = rng.pick(['shy', 'friendly', 'confident', 'bold'] as const);

    return {
      species,
      bodyShape,
      baseColor,
      secondaryColor,
      accentColor,
      eyeStyle,
      eyeColor,
      mouthStyle,
      expressionDefault,
      earStyle,
      tailStyle,
      patternType,
      patternIntensity,
      energyLevel,
      demeanor,
    };
  },

  /**
   * Get stage-dependent features
   */
  getStageFeatures(stage: number): MascotAppearance['stageFeatures'] {
    return {
      stage,
      auraUnlocked: stage >= 2,
      wingsUnlocked: stage >= 4,
      specialEffectsUnlocked: stage >= 5,
      evolutionGlow: stage >= 6,
    };
  },

  /**
   * Generate a unique render seed for 3D rendering
   * Combines user ID with current cosmetic state
   */
  generateRenderSeed(userId: string, equipped: MascotAppearance['equipped']): string {
    const equippedString = JSON.stringify(equipped);
    return crypto
      .createHash('md5')
      .update(`render-${userId}-${equippedString}`)
      .digest('hex')
      .substring(0, 16);
  },

  /**
   * Compute final color palette based on base traits and equipped cosmetics
   */
  computeColorPalette(base: MascotBaseTraits, equipped: MascotAppearance['equipped']): string[] {
    // Start with base colors
    const colors = [base.baseColor, base.secondaryColor, base.accentColor];

    // If a skin cosmetic is equipped, it might override base colors
    // (In a real implementation, you'd look up the cosmetic's color palette)
    if (equipped.skin) {
      // For now, keep base colors but cosmetics could override
    }

    return colors;
  },

  /**
   * Determine active visual effects based on stage and equipped items
   */
  computeActiveEffects(
    stageFeatures: MascotAppearance['stageFeatures'],
    equipped: MascotAppearance['equipped']
  ): string[] {
    const effects: string[] = [];

    // Stage-based effects
    if (stageFeatures.auraUnlocked && equipped.aura) {
      effects.push(`aura:${equipped.aura}`);
    }

    if (stageFeatures.wingsUnlocked) {
      effects.push('wings');
    }

    if (stageFeatures.specialEffectsUnlocked) {
      effects.push('particles');
    }

    if (stageFeatures.evolutionGlow) {
      effects.push('evolution_glow');
    }

    return effects;
  },

  /**
   * Get full mascot appearance for a user
   */
  async getFullAppearance(userId: string): Promise<MascotAppearance> {
    // Get user's archetype and companion state
    const userData = await queryOne<{
      current_identity_id: string | null;
    }>(`SELECT current_identity_id FROM users WHERE id = $1`, [userId]);

    const companionState = await queryOne<{
      stage: number;
      equipped_cosmetics: Record<string, string | null>;
    }>(`
      SELECT stage, equipped_cosmetics
      FROM user_companion_state
      WHERE user_id = $1
    `, [userId]);

    // Get loadout from spirit loadout table
    const loadout = await queryOne<{
      skin_id: string | null;
      eyes_id: string | null;
      outfit_id: string | null;
      headwear_id: string | null;
      footwear_id: string | null;
      accessory_1_id: string | null;
      accessory_2_id: string | null;
      accessory_3_id: string | null;
      aura_id: string | null;
      background_id: string | null;
      emote_victory_id: string | null;
      emote_idle_id: string | null;
    }>(`SELECT * FROM user_spirit_loadout WHERE user_id = $1`, [userId]);

    // Generate base traits
    const base = this.generateBaseTraits(userId, userData?.current_identity_id);

    // Get stage features
    const stage = companionState?.stage || 1;
    const stageFeatures = this.getStageFeatures(stage);

    // Build equipped object
    const equipped: MascotAppearance['equipped'] = {
      skin: loadout?.skin_id || null,
      eyes: loadout?.eyes_id || null,
      outfit: loadout?.outfit_id || null,
      headwear: loadout?.headwear_id || null,
      footwear: loadout?.footwear_id || null,
      accessory1: loadout?.accessory_1_id || null,
      accessory2: loadout?.accessory_2_id || null,
      accessory3: loadout?.accessory_3_id || null,
      aura: loadout?.aura_id || null,
      background: loadout?.background_id || null,
      emoteVictory: loadout?.emote_victory_id || null,
      emoteIdle: loadout?.emote_idle_id || null,
    };

    // Compute final values
    const renderSeed = this.generateRenderSeed(userId, equipped);
    const colorPalette = this.computeColorPalette(base, equipped);
    const activeEffects = this.computeActiveEffects(stageFeatures, equipped);

    return {
      base,
      stageFeatures,
      equipped,
      final: {
        renderSeed,
        colorPalette,
        activeEffects,
      },
    };
  },

  /**
   * Get simplified appearance for preview (without database lookup)
   * Used for quick rendering with known parameters
   */
  getPreviewAppearance(
    userId: string,
    archetype: string | null,
    stage: number,
    equipped: Partial<MascotAppearance['equipped']> = {}
  ): MascotAppearance {
    const base = this.generateBaseTraits(userId, archetype);
    const stageFeatures = this.getStageFeatures(stage);

    const fullEquipped: MascotAppearance['equipped'] = {
      skin: equipped.skin || null,
      eyes: equipped.eyes || null,
      outfit: equipped.outfit || null,
      headwear: equipped.headwear || null,
      footwear: equipped.footwear || null,
      accessory1: equipped.accessory1 || null,
      accessory2: equipped.accessory2 || null,
      accessory3: equipped.accessory3 || null,
      aura: equipped.aura || null,
      background: equipped.background || null,
      emoteVictory: equipped.emoteVictory || null,
      emoteIdle: equipped.emoteIdle || null,
    };

    const renderSeed = this.generateRenderSeed(userId, fullEquipped);
    const colorPalette = this.computeColorPalette(base, fullEquipped);
    const activeEffects = this.computeActiveEffects(stageFeatures, fullEquipped);

    return {
      base,
      stageFeatures,
      equipped: fullEquipped,
      final: {
        renderSeed,
        colorPalette,
        activeEffects,
      },
    };
  },

  /**
   * Get animation config based on mascot personality
   */
  getAnimationConfig(base: MascotBaseTraits): {
    idleSpeed: number;
    movementAmplitude: number;
    blinkRate: number;
    bounciness: number;
    breathingDepth: number;
  } {
    // Base values
    let idleSpeed = 1.0;
    let movementAmplitude = 0.1;
    let blinkRate = 0.05;
    let bounciness = 0.5;
    let breathingDepth = 0.03;

    // Adjust based on energy level
    switch (base.energyLevel) {
      case 'calm':
        idleSpeed = 0.6;
        movementAmplitude = 0.05;
        bounciness = 0.3;
        breathingDepth = 0.02;
        break;
      case 'moderate':
        idleSpeed = 1.0;
        movementAmplitude = 0.1;
        bounciness = 0.5;
        break;
      case 'energetic':
        idleSpeed = 1.3;
        movementAmplitude = 0.15;
        bounciness = 0.7;
        blinkRate = 0.07;
        break;
      case 'hyperactive':
        idleSpeed = 1.6;
        movementAmplitude = 0.2;
        bounciness = 0.9;
        blinkRate = 0.1;
        break;
    }

    // Adjust based on demeanor
    switch (base.demeanor) {
      case 'shy':
        movementAmplitude *= 0.7;
        breathingDepth *= 1.2;
        break;
      case 'confident':
        movementAmplitude *= 1.2;
        bounciness *= 1.1;
        break;
      case 'bold':
        movementAmplitude *= 1.3;
        bounciness *= 1.2;
        break;
    }

    return {
      idleSpeed: Math.round(idleSpeed * 100) / 100,
      movementAmplitude: Math.round(movementAmplitude * 1000) / 1000,
      blinkRate: Math.round(blinkRate * 1000) / 1000,
      bounciness: Math.round(bounciness * 100) / 100,
      breathingDepth: Math.round(breathingDepth * 1000) / 1000,
    };
  },

  /**
   * Get reaction animation based on event type
   */
  getReactionAnimation(eventType: string, base: MascotBaseTraits): {
    animationName: string;
    duration: number;
    intensity: number;
    soundEffect: string | null;
  } {
    const reactions: Record<string, { animation: string; duration: number; baseSoundEffect: string | null }> = {
      workout_logged: { animation: 'celebrate', duration: 2000, baseSoundEffect: 'cheer' },
      pr_set: { animation: 'jump_excited', duration: 3000, baseSoundEffect: 'fanfare' },
      streak_hit: { animation: 'dance', duration: 2500, baseSoundEffect: 'jingle' },
      goal_progress: { animation: 'thumbs_up', duration: 1500, baseSoundEffect: 'ding' },
      stage_evolved: { animation: 'evolution_burst', duration: 4000, baseSoundEffect: 'power_up' },
      badge_awarded: { animation: 'pose_proud', duration: 2500, baseSoundEffect: 'achievement' },
      error: { animation: 'confused', duration: 1500, baseSoundEffect: null },
      idle_long: { animation: 'yawn', duration: 2000, baseSoundEffect: null },
      greeting: { animation: 'wave', duration: 1500, baseSoundEffect: 'hello' },
    };

    const reaction = reactions[eventType] || { animation: 'idle', duration: 1000, baseSoundEffect: null };

    // Adjust intensity based on personality
    let intensity = 1.0;
    if (base.energyLevel === 'hyperactive') intensity = 1.3;
    if (base.energyLevel === 'calm') intensity = 0.7;
    if (base.demeanor === 'bold') intensity *= 1.1;
    if (base.demeanor === 'shy') intensity *= 0.8;

    return {
      animationName: reaction.animation,
      duration: reaction.duration,
      intensity: Math.round(intensity * 100) / 100,
      soundEffect: reaction.baseSoundEffect,
    };
  },
};

export default appearanceGeneratorService;
