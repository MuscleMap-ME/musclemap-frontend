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
import { useQuery, useMutation } from '@apollo/client/react';

import CategoryGrid from './CategoryGrid';
import ArchetypeGrid from './ArchetypeGrid';
import ArchetypeDetail from './ArchetypeDetail';
import { useToast } from '../../hooks';
import {
  ARCHETYPE_CATEGORIES_QUERY,
  ARCHETYPES_QUERY,
  SELECT_ARCHETYPE_MUTATION,
} from '../../graphql';

// Types
interface Archetype {
  id: string;
  name: string;
  description: string;
  philosophy?: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  category_id?: string;
  primaryStats?: string[];
  bonuses?: Record<string, unknown>;
}

interface ArchetypeCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  archetypes: Archetype[];
}

interface CategoryDisplay {
  id: string;
  name: string;
  icon: string;
  archetypeCount: number;
}

/**
 * View states for the drill-down flow
 */
const VIEWS = {
  CATEGORIES: 'categories',
  ARCHETYPES: 'archetypes',
  DETAIL: 'detail',
} as const;

type ViewType = typeof VIEWS[keyof typeof VIEWS];

/**
 * Category icon mapping for display
 */
const CATEGORY_ICONS: Record<string, string> = {
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
  transportation: '🚚',
};

/**
 * Category color mapping for visual theming
 */
const CATEGORY_COLORS: Record<string, string> = {
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
  sports: '#6366F1',
  functional: '#CA8A04',
  rehabilitation: '#DB2777',
  occupational: '#14B8A6',
  transportation: '#6B7280',
};

/**
 * Format category ID to display name
 */
function formatCategoryName(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Animation variants for slide transitions - simplified for better performance
 */
const slideVariants = {
  enterFromRight: {
    opacity: 0,
    x: 20,
  },
  enterFromLeft: {
    opacity: 0,
    x: -20,
  },
  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exitToLeft: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.15,
    },
  },
  exitToRight: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.15,
    },
  },
};

/**
 * Progress indicator component showing current step
 */
function ProgressIndicator({ currentStep, totalSteps = 3 }: { currentStep: number; totalSteps?: number }) {
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
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
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
function BackButton({ onClick, label = 'Back', showOnMobile = true }: { onClick: () => void; label?: string; showOnMobile?: boolean }) {
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

interface ArchetypeSelectorProps {
  onComplete?: (archetypeId: string, archetype: Archetype) => void;
  initialArchetype?: string | null;
  showBackButton?: boolean;
  onBack?: () => void;
}

/**
 * ArchetypeSelector Component
 */
const ArchetypeSelector = memo(function ArchetypeSelector({
  onComplete,
  initialArchetype = null,
  showBackButton = false,
  onBack,
}: ArchetypeSelectorProps) {
  // State
  const [view, setView] = useState<ViewType>(VIEWS.CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [initialArchetypeHandled, setInitialArchetypeHandled] = useState(false);

  // Hooks
  const { error: showError } = useToast();

  // GraphQL queries
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useQuery<{
    archetypeCategories: ArchetypeCategory[];
  }>(ARCHETYPE_CATEGORIES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: archetypesData, loading: archetypesLoading } = useQuery<{
    archetypes: Archetype[];
  }>(ARCHETYPES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL mutation
  const [selectArchetypeMutation, { loading: confirmLoading }] = useMutation(SELECT_ARCHETYPE_MUTATION, {
    onCompleted: () => {
      if (selectedArchetype) {
        onComplete?.(selectedArchetype.id, selectedArchetype);
      }
    },
    onError: (err) => {
      showError?.(err.message || 'Failed to select archetype');
    },
  });

  // Extract data
  const allArchetypes = useMemo(() => archetypesData?.archetypes || [], [archetypesData]);

  const categories = useMemo((): CategoryDisplay[] => {
    const cats = categoriesData?.archetypeCategories || [];
    if (cats.length > 0) {
      return cats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || CATEGORY_ICONS[cat.id] || '🎯',
        archetypeCount: cat.archetypes?.length || 0,
      }));
    }

    // Fallback: derive categories from archetypes
    if (allArchetypes.length > 0) {
      const categoryMap = new Map<string, CategoryDisplay>();
      for (const archetype of allArchetypes) {
        const categoryId = archetype.categoryId || archetype.category_id || 'general';
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            id: categoryId,
            name: formatCategoryName(categoryId),
            icon: CATEGORY_ICONS[categoryId] || '🎯',
            archetypeCount: 0,
          });
        }
        const cat = categoryMap.get(categoryId)!;
        cat.archetypeCount++;
      }
      return Array.from(categoryMap.values());
    }

    return [];
  }, [categoriesData, allArchetypes]);

  const loading = categoriesLoading || archetypesLoading;
  const error = categoriesError?.message || null;

  /**
   * Handle initial archetype pre-selection - only run once after data loads
   */
  useEffect(() => {
    if (initialArchetypeHandled || !initialArchetype) return;
    if (loading || allArchetypes.length === 0) return;

    const archetype = allArchetypes.find((a) => a.id === initialArchetype);
    if (archetype) {
      const categoryId = archetype.categoryId || archetype.category_id || 'general';
      setSelectedCategory(categoryId);
      setSelectedArchetype(archetype);
      const categoryArchetypes = allArchetypes.filter(
        (a) => (a.categoryId || a.category_id || 'general') === categoryId
      );
      setArchetypes(categoryArchetypes);
      setView(VIEWS.DETAIL);
    }
    setInitialArchetypeHandled(true);
  }, [initialArchetype, allArchetypes, loading, initialArchetypeHandled]);

  /**
   * Handle category selection
   */
  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      setSelectedCategory(categoryId);
      setDirection(1);

      const categoryArchetypes = allArchetypes.filter(
        (a) => (a.categoryId || a.category_id || 'general') === categoryId
      );

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
  const handleArchetypeSelect = useCallback((archetype: Archetype) => {
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

    selectArchetypeMutation({
      variables: { archetypeId: selectedArchetype.id },
    });
  }, [selectedArchetype, selectArchetypeMutation]);

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
        <ErrorState error={error} onRetry={() => refetchCategories()} />
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
      <AnimatePresence mode="sync" initial={false}>
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
