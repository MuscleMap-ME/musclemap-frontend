/**
 * CareerStandardsList - Grid of CareerStandardCard components
 *
 * Displays a filterable grid of career standards by category.
 * Supports search, category filtering, and loading states.
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import CareerStandardCard, { CATEGORY_META } from './CareerStandardCard';
import {
  CAREER_STANDARDS_QUERY,
  CAREER_STANDARD_CATEGORIES_QUERY,
} from '../../graphql';

interface CareerStandard {
  id: string;
  name: string;
  category?: string;
  agency?: string;
  description?: string;
  eventCount?: number;
}

interface CareerStandardCategory {
  category: string;
  count: number;
  icon?: string;
}

interface CareerStandardsListProps {
  onSelectStandard?: (standard: CareerStandard) => void;
  existingGoalIds?: Set<string> | string[];
  initialCategory?: string;
  showSearch?: boolean;
  gridCols?: string;
}

/**
 * CareerStandardsList Component
 *
 * @param {Function} onSelectStandard - Callback when a standard is selected
 * @param {Set|Array} existingGoalIds - IDs of standards user already has goals for
 * @param {string} initialCategory - Initial category filter
 * @param {boolean} showSearch - Whether to show search input
 * @param {string} gridCols - Tailwind grid column classes
 */
export default function CareerStandardsList({
  onSelectStandard,
  existingGoalIds = new Set(),
  initialCategory = 'all',
  showSearch = true,
  gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}: CareerStandardsListProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch standards
  const { data: standardsData, loading: standardsLoading, error: standardsError, refetch } = useQuery(
    CAREER_STANDARDS_QUERY,
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  // Fetch categories
  const { data: categoriesData, loading: categoriesLoading } = useQuery(
    CAREER_STANDARD_CATEGORIES_QUERY,
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  const standards: CareerStandard[] = useMemo(
    () => standardsData?.careerStandards || [],
    [standardsData]
  );

  const categories: CareerStandardCategory[] = useMemo(
    () => categoriesData?.careerStandardCategories || [],
    [categoriesData]
  );

  const loading = standardsLoading || categoriesLoading;
  const error = standardsError?.message;

  // Convert existingGoalIds to Set for O(1) lookup
  const goalIdSet = useMemo(() => {
    if (existingGoalIds instanceof Set) return existingGoalIds;
    return new Set(Array.isArray(existingGoalIds) ? existingGoalIds : []);
  }, [existingGoalIds]);

  // Filter standards by category and search
  const filteredStandards = useMemo(() => {
    let filtered = standards;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.agency?.toLowerCase().includes(query) ||
          s.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [standards, selectedCategory, searchQuery]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertIcon className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Error Loading Standards
        </h3>
        <p className="text-[var(--text-tertiary)] mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-[var(--brand-blue-500)] text-white font-medium hover:bg-[var(--brand-blue-600)] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-4">
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-quaternary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search standards..."
              className={clsx(
                'w-full pl-10 pr-4 py-2.5 rounded-xl',
                'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
                'text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]',
                'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]',
                'transition-colors'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-quaternary)] hover:text-[var(--text-secondary)]"
              >
                <XIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <CategoryButton
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            count={standards.length}
          >
            All
          </CategoryButton>
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat.category] || CATEGORY_META.general;
            return (
              <CategoryButton
                key={cat.category}
                active={selectedCategory === cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                icon={meta.icon}
                count={cat.count}
              >
                {meta.label}
              </CategoryButton>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className={clsx('grid gap-4', gridCols)}>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredStandards.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-[var(--glass-white-5)] rounded-2xl border border-[var(--border-subtle)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--glass-white-10)] flex items-center justify-center">
            <TrophyIcon className="w-8 h-8 text-[var(--text-quaternary)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            No Standards Found
          </h3>
          <p className="text-[var(--text-tertiary)]">
            {searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Try selecting a different category'}
          </p>
        </div>
      ) : (
        /* Standards Grid */
        <motion.div
          className={clsx('grid gap-4', gridCols)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {filteredStandards.map((standard) => (
              <motion.div key={standard.id} variants={itemVariants} layout>
                <CareerStandardCard
                  standard={standard}
                  onSelect={onSelectStandard}
                  hasGoal={goalIdSet.has(standard.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results count */}
      {!loading && filteredStandards.length > 0 && (
        <p className="text-sm text-[var(--text-quaternary)] text-center">
          Showing {filteredStandards.length} of {standards.length} standards
        </p>
      )}
    </div>
  );
}

/**
 * CategoryButton - Filter button component
 */
function CategoryButton({
  children,
  active,
  onClick,
  icon,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: string;
  count?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        'flex items-center gap-2',
        active
          ? 'bg-[var(--brand-blue-500)] text-white'
          : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
      )}
    >
      {icon && <span>{icon}</span>}
      {children}
      {count !== undefined && (
        <span
          className={clsx(
            'ml-1 px-1.5 py-0.5 rounded-full text-xs',
            active ? 'bg-white/20' : 'bg-[var(--glass-white-10)]'
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

/**
 * SkeletonCard - Loading placeholder
 */
function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl bg-[var(--glass-white-5)] border border-[var(--border-subtle)] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--glass-white-10)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[var(--glass-white-10)] rounded w-3/4" />
          <div className="h-3 bg-[var(--glass-white-10)] rounded w-1/2" />
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--glass-white-10)]" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-5 bg-[var(--glass-white-10)] rounded-full w-16" />
        <div className="h-5 bg-[var(--glass-white-10)] rounded-full w-20" />
      </div>
    </div>
  );
}

// Icon components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
