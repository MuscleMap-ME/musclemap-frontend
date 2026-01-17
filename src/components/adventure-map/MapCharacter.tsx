/**
 * MapCharacter
 *
 * Renders the player's companion character on the adventure map.
 * Supports idle, walking, and teleport animations.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MapCharacterProps } from './types';

// Stage emoji representations (matching CompanionCharacter)
const STAGE_EMOJIS: Record<number, string> = {
  1: '🥚',
  2: '🐣',
  3: '🐥',
  4: '🦅',
  5: '🦋',
  6: '🌟',
};

// Aura visual effects
const AURA_COLORS: Record<string, string> = {
  'aura-gold': 'rgba(250, 204, 21, 0.5)',
  'aura-ember': 'rgba(249, 115, 22, 0.5)',
  'aura-frost': 'rgba(34, 211, 238, 0.5)',
  'aura-shadow': 'rgba(139, 92, 246, 0.6)',
  'aura-cosmic': 'rgba(167, 139, 250, 0.5)',
};

export default function MapCharacter({
  position,
  state,
  companionData,
  reducedMotion = false,
}: MapCharacterProps) {
  const { stage = 1, equipped = {} } = companionData;
  const emoji = STAGE_EMOJIS[stage] || STAGE_EMOJIS[1];
  const auraColor = equipped.aura ? AURA_COLORS[equipped.aura] : 'rgba(147, 51, 234, 0.4)';

  // Animation variants
  const characterVariants = {
    idle: {
      y: [0, -4, 0],
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: 'easeInOut',
      },
    },
    walking: {
      y: [0, -8, 0],
      transition: {
        repeat: Infinity,
        duration: 0.35,
        ease: 'easeInOut',
      },
    },
    teleporting: {
      scale: [1, 0, 0, 1],
      rotate: [0, 180, 360, 360],
      opacity: [1, 0.5, 0.5, 1],
      transition: {
        duration: 0.5,
        times: [0, 0.3, 0.7, 1],
      },
    },
  };

  // Shadow variants
  const shadowVariants = {
    idle: {
      scale: [1, 0.9, 1],
      opacity: [0.3, 0.25, 0.3],
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: 'easeInOut',
      },
    },
    walking: {
      scale: [1, 0.7, 1],
      opacity: [0.3, 0.2, 0.3],
      transition: {
        repeat: Infinity,
        duration: 0.35,
        ease: 'easeInOut',
      },
    },
    teleporting: {
      scale: [1, 0, 0, 1],
      opacity: [0.3, 0, 0, 0.3],
      transition: {
        duration: 0.5,
        times: [0, 0.3, 0.7, 1],
      },
    },
  };

  // Use static variant if reduced motion
  const animationState = reducedMotion ? 'idle' : state;

  return (
    <motion.g
      className="map-character"
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {/* Shadow */}
      <motion.ellipse
        cx={0}
        cy={25}
        rx={18}
        ry={6}
        fill="rgba(0, 0, 0, 0.3)"
        variants={shadowVariants}
        animate={animationState}
      />

      {/* Teleport particle effects */}
      <AnimatePresence>
        {state === 'teleporting' && !reducedMotion && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.circle
                key={i}
                r={3}
                fill={auraColor}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: Math.cos((i * Math.PI) / 4) * 40,
                  y: Math.sin((i * Math.PI) / 4) * 40 - 10,
                  opacity: 0,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.03,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Outer aura glow */}
      <motion.circle
        cx={0}
        cy={0}
        r={28}
        fill={auraColor}
        filter="url(#character-glow)"
        initial={{ opacity: 0.4 }}
        animate={{
          opacity: state === 'walking' ? [0.3, 0.5, 0.3] : [0.4, 0.6, 0.4],
          scale: state === 'walking' ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: state === 'walking' ? 0.35 : 2,
        }}
      />

      {/* Inner aura ring */}
      <motion.circle
        cx={0}
        cy={0}
        r={22}
        fill="none"
        stroke={auraColor}
        strokeWidth={2}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />

      {/* Character body */}
      <motion.g variants={characterVariants} animate={animationState}>
        {/* Main circle background */}
        <circle
          cx={0}
          cy={0}
          r={20}
          fill="rgba(0, 0, 0, 0.7)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={2}
        />

        {/* Gradient overlay */}
        <circle
          cx={0}
          cy={0}
          r={18}
          fill="url(#character-gradient)"
          fillOpacity={0.4}
        />

        {/* Stage emoji */}
        <text
          x={0}
          y={8}
          textAnchor="middle"
          fontSize={24}
          style={{ pointerEvents: 'none' }}
        >
          {emoji}
        </text>

        {/* Equipped wings (stages 3+) */}
        {equipped.wings && stage >= 3 && (
          <motion.text
            x={0}
            y={-18}
            textAnchor="middle"
            fontSize={14}
            animate={{ y: [-18, -20, -18] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {equipped.wings === 'wings-dragon' ? '🐉' : '🦋'}
          </motion.text>
        )}

        {/* Equipped armor */}
        {equipped.armor && (
          <text
            x={0}
            y={26}
            textAnchor="middle"
            fontSize={12}
          >
            🛡️
          </text>
        )}

        {/* Equipped tools */}
        {equipped.tools && (
          <text
            x={18}
            y={0}
            textAnchor="middle"
            fontSize={10}
          >
            {equipped.tools === 'tool-slate'
              ? '📊'
              : equipped.tools === 'tool-trophy'
              ? '🏆'
              : '🔮'}
          </text>
        )}
      </motion.g>

      {/* Stage level indicator */}
      <g transform="translate(14, -14)">
        <circle r={10} fill="#8b5cf6" stroke="white" strokeWidth={1.5} />
        <text
          y={4}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontWeight="bold"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {stage}
        </text>
      </g>

      {/* Movement direction indicator when walking */}
      {state === 'walking' && !reducedMotion && (
        <motion.circle
          r={4}
          fill="rgba(251, 191, 36, 0.8)"
          initial={{ x: 0, y: -35, opacity: 0 }}
          animate={{
            y: [-35, -40, -35],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        />
      )}

      {/* Glow filter definition */}
      <defs>
        <filter id="character-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="character-gradient">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
        </radialGradient>
      </defs>
    </motion.g>
  );
}
