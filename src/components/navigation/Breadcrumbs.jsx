/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumbs with glass styling, animated entrance,
 * responsive design, and automatic route generation.
 *
 * Features:
 * - Auto-generates from current route
 * - Optional manual override via items prop
 * - Truncates middle items when too many
 * - Animated entrance with stagger effect
 * - Glass styling with subtle separators
 * - Mobile-friendly with horizontal scroll or compact view
 * - Accessible with proper ARIA attributes
 *
 * @example
 * // Auto-generated from route
 * <Breadcrumbs />
 *
 * // With home always shown
 * <Breadcrumbs showHome includeHome />
 *
 * // Manual override
 * <Breadcrumbs items={[
 *   { label: 'Dashboard', path: '/dashboard' },
 *   { label: 'Community', path: '/community' },
 *   { label: 'Iron Warriors' }
 * ]} />
 *
 * // Collapsed for long paths
 * <Breadcrumbs maxItems={3} />
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import BreadcrumbItem, {
  BreadcrumbHome,
  BreadcrumbEllipsis,
  BreadcrumbSeparator,
} from './BreadcrumbItem';
import useBreadcrumbs from './useBreadcrumbs';

/**
 * Main Breadcrumbs Component
 *
 * @param {Object} props
 * @param {Array} props.items - Manual breadcrumb items (overrides auto-generation)
 * @param {ReactNode} props.separator - Custom separator between items
 * @param {number} props.maxItems - Max visible items before truncation (default: 4)
 * @param {boolean} props.showHome - Always show home icon as first item
 * @param {boolean} props.includeHome - Include home in auto-generated breadcrumbs
 * @param {Object} props.context - Context for resolving dynamic labels
 * @param {string} props.className - Container class name
 * @param {string} props.itemClassName - Class name for each item
 * @param {string} props['aria-label'] - Accessibility label (default: 'Breadcrumb navigation')
 */
