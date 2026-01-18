/**
 * CategoryGrid - Top-level category selection component
 *
 * Displays a responsive grid of category cards for the first tier
 * of the archetype drill-down selection process.
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  Barbell,
  PersonSimple,
  HandFist,
  Heartbeat,
  Mountains,
  ShieldStar,
  Siren,
  SoccerBall,
  Lightning,
  FirstAid,
  Trophy,
  Briefcase,
  Truck,
} from '@phosphor-icons/react';

/**
 * Category icon mapping using Phosphor icons
 */
const CATEGORY_ICONS = {
  general: Barbell,
  strength: Barbell,
  movement: PersonSimple,
  combat: HandFist,
  endurance: Heartbeat,
  adventure: Mountains,
  military: ShieldStar,
  first_responders: Siren,
  team_sports: SoccerBall,
  functional: Lightning,
  rehabilitation: FirstAid,
  sports: Trophy,
  occupational: Briefcase,
  transportation: Truck,
};

/**
 * Category-specific gradient colors for fallback backgrounds
 */
const CATEGORY_GRADIENTS = {
  general: 'from-red-600/60 via-red-800/40 to-black/90',
  strength: 'from-red-600/60 via-red-800/40 to-black/90',
  movement: 'from-purple-600/60 via-purple-800/40 to-black/90',
  combat: 'from-orange-600/60 via-orange-800/40 to-black/90',
  endurance: 'from-blue-600/60 via-blue-800/40 to-black/90',
  adventure: 'from-emerald-600/60 via-emerald-800/40 to-black/90',
  military: 'from-slate-600/60 via-slate-800/40 to-black/90',
  first_responders: 'from-amber-600/60 via-amber-800/40 to-black/90',
  team_sports: 'from-cyan-600/60 via-cyan-800/40 to-black/90',
  functional: 'from-yellow-600/60 via-yellow-800/40 to-black/90',
  rehabilitation: 'from-pink-600/60 via-pink-800/40 to-black/90',
  sports: 'from-indigo-600/60 via-indigo-800/40 to-black/90',
  occupational: 'from-teal-600/60 via-teal-800/40 to-black/90',
  transportation: 'from-gray-600/60 via-gray-800/40 to-black/90',
};

/**
 * Category-specific glow colors for hover effects
 */
const CATEGORY_GLOW_COLORS = {
  general: 'rgba(220, 38, 38, 0.4)',
  strength: 'rgba(220, 38, 38, 0.4)',
  movement: 'rgba(147, 51, 234, 0.4)',
  combat: 'rgba(234, 88, 12, 0.4)',
  endurance: 'rgba(37, 99, 235, 0.4)',
  adventure: 'rgba(5, 150, 105, 0.4)',
  military: 'rgba(71, 85, 105, 0.4)',
  first_responders: 'rgba(217, 119, 6, 0.4)',
  team_sports: 'rgba(6, 182, 212, 0.4)',
  functional: 'rgba(202, 138, 4, 0.4)',
  rehabilitation: 'rgba(219, 39, 119, 0.4)',
  sports: 'rgba(99, 102, 241, 0.4)',
  occupational: 'rgba(20, 184, 166, 0.4)',
  transportation: 'rgba(107, 114, 128, 0.4)',
};

/**
 * Animation variants for staggered entrance
 * Using immediate visibility with CSS animations as fallback to prevent
 * cards from being invisible until user interaction triggers animation frames
 */
