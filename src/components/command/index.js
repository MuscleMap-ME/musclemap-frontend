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
