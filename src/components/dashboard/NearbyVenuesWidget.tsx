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
// Note: Simplified to avoid exceeding query complexity limit of 500
// Removed nested equipment array which causes high complexity
const NEARBY_VENUES_QUERY = gql`
  query NearestOutdoorVenues($input: NearestVenuesInput!) {
    nearestOutdoorVenues(input: $input) {
      id
      name
      address
      distance
      averageRating
      totalRatings
      isVerified
      latitude
      longitude
    }
  }
`;

interface Venue {
  id: string;
  name: string;
  address?: string;
  distance: number;
  averageRating?: number;
  totalRatings?: number;
  equipmentTypes?: string[];
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
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

// Equipment type icons/labels (slugs from API)
const EQUIPMENT_LABELS: Record<string, string> = {
  'pull-up-bar': 'Pull-up',
  'dip-station': 'Dips',
  'parallel-bars': 'Parallels',
  'rings': 'Rings',
  'monkey-bars': 'Monkey Bars',
  'ab-bench': 'Ab Bench',
  'sit-up-bench': 'Sit-up Bench',
  'balance-beam': 'Balance',
  'outdoor-gym-station': 'Gym Station',
  'calisthenics-park': 'Calisthenics',
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
  const [isLocating, setIsLocating] = useState(true);
  const [hasUserLocation, setHasUserLocation] = useState(false);

  // Default to NYC (Times Square area) when location unavailable
  const DEFAULT_LOCATION = { lat: 40.7580, lng: -73.9855 };

  // Request user's location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setHasUserLocation(true);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(
          error.code === 1
            ? 'Showing NYC venues. Enable location for personalized results.'
            : 'Showing NYC venues. Unable to determine your location.'
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  // Use user location if available, otherwise default to NYC
  const queryLocation = userLocation || DEFAULT_LOCATION;

  // Fetch nearby venues (always fetch, using default location as fallback)
  const { data, loading, error: _error } = useQuery(NEARBY_VENUES_QUERY, {
    variables: {
      input: {
        latitude: queryLocation.lat,
        longitude: queryLocation.lng,
        limit,
      },
    },
    skip: isLocating, // Only skip while actively trying to get location
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

  // Note: We no longer block on location error - we show NYC venues as fallback
  // The locationError message is displayed as a subtle notice in the header area

  // Transform API response to widget format
  interface VenueResponse {
    id: string;
    name: string;
    address?: string;
    distance?: number;
    averageRating?: number;
    totalRatings?: number;
    isVerified?: boolean;
    latitude?: number;
    longitude?: number;
  }
  const apiVenues = data?.nearestOutdoorVenues?.map((v: VenueResponse) => ({
    id: v.id,
    name: v.name,
    address: v.address,
    distance: v.distance || 0,
    averageRating: v.averageRating,
    totalRatings: v.totalRatings,
    equipmentTypes: [], // Equipment not fetched in simplified query to reduce complexity
    isVerified: v.isVerified,
    latitude: v.latitude,
    longitude: v.longitude,
  }));

  // Use API data, or fallback to real NYC venue data if API fails
  const venues: Venue[] = apiVenues && apiVenues.length > 0 ? apiVenues : [
    // Fallback: Real NYC venues from database (used if API fails)
    {
      id: 'fv_75fc44c958e94ed2be82b84c62feed61',
      name: 'Riverside Park 72nd St Outdoor Gym',
      address: 'Riverside Park at 72nd St',
      distance: 2100, // ~1.3 miles from Times Square
      averageRating: 4.5,
      totalRatings: 0,
      equipmentTypes: ['pull-up-bar', 'parallel-bars', 'dip-station'],
      isVerified: true,
    },
    {
      id: 'fv_fab15f846dec48279ab5c9eb247f76e2',
      name: 'Tompkins Square Park Fitness Area',
      address: 'Avenue A & E 7th St',
      distance: 4100, // ~2.5 miles from Times Square
      averageRating: 4.3,
      totalRatings: 0,
      equipmentTypes: ['pull-up-bar', 'rings', 'monkey-bars'],
      isVerified: true,
    },
    {
      id: 'fv_59f96cf7d636462eb6bef1b4cdc7c431',
      name: 'McCarren Park Fitness Area',
      address: 'McCarren Park, Williamsburg',
      distance: 5800, // ~3.6 miles from Times Square
      averageRating: 4.6,
      totalRatings: 0,
      equipmentTypes: ['pull-up-bar', 'dip-station', 'outdoor-gym-station'],
      isVerified: true,
    },
  ];

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">
              {hasUserLocation ? 'Nearby Outdoor Gyms' : 'Outdoor Gyms in NYC'}
            </h3>
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

      {/* Location notice when using default */}
      {locationError && !hasUserLocation && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <AlertCircle className="w-3 h-3" />
          <span>{locationError}</span>
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
                {venue.averageRating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    {venue.averageRating.toFixed(1)}
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
      {!data?.nearestOutdoorVenues && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Sample locations shown. Enable location for accurate results.
        </p>
      )}
    </div>
  );
}

export default NearbyVenuesWidget;
