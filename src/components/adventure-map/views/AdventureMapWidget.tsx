/**
 * AdventureMapWidget
 *
 * Compact adventure map widget for embedding in the dashboard.
 * Click to expand to fullscreen modal.
 */

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdventureMapStore, useMapProgress, useCharacterPosition } from '../../../store/adventureMapStore';
import { REGIONS } from '../data/regions';
import { LOCATIONS, getClosestLocation } from '../data/mapLayout';
import MinimapWidget from '../hud/MinimapWidget';
import type { AdventureMapWidgetProps } from '../types';

export default function AdventureMapWidget({
  className = '',
  onExpand,
}: AdventureMapWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Store hooks
  const { position, region } = useCharacterPosition();
  const { visited, visitedCount } = useMapProgress();
  const openMap = useAdventureMapStore((s) => s.openMap);

  // Get current location info
  const currentLocation = getClosestLocation(position, 50);
  const regionData = REGIONS[region];
  const totalLocations = LOCATIONS.filter((l) => !l.isAdminOnly).length;

  const handleClick = useCallback(() => {
    openMap();
    if (onExpand) {
      onExpand();
    }
  }, [openMap, onExpand]);

  return (
    <motion.button
      className={`adventure-map-widget relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] border border-white/10 ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ minHeight: '200px' }}
    >
      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              repeat: Infinity,
              duration: 2 + Math.random() * 2,
              delay: Math.random(),
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 h-full p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{regionData?.theme.icon || '🏰'}</span>
            <div className="text-left">
              <h3 className="text-white font-semibold text-sm">Adventure Map</h3>
              <p className="text-white/50 text-xs">{regionData?.name || 'Unknown Region'}</p>
            </div>
          </div>

          {/* Discovery progress */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-white font-bold text-sm">{visitedCount}</div>
              <div className="text-white/40 text-xs">/ {totalLocations}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
              <span className="text-sm">🗺️</span>
            </div>
          </div>
        </div>

        {/* Minimap */}
        <div className="flex-1 flex items-center justify-center">
          <MinimapWidget
            characterPosition={position}
            currentRegion={region}
            visitedLocations={visited}
            totalLocations={totalLocations}
            className="w-full h-full max-w-[180px] max-h-[120px]"
          />
        </div>

        {/* Current location */}
        {currentLocation && (
          <div className="mt-3 flex items-center justify-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <span className="text-lg">{currentLocation.icon}</span>
            <span className="text-white/70 text-sm">{currentLocation.name}</span>
          </div>
        )}

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Click to expand hint */}
        <motion.div
          className="absolute bottom-2 right-2 text-white/40 text-xs flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <span>Click to explore</span>
          <span>⤢</span>
        </motion.div>
      </div>

      {/* Glow border on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: '2px solid transparent',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3)) border-box',
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}
