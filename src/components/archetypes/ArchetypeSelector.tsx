/**
 * ArchetypeSelector - Main orchestrating component for archetype drill-down flow
 *
 * This component manages the three-step archetype selection process:
 * 1. Category selection (CategoryGrid)
 * 2. Archetype selection within category (ArchetypeGrid)
 * 3. Archetype detail confirmation (ArchetypeDetail)
 *
 * Features:
 * - Animated view transitions with AnimatePresence
 * - Progress indicator showing current step
 * - Back navigation at each step
 * - Error handling with retry
 * - Loading states throughout
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

import CategoryGrid from './CategoryGrid';
import ArchetypeGrid from './ArchetypeGrid';
import ArchetypeDetail from './ArchetypeDetail';
import { useAuth, useToast } from '../../hooks';

/**
 * View states for the drill-down flow
 */
const VIEWS = {
  CATEGORIES: 'categories',
  ARCHETYPES: 'archetypes',
  DETAIL: 'detail',
};

/**
 * Category icon mapping for display
 */
const CATEGORY_ICONS = {
  general: '🏋️',
  strength: '💪',
  movement: '🤸',
  combat: '🥊',
  endurance: '🏃',
  adventure: '🏔️',
  military: '🎖️',
  first_responder: '🚨',
  first_responders: '🚨',
  team_sports: '⚽',
  sports: '🏆',
  functional: '⚡',
  rehabilitation: '💚',
  occupational: '💼',
};

/**
 * Category color mapping for visual theming
 */
const CATEGORY_COLORS = {
  general: '#DC2626',
  strength: '#DC2626',
  movement: '#9333EA',
  combat: '#EA580C',
  endurance: '#2563EB',
  adventure: '#059669',
  military: '#475569',
  first_responder: '#D97706',
  first_responders: '#D97706',
  team_sports: '#06B6D4',
  sports: '#06B6D4',
  functional: '#CA8A04',
  rehabilitation: '#DB2777',
  occupational: '#6366F1',
};

/**
 * Format category ID to display name
 * @param {string} id - Category ID like 'first_responder'
 * @returns {string} Formatted name like 'First Responder'
 */
function formatCategoryName(id) {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Animation variants for slide transitions
 */
const slideVariants = {
  enterFromRight: {
    x: '100%',
    opacity: 0,
  },
  enterFromLeft: {
    x: '-100%',
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exitToLeft: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
  exitToRight: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Progress indicator component showing current step
 */
function ProgressIndicator({ currentStep, totalSteps = 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <motion.div
            key={index}
            className={clsx(
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              isActive && 'bg-brand-blue-500 scale-125',
              isCompleted && 'bg-brand-blue-500/60',
              !isActive && !isCompleted && 'bg-gray-600'
            )}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isActive ? 1.25 : 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        );
      })}
    </div>
  );
}

/**
 * Error state component with retry functionality
 */
