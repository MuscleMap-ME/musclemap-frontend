/**
 * Adventure Map Illustrations Index
 *
 * Maps location types to their theme park-style SVG illustrations.
 * Each illustration is a React component that renders an SVG.
 */

import React from 'react';

// Import all illustrations
export { Castle } from './Castle';
export { RollerCoaster } from './RollerCoaster';
export { Carousel } from './Carousel';
export { FerrisWheel } from './FerrisWheel';
export { FoodStand } from './FoodStand';
export { HighStriker } from './HighStriker';
export { TrophyBooth } from './TrophyBooth';
export { HotSprings } from './HotSprings';
export { ScholarTower } from './ScholarTower';
export { RoyalCastle } from './RoyalCastle';
export { FortuneTeller } from './FortuneTeller';
export { JoustingArena } from './JoustingArena';
export { TargetGame } from './TargetGame';
export { WalletVault } from './WalletVault';
export { InfoBooth } from './InfoBooth';
export { HallOfFame } from './HallOfFame';
export { GiftShop } from './GiftShop';
export { MessageBoard } from './MessageBoard';
export { PoolArea } from './PoolArea';

// Import components for the mapping
import { Castle } from './Castle';
import { RollerCoaster } from './RollerCoaster';
import { Carousel } from './Carousel';
import { FerrisWheel } from './FerrisWheel';
import { FoodStand } from './FoodStand';
import { HighStriker } from './HighStriker';
import { TrophyBooth } from './TrophyBooth';
import { HotSprings } from './HotSprings';
import { ScholarTower } from './ScholarTower';
import { RoyalCastle } from './RoyalCastle';
import { FortuneTeller } from './FortuneTeller';
import { JoustingArena } from './JoustingArena';
import { TargetGame } from './TargetGame';
import { WalletVault } from './WalletVault';
import { InfoBooth } from './InfoBooth';
import { HallOfFame } from './HallOfFame';
import { GiftShop } from './GiftShop';
import { MessageBoard } from './MessageBoard';
import { PoolArea } from './PoolArea';

// Common props interface for all illustrations
export interface IllustrationProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

// Type for illustration component
export type IllustrationComponent = React.FC<IllustrationProps>;

/**
 * Map of location IDs to their illustration components.
 * Falls back to Castle for unmapped locations.
 */
export const locationIllustrations: Record<string, IllustrationComponent> = {
  // Central Hub - Main entrance area
  'dashboard': Castle,
  'profile': InfoBooth,
  'settings': InfoBooth,
  'command-center': Castle,

  // Warrior Arena - Training/Workout area
  'workout': RollerCoaster,
  'exercises': Carousel,
  'journey': RollerCoaster,
  'pt-tests': HighStriker,
  'archetypes': HighStriker,
  'training-grounds': RollerCoaster,

  // Progress Path - Stats and achievements
  'progression': HallOfFame,
  'stats': FortuneTeller,
  'achievements': TrophyBooth,
  'personal-records': TrophyBooth,
  'history': FortuneTeller,
  'milestones': TrophyBooth,

  // Guild Hall - Community/Social
  'community': FerrisWheel,
  'crews': JoustingArena,
  'rivals': JoustingArena,
  'competitions': JoustingArena,
  'messages': MessageBoard,
  'leaderboard': HallOfFame,
  'feed': FerrisWheel,
  'high-fives': FerrisWheel,

  // Market District - Economy
  'marketplace': FoodStand,
  'wallet': WalletVault,
  'skins': GiftShop,
  'trading': FoodStand,
  'collection': GiftShop,
  'credits': WalletVault,

  // Wellness Springs - Health/Recovery
  'health': HotSprings,
  'recovery': PoolArea,
  'goals': TargetGame,
  'nutrition': FoodStand,
  'sleep': HotSprings,
  'wellness': HotSprings,

  // Scholar's Tower - Learning
  'skills': ScholarTower,
  'martial-arts': JoustingArena,
  'trainers': ScholarTower,
  'docs': ScholarTower,
  'tutorials': ScholarTower,
  'knowledge': ScholarTower,

  // Summit Peak - Admin/Empire
  'empire': RoyalCastle,
  'admin-control': RoyalCastle,
  'analytics': FortuneTeller,
  'admin': RoyalCastle,
};

/**
 * Get the illustration component for a given location ID.
 * Returns Castle as the default if no specific illustration is mapped.
 */
export function getLocationIllustration(locationId: string): IllustrationComponent {
  // Normalize the ID (lowercase, handle variations)
  const normalizedId = locationId.toLowerCase().replace(/[-_\s]/g, '-');

  // Direct match
  if (locationIllustrations[normalizedId]) {
    return locationIllustrations[normalizedId];
  }

  // Try partial matches for compound IDs
  for (const [key, component] of Object.entries(locationIllustrations)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return component;
    }
  }

  // Default to Castle
  return Castle;
}

/**
 * Get illustration based on location properties (icon, name, region).
 * Uses multiple heuristics to find the best match.
 */
export function getLocationIllustrationByProps(
  locationId: string,
  icon?: string,
  name?: string,
  regionId?: string
): IllustrationComponent {
  // First try direct ID match
  const directMatch = getLocationIllustration(locationId);
  if (directMatch !== Castle || locationId === 'dashboard') {
    return directMatch;
  }

  // Try matching by region
  if (regionId) {
    const regionDefaults: Record<string, IllustrationComponent> = {
      'central-hub': Castle,
      'warrior-arena': RollerCoaster,
      'progress-path': TrophyBooth,
      'guild-hall': FerrisWheel,
      'market-district': FoodStand,
      'wellness-springs': HotSprings,
      'scholars-tower': ScholarTower,
      'summit-peak': RoyalCastle,
    };

    const normalizedRegion = regionId.toLowerCase().replace(/[-_\s]/g, '-');
    if (regionDefaults[normalizedRegion]) {
      return regionDefaults[normalizedRegion];
    }
  }

  // Try matching by name keywords
  if (name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('workout') || nameLower.includes('train')) return RollerCoaster;
    if (nameLower.includes('exercise') || nameLower.includes('library')) return Carousel;
    if (nameLower.includes('community') || nameLower.includes('social')) return FerrisWheel;
    if (nameLower.includes('market') || nameLower.includes('shop')) return FoodStand;
    if (nameLower.includes('trophy') || nameLower.includes('achievement')) return TrophyBooth;
    if (nameLower.includes('health') || nameLower.includes('wellness')) return HotSprings;
    if (nameLower.includes('skill') || nameLower.includes('learn')) return ScholarTower;
    if (nameLower.includes('admin') || nameLower.includes('empire')) return RoyalCastle;
    if (nameLower.includes('stat') || nameLower.includes('analytic')) return FortuneTeller;
    if (nameLower.includes('crew') || nameLower.includes('rival')) return JoustingArena;
    if (nameLower.includes('goal') || nameLower.includes('target')) return TargetGame;
    if (nameLower.includes('wallet') || nameLower.includes('credit')) return WalletVault;
    if (nameLower.includes('message') || nameLower.includes('chat')) return MessageBoard;
    if (nameLower.includes('recover') || nameLower.includes('pool')) return PoolArea;
    if (nameLower.includes('leader') || nameLower.includes('rank')) return HallOfFame;
    if (nameLower.includes('skin') || nameLower.includes('gift')) return GiftShop;
  }

  // Default
  return Castle;
}

export default locationIllustrations;
