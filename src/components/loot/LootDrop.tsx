/**
 * LootDrop Component
 *
 * Full-screen loot drop experience with treasure chest animation,
 * item reveals, and claim functionality. Orchestrates the LootChest
 * and LootReveal components.
 *
 * @example
 * const { generateLoot, showLootDrop } = useLootDrop();
 *
 * const loot = generateLoot({ totalSets: 20, totalVolume: 5000 });
 * showLootDrop(loot, {
 *   onClaim: (items) => console.log('Claimed:', items),
 *   onClose: () => console.log('Closed'),
 * });
 *
 * <LootDrop />
 */

import { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { LootChest, CHEST_STATES } from './LootChest';
import { LootReveal } from './LootReveal';
import { useLootDrop } from './useLootDrop';
import { useReducedMotion } from '../glass/ButtonEffects';
import { useConfetti } from '../celebrations/SuccessBurst';

// ============================================
// ANIMATION VARIANTS
// ============================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

const contentVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// ============================================
// PARTICLE BURST CANVAS
// ============================================

function ParticleBurst({ isActive, colors }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Create particles
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < 60; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const velocity = Math.random() * 8 + 4;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        decay: Math.random() * 0.02 + 0.01,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.opacity -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.opacity <= 0) return false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const outerR = p.size;
          const innerR = p.size * 0.4;
          if (i === 0) {
            ctx.moveTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          } else {
            ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          }
          const innerA = a + Math.PI / 5;
          ctx.lineTo(Math.cos(innerA) * innerR, Math.sin(innerA) * innerR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        return true;
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      particlesRef.current = [];
    };
  }, [isActive, colors, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
}

ParticleBurst.propTypes = {
  isActive: PropTypes.bool.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
};

// ============================================
// CLAIM BUTTON
// ============================================

function ClaimAllButton({ onClick, disabled, itemCount }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      className={clsx(
        'relative px-8 py-4 rounded-2xl',
        'font-bold text-lg text-white',
        'bg-gradient-to-r from-[var(--brand-blue-500)] via-[var(--brand-pulse-500)] to-[var(--brand-blue-500)]',
        'border border-white/20',
        'shadow-xl shadow-[var(--brand-blue-500)]/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:shadow-2xl hover:shadow-[var(--brand-blue-500)]/40',
        'transition-all duration-300'
      )}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !reducedMotion ? { scale: 1.05, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 0.3,
      }}
    >
      {/* Animated gradient */}
      {!reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden"
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
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        </motion.div>
      )}

      <span className="relative z-10 flex items-center gap-3">
        <span>&#x1F381;</span>
        Claim {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
      </span>
    </motion.button>
  );
}

ClaimAllButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  itemCount: PropTypes.number.isRequired,
};

// ============================================
// REVEALED ITEMS LIST
// ============================================

function RevealedItemsList({ items }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-md">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--glass-white-10)] border border-[var(--border-subtle)]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {item.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

RevealedItemsList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LootDrop({ className = '' }) {
  const reducedMotion = useReducedMotion();
  const { fireConfetti } = useConfetti();

  const {
    isOpen,
    currentLootDrop,
    revealedItems,
    currentItem,
    dropState,
    dropRarity,
    allRevealed,
    // openChest is available but triggered automatically by LootChest
    completeCurrentReveal,
    claimAll,
    closeLootDrop,
    skipToClaim,
    LOOT_DROP_STATES: STATES,
  } = useLootDrop();

  // Map drop state to chest state
  const getChestState = useCallback(() => {
    switch (dropState) {
      case STATES.CHEST_CLOSED:
        return CHEST_STATES.CLOSED;
      case STATES.CHEST_OPENING:
        return CHEST_STATES.OPENING;
      case STATES.CHEST_OPEN:
      case STATES.REVEALING:
      case STATES.ALL_REVEALED:
      case STATES.CLAIMING:
      case STATES.CLAIMED:
        return CHEST_STATES.OPEN;
      default:
        return CHEST_STATES.CLOSED;
    }
  }, [dropState, STATES]);

  // Handle chest open
  const handleChestOpen = useCallback(() => {
    if (!reducedMotion) {
      fireConfetti({
        preset: 'achievement',
        origin: { x: 0.5, y: 0.4 },
      });
    }
  }, [fireConfetti, reducedMotion]);

  // Handle claim all
  const handleClaimAll = useCallback(() => {
    if (!reducedMotion) {
      fireConfetti({
        preset: 'levelup',
        origin: { x: 0.5, y: 0.5 },
      });
    }
    claimAll();
  }, [claimAll, fireConfetti, reducedMotion]);

  // Get particle colors based on rarity
  const particleColors = {
    common: ['#9ca3af', '#6b7280', '#d1d5db'],
    rare: ['#3b82f6', '#60a5fa', '#93c5fd'],
    epic: ['#a855f7', '#c084fc', '#d8b4fe'],
    legendary: ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff'],
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (allRevealed) {
          handleClaimAll();
        } else {
          skipToClaim();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allRevealed, handleClaimAll, skipToClaim]);

  if (!isOpen || !currentLootDrop) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={clsx(
          'fixed inset-0 z-50 flex flex-col items-center justify-center',
          className
        )}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={() => {
            if (allRevealed) {
              handleClaimAll();
            }
          }}
        />

        {/* Radial glow */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${
              particleColors[dropRarity]?.[0] || particleColors.common[0]
            }20 0%, transparent 50%)`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Particle burst on chest open */}
        <ParticleBurst
          isActive={dropState === STATES.CHEST_OPENING}
          colors={particleColors[dropRarity] || particleColors.common}
        />

        {/* Main content */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-8"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Chest type label */}
          {dropState === STATES.CHEST_CLOSED && (
            <motion.h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {currentLootDrop.chest.name}
            </motion.h2>
          )}

          {/* Chest */}
          {dropState !== STATES.ALL_REVEALED &&
            dropState !== STATES.CLAIMING &&
            dropState !== STATES.CLAIMED && (
              <LootChest
                state={getChestState()}
                rarity={dropRarity}
                chestType={currentLootDrop.chest.id.toUpperCase()}
                onOpen={handleChestOpen}
                onOpenComplete={() => {}}
                enableSound={!reducedMotion}
              />
            )}

          {/* Current item reveal */}
          <AnimatePresence mode="wait">
            {currentItem && dropState === STATES.REVEALING && (
              <LootReveal
                key={currentItem.id}
                item={currentItem}
                onRevealComplete={completeCurrentReveal}
              />
            )}
          </AnimatePresence>

          {/* All revealed state */}
          {allRevealed && dropState === STATES.ALL_REVEALED && (
            <motion.div
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                Your Loot
              </h2>
              <RevealedItemsList items={revealedItems} />
              <ClaimAllButton
                onClick={handleClaimAll}
                itemCount={revealedItems.length}
              />
            </motion.div>
          )}

          {/* Skip button */}
          {!allRevealed && dropState === STATES.REVEALING && (
            <motion.button
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              onClick={skipToClaim}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Skip
            </motion.button>
          )}

          {/* Close button */}
          <motion.button
            className="absolute top-4 right-4 p-2 rounded-full bg-[var(--glass-white-10)] hover:bg-[var(--glass-white-20)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            onClick={closeLootDrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

LootDrop.propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default LootDrop;