function ErrorState({ error, onRetry }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <span className="text-3xl">!</span>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-gray-400 max-w-md mb-6">{error || 'Failed to load data. Please try again.'}</p>
      <motion.button
        onClick={onRetry}
        className={clsx(
          'flex items-center gap-2 px-6 py-3 rounded-xl',
          'bg-brand-blue-500 hover:bg-brand-blue-600',
          'text-white font-medium',
          'transition-colors duration-200'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <RefreshCw className="w-5 h-5" />
        <span>Try Again</span>
      </motion.button>
    </motion.div>
  );
}

/**
 * Back button component for navigation header
 */
function BackButton({ onClick, label = 'Back', showOnMobile = true }) {
  return (
    <motion.button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-white/5 hover:bg-white/10 border border-white/10',
        'text-gray-300 hover:text-white transition-all duration-200',
        !showOnMobile && 'hidden sm:flex'
      )}
      whileHover={{ x: -4 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}

/**
 * ArchetypeSelector Component
 *
 * @param {Object} props
 * @param {Function} props.onComplete - Callback when user confirms selection (archetypeId, archetype) => void
 * @param {string|null} props.initialArchetype - Pre-selected archetype ID
 * @param {boolean} props.showBackButton - Whether to show back to previous page
 * @param {Function} props.onBack - Callback when back button is clicked (only at categories view)
 */
const ArchetypeSelector = memo(function ArchetypeSelector({
  onComplete,
  initialArchetype = null,
  showBackButton = false,
  onBack,
}) {
  // State
  const [view, setView] = useState(VIEWS.CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [categories, setCategories] = useState([]);
  const [archetypes, setArchetypes] = useState([]);
  const [allArchetypes, setAllArchetypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState(null);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  // Hooks
  const { token } = useAuth();
  const { error: showError } = useToast();

  /**
   * Fetch categories and all archetypes on mount
   */
  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle initial archetype pre-selection
   */
  useEffect(() => {
    if (initialArchetype && allArchetypes.length > 0) {
      const archetype = allArchetypes.find((a) => a.id === initialArchetype);
      if (archetype) {
        // Find the category for this archetype
        const categoryId = archetype.category_id || archetype.categoryId || 'general';
        setSelectedCategory(categoryId);
        setSelectedArchetype(archetype);
        // Filter archetypes for this category
        const categoryArchetypes = allArchetypes.filter(
          (a) => (a.category_id || a.categoryId || 'general') === categoryId
        );
        setArchetypes(categoryArchetypes);
        setView(VIEWS.DETAIL);
      }
    }
  }, [initialArchetype, allArchetypes]);

  /**
   * Fetch initial data (categories and archetypes)
   */
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch archetypes (which includes category info)
      const archetypesRes = await fetch('/api/archetypes');
      if (!archetypesRes.ok) {
        throw new Error('Failed to fetch archetypes');
      }
      const archetypesData = await archetypesRes.json();
      const fetchedArchetypes = archetypesData.data || [];
      setAllArchetypes(fetchedArchetypes);

      // Try to fetch categories from dedicated endpoint
      let fetchedCategories = [];
      try {
        const categoriesRes = await fetch('/api/archetypes/categories');
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          fetchedCategories = categoriesData.data || [];
        }
      } catch {
        // Categories endpoint might not exist, derive from archetypes
      }

      // If no categories endpoint, derive from archetypes
      if (fetchedCategories.length === 0) {
        const categoryMap = new Map();
        for (const archetype of fetchedArchetypes) {
          const categoryId = archetype.category_id || archetype.categoryId || 'general';
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              id: categoryId,
              name: formatCategoryName(categoryId),
              icon: CATEGORY_ICONS[categoryId] || '🎯',
              archetypeCount: 0,
            });
          }
          categoryMap.get(categoryId).archetypeCount++;
        }
        fetchedCategories = Array.from(categoryMap.values());
      } else {
        // Add archetype counts to fetched categories
        const countMap = new Map();
        for (const archetype of fetchedArchetypes) {
          const categoryId = archetype.category_id || archetype.categoryId || 'general';
          countMap.set(categoryId, (countMap.get(categoryId) || 0) + 1);
        }
        fetchedCategories = fetchedCategories.map((cat) => ({
          ...cat,
          archetypeCount: countMap.get(cat.id) || 0,
          icon: cat.icon || CATEGORY_ICONS[cat.id] || '🎯',
        }));
      }

      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Failed to fetch archetype data:', err);
      setError(err.message || 'Failed to load archetypes');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle category selection
   */
  const handleCategorySelect = useCallback(
    (categoryId) => {
      setSelectedCategory(categoryId);
      setDirection(1);

      // Filter archetypes for this category
      const categoryArchetypes = allArchetypes.filter(
        (a) => (a.category_id || a.categoryId || 'general') === categoryId
      );

      // Add icons and colors if not present
      const enrichedArchetypes = categoryArchetypes.map((a) => ({
        ...a,
        icon: a.icon || CATEGORY_ICONS[categoryId] || '🎯',
        color: a.color || CATEGORY_COLORS[categoryId] || '#0066FF',
      }));

      setArchetypes(enrichedArchetypes);
      setView(VIEWS.ARCHETYPES);
    },
    [allArchetypes]
  );

  /**
   * Handle archetype selection
   */
  const handleArchetypeSelect = useCallback((archetype) => {
    setSelectedArchetype(archetype);
    setDirection(1);
    setView(VIEWS.DETAIL);
  }, []);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    setDirection(-1);
    if (view === VIEWS.DETAIL) {
      setSelectedArchetype(null);
      setView(VIEWS.ARCHETYPES);
    } else if (view === VIEWS.ARCHETYPES) {
      setSelectedCategory(null);
      setArchetypes([]);
      setView(VIEWS.CATEGORIES);
    } else if (view === VIEWS.CATEGORIES && onBack) {
      onBack();
    }
  }, [view, onBack]);

  /**
   * Handle archetype confirmation
   */
  const handleConfirm = useCallback(async () => {
    if (!selectedArchetype) return;

    setConfirmLoading(true);

    try {
      // Call API to select archetype
      const res = await fetch('/api/archetypes/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ archetypeId: selectedArchetype.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to select archetype');
      }

      // Call onComplete callback
      onComplete?.(selectedArchetype.id, selectedArchetype);
    } catch (err) {
      console.error('Failed to confirm archetype:', err);
      showError?.(err.message || 'Failed to select archetype');
    } finally {
      setConfirmLoading(false);
    }
  }, [selectedArchetype, token, onComplete, showError]);

  /**
   * Get current step number for progress indicator
   */
  const currentStep = useMemo(() => {
    switch (view) {
      case VIEWS.CATEGORIES:
        return 1;
      case VIEWS.ARCHETYPES:
        return 2;
      case VIEWS.DETAIL:
        return 3;
      default:
        return 1;
    }
  }, [view]);

  /**
   * Get category metadata for display
   */
  const selectedCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    const category = categories.find((c) => c.id === selectedCategory);
    return {
      id: selectedCategory,
      name: category?.name || formatCategoryName(selectedCategory),
      icon: category?.icon || CATEGORY_ICONS[selectedCategory] || '🎯',
      color: CATEGORY_COLORS[selectedCategory] || '#0066FF',
    };
  }, [selectedCategory, categories]);

  // Render error state
  if (error && !loading) {
    return (
      <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-black">
        <ErrorState error={error} onRetry={fetchInitialData} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Progress indicator - only show in categories and archetypes views */}
      {view !== VIEWS.DETAIL && <ProgressIndicator currentStep={currentStep} />}

      {/* Header with back button for categories view */}
      {view === VIEWS.CATEGORIES && showBackButton && onBack && (
        <div className="px-4 py-2">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}

      {/* Title for categories view */}
      {view === VIEWS.CATEGORIES && !loading && (
        <motion.div
          className="px-4 py-4 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white mb-1">Choose Your Path</h1>
          <p className="text-gray-400">Select a category to explore archetypes</p>
        </motion.div>
      )}

      {/* Main content with animated transitions */}
      <AnimatePresence mode="wait" initial={false}>
        {view === VIEWS.CATEGORIES && (
          <motion.div
            key="categories"
            className="px-4 pb-8"
            initial={direction > 0 ? 'enterFromRight' : 'enterFromLeft'}
            animate="center"
            exit={direction > 0 ? 'exitToLeft' : 'exitToRight'}
            variants={slideVariants}
          >
            <CategoryGrid
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
              loading={loading}
            />
          </motion.div>
        )}

        {view === VIEWS.ARCHETYPES && (
          <motion.div
            key="archetypes"
            initial={direction > 0 ? 'enterFromRight' : 'enterFromLeft'}
            animate="center"
            exit={direction > 0 ? 'exitToLeft' : 'exitToRight'}
            variants={slideVariants}
          >
            <ArchetypeGrid
              archetypes={archetypes}
              selectedArchetype={selectedArchetype?.id}
              onSelectArchetype={handleArchetypeSelect}
              onBack={handleBack}
              categoryName={selectedCategoryData?.name}
              categoryIcon={selectedCategoryData?.icon}
              categoryColor={selectedCategoryData?.color}
              loading={false}
            />
          </motion.div>
        )}

        {view === VIEWS.DETAIL && selectedArchetype && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <ArchetypeDetail
              archetype={{
                ...selectedArchetype,
                color: selectedArchetype.color || selectedCategoryData?.color || '#0066FF',
                icon: selectedArchetype.icon || selectedCategoryData?.icon || '🎯',
              }}
              onConfirm={handleConfirm}
              onBack={handleBack}
              loading={confirmLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ArchetypeSelector;
