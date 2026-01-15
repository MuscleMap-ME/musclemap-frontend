/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumbs with glass styling, animated entrance,
 * responsive design, and automatic route generation.
 *
 * Features:
 * - Auto-generates from current route
 * - Optional manual override via items prop
 * - Truncates middle items with dropdown showing hidden items
 * - Animated entrance with stagger effect
 * - Glass styling with subtle separators
 * - Mobile: horizontal scroll, Desktop: full display
 * - Home icon for first item
 * - Current page highlighted differently
 * - Accessible with proper ARIA attributes
 * - Respects reduced motion preferences
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

import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import BreadcrumbItem, {
  BreadcrumbHome,
  BreadcrumbEllipsis,
  BreadcrumbSeparator,
} from './BreadcrumbItem';
import useBreadcrumbs from './useBreadcrumbs';
import { useMotionAllowed } from '../../contexts/MotionContext';

/**
 * Container animation variants
 */
const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {},
};

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
 * @param {boolean} props.animate - Whether to animate on route change (default: true)
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
  animate = true,
  'aria-label': ariaLabel = 'Breadcrumb navigation',
}) {
  const location = useLocation();
  const motionAllowed = useMotionAllowed();
  const scrollContainerRef = useRef(null);

  // Auto-generate breadcrumbs from route if items not provided
  const { breadcrumbs: routeBreadcrumbs } = useBreadcrumbs({
    context,
    includeHome,
  });
  const items = propItems || routeBreadcrumbs;

  // State for showing all items when truncated
  const [showAll, setShowAll] = useState(false);

  // Reset showAll when route changes
  useEffect(() => {
    setShowAll(false);
  }, [location.pathname]);

  // Scroll to end on mobile when items change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [items]);

  // Expand truncated items
  const expandTruncation = useCallback(() => {
    setShowAll(true);
  }, []);

  // Calculate visible items with truncation
  const { visibleItems, hiddenItems, hiddenCount } = useMemo(() => {
    if (!items || items.length === 0) {
      return { visibleItems: [], hiddenItems: [], hiddenCount: 0 };
    }

    if (showAll || items.length <= maxItems) {
      return { visibleItems: items, hiddenItems: [], hiddenCount: 0 };
    }

    // Keep first and last, truncate middle
    const first = items[0];
    const last = items[items.length - 1];
    const middle = items.slice(1, -1);

    return {
      visibleItems: [
        first,
        { isTruncation: true, count: middle.length, hiddenItems: middle },
        last,
      ],
      hiddenItems: middle,
      hiddenCount: middle.length,
    };
  }, [items, maxItems, showAll]);

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  // Use key based on route for AnimatePresence
  const routeKey = animate && motionAllowed ? location.pathname : 'static';

  return (
    <nav
      aria-label={ariaLabel}
      className={clsx('relative', className)}
      data-testid="breadcrumbs"
    >
      {/* Scrollable container for mobile */}
      <div
        ref={scrollContainerRef}
        className={clsx(
          'overflow-x-auto scrollbar-hide scroll-smooth',
          '-mx-4 px-4 sm:mx-0 sm:px-0'
        )}
      >
        <LayoutGroup>
          <AnimatePresence mode="wait">
            <motion.ol
              key={routeKey}
              className="flex items-center gap-1 py-2 min-w-max"
              variants={animate && motionAllowed ? containerVariants : undefined}
              initial={animate && motionAllowed ? 'initial' : undefined}
              animate={animate && motionAllowed ? 'animate' : undefined}
              exit={animate && motionAllowed ? 'exit' : undefined}
            >
              {visibleItems.map((item, index) => {
                // Render truncation indicator with dropdown
                if (item.isTruncation) {
                  return (
                    <motion.li
                      key="truncation"
                      className="flex items-center gap-1"
                      layout
                    >
                      <BreadcrumbSeparator animated={animate}>
                        {separator}
                      </BreadcrumbSeparator>
                      <BreadcrumbEllipsis
                        count={item.count}
                        hiddenItems={item.hiddenItems}
                        onClick={expandTruncation}
                        onExpand={expandTruncation}
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
                      <BreadcrumbSeparator animated={animate}>
                        {separator}
                      </BreadcrumbSeparator>
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
                        isFirst={isFirst}
                        index={index}
                        className={itemClassName}
                      />
                    )}
                  </motion.li>
                );
              })}
            </motion.ol>
          </AnimatePresence>
        </LayoutGroup>
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
  const motionAllowed = useMotionAllowed();

  if (!items || items.length === 0) {
    return null;
  }

  // Show only parent and current
  const displayItems = items.length > 1
    ? [items[items.length - 2], items[items.length - 1]]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={className} data-testid="compact-breadcrumbs">
      <motion.div
        className="flex items-center gap-1 text-xs"
        initial={motionAllowed ? { opacity: 0, y: -4 } : undefined}
        animate={motionAllowed ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.2 }}
      >
        {displayItems.map((item, index) => (
          <React.Fragment key={item.path || item.label}>
            {index > 0 && <BreadcrumbSeparator animated={false} />}
            {item.path && index < displayItems.length - 1 ? (
              <button
                type="button"
                onClick={goBack}
                className={clsx(
                  'text-[var(--text-tertiary)]',
                  'hover:text-[var(--text-secondary)]',
                  'transition-colors duration-150',
                  'truncate max-w-[100px]',
                  'focus:outline-none focus-visible:underline'
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
      </motion.div>
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
  animate = true,
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
        animate={animate}
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
  animate = true,
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
          animate={animate}
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
  animate = true,
}) {
  return (
    <div className={clsx('mb-4', className)}>
      <ResponsiveBreadcrumbs
        items={items}
        context={context}
        showHome
        includeHome
        maxItems={4}
        animate={animate}
      />
    </div>
  );
});

/**
 * AnimatedBreadcrumbs - Breadcrumbs with enhanced route change animations
 *
 * Uses route key for smooth transitions between pages.
 */
export const AnimatedBreadcrumbs = memo(function AnimatedBreadcrumbs({
  items,
  separator,
  maxItems = 4,
  showHome = true,
  includeHome = true,
  context,
  className,
  itemClassName,
}) {
  return (
    <Breadcrumbs
      items={items}
      separator={separator}
      maxItems={maxItems}
      showHome={showHome}
      includeHome={includeHome}
      context={context}
      className={className}
      itemClassName={itemClassName}
      animate={true}
    />
  );
});

export default Breadcrumbs;
