/**
 * BreadcrumbItem Component
 *
 * Individual breadcrumb link with hover states, optional icons,
 * and special styling for the last (current) item.
 *
 * @example
 * <BreadcrumbItem
 *   label="Community"
 *   path="/community"
 *   icon="Users"
 *   isLast={false}
 *   onClick={() => navigate('/community')}
 * />
 */

import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import * as Icons from 'lucide-react';

/**
 * Get icon component by name from lucide-react
 * @param {string} iconName - Icon name (e.g., 'Home', 'Users')
 * @returns {React.Component|null} Icon component or null
 */
function getIconComponent(iconName) {
  if (!iconName) return null;
  return Icons[iconName] || null;
}

/**
 * Animation variants for breadcrumb items
 */
const itemVariants = {
  initial: {
    opacity: 0,
    x: -8,
    scale: 0.95,
  },
  animate: (index) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      delay: index * 0.04,
      ease: [0.33, 1, 0.68, 1], // ease-out
    },
  }),
  exit: {
    opacity: 0,
    x: -8,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.15,
    },
  },
  tap: {
    scale: 0.98,
  },
};

/**
 * BreadcrumbItem - Individual breadcrumb link
 *
 * @param {Object} props
 * @param {string} props.label - Display text
 * @param {string} props.path - Navigation path (omit for current page)
 * @param {string} props.icon - Lucide icon name (optional)
 * @param {boolean} props.isLast - True if this is the current page
 * @param {Function} props.onClick - Click handler (optional, for custom navigation)
 * @param {number} props.index - Animation stagger index
 * @param {string} props.className - Additional CSS classes
 */
function BreadcrumbItem({
  label,
  path,
  icon,
  isLast = false,
  onClick,
  index = 0,
  className,
}) {
  // Get icon component if specified
  const IconComponent = useMemo(() => getIconComponent(icon), [icon]);

  // Content to render (icon + label)
  const content = (
    <span className="flex items-center gap-1.5 min-w-0">
      {IconComponent && (
        <IconComponent
          className={clsx(
            'w-3.5 h-3.5 flex-shrink-0',
            isLast ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          )}
          aria-hidden="true"
        />
      )}
      <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px]">
        {label}
      </span>
    </span>
  );

  // Last item (current page) - not clickable
  if (isLast || !path) {
    return (
      <motion.span
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1.5',
          'text-sm font-medium',
          'text-[var(--text-primary)]',
          'min-w-0',
          className
        )}
        variants={itemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        custom={index}
        aria-current="page"
        data-testid="breadcrumb-current"
      >
        {content}
      </motion.span>
    );
  }

  // Clickable breadcrumb link
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(path);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      custom={index}
    >
      <Link
        to={path}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-md',
          'text-sm text-[var(--text-secondary)]',
          // Hover states
          'hover:text-[var(--text-primary)]',
          'hover:bg-[var(--glass-white-5)]',
          // Underline on hover
          'relative',
          // Transitions
          'transition-colors duration-150',
          // Focus states
          'focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-500)]',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          'min-w-0',
          className
        )}
        data-testid="breadcrumb-link"
      >
        {content}
        {/* Animated underline */}
        <span
          className={clsx(
            'absolute bottom-0.5 left-2 right-2 h-px',
            'bg-[var(--text-secondary)]',
            'scale-x-0 group-hover:scale-x-100',
            'transition-transform duration-200 origin-left'
          )}
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
}

// Memoize for performance
export default memo(BreadcrumbItem);

/**
 * BreadcrumbHome - Special home breadcrumb with icon only on mobile
 */
export const BreadcrumbHome = memo(function BreadcrumbHome({
  path = '/',
  onClick,
  index = 0,
  showLabel = true,
  className,
}) {
  const HomeIcon = Icons.Home;

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(path);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      custom={index}
    >
      <Link
        to={path}
        onClick={handleClick}
        className={clsx(
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-md',
          'text-sm text-[var(--text-secondary)]',
          'hover:text-[var(--text-primary)]',
          'hover:bg-[var(--glass-white-5)]',
          'transition-colors duration-150',
          'focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-500)]',
          className
        )}
        aria-label="Home"
        data-testid="breadcrumb-home"
      >
        <HomeIcon className="w-4 h-4" aria-hidden="true" />
        {showLabel && (
          <span className="hidden sm:inline truncate">Home</span>
        )}
      </Link>
    </motion.div>
  );
});

/**
 * BreadcrumbEllipsis - Truncation indicator for collapsed breadcrumbs
 */
export const BreadcrumbEllipsis = memo(function BreadcrumbEllipsis({
  count,
  onClick,
  index = 0,
  className,
}) {
  const MoreIcon = Icons.MoreHorizontal;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center px-2 py-1.5 rounded-md',
        'text-[var(--text-tertiary)]',
        'hover:text-[var(--text-secondary)]',
        'hover:bg-[var(--glass-white-5)]',
        'transition-colors duration-150',
        'focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-500)]',
        className
      )}
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={index}
      title={`${count} more item${count !== 1 ? 's' : ''}`}
      aria-label={`Show ${count} more breadcrumb items`}
      data-testid="breadcrumb-ellipsis"
    >
      <MoreIcon className="w-4 h-4" />
    </motion.button>
  );
});

/**
 * BreadcrumbSeparator - Separator between breadcrumb items
 */
export const BreadcrumbSeparator = memo(function BreadcrumbSeparator({
  children,
  className,
}) {
  const ChevronIcon = Icons.ChevronRight;

  return (
    <span
      className={clsx(
        'flex items-center justify-center',
        'text-[var(--text-quaternary)]',
        'select-none',
        className
      )}
      aria-hidden="true"
    >
      {children || <ChevronIcon className="w-4 h-4" />}
    </span>
  );
});
