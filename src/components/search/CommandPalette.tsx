/**
 * CommandPalette - Global search with Cmd+K/Ctrl+K activation
 *
 * A spotlight-style command palette that provides quick access to
 * navigation, actions, exercises, and settings. Follows the Liquid
 * Glass design system with animated transitions.
 *
 * Features:
 * - Cmd+K (Mac) / Ctrl+K (Windows) keyboard shortcut
 * - Fuzzy search across multiple categories
 * - Recent searches stored in localStorage
 * - Full keyboard navigation (arrows, enter, escape)
 * - Animated entrance/exit with Framer Motion
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Home,
  Dumbbell,
  Target,
  BarChart3,
  Users,
  Settings,
  MessageCircle,
  Trophy,
  Heart,
  Calendar,
  MapPin,
  Zap,
  User,
  ArrowRight,
  Clock,
  Compass,
  Activity,
  Play,
  Crown,
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'musclemap_recent_searches';
const MAX_RECENT_SEARCHES = 5;
const MAX_RESULTS_PER_CATEGORY = 5;

// Icon mapping for result types
const CATEGORY_ICONS = {
  navigation: Compass,
  action: Zap,
  exercise: Dumbbell,
  community: Users,
  settings: Settings,
  recent: Clock,
};

// Category display names
const CATEGORY_LABELS = {
  navigation: 'Navigate',
  action: 'Actions',
  exercise: 'Exercises',
  community: 'Community',
  settings: 'Settings',
  recent: 'Recent',
};

// Default navigation items
const DEFAULT_NAVIGATION = [
  { id: 'nav-dashboard', label: 'Dashboard', description: 'Your fitness overview', path: '/dashboard', icon: Home, category: 'navigation' },
  { id: 'nav-workout', label: 'Workout', description: 'Start or continue workout', path: '/workout', icon: Dumbbell, category: 'navigation' },
  { id: 'nav-exercises', label: 'Exercises', description: 'Browse exercise library', path: '/exercises', icon: Activity, category: 'navigation' },
  { id: 'nav-journey', label: 'Journey', description: 'Your fitness journey', path: '/journey', icon: Compass, category: 'navigation' },
  { id: 'nav-stats', label: 'Stats', description: 'View your statistics', path: '/stats', icon: BarChart3, category: 'navigation' },
  { id: 'nav-progression', label: 'Progression', description: 'Track your progress', path: '/progression', icon: Target, category: 'navigation' },
  { id: 'nav-goals', label: 'Goals', description: 'Manage your goals', path: '/goals', icon: Target, category: 'navigation' },
  { id: 'nav-community', label: 'Community', description: 'Connect with others', path: '/community', icon: Users, category: 'navigation' },
  { id: 'nav-competitions', label: 'Competitions', description: 'Join challenges', path: '/competitions', icon: Trophy, category: 'navigation' },
  { id: 'nav-crews', label: 'Crews', description: 'Manage your crews', path: '/crews', icon: Users, category: 'navigation' },
  { id: 'nav-rivals', label: 'Rivals', description: 'View your rivals', path: '/rivals', icon: Zap, category: 'navigation' },
  { id: 'nav-highfives', label: 'High Fives', description: 'Send encouragement', path: '/highfives', icon: Heart, category: 'navigation' },
  { id: 'nav-messages', label: 'Messages', description: 'Your conversations', path: '/messages', icon: MessageCircle, category: 'navigation' },
  { id: 'nav-profile', label: 'Profile', description: 'View your profile', path: '/profile', icon: User, category: 'navigation' },
  { id: 'nav-achievements', label: 'Achievements', description: 'Your earned badges', path: '/achievements', icon: Trophy, category: 'navigation' },
  { id: 'nav-credits', label: 'Credits', description: 'Manage credits', path: '/credits', icon: Crown, category: 'navigation' },
  { id: 'nav-wallet', label: 'Wallet', description: 'Your wallet', path: '/wallet', icon: Crown, category: 'navigation' },
  { id: 'nav-health', label: 'Health', description: 'Health overview', path: '/health', icon: Heart, category: 'navigation' },
  { id: 'nav-trainers', label: 'Trainers', description: 'Find trainers', path: '/trainers', icon: Users, category: 'navigation' },
  { id: 'nav-skills', label: 'Skills', description: 'Your skill trees', path: '/skills', icon: Activity, category: 'navigation' },
  { id: 'nav-settings', label: 'Settings', description: 'App settings', path: '/settings', icon: Settings, category: 'settings' },
];

// Default actions
const DEFAULT_ACTIONS = [
  { id: 'action-start-workout', label: 'Start Workout', description: 'Begin a new workout session', path: '/workout', icon: Play, category: 'action' },
  { id: 'action-view-profile', label: 'View Profile', description: 'Go to your profile', path: '/profile', icon: User, category: 'action' },
  { id: 'action-check-messages', label: 'Check Messages', description: 'View your conversations', path: '/messages', icon: MessageCircle, category: 'action' },
  { id: 'action-view-schedule', label: 'View Schedule', description: 'Check your workout schedule', path: '/journey', icon: Calendar, category: 'action' },
  { id: 'action-find-gym', label: 'Find Gym', description: 'Locate nearby gyms', path: '/locations', icon: MapPin, category: 'action' },
  { id: 'action-send-highfive', label: 'Send High Five', description: 'Encourage a friend', path: '/highfives', icon: Heart, category: 'action' },
  { id: 'action-join-competition', label: 'Join Competition', description: 'Browse active challenges', path: '/competitions', icon: Trophy, category: 'action' },
  { id: 'action-view-progress', label: 'View Progress', description: 'See your fitness journey', path: '/progression', icon: Target, category: 'action' },
];

// ============================================
// FUZZY SEARCH UTILITY
// ============================================

/**
 * Simple fuzzy search scoring
 * Returns a score where higher = better match
 */