const containerVariants = {
  hidden: { opacity: 1 }, // Start visible to prevent blank screen
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Faster stagger
      delayChildren: 0, // No delay - show immediately
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 1, // Start visible - CSS will handle initial state
    y: 0,
    scale: 1,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

/**
 * Skeleton card for loading state
 */
function CategoryCardSkeleton({ index }) {
  return (
    <div
      className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Image placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/60 to-gray-900/80 animate-pulse" />

      {/* Content placeholder */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-6 bg-gray-700/50 rounded-lg w-3/4 animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-gray-700/30 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Individual category card component
 */
const CategoryCard = memo(function CategoryCard({
  category,
  isSelected,
  onClick,
}) {
  const IconComponent = CATEGORY_ICONS[category.id] || Barbell;
  const gradientClass = CATEGORY_GRADIENTS[category.id] || CATEGORY_GRADIENTS.general;
  const glowColor = CATEGORY_GLOW_COLORS[category.id] || CATEGORY_GLOW_COLORS.general;

  const handleClick = () => {
    onClick?.(category.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(category.id);
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      className={clsx(
        'relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group',
        'bg-white/5 backdrop-blur-md',
        'border border-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500/50',
        isSelected && 'ring-2 ring-brand-blue-500 ring-offset-2 ring-offset-black'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select ${category.name} category with ${category.archetypeCount || 0} archetypes`}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Hero image or fallback gradient */}
      {category.imageUrl ? (
        <>
          <img
            src={category.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={clsx(
              'absolute inset-0 w-full h-full object-cover',
              'transition-transform duration-500 ease-out',
              'group-hover:scale-110'
            )}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      ) : (
        <div
          className={clsx(
            'absolute inset-0 bg-gradient-to-br',
            gradientClass
          )}
        >
          {/* Animated icon for gradient fallback */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.4, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <IconComponent size={120} weight="thin" className="text-white/20" />
          </motion.div>
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Hover glow effect */}
      <div
        className={clsx(
          'absolute inset-0 opacity-0 transition-opacity duration-300',
          'group-hover:opacity-100 pointer-events-none'
        )}
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor}, transparent 70%)`,
        }}
      />

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Icon badge */}
        <motion.div
          className={clsx(
            'inline-flex items-center justify-center w-10 h-10 mb-3',
            'rounded-xl bg-black/40 backdrop-blur-sm',
            'border border-white/20'
          )}
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.4 }}
        >
          <IconComponent size={24} weight="duotone" className="text-white" />
        </motion.div>

        {/* Category name */}
        <h3 className="text-lg font-bold text-white mb-1 drop-shadow-lg">
          {category.name}
        </h3>

        {/* Archetype count badge */}
        {typeof category.archetypeCount === 'number' && (
          <motion.div
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1',
              'rounded-full bg-white/10 backdrop-blur-sm',
              'border border-white/20',
              'text-xs font-medium text-white/80'
            )}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span>{category.archetypeCount}</span>
            <span className="text-white/60">
              {category.archetypeCount === 1 ? 'archetype' : 'archetypes'}
            </span>
          </motion.div>
        )}

        {/* Description on hover */}
        {category.description && (
          <motion.p
            className={clsx(
              'mt-2 text-sm text-white/70 line-clamp-2',
              'opacity-0 translate-y-2',
              'group-hover:opacity-100 group-hover:translate-y-0',
              'transition-all duration-300'
            )}
          >
            {category.description}
          </motion.p>
        )}
      </div>

      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              boxShadow: `0 0 0 3px var(--brand-blue-500), 0 0 30px var(--brand-blue-500)40`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Shine effect on hover */}
      <div
        className={clsx(
          'absolute inset-0 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-500 pointer-events-none'
        )}
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.08) 45%, transparent 50%)',
        }}
      />
    </motion.div>
  );
});

/**
 * CategoryGrid Component
 *
 * @param {Object} props
 * @param {Array} props.categories - Array of category objects
 * @param {string|null} props.selectedCategory - Currently selected category ID
 * @param {Function} props.onSelectCategory - Callback when category is selected
 * @param {boolean} props.loading - Whether to show loading skeleton
 */
const CategoryGrid = memo(function CategoryGrid({
  categories = [],
  selectedCategory = null,
  onSelectCategory,
  loading = false,
}) {
  // Memoize skeleton array to prevent re-renders
  const skeletonArray = useMemo(() => Array.from({ length: 8 }), []);

  if (loading) {
    return (
      <div
        className={clsx(
          'grid gap-4',
          'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        )}
      >
        {skeletonArray.map((_, index) => (
          <CategoryCardSkeleton key={index} index={index} />
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <p>No categories available</p>
      </div>
    );
  }

  return (
    <motion.div
      className={clsx(
        'grid gap-4',
        'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      )}
      variants={containerVariants}
      initial="visible"
      animate="visible"
    >
      <AnimatePresence mode="sync">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={selectedCategory === category.id}
            onClick={onSelectCategory}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

export default CategoryGrid;
