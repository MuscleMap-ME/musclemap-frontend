/**
 * CompanionWidget
 *
 * Displays the companion character in the HUD with stage and equipped items.
 */

import React from 'react';
import { motion } from 'framer-motion';

// Stage emoji representations
const STAGE_EMOJIS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🥚', label: 'Baby' },
  2: { emoji: '🐣', label: 'Adolescent' },
  3: { emoji: '🐥', label: 'Capable' },
  4: { emoji: '🦅', label: 'Armored' },
  5: { emoji: '🦋', label: 'Flying' },
  6: { emoji: '🌟', label: 'Magnificent' },
};

// Aura color mappings
const AURA_COLORS: Record<string, string> = {
  'aura-gold': 'from-yellow-400/30 to-yellow-600/10',
  'aura-ember': 'from-orange-400/30 to-orange-600/10',
  'aura-frost': 'from-cyan-400/30 to-cyan-600/10',
  'aura-shadow': 'from-purple-400/30 to-purple-900/20',
  'aura-cosmic': 'from-violet-400/30 to-violet-600/10',
};

interface CompanionWidgetProps {
  stage: number;
  name: string;
  equipped?: {
    aura?: string;
    wings?: string;
    armor?: string;
    tools?: string;
    badge?: string;
  };
  compact?: boolean;
}

export default function CompanionWidget({
  stage,
  name,
  equipped = {},
  compact = false,
}: CompanionWidgetProps) {
  const stageData = STAGE_EMOJIS[stage] || STAGE_EMOJIS[1];
  const auraClass = equipped.aura
    ? AURA_COLORS[equipped.aura] || 'from-purple-500/30 to-indigo-600/10'
    : 'from-purple-500/30 to-indigo-600/10';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Mini avatar */}
        <motion.div
          className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${auraClass} flex items-center justify-center`}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-2xl">{stageData.emoji}</span>
          {/* Stage badge */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 border border-purple-400 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{stage}</span>
          </div>
        </motion.div>

        {/* Name */}
        <div className="hidden sm:block">
          <div className="text-white text-sm font-medium">{name}</div>
          <div className="text-white/50 text-xs">{stageData.label}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar with aura */}
      <motion.div
        className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${auraClass} flex items-center justify-center shadow-lg`}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-purple-400/50"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />

        {/* Main emoji */}
        <span className="text-3xl">{stageData.emoji}</span>

        {/* Equipped wings */}
        {equipped.wings && stage >= 3 && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm">
            {equipped.wings === 'wings-dragon' ? '🐉' : '🦋'}
          </span>
        )}

        {/* Equipped armor */}
        {equipped.armor && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs">
            🛡️
          </span>
        )}

        {/* Stage badge */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 border-2 border-purple-400 flex items-center justify-center shadow-md">
          <span className="text-white text-xs font-bold">{stage}</span>
        </div>
      </motion.div>

      {/* Info */}
      <div className="flex flex-col">
        <span className="text-white font-medium text-sm">{name}</span>
        <span className="text-purple-400 text-xs">{stageData.label}</span>
        {/* Equipped tools indicator */}
        {equipped.tools && (
          <span className="text-xs mt-0.5">
            {equipped.tools === 'tool-slate'
              ? '📊'
              : equipped.tools === 'tool-trophy'
              ? '🏆'
              : '🔮'}
          </span>
        )}
      </div>
    </div>
  );
}
