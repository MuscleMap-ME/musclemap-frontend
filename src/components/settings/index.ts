/**
 * Settings Components - User Customization UI
 *
 * Part of "The Troika":
 * - Maximum Flexibility
 * - Maximum User Choice
 * - Maximum Performance
 *
 * These components allow users to customize their experience.
 */

// Equipment Selection
export { EquipmentSelector } from './EquipmentSelector';
export type { EquipmentSelectorProps, EquipmentOption } from './EquipmentSelector';

// Unit Toggle (metric/imperial)
export { UnitToggle } from './UnitToggle';
export type { UnitToggleProps, WeightUnit } from './UnitToggle';

// Rest Timer Settings
export { RestTimerSettings } from './RestTimerSettings';
export type { RestTimerSettingsProps } from './RestTimerSettings';

// Journey Management
export { JourneyManagement } from './JourneyManagement';

// Rendering Tier Selection (NEW - The Troika)
export {
  RenderingTierSelector,
  RenderingTierCard,
} from './RenderingTierSelector';
export type { RenderingTierSelectorProps, TierPreference } from './RenderingTierSelector';

// Typography Preferences (NEW - The Troika)
export {
  TypographyPreferences,
  TypographyCard,
  defaultTypographySettings,
} from './TypographyPreferences';
export type {
  TypographyPreferencesProps,
  TypographySettings,
} from './TypographyPreferences';
