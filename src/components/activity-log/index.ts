/**
 * Activity Log Components
 *
 * Multi-input workout logging system components for the Activity Log Panel.
 */

// Core components
export { QuickEntryMethods, type EntryMethod } from './QuickEntryMethods';
export { ExerciseQuickPicker } from './ExerciseQuickPicker';
export { WorkoutSummaryCard, type LoggedExercise, type LoggedSet } from './WorkoutSummaryCard';

// Input method components
export { VoiceInputButton } from './VoiceInputButton';
export { TextImportSheet } from './TextImportSheet';
export { ScreenshotImportSheet } from './ScreenshotImportSheet';
export { FileImportSheet } from './FileImportSheet';
export { HealthSyncSheet } from './HealthSyncSheet';

// Export and data portability
export { ExportSheet } from './ExportSheet';

// Offline and accessibility
export { OfflineIndicator } from './OfflineIndicator';
export {
  SkipLink,
  ScreenReaderAnnouncer,
  KeyboardShortcutsHelp,
  useKeyboardShortcuts,
  useFocusOnMount,
  useRestoreFocus,
} from './AccessibilityFeatures';
