/**
 * Spirit Animal Store
 *
 * Manages Spirit Animal state:
 * - Current species and evolution stage
 * - Equipped cosmetics
 * - Customization preview (before saving)
 * - Animation state
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/**
 * Spirit Animal species - each tied to a goal archetype
 */
export type SpiritAnimalSpecies =
  | 'phoenix' // Warrior - raw strength
  | 'golem' // Builder - hypertrophy
  | 'wolf' // Guardian - protective strength
  | 'owl' // Sage - functional movement
  | 'fox' // Scout - speed/agility
  | 'serpent' // Healer - recovery
  | 'lion' // Champion - competitive
  | 'raven'; // Nomad - versatility

/**
 * Evolution stage (1-6, earned through XP)
 */
export type EvolutionStage = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Stage names for display
 */
export const EVOLUTION_STAGE_NAMES: Record<EvolutionStage, string> = {
  1: 'Hatchling',
  2: 'Juvenile',
  3: 'Adolescent',
  4: 'Adult',
  5: 'Mature',
  6: 'Legendary',
};

/**
 * XP thresholds for each stage
 */
export const EVOLUTION_XP_THRESHOLDS: Record<EvolutionStage, number> = {
  1: 0,
  2: 500,
  3: 2000,
  4: 5000,
  5: 10000,
  6: 25000,
};

/**
 * Cosmetic categories
 */
export interface SpiritAnimalCosmetics {
  skin?: string; // Color/pattern (e.g., 'ember', 'frost', 'shadow')
  outfit?: string; // Clothing/armor (e.g., 'casual', 'athletic', 'royal')
  accessory?: string; // Item (e.g., 'necklace', 'cape', 'crown')
  aura?: string; // Effect (e.g., 'flame', 'sparkle', 'mist')
  emote?: string; // Animation (e.g., 'wave', 'flex', 'dance')
}

/**
 * Mood affects idle animations
 */
export type SpiritAnimalMood =
  | 'idle'
  | 'happy'
  | 'encouraging'
  | 'cheering'
  | 'celebrating'
  | 'sleeping'
  | 'concerned';

/**
 * Wealth tier affects visual indicators (rings, crowns, etc.)
 */
export type WealthTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEALTH_TIER_NAMES: Record<WealthTier, string> = {
  0: 'Broke',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond',
  6: 'Obsidian',
};

// ============================================================================
// Store
// ============================================================================

interface SpiritAnimalState {
  // Current equipped state (synced with server)
  species: SpiritAnimalSpecies;
  stage: EvolutionStage;
  xp: number;
  cosmetics: SpiritAnimalCosmetics;
  wealthTier: WealthTier;

  // Preview state (for customization UI)
  previewCosmetics: SpiritAnimalCosmetics | null;
  isPreviewMode: boolean;

  // Animation state
  currentMood: SpiritAnimalMood;
  isAnimating: boolean;

  // Actions - Server sync
  syncFromServer: (data: {
    species: SpiritAnimalSpecies;
    stage: EvolutionStage;
    xp: number;
    cosmetics: SpiritAnimalCosmetics;
    wealthTier: WealthTier;
  }) => void;

  // Actions - Preview mode
  startPreview: () => void;
  updatePreview: (cosmetics: Partial<SpiritAnimalCosmetics>) => void;
  cancelPreview: () => void;
  applyPreview: () => SpiritAnimalCosmetics;

  // Actions - Mood
  setMood: (mood: SpiritAnimalMood) => void;
  triggerAnimation: (animation: string) => void;

  // Computed
  getDisplayCosmetics: () => SpiritAnimalCosmetics;
  getProgressToNextStage: () => { current: number; required: number; percentage: number };
  canEvolve: () => boolean;
}

export const useSpiritAnimalStore = create<SpiritAnimalState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // Initial State
    // ========================================================================
    species: 'phoenix',
    stage: 1,
    xp: 0,
    cosmetics: {},
    wealthTier: 0,

    previewCosmetics: null,
    isPreviewMode: false,

    currentMood: 'idle',
    isAnimating: false,

    // ========================================================================
    // Server Sync
    // ========================================================================
    syncFromServer: (data) => {
      set({
        species: data.species,
        stage: data.stage,
        xp: data.xp,
        cosmetics: data.cosmetics,
        wealthTier: data.wealthTier,
      });
    },

    // ========================================================================
    // Preview Mode
    // ========================================================================
    startPreview: () => {
      const { cosmetics } = get();
      set({
        previewCosmetics: { ...cosmetics },
        isPreviewMode: true,
      });
    },

    updatePreview: (updates) => {
      set((state) => ({
        previewCosmetics: state.previewCosmetics
          ? { ...state.previewCosmetics, ...updates }
          : { ...updates },
      }));
    },

    cancelPreview: () => {
      set({
        previewCosmetics: null,
        isPreviewMode: false,
      });
    },

    applyPreview: () => {
      const { previewCosmetics } = get();
      if (previewCosmetics) {
        set({
          cosmetics: previewCosmetics,
          previewCosmetics: null,
          isPreviewMode: false,
        });
        return previewCosmetics;
      }
      return get().cosmetics;
    },

    // ========================================================================
    // Mood & Animation
    // ========================================================================
    setMood: (mood) => {
      set({ currentMood: mood });
    },

    triggerAnimation: (animation) => {
      set({ isAnimating: true });
      // Animation duration (reset after animation completes)
      setTimeout(() => {
        set({ isAnimating: false });
      }, 2000);
    },

    // ========================================================================
    // Computed
    // ========================================================================
    getDisplayCosmetics: () => {
      const { isPreviewMode, previewCosmetics, cosmetics } = get();
      return isPreviewMode && previewCosmetics ? previewCosmetics : cosmetics;
    },

    getProgressToNextStage: () => {
      const { stage, xp } = get();
      if (stage >= 6) {
        return { current: xp, required: xp, percentage: 100 };
      }

      const currentThreshold = EVOLUTION_XP_THRESHOLDS[stage];
      const nextThreshold = EVOLUTION_XP_THRESHOLDS[(stage + 1) as EvolutionStage];
      const xpIntoStage = xp - currentThreshold;
      const xpRequiredForStage = nextThreshold - currentThreshold;

      return {
        current: xpIntoStage,
        required: xpRequiredForStage,
        percentage: Math.min(100, (xpIntoStage / xpRequiredForStage) * 100),
      };
    },

    canEvolve: () => {
      const { stage, xp } = get();
      if (stage >= 6) return false;
      const nextThreshold = EVOLUTION_XP_THRESHOLDS[(stage + 1) as EvolutionStage];
      return xp >= nextThreshold;
    },
  })),
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for Spirit Animal display data
 */
