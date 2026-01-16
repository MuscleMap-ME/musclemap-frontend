import React from 'react';

export interface Activity {
  /** Activity ID */
  id: string;
  /** User who performed the action */
  user: string;
  /** User avatar (initials or URL) */
  avatar?: string;
  /** Action verb (completed, set PR, joined, etc.) */
  action: string;
  /** Target of the action */
  target: string;
  /** Time ago string */
  time: string;
  /** Optional icon/emoji */
  icon?: string;
}

export interface ActivityFeedProps {
  /** Array of activities */
  activities: Activity[];
  /** Optional title */
  title?: string;
  /** Optional callback when activity is clicked */
  onActivityClick?: (activity: Activity) => void;
  /** Maximum items to show (default: all) */
  maxItems?: number;
  /** Optional className */
  className?: string;
}

/**
 * ActivityFeed - Social activity stream with user actions
 *
 * @example
 * <ActivityFeed
 *   activities={[
 *     { id: '1', user: 'Alex', action: 'completed', target: 'Push Day A', time: '2m ago', icon: '✅' },
 *     { id: '2', user: 'Sarah', action: 'set PR', target: 'Bench Press 185×8', time: '15m ago', icon: '🏆' },
 *   ]}
 * />
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title,
  onActivityClick,
  maxItems,
  className = '',
}) => {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities;

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-slate-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h3 className="font-semibold text-white mb-4">{title}</h3>
      )}

      {displayActivities.map((activity) => (
        <div
          key={activity.id}
          className={`flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-all ${
            onActivityClick ? 'cursor-pointer' : ''
          }`}
          onClick={() => onActivityClick?.(activity)}
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-white flex-shrink-0">
            {activity.avatar || activity.user[0].toUpperCase()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold text-white">{activity.user}</span>
              <span className="text-slate-400"> {activity.action} </span>
              <span className="text-teal-400">{activity.target}</span>
            </p>
            <p className="text-xs text-slate-500">{activity.time}</p>
          </div>

          {/* Icon */}
          {activity.icon && (
            <span className="text-xl flex-shrink-0">{activity.icon}</span>
          )}
        </div>
      ))}

      {maxItems && activities.length > maxItems && (
        <button className="w-full text-center text-sm text-slate-400 hover:text-white py-2 transition-colors">
          View all {activities.length} activities →
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
