/**
 * EmptyState - Empty state component with illustrations and guidance
 *
 * Displays a centered layout with:
 * - Animated illustration at top (built-in or custom)
 * - Title and description text
 * - Optional action button
 * - Optional tips list
 *
 * Matches MuscleMap's liquid glass / bioluminescent aesthetic.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import GlassButton from '../glass/GlassButton';
import { getIllustration } from './EmptyStateIllustrations';

/**
 * Animation variants for staggered entrance
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

const illustrationVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      duration: 0.5,
    },
  },
};

/**
 * EmptyState Component
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.illustration - Built-in key or custom React node
 *   Built-in keys: 'no-workouts', 'no-achievements', 'no-messages', 'no-friends', 'no-data', 'error', 'coming-soon'
 * @param {string} props.title - Main heading text
 * @param {string} props.description - Explanatory subtext
 * @param {Object} props.action - Optional action button config
 * @param {string} props.action.label - Button text
 * @param {string} [props.action.to] - Link destination (uses react-router Link)
 * @param {Function} [props.action.onClick] - Click handler (alternative to 'to')
 * @param {string} [props.action.variant] - Button variant ('primary', 'glass', 'pulse')
 * @param {Array<string>} props.tips - Optional array of helpful tips
 * @param {string} props.className - Additional container classes
 * @param {string} props.size - Size variant ('sm', 'md', 'lg') - affects illustration and text size
 * @param {boolean} props.compact - Use compact spacing
 */
function EmptyState({
  illustration,
  title,
  description,
  action,
  tips = [],
  className,
  size = 'md',
  compact = false,
}) {
  // Size configurations
  const sizeConfig = {
    sm: {
      container: compact ? 'py-6 px-4' : 'py-8 px-4',
      illustration: 'w-24 h-24',
      title: 'text-lg font-semibold',
      description: 'text-sm',
      tips: 'text-xs',
      gap: 'gap-3',
    },
    md: {
      container: compact ? 'py-8 px-6' : 'py-12 px-6',
      illustration: 'w-40 h-40',
      title: 'text-xl font-semibold',
      description: 'text-base',
      tips: 'text-sm',
      gap: 'gap-4',
    },
    lg: {
      container: compact ? 'py-10 px-8' : 'py-16 px-8',
      illustration: 'w-52 h-52',
      title: 'text-2xl font-bold',
      description: 'text-lg',
      tips: 'text-base',
      gap: 'gap-5',
    },
  };

  const config = sizeConfig[size];
  const illustrationNode = getIllustration(illustration);

  return (
    <motion.div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        config.container,
        config.gap,
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Illustration */}
      {illustrationNode && (
        <motion.div
          className={clsx('flex-shrink-0', config.illustration)}
          variants={illustrationVariants}
        >
          {illustrationNode}
        </motion.div>
      )}

      {/* Text content */}
      <motion.div
        className="flex flex-col items-center gap-2 max-w-sm"
        variants={itemVariants}
      >
        {title && (
          <h3 className={clsx('text-white', config.title)}>
            {title}
          </h3>
        )}
        {description && (
          <p className={clsx('text-white/60', config.description)}>
            {description}
          </p>
        )}
      </motion.div>

      {/* Action button */}
      {action && (
        <motion.div variants={itemVariants}>
          {action.to ? (
            <GlassButton
              as={Link}
              to={action.to}
              variant={action.variant || 'primary'}
              size={size === 'lg' ? 'lg' : 'md'}
            >
              {action.label}
            </GlassButton>
          ) : (
            <GlassButton
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size={size === 'lg' ? 'lg' : 'md'}
            >
              {action.label}
            </GlassButton>
          )}
        </motion.div>
      )}

      {/* Tips list */}
      {tips.length > 0 && (
        <motion.div
          className="mt-2 w-full max-w-xs"
          variants={itemVariants}
        >
          <div className="glass-subtle rounded-xl p-4">
            <ul className={clsx('space-y-2 text-left', config.tips)}>
              {tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-white/50"
                >
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-brand-blue-400/60" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * EmptyStateCard - EmptyState wrapped in a glass card
 * Useful when you need the empty state to have its own container
 */
export function EmptyStateCard({ className, ...props }) {
  return (
    <div className={clsx('card-glass p-6', className)}>
      <EmptyState {...props} />
    </div>
  );
}

/**
 * EmptyStatePage - Full page empty state layout
 * Centers vertically and takes full available height
 */
export function EmptyStatePage({ className, ...props }) {
  return (
    <div className={clsx('min-h-[60vh] flex items-center justify-center', className)}>
      <EmptyState size="lg" {...props} />
    </div>
  );
}

export default EmptyState;
