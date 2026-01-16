/**
 * CommandPalette - Global search component (Cmd+K / Ctrl+K)
 *
 * A spotlight-style command palette that provides quick access to
 * navigation, actions, exercises, and settings. Features:
 *
 * - Cmd+K (Mac) / Ctrl+K (Windows) keyboard shortcut
 * - Fuzzy search across multiple categories
 * - Recent searches stored in localStorage
 * - Full keyboard navigation (arrows, enter, escape)
 * - Animated entrance/exit
 * - Glass morphism design
 *
 * @example
 * // Basic usage with hook
 * function App() {
 *   const { isOpen, open, close, handleSelect } = useCommandPalette({
 *     onSelect: (item) => navigate(item.path),
 *   });
 *
 *   return (
 *     <CommandPalette
 *       isOpen={isOpen}
 *       onClose={close}
 *       onSelect={handleSelect}
 *     />
 *   );
 * }
 *
 * @example
 * // With custom categories
 * <CommandPalette
 *   isOpen={isOpen}
 *   onClose={close}
 *   categories={['Pages', 'Exercises', 'Actions']}
 *   recentSearches
 *   maxResults={8}
 * />
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CommandItem, { CategoryHeader, NoResults } from './CommandItem';
import {
  searchCommands,
  CATEGORIES,
  CATEGORY_ORDER,
  registerCommand,
} from './commandRegistry';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'musclemap_command_recent';
const MAX_RECENT = 5;

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function getRecentSearches() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(item) {
  if (!item?.id) return;

  try {
    const recent = getRecentSearches();
    // Remove if exists
    const filtered = recent.filter((r) => r.id !== item.id);
    // Add to front with timestamp
    const updated = [
      {
        id: item.id,
        title: item.title,
        description: item.description,
        path: item.path,
        icon: typeof item.icon === 'string' ? item.icon : undefined,
        category: CATEGORIES.RECENT,
        timestamp: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_RECENT);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// ============================================
// ANIMATIONS
// ============================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const paletteVariants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: -20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 35,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -10,
    transition: { duration: 0.12 },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

function CommandPalette({
  isOpen = false,
  onClose,
  onSelect,
  placeholder = 'Search exercises, pages, actions...',
  categories = null, // null = all categories
  recentSearches = true,
  maxResults = 5,
  initialQuery = '',
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState([]);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const selectedRef = useRef(null);

  // Load recent searches
  useEffect(() => {
    if (isOpen && recentSearches) {
      setRecentItems(getRecentSearches());
    }
  }, [isOpen, recentSearches]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);

      // Focus input with slight delay for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      });
    }
  }, [isOpen, initialQuery]);

  // Search results
  const searchResults = useMemo(() => {
    const options = {
      maxResults,
      categories: categories || [],
    };

    if (!query.trim()) {
      // Show recent + suggestions when empty
      const results = searchCommands('', options);

      if (recentSearches && recentItems.length > 0) {
        results[CATEGORIES.RECENT] = recentItems;
      }

      return results;
    }

    return searchCommands(query, options);
  }, [query, categories, maxResults, recentSearches, recentItems]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat = [];
    const orderedCategories = [
      CATEGORIES.RECENT,
      ...CATEGORY_ORDER.filter((c) => c !== CATEGORIES.RECENT),
    ];

    orderedCategories.forEach((category) => {
      if (searchResults[category]?.length) {
        searchResults[category].forEach((item) => {
          flat.push({ ...item, _category: category });
        });
      }
    });

    return flat;
  }, [searchResults]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= flatResults.length) {
      setSelectedIndex(Math.max(0, flatResults.length - 1));
    }
  }, [flatResults.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Handle item selection
  const handleSelect = useCallback(
    (item) => {
      if (!item) return;

      // Save to recent
      const newRecent = saveRecentSearch(item);
      setRecentItems(newRecent);

      // Execute action or navigate
      if (item.action && typeof item.action === 'function') {
        item.action(item.data);
      } else if (item.path) {
        navigate(item.path);
      }

      // Notify parent
      onSelect?.(item);
      onClose?.();
    },
    [navigate, onSelect, onClose]
  );

  // Clear recent searches
  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentItems([]);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatResults.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatResults.length - 1
          );
          break;

        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;

        case 'Tab':
          // Trap focus
          e.preventDefault();
          break;

        default:
          // Reset selection on typing
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            setSelectedIndex(0);
          }
          break;
      }
    },
    [flatResults, selectedIndex, handleSelect, onClose]
  );

  // Render category groups
  const renderResults = useCallback(() => {
    if (flatResults.length === 0) {
      return <NoResults query={query} />;
    }

    const sections = [];
    const orderedCategories = [
      CATEGORIES.RECENT,
      ...CATEGORY_ORDER.filter((c) => c !== CATEGORIES.RECENT),
    ];

    let globalIndex = 0;

    orderedCategories.forEach((category) => {
      const items = searchResults[category];
      if (!items?.length) return;

      const startIndex = globalIndex;

      sections.push(
        <div key={category}>
          <CategoryHeader
            category={category}
            count={items.length}
            onClear={category === CATEGORIES.RECENT ? handleClearRecent : undefined}
          />
          <div className="space-y-1 px-2">
            {items.map((item, i) => {
              const idx = startIndex + i;
              const isSelected = idx === selectedIndex;

              return (
                <CommandItem
                  key={item.id}
                  ref={isSelected ? selectedRef : null}
                  item={item}
                  index={i}
                  isSelected={isSelected}
                  onClick={handleSelect}
                  highlights={item.highlights}
                />
              );
            })}
          </div>
        </div>
      );

      globalIndex += items.length;
    });

    return sections;
  }, [flatResults, searchResults, selectedIndex, query, handleSelect, handleClearRecent]);

  // Detect platform for shortcut display
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    []
  );

  // Don't render if not open
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Palette Container */}
          <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 md:p-8">
            <motion.div
              key="palette"
              variants={paletteVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="
                relative w-full max-w-2xl mx-auto mt-[10vh]
                rounded-2xl overflow-hidden
                border border-white/10
              "
              style={{
                background: 'rgba(20, 20, 25, 0.85)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                boxShadow: `
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  0 25px 50px -12px rgba(0, 0, 0, 0.5),
                  0 0 100px rgba(0, 102, 255, 0.1)
                `,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                <Search
                  size={22}
                  className="text-white/40 flex-shrink-0"
                  strokeWidth={1.5}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="
                    flex-1 bg-transparent
                    text-white text-lg
                    placeholder:text-white/30
                    outline-none
                  "
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="
                      p-1.5 rounded-lg
                      text-white/40 hover:text-white/70
                      hover:bg-white/10
                      transition-colors
                    "
                    aria-label="Clear search"
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="
                    px-2 py-1 rounded-md
                    text-xs font-medium text-white/40
                    bg-white/5 border border-white/10
                    hover:bg-white/10 hover:text-white/60
                    transition-colors
                  "
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="
                  max-h-[60vh] overflow-y-auto py-2
                  scrollbar-thin scrollbar-track-transparent
                  scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20
                "
                role="listbox"
                aria-label="Search results"
              >
                {renderResults()}
              </div>

              {/* Footer */}
              <div
                className="
                  flex items-center justify-between
                  px-5 py-3
                  border-t border-white/10
                  bg-white/[0.02]
                "
              >
                {/* Keyboard hints */}
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                      <ArrowUp size={12} />
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                      <ArrowDown size={12} />
                    </kbd>
                    <span className="ml-1">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                      <CornerDownLeft size={12} />
                    </kbd>
                    <span className="ml-1">Select</span>
                  </span>
                </div>

                {/* Results count & shortcut */}
                <div className="flex items-center gap-3 text-xs text-white/30">
                  <span>{flatResults.length} results</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                      {isMac ? <Command size={10} /> : 'Ctrl'}
                    </kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                      K
                    </kbd>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default memo(CommandPalette);

// ============================================
// EXPORTS FOR EXTENSIBILITY
// ============================================

export { registerCommand };
