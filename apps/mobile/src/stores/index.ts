/**
 * Store Exports
 *
 * Central export point for all Zustand stores and their convenience hooks.
 */

// Auth Store
export { useAuthStore } from './auth';

// Onboarding Store
export { useOnboardingStore } from './onboarding';

// UI Store
export {
  useUIStore,
  useToast,
  useModal,
  useConfirm,
  useGlobalLoading,
  type Toast,
  type ToastType,
  type Modal,
  type ModalType,
  type ConfirmOptions,
  type ThemeMode,
} from './ui';

// Workout Session Store
export {
  useWorkoutSessionStore,
  useRestTimer,
  useCurrentExercise,
  useWorkoutMetrics,
  type Exercise,
  type PrescribedExercise,
  type CompletedSet,
  type WorkoutSession,
  type SpiritAnimalMood,
} from './workoutSession';

// Spirit Animal Store
export {
  useSpiritAnimalStore,
  useSpiritAnimalDisplay,
  useSpiritAnimalCustomizer,
  SPIRIT_ANIMAL_SPECIES,
  EVOLUTION_STAGE_NAMES,
  EVOLUTION_XP_THRESHOLDS,
  WEALTH_TIER_NAMES,
  type SpiritAnimalSpecies,
  type EvolutionStage,
  type SpiritAnimalCosmetics,
  type WealthTier,
} from './spiritAnimal';

// Offline Store
export {
  useOfflineStore,
  useOfflineStatus,
  useOfflineQueue,
  initializeNetworkListener,
  type OfflineAction,
  type OfflineActionType,
  type SyncStatus,
  type SyncResult,
  type LogSetPayload,
  type CompleteWorkoutPayload,
  type EarnCreditsPayload,
} from './offline';
