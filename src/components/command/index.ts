/**
 * Command Module - Global search and command palette
 *
 * This module provides a Cmd+K / Ctrl+K command palette for quick
 * navigation, actions, and search across the MuscleMap application.
 *
 * ## Quick Start
 *
 * Add to your app root:
 * ```jsx
 * import { CommandPalette, useCommandPalette } from '@/components/command';
 *
 * function App() {
 *   const { isOpen, close, handleSelect } = useCommandPalette({
 *     onSelect: (item) => console.log('Selected:', item),
 *   });
 *
 *   return (
 *     <>
 *       <YourApp />
 *       <CommandPalette
 *         isOpen={isOpen}
 *         onClose={close}
 *         onSelect={handleSelect}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * ## Full Hook API
 *
 * The useCommandPalette hook provides complete control:
 * ```jsx
 * const {
 *   isOpen,
 *   open,
 *   close,
 *   toggle,
 *   search,           // Current search query
 *   setSearch,        // Update search query
 *   results,          // Flat array of search results
 *   selectedIndex,    // Current selection index
 *   selectNext,       // Move selection down
 *   selectPrev,       // Move selection up
 *   executeSelected,  // Execute currently selected item
 * } = useCommandPalette();
 * ```
 *
 * ## Register Custom Commands
 *
 * Plugins and features can register their own commands:
 * ```jsx
 * import { registerCommand } from '@/components/command';
 *
 * registerCommand({
 *   id: 'my-custom-action',
 *   title: 'My Custom Action',
 *   category: 'Actions',
 *   keywords: ['custom', 'action'],
 *   action: () => console.log('Custom action executed!'),
 *   icon: 'Zap', // Lucide icon name
 *   shortcut: 'G then A',
 * });
 * ```
 *
 * ## Predefined Actions
 *
 * Use action creators for consistent command structure:
 * ```jsx
 * import {
 *   createNavigationAction,
 *   createQuickAction,
 *   NAVIGATION_ACTIONS,
 *   QUICK_ACTIONS,
 * } from '@/components/command';
 *
 * // Use predefined actions
 * registerCommands(NAVIGATION_ACTIONS);
 *
 * // Or create custom ones
 * const myAction = createQuickAction({
 *   id: 'my-action',
 *   title: 'My Action',
 *   action: () => doSomething(),
 * });
 * ```
 *
 * ## Categories
 *
 * Built-in categories:
 * - Pages: Navigation to app pages
 * - Exercises: Exercise search (when provided)
 * - Actions: Quick actions
 * - Community: Social features
 * - Settings: Configuration
 * - Recent: Recently used commands
 *
 * ## Programmatic Control
 *
 * Open/close the palette from anywhere:
 * ```jsx
 * import { openCommandPalette, closeCommandPalette } from '@/components/command';
 *
 * // Open with optional initial query
 * openCommandPalette('workout');
 *
 * // Close
 * closeCommandPalette();
 * ```
 */

// Main component
export { default as CommandPalette } from './CommandPalette';

// Item component (for custom rendering if needed)
export { default as CommandItem, CategoryHeader, NoResults } from './CommandItem';

// Hook for palette control
export {
  default as useCommandPalette,
  useCommandPaletteContext,
  CommandPaletteProvider,
  CommandPaletteContext,
  openCommandPalette,
  closeCommandPalette,
  toggleCommandPalette,
} from './useCommandPalette';

// Registry for managing commands
export {
  registerCommand,
  registerCommands,
  unregisterCommand,
  getCommands,
  getCommandsByCategory,
  searchCommands,
  searchCommandsFlat,
  subscribeToRegistry,
  fuzzyScore,
  highlightMatches,
  initializeBuiltInCommands,
  CATEGORIES,
  CATEGORY_ORDER,
} from './commandRegistry';

// Predefined actions and action creators
export {
  NAVIGATION_ACTIONS,
  QUICK_ACTIONS,
  SETTINGS_ACTIONS,
  COMMUNITY_ACTIONS,
  HELP_ACTIONS,
  DEFAULT_ACTIONS,
  createNavigationAction,
  createQuickAction,
  createSettingsAction,
  createCommunityAction,
  loadExerciseActions,
  loadUserActions,
} from './commandActions';
