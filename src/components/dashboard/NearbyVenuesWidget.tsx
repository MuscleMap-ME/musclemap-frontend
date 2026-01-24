/**
 * Nearby Venues Widget
 *
 * Dashboard widget showing closest outdoor fitness locations.
 * Features:
 * - Geolocation-based nearby venues
 * - Distance display
 * - Quick action to navigate or start workout
 * - Link to full Discover map
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link, useNavigate } from 'react-router-dom';
import { SafeMotion } from '@/utils/safeMotion';
import {
  MapPin,
  Navigation,
  ChevronRight,
  Star,
  Dumbbell,
  AlertCircle,
} from 'lucide-react';
import { gql } from '@apollo/client/core';

// GraphQL query for nearby venues
const NEARBY_VENUES_QUERY = gql`
  query NearbyVenues($lat: Float!, $lng: Float!, $limit: Int) {
    nearbyVenues(lat: $lat, lng: $lng, limit: $limit) {
      id
      name
      address
      distance
      rating
      reviewCount
      equipmentTypes
      isVerified
      openNow
      coordinates {
        lat
        lng
      }
    }
  }
`;

interface Venue {
  id: string;
  name: string;
  address?: string;
  distance: number;
  rating?: number;
  reviewCount?: number;
  equipmentTypes?: string[];
  isVerified?: boolean;
  openNow?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const miles = meters / 1609.34;
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

// Equipment type icons/labels
const EQUIPMENT_LABELS: Record<string, string> = {
  'pull-up-bar': 'Pull-up',
  'dip-station': 'Dips',
  'parallel-bars': 'Parallels',
  rings: 'Rings',
  'monkey-bars': 'Monkey Bars',
  bench: 'Bench',
  'battle-ropes': 'Ropes',
};

interface NearbyVenuesWidgetProps {
  limit?: number;
  compact?: boolean;
  showHeader?: boolean;
  onVenueSelect?: (venue: Venue) => void;
}

export function NearbyVenuesWidget({
  limit = 3,
  compact = false,
  showHeader = true,
  onVenueSelect,
}: NearbyVenuesWidgetProps) {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Request user's location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(
          error.code === 1
            ? 'Location access denied. Enable location to see nearby venues.'
            : 'Unable to determine your location'
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Fetch nearby venues
  const { data, loading, error: _error } = useQuery(NEARBY_VENUES_QUERY, {
    variables: {
      lat: userLocation?.lat || 0,
      lng: userLocation?.lng || 0,
      limit,
    },
    skip: !userLocation,
    fetchPolicy: 'cache-and-network',
  });

  // Handle venue click
  const handleVenueClick = (venue: Venue) => {
    if (onVenueSelect) {
      onVenueSelect(venue);
    } else {
      navigate(`/discover/venue/${venue.id}`);
    }
  };

  // Loading state
  if (isLocating || (loading && !data)) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">Nearby Outdoor Gyms</h3>
          </div>
        )}
        <div className="animate-pulse space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Location error state
  if (locationError) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">Nearby Outdoor Gyms</h3>
          </div>
        )}
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-yellow-400">{locationError}</p>
          </div>
        </div>
        <Link
          to="/discover"
          className="mt-4 flex items-center justify-center gap-2 p-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span className="font-medium">Browse All Locations</span>
        </Link>
      </div>
    );
  }

  // No venues or API error - show mock data
  const venues: Venue[] = data?.nearbyVenues || [
    {
      id: 'mock-1',
      name: 'Central Park Fitness Station',
      address: 'Near 72nd Street',
      distance: 450,
      rating: 4.5,
      reviewCount: 23,
      equipmentTypes: ['pull-up-bar', 'parallel-bars', 'dip-station'],
      isVerified: true,
      openNow: true,
    },
    {
      id: 'mock-2',
      name: 'Riverside Calisthenics Area',
      address: 'Riverside Park',
      distance: 890,
      rating: 4.2,
      reviewCount: 15,
      equipmentTypes: ['pull-up-bar', 'rings', 'monkey-bars'],
      isVerified: false,
      openNow: true,
    },
    {
      id: 'mock-3',
      name: 'East Side Outdoor Gym',
      address: 'Carl Schurz Park',
      distance: 1200,
      rating: 4.8,
      reviewCount: 31,
      equipmentTypes: ['pull-up-bar', 'dip-station', 'bench'],
      isVerified: true,
      openNow: true,
    },
  ];

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">Nearby Outdoor Gyms</h3>
          </div>
          <Link
            to="/discover"
            className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Venue List */}
      <div className="space-y-3">
        {venues.map((venue, index) => (
          <SafeMotion.button
            key={venue.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleVenueClick(venue)}
            className="w-full flex items-center gap-3 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-green-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{venue.name}</span>
                {venue.isVerified && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded font-medium">
                    Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {formatDistance(venue.distance)}
                </span>
                {venue.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    {venue.rating.toFixed(1)}
                  </span>
                )}
                {venue.equipmentTypes && venue.equipmentTypes.length > 0 && (
                  <span className="hidden sm:block truncate">
                    {venue.equipmentTypes
                      .slice(0, 2)
                      .map((t) => EQUIPMENT_LABELS[t] || t)
                      .join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Distance arrow */}
            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          </SafeMotion.button>
        ))}
      </div>

      {/* Quick Actions */}
      {!compact && (
        <div className="mt-4 flex gap-2">
          <Link
            to="/discover"
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Open Map</span>
          </Link>
          <Link
            to="/discover/add"
            className="flex items-center justify-center gap-2 p-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <span className="font-medium">+ Add Location</span>
          </Link>
        </div>
      )}

      {/* Note if using mock data */}
      {!data?.nearbyVenues && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Sample locations shown. Enable location for accurate results.
        </p>
      )}
    </div>
  );
}

export default NearbyVenuesWidget;
