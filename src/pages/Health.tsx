/**
 * Health Page
 *
 * Wearables integration and health data dashboard for web.
 * Note: On web, we show sync status and data from wearables
 * connected via the mobile app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';

// ============================================
// ICONS
// ============================================
const Icons = {
  Heart: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Footprints: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5.5C13 3.567 11.433 2 9.5 2S6 3.567 6 5.5 7.567 9 9.5 9 13 7.433 13 5.5zm-6 8c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3 3-1.343 3-3zm14 0c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3 3-1.343 3-3zm-6-8C15 3.567 13.433 2 11.5 2m7.5 16.5C19 16.567 17.433 15 15.5 15S12 16.567 12 18.5 13.567 22 15.5 22 19 20.433 19 18.5z" />
    </svg>
  ),
  Flame: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  Moon: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Watch: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Activity: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12h4l1.5-6 3 12 1.5-6h4.5" />
    </svg>
  ),
  Link: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Refresh: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Clock: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Smartphone: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({ icon: Icon, iconColor, value, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="p-6 text-center">
        <Icon className={`w-8 h-8 ${iconColor} mx-auto mb-3`} />
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-white/50 text-sm">{label}</div>
      </GlassCard>
    </motion.div>
  );
}

// ============================================
// MAIN HEALTH PAGE
// ============================================
export default function Health() {
  const { user: _user } = useUser();
  const [summary, setSummary] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      // Use correct API endpoints:
      // - /wearables returns health summary
      // - /wearables/status returns sync status with provider connections
      const [summaryRes, statusRes] = await Promise.all([
        api.get('/wearables').catch(() => ({ data: null })),
        api.get('/wearables/status').catch(() => ({ data: { syncStatus: [] } })),
      ]);

      setSummary(summaryRes.data);
      // Transform syncStatus into connections format expected by the component
      const syncStatus = statusRes.data?.syncStatus || [];
      const connections = syncStatus.map((status: { provider: string; lastSyncAt?: string; isConnected?: boolean }) => ({
        provider: status.provider,
        lastSyncAt: status.lastSyncAt,
        isConnected: status.isConnected ?? true,
      }));
      setConnections(connections);
    } catch (err) {
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/wearables/sync');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const hasConnection = connections.length > 0 && connections.some(c => c.isConnected);
  const activeConnection = connections.find(c => c.isConnected);

  if (loading) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading health data...</p>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Health</h1>
          <p className="text-white/60">Wearables integration and health metrics</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Connection Status */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasConnection ? 'bg-green-500/20' : 'bg-white/10'}`}>
                <Icons.Watch className={`w-6 h-6 ${hasConnection ? 'text-green-400' : 'text-white/50'}`} />
              </div>
              <div>
                <div className="text-white font-bold">
                  {activeConnection?.provider === 'apple_health' ? 'Apple Health' :
                   activeConnection?.provider === 'google_fit' ? 'Google Fit' :
                   activeConnection?.provider === 'garmin' ? 'Garmin' :
                   activeConnection?.provider === 'fitbit' ? 'Fitbit' :
                   activeConnection?.provider === 'whoop' ? 'WHOOP' :
                   'Wearable Device'}
                </div>
                <div className="text-white/50 text-sm">
                  {hasConnection ? 'Connected' : 'Not connected'}
                </div>
              </div>
            </div>
            {hasConnection && (
              <div className="flex items-center gap-3">
                {activeConnection?.lastSyncAt && (
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Icons.Clock className="w-4 h-4" />
                    <span>Synced {formatLastSync(activeConnection.lastSyncAt)}</span>
                  </div>
                )}
                <GlassButton
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2"
                >
                  <Icons.Refresh className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync
                </GlassButton>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Health Data */}
        {summary ? (
          <>
            {/* Today's Stats */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Today</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Icons.Footprints}
                  iconColor="text-blue-400"
                  value={(summary.today?.steps || 0).toLocaleString()}
                  label="Steps"
                  delay={0}
                />
                <StatCard
                  icon={Icons.Flame}
                  iconColor="text-orange-400"
                  value={summary.today?.activeCalories || 0}
                  label="Active Calories"
                  delay={0.1}
                />
                <StatCard
                  icon={Icons.Heart}
                  iconColor="text-red-400"
                  value={summary.today?.avgHeartRate || '--'}
                  label="Avg Heart Rate"
                  delay={0.2}
                />
                <StatCard
                  icon={Icons.Activity}
                  iconColor="text-green-400"
                  value={summary.today?.workoutMinutes || 0}
                  label="Workout Min"
                  delay={0.3}
                />
              </div>
            </div>

            {/* Sleep */}
            {summary.today?.sleepHours !== null && summary.today?.sleepHours !== undefined && (
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Icons.Moon className="w-8 h-8 text-purple-400" />
                    <div>
                      <div className="text-white font-bold">Sleep</div>
                      <div className="text-white/50 text-sm">Last night</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {summary.today.sleepHours} hrs
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Weekly Summary */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">This Week</h3>
              <GlassCard className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <Icons.Footprints className="w-5 h-5 text-blue-400" />
                      <span className="text-white">Total Steps</span>
                    </div>
                    <span className="text-white font-bold">
                      {(summary.thisWeek?.totalSteps || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <Icons.Footprints className="w-5 h-5 text-blue-400" />
                      <span className="text-white">Daily Average</span>
                    </div>
                    <span className="text-white font-bold">
                      {(summary.thisWeek?.avgDailySteps || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <Icons.Activity className="w-5 h-5 text-green-400" />
                      <span className="text-white">Workout Minutes</span>
                    </div>
                    <span className="text-white font-bold">
                      {summary.thisWeek?.totalWorkoutMinutes || 0}
                    </span>
                  </div>

                  {summary.thisWeek?.avgSleepHours !== null && summary.thisWeek?.avgSleepHours !== undefined && (
                    <div className="flex items-center justify-between py-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <Icons.Moon className="w-5 h-5 text-purple-400" />
                        <span className="text-white">Avg Sleep</span>
                      </div>
                      <span className="text-white font-bold">
                        {summary.thisWeek.avgSleepHours} hrs
                      </span>
                    </div>
                  )}

                  {summary.thisWeek?.avgRestingHeartRate !== null && summary.thisWeek?.avgRestingHeartRate !== undefined && (
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Icons.Heart className="w-5 h-5 text-red-400" />
                        <span className="text-white">Resting Heart Rate</span>
                      </div>
                      <span className="text-white font-bold">
                        {summary.thisWeek.avgRestingHeartRate} bpm
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </>
        ) : (
          /* Empty State */
          <GlassCard className="p-8 text-center">
            <Icons.Watch className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wearable</h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Sync your health data from Apple Health, Google Fit, Garmin, Fitbit, or WHOOP via the MuscleMap mobile app.
            </p>
            <div className="flex flex-col items-center gap-4">
              <GlassCard className="p-4 bg-white/5 inline-flex items-center gap-3">
                <Icons.Smartphone className="w-6 h-6 text-violet-400" />
                <div className="text-left">
                  <div className="text-white font-medium">Use the Mobile App</div>
                  <div className="text-white/50 text-sm">Connect wearables from iOS or Android</div>
                </div>
              </GlassCard>
              <div className="flex gap-2">
                <a
                  href="https://apps.apple.com/app/musclemap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img
                    src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83"
                    alt="Download on the App Store"
                    className="h-10"
                  />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=me.musclemap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img
                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                    alt="Get it on Google Play"
                    className="h-10"
                  />
                </a>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Supported Devices */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Supported Devices</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Apple Watch', icon: '⌚' },
              { name: 'Garmin', icon: '🏃' },
              { name: 'Fitbit', icon: '💪' },
              { name: 'WHOOP', icon: '🔴' },
              { name: 'Google Fit', icon: '📱' },
            ].map((device) => (
              <div key={device.name} className="text-center p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="text-2xl mb-2">{device.icon}</div>
                <div className="text-white/70 text-sm">{device.name}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </GlassSurface>
  );
}
