/**
 * LootReveal Component
 *
 * Animated item reveal with rarity-based glow effects, particle burst,
 * and floating animation. Each rarity tier has distinct visual effects.
 *
 * Rarity effects:
 * - Common: white glow
 * - Uncommon: green glow
 * - Rare: blue glow
 * - Epic: purple glow
 * - Legendary: gold glow with extra particles
 *
 * @example
 * <LootReveal
 *   item={{ id: '1', name: 'XP Boost', icon: '⭐', rarity: 'rare', description: '+50 XP' }}
 *   onRevealComplete={() => console.log('Revealed!')}
 * />
 */

import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// RARITY CONFIGURATIONS
// ============================================

/**
 * Extended rarity colors including uncommon
 */
const EXTENDED_RARITY_COLORS = {
  common: {
    primary: '#9ca3af',
    glow: 'rgba(156, 163, 175, 0.5)',
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    particleColors: ['#9ca3af', '#d1d5db', '#e5e7eb'],
    glowIntensity: 1,
  },
  uncommon: {
    primary: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.5)',
    gradient: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    particleColors: ['#22c55e', '#4ade80', '#86efac'],
    glowIntensity: 1.2,
  },
  rare: {
    primary: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.5)',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    particleColors: ['#3b82f6', '#60a5fa', '#93c5fd'],
    glowIntensity: 1.5,
  },
  epic: {
    primary: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.5)',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
    particleColors: ['#a855f7', '#c084fc', '#d8b4fe'],
    glowIntensity: 2,
  },
  legendary: {
    primary: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.6)',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    particleColors: ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff'],
    glowIntensity: 3,
    extraParticles: true,
  },
};

// ============================================
// PARTICLE CANVAS
// ============================================

