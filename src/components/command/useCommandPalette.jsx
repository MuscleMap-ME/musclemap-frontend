/**
 * useCommandPalette - Hook for programmatic control of the CommandPalette
 *
 * Provides state management and keyboard shortcut handling for the
 * command palette. Use this hook in your app root to control the palette.
 *
 * @example
 * // In app root
 * function App() {
 *   const { isOpen, open, close, toggle } = useCommandPalette();
 *
 *   return (
 *     <>
 *       <button onClick={open}>Open Command Palette</button>
 *       <CommandPalette isOpen={isOpen} onClose={close} />
 *     </>
 *   );
 * }
 *
 * @example
 * // Open programmatically from anywhere
 * import { openCommandPalette } from './useCommandPalette';
 * openCommandPalette();
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ============================================
// GLOBAL STATE (for programmatic access)
// ============================================

// Global open/close functions - set by the hook instance
let globalOpen = null;
let globalClose = null;
let globalToggle = null;

/**
 * Open the command palette programmatically
 * (Must have useCommandPalette mounted somewhere in the app)
 */
export function openCommandPalette() {
  if (globalOpen) {
    globalOpen();
    return true;
  }
  console.warn('CommandPalette: No instance mounted. Make sure useCommandPalette is used in your app.');
  return false;
}

/**
 * Close the command palette programmatically
 */
export function closeCommandPalette() {
  if (globalClose) {
    globalClose();
    return true;
  }
  return false;
}

/**
 * Toggle the command palette programmatically
 */
export function toggleCommandPalette() {
  if (globalToggle) {
    globalToggle();
    return true;
  }
  return false;
}

// ============================================
// CONTEXT
// ============================================

const CommandPaletteContext = createContext(null);

/**
 * Get command palette state and controls from context
 * Use this in child components that need access to the palette
 */
export function useCommandPaletteContext() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPaletteContext must be used within CommandPaletteProvider');
  }
  return context;
}

// Export the provider
export { CommandPaletteContext };

// ============================================
// MAIN HOOK
// ============================================

/**
 * Main hook for command palette control
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enableGlobalShortcut=true] - Enable Cmd/Ctrl+K shortcut
 * @param {Function} [options.onOpen] - Callback when palette opens
 * @param {Function} [options.onClose] - Callback when palette closes
 * @param {Function} [options.onSelect] - Callback when item is selected
 * @returns {Object} Palette state and controls
 */
export function useCommandPalette(options = {}) {
  const {
    enableGlobalShortcut = true,
    onOpen,
    onClose,
    onSelect,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');
  const lastOpenTime = useRef(0);

  // Open handler
  const open = useCallback((query = '') => {
    setInitialQuery(query);
    setIsOpen(true);
    lastOpenTime.current = Date.now();
    onOpen?.();
  }, [onOpen]);

  // Close handler
  const close = useCallback(() => {
    setIsOpen(false);
    setInitialQuery('');
    onClose?.();
  }, [onClose]);

  // Toggle handler
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Selection handler
  const handleSelect = useCallback((item) => {
    close();
    onSelect?.(item);
  }, [close, onSelect]);

  // Register global functions
  useEffect(() => {
    globalOpen = open;
    globalClose = close;
    globalToggle = toggle;

    return () => {
      // Only clean up if we're the current instance
      if (globalOpen === open) {
        globalOpen = null;
        globalClose = null;
        globalToggle = null;
      }
    };
  }, [open, close, toggle]);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    if (!enableGlobalShortcut) return;

    const handleKeyDown = (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key === 'k';

      if (isCmdK) {
        e.preventDefault();
        e.stopPropagation();

        // Debounce to prevent double-toggle
        const now = Date.now();
        if (now - lastOpenTime.current < 100) return;

        toggle();
      }

      // Escape to close (backup - palette handles this too)
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    // Capture phase to ensure we get the event first
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enableGlobalShortcut, isOpen, toggle, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    handleSelect,
    initialQuery,
    setInitialQuery,
  };
}

// ============================================
// PROVIDER COMPONENT
// ============================================

/**
 * Provider component for command palette context
 * Wrap your app with this to enable useCommandPaletteContext
 *
 * @example
 * function App() {
 *   return (
 *     <CommandPaletteProvider>
 *       <YourApp />
 *       <CommandPalette />
 *     </CommandPaletteProvider>
 *   );
 * }
 */
export function CommandPaletteProvider({ children, ...options }) {
  const palette = useCommandPalette(options);

  return (
    <CommandPaletteContext.Provider value={palette}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export default useCommandPalette;
