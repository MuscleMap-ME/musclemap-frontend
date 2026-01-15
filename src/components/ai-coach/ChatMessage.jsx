/**
 * ChatMessage Component
 *
 * Individual message display with support for different message types:
 * - Text messages
 * - Motivational quotes
 * - Form tips
 * - Exercise cards
 * - Action buttons
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import CoachAvatar, { AVATAR_STATES } from './CoachAvatar';
import { MESSAGE_TYPES } from './useAICoach';

/**
 * ChatMessage - Renders a single chat message
 *
 * @param {Object} props
 * @param {Object} props.message - Message data object
 * @param {boolean} props.isLatest - Whether this is the most recent message
 * @param {Function} props.onActionClick - Handler for action button clicks
 * @param {boolean} props.reducedMotion - Respect reduced motion preference
 */
export default function ChatMessage({
  message,
  isLatest = false,
  onActionClick,
  reducedMotion = false,
}) {
  const isCoach = message.sender === 'coach';

  const messageVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      className={clsx(
        'flex gap-2 mb-3',
        isCoach ? 'flex-row' : 'flex-row-reverse'
      )}
      variants={reducedMotion ? {} : messageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Avatar for coach messages */}
      {isCoach && (
        <div className="flex-shrink-0 mt-1">
          <CoachAvatar
            state={isLatest ? AVATAR_STATES.SPEAKING : AVATAR_STATES.IDLE}
            size="sm"
            reducedMotion={reducedMotion}
          />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={clsx(
          'flex flex-col max-w-[80%]',
          isCoach ? 'items-start' : 'items-end'
        )}
      >
        {/* Sender name for coach */}
        {isCoach && message.coachName && (
          <span className="text-xs text-blue-400 font-medium mb-1 ml-1">
            {message.coachName}
          </span>
        )}

        {/* Message content */}
        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 break-words',
            isCoach
              ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 text-white rounded-tl-sm'
              : 'bg-blue-600 text-white rounded-tr-sm'
          )}
        >
          {renderMessageContent(message, onActionClick)}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 mt-1 mx-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Render message content based on type
 */
function renderMessageContent(message, onActionClick) {
  switch (message.type) {
    case MESSAGE_TYPES.MOTIVATION:
      return <MotivationalMessage content={message.content} />;

    case MESSAGE_TYPES.TIP:
      return <TipMessage content={message.content} category={message.category} />;

    case MESSAGE_TYPES.RECOVERY:
      return <RecoveryMessage content={message.content} />;

    case MESSAGE_TYPES.WORKOUT:
      return (
        <WorkoutMessage
          content={message.content}
          exercises={message.exercises}
          category={message.category}
        />
      );

    case MESSAGE_TYPES.PROGRESS:
      return <ProgressMessage content={message.content} />;

    case MESSAGE_TYPES.ACTION:
      return (
        <ActionMessage
          content={message.content}
          actions={message.actions}
          onActionClick={onActionClick}
        />
      );

    default:
      return <TextMessage content={message.content} />;
  }
}

/**
 * Simple text message
 */
function TextMessage({ content }) {
  return <p className="text-sm leading-relaxed">{content}</p>;
}

/**
 * Motivational quote with special styling
 */
function MotivationalMessage({ content }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔥</span>
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
          Motivation
        </span>
      </div>
      <blockquote className="text-sm italic border-l-2 border-orange-400/50 pl-3 text-gray-200">
        &ldquo;{content}&rdquo;
      </blockquote>
    </div>
  );
}

/**
 * Form tip message
 */
function TipMessage({ content, category }) {
  const categoryIcons = {
    push: '💪',
    pull: '🏋️',
    legs: '🦵',
    core: '🎯',
    general: '📝',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{categoryIcons[category] || '💡'}</span>
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">
          Form Tip
        </span>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}

/**
 * Recovery suggestion message
 */
function RecoveryMessage({ content }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🧘</span>
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
          Recovery
        </span>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}

/**
 * Workout suggestion with exercise cards
 */
function WorkoutMessage({ content, exercises }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">{content}</p>

      {exercises && exercises.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-600/50">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
            Suggested Exercises
          </span>
          {exercises.slice(0, 3).map((exercise, index) => (
            <ExerciseCard key={index} exercise={exercise} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Exercise card component
 */
function ExerciseCard({ exercise }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg">
      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
        <span className="text-lg">🏋️</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{exercise.name}</p>
        <p className="text-xs text-gray-400">
          {exercise.muscles.join(', ')} • {exercise.sets}
        </p>
      </div>
    </div>
  );
}

/**
 * Progress update message
 */
function ProgressMessage({ content }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
          Your Progress
        </span>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}

/**
 * Message with action buttons
 */
function ActionMessage({ content, actions, onActionClick }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">{content}</p>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => onActionClick?.(action.id)}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-full text-blue-300 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Typing indicator component
 */
export function TypingIndicator({ coachName, reducedMotion = false }) {
  return (
    <motion.div
      className="flex gap-2 mb-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex-shrink-0 mt-1">
        <CoachAvatar
          state={AVATAR_STATES.THINKING}
          size="sm"
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="flex flex-col items-start">
        <span className="text-xs text-blue-400 font-medium mb-1 ml-1">
          {coachName}
        </span>
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-gray-700/50">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={
                  reducedMotion
                    ? {}
                    : {
                        y: [0, -6, 0],
                        opacity: [0.4, 1, 0.4],
                      }
                }
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
