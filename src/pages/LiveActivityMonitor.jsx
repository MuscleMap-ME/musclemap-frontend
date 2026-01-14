/**
 * LiveActivityMonitor Page
 *
 * Real-time activity visualization dashboard.
 * All data is anonymous and aggregated - respects user privacy absolutely.
 *
 * Features:
 * - Interactive activity map with clustering
 * - Geographic drill-down navigation
 * - Real-time activity feed
 * - Trending exercises
 * - Time-based filtering
 */

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Globe,
  ArrowLeft,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { useLiveActivity } from '../hooks/useLiveActivity';
import {
  ActivityMapAnonymous,
  HierarchyNavigator,
  FilterPanel,
  StatsPanel,
  LiveActivityFeed,
  TrendingExercises,
} from '../components/live';

function LiveActivityMonitor() {
  const [timeWindow, setTimeWindow] = useState('1h');
  const [muscleGroup, setMuscleGroup] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState(null);

  const {
    stats,
    mapData,
    feed,
    trending,
    activityByMuscle,
    loading,
    connected,
    refresh,
  } = useLiveActivity({ timeWindow });

  // Handle region click on map
  const handleRegionClick = useCallback((region) => {
    setSelectedRegion(region);
  }, []);

  // Handle hierarchy level change
  const handleLevelChange = useCallback((level, path) => {
    // Could filter data based on selected level
    console.log('Level changed:', level, path);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/community"
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Live Activity
                </h1>
                <p className="text-sm text-white/50">
                  Real-time anonymous workout activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                connected
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/10 text-white/50'
              }`}>
                {connected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>

              {/* Refresh button */}
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Privacy notice banner */}
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400/80">
            <strong>Privacy Protected:</strong> All data shown is anonymous and aggregated.
            Users who opt out of activity tracking are never included in this data.
          </p>
        </div>

        {/* Layout: Filter + Map/Stats + Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar - Filters & Hierarchy */}
          <div className="lg:col-span-3 space-y-4">
            <FilterPanel
              timeWindow={timeWindow}
              muscleGroup={muscleGroup}
              eventType={eventType}
              onTimeWindowChange={setTimeWindow}
              onMuscleGroupChange={setMuscleGroup}
              onEventTypeChange={setEventType}
            />

            <HierarchyNavigator
              timeWindow={timeWindow}
              onLevelChange={handleLevelChange}
            />

            <TrendingExercises
              trending={trending}
              timeWindow={timeWindow}
            />
          </div>

          {/* Center - Map & Stats */}
          <div className="lg:col-span-6 space-y-4">
            {/* Map */}
            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white/80">
                    Activity Map
                  </span>
                </div>
                {selectedRegion && (
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <ActivityMapAnonymous
                mapData={mapData}
                onRegionClick={handleRegionClick}
                className="aspect-[2/1]"
              />
            </div>

            {/* Stats */}
            <StatsPanel
              stats={stats}
              activityByMuscle={activityByMuscle}
              timeWindow={timeWindow}
              connected={connected}
            />
          </div>

          {/* Right sidebar - Live Feed */}
          <div className="lg:col-span-3">
            <LiveActivityFeed feed={feed} />
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/30">
            Data refreshes automatically every 30 seconds when not connected via WebSocket.
            <br />
            Events older than 24 hours are automatically removed.
          </p>
        </div>
      </main>
    </div>
  );
}

export default LiveActivityMonitor;
