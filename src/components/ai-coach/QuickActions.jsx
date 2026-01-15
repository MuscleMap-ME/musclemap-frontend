/**
 * QuickActions Component
 *
 * Suggested action chips for common queries.
 * Displayed below the chat input or at the start of a conversation.
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * QuickActions - Horizontal scrollable action chips
 *
 * @param {Object} props
 * @param {Array} props.actions - Array of action objects
 * @param {Function} props.onAction - Handler for action clicks
 * @param {string} props.variant - Display variant (default, compact)
 * @param {boolean} props.reducedMotion - Respect reduced motion preference
 */
export default function QuickActions({
  actions = [],
  onAction,
  variant = 'default',
  reducedMotion = false,
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  };

  return (
    <motion.div
      className={clsx(
        'flex gap-2 overflow-x-auto scrollbar-hide',
        variant === 'compact' ? 'py-1' : 'py-2'
      )}
      variants={reducedMotion ? {} : containerVariants}
      initial="hidden"
      animate="visible"
    >
      {actions.map((action) => (
        <motion.button
          key={action.id}
          variants={reducedMotion ? {} : itemVariants}
          whileHover={reducedMotion ? {} : { scale: 1.05 }}
          whileTap={reducedMotion ? {} : { scale: 0.95 }}
          onClick={() => onAction?.(action.id)}
          className={clsx(
            'flex-shrink-0 flex items-center gap-1.5',
            'px-3 py-2 rounded-full',
            'bg-gray-800/60 hover:bg-gray-700/80',
            'border border-gray-700/50 hover:border-blue-500/50',
            'text-sm font-medium text-gray-300 hover:text-white',
            'transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          )}
        >
          {action.icon && (
            <span className="text-base" role="img" aria-hidden="true">
              {action.icon}
            </span>
          )}
          <span className="whitespace-nowrap">{action.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}

/**
 * QuickActionGrid - Grid layout for quick actions
 */
export function QuickActionGrid({
  actions = [],
  onAction,
  columns = 2,
  reducedMotion = false,
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  };

  return (
    <motion.div
      className={clsx(
        'grid gap-2',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4'
      )}
      variants={reducedMotion ? {} : containerVariants}
      initial="hidden"
      animate="visible"
    >
      {actions.map((action) => (
        <motion.button
          key={action.id}
          variants={reducedMotion ? {} : itemVariants}
          whileHover={reducedMotion ? {} : { scale: 1.03 }}
          whileTap={reducedMotion ? {} : { scale: 0.97 }}
          onClick={() => onAction?.(action.id)}
          className={clsx(
            'flex flex-col items-center justify-center gap-1',
            'p-3 rounded-xl',
            'bg-gray-800/60 hover:bg-gray-700/80',
            'border border-gray-700/50 hover:border-blue-500/50',
            'text-center',
            'transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          )}
        >
          <span className="text-2xl" role="img" aria-hidden="true">
            {action.icon}
          </span>
          <span className="text-xs font-medium text-gray-300">
            {action.label}
          </span>
        </motion.button>
      ))}
    </motion.div>
  );
}

/**
 * Floating quick action button
 */
export function QuickActionFAB({
  icon,
  label,
  onClick,
  variant = 'primary',
  reducedMotion = false,
}) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    success: 'bg-green-600 hover:bg-green-500 text-white',
    warning: 'bg-orange-600 hover:bg-orange-500 text-white',
  };

  return (
    <motion.button
      whileHover={reducedMotion ? {} : { scale: 1.1 }}
      whileTap={reducedMotion ? {} : { scale: 0.9 }}
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center',
        'w-12 h-12 rounded-full shadow-lg',
        variantClasses[variant],
        'transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
      )}
      title={label}
      aria-label={label}
    >
      <span className="text-xl" role="img" aria-hidden="true">
        {icon}
      </span>
    </motion.button>
  );
}
