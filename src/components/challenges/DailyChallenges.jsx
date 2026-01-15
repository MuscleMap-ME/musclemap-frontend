/**
 * DailyChallenges Component
 *
 * Displays the 3 daily challenges with progress tracking, countdown timer,
 * and celebration animations on completion. Challenges refresh at midnight.
 *
 * @example
 * <DailyChallenges
 *   userId="user123"
 *   onChallengeComplete={(challenge) => console.log('Completed:', challenge)}
 *   onRewardClaimed={(challenge, rewards) => console.log('Claimed:', rewards)}
 * />
 */

import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useDailyChallenges } from './useDailyChallenges';
import { ChallengeCard } from './ChallengeCard';
import { ChallengeTimer } from './ChallengeTimer';
import { ChallengeReward } from './ChallengeReward';
import { useConfetti } from '../celebrations/SuccessBurst';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
};

// ============================================
// CLAIM ALL BUTTON
// ============================================

function ClaimAllButton({ count, totalXp, totalCredits, onClick, disabled }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      className={clsx(
        'relative flex items-center gap-3 px-6 py-3 rounded-xl',
        'font-semibold text-white',
        'bg-gradient-to-r from-[var(--brand-blue-600)] to-[var(--brand-pulse-600)]',
        'border border-white/10',
        'shadow-lg shadow-[var(--brand-blue-500)]/20',
        'hover:shadow-xl hover:shadow-[var(--brand-blue-500)]/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-all duration-200'
      )}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !reducedMotion ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      {/* Glow effect */}
      {!reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      )}

      <span>Claim All ({count})</span>
      <span className="flex items-center gap-2 text-sm opacity-80">
        <span>+{totalXp} XP</span>
        <span className="text-[var(--text-quaternary)]">|</span>
        <span>+{totalCredits} Credits</span>
      </span>
    </motion.button>
  );
}

