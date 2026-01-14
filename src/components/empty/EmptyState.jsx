/**
 * EmptyState - Empty state component with illustrations and guidance
 *
 * Displays a centered layout with:
 * - Animated illustration at top (type-based or custom)
 * - Title and description text
 * - Primary and optional secondary action buttons
 * - Helpful tips list
 *
 * Features:
 * - Glass card container with subtle border
 * - Animated entrance (fade + slide up)
 * - Type-aware default illustrations
 * - Touch-friendly action buttons
 *
 * Matches MuscleMap's liquid glass / bioluminescent aesthetic.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import GlassButton from '../glass/GlassButton';
import { getIllustrationByType, EMPTY_STATE_ILLUSTRATIONS } from './illustrations';

/**
 * Animation variants for staggered entrance
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
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
  hidden: { opacity: 0, scale: 0.92, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      duration: 0.5,
    },
  },
};

/**
 * Default titles and descriptions for each type
 */
const TYPE_DEFAULTS = {
  workouts: {
    title: 'No Workouts Yet',
    description: 'This is where your training history will appear. Start logging to track your progress.',
  },
  achievements: {
    title: 'No Achievements Yet',
    description: 'Complete workouts and challenges to unlock achievements and earn rewards.',
  },
  goals: {
    title: 'No Goals Set',
    description: 'Set fitness goals to stay motivated and track your progress toward success.',
  },
  community: {
    title: 'No Community Activity',
    description: 'Connect with other athletes to share your journey and stay motivated together.',
  },
  messages: {
    title: 'No Messages',
    description: 'Your conversations will appear here. Start chatting with training partners.',
  },
  exercises: {
    title: 'No Exercises Found',
    description: 'Browse our exercise library to discover movements for every muscle group.',
  },
  stats: {
    title: 'No Stats Available',
    description: 'Complete workouts to generate insights about your training performance.',
  },
  generic: {
    title: 'Nothing Here Yet',
    description: 'Check back later for updates.',
  },
};

/**
 * EmptyState Component
 *
 * @param {Object} props
 * @param {'workouts'|'achievements'|'goals'|'community'|'messages'|'exercises'|'stats'|'generic'} props.type
 *   - Type determines default illustration and can provide default title/description
 * @param {string} props.title - Main heading text (overrides type default)
 * @param {string} props.description - Explanatory subtext (overrides type default)
 * @param {Object} props.action - Primary action button config
 * @param {string} props.action.label - Button text
 * @param {string} [props.action.to] - Link destination (uses react-router Link)
 * @param {Function} [props.action.onClick] - Click handler (alternative to 'to')
 * @param {string} [props.action.variant] - Button variant ('primary', 'glass', 'pulse')
 * @param {Object} [props.secondaryAction] - Optional secondary action button config
 * @param {string} props.secondaryAction.label - Button text
 * @param {string} [props.secondaryAction.to] - Link destination
 * @param {Function} [props.secondaryAction.onClick] - Click handler
 * @param {Array<string>} props.tips - Optional array of helpful tips
 * @param {React.ReactNode} props.illustration - Custom illustration (overrides type default)
 * @param {string} props.className - Additional container classes
 * @param {'sm'|'md'|'lg'} props.size - Size variant (affects illustration and text size)
 * @param {boolean} props.compact - Use compact spacing
 * @param {boolean} props.card - Wrap in glass card container
 */
function EmptyState({
  type = 'generic',
  title,
  description,
  action,
  secondaryAction,
  tips = [],
  illustration,
  className,
  size = 'md',
  compact = false,
  card = false,
}) {
  // Get defaults based on type
  const defaults = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.generic;
  const displayTitle = title || defaults.title;
  const displayDescription = description || defaults.description;

  // Get illustration - custom or type-based
  const illustrationNode = illustration || getIllustrationByType(type);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: compact ? 'py-6 px-4' : 'py-8 px-4',
      illustration: 'w-28 h-20',
      title: 'text-lg font-semibold',
      description: 'text-sm',
      tips: 'text-xs',
      gap: 'gap-3',
      buttonSize: 'sm',
    },
    md: {
      container: compact ? 'py-8 px-6' : 'py-12 px-6',
      illustration: 'w-48 h-36',
      title: 'text-xl font-semibold',
      description: 'text-base',
      tips: 'text-sm',
      gap: 'gap-4',
      buttonSize: 'md',
    },
    lg: {
      container: compact ? 'py-10 px-8' : 'py-16 px-8',
      illustration: 'w-64 h-48',
      title: 'text-2xl font-bold',
      description: 'text-lg',
      tips: 'text-base',
      gap: 'gap-5',
      buttonSize: 'lg',
    },
  };

  const config = sizeConfig[size];

  const content = (
    <motion.div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        config.container,
        config.gap,
        !card && className
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
        className="flex flex-col items-center gap-2 max-w-md"
        variants={itemVariants}
      >
        {displayTitle && (
          <h3 className={clsx('text-white', config.title)}>
            {displayTitle}
          </h3>
        )}
        {displayDescription && (
          <p className={clsx('text-white/60 leading-relaxed', config.description)}>
            {displayDescription}
          </p>
        )}
      </motion.div>

      {/* Action buttons */}
      {(action || secondaryAction) && (
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mt-2"
          variants={itemVariants}
        >
          {/* Primary action */}
          {action && (
            action.to ? (
              <GlassButton
                as={Link}
                to={action.to}
                variant={action.variant || 'primary'}
                size={config.buttonSize}
              >
                {action.label}
              </GlassButton>
            ) : (
              <GlassButton
                onClick={action.onClick}
                variant={action.variant || 'primary'}
                size={config.buttonSize}
              >
                {action.label}
              </GlassButton>
            )
          )}

          {/* Secondary action */}
          {secondaryAction && (
            secondaryAction.to ? (
              <GlassButton
                as={Link}
                to={secondaryAction.to}
                variant={secondaryAction.variant || 'glass'}
                size={config.buttonSize}
              >
                {secondaryAction.label}
              </GlassButton>
            ) : (
              <GlassButton
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || 'glass'}
                size={config.buttonSize}
              >
                {secondaryAction.label}
              </GlassButton>
            )
          )}
        </motion.div>
      )}

      {/* Tips list */}
      {tips.length > 0 && (
        <motion.div
          className="mt-3 w-full max-w-sm"
          variants={itemVariants}
        >
          <div className="glass-subtle rounded-xl p-4 border border-white/5">
            <ul className={clsx('space-y-2 text-left', config.tips)}>
              {tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-white/50"
                >
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-brand-blue-400/60" />
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  // Optionally wrap in glass card
  if (card) {
    return (
      <div className={clsx('card-glass p-2 overflow-hidden', className)}>
        {content}
      </div>
    );
  }

  return content;
}

/**
 * EmptyStateCard - EmptyState pre-wrapped in a glass card
 * Convenience component when you always want the card container
 */
export function EmptyStateCard({ className, ...props }) {
  return <EmptyState card className={className} {...props} />;
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

/**
 * EmptyStateInline - Compact inline empty state
 * Useful for small sections or cards
 */
export function EmptyStateInline({ className, ...props }) {
  return (
    <EmptyState
      size="sm"
      compact
      className={clsx('py-4', className)}
      {...props}
    />
  );
}

// Export type constants for consumers
export { EMPTY_STATE_ILLUSTRATIONS };
export const EMPTY_STATE_TYPES = Object.keys(TYPE_DEFAULTS);

export default EmptyState;
