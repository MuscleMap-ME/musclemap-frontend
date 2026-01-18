/**
 * AdventureMapWidget
 *
 * Adventure map widget for embedding in the dashboard.
 * Click to expand to fullscreen modal.
 * Features responsive sizing and animated interactions.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdventureMapStore, useMapProgress, useCharacterPosition } from '../../../store/adventureMapStore';
import { REGIONS } from '../data/regions';
import { getAllLocations, getClosestLocation } from '../data/mapLayout';
import MinimapWidget from '../hud/MinimapWidget';
import type { AdventureMapWidgetProps } from '../types';

export default function AdventureMapWidget({
  className = '',
  onExpand,
  variant = 'default',
}: AdventureMapWidgetProps & { variant?: 'default' | 'compact' | 'hero' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for touch-friendly interactions
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Store hooks
  const { position, region } = useCharacterPosition();
  const { visited, visitedCount } = useMapProgress();
  const openMap = useAdventureMapStore((s) => s.openMap);

  // Get current location info
  const currentLocation = getClosestLocation(position);
  const regionData = REGIONS[region];
  const totalLocations = getAllLocations().filter((l) => !l.requiredRole).length;
  const discoveryProgress = Math.round((visitedCount / totalLocations) * 100);

  const handleClick = useCallback(() => {
    openMap();
    if (onExpand) {
      onExpand();
    }
  }, [openMap, onExpand]);

  // Variant-specific sizing
  const heightClass = variant === 'hero' ? 'min-h-[300px] md:min-h-[350px]' :
                      variant === 'compact' ? 'min-h-[150px]' :
                      'min-h-[220px] md:min-h-[250px]';

  return (
    <motion.button
      className={`
        adventure-map-widget relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-[#0f0f1a] via-[#151528] to-[#1a1a2e]
        border border-white/10 hover:border-purple-500/40
        shadow-lg shadow-purple-900/20 hover:shadow-purple-800/30
        transition-shadow duration-300
        ${heightClass} ${className}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: isMobile ? 1 : 1.01, y: isMobile ? 0 : -2 }}
      whileTap={{ scale: 0.98 }}
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
      <div className="relative z-10 h-full p-4 md:p-5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <span className="text-xl md:text-2xl">{regionData?.theme.icon || '🏰'}</span>
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-sm md:text-base">Adventure Map</h3>
              <p className="text-white/50 text-xs md:text-sm">{regionData?.name || 'Unknown Region'}</p>
            </div>
          </div>

          {/* Discovery progress with circular indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-white font-bold text-base">{visitedCount}</div>
              <div className="text-white/40 text-xs">/ {totalLocations} discovered</div>
            </div>
            <div className="relative w-12 h-12 md:w-14 md:h-14">
              {/* Progress circle */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="rgba(139, 92, 246, 0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="rgba(139, 92, 246, 0.8)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${discoveryProgress * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-xs md:text-sm">{discoveryProgress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimap - larger on wider screens */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-2">
          <MinimapWidget
            characterPosition={position}
            currentRegion={region}
            visitedLocations={visited}
            totalLocations={totalLocations}
            className="w-full h-full max-w-[220px] md:max-w-[260px] max-h-[140px] md:max-h-[160px]"
          />
        </div>

        {/* Current location with better styling */}
        {currentLocation && (
          <div className="mt-3 flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 border border-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentLocation.icon}</span>
              <div>
                <span className="text-white/90 text-sm font-medium block">{currentLocation.name}</span>
                <span className="text-white/40 text-xs">Current Location</span>
              </div>
            </div>
            <motion.div
              className="text-purple-400 text-sm"
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ duration: 0.2 }}
            >
              →
            </motion.div>
          </div>
        )}

        {/* Discovery progress bar (mobile-friendly alternative) */}
        <div className="mt-3 sm:hidden">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/50">Discovery Progress</span>
            <span className="text-purple-400 font-medium">{visitedCount} / {totalLocations}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${discoveryProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Click to expand hint - always visible on mobile, hover-reveal on desktop */}
        <motion.div
          className={`
            absolute bottom-3 right-3 text-xs flex items-center gap-1.5
            px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10
            ${isMobile ? 'text-white/60' : 'text-white/40'}
          `}
          initial={{ opacity: isMobile ? 0.7 : 0 }}
          animate={{ opacity: isHovered || isMobile ? 1 : 0 }}
        >
          <span>{isMobile ? 'Tap to explore' : 'Click to explore'}</span>
          <span className="text-purple-400">⤢</span>
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
