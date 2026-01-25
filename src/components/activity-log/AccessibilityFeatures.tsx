/**
 * Accessibility Features for Activity Log
 *
 * Provides:
 * - Skip link to main content
 * - Screen reader announcements
 * - Keyboard shortcuts help
 * - Focus trap for modals
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Keyboard, X } from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';

// ============================================
// SKIP LINK COMPONENT
// ============================================

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export function SkipLink({ targetId = 'main-content', children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {children}
    </a>
  );
}

// ============================================
// SCREEN READER ANNOUNCER
// ============================================

interface AnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export function ScreenReaderAnnouncer({ message, priority = 'polite' }: AnnouncerProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// ============================================
// KEYBOARD SHORTCUTS HELP
// ============================================

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'n', description: 'New workout entry' },
  { key: 'v', description: 'Activate voice input' },
  { key: 'p', description: 'Paste from clipboard' },
  { key: 's', description: 'Search exercises' },
  { key: 'Enter', description: 'Confirm selection' },
  { key: 'Escape', description: 'Close dialog/cancel' },
  { key: '↑ ↓', description: 'Navigate list items' },
  { key: 'Tab', description: 'Move to next element' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <SafeAnimatePresence>
      {isOpen && (
        <SafeMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
          role="presentation"
        >
          <SafeMotion.div
            ref={dialogRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="shortcuts-title" className="text-lg font-bold flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-400" aria-hidden="true" />
                Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Close shortcuts"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="space-y-2" role="list">
              {shortcuts.map(({ key, description }) => (
                <li key={key} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                  <span className="text-gray-300">{description}</span>
                  <kbd className="bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-200">
                    {key}
                  </kbd>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-gray-500 text-center">
              Press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">?</kbd> anytime to see shortcuts
            </p>
          </SafeMotion.div>
        </SafeMotion.div>
      )}
    </SafeAnimatePresence>
  );
}

// ============================================
// KEYBOARD SHORTCUTS HOOK
// ============================================

interface UseKeyboardShortcutsOptions {
  onNewEntry?: () => void;
  onVoice?: () => void;
  onPaste?: () => void;
  onSearch?: () => void;
  onShowHelp?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  onNewEntry,
  onVoice,
  onPaste,
  onSearch,
  onShowHelp,
  disabled = false,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Don't trigger with modifier keys (except for paste)
    if (e.ctrlKey || e.altKey || e.metaKey) {
      // Allow Ctrl+V for paste
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        onPaste?.();
        return;
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case '?':
        e.preventDefault();
        onShowHelp?.();
        break;
      case 'n':
        e.preventDefault();
        onNewEntry?.();
        break;
      case 'v':
        e.preventDefault();
        onVoice?.();
        break;
      case 'p':
        e.preventDefault();
        onPaste?.();
        break;
      case 's':
        e.preventDefault();
        onSearch?.();
        break;
    }
  }, [disabled, onNewEntry, onVoice, onPaste, onSearch, onShowHelp]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ============================================
// FOCUS MANAGEMENT
// ============================================

export function useFocusOnMount(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, [ref]);
}

export function useRestoreFocus() {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    return () => {
      previousActiveElement.current?.focus();
    };
  }, []);

  return previousActiveElement;
}

export default {
  SkipLink,
  ScreenReaderAnnouncer,
  KeyboardShortcutsHelp,
  useKeyboardShortcuts,
  useFocusOnMount,
  useRestoreFocus,
};
