/**
 * VenueAnalyticsDashboard - Main Dashboard Container
 *
 * Combines all venue analytics visualizations into a cohesive dashboard:
 * - Activity trends (line chart)
 * - Exercise distribution (pie chart)
 * - Hourly patterns (bar chart)
 * - Day-of-week patterns (bar/radar chart)
 * - Muscle activation (heatmap)
 * - Venue comparison (geographic heatmap)
 * - Leaderboards (table)
 */

import React, { useState } from 'react';
import { Calendar, MapPin, Activity, Trophy, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { VenueActivityLineChart, type DailyDataPoint } from './VenueActivityLineChart';
import { VenueExercisePieChart, type ExerciseData } from './VenueExercisePieChart';
import { VenueHourlyBarChart, type HourlyDataPoint } from './VenueHourlyBarChart';
import { VenueWeekdayChart, type WeekdayDataPoint } from './VenueWeekdayChart';
import { VenueMuscleHeatmap, type MuscleActivationData } from './VenueMuscleHeatmap';
import { VenueHeatmap, type VenueHeatmapPoint } from './VenueHeatmap';
import { VenueLeaderboardTable, type LeaderboardEntry } from './VenueLeaderboardTable';

// ============================================
// TYPES
// ============================================

export interface VenueAnalyticsDashboardProps {
  venueName: string;
  venueId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };

  // Summary stats
  summary?: {
    totalWorkouts: number;
    uniqueUsers: number;
    totalRecordsSet: number;
    totalVolumeKg: number;
    totalTu: number;
  };

  // Chart data
  dailyWorkouts?: DailyDataPoint[];
  dailyUsers?: DailyDataPoint[];
  dailyRecords?: DailyDataPoint[];
  exerciseDistribution?: ExerciseData[];
  muscleDistribution?: MuscleActivationData[];
  hourlyPattern?: HourlyDataPoint[] | number[];
  weekdayPattern?: WeekdayDataPoint[];

  // For regional view
  venueHeatmapData?: VenueHeatmapPoint[];

  // Leaderboard
  topExercise?: {
    exerciseId: string;
    exerciseName: string;
    recordType: string;
    entries: LeaderboardEntry[];
    totalParticipants: number;
  };

  // Current user context
  currentUserId?: string;

  // Loading states
  loading?: boolean;

  // Callbacks
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  onExerciseClick?: (exerciseId: string) => void;
  onLeaderboardRowClick?: (entry: LeaderboardEntry) => void;
}

// ============================================
// DATE RANGE PRESETS
// ============================================

const DATE_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

// ============================================
// COMPONENT
// ============================================

