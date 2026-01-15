/**
 * BreadcrumbItem Component
 *
 * Individual breadcrumb link with hover states, optional icons,
 * animated entrance, and special styling for the last (current) item.
 *
 * Features:
 * - Staggered entrance animations
 * - Hover underline effect
 * - Home icon for first item
 * - Ellipsis dropdown for truncated items
 * - Respects reduced motion preferences
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

import React, { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import * as Icons from 'lucide-react';
import { useMotionAllowed } from '../../contexts/MotionContext';

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
    x: -12,
    scale: 0.9,
  },
  animate: (index) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      delay: index * 0.05,
      ease: [0.25, 0.1, 0.25, 1], // smooth ease-out
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
};

/**
 * Reduced motion variants (no transform animations)
 */
const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/**
 * Dropdown variants for ellipsis menu
 */
const dropdownVariants = {
  initial: {
    opacity: 0,
    y: -8,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: {
      duration: 0.15,
    },
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
 * @param {boolean} props.isFirst - True if this is the first item
 * @param {Function} props.onClick - Click handler (optional, for custom navigation)
 * @param {number} props.index - Animation stagger index
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.maxLabelWidth - Maximum label width before truncation
 */
function BreadcrumbItem({
  label,
  path,
  icon,
  isLast = false,
  isFirst = false,
  onClick,
  index = 0,
  className,
  maxLabelWidth,
}) {
  const motionAllowed = useMotionAllowed();
  const variants = motionAllowed ? itemVariants : reducedMotionVariants;

  // Get icon component if specified
  const IconComponent = useMemo(() => getIconComponent(icon), [icon]);

  // Content to render (icon + label)
  const content = (
    <span className="flex items-center gap-1.5 min-w-0">
      {IconComponent && (
        <IconComponent
          className={clsx(
            'w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150',
            isLast
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
          )}
          aria-hidden="true"
        />
      )}
      <span
        className={clsx(
          'truncate',
          maxLabelWidth ? `max-w-[${maxLabelWidth}px]` : 'max-w-[120px] sm:max-w-[180px] md:max-w-[220px]'
        )}
        title={label}
      >
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
          'rounded-md',
          // Current page indicator
          'bg-[var(--glass-white-5)]',
          'border border-[var(--border-subtle)]',
          className
        )}
        variants={variants}
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
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
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
          'transition-all duration-150',
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
            'bg-[var(--brand-blue-400)]',
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
  const motionAllowed = useMotionAllowed();
  const variants = motionAllowed ? itemVariants : reducedMotionVariants;
  const HomeIcon = Icons.Home;

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(path);
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
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
          'transition-all duration-150',
          'focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-500)]',
          'relative',
          className
        )}
        aria-label="Home"
        data-testid="breadcrumb-home"
      >
        <HomeIcon
          className={clsx(
            'w-4 h-4 transition-colors duration-150',
            'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
          )}
          aria-hidden="true"
        />
        {showLabel && (
          <span className="hidden sm:inline truncate">Home</span>
        )}
        {/* Animated underline */}
        <span
          className={clsx(
            'absolute bottom-0.5 left-2 right-2 h-px',
            'bg-[var(--brand-blue-400)]',
            'scale-x-0 group-hover:scale-x-100',
            'transition-transform duration-200 origin-left'
          )}
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
});

/**
 * BreadcrumbEllipsis - Truncation indicator with dropdown for collapsed breadcrumbs
 */
export const BreadcrumbEllipsis = memo(function BreadcrumbEllipsis({
  count,
  hiddenItems = [],
  onClick,
  onExpand,
  index = 0,
  className,
}) {
  const navigate = useNavigate();
  const motionAllowed = useMotionAllowed();
  const variants = motionAllowed ? itemVariants : reducedMotionVariants;
  const MoreIcon = Icons.MoreHorizontal;
  const ChevronDownIcon = Icons.ChevronDown;

  // Dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleClick = useCallback(() => {
    if (hiddenItems.length > 0) {
      setIsOpen(!isOpen);
    } else if (onClick) {
      onClick();
    } else if (onExpand) {
      onExpand();
    }
  }, [hiddenItems, isOpen, onClick, onExpand]);

  const handleItemClick = useCallback((path) => {
    setIsOpen(false);
    if (path) {
      navigate(path);
    }
  }, [navigate]);

  return (
    <motion.div
      className="relative"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={index}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={clsx(
          'flex items-center justify-center gap-0.5 px-2 py-1.5 rounded-md',
          'text-[var(--text-tertiary)]',
          'hover:text-[var(--text-secondary)]',
          'hover:bg-[var(--glass-white-5)]',
          'transition-all duration-150',
          'focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-500)]',
          isOpen && 'bg-[var(--glass-white-5)] text-[var(--text-secondary)]',
          className
        )}
        title={`${count} more item${count !== 1 ? 's' : ''}`}
        aria-label={`Show ${count} more breadcrumb items`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-testid="breadcrumb-ellipsis"
      >
        <MoreIcon className="w-4 h-4" />
        {hiddenItems.length > 0 && (
          <ChevronDownIcon
            className={clsx(
              'w-3 h-3 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && hiddenItems.length > 0 && (
          <motion.div
            ref={dropdownRef}
            className={clsx(
              'absolute left-0 top-full mt-1 z-50',
              'min-w-[180px] max-w-[280px]',
              'py-1',
              // Glass styling
              'glass rounded-lg',
              'border border-[var(--border-subtle)]',
              'shadow-lg shadow-black/20'
            )}
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="menu"
            aria-label="Hidden breadcrumb items"
          >
            {hiddenItems.map((item, idx) => {
              const ItemIcon = getIconComponent(item.icon);

              return (
                <button
                  key={item.path || idx}
                  onClick={() => handleItemClick(item.path)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2',
                    'text-sm text-left text-[var(--text-secondary)]',
                    'hover:text-[var(--text-primary)]',
                    'hover:bg-[var(--glass-white-5)]',
                    'transition-colors duration-150',
                    'focus:outline-none focus-visible:bg-[var(--glass-white-5)]'
                  )}
                  role="menuitem"
                >
                  {ItemIcon && (
                    <ItemIcon className="w-4 h-4 flex-shrink-0 text-[var(--text-tertiary)]" />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * BreadcrumbSeparator - Separator between breadcrumb items
 */
export const BreadcrumbSeparator = memo(function BreadcrumbSeparator({
  children,
  className,
  animated = true,
}) {
  const motionAllowed = useMotionAllowed();
  const ChevronIcon = Icons.ChevronRight;

  const content = (
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

  if (!animated || !motionAllowed) {
    return content;
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.15 }}
      className={clsx(
        'flex items-center justify-center',
        'text-[var(--text-quaternary)]',
        'select-none',
        className
      )}
      aria-hidden="true"
    >
      {children || <ChevronIcon className="w-4 h-4" />}
    </motion.span>
  );
});
