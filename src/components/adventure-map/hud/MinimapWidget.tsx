/**
 * MinimapWidget
 *
 * A small overview map showing the entire adventure map with character position.
 */

import React from 'react';
import { motion } from 'framer-motion';
// REGIONS data is available via ../data/regions if needed
import type { Position, RegionId } from '../types';

interface MinimapWidgetProps {
  characterPosition: Position;
  currentRegion: RegionId;
  visitedLocations: string[];
  totalLocations: number;
  onClick?: () => void;
  className?: string;
}

// Simplified region positions for minimap
const MINIMAP_REGIONS: Record<RegionId, { x: number; y: number; color: string }> = {
  'summit-peak': { x: 50, y: 10, color: '#fbbf24' },
  'wellness-springs': { x: 20, y: 30, color: '#06b6d4' },
  'market-district': { x: 80, y: 30, color: '#f59e0b' },
  'warrior-arena': { x: 20, y: 50, color: '#ef4444' },
  'central-hub': { x: 50, y: 50, color: '#3b82f6' },
  'guild-hall': { x: 80, y: 50, color: '#22c55e' },
  'progress-path': { x: 30, y: 75, color: '#8b5cf6' },
  'scholars-tower': { x: 70, y: 75, color: '#ec4899' },
};

export default function MinimapWidget({
  characterPosition,
  currentRegion,
  visitedLocations,
  totalLocations,
  onClick,
  className = '',
}: MinimapWidgetProps) {
  // Convert character position (0-1000, 0-800) to minimap coordinates (0-100, 0-100)
  const charX = (characterPosition.x / 1000) * 100;
  const charY = (characterPosition.y / 800) * 100;

  return (
    <motion.button
      className={`relative w-32 h-24 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 overflow-hidden ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        {/* Grid lines */}
        <defs>
          <pattern id="minimap-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#minimap-grid)" />

        {/* Region indicators */}
        {Object.entries(MINIMAP_REGIONS).map(([regionId, pos]) => {
          const isCurrentRegion = regionId === currentRegion;
          return (
            <g key={regionId}>
              {/* Region dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isCurrentRegion ? 6 : 4}
                fill={pos.color}
                fillOpacity={isCurrentRegion ? 0.8 : 0.4}
              />
              {/* Glow for current region */}
              {isCurrentRegion && (
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  fill="none"
                  stroke={pos.color}
                  strokeWidth={1}
                  initial={{ r: 8, opacity: 0.5 }}
                  animate={{ r: [8, 12, 8], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </g>
          );
        })}

        {/* Connection lines */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="0.5">
          <line x1="50" y1="50" x2="20" y2="50" />
          <line x1="50" y1="50" x2="80" y2="50" />
          <line x1="50" y1="50" x2="50" y2="10" />
          <line x1="50" y1="50" x2="30" y2="75" />
          <line x1="50" y1="50" x2="70" y2="75" />
          <line x1="20" y1="50" x2="20" y2="30" />
          <line x1="80" y1="50" x2="80" y2="30" />
        </g>

        {/* Character position */}
        <motion.g
          animate={{
            x: charX - 50,
            y: charY - 50,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <motion.circle
            cx={50}
            cy={50}
            r={4}
            fill="#a855f7"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
          <circle cx={50} cy={50} r={2} fill="white" />
        </motion.g>
      </svg>

      {/* Discovery counter */}
      <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center px-1">
        <span className="text-white/60 text-[10px]">
          {visitedLocations.length}/{totalLocations}
        </span>
        <span className="text-white/40 text-[10px]">🗺️</span>
      </div>

      {/* Expand indicator */}
      <div className="absolute top-1 right-1">
        <motion.span
          className="text-white/40 text-xs"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          ⤢
        </motion.span>
      </div>
    </motion.button>
  );
}