export function VenueAnalyticsDashboard({
  venueName,
  venueId: _venueId,
  dateRange,
  summary,
  dailyWorkouts = [],
  dailyUsers = [],
  dailyRecords = [],
  exerciseDistribution = [],
  muscleDistribution = [],
  hourlyPattern = [],
  weekdayPattern = [],
  venueHeatmapData = [],
  topExercise,
  currentUserId,
  loading = false,
  onDateRangeChange,
  onExerciseClick,
  onLeaderboardRowClick,
}: VenueAnalyticsDashboardProps) {
  const [activePreset, setActivePreset] = useState(1); // Default to 30D
  const [activeTab, setActiveTab] = useState<'overview' | 'exercises' | 'leaderboards' | 'regional'>('overview');

  // Handle preset click
  const handlePresetClick = (index: number, days: number) => {
    setActivePreset(index);
    if (onDateRangeChange) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      onDateRangeChange(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    }
  };

  // Format large numbers
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white/10 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-white/5 rounded-xl" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-violet-400" />
            {venueName}
          </h2>
          <p className="text-white/60 text-sm mt-1">
            Activity Analytics • {dateRange.startDate} to {dateRange.endDate}
          </p>
        </div>

        {/* Date Range Presets */}
        <div className="flex items-center gap-2">
          {DATE_PRESETS.map((preset, index) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(index, preset.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePreset === index
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors">
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'exercises', label: 'Exercises', icon: Activity },
          { key: 'leaderboards', label: 'Leaderboards', icon: Trophy },
          { key: 'regional', label: 'Regional', icon: MapPin },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-violet-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Activity}
            label="Total Workouts"
            value={formatNumber(summary.totalWorkouts)}
            color="bg-violet-500/20"
          />
          <StatCard
            icon={Users}
            label="Unique Users"
            value={formatNumber(summary.uniqueUsers)}
            color="bg-cyan-500/20"
          />
          <StatCard
            icon={Trophy}
            label="Records Set"
            value={formatNumber(summary.totalRecordsSet)}
            color="bg-amber-500/20"
          />
          <StatCard
            icon={TrendingUp}
            label="Volume (kg)"
            value={formatNumber(Math.round(summary.totalVolumeKg))}
            color="bg-green-500/20"
          />
          <StatCard
            icon={BarChart3}
            label="Total TU"
            value={formatNumber(Math.round(summary.totalTu))}
            color="bg-pink-500/20"
          />
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Activity Trend */}
          {dailyWorkouts.length > 0 && (
            <VenueActivityLineChart
              data={dailyWorkouts}
              label="Daily Workouts"
              color="#8b5cf6"
              height={280}
            />
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hourly Pattern */}
            {hourlyPattern.length > 0 && (
              <VenueHourlyBarChart data={hourlyPattern} height={250} />
            )}

            {/* Weekday Pattern */}
            {weekdayPattern.length > 0 && (
              <VenueWeekdayChart data={weekdayPattern} height={250} chartType="bar" />
            )}
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users Trend */}
            {dailyUsers.length > 0 && (
              <VenueActivityLineChart
                data={dailyUsers}
                label="Daily Active Users"
                color="#06b6d4"
                height={200}
                showArea={true}
                showPoints={false}
              />
            )}

            {/* Records Trend */}
            {dailyRecords.length > 0 && (
              <VenueActivityLineChart
                data={dailyRecords}
                label="Records Set"
                color="#f59e0b"
                height={200}
                showArea={false}
                showPoints={true}
              />
            )}

            {/* Exercise Distribution Preview */}
            {exerciseDistribution.length > 0 && (
              <VenueExercisePieChart
                data={exerciseDistribution.slice(0, 6)}
                height={200}
                showLegend={false}
                onSegmentClick={onExerciseClick}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-6">
          {/* Exercise Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VenueExercisePieChart
              data={exerciseDistribution}
              height={350}
              showLegend={true}
              onSegmentClick={onExerciseClick}
            />

            {/* Muscle Activation */}
            <VenueMuscleHeatmap
              data={muscleDistribution}
              height={350}
              layout="treemap"
              showLabels={true}
              showPercentages={true}
            />
          </div>

          {/* Muscle Grid View */}
          <VenueMuscleHeatmap
            data={muscleDistribution}
            height={300}
            layout="grid"
            showLabels={true}
          />
        </div>
      )}

      {activeTab === 'leaderboards' && (
        <div className="space-y-6">
          {topExercise ? (
            <VenueLeaderboardTable
              exerciseName={topExercise.exerciseName}
              recordType={topExercise.recordType}
              entries={topExercise.entries.map((e) => ({
                ...e,
                isCurrentUser: e.userId === currentUserId,
              }))}
              totalParticipants={topExercise.totalParticipants}
              onRowClick={onLeaderboardRowClick}
              maxRows={15}
              showPagination={true}
            />
          ) : (
            <div className="bg-white/5 rounded-xl p-8 text-center">
              <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Records Yet</h3>
              <p className="text-white/60 text-sm">
                Be the first to set a record at this venue!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'regional' && (
        <div className="space-y-6">
          {venueHeatmapData.length > 0 ? (
            <>
              <VenueHeatmap
                data={venueHeatmapData}
                height={500}
                showLabels={true}
              />

              {/* Venue Comparison List */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <h3 className="text-white font-medium">Nearby Venues</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {venueHeatmapData
                    .sort((a, b) => b.intensity - a.intensity)
                    .slice(0, 10)
                    .map((venue) => (
                      <div
                        key={venue.venueId}
                        className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: `rgba(139, 92, 246, ${0.3 + venue.intensity * 0.7})`,
                            }}
                          />
                          <span className="text-white">{venue.venueName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-white/60">
                            {venue.workouts.toLocaleString()} workouts
                          </span>
                          {venue.users !== undefined && (
                            <span className="text-cyan-400">
                              {venue.users.toLocaleString()} users
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/5 rounded-xl p-8 text-center">
              <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Regional Data</h3>
              <p className="text-white/60 text-sm">
                Regional activity data will appear here once more venues have activity.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VenueAnalyticsDashboard;
