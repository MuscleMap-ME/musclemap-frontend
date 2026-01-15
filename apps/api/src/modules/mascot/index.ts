/**
 * Mascot Module
 *
 * Provides services for both the Global Mascot and User Companions.
 * Includes all mascot powers across 6 phases:
 * - Phase 1: Workout Assist
 * - Phase 2: Credit & Economy (Streak Saver, Bonus Multiplier)
 * - Phase 3: Journey & Progress (Smart Scheduler, Form Finder)
 * - Phase 4: Social & Community (Crew Helper, Rivalry Manager)
 * - Phase 5: Account & Meta (Settings, Data Guardian)
 * - Phase 6: Advanced AI (Workout Generator, Injury Prevention)
 */

export { companionEventsService, STAGE_THRESHOLDS, XP_REWARDS, UNIT_REWARDS } from './companion-events';
export { mascotAssistService } from './assist.service';
export { mascotPowersService } from './powers.service';
export type {
  MascotAssistAbility,
  MascotAssistState,
  UseAssistResult,
  AssistLogEntry,
} from './assist.service';
export type {
  MascotEnergy,
  BonusMultiplier,
  StreakSaveConfig,
  CreditAlert,
  WorkoutSuggestion,
  MilestoneProgress,
  SocialAction,
  MascotPowersSummary,
} from './powers.service';
