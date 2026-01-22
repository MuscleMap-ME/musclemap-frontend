/**
 * ChallengeCard Component
 *
 * Individual challenge card showing type, progress, rewards, and claim button.
 * Features glass styling, animated progress bar, and celebration on completion.
 *
 * @example
 * <ChallengeCard
 *   challenge={challenge}
 *   onClaimReward={() => handleClaim(challenge.id)}
 * />
 */

import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ChallengeProgress } from './ChallengeProgress';
import { RewardBadge } from './ChallengeReward';
import { useReducedMotion } from '../glass/ButtonEffects';
import { DIFFICULTY } from './challengeDefinitions';

// ============================================
// DIFFICULTY BADGE
// ============================================

const difficultyConfig = {
  [DIFFICULTY.EASY]: {
    label: 'Easy',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  [DIFFICULTY.MEDIUM]: {
    label: 'Medium',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  [DIFFICULTY.HARD]: {
    label: 'Hard',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

function DifficultyBadge({ difficulty }) {
  const config = difficultyConfig[difficulty] || difficultyConfig[DIFFICULTY.EASY];

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.color,
        config.bgColor,
        config.borderColor
      )}
    >
      {config.label}
    </span>
  );
}

DifficultyBadge.propTypes = {
  difficulty: PropTypes.string.isRequired,
};

// ============================================
// CLAIM BUTTON
// ============================================

function ClaimButton({ onClick, disabled, isLoading }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      className={clsx(
        'relative px-4 py-2 rounded-lg',
        'font-semibold text-sm',
        'bg-gradient-to-r from-[var(--brand-blue-500)] to-[var(--brand-blue-600)]',
        'text-white',
        'border border-white/10',
        'shadow-md shadow-[var(--brand-blue-500)]/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:shadow-lg hover:shadow-[var(--brand-blue-500)]/30',
        'transition-all duration-200'
      )}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={!disabled && !reducedMotion ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
    >
      {/* Shimmer effect */}
      {!reducedMotion && !disabled && (
        <motion.div
          className="absolute inset-0 rounded-lg overflow-hidden"
          initial={false}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        </motion.div>
      )}

      <span className="relative z-10 flex items-center gap-1.5">
        {isLoading ? (
          <>
            <span className="animate-spin">&#x23F3;</span>
            Claiming...
          </>
        ) : (
          <>
            <span>&#x1F381;</span>
            Claim
          </>
        )}
      </span>
    </motion.button>
  );
}

ClaimButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
};

// ============================================
// COMPLETION INDICATOR
// ============================================

function CompletionIndicator({ isClaimed }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="flex items-center gap-2 text-emerald-400"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      <motion.span
        animate={!reducedMotion && !isClaimed ? {
          scale: [1, 1.2, 1],
        } : undefined}
        transition={{
          duration: 0.8,
          repeat: isClaimed ? 0 : Infinity,
          repeatDelay: 1,
        }}
      >
        {isClaimed ? '&#x2705;' : '&#x2728;'}
      </motion.span>
      <span className="text-sm font-medium">
        {isClaimed ? 'Claimed' : 'Complete!'}
      </span>
    </motion.div>
  );
}

CompletionIndicator.propTypes = {
  isClaimed: PropTypes.bool.isRequired,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function ChallengeCard({
  challenge,
  onClaimReward,
  isClaimingReward = false,
  className = '',
}) {
  const reducedMotion = useReducedMotion();

  // Extract challenge properties with defaults
  const {
    type = '',
    difficulty = DIFFICULTY.EASY,
    description = '',
    currentProgress = 0,
    target = 0,
    isComplete = false,
    isClaimed = false,
    percentage = 0,
    rewards = null,
  } = challenge || {};

  // Determine progress bar variant - must be called before any early returns
  const progressVariant = useMemo(() => {
    if (isComplete) return 'success';
    if (difficulty === DIFFICULTY.HARD) return 'pulse';
    return 'brand';
  }, [isComplete, difficulty]);

  // Handle claim click - must be called before any early returns
  const handleClaim = useCallback(() => {
    if (isComplete && !isClaimed) {
      onClaimReward?.();
    }
  }, [isComplete, isClaimed, onClaimReward]);

  // Early return if challenge is invalid
  if (!challenge || !type) {
    return null;
  }

  return (
    <motion.div
      className={clsx(
        'relative p-4 rounded-xl',
        'bg-[var(--glass-white-5)]',
        'border',
        isComplete && !isClaimed
          ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10'
          : 'border-[var(--border-subtle)]',
        'transition-colors duration-300',
        className
      )}
      layout
    >
      {/* Complete glow effect */}
      <AnimatePresence>
        {isComplete && !isClaimed && !reducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.1), transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <motion.span
              className="text-2xl"
              animate={isComplete && !isClaimed && !reducedMotion ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              } : undefined}
              transition={{
                duration: 0.6,
                repeat: isComplete && !isClaimed ? Infinity : 0,
                repeatDelay: 2,
              }}
            >
              {type.icon}
            </motion.span>

            <div>
              {/* Title */}
              <h3 className="font-semibold text-[var(--text-primary)]">
                {type.title}
              </h3>
              {/* Description */}
              <p className="text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            </div>
          </div>

          {/* Difficulty badge */}
          <DifficultyBadge difficulty={difficulty} />
        </div>

        {/* Progress section */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-[var(--text-tertiary)]">
              {currentProgress.toLocaleString()} / {target.toLocaleString()}
            </span>
            <span className="text-[var(--text-secondary)] font-medium">
              {Math.round(percentage)}%
            </span>
          </div>
          <ChallengeProgress
            current={currentProgress}
            target={target}
            isComplete={isComplete}
            variant={progressVariant}
            size="md"
          />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          {/* Rewards */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wide">
              Rewards:
            </span>
            <RewardBadge
              xp={rewards.xp}
              credits={rewards.credits}
              size="sm"
            />
          </div>

          {/* Claim button or completion indicator */}
          <div>
            {!isComplete ? (
              <span className="text-sm text-[var(--text-quaternary)]">
                In Progress
              </span>
            ) : isClaimed ? (
              <CompletionIndicator isClaimed={true} />
            ) : (
              <ClaimButton
                onClick={handleClaim}
                disabled={isClaimingReward}
                isLoading={isClaimingReward}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

ChallengeCard.propTypes = {
  /** Challenge object with all metadata and progress */
  challenge: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
    }).isRequired,
    difficulty: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    currentProgress: PropTypes.number.isRequired,
    target: PropTypes.number.isRequired,
    isComplete: PropTypes.bool.isRequired,
    isClaimed: PropTypes.bool.isRequired,
    percentage: PropTypes.number.isRequired,
    rewards: PropTypes.shape({
      xp: PropTypes.number.isRequired,
      credits: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  /** Callback when claim button is clicked */
  onClaimReward: PropTypes.func,
  /** Whether reward is currently being claimed */
  isClaimingReward: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default ChallengeCard;
