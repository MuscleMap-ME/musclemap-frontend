/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumbs with glass styling, animated entrance,
 * and mobile-friendly design.
 *
 * Features:
 * - Auto-generates from current route
 * - Optional manual override via items prop
 * - Truncates middle items when too many
 * - Animated entrance with stagger effect
 * - Glass styling with subtle separators
 * - Mobile-friendly (horizontal scroll)
 *
 * @example
 * // Auto-generated from route
 * <Breadcrumbs />
 *
 * // Manual override
 * <Breadcrumbs items={[
 *   { label: 'Dashboard', to: '/dashboard' },
 *   { label: 'Community', to: '/community' },
 *   { label: 'Iron Warriors' }
 * ]} />
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import useBreadcrumbs from './useBreadcrumbs';

/**
 * Default separator between breadcrumb items
 */
const DefaultSeparator = ({ className }) => (
  <ChevronRight
    className={clsx('w-4 h-4 text-[var(--text-quaternary)] flex-shrink-0', className)}
    aria-hidden="true"
  />
);

/**
 * Truncation indicator for middle items
 */
const TruncationIndicator = ({ hiddenCount, onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex items-center justify-center px-2 py-1 rounded-md',
      'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
      'hover:bg-[var(--glass-white-5)] transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-500)] focus:ring-offset-2 focus:ring-offset-transparent',
      className
    )}
    title={`${hiddenCount} more item${hiddenCount > 1 ? 's' : ''}`}
    aria-label={`Show ${hiddenCount} more breadcrumb items`}
  >
    <MoreHorizontal className="w-4 h-4" />
  </button>
);

/**
 * Individual breadcrumb item
 */
const BreadcrumbItem = ({
  item,
  index,
  isLast,
  separator,
  showHomeIcon,
}) => {
  const isHome = item.to === '/' || item.label === 'Home';
  const showIcon = showHomeIcon && isHome && index === 0;

  const itemContent = (
    <span className="flex items-center gap-1.5">
      {showIcon && <Home className="w-3.5 h-3.5" aria-hidden="true" />}
      <span className="truncate max-w-[150px] sm:max-w-[200px]">{item.label}</span>
    </span>
  );

  const itemAnimation = {
    initial: { opacity: 0, x: -8 },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        delay: index * 0.05,
        ease: [0.33, 1, 0.68, 1], // ease-out
      },
    },
    exit: { opacity: 0, x: -8 },
  };

  return (
    <motion.li
      key={item.to || item.label}
      className="flex items-center gap-2 min-w-0"
      {...itemAnimation}
    >
      {index > 0 && (
        <span className="flex items-center" aria-hidden="true">
          {separator || <DefaultSeparator />}
        </span>
      )}

      {item.to && !isLast ? (
        <Link
          to={item.to}
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1 rounded-md',
            'text-sm text-[var(--text-secondary)]',
            'hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-5)]',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-500)] focus:ring-offset-2 focus:ring-offset-transparent',
            'min-w-0'
          )}
        >
          {itemContent}
        </Link>
      ) : (
        <span
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1',
            'text-sm font-medium text-[var(--text-primary)]',
            'min-w-0'
          )}
          aria-current="page"
        >
          {itemContent}
        </span>
      )}
    </motion.li>
  );
};

/**
 * Main Breadcrumbs Component
 */
export function Breadcrumbs({
  items: propItems,
  separator,
  maxItems = 4,
  showHomeIcon = true,
  includeHome = false,
  context,
  className,
  containerClassName,
  'aria-label': ariaLabel = 'Breadcrumb navigation',
}) {
  // Use provided items or auto-generate from route
  const routeBreadcrumbs = useBreadcrumbs({ context, includeHome });
  const items = propItems || routeBreadcrumbs;

  // State for showing all items when truncated
  const [showAll, setShowAll] = React.useState(false);

  // Calculate visible items with truncation
  const visibleItems = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }

    if (showAll || items.length <= maxItems) {
      return items;
    }

    // Keep first, last, and truncate middle
    const first = items[0];
    const last = items[items.length - 1];
    const hiddenCount = items.length - 2;

    return [
      first,
      { isTruncation: true, hiddenCount },
      last,
    ];
  }, [items, maxItems, showAll]);

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={clsx('relative', containerClassName)}
    >
      {/* Mobile-friendly horizontal scroll container */}
      <div
        className={clsx(
          'overflow-x-auto scrollbar-hide',
          '-mx-4 px-4 sm:mx-0 sm:px-0',
          className
        )}
      >
        <motion.ol
          className={clsx(
            'flex items-center gap-1',
            'py-2',
            'min-w-max'
          )}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item, index) => {
              // Render truncation indicator
              if (item.isTruncation) {
                return (
                  <motion.li
                    key="truncation"
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <span className="flex items-center" aria-hidden="true">
                      {separator || <DefaultSeparator />}
                    </span>
                    <TruncationIndicator
                      hiddenCount={item.hiddenCount}
                      onClick={() => setShowAll(true)}
                    />
                  </motion.li>
                );
              }

              return (
                <BreadcrumbItem
                  key={item.to || item.label || index}
                  item={item}
                  index={showAll ? index : (item === visibleItems[visibleItems.length - 1] && index > 0 ? 2 : index)}
                  isLast={index === visibleItems.length - 1}
                  separator={separator}
                  showHomeIcon={showHomeIcon}
                />
              );
            })}
          </AnimatePresence>
        </motion.ol>
      </div>

      {/* Fade indicators for scroll on mobile */}
      <div
        className={clsx(
          'absolute top-0 right-0 bottom-0 w-8',
          'bg-gradient-to-l from-[var(--void-base)] to-transparent',
          'pointer-events-none',
          'sm:hidden'
        )}
        aria-hidden="true"
      />
    </nav>
  );
}

/**
 * Compact breadcrumbs variant for tight spaces
 */
export function CompactBreadcrumbs({
  items: propItems,
  context,
  className,
}) {
  const routeBreadcrumbs = useBreadcrumbs({ context });
  const items = propItems || routeBreadcrumbs;

  if (!items || items.length === 0) {
    return null;
  }

  // Show only current and parent
  const displayItems = items.length > 1
    ? [items[items.length - 2], items[items.length - 1]]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <div className="flex items-center gap-1 text-xs">
        {displayItems.map((item, index) => (
          <React.Fragment key={item.to || item.label}>
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-[var(--text-quaternary)]" aria-hidden="true" />
            )}
            {item.to && index < displayItems.length - 1 ? (
              <Link
                to={item.to}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--text-secondary)] font-medium">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

/**
 * Breadcrumbs with glass background styling
 */
export function GlassBreadcrumbs({
  items,
  separator,
  maxItems,
  showHomeIcon,
  includeHome,
  context,
  className,
}) {
  return (
    <div
      className={clsx(
        'glass-subtle rounded-lg px-3 py-1',
        'border border-[var(--border-subtle)]',
        className
      )}
    >
      <Breadcrumbs
        items={items}
        separator={separator}
        maxItems={maxItems}
        showHomeIcon={showHomeIcon}
        includeHome={includeHome}
        context={context}
      />
    </div>
  );
}

export default Breadcrumbs;
