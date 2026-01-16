/**
 * LiveActivityFeed Component
 *
 * Scrolling feed of anonymous activity events.
 * Shows workout completions without any user identification.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Dumbbell, Trophy, MapPin, Clock } from 'lucide-react';

const EVENT_CONFIG = {
  'workout.completed': {
    icon: Dumbbell,
    color: 'blue',
    label: 'Workout completed',
  },
  'exercise.completed': {
    icon: Activity,
    color: 'violet',
    label: 'Exercise completed',
  },
  'achievement.earned': {
    icon: Trophy,
    color: 'amber',
    label: 'Achievement earned',
  },
};

function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return then.toLocaleDateString();
}

function ActivityItem({ event, isNew = false }) {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG['workout.completed'];
  const Icon = config.icon;

  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  const location = event.city && event.country
    ? `${event.city}, ${event.country}`
    : event.country || null;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
        isNew ? 'bg-white/10 animate-pulse' : 'bg-white/5'
      }`}
    >
      <div className={`p-2 rounded-lg ${colorClasses[config.color]} border`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80">
          {event.muscleGroup ? (
            <>
              <span className="capitalize">{event.muscleGroup}</span> workout
            </>
          ) : (
            config.label
          )}
        </p>
        {location && (
          <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {location}
          </p>
        )}
      </div>
      <span className="text-xs text-white/30 flex items-center gap-1 flex-shrink-0">
        <Clock className="w-3 h-3" />
        {formatRelativeTime(event.timestamp)}
      </span>
    </div>
  );
}

function LiveActivityFeed({ feed = [], className = '' }) {
  const containerRef = useRef(null);
  const [newEventIds, setNewEventIds] = useState(new Set());
  const prevFeedRef = useRef([]);

  // Track new events for animation
  useEffect(() => {
    const prevIds = new Set(prevFeedRef.current.map((e) => e.id));
    const newIds = feed.filter((e) => !prevIds.has(e.id)).map((e) => e.id);

    if (newIds.length > 0) {
      setNewEventIds(new Set(newIds));
      // Clear "new" status after animation
      setTimeout(() => {
        setNewEventIds(new Set());
      }, 2000);
    }

    prevFeedRef.current = feed;
  }, [feed]);

  // Group events by time
  const groupedEvents = React.useMemo(() => {
    const groups = [];
    let currentGroup = null;

    for (const event of feed) {
      const time = new Date(event.timestamp);
      const now = new Date();
      const diffMin = Math.floor((now - time) / 60000);

      let groupLabel;
      if (diffMin < 1) groupLabel = 'Just now';
      else if (diffMin < 5) groupLabel = 'A few minutes ago';
      else if (diffMin < 15) groupLabel = 'In the last 15 minutes';
      else if (diffMin < 60) groupLabel = 'In the last hour';
      else groupLabel = 'Earlier';

      if (!currentGroup || currentGroup.label !== groupLabel) {
        currentGroup = { label: groupLabel, events: [] };
        groups.push(currentGroup);
      }
      currentGroup.events.push(event);
    }

    return groups;
  }, [feed]);

  return (
    <div className={`bg-black/20 rounded-xl border border-white/5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white/80">Live Activity</span>
        </div>
        <span className="text-xs text-white/40">{feed.length} events</span>
      </div>

      {/* Feed */}
      <div ref={containerRef} className="p-4 max-h-[500px] overflow-y-auto space-y-4">
        {groupedEvents.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No recent activity</p>
            <p className="text-xs text-white/30 mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          groupedEvents.map((group, _groupIndex) => (
            <div key={group.label}>
              <h4 className="text-xs text-white/40 mb-2 sticky top-0 bg-[#0a0a0f] py-1">
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.events.map((event) => (
                  <ActivityItem
                    key={event.id}
                    event={event}
                    isNew={newEventIds.has(event.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Privacy footer */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/10">
        <p className="text-xs text-white/30 text-center">
          Anonymous activity only - no personal data displayed
        </p>
      </div>
    </div>
  );
}

export default LiveActivityFeed;