function RevealParticles({ rarity, isActive }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const colors = EXTENDED_RARITY_COLORS[rarity]?.particleColors ||
    EXTENDED_RARITY_COLORS.common.particleColors;
  const isLegendary = rarity === 'legendary';

  useEffect(() => {
    if (!isActive || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create particles
    const particleCount = isLegendary ? 40 : 24;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = Math.random() * 4 + 2;
      const distance = 30 + Math.random() * 20;

      particlesRef.current.push({
        x: centerX + Math.cos(angle) * distance * 0.3,
        y: centerY + Math.sin(angle) * distance * 0.3,
        vx: Math.cos(angle) * velocity * (isLegendary ? 1.5 : 1),
        vy: Math.sin(angle) * velocity * (isLegendary ? 1.5 : 1),
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        decay: Math.random() * 0.015 + 0.008,
        type: Math.random() > 0.6 ? 'star' : 'circle',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      });
    }

    // Legendary sparkles
    if (isLegendary) {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 60 + 40;
        particlesRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 - 1,
          size: Math.random() * 3 + 1,
          color: '#ffffff',
          opacity: Math.random() * 0.5 + 0.5,
          decay: Math.random() * 0.02 + 0.01,
          type: 'sparkle',
          rotation: 0,
          rotationSpeed: 0,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // subtle gravity
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.opacity -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.twinkle !== undefined) {
          p.twinkle += 0.2;
          p.opacity = Math.sin(p.twinkle) * 0.5 + 0.5;
          p.opacity -= p.decay * 10;
        }

        if (p.opacity <= 0) return false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.type === 'star') {
          // Draw star
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
        } else if (p.type === 'sparkle') {
          // Draw sparkle (4-pointed star)
          ctx.beginPath();
          const spikes = 4;
          for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 === 0 ? p.size : p.size * 0.3;
            const a = (i * Math.PI) / spikes;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw circle
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

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
  }, [isActive, colors, isLegendary, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

RevealParticles.propTypes = {
  rarity: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
};

// ============================================
// GLOW RING ANIMATION
// ============================================

function GlowRing({ rarity }) {
  const reducedMotion = useReducedMotion();
  const config = EXTENDED_RARITY_COLORS[rarity] || EXTENDED_RARITY_COLORS.common;

  if (reducedMotion) return null;

  return (
    <>
      {/* Inner glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
          filter: `blur(${config.glowIntensity * 10}px)`,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0, 1, 0.7],
          scale: [0.5, 1.2, 1],
        }}
        transition={{
          duration: 0.6,
          ease: 'easeOut',
        }}
      />

      {/* Pulsing ring */}
      <motion.div
        className="absolute inset-[-20px] rounded-full border-2"
        style={{
          borderColor: config.primary,
          boxShadow: `0 0 ${config.glowIntensity * 15}px ${config.glow}`,
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: [0.8, 1.2, 1],
          opacity: [0, 1, 0.5],
        }}
        transition={{
          duration: 0.8,
          ease: 'easeOut',
        }}
      />

      {/* Legendary extra rings */}
      {rarity === 'legendary' && (
        <>
          <motion.div
            className="absolute inset-[-40px] rounded-full border"
            style={{
              borderColor: config.primary,
              boxShadow: `0 0 20px ${config.glow}`,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.8, 1.3, 1.1],
              opacity: [0, 0.8, 0.3],
            }}
            transition={{
              duration: 1,
              delay: 0.2,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute inset-[-60px] rounded-full border"
            style={{
              borderColor: config.primary,
              boxShadow: `0 0 30px ${config.glow}`,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.8, 1.4, 1.2],
              opacity: [0, 0.6, 0.2],
            }}
            transition={{
              duration: 1.2,
              delay: 0.4,
              ease: 'easeOut',
            }}
          />
        </>
      )}
    </>
  );
}

GlowRing.propTypes = {
  rarity: PropTypes.string.isRequired,
};

// ============================================
// RARITY BADGE
// ============================================

function RarityBadge({ rarity }) {
  const config = EXTENDED_RARITY_COLORS[rarity] || EXTENDED_RARITY_COLORS.common;
  const label = rarity.charAt(0).toUpperCase() + rarity.slice(1);

  return (
    <motion.span
      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{
        background: config.gradient,
        color: rarity === 'common' ? '#1f2937' : '#ffffff',
        boxShadow: `0 0 10px ${config.glow}`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {label}
    </motion.span>
  );
}

RarityBadge.propTypes = {
  rarity: PropTypes.string.isRequired,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LootReveal({
  item,
  onRevealComplete,
  autoAdvanceDelay = 2000,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const timerRef = useRef(null);

  const { name, icon, rarity, description } = item;
  const config = EXTENDED_RARITY_COLORS[rarity] || EXTENDED_RARITY_COLORS.common;

  // Auto-advance after delay
  useEffect(() => {
    if (autoAdvanceDelay > 0) {
      timerRef.current = setTimeout(() => {
        onRevealComplete?.();
      }, autoAdvanceDelay);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [autoAdvanceDelay, onRevealComplete]);

  // Handle tap to advance
  const handleTap = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onRevealComplete?.();
  }, [onRevealComplete]);

  return (
    <motion.div
      className={clsx(
        'relative flex flex-col items-center gap-6 p-8 cursor-pointer',
        className
      )}
      onClick={handleTap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -50 }}
      transition={{ duration: 0.3 }}
    >
      {/* Particle effects */}
      <RevealParticles rarity={rarity} isActive={true} />

      {/* Icon container with glow */}
      <motion.div
        className="relative w-32 h-32 flex items-center justify-center"
        initial={{ scale: 0, rotateY: -180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
      >
        {/* Glow effects */}
        <GlowRing rarity={rarity} />

        {/* Icon background */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: config.gradient,
            opacity: 0.2,
          }}
          animate={!reducedMotion ? {
            opacity: [0.15, 0.25, 0.15],
          } : undefined}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Icon */}
        <motion.span
          className="relative z-10 text-6xl"
          style={{
            filter: `drop-shadow(0 0 ${config.glowIntensity * 8}px ${config.glow})`,
          }}
          initial={{ scale: 0, rotate: -30 }}
          animate={{
            scale: 1,
            rotate: 0,
            y: reducedMotion ? 0 : [0, -5, 0],
          }}
          transition={{
            scale: {
              type: 'spring',
              stiffness: 300,
              damping: 15,
              delay: 0.1,
            },
            y: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          {icon}
        </motion.span>
      </motion.div>

      {/* Item info */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Rarity badge */}
        <RarityBadge rarity={rarity} />

        {/* Name */}
        <motion.h3
          className="text-2xl font-bold text-[var(--text-primary)] mt-3"
          style={{
            textShadow: `0 0 20px ${config.glow}`,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {name}
        </motion.h3>

        {/* Description */}
        <motion.p
          className="text-[var(--text-secondary)] mt-2 max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {description}
        </motion.p>
      </motion.div>

      {/* Tap to continue hint */}
      <motion.span
        className="text-xs text-[var(--text-quaternary)] mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Tap to continue
      </motion.span>
    </motion.div>
  );
}

LootReveal.propTypes = {
  /** Loot item to reveal */
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    rarity: PropTypes.oneOf(['common', 'uncommon', 'rare', 'epic', 'legendary']).isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  /** Callback when reveal is complete */
  onRevealComplete: PropTypes.func,
  /** Auto-advance delay in ms (0 to disable) */
  autoAdvanceDelay: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default LootReveal;