export function Breadcrumbs({
  items: propItems,
  separator,
  maxItems = 4,
  showHome = true,
  includeHome = false,
  context,
  className,
  itemClassName,
  'aria-label': ariaLabel = 'Breadcrumb navigation',
}) {
  // Auto-generate breadcrumbs from route if items not provided
  const { breadcrumbs: routeBreadcrumbs } = useBreadcrumbs({
    context,
    includeHome,
  });
  const items = propItems || routeBreadcrumbs;

  // State for showing all items when truncated
  const [showAll, setShowAll] = useState(false);

  // Expand truncated items
  const expandTruncation = useCallback(() => {
    setShowAll(true);
  }, []);

  // Calculate visible items with truncation
  const { visibleItems, hiddenCount } = useMemo(() => {
    if (!items || items.length === 0) {
      return { visibleItems: [], hiddenCount: 0 };
    }

    if (showAll || items.length <= maxItems) {
      return { visibleItems: items, hiddenCount: 0 };
    }

    // Keep first, last, and truncate middle
    const first = items[0];
    const last = items[items.length - 1];
    const hidden = items.length - 2;

    return {
      visibleItems: [
        first,
        { isTruncation: true, count: hidden },
        last,
      ],
      hiddenCount: hidden,
    };
  }, [items, maxItems, showAll]);

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={clsx('relative', className)}
      data-testid="breadcrumbs"
    >
      {/* Scrollable container for mobile */}
      <div
        className={clsx(
          'overflow-x-auto scrollbar-hide',
          '-mx-4 px-4 sm:mx-0 sm:px-0'
        )}
      >
        <motion.ol
          className="flex items-center gap-1 py-2 min-w-max"
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
                    className="flex items-center gap-1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                    <BreadcrumbEllipsis
                      count={item.count}
                      onClick={expandTruncation}
                      index={index}
                      className={itemClassName}
                    />
                  </motion.li>
                );
              }

              const isHome = item.path === '/' || item.label === 'Home';
              const isFirst = index === 0;
              const isLast = index === visibleItems.length - 1 ||
                (item.isTruncation === false && item.isLast);

              return (
                <motion.li
                  key={item.path || item.label || index}
                  className="flex items-center gap-1 min-w-0"
                  layout
                >
                  {/* Separator (not before first item) */}
                  {index > 0 && (
                    <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                  )}

                  {/* Home breadcrumb with special handling */}
                  {isHome && isFirst && showHome ? (
                    <BreadcrumbHome
                      path={item.path}
                      showLabel={!propItems} // Show label for auto-generated
                      index={index}
                      className={itemClassName}
                    />
                  ) : (
                    <BreadcrumbItem
                      label={item.label}
                      path={item.path}
                      icon={item.icon}
                      isLast={isLast || item.isLast}
                      index={index}
                      className={itemClassName}
                    />
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ol>
      </div>

      {/* Fade indicator for scroll on mobile */}
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
 * Compact Breadcrumbs - Shows only parent and current
 *
 * Useful for mobile or tight spaces where full breadcrumb
 * trail would be too long.
 */
export const CompactBreadcrumbs = memo(function CompactBreadcrumbs({
  items: propItems,
  context,
  className,
}) {
  const { breadcrumbs: routeBreadcrumbs, goBack, isNested } = useBreadcrumbs({
    context,
  });
  const items = propItems || routeBreadcrumbs;

  if (!items || items.length === 0) {
    return null;
  }

  // Show only parent and current
  const displayItems = items.length > 1
    ? [items[items.length - 2], items[items.length - 1]]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={className} data-testid="compact-breadcrumbs">
      <div className="flex items-center gap-1 text-xs">
        {displayItems.map((item, index) => (
          <React.Fragment key={item.path || item.label}>
            {index > 0 && <BreadcrumbSeparator />}
            {item.path && index < displayItems.length - 1 ? (
              <button
                type="button"
                onClick={goBack}
                className={clsx(
                  'text-[var(--text-tertiary)]',
                  'hover:text-[var(--text-secondary)]',
                  'transition-colors duration-150',
                  'truncate max-w-[100px]'
                )}
              >
                {item.label}
              </button>
            ) : (
              <span className="text-[var(--text-secondary)] font-medium truncate max-w-[150px]">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
});

/**
 * Glass Breadcrumbs - With glass background styling
 *
 * Wraps the standard breadcrumbs in a glass container
 * for use on non-glass backgrounds.
 */
export const GlassBreadcrumbs = memo(function GlassBreadcrumbs({
  items,
  separator,
  maxItems,
  showHome,
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
        showHome={showHome}
        includeHome={includeHome}
        context={context}
      />
    </div>
  );
});

/**
 * Responsive Breadcrumbs - Switches between full and compact on screen size
 *
 * Shows full breadcrumbs on desktop, compact on mobile.
 */
export const ResponsiveBreadcrumbs = memo(function ResponsiveBreadcrumbs({
  items,
  separator,
  maxItems = 4,
  showHome = true,
  includeHome = false,
  context,
  className,
  compactClassName,
}) {
  return (
    <>
      {/* Full breadcrumbs on md and up */}
      <div className={clsx('hidden md:block', className)}>
        <Breadcrumbs
          items={items}
          separator={separator}
          maxItems={maxItems}
          showHome={showHome}
          includeHome={includeHome}
          context={context}
        />
      </div>

      {/* Compact breadcrumbs on mobile */}
      <div className={clsx('md:hidden', compactClassName)}>
        <CompactBreadcrumbs
          items={items}
          context={context}
        />
      </div>
    </>
  );
});

/**
 * PageBreadcrumbs - Pre-styled breadcrumbs for page headers
 *
 * Common configuration for page-level breadcrumb navigation.
 */
export const PageBreadcrumbs = memo(function PageBreadcrumbs({
  items,
  context,
  className,
}) {
  return (
    <div className={clsx('mb-4', className)}>
      <ResponsiveBreadcrumbs
        items={items}
        context={context}
        showHome
        includeHome
        maxItems={4}
      />
    </div>
  );
});

export default Breadcrumbs;
