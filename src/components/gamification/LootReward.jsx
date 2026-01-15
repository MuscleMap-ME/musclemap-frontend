/**
 * LootReward Component (Gamification Module)
 *
 * Individual reward card that animates in during loot reveal.
 * Displays reward icon, name, quantity, and rarity glow with flip animation.
 *
 * @example
 * import { LootReward } from '@/components/gamification';
 *
 * <LootReward
 *   reward={{ id: '1', name: 'XP Boost', icon: 'star', amount: 100, rarity: 'rare' }}
 *   index={0}
 *   rarity="rare"
 * />
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useReducedMotion } from '../glass/ButtonEffects';
import { RARITY_COLORS } from '../loot/lootDefinitions';

// ============================================
// ANIMATION VARIANTS
// ============================================

const cardVariants = {
  hidden: {
    opacity: 0,
    rotateY: -180,
    scale: 0.5,
    y: 50,
  },
  visible: (index) => ({
    opacity: 1,
    rotateY: 0,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: index * 0.15,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -30,
    transition: {
      duration: 0.2,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -45 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
      delay: 0.2,
    },
  },
};

const glowVariants = {
  idle: {
    opacity: 0.5,
    scale: 1,
  },
  pulse: {
    opacity: [0.4, 0.8, 0.4],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LootReward({ reward, index = 0, rarity, className = '' }) {
  const reducedMotion = useReducedMotion();

  const effectiveRarity = rarity || reward.rarity || 'common';
  const colors = RARITY_COLORS[effectiveRarity] || RARITY_COLORS.common;

  // Format quantity display
  const quantityDisplay = useMemo(() => {
    if (!reward.amount && !reward.quantity) return null;
    const value = reward.amount || reward.quantity;
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  }, [reward.amount, reward.quantity]);

  return (
    <motion.div
      className={clsx(
        'relative flex flex-col items-center p-4 rounded-xl',
        'bg-[var(--surface-glass)] backdrop-blur-lg',
        'border border-[var(--border-default)]',
        'min-w-[120px]',
        className
      )}
      style={{
        borderColor: colors.border,
        boxShadow: `0 0 20px ${colors.glow}`,
      }}
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Glow background */}
      {!reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${colors.glow}, transparent 70%)`,
          }}
          variants={glowVariants}
          animate="pulse"
        />
      )}

      {/* Rarity indicator */}
      <motion.div
        className="absolute -top-2 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.15 + 0.3 }}
      >
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: colors.gradient,
            color: effectiveRarity === 'common' ? '#1f2937' : '#ffffff',
          }}
        >
          {effectiveRarity}
        </span>
      </motion.div>

      {/* Icon */}
      <motion.div
        className="relative z-10 text-4xl mb-2 mt-3"
        variants={iconVariants}
        initial="hidden"
        animate="visible"
        style={{
          filter: `drop-shadow(0 0 10px ${colors.glow})`,
        }}
      >
        {reward.icon}
      </motion.div>

      {/* Name */}
      <motion.h4
        className="text-sm font-semibold text-[var(--text-primary)] text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.15 + 0.4 }}
      >
        {reward.name}
      </motion.h4>

      {/* Quantity */}
      {quantityDisplay && (
        <motion.span
          className="text-lg font-bold mt-1"
          style={{ color: colors.primary }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: index * 0.15 + 0.5,
            type: 'spring',
            stiffness: 300,
          }}
        >
          +{quantityDisplay}
        </motion.span>
      )}

      {/* Description */}
      {reward.description && (
        <motion.p
          className="text-xs text-[var(--text-tertiary)] text-center mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.15 + 0.6 }}
        >
          {reward.description}
        </motion.p>
      )}
    </motion.div>
  );
}

LootReward.propTypes = {
  /** Reward object with item details */
  reward: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    amount: PropTypes.number,
    quantity: PropTypes.number,
    description: PropTypes.string,
    rarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']),
  }).isRequired,
  /** Index for stagger animation */
  index: PropTypes.number,
  /** Override rarity for styling */
  rarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']),
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default LootReward;
