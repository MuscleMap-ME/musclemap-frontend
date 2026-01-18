/**
 * AdventureMapFullscreen
 *
 * Fullscreen modal view of the adventure map with HUD.
 * Supports true browser fullscreen API and responsive sizing across all devices.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AdventureMapCanvas from '../AdventureMapCanvas';
import AdventureHUD from '../hud/AdventureHUD';
import { useMapUI, useCharacterPosition, useMapProgress } from '../../../store/adventureMapStore';
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
  const [isTablet, setIsTablet] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const { isOpen, isFullscreen: _isFullscreen, close, toggleFullscreen, hudExpanded, toggleHud } = useMapUI();
  const { position } = useCharacterPosition();
  const { visited } = useMapProgress();

  // Get current location
  const currentLocation = getClosestLocation(position, 40);

  // Check for viewport size
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640); // sm breakpoint
      setIsTablet(width >= 640 && width < 1024); // md-lg range
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Track browser fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close handler - defined before useEffect that uses it
  const handleClose = useCallback(() => {
    // Exit browser fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    close();
    if (onClose) {
      onClose();
    }
  }, [close, onClose]);

  // Handle escape key and browser fullscreen exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isBrowserFullscreen) {
          // Exit browser fullscreen first
          document.exitFullscreen?.().catch(() => {});
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isBrowserFullscreen, handleClose]);

  // Handle location entry (navigation to app route)
  const handleLocationEnter = useCallback(
    (locationId: string, route: string) => {
      // Exit browser fullscreen and close map
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      close();
      navigate(route);
    },
    [close, navigate]
  );

  // Toggle browser fullscreen
  const handleToggleBrowserFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        // Request fullscreen on the container element for better control
        await containerRef.current.requestFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
      toggleFullscreen();
    } catch (error) {
      // Fullscreen API not supported or user denied
      console.warn('Fullscreen not available:', error);
      toggleFullscreen(); // Still toggle the modal state
    }
  }, [toggleFullscreen]);

  // Reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isOpen) {
    return null;
  }

  // Calculate HUD padding based on device and fullscreen state
  const hudHeight = isMobile ? 60 : isTablet ? 70 : 80;
  const safeAreaBottom = isBrowserFullscreen ? 0 :
    (typeof window !== 'undefined' && 'CSS' in window && CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)'))
      ? 'env(safe-area-inset-bottom)'
      : '0px';

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="adventure-map-fullscreen fixed inset-0 z-[100] bg-[#0a0a12]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          // Handle iOS safe areas
          paddingTop: isBrowserFullscreen ? 0 : 'env(safe-area-inset-top, 0px)',
          paddingLeft: isBrowserFullscreen ? 0 : 'env(safe-area-inset-left, 0px)',
          paddingRight: isBrowserFullscreen ? 0 : 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Map container - fills entire screen */}
        <motion.div
          className="absolute inset-0"
          style={{
            paddingBottom: `calc(${hudHeight}px + ${safeAreaBottom})`,
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className={`
              absolute z-50 rounded-full bg-black/70 backdrop-blur-sm border border-white/20
              text-white hover:bg-white/10 active:bg-white/20 transition-colors
              flex items-center justify-center touch-manipulation
              ${isMobile ? 'top-2 right-2 w-10 h-10 text-lg' : 'top-4 right-4 w-12 h-12 text-xl'}
            `}
            aria-label="Close map"
          >
            ✕
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={handleToggleBrowserFullscreen}
            className={`
              absolute z-50 rounded-full bg-black/70 backdrop-blur-sm border border-white/20
              text-white hover:bg-white/10 active:bg-white/20 transition-colors
              flex items-center justify-center touch-manipulation
              ${isMobile ? 'top-2 right-14 w-10 h-10 text-sm' : 'top-4 right-20 w-12 h-12 text-base'}
            `}
            aria-label={isBrowserFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isBrowserFullscreen ? '⊙' : '⛶'}
          </button>

          {/* Title - responsive positioning */}
          <div
            className={`
              absolute z-50 bg-black/70 backdrop-blur-sm rounded-lg border border-white/20
              ${isMobile ? 'top-2 left-2 px-3 py-1.5' : 'top-4 left-4 px-4 py-2'}
            `}
          >
            <h1 className={`text-white font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>Adventure Map</h1>
            <p className={`text-white/50 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {visited.length} / {LOCATIONS.filter((l) => !l.isAdminOnly).length} discovered
            </p>
          </div>

          {/* Map canvas - fills remaining space */}
          <AdventureMapCanvas
            className="w-full h-full"
            onLocationEnter={handleLocationEnter}
            isFullscreen={true}
            reducedMotion={reducedMotion}
          />
        </motion.div>

        {/* HUD - fixed at bottom with safe area handling */}
        <div
          className="absolute bottom-0 left-0 right-0 z-50"
          style={{
            paddingBottom: safeAreaBottom,
          }}
        >
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