function fuzzyScore(query, text) {
  if (!query || !text) return 0;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower === queryLower) return 100;

  // Starts with query
  if (textLower.startsWith(queryLower)) return 90;

  // Contains query as substring
  if (textLower.includes(queryLower)) return 70;

  // Fuzzy character matching
  let score = 0;
  let queryIndex = 0;
  let consecutive = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 10 + consecutive * 5;
      consecutive++;
      queryIndex++;
    } else {
      consecutive = 0;
    }
  }

  // All query characters must be found
  if (queryIndex < queryLower.length) return 0;

  return score;
}

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
  try {
    const recent = getRecentSearches();
    // Remove if already exists
    const filtered = recent.filter((r) => r.id !== item.id);
    // Add to front
    const updated = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

// ============================================
// ANIMATIONS
// ============================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const paletteVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
};

const resultVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.02,
      duration: 0.15,
    },
  }),
};

// ============================================
// COMPONENT
// ============================================

export default function CommandPalette({
  isOpen = false,
  onClose,
  onSelect,
  exercises = [],
  navigation = DEFAULT_NAVIGATION,
  actions = DEFAULT_ACTIONS,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const selectedRef = useRef(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build searchable items from exercises
  const exerciseItems = useMemo(() => {
    return exercises.map((ex) => ({
      id: `exercise-${ex.id || ex.name}`,
      label: ex.name,
      description: ex.muscle_groups?.join(', ') || ex.category || 'Exercise',
      path: `/exercises?search=${encodeURIComponent(ex.name)}`,
      icon: Dumbbell,
      category: 'exercise',
      data: ex,
    }));
  }, [exercises]);

  // All searchable items
  const allItems = useMemo(() => {
    return [...navigation, ...actions, ...exerciseItems];
  }, [navigation, actions, exerciseItems]);

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent searches when no query
      const recentItems = recentSearches.map((r) => ({
        ...r,
        category: 'recent',
        icon: Clock,
      }));

      // Group by category for empty state
      return {
        recent: recentItems,
        navigation: navigation.slice(0, 5),
        action: actions.slice(0, 3),
      };
    }

    // Score and filter all items
    const scored = allItems
      .map((item) => {
        const labelScore = fuzzyScore(query, item.label);
        const descScore = fuzzyScore(query, item.description) * 0.5;
        return {
          ...item,
          score: Math.max(labelScore, descScore),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // Group by category
    const grouped = {};
    scored.forEach((item) => {
      const category = item.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      if (grouped[category].length < MAX_RESULTS_PER_CATEGORY) {
        grouped[category].push(item);
      }
    });

    return grouped;
  }, [query, allItems, recentSearches, navigation, actions]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const categories = ['recent', 'navigation', 'action', 'exercise', 'community', 'settings'];
    const flat = [];

    categories.forEach((cat) => {
      if (results[cat]?.length) {
        results[cat].forEach((item) => flat.push(item));
      }
    });

    return flat;
  }, [results]);

  // Ensure selected index is valid
  useEffect(() => {
    if (selectedIndex >= flatResults.length) {
      setSelectedIndex(Math.max(0, flatResults.length - 1));
    }
  }, [flatResults, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Handle selection
  const handleSelect = useCallback(
    (item) => {
      if (!item) return;

      // Save to recent searches
      saveRecentSearch({
        id: item.id,
        label: item.label,
        description: item.description,
        path: item.path,
      });

      // Notify parent
      onSelect?.(item);
      onClose?.();
    },
    [onSelect, onClose]
  );

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
          // Trap focus in modal
          e.preventDefault();
          break;
        default:
          break;
      }
    },
    [flatResults, selectedIndex, handleSelect, onClose]
  );

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose?.();
        }
        // Note: Opening is handled by parent component
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Clear recent searches handler
  const handleClearRecent = useCallback((e) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Render result item
  const renderResultItem = useCallback(
    (item, index, globalIndex) => {
      const isSelected = globalIndex === selectedIndex;
      const IconComponent = item.icon || CATEGORY_ICONS[item.category] || ArrowRight;

      return (
        <motion.button
          key={item.id}
          ref={isSelected ? selectedRef : null}
          custom={index}
          variants={resultVariants}
          initial="hidden"
          animate="visible"
          onClick={() => handleSelect(item)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 text-left
            rounded-lg transition-colors duration-150
            ${
              isSelected
                ? 'bg-[var(--glass-brand-light)] border border-[var(--border-brand-glow)]'
                : 'hover:bg-[var(--glass-white-5)] border border-transparent'
            }
          `}
          style={{
            boxShadow: isSelected ? 'var(--glow-brand-sm)' : 'none',
          }}
        >
          <div
            className={`
              w-10 h-10 flex items-center justify-center rounded-lg
              ${isSelected ? 'bg-[var(--brand-blue-500)]' : 'bg-[var(--glass-white-10)]'}
              transition-colors duration-150
            `}
          >
            <IconComponent
              size={20}
              className={isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[var(--text-primary)] font-medium truncate">
              {item.label}
            </div>
            {item.description && (
              <div className="text-[var(--text-tertiary)] text-sm truncate">
                {item.description}
              </div>
            )}
          </div>
          {isSelected && (
            <div className="flex items-center gap-1 text-[var(--text-quaternary)] text-xs">
              <span className="px-1.5 py-0.5 bg-[var(--glass-white-10)] rounded">
                Enter
              </span>
            </div>
          )}
        </motion.button>
      );
    },
    [selectedIndex, handleSelect]
  );

  // Render category section
  const renderCategory = useCallback(
    (category, startIndex, resultsData) => {
      const items = resultsData[category];
      if (!items?.length) return { element: null, count: 0 };

      const CategoryIcon = CATEGORY_ICONS[category] || ArrowRight;

      return {
        element: (
          <div key={category} className="mb-4">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <CategoryIcon size={14} className="text-[var(--text-quaternary)]" />
                <span className="text-xs font-medium text-[var(--text-quaternary)] uppercase tracking-wider">
                  {CATEGORY_LABELS[category] || category}
                </span>
              </div>
              {category === 'recent' && items.length > 0 && (
                <button
                  onClick={handleClearRecent}
                  className="text-xs text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {items.map((item, index) =>
                renderResultItem(item, index, startIndex + index)
              )}
            </div>
          </div>
        ),
        count: items.length,
      };
    },
    [handleClearRecent, renderResultItem]
  );

  // Build rendered categories
  const renderedCategories = useMemo(() => {
    const categories = ['recent', 'navigation', 'action', 'exercise', 'community', 'settings'];
    const elements = [];
    let currentIndex = 0;

    categories.forEach((category) => {
      const { element, count } = renderCategory(category, currentIndex, results);
      if (element) {
        elements.push(element);
        currentIndex += count;
      }
    });

    return elements;
  }, [results, renderCategory]);

  // Don't render if not open
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-modal)]"
            style={{ backdropFilter: 'blur(4px)' }}
          />

          {/* Palette */}
          <motion.div
            key="palette"
            variants={paletteVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[var(--z-modal)]"
          >
            <div
              className="mx-4 overflow-hidden rounded-2xl border border-[var(--border-medium)]"
              style={{
                background: 'var(--glass-white-8)',
                backdropFilter: 'blur(var(--blur-2xl))',
                WebkitBackdropFilter: 'blur(var(--blur-2xl))',
                boxShadow: 'var(--shadow-xl), var(--inner-glow-medium)',
              }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-subtle)]">
                <Search size={20} className="text-[var(--text-tertiary)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search exercises, navigation, actions..."
                  className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-quaternary)] outline-none text-base"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
                <div className="flex items-center gap-1 text-[var(--text-quaternary)] text-xs">
                  <kbd className="px-1.5 py-0.5 bg-[var(--glass-white-10)] rounded border border-[var(--border-subtle)] text-[10px]">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto py-2 px-2"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--glass-white-20) transparent',
                }}
              >
                {flatResults.length > 0 ? (
                  renderedCategories
                ) : (
                  <div className="py-12 text-center">
                    <Search size={40} className="mx-auto mb-3 text-[var(--text-quaternary)]" />
                    <p className="text-[var(--text-secondary)]">No results found</p>
                    <p className="text-[var(--text-quaternary)] text-sm mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--glass-white-3)]">
                <div className="flex items-center gap-4 text-xs text-[var(--text-quaternary)]">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[var(--glass-white-10)] rounded text-[10px]">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-[var(--glass-white-10)] rounded text-[10px]">
                      ↓
                    </kbd>
                    <span className="ml-1">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[var(--glass-white-10)] rounded text-[10px]">
                      Enter
                    </kbd>
                    <span className="ml-1">Select</span>
                  </span>
                </div>
                <span className="text-xs text-[var(--text-quaternary)]">
                  {flatResults.length} result{flatResults.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
