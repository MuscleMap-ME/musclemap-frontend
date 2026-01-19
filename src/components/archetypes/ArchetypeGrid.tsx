/**
 * ArchetypeGrid - Displays archetypes within a selected category (Tier 2 drill-down)
 *
 * Features:
 * - Animated page transition (slide in from right)
 * - Header with back button, category name, and icon
 * - Featured archetype card (larger, for popular/recommended)
 * - Responsive grid layout (2 cols mobile, 3 cols tablet)
 * - Staggered entrance animation for cards
 * - Skeleton loading state
 * - Empty state handling
 */

import React, { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import ArchetypeCard from './ArchetypeCard';

/**
 * Skeleton card for loading state
 */
function ArchetypeCardSkeleton({ index: _index = 0, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-48 h-64',
    md: 'w-full h-80',
    lg: 'w-full h-96',
  };

  return (
    <motion.div
      className={clsx(
        sizeClasses[size],
        'relative overflow-hidden rounded-2xl',
        'bg-white/5 backdrop-blur-md border border-white/10'
      )}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Image placeholder */}
      <div className="h-44 bg-gradient-to-br from-gray-800/60 to-gray-900/60 animate-pulse" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-800/60 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-800/40 rounded w-full animate-pulse" />
        <div className="h-4 bg-gray-800/40 rounded w-2/3 animate-pulse" />
      </div>
    </motion.div>
  );
}

/**
 * Featured archetype skeleton for loading state
 */
