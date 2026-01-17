/**
 * AdventureHUD
 *
 * Bottom HUD bar showing character stats, companion, credits, and quick actions.
 * Responsive design with collapsible mobile version.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CompanionWidget from './CompanionWidget';
import StatsBar from './StatsBar';
import CreditsWidget from './CreditsWidget';
import MinimapWidget from './MinimapWidget';
import type { AdventureHUDProps } from '../types';

export default function AdventureHUD({
  stats,
  companionData,
  currentLocation,
  onMinimapClick,
  onMenuClick,
  isMobile = false,
  isExpanded = false,
  onToggleExpand,
}: AdventureHUDProps) {
  if (isMobile) {
    return (
      <MobileHUD
        stats={stats}
        companionData={companionData}
        currentLocation={currentLocation}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onMenuClick={onMenuClick}
      />
    );
  }

  return (
    <motion.div
      className="adventure-hud fixed bottom-0 left-0 right-0 h-20 z-50"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl border-t border-white/10" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center gap-6">
        {/* Companion */}
        <CompanionWidget
          stage={companionData.stage}
          name={companionData.name}
          equipped={companionData.equipped}
        />

        {/* Divider */}
        <div className="w-px h-12 bg-white/10" />

        {/* Stats Bar */}
        <StatsBar
          level={stats.level}
          xp={stats.xp}
          xpToNextLevel={stats.xpToNextLevel}
          characterStats={stats.characterStats}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Credits */}
        <CreditsWidget credits={stats.credits} wealthTier={stats.wealthTier} />

        {/* Divider */}
        <div className="w-px h-12 bg-white/10" />

        {/* Minimap toggle */}
        <button
          onClick={onMinimapClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <span className="text-lg">🗺️</span>
          <span className="text-white/70 text-sm">Map</span>
        </button>

        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <span className="text-white/70 text-lg">≡</span>
        </button>

        {/* Current location indicator */}
        {currentLocation && (
          <motion.div
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentLocation.icon}</span>
              <span className="text-white text-sm font-medium">{currentLocation.name}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Mobile HUD variant
function MobileHUD({
  stats,
  companionData,
  currentLocation,
  isExpanded,
  onToggleExpand,
  onMenuClick,
}: {
  stats: AdventureHUDProps['stats'];
  companionData: AdventureHUDProps['companionData'];
  currentLocation: AdventureHUDProps['currentLocation'];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMenuClick?: () => void;
}) {
  return (
    <motion.div
      className="adventure-hud-mobile fixed bottom-0 left-0 right-0 z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-t border-white/10 rounded-t-2xl" />

      {/* Drag handle */}
      <button
        onClick={onToggleExpand}
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center"
      >
        <motion.span
          className="text-white/60"
          animate={{ rotate: isExpanded ? 180 : 0 }}
        >
          ▲
        </motion.span>
      </button>

      <AnimatePresence mode="wait">
        {isExpanded ? (
          // Expanded view
          <motion.div
            key="expanded"
            className="relative p-4 space-y-4"
            initial={{ height: 50 }}
            animate={{ height: 200 }}
            exit={{ height: 50 }}
          >
            {/* Row 1: Companion + Stats */}
            <div className="flex items-center gap-4">
              <CompanionWidget
                stage={companionData.stage}
                name={companionData.name}
                equipped={companionData.equipped}
                compact
              />
              <div className="flex-1">
                <StatsBar
                  level={stats.level}
                  xp={stats.xp}
                  xpToNextLevel={stats.xpToNextLevel}
                  characterStats={stats.characterStats}
                  compact
                />
              </div>
            </div>

            {/* Row 2: Credits + Character Stats */}
            <div className="flex items-center justify-between">
              <CreditsWidget credits={stats.credits} wealthTier={stats.wealthTier} />
              <div className="flex gap-2">
                {Object.entries(stats.characterStats).slice(0, 3).map(([stat, value]) => (
                  <div key={stat} className="text-center">
                    <div className="text-white text-sm font-bold">{value}</div>
                    <div className="text-white/50 text-xs uppercase">{stat.slice(0, 3)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 3: Actions */}
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-sm font-medium">
                🏪 Shop
              </button>
              <button className="flex-1 py-2 rounded-lg bg-purple-600/20 text-purple-400 text-sm font-medium">
                📦 Inventory
              </button>
              <button
                onClick={onMenuClick}
                className="w-12 py-2 rounded-lg bg-white/10 text-white/70"
              >
                ≡
              </button>
            </div>
          </motion.div>
        ) : (
          // Collapsed view
          <motion.div
            key="collapsed"
            className="relative h-[50px] px-4 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Mini companion */}
            <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-lg">
              {['🥚', '🐣', '🐥', '🦅', '🦋', '🌟'][companionData.stage - 1] || '🥚'}
            </div>

            {/* Level */}
            <div className="text-white text-sm font-bold">
              Lv.{stats.level}
            </div>

            {/* XP bar */}
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.xp / stats.xpToNextLevel) * 100}%` }}
              />
            </div>

            {/* Credits */}
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">💰</span>
              <span className="text-white text-sm font-medium">
                {stats.credits >= 1000 ? `${(stats.credits / 1000).toFixed(1)}K` : stats.credits}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
