/**
 * AdventureMap Page
 *
 * Fullscreen adventure map page with HUD.
 * Can also be embedded as a widget in the dashboard.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AdventureMapCanvas, AdventureHUD, AdventureMapWidget } from '../components/adventure-map';
import { useAdventureMapStore, useCharacterPosition, useMapProgress, useMapUI } from '../store/adventureMapStore';
import { getClosestLocation, LOCATIONS } from '../components/adventure-map/data/mapLayout';
import { REGIONS } from '../components/adventure-map/data/regions';
import type { HUDStats, CompanionData, MapLocation } from '../components/adventure-map/types';
import { useUser } from '../contexts/UserContext';

// Map user data to HUD stats
function useHUDStats(): HUDStats {
  const { user } = useUser();

  // In real app, these would come from GraphQL queries
  return {
    level: user?.level || 1,
    xp: user?.xp || 0,
    xpToNextLevel: user?.xpToNextLevel || 1000,
    credits: user?.creditBalance || 0,
    wealthTier: user?.wealthTier || 0,
    characterStats: {
      strength: user?.stats?.strength || 10,
      dexterity: user?.stats?.dexterity || 10,
      endurance: user?.stats?.endurance || 10,
      constitution: user?.stats?.constitution || 10,
      power: user?.stats?.power || 10,
      vitality: user?.stats?.vitality || 10,
    },
  };
}

// Map companion data
function useCompanionData(): CompanionData {
  // In real app, this would come from companion context
  return {
    stage: 3,
    name: 'Buddy',
    equipped: {
      aura: 'aura-cosmic',
    },
  };
}

export default function AdventureMapPage() {
  const navigate = useNavigate();
  const stats = useHUDStats();
  const companionData = useCompanionData();

  // Store hooks
  const { position } = useCharacterPosition();
  const { visited } = useMapProgress();
  const { hudExpanded, toggleHud } = useMapUI();

  // Get current location
  const currentLocation = getClosestLocation(position, 40);
  const currentRegion = REGIONS[useAdventureMapStore((s) => s.currentRegion)];

  // Check for mobile viewport
  const [isMobile, setIsMobile] = React.useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle location entry
  const handleLocationEnter = (locationId: string, route: string) => {
    navigate(route);
  };

  return (
    <div className="adventure-map-page min-h-screen bg-[#0a0a12]">
      {/* Map canvas takes full screen minus HUD */}
      <div className={`w-full ${isMobile ? 'h-[calc(100vh-50px)]' : 'h-[calc(100vh-80px)]'}`}>
        <AdventureMapCanvas
          className="w-full h-full"
          onLocationEnter={handleLocationEnter}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* HUD */}
      <AdventureHUD
        stats={stats}
        companionData={companionData}
        currentLocation={currentLocation as MapLocation | null}
        onMinimapClick={() => {
          // Could toggle minimap overlay
        }}
        onMenuClick={() => {
          // Could open settings menu
          navigate('/settings');
        }}
        isMobile={isMobile}
        isExpanded={hudExpanded}
        onToggleExpand={toggleHud}
      />

      {/* Header with back button */}
      <motion.div
        className="fixed top-4 left-4 z-50 flex items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          ←
        </button>

        <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/20 px-4 py-2">
          <h1 className="text-white font-bold text-lg">Adventure Map</h1>
          <p className="text-white/50 text-sm">
            {visited.length} / {LOCATIONS.filter((l) => !l.isAdminOnly).length} locations discovered
          </p>
        </div>
      </motion.div>

      {/* Current region indicator */}
      <motion.div
        className="fixed top-4 right-4 z-50 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20 px-4 py-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentRegion?.theme.icon || '🏰'}</span>
          <div>
            <div className="text-white font-medium text-sm">
              {currentRegion?.name || 'Unknown'}
            </div>
            <div className="text-white/50 text-xs">{currentRegion?.description?.slice(0, 30)}...</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
