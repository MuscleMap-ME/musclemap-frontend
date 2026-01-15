/**
 * Mascot Module
 *
 * Provides services for both the Global Mascot and User Companions.
 */

export { companionEventsService, STAGE_THRESHOLDS, XP_REWARDS, UNIT_REWARDS } from './companion-events';
export { mascotAssistService } from './assist.service';
export type {
  MascotAssistAbility,
  MascotAssistState,
  UseAssistResult,
  AssistLogEntry,
} from './assist.service';
