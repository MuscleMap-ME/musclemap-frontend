/**
 * StatsBar
 *
 * Displays level, XP progress, and character stats in the HUD.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface StatsBarProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  characterStats: {
    strength: number;
    dexterity: number;
    endurance: number;
    constitution: number;
    power: number;
    vitality: number;
  };
  compact?: boolean;
}

// Stat abbreviations and colors
const STAT_CONFIG: Record<string, { abbr: string; color: string }> = {
  strength: { abbr: 'STR', color: 'text-red-400' },
  dexterity: { abbr: 'DEX', color: 'text-green-400' },
  endurance: { abbr: 'END', color: 'text-blue-400' },
  constitution: { abbr: 'CON', color: 'text-yellow-400' },
  power: { abbr: 'POW', color: 'text-purple-400' },
  vitality: { abbr: 'VIT', color: 'text-pink-400' },
};

export default function StatsBar({
  level,
  xp,
  xpToNextLevel,
  characterStats,
  compact = false,
}: StatsBarProps) {
  const xpProgress = (xp / xpToNextLevel) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Level */}
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 text-sm">⭐</span>
          <span className="text-white font-bold">Lv.{level}</span>
        </div>

        {/* XP bar */}
        <div className="flex-1 max-w-[120px]">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-white/50 text-xs mt-0.5">
            {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Level and XP */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">⭐</span>
          <span className="text-white font-bold text-lg">Level {level}</span>
        </div>

        {/* XP Progress bar */}
        <div className="w-48 mt-1">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/50 mt-0.5">
            <span>{xp.toLocaleString()} XP</span>
            <span>{xpToNextLevel.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Character Stats */}
      <div className="flex items-center gap-3 pl-4 border-l border-white/10">
        {Object.entries(characterStats)
          .slice(0, 4) // Show first 4 stats
          .map(([stat, value]) => {
            const config = STAT_CONFIG[stat];
            return (
              <div key={stat} className="text-center min-w-[40px]">
                <motion.div
                  className={`text-lg font-bold ${config.color}`}
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {value}
                </motion.div>
                <div className="text-white/40 text-xs font-medium">{config.abbr}</div>
              </div>
            );
          })}

        {/* More stats indicator */}
        <button className="text-white/30 hover:text-white/60 transition-colors text-xs">
          +{Object.keys(characterStats).length - 4}
        </button>
      </div>
    </div>
  );
}
