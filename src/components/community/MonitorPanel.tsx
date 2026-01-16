/**
 * MonitorPanel Component
 *
 * Admin/Moderator monitoring dashboard for community oversight.
 * Requires moderator or admin role.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { authFetch } from '../../utils/auth';

function MetricCard({ label, value, subtext, color = 'purple' }) {
  const colorClasses = {
    purple: 'from-purple-600 to-indigo-600',
    green: 'from-green-600 to-emerald-600',
    blue: 'from-blue-600 to-cyan-600',
    orange: 'from-orange-600 to-amber-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4`}>
      <div className="text-sm text-white/80">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-white/60 mt-1">{subtext}</div>}
    </div>
  );
}

function EventTypeBreakdown({ eventCounts }) {
  if (!eventCounts || eventCounts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Event Types</h3>
        <p className="text-gray-400">No events in this window</p>
      </div>
    );
  }

  const total = eventCounts.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-3">Event Types</h3>
      <div className="space-y-2">
        {eventCounts.map((event) => (
          <div key={event.event_type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">{event.event_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{event.count}</span>
              <span className="text-gray-500 text-xs">
                ({Math.round((event.count / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionStatus({ connections }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-3">WebSocket Connections</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400">
            {connections?.communityConnections || 0}
          </div>
          <div className="text-sm text-gray-400">Community</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-400">
            {connections?.monitorConnections || 0}
          </div>
          <div className="text-sm text-gray-400">Monitors</div>
        </div>
      </div>
    </div>
  );
}

function RecentEventsLog({ events, onUserClick }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">Recent Events</h3>
        <p className="text-gray-400">No recent events</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-3">Recent Events (Raw)</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.slice(0, 50).map((event) => (
          <div
            key={event.id}
            className="bg-gray-700 rounded-lg p-3 text-sm"
          >
            <div className="flex justify-between items-start mb-1">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  event.visibility_scope === 'admin'
                    ? 'bg-red-600'
                    : event.visibility_scope === 'moderator'
                    ? 'bg-orange-600'
                    : 'bg-green-600'
                }`}
              >
                {event.visibility_scope}
              </span>
              <span className="text-gray-400 text-xs">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-400">{event.event_type}</span>
              <button
                onClick={() => onUserClick?.(event.user_id)}
                className="text-blue-400 hover:underline text-xs"
              >
                {event.user_id?.substring(0, 12)}...
              </button>
            </div>
            {event.geo_bucket && (
              <div className="text-gray-400 text-xs mt-1">
                Location: {event.geo_bucket}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UserDrilldown({ userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authFetch(`/api/community/monitor/user/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch user');
        const json = await res.json();
        setUserData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchUser();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">{error}</div>
        )}

        {userData && (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">User Info</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">ID:</span>
                  <span className="text-white ml-2">{userData.user?.id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Username:</span>
                  <span className="text-white ml-2">{userData.user?.username}</span>
                </div>
                <div>
                  <span className="text-gray-400">Role:</span>
                  <span className="text-white ml-2">{userData.user?.role || 'user'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Joined:</span>
                  <span className="text-white ml-2">
                    {new Date(userData.user?.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Privacy Settings</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Location:</span>
                  <span className={`ml-2 ${userData.privacy?.shareLocation ? 'text-green-400' : 'text-red-400'}`}>
                    {userData.privacy?.shareLocation ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Feed:</span>
                  <span className={`ml-2 ${userData.privacy?.showInFeed ? 'text-green-400' : 'text-red-400'}`}>
                    {userData.privacy?.showInFeed ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Recent Activity</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userData.events?.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between text-sm bg-gray-600 rounded p-2"
                  >
                    <span className="text-purple-400">{event.event_type}</span>
                    <span className="text-gray-400">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonitorPanel({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const [timeWindow, setTimeWindow] = useState('24h');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await authFetch(`/api/community/monitor/metrics?window=${timeWindow}`);
      if (res.status === 403) {
        setError('Insufficient permissions. Moderator role required.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      setMetrics(json.data);
    } catch (err) {
      setError(err.message);
    }
  }, [timeWindow]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await authFetch('/api/community/monitor/feed?limit=100');
      if (!res.ok) throw new Error('Failed to fetch events');
      const json = await res.json();
      setEvents(json.data?.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchEvents()]);
      setLoading(false);
    };
    load();
  }, [fetchMetrics, fetchEvents]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
      fetchEvents();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchEvents]);

  if (!userRole || (userRole !== 'moderator' && userRole !== 'admin')) {
    return (
      <div className="bg-red-900/50 text-red-300 p-6 rounded-xl text-center">
        <p className="text-xl mb-2">Access Denied</p>
        <p className="text-sm">This panel requires moderator or admin privileges.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 text-red-300 p-6 rounded-xl text-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Window Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🔍</span> Monitoring Dashboard
        </h2>
        <div className="flex gap-2">
          {['1h', '24h', '7d'].map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeWindow === w
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Now"
          value={metrics?.activeNow?.total || 0}
          subtext="Users online"
          color="green"
        />
        <MetricCard
          label="Total Users"
          value={metrics?.overview?.users?.total?.toLocaleString() || 0}
          subtext={`+${metrics?.overview?.users?.newInWindow || 0} new`}
          color="purple"
        />
        <MetricCard
          label="Workouts"
          value={metrics?.overview?.workouts?.countInWindow?.toLocaleString() || 0}
          subtext={`${timeWindow} window`}
          color="blue"
        />
        <MetricCard
          label="WS Connections"
          value={
            (metrics?.connections?.communityConnections || 0) +
            (metrics?.connections?.monitorConnections || 0)
          }
          subtext="Active sockets"
          color="orange"
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConnectionStatus connections={metrics?.connections} />
        <EventTypeBreakdown eventCounts={metrics?.eventCounts} />
      </div>

      {/* Recent Events */}
      <RecentEventsLog events={events} onUserClick={setSelectedUser} />

      {/* User Drilldown Modal */}
      <UserDrilldown
        userId={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
