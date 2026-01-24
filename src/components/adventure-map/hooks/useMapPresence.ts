/**
 * Adventure Map Presence Integration Hook
 *
 * Bridges the presence system with the adventure map, showing:
 * - Users at nearby venues as markers on the map
 * - Live activity indicators (pulsing dots)
 * - Training session hotspots
 * - Friend locations
 *
 * @example
 * const { usersOnMap, hotspots, isLoadingPresence } = useMapPresence();
 */

import { useEffect, useMemo, useCallback } from 'react';
import { usePresenceStore, useNearbyVenues, useMyPresence } from '@/store/presenceStore';
import type { Position } from '../types';

// ============================================
// TYPES
// ============================================

export interface MapUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  position: Position;
  state: 'visible' | 'training_now' | 'open_to_train';
  venueId: string;
  venueName?: string;
  isFriend: boolean;
  isOpenToTrain: boolean;
  workoutType?: string;
  checkedInAt: string;
}

export interface VenueHotspot {
  venueId: string;
  name: string;
  position: Position;
  userCount: number;
  openToTrainCount: number;
  hasFriends: boolean;
  friendCount: number;
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
  distanceMeters: number;
}

// ============================================
// COORDINATE CONVERSION
// ============================================

/**
 * Convert latitude/longitude to adventure map position
 * This is a simplified conversion - in production, you'd use proper map projection
 */
function geoToMapPosition(lat: number, lng: number, centerLat: number, centerLng: number): Position {
  // Scale factors for the map (these would be calibrated to your actual map)
  const SCALE_X = 10000; // How many map units per degree of longitude
  const SCALE_Y = 10000; // How many map units per degree of latitude
  const MAP_CENTER_X = 500; // Center of the map in map units
  const MAP_CENTER_Y = 400;

  const x = MAP_CENTER_X + (lng - centerLng) * SCALE_X;
  const y = MAP_CENTER_Y - (lat - centerLat) * SCALE_Y; // Y is inverted

  return { x, y };
}

/**
 * Calculate activity level based on user count
 */
function getActivityLevel(userCount: number): VenueHotspot['activityLevel'] {
  if (userCount >= 10) return 'very_high';
  if (userCount >= 5) return 'high';
  if (userCount >= 2) return 'medium';
  return 'low';
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export interface UseMapPresenceOptions {
  /** Center latitude for coordinate conversion */
  centerLat?: number;
  /** Center longitude for coordinate conversion */
  centerLng?: number;
  /** Maximum number of users to show */
  maxUsers?: number;
  /** Show only friends */
  friendsOnly?: boolean;
  /** Refresh interval in ms (0 to disable) */
  refreshInterval?: number;
}

export function useMapPresence(options: UseMapPresenceOptions = {}) {
  const {
    centerLat = 40.7128, // Default to NYC
    centerLng = -74.006,
    maxUsers = 50,
    friendsOnly = false,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const { venues } = useNearbyVenues();
  const { presence: myPresence } = useMyPresence();
  const currentLocation = usePresenceStore((s) => s.currentLocation);
  const usersAtVenue = usePresenceStore((s) => s.usersAtCurrentVenue);
  const isLoadingPresence = usePresenceStore((s) => s.isLoadingPresence);
  const _setNearbyVenues = usePresenceStore((s) => s.setNearbyVenues);

  // Use current location as center if available
  const effectiveCenterLat = currentLocation?.latitude ?? centerLat;
  const effectiveCenterLng = currentLocation?.longitude ?? centerLng;

  // Convert venues to hotspots with map positions
  const hotspots = useMemo<VenueHotspot[]>(() => {
    return venues.map((venue) => ({
      venueId: venue.venueId,
      name: venue.name,
      position: geoToMapPosition(
        venue.latitude,
        venue.longitude,
        effectiveCenterLat,
        effectiveCenterLng
      ),
      userCount: venue.currentUserCount,
      openToTrainCount: venue.openToTrainCount,
      hasFriends: venue.hasFriendsHere,
      friendCount: venue.friendsHereCount,
      activityLevel: getActivityLevel(venue.currentUserCount),
      distanceMeters: venue.distanceMeters,
    }));
  }, [venues, effectiveCenterLat, effectiveCenterLng]);

  // Convert users at current venue to map users
  const usersOnMap = useMemo<MapUser[]>(() => {
    let users = usersAtVenue
      .filter((u) => u.state !== 'invisible')
      .map((user) => {
        // For now, place users at their venue's position
        const venue = venues.find((v) => v.currentUserCount > 0);
        const position = venue
          ? geoToMapPosition(venue.latitude, venue.longitude, effectiveCenterLat, effectiveCenterLng)
          : { x: 500, y: 400 };

        return {
          userId: user.userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          position,
          state: user.state as MapUser['state'],
          venueId: '', // Would come from the actual API
          venueName: venue?.name,
          isFriend: user.isFriend,
          isOpenToTrain: user.sessionOpenToJoin,
          workoutType: user.sessionWorkoutType,
          checkedInAt: user.checkedInAt,
        };
      });

    if (friendsOnly) {
      users = users.filter((u) => u.isFriend);
    }

    return users.slice(0, maxUsers);
  }, [usersAtVenue, venues, effectiveCenterLat, effectiveCenterLng, friendsOnly, maxUsers]);

  // Auto-refresh nearby venues
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      // This would trigger a GraphQL query to refresh nearby venues
      // For now, just log the refresh
      console.log('[MapPresence] Refreshing nearby venues...');
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Callback to focus on a specific hotspot
  const focusOnHotspot = useCallback((venueId: string) => {
    const hotspot = hotspots.find((h) => h.venueId === venueId);
    if (hotspot) {
      // This would integrate with the adventure map store to pan/zoom
      console.log('[MapPresence] Focusing on hotspot:', hotspot.name);
    }
  }, [hotspots]);

  // Callback to focus on a specific user
  const focusOnUser = useCallback((userId: string) => {
    const user = usersOnMap.find((u) => u.userId === userId);
    if (user) {
      console.log('[MapPresence] Focusing on user:', user.username);
    }
  }, [usersOnMap]);

  // Summary stats
  const stats = useMemo(() => ({
    totalUsersNearby: venues.reduce((sum, v) => sum + v.currentUserCount, 0),
    totalVenuesWithActivity: venues.filter((v) => v.currentUserCount > 0).length,
    friendsNearby: venues.reduce((sum, v) => sum + v.friendsHereCount, 0),
    openToTrainNearby: venues.reduce((sum, v) => sum + v.openToTrainCount, 0),
    isUserVisible: myPresence?.state !== 'invisible',
    isUserOpenToTrain: myPresence?.state === 'open_to_train',
  }), [venues, myPresence]);

  return {
    // Data
    usersOnMap,
    hotspots,
    stats,

    // State
    isLoadingPresence,
    currentLocation,

    // Actions
    focusOnHotspot,
    focusOnUser,

    // Raw data (for advanced use cases)
    nearbyVenues: venues,
    usersAtCurrentVenue: usersAtVenue,
  };
}

export default useMapPresence;