function FeaturedArchetypeSkeleton() {
  return (
    <motion.div
      className="w-full rounded-2xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10"
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image placeholder */}
        <div className="md:w-1/2 h-48 md:h-auto bg-gradient-to-br from-gray-800/60 to-gray-900/60 animate-pulse" />

        {/* Content skeleton */}
        <div className="md:w-1/2 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gray-800/60 animate-pulse" />
            <div className="h-4 bg-gray-800/40 rounded w-24 animate-pulse" />
          </div>
          <div className="h-7 bg-gray-800/60 rounded w-3/4 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-800/40 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-800/40 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-800/40 rounded w-4/6 animate-pulse" />
          </div>
          <div className="h-10 bg-gray-800/50 rounded-lg w-32 animate-pulse mt-4" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Featured archetype card (larger format)
 */
function FeaturedArchetypeCard({ archetype, selected, onClick, categoryColor }) {
  return (
    <motion.div
      className={clsx(
        'w-full rounded-2xl overflow-hidden cursor-pointer group',
        'bg-white/5 backdrop-blur-md border border-white/10',
        'hover:border-white/20 transition-colors duration-300'
      )}
      initial={{ opacity: 1, scale: 1, y: 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick?.(archetype)}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image section */}
        <div className="md:w-1/2 relative h-48 md:h-auto min-h-[200px] overflow-hidden">
          {archetype.imageUrl ? (
            <>
              <img
                src={archetype.imageUrl}
                alt={archetype.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/80 md:block hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent md:hidden" />
            </>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: archetype.color
                  ? `linear-gradient(135deg, ${archetype.color}40, ${archetype.color}20, black)`
                  : categoryColor
                    ? `linear-gradient(135deg, ${categoryColor}40, ${categoryColor}20, black)`
                    : 'linear-gradient(135deg, rgba(0, 102, 255, 0.3), rgba(0, 102, 255, 0.1), black)',
              }}
            >
              <motion.span
                className="text-6xl"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                {archetype.icon || '?'}
              </motion.span>
            </div>
          )}

          {/* Featured badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-medium text-white">Featured</span>
          </div>
        </div>

        {/* Content section */}
        <div className="md:w-1/2 p-6 flex flex-col justify-center">
          {/* Icon and category */}
          {archetype.icon && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{archetype.icon}</span>
              {archetype.category && (
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  {archetype.category}
                </span>
              )}
            </div>
          )}

          {/* Name */}
          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-blue-400 transition-colors">
            {archetype.name}
          </h3>

          {/* Description */}
          {archetype.description && (
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
              {archetype.description}
            </p>
          )}

          {/* Philosophy quote */}
          {archetype.philosophy && (
            <p className="text-gray-500 text-xs italic mb-4 line-clamp-2">
              &ldquo;{archetype.philosophy}&rdquo;
            </p>
          )}

          {/* Select button */}
          <motion.button
            className={clsx(
              'mt-auto px-6 py-2.5 rounded-lg font-medium text-sm',
              'transition-all duration-300',
              selected
                ? 'bg-brand-blue-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selected ? 'Selected' : 'Select Archetype'}
          </motion.button>
        </div>
      </div>

      {/* Selection ring */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            boxShadow: `0 0 0 3px ${archetype.color || 'var(--brand-blue-500)'}, 0 0 30px ${archetype.color || 'var(--brand-blue-500)'}40`,
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ categoryName }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-gray-600" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        No Archetypes Found
      </h3>
      <p className="text-gray-400 max-w-md">
        There are no archetypes available in the {categoryName || 'selected'} category yet.
        Check back later or explore other categories.
      </p>
    </motion.div>
  );
}

/**
 * Glassmorphism header with blur on scroll
 */
function Header({ categoryName, categoryIcon, onBack, isScrolled, categoryColor }) {
  return (
    <motion.header
      className={clsx(
        'sticky top-0 z-20 px-4 py-4 transition-all duration-300',
        isScrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        {/* Back button */}
        <motion.button
          onClick={onBack}
          className={clsx(
            'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-white/5 hover:bg-white/10 border border-white/10',
            'text-gray-300 hover:text-white transition-all duration-200'
          )}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back to categories"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        {/* Category info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {categoryIcon && (
            <motion.div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{
                background: categoryColor
                  ? `linear-gradient(135deg, ${categoryColor}40, ${categoryColor}20)`
                  : 'linear-gradient(135deg, rgba(0, 102, 255, 0.3), rgba(0, 102, 255, 0.1))',
              }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              {categoryIcon}
            </motion.div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">{categoryName}</h1>
            <p className="text-xs text-gray-400">Select your archetype</p>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

/**
 * ArchetypeGrid Component
 */
const ArchetypeGrid = memo(function ArchetypeGrid({
  archetypes = [],
  selectedArchetype = null,
  onSelectArchetype,
  onBack,
  categoryName = 'Archetypes',
  categoryIcon = '',
  categoryColor = null,
  loading = false,
}) {
  const containerRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for header blur effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 20);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Separate featured archetype from the rest
  const featuredArchetype = archetypes.find((a) => a.featured || a.recommended);
  const remainingArchetypes = archetypes.filter(
    (a) => !a.featured && !a.recommended
  );

  // If no featured, just use all archetypes in grid
  const gridArchetypes = featuredArchetype ? remainingArchetypes : archetypes;

  // Container animation variants
  // Using immediate visibility to prevent cards from being invisible
  // until user interaction triggers animation frames
  const containerVariants = {
    hidden: { opacity: 1, x: 0 }, // Start visible
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        staggerChildren: 0.05, // Faster stagger
      },
    },
    exit: {
      opacity: 0,
      x: -100,
      transition: {
        duration: 0.3,
      },
    },
  };

  // Card animation variants for staggered entrance
  // Cards are visible immediately to prevent blank screen
  const cardVariants = {
    hidden: { opacity: 1, y: 0, scale: 1 }, // Start visible
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
      },
    },
  };

  return (
    <motion.div
      ref={containerRef}
      className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-black overflow-y-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <Header
        categoryName={categoryName}
        categoryIcon={categoryIcon}
        onBack={onBack}
        isScrolled={isScrolled}
        categoryColor={categoryColor}
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <AnimatePresence mode="sync">
          {loading ? (
            /* Loading skeleton state */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Featured skeleton */}
              <FeaturedArchetypeSkeleton />

              {/* Grid skeletons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ArchetypeCardSkeleton key={i} index={i} />
                ))}
              </div>
            </motion.div>
          ) : archetypes.length === 0 ? (
            /* Empty state */
            <EmptyState categoryName={categoryName} />
          ) : (
            /* Content */
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Featured archetype */}
              {featuredArchetype && (
                <motion.section
                  variants={cardVariants}
                  aria-label="Featured archetype"
                >
                  <FeaturedArchetypeCard
                    archetype={featuredArchetype}
                    selected={selectedArchetype === featuredArchetype.id}
                    onClick={onSelectArchetype}
                    categoryColor={categoryColor}
                  />
                </motion.section>
              )}

              {/* Archetypes grid */}
              {gridArchetypes.length > 0 && (
                <section aria-label="Available archetypes">
                  {featuredArchetype && (
                    <h2 className="text-lg font-semibold text-white mb-4">
                      More Archetypes
                    </h2>
                  )}
                  <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
                    variants={containerVariants}
                  >
                    {gridArchetypes.map((archetype, index) => (
                      <motion.div
                        key={archetype.id}
                        variants={cardVariants}
                        custom={index}
                      >
                        <ArchetypeCard
                          archetype={archetype}
                          selected={selectedArchetype === archetype.id}
                          onClick={onSelectArchetype}
                          size="md"
                          showDetails
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
});

export default ArchetypeGrid;
