/**
 * CareerStandardCard - Card displaying a career standard (CPAT, ACFT, etc.)
 *
 * Shows standard name, category icon, event count, and selection action.
 * Uses glassmorphism styling with Framer Motion animations.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * Category metadata for styling and icons
 */
const CATEGORY_META = {
  military: { color: '#556B2F', icon: '\uD83C\uDF96\uFE0F', label: 'Military', gradient: 'from-green-800/30 to-green-900/20' },
  firefighter: { color: '#B22222', icon: '\uD83D\uDD25', label: 'Firefighter', gradient: 'from-red-700/30 to-red-900/20' },
  law_enforcement: { color: '#191970', icon: '\uD83D\uDEE1\uFE0F', label: 'Law Enforcement', gradient: 'from-blue-800/30 to-blue-900/20' },
  special_operations: { color: '#4B0082', icon: '\u26A1', label: 'Special Ops', gradient: 'from-purple-800/30 to-purple-900/20' },
  civil_service: { color: '#2F4F4F', icon: '\uD83C\uDFDB\uFE0F', label: 'Civil Service', gradient: 'from-slate-700/30 to-slate-900/20' },
  general: { color: '#6366f1', icon: '\uD83C\uDFCB\uFE0F', label: 'General Fitness', gradient: 'from-indigo-700/30 to-indigo-900/20' },
};

/**
 * CareerStandardCard Component
 *
 * @param {Object} standard - The career standard object
 * @param {string} standard.id - Unique identifier
 * @param {string} standard.name - Standard name (e.g., "CPAT", "ACFT")
 * @param {string} standard.institution - Institution name (e.g., "US Army", "FDNY")
 * @param {string} standard.category - Category key
 * @param {string} [standard.icon] - Optional custom icon
 * @param {Array} [standard.components] - List of test events
 * @param {Function} onSelect - Callback when card is selected
 * @param {boolean} hasGoal - Whether user already has a goal for this standard
 * @param {boolean} selected - Whether this card is currently selected
 * @param {string} size - Card size: 'sm', 'md', 'lg'
 */
const CareerStandardCard = memo(function CareerStandardCard({
  standard,
  onSelect,
  hasGoal = false,
  selected = false,
  size = 'md',
}) {
  const categoryMeta = CATEGORY_META[standard.category] || CATEGORY_META.general;
  const eventCount = standard.components?.length || standard.eventCount || 0;

  const sizeConfig = {
    sm: {
      padding: 'p-3',
      iconSize: 'w-8 h-8 text-lg',
      titleSize: 'text-sm',
      subtitleSize: 'text-xs',
      badgeSize: 'text-[10px] px-1.5 py-0.5',
    },
    md: {
      padding: 'p-4',
      iconSize: 'w-10 h-10 text-xl',
      titleSize: 'text-base',
      subtitleSize: 'text-sm',
      badgeSize: 'text-xs px-2 py-0.5',
    },
    lg: {
      padding: 'p-5',
      iconSize: 'w-12 h-12 text-2xl',
      titleSize: 'text-lg',
      subtitleSize: 'text-sm',
      badgeSize: 'text-xs px-2 py-1',
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const handleClick = () => {
    if (!hasGoal && onSelect) {
      onSelect(standard);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !hasGoal) {
      e.preventDefault();
      onSelect?.(standard);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={!hasGoal ? { scale: 1.02, y: -2 } : {}}
      whileTap={!hasGoal ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={hasGoal ? -1 : 0}
      role="button"
      aria-disabled={hasGoal}
      aria-label={`Select ${standard.name} career standard`}
      className={clsx(
        'relative overflow-hidden rounded-xl',
        'bg-[var(--glass-white-5)] backdrop-blur-md',
        'border transition-all duration-200',
        config.padding,
        selected
          ? 'border-[var(--brand-blue-500)] ring-2 ring-[var(--brand-blue-500)]/30'
          : 'border-[var(--border-subtle)]',
        hasGoal
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-[var(--glass-white-10)] hover:border-[var(--border-default)]',
        'group'
      )}
    >
      {/* Gradient background accent */}
      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          categoryMeta.gradient
        )}
      />

      {/* Content */}
      <div className="relative flex items-center gap-3">
        {/* Category Icon */}
        <div
          className={clsx(
            'flex items-center justify-center rounded-lg flex-shrink-0',
            config.iconSize
          )}
          style={{ backgroundColor: `${categoryMeta.color}30` }}
        >
          {standard.icon || categoryMeta.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={clsx(
              'font-bold text-[var(--text-primary)] truncate',
              config.titleSize
            )}
          >
            {standard.name}
          </h3>
          <p
            className={clsx(
              'text-[var(--text-tertiary)] truncate',
              config.subtitleSize
            )}
          >
            {standard.institution || categoryMeta.label}
          </p>
        </div>

        {/* Status/Action */}
        <div className="flex-shrink-0">
          {hasGoal ? (
            <span
              className={clsx(
                'rounded-full bg-emerald-500/20 text-emerald-400 font-medium',
                config.badgeSize
              )}
            >
              Active Goal
            </span>
          ) : (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-8 h-8 rounded-full bg-[var(--brand-blue-500)]/20 flex items-center justify-center"
            >
              <PlusIcon className="w-4 h-4 text-[var(--brand-blue-400)]" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Event Tags */}
      {eventCount > 0 && (
        <div className="relative mt-3 flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              'rounded-full bg-[var(--glass-white-10)] text-[var(--text-quaternary)]',
              config.badgeSize
            )}
          >
            {eventCount} event{eventCount !== 1 ? 's' : ''}
          </span>
          {standard.components?.slice(0, 3).map((comp) => (
            <span
              key={comp.id || comp.name}
              className={clsx(
                'rounded-full bg-[var(--glass-white-10)] text-[var(--text-quaternary)] truncate max-w-[100px]',
                config.badgeSize
              )}
            >
              {comp.name}
            </span>
          ))}
          {standard.components && standard.components.length > 3 && (
            <span
              className={clsx(
                'rounded-full bg-[var(--glass-white-10)] text-[var(--text-quaternary)]',
                config.badgeSize
              )}
            >
              +{standard.components.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Hover shine effect */}
      <div
        className={clsx(
          'absolute inset-0 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-500 pointer-events-none',
          'bg-gradient-to-r from-transparent via-white/5 to-transparent',
          '-translate-x-full group-hover:translate-x-full',
          'transition-transform duration-1000'
        )}
      />
    </motion.div>
  );
});

// Plus icon component
function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default CareerStandardCard;
export { CATEGORY_META };
