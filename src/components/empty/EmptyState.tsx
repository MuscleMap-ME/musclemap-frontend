/**
 * EmptyState - Empty state component with illustrations and guidance
 *
 * Displays a centered layout with:
 * - Animated illustration at top (or side on large screens)
 * - Title and description text
 * - Primary and optional secondary action buttons
 * - Helpful tips list with lightbulb icon
 *
 * Features:
 * - Glass card container with subtle border
 * - Animated entrance (fade + slide up) via Framer Motion
 * - Type-aware default illustrations
 * - Preset configurations for common scenarios
 * - Touch-friendly action buttons
 * - Responsive layout (side-by-side on large screens)
 *
 * Matches MuscleMap's liquid glass / bioluminescent aesthetic.
 *
 * @example Using preset (simplest)
 * <EmptyState preset="no-workouts" />
 *
 * @example Custom with illustration string key
 * <EmptyState
 *   illustration="workout"
 *   title="Start Your Journey"
 *   description="Log your first workout to begin tracking progress"
 *   action={{ label: "Start Workout", to: "/workout" }}
 *   tips={["Track sets and reps", "See muscle activation"]}
 * />
 *
 * @example With custom illustration component
 * <EmptyState
 *   illustration={<CustomIllustration />}
 *   title="Nothing Here"
 *   description="Check back later!"
 * />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import clsx from 'clsx';

import GlassButton from '../glass/GlassButton';
import { getIllustration, ILLUSTRATIONS } from './illustrations';
import { getPreset } from './presets';

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
  workout: {
    title: 'No Workouts Yet',
    description: 'This is where your training history will appear. Start logging to track your progress.',
  },
  achievements: {
    title: 'No Achievements Yet',
    description: 'Complete workouts and challenges to unlock achievements and earn rewards.',
  },
  achievement: {
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
  message: {
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
  search: {
    title: 'No Results Found',
    description: 'We could not find anything matching your search. Try different keywords or browse our categories.',
  },
  error: {
    title: 'Something Went Wrong',
    description: 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
  },
  data: {
    title: 'No Data Available',
    description: 'Complete workouts to generate insights and track your progress over time.',
  },
  success: {
    title: 'All Done!',
    description: 'You have completed everything. Great job!',
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
 * @param {string} [props.preset] - Preset configuration key (e.g., 'no-workouts', 'error')
 * @param {string} [props.type] - Illustration type (workouts, achievements, goals, etc.)
 * @param {React.ReactNode|string} [props.illustration] - Custom illustration or type key
 * @param {string} props.title - Main heading text
 * @param {string} props.description - Explanatory subtext
 * @param {Object} [props.action] - Primary action button config
 * @param {string} props.action.label - Button text
 * @param {string} [props.action.to] - Link destination (react-router)
 * @param {Function} [props.action.onClick] - Click handler
 * @param {string} [props.action.variant] - Button variant ('primary', 'glass', 'pulse')
 * @param {Object} [props.secondaryAction] - Secondary action button config
 * @param {Array<string>} [props.tips] - Array of helpful tips
 * @param {string} [props.className] - Additional container classes
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size variant
 * @param {boolean} [props.compact=false] - Use compact spacing
 * @param {boolean} [props.card=false] - Wrap in glass card container
 * @param {boolean} [props.horizontal=false] - Use horizontal layout (illustration on side)
 */
function EmptyState({
  preset,
  type,
  title,
  description,
  action,
  secondaryAction,
  tips,
  illustration,
  className,
  size = 'md',
  compact = false,
  card = false,
  horizontal = false,
}) {
  // Get preset configuration if provided
  const presetConfig = preset ? getPreset(preset) : null;

  // Determine effective values (props override preset, preset overrides type defaults)
  const effectiveType = type || presetConfig?.type || 'generic';
  const defaults = TYPE_DEFAULTS[effectiveType] || TYPE_DEFAULTS.generic;

  // Merge values with priority: explicit props > preset > type defaults
  const displayTitle = title ?? presetConfig?.title ?? defaults.title;
  const displayDescription = description ?? presetConfig?.description ?? defaults.description;
  const displayAction = action ?? presetConfig?.action;
  const displaySecondaryAction = secondaryAction ?? presetConfig?.secondaryAction;
  const displayTips = tips ?? presetConfig?.tips ?? [];

  // Get illustration - supports custom ReactNode, string keys, or falls back to type
  const getIllustrationNode = () => {
    // If illustration is a React element, use it directly
    if (React.isValidElement(illustration)) {
      return illustration;
    }
    // If illustration is a string, use it as a type key
    if (typeof illustration === 'string') {
      return getIllustration(illustration);
    }
    // Fall back to effective type
    return getIllustration(effectiveType);
  };
  const illustrationNode = getIllustrationNode();

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

  // Render action button
  const renderActionButton = (actionConfig, isPrimary = true) => {
    if (!actionConfig) return null;

    const variant = actionConfig.variant || (isPrimary ? 'primary' : 'glass');
    const buttonProps = {
      variant,
      size: config.buttonSize,
    };

    if (actionConfig.to) {
      return (
        <GlassButton as={Link} to={actionConfig.to} {...buttonProps}>
          {actionConfig.label}
        </GlassButton>
      );
    }

    return (
      <GlassButton onClick={actionConfig.onClick} {...buttonProps}>
        {actionConfig.label}
      </GlassButton>
    );
  };

  const content = (
    <motion.div
      className={clsx(
        'flex items-center justify-center text-center',
        horizontal ? 'flex-row gap-8 md:gap-12 text-left' : 'flex-col',
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
          className={clsx(
            'flex-shrink-0',
            config.illustration,
            horizontal && 'order-1'
          )}
          variants={illustrationVariants}
        >
          {illustrationNode}
        </motion.div>
      )}

      {/* Content section */}
      <div className={clsx('flex flex-col', horizontal ? 'items-start order-2' : 'items-center', config.gap)}>
        {/* Text content */}
        <motion.div
          className={clsx('flex flex-col gap-2', horizontal ? 'items-start max-w-lg' : 'items-center max-w-md')}
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
        {(displayAction || displaySecondaryAction) && (
          <motion.div
            className={clsx(
              'flex flex-wrap gap-3 mt-2',
              horizontal ? 'justify-start' : 'items-center justify-center'
            )}
            variants={itemVariants}
          >
            {renderActionButton(displayAction, true)}
            {renderActionButton(displaySecondaryAction, false)}
          </motion.div>
        )}

        {/* Tips list with lightbulb icon */}
        {displayTips.length > 0 && (
          <motion.div
            className={clsx('mt-3 w-full', horizontal ? 'max-w-lg' : 'max-w-sm')}
            variants={itemVariants}
          >
            <div className="glass-subtle rounded-xl p-4 border border-white/5">
              <div className="flex items-start gap-3">
                <Lightbulb
                  size={16}
                  className="flex-shrink-0 mt-0.5 text-amber-400/70"
                />
                <ul className={clsx('space-y-2 text-left flex-1', config.tips)}>
                  {displayTips.map((tip, index) => (
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
            </div>
          </motion.div>
        )}
      </div>
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
export { ILLUSTRATIONS as EMPTY_STATE_ILLUSTRATIONS };
export const EMPTY_STATE_TYPES = Object.keys(TYPE_DEFAULTS);

export default EmptyState;
