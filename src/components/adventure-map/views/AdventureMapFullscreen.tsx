/**
 * AdventureMapFullscreen
 *
 * Fullscreen modal view of the adventure map with HUD.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AdventureMapCanvas from '../AdventureMapCanvas';
import AdventureHUD from '../hud/AdventureHUD';
import { useAdventureMapStore, useMapUI, useCharacterPosition, useMapProgress } from '../../../store/adventureMapStore';
import { getClosestLocation, LOCATIONS } from '../data/mapLayout';
import type { HUDStats, CompanionData, MapLocation } from '../types';

interface AdventureMapFullscreenProps {
  // Stats would come from user context/API in real app
  stats?: HUDStats;
  companionData?: CompanionData;
  onClose?: () => void;
}

// Default stats for demo
const DEFAULT_STATS: HUDStats = {
  level: 12,
  xp: 1234,
  xpToNextLevel: 2000,
  credits: 2340,
  wealthTier: 3,
  characterStats: {
    strength: 45,
    dexterity: 32,
    endurance: 28,
    constitution: 38,
    power: 25,
    vitality: 40,
  },
};

const DEFAULT_COMPANION: CompanionData = {
  stage: 3,
  name: 'Buddy',
  equipped: {
    aura: 'aura-cosmic',
    wings: 'wings-butterfly',
  },
};

export default function AdventureMapFullscreen({
  stats = DEFAULT_STATS,
  companionData = DEFAULT_COMPANION,
  onClose,
}: AdventureMapFullscreenProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Store hooks
  const { isOpen, isFullscreen, close, toggleFullscreen, hudExpanded, toggleHud } = useMapUI();
  const { position } = useCharacterPosition();
  const { visited } = useMapProgress();

  // Get current location
  const currentLocation = getClosestLocation(position, 40);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Close handler
  const handleClose = useCallback(() => {
    close();
    if (onClose) {
      onClose();
    }
  }, [close, onClose]);

  // Handle location entry (navigation to app route)
  const handleLocationEnter = useCallback(
    (locationId: string, route: string) => {
      // Close map and navigate
      close();
      navigate(route);
    },
    [close, navigate]
  );

  // Reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="adventure-map-fullscreen fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/90"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Map container */}
        <motion.div
          className={`relative w-full h-full ${isMobile ? 'pb-[50px]' : 'pb-20'}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            aria-label="Close map"
          >
            ✕
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
              toggleFullscreen();
            }}
            className="absolute top-4 right-16 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center justify-center text-sm"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? '⊙' : '⛶'}
          </button>

          {/* Title */}
          <div className="absolute top-4 left-4 z-50 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20 px-4 py-2">
            <h1 className="text-white font-bold text-lg">Adventure Map</h1>
            <p className="text-white/50 text-sm">
              {visited.length} / {LOCATIONS.filter((l) => !l.isAdminOnly).length} locations discovered
            </p>
          </div>

          {/* Map canvas */}
          <AdventureMapCanvas
            className="w-full h-full"
            onLocationEnter={handleLocationEnter}
            isFullscreen={true}
            reducedMotion={reducedMotion}
          />
        </motion.div>

        {/* HUD */}
        <AdventureHUD
          stats={stats}
          companionData={companionData}
          currentLocation={currentLocation as MapLocation | null}
          onMinimapClick={() => {
            // Could toggle minimap overlay
          }}
          onMenuClick={() => {
            // Could open settings/help menu
          }}
          isMobile={isMobile}
          isExpanded={hudExpanded}
          onToggleExpand={toggleHud}
        />
      </motion.div>
    </AnimatePresence>
  );
}
