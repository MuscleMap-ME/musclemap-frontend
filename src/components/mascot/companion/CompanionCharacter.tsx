/**
 * CompanionCharacter
 *
 * Renders the companion creature with stage-appropriate visuals and cosmetics.
 * Supports both Rive animations and emoji fallbacks.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

// Stage emoji representations (fallback when Rive isn't available)
const STAGE_EMOJIS = {
  1: { emoji: '🥚', label: 'Baby' },
  2: { emoji: '🐣', label: 'Adolescent' },
  3: { emoji: '🐥', label: 'Capable' },
  4: { emoji: '🦅', label: 'Armored' },
  5: { emoji: '🦋', label: 'Flying' },
  6: { emoji: '🌟', label: 'Magnificent' },
};

// Aura visual effects
const AURA_EFFECTS = {
  'aura-gold': 'shadow-2xl shadow-yellow-400/50',
  'aura-ember': 'shadow-2xl shadow-orange-500/50',
  'aura-frost': 'shadow-2xl shadow-cyan-400/50',
  'aura-shadow': 'shadow-2xl shadow-purple-900/70',
  'aura-cosmic': 'shadow-2xl shadow-violet-400/60',
};

// Reaction animations
const reactionVariants = {
  idle: {
    scale: 1,
    y: 0,
    rotate: 0,
  },
  workout_logged: {
    scale: [1, 1.2, 1],
    y: [0, -10, 0],
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  streak_hit: {
    rotate: [0, 10, -10, 10, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 0.8 },
  },
  pr_set: {
    scale: [1, 1.3, 1],
    y: [0, -20, 0],
    transition: { duration: 0.8, ease: 'easeOut' },
  },
  upgrade_purchased: {
    scale: [1, 1.2, 0.9, 1.1, 1],
    rotate: [0, 0, 360],
    transition: { duration: 1 },
  },
  stage_evolved: {
    scale: [1, 0.8, 1.5, 1.2],
    y: [0, 10, -30, 0],
    transition: { duration: 1.5, ease: 'easeOut' },
  },
};

export default function CompanionCharacter({
  stage = 1,
  equipped = {},
  reaction = null,
  reducedMotion = false,
  className = '',
}) {
  const [animating, setAnimating] = useState(false);
  const [currentReaction, setCurrentReaction] = useState(null);

  // Handle reaction animations
  useEffect(() => {
    if (reaction && !reducedMotion) {
      setCurrentReaction(reaction);
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        setCurrentReaction(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [reaction, reducedMotion]);

  // Compute aura class
  const auraClass = useMemo(() => {
    if (!equipped.aura) return '';
    return AURA_EFFECTS[equipped.aura] || '';
  }, [equipped.aura]);

  // Get stage emoji
  const stageData = STAGE_EMOJIS[stage] || STAGE_EMOJIS[1];

  // Animation variant
  const animationVariant = currentReaction
    ? reactionVariants[currentReaction] || reactionVariants.idle
    : reactionVariants.idle;

  return (
    <motion.div
      className={`relative w-full h-full flex items-center justify-center ${className}`}
      animate={animating ? animationVariant : 'idle'}
      variants={reactionVariants}
    >
      {/* Main character container */}
      <div
        className={`
          relative w-full h-full flex flex-col items-center justify-center
          rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20
          ${auraClass}
          transition-shadow duration-300
        `}
      >
        {/* Stage emoji */}
        <span
          className="text-5xl select-none"
          role="img"
          aria-label={stageData.label}
        >
          {stageData.emoji}
        </span>

        {/* Equipped wings (stages 3+) */}
        {equipped.wings && stage >= 3 && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl animate-pulse">
            {equipped.wings === 'wings-dragon' ? '🐉' : '🦋'}
          </span>
        )}

        {/* Equipped armor */}
        {equipped.armor && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg">
            🛡️
          </span>
        )}

        {/* Equipped tools */}
        {equipped.tools && (
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 text-sm">
            {equipped.tools === 'tool-slate' ? '📊' :
             equipped.tools === 'tool-trophy' ? '🏆' : '🔮'}
          </span>
        )}

        {/* Stage indicator glow */}
        <div
          className={`
            absolute inset-0 rounded-full pointer-events-none
            bg-gradient-to-br from-purple-500/10 to-indigo-500/10
            ${stage >= 4 ? 'animate-pulse' : ''}
          `}
        />
      </div>

      {/* Badge display */}
      {equipped.badge && (
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs shadow-lg">
          {equipped.badge === 'badge-streak-7' ? '7' :
           equipped.badge === 'badge-streak-30' ? '30' : '🏅'}
        </div>
      )}
    </motion.div>
  );
}
