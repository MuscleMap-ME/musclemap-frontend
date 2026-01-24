/**
 * RegionalAnalytics Page
 *
 * Shows aggregate analytics for multiple venues in a region:
 * - Venue comparison
 * - Geographic heatmap
 * - Regional trends
 * - Top performers across venues
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Trophy,
  TrendingUp,
  Users,
  Activity,
  Filter,
  BarChart3,
} from 'lucide-react';
import { VenueHeatmap, VenueHeatmapPoint } from '../components/venue-analytics';
import { VenueActivityLineChart, DailyDataPoint } from '../components/venue-analytics/VenueActivityLineChart';

// ============================================
// GRAPHQL QUERIES
// ============================================

const REGIONAL_ANALYTICS_QUERY = gql`
  query RegionalAnalyticsQuery($input: RegionalActivityInput!) {
    regionalActivitySummary(input: $input) {
      venues {
        id
        name
        address
        latitude
        longitude
      }
      venueCount
      totalWorkouts
      uniqueUsers
      totalRecordsSet
      venueComparison {
        venueId
        venueName
        workouts
        users
        records
      }
      heatmapData {
        venueId
        latitude
        longitude
        intensity
        workouts
      }
    }
  }
`;

const NEARBY_VENUES_QUERY = gql`
  query NearbyVenueActivity($latitude: Float!, $longitude: Float!, $radiusMeters: Int!, $limit: Int) {
    nearbyVenueActivity(
      latitude: $latitude
      longitude: $longitude
      radiusMeters: $radiusMeters
      limit: $limit
    ) {
      venueId
      venue {
        id
        name
        address
      }
      totalWorkouts
      uniqueUsers
      totalRecordsSet
      dailyWorkouts {
        date
        value
      }
    }
  }
`;

// ============================================
// TYPES
// ============================================

interface VenueComparisonItem {
  venueId: string;
  venueName: string;
  workouts: number;
  users: number;
  records: number;
}

// ============================================
// COMPONENT
// ============================================

export default function RegionalAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get location from URL params or use default (NYC)
  const latitude = parseFloat(searchParams.get('lat') || '40.7128');
  const longitude = parseFloat(searchParams.get('lng') || '-74.0060');
  const borough = searchParams.get('borough') || null;
  const radiusMeters = parseInt(searchParams.get('radius') || '5000');

  // Date range state (default to last 30 days)
  // setDateRange will be used for date picker (future enhancement)
  const [dateRange, _setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  });

  // Query
  const { data, loading, error } = useQuery(REGIONAL_ANALYTICS_QUERY, {
    variables: {
      input: {
        latitude,
        longitude,
        radiusMeters,
        borough,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    },
  });

  const { data: nearbyData } = useQuery(NEARBY_VENUES_QUERY, {
    variables: {
      latitude,
      longitude,
      radiusMeters,
      limit: 10,
    },
  });

  // Extract data
  const regionalSummary = data?.regionalActivitySummary;
  // Memoize nearbyVenues to prevent useMemo dependency issues
  const nearbyVenues = useMemo(() => nearbyData?.nearbyVenueActivity || [], [nearbyData?.nearbyVenueActivity]);

  // Transform heatmap data
  const heatmapData: VenueHeatmapPoint[] = useMemo(() => {
    if (!regionalSummary?.heatmapData) return [];
    return regionalSummary.heatmapData.map((d: {
      venueId: string;
      latitude: number;
      longitude: number;
      intensity: number;
      workouts: number;
    }) => ({
      venueId: d.venueId,
      venueName: regionalSummary.venueComparison?.find(
        (v: VenueComparisonItem) => v.venueId === d.venueId
      )?.venueName || 'Unknown Venue',
      latitude: d.latitude,
      longitude: d.longitude,
      intensity: d.intensity,
      workouts: d.workouts,
    }));
  }, [regionalSummary]);

  // Aggregate daily data
  const aggregateDailyData: DailyDataPoint[] = useMemo(() => {
    if (!nearbyVenues.length) return [];

    // Collect all dates
    const dateMap = new Map<string, number>();
    nearbyVenues.forEach((venue: { dailyWorkouts?: DailyDataPoint[] }) => {
      venue.dailyWorkouts?.forEach((day: DailyDataPoint) => {
        const existing = dateMap.get(day.date) || 0;
        dateMap.set(day.date, existing + day.value);
      });
    });

    // Convert to array and sort
    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [nearbyVenues]);

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Stat card component
  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white/60 text-xs">{label}</div>
          <div className="text-white font-bold text-xl">{value}</div>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded w-1/4" />
            <div className="h-96 bg-white/5 rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-white/5 rounded-xl" />
              <div className="h-24 bg-white/5 rounded-xl" />
              <div className="h-24 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <Globe className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Regional Data</h2>
            <p className="text-white/60">{error.message}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-6 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-violet-400" />
                  Regional Analytics
                </h1>
                <p className="text-white/60 text-sm">
                  {borough || `${radiusMeters / 1000}km radius`} • {dateRange.startDate} to {dateRange.endDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors">
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Stats */}
        {regionalSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={MapPin}
              label="Active Venues"
              value={formatNumber(regionalSummary.venueCount)}
              color="bg-violet-500/20"
            />
            <StatCard
              icon={Activity}
              label="Total Workouts"
              value={formatNumber(regionalSummary.totalWorkouts)}
              color="bg-cyan-500/20"
            />
            <StatCard
              icon={Users}
              label="Unique Users"
              value={formatNumber(regionalSummary.uniqueUsers)}
              color="bg-green-500/20"
            />
            <StatCard
              icon={Trophy}
              label="Records Set"
              value={formatNumber(regionalSummary.totalRecordsSet)}
              color="bg-amber-500/20"
            />
          </div>
        )}

        {/* Geographic Heatmap */}
        {heatmapData.length > 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-violet-400" />
              Activity Heatmap
            </h2>
            <VenueHeatmap
              data={heatmapData}
              height={500}
              centerLatitude={latitude}
              centerLongitude={longitude}
              showLabels={true}
            />
          </div>
        )}

        {/* Aggregate Trend */}
        {aggregateDailyData.length > 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Regional Activity Trend
            </h2>
            <VenueActivityLineChart
              data={aggregateDailyData}
              label="Combined Workouts Across All Venues"
              color="#8b5cf6"
              height={300}
              showArea={true}
            />
          </div>
        )}

        {/* Venue Comparison */}
        {regionalSummary?.venueComparison?.length > 0 && (
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                Venue Comparison
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {regionalSummary.venueComparison
                .sort((a: VenueComparisonItem, b: VenueComparisonItem) => b.workouts - a.workouts)
                .map((venue: VenueComparisonItem, index: number) => (
                  <button
                    key={venue.venueId}
                    onClick={() => navigate(`/venues/${venue.venueId}/analytics`)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0
                            ? 'bg-amber-500/20 text-amber-400'
                            : index === 1
                            ? 'bg-gray-400/20 text-gray-300'
                            : index === 2
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{venue.venueName}</div>
                        <div className="text-white/40 text-sm">
                          {venue.records} records held
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 text-sm">
                      <div className="text-right">
                        <div className="text-white font-bold">{formatNumber(venue.workouts)}</div>
                        <div className="text-white/40">workouts</div>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-400 font-bold">{formatNumber(venue.users)}</div>
                        <div className="text-white/40">users</div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!regionalSummary?.venueComparison?.length && (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Activity Data</h2>
            <p className="text-white/60 max-w-md mx-auto">
              There&apos;s no recorded activity in this region yet. Be the first to log a workout
              at a nearby venue!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
