/**
 * MuscleMap Dual Mascot System
 *
 * This system has TWO DISTINCT MASCOT TYPES:
 *
 * 1. Global Site Mascot (TЯIPTθMΞAN Spirit)
 *    - Static, unchanging brand symbol
 *    - Appears at key site locations (hero, loading, about)
 *    - Links to TripToMean ecosystem
 *    - Same for all users
 *
 * 2. User Companion Creatures
 *    - Personal evolving mascot (6 stages)
 *    - Persistent dock widget
 *    - Costs training units to upgrade
 *    - Unique per user
 */

// Global Mascot exports
export {
  useGlobalMascot,
  GlobalMascot2D,
  GlobalMascot3D,
  GlobalMascotHero,
  GlobalMascotLoader,
  GlobalMascotFullLoader,
  GlobalMascotAbout,
} from './global';

// User Companion exports
export {
  CompanionProvider,
  useCompanion,
  CompanionCharacter,
  CompanionReaction,
  CompanionDock,
  CompanionProgress,
  CompanionPanel,
} from './companion';

// Mascot Powers exports
export {
  MascotPowerCard,
  MascotBuffDisplay,
  MascotEvolutionPath,
} from './powers';
