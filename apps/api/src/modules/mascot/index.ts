/**
 * Mascot Module (Spirit Animal System)
 *
 * Provides services for both the Global Mascot and User Companions (Spirit Animals).
 * Includes all mascot powers across 6 phases:
 * - Phase 1: Workout Assist
 * - Phase 2: Credit & Economy (Streak Saver, Bonus Multiplier)
 * - Phase 3: Journey & Progress (Smart Scheduler, Form Finder)
 * - Phase 4: Social & Community (Crew Helper, Rivalry Manager)
 * - Phase 5: Account & Meta (Settings, Data Guardian)
 * - Phase 6: Advanced AI (Workout Generator, Injury Prevention)
 *
 * Also includes the Spirit Animal Wardrobe system for cosmetic customization.
 */

export { companionEventsService, STAGE_THRESHOLDS, XP_REWARDS, UNIT_REWARDS } from './companion-events';
export { mascotAssistService } from './assist.service';
export { mascotPowersService } from './powers.service';
export { spiritWardrobeService } from './spirit-wardrobe.service';
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
export type {
  SpiritCosmetic,
  UserCosmetic,
  SpiritLoadout,
  ShopItem,
  PurchaseResult,
  GiftResult,
} from './spirit-wardrobe.service';