export function useSpiritAnimalDisplay() {
  const species = useSpiritAnimalStore((s) => s.species);
  const stage = useSpiritAnimalStore((s) => s.stage);
  const xp = useSpiritAnimalStore((s) => s.xp);
  const wealthTier = useSpiritAnimalStore((s) => s.wealthTier);
  const currentMood = useSpiritAnimalStore((s) => s.currentMood);
  const getDisplayCosmetics = useSpiritAnimalStore((s) => s.getDisplayCosmetics);
  const getProgressToNextStage = useSpiritAnimalStore((s) => s.getProgressToNextStage);

  return {
    species,
    stage,
    stageName: EVOLUTION_STAGE_NAMES[stage],
    xp,
    wealthTier,
    wealthTierName: WEALTH_TIER_NAMES[wealthTier],
    mood: currentMood,
    cosmetics: getDisplayCosmetics(),
    progress: getProgressToNextStage(),
  };
}

/**
 * Hook for Spirit Animal customization
 */
export function useSpiritAnimalCustomizer() {
  const isPreviewMode = useSpiritAnimalStore((s) => s.isPreviewMode);
  const startPreview = useSpiritAnimalStore((s) => s.startPreview);
  const updatePreview = useSpiritAnimalStore((s) => s.updatePreview);
  const cancelPreview = useSpiritAnimalStore((s) => s.cancelPreview);
  const applyPreview = useSpiritAnimalStore((s) => s.applyPreview);
  const getDisplayCosmetics = useSpiritAnimalStore((s) => s.getDisplayCosmetics);

  return {
    isPreviewMode,
    previewCosmetics: getDisplayCosmetics(),
    startPreview,
    updatePreview,
    cancelPreview,
    applyPreview,
  };
}

/**
 * Species metadata
 */
export const SPIRIT_ANIMAL_SPECIES: Record<
  SpiritAnimalSpecies,
  {
    name: string;
    archetype: string;
    description: string;
    primaryColor: string;
    secondaryColor: string;
  }
> = {
  phoenix: {
    name: 'Phoenix',
    archetype: 'Warrior',
    description: 'Reborn from flames, embodying raw strength and power',
    primaryColor: '#FF6B35',
    secondaryColor: '#FFD700',
  },
  golem: {
    name: 'Golem',
    archetype: 'Builder',
    description: 'Carved from stone, represents steady muscle growth',
    primaryColor: '#8B7355',
    secondaryColor: '#C4A484',
  },
  wolf: {
    name: 'Wolf',
    archetype: 'Guardian',
    description: 'Pack protector, symbolizing endurance and loyalty',
    primaryColor: '#4A5568',
    secondaryColor: '#A0AEC0',
  },
  owl: {
    name: 'Owl',
    archetype: 'Sage',
    description: 'Wise and precise, master of functional movement',
    primaryColor: '#553C9A',
    secondaryColor: '#B794F4',
  },
  fox: {
    name: 'Fox',
    archetype: 'Scout',
    description: 'Quick and agile, excels in speed and conditioning',
    primaryColor: '#C05621',
    secondaryColor: '#FBD38D',
  },
  serpent: {
    name: 'Serpent',
    archetype: 'Healer',
    description: 'Symbol of renewal, focuses on recovery and flexibility',
    primaryColor: '#276749',
    secondaryColor: '#68D391',
  },
  lion: {
    name: 'Lion',
    archetype: 'Champion',
    description: 'King of competition, thrives on leaderboards',
    primaryColor: '#C6A000',
    secondaryColor: '#F6E05E',
  },
  raven: {
    name: 'Raven',
    archetype: 'Nomad',
    description: 'Adaptable and versatile, balanced across all areas',
    primaryColor: '#1A202C',
    secondaryColor: '#4A5568',
  },
};