ClaimAllButton.propTypes = {
  count: PropTypes.number.isRequired,
  totalXp: PropTypes.number.isRequired,
  totalCredits: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// ============================================
// COMPLETION CELEBRATION
// ============================================

function AllCompleteCelebration({ isVisible, onDismiss }) {
  const reducedMotion = useReducedMotion();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        <motion.div
          className="relative p-8 rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glow)] text-center max-w-md mx-4"
          initial={{ scale: 0.5, opacity: 0, rotateX: -30 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow background */}
          {!reducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'radial-gradient(circle at 50% 30%, rgba(255,215,0,0.2), transparent 70%)',
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          )}

          <motion.div
            className="text-6xl mb-4"
            animate={!reducedMotion ? {
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            } : undefined}
            transition={{
              duration: 0.6,
              repeat: 2,
            }}
          >
            &#x1F3C6;
          </motion.div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            All Challenges Complete!
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Amazing work! You have conquered all of today&apos;s challenges.
          </p>

          <button
            onClick={onDismiss}
            className={clsx(
              'px-6 py-2 rounded-lg',
              'bg-[var(--brand-blue-500)] hover:bg-[var(--brand-blue-600)]',
              'text-white font-medium',
              'transition-colors duration-200'
            )}
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

AllCompleteCelebration.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function DailyChallenges({
  userId = 'anonymous',
  onChallengeComplete,
  onRewardClaimed,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const { fireConfetti } = useConfetti();
  const [showAllCompleteCelebration, setShowAllCompleteCelebration] = useState(false);
  const [claimingReward, setClaimingReward] = useState(null);

  // Handle challenge completion
  const handleChallengeComplete = useCallback(
    (challenge) => {
      // Fire confetti for completion
      if (!reducedMotion) {
        fireConfetti({ preset: 'subtle', origin: { x: 0.5, y: 0.5 } });
      }
      onChallengeComplete?.(challenge);
    },
    [fireConfetti, onChallengeComplete, reducedMotion]
  );

  // Handle reward claimed
  const handleRewardClaimed = useCallback(
    (challenge, rewards) => {
      setClaimingReward(challenge.id);
      setTimeout(() => setClaimingReward(null), 1200);
      onRewardClaimed?.(challenge, rewards);
    },
    [onRewardClaimed]
  );

  const {
    challenges,
    timeUntilReset,
    claimReward,
    claimAll,
    allComplete,
    allClaimed,
    unclaimedComplete,
  } = useDailyChallenges({
    userId,
    onChallengeComplete: handleChallengeComplete,
    onRewardClaimed: handleRewardClaimed,
  });

  // Handle individual claim
  const handleClaimReward = useCallback(
    (challengeId) => {
      const rewards = claimReward(challengeId);
      if (rewards && !reducedMotion) {
        fireConfetti({ preset: 'workout', origin: { x: 0.5, y: 0.5 } });
      }
    },
    [claimReward, fireConfetti, reducedMotion]
  );

  // Handle claim all
  const handleClaimAll = useCallback(() => {
    const rewards = claimAll();
    if (rewards.xp > 0 || rewards.credits > 0) {
      if (!reducedMotion) {
        fireConfetti({ preset: 'achievement', origin: { x: 0.5, y: 0.4 } });
      }
      // Show celebration if all complete
      if (allComplete) {
        setShowAllCompleteCelebration(true);
      }
    }
  }, [claimAll, allComplete, fireConfetti, reducedMotion]);

  // Calculate totals for claim all
  const totalRewards = challenges
    .filter((c) => c.isComplete && !c.isClaimed)
    .reduce(
      (acc, c) => ({
        xp: acc.xp + c.rewards.xp,
        credits: acc.credits + c.rewards.credits,
      }),
      { xp: 0, credits: 0 }
    );

  return (
    <>
      <motion.div
        className={clsx(
          'relative p-6 rounded-2xl',
          'bg-[var(--surface-glass)] backdrop-blur-lg',
          'border border-[var(--border-default)]',
          className
        )}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          variants={headerVariants}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#x1F3AF;</span>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Daily Challenges
              </h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                Complete all 3 for bonus rewards
              </p>
            </div>
          </div>

          <ChallengeTimer
            hours={timeUntilReset.hours}
            minutes={timeUntilReset.minutes}
            seconds={timeUntilReset.seconds}
          />
        </motion.div>

        {/* Challenge cards */}
        <div className="space-y-4 mb-6">
          {challenges.map((challenge) => (
            <motion.div key={challenge.id} variants={cardVariants}>
              <ChallengeCard
                challenge={challenge}
                onClaimReward={() => handleClaimReward(challenge.id)}
                isClaimingReward={claimingReward === challenge.id}
              />
            </motion.div>
          ))}
        </div>

        {/* Claim All button */}
        <AnimatePresence>
          {unclaimedComplete > 0 && (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ClaimAllButton
                count={unclaimedComplete}
                totalXp={totalRewards.xp}
                totalCredits={totalRewards.credits}
                onClick={handleClaimAll}
                disabled={allClaimed}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* All complete indicator */}
        {allClaimed && (
          <motion.div
            className="text-center py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
              <span>&#x2705;</span>
              All challenges completed!
            </span>
          </motion.div>
        )}

        {/* Reward reveal overlay */}
        <AnimatePresence>
          {claimingReward && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChallengeReward
                xp={challenges.find((c) => c.id === claimingReward)?.rewards.xp || 0}
                credits={challenges.find((c) => c.id === claimingReward)?.rewards.credits || 0}
                isRevealing={true}
                size="lg"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* All complete celebration modal */}
      <AllCompleteCelebration
        isVisible={showAllCompleteCelebration}
        onDismiss={() => setShowAllCompleteCelebration(false)}
      />
    </>
  );
}

DailyChallenges.propTypes = {
  /** User ID for personalized challenge selection */
  userId: PropTypes.string,
  /** Callback when a challenge is completed */
  onChallengeComplete: PropTypes.func,
  /** Callback when a reward is claimed */
  onRewardClaimed: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default DailyChallenges;
