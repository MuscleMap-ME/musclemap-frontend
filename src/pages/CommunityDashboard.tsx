/**
 * CommunityDashboard Page
 *
 * Comprehensive community dashboard with:
 * - Real-time activity feed
 * - Geographic map view
 * - Statistics dashboard
 * - Monitoring panel (for mods/admins)
 * - Privacy settings
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useUser } from '../contexts/UserContext';
import { getToken } from '../utils/auth';
import useWebSocket from '../hooks/useWebSocket';
import useCommunityStats from '../hooks/useCommunityStats';
import { COMMUNITY_PRESENCE_QUERY } from '../graphql';
import ActivityFeed from '../components/community/ActivityFeed';
import CommunityMap from '../components/community/CommunityMap';
import StatsDashboard from '../components/community/StatsDashboard';
import MonitorPanel from '../components/community/MonitorPanel';
import PrivacySettings from '../components/community/PrivacySettings';

const TABS = [
  { id: 'feed', label: 'Live Feed', icon: '📡' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'stats', label: 'Statistics', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const ADMIN_TABS = [{ id: 'monitor', label: 'Monitor', icon: '🔍' }];

function QuickStats({ nowStats, summary, credits, connected }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {/* Total Members - most important stat */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-white">
          {(summary?.totalUsers || 0).toLocaleString()}
        </div>
        <div className="text-sm text-white/80">Total Members</div>
        <div className="text-xs text-white/60 mt-1">All time</div>
      </div>

      {/* Active Now - real-time presence */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-white">
          {nowStats?.activeUsers || 0}
        </div>
        <div className="text-sm text-white/80">Active Now</div>
        <div className="flex items-center justify-center gap-1 mt-1">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-white animate-pulse' : 'bg-white/50'
            }`}
          />
          <span className="text-xs text-white/60">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Active Workouts - users currently working out */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-white">
          {nowStats?.activeWorkouts || 0}
        </div>
        <div className="text-sm text-white/80">Working Out</div>
        <div className="text-xs text-white/60 mt-1">Right now</div>
      </div>

      {/* Workouts today */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-white">
          {(summary?.workoutsCount || 0).toLocaleString()}
        </div>
        <div className="text-sm text-white/80">Workouts</div>
        <div className="text-xs text-white/60 mt-1">{summary?.window || '24h'}</div>
      </div>

      {/* Credits in circulation */}
      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-white">
          {(credits?.totalCredits || 0).toLocaleString()}
        </div>
        <div className="text-sm text-white/80">Credits</div>
        <div className="text-xs text-white/60 mt-1">In circulation</div>
      </div>
    </div>
  );
}

function TopExercisesBar({ exercises = [] }) {
  if (exercises.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Trending Exercises (Last 15 min)
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {exercises.slice(0, 8).map((ex, i) => (
          <div
            key={ex.exerciseId || i}
            className="flex-shrink-0 bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <span className="text-purple-400 font-bold text-sm">#{i + 1}</span>
            <span className="text-white text-sm truncate max-w-[120px]">
              {ex.name}
            </span>
            <span className="text-gray-400 text-xs">({ex.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// TypeScript interface for geographic bucket data
interface GeoBucket {
  geoBucket: string;
  count: number;
}

interface CommunityPresenceData {
  total: number;
  byGeoBucket: GeoBucket[];
  redisEnabled: boolean;
}

export default function CommunityDashboard() {
  const { user } = useUser();
  const token = getToken();
  const [activeTab, setActiveTab] = useState('feed');

  // Determine user role
  const userRole = user?.role || (user?.roles?.includes('admin') ? 'admin' : 'user');
  const isModOrAdmin = userRole === 'moderator' || userRole === 'admin';

  // WebSocket connection for real-time updates
  const {
    connected,
    snapshot,
    events: wsEvents,
    error: wsError,
  } = useWebSocket('/api/community/ws/public', {
    autoConnect: true,
    token,
  });

  // Track if we've waited long enough for WebSocket initial connection
  const [wsInitialized, setWsInitialized] = useState(false);

  // Set wsInitialized after a short timeout or when we get data
  useEffect(() => {
    if (connected || snapshot || wsEvents.length > 0 || wsError) {
      setWsInitialized(true);
      return;
    }
    // Fallback timeout - don't wait forever for WebSocket
    const timeout = setTimeout(() => setWsInitialized(true), 3000);
    return () => clearTimeout(timeout);
  }, [connected, snapshot, wsEvents, wsError]);

  // Stats hook for dashboard data
  const {
    loading: statsLoading,
    summary,
    archetypes,
    exercises,
    funnel,
    credits,
    geographic,
    nowStats,
    refresh: refreshStats,
  } = useCommunityStats({
    autoFetch: true,
    refreshInterval: 60000,
  });

  // Merge snapshot events with WebSocket events
  const allEvents = React.useMemo(() => {
    const snapshotEvents = snapshot?.recentEvents || [];
    const merged = [...wsEvents];

    // Add snapshot events that aren't already in wsEvents
    for (const event of snapshotEvents) {
      if (!merged.find((e) => e.id === event.id)) {
        merged.push(event);
      }
    }

    // Sort by timestamp descending
    return merged.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 100);
  }, [snapshot, wsEvents]);

  // Fetch presence data for map via GraphQL
  const { data: presenceResponse } = useQuery<{
    communityPresence: CommunityPresenceData;
  }>(COMMUNITY_PRESENCE_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // Refresh every 30 seconds
  });

  // Extract presence data for the map component
  const presenceData = useMemo(() => {
    return presenceResponse?.communityPresence?.byGeoBucket || [];
  }, [presenceResponse]);

  // Available tabs
  const tabs = [...TABS, ...(isModOrAdmin ? ADMIN_TABS : [])];

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <span>Community</span>
            </h1>

            <button
              onClick={refreshStats}
              className="text-gray-400 hover:text-white p-2"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick Navigation Links */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Link
            to="/competitions"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors"
          >
            🏆 Competitions
          </Link>
          <Link
            to="/highfives"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors"
          >
            🖐️ High Fives
          </Link>
          <Link
            to="/locations"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors"
          >
            📍 Locations
          </Link>
        </div>

        {/* Quick Stats */}
        <QuickStats nowStats={nowStats} summary={summary} credits={credits} connected={connected} />

        {/* Top Exercises Bar */}
        <TopExercisesBar exercises={nowStats?.topExercises} />

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'feed' && (
            <ActivityFeed
              events={allEvents}
              loading={!wsInitialized && !snapshot && wsEvents.length === 0}
              connected={connected}
            />
          )}

          {activeTab === 'map' && (
            <CommunityMap
              presenceData={presenceData}
              loading={presenceData.length === 0}
            />
          )}

          {activeTab === 'stats' && (
            <StatsDashboard
              overview={summary}
              archetypes={archetypes}
              exercises={exercises}
              funnel={funnel}
              credits={credits}
              geographic={geographic}
              loading={statsLoading}
            />
          )}

          {activeTab === 'settings' && <PrivacySettings />}

          {activeTab === 'monitor' && isModOrAdmin && (
            <MonitorPanel userRole={userRole} />
          )}
        </div>
      </main>
    </div>
  );
}
