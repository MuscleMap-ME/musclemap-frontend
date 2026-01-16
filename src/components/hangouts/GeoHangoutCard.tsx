/**
 * GeoHangoutCard - Displays a geo-based hangout with members and distance
 *
 * Shows hangout info, member count, distance tier, and active challenges.
 */

import { motion } from 'framer-motion';
import {
  MapPin,
  Users,
  Trophy,
  Calendar,
  ChevronRight,
  Navigation,
  Flame,
  Sparkles,
} from 'lucide-react';

// Distance tier configuration
const DISTANCE_TIERS = {
  neighbor: {
    label: 'Neighbor',
    color: '#22C55E',
    icon: MapPin,
    maxMiles: 5,
    description: 'Less than 5 miles away',
  },
  local: {
    label: 'Local',
    color: '#3B82F6',
    icon: Navigation,
    maxMiles: 15,
    description: '5-15 miles away',
  },
  regional: {
    label: 'Regional',
    color: '#A855F7',
    icon: Navigation,
    maxMiles: 50,
    description: '15-50 miles away',
  },
  extended: {
    label: 'Extended',
    color: '#F59E0B',
    icon: Navigation,
    maxMiles: Infinity,
    description: '50+ miles away',
  },
};

function formatDistance(miles) {
  if (miles < 1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

export function GeoHangoutCard({
  hangout,
  distance,
  memberCount = 0,
  activeChallenges = 0,
  upcomingEvents = 0,
  isActive = false,
  onClick,
  className = '',
}) {
  // Determine distance tier
  let tier = DISTANCE_TIERS.extended;
  if (distance < 5) tier = DISTANCE_TIERS.neighbor;
  else if (distance < 15) tier = DISTANCE_TIERS.local;
  else if (distance < 50) tier = DISTANCE_TIERS.regional;

  const TierIcon = tier.icon;

  return (
    <motion.button
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border text-left transition-all
        ${isActive
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/10'
          : 'border-gray-700/50 bg-gray-900/50 hover:border-gray-600'
        }
        ${className}
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between">
        {/* Main content */}
        <div className="flex items-start gap-3">
          {/* Location icon with tier color */}
          <div
            className="p-3 rounded-xl shrink-0"
            style={{ backgroundColor: `${tier.color}20` }}
          >
            <MapPin className="w-5 h-5" style={{ color: tier.color }} />
          </div>

          <div>
            {/* Hangout name */}
            <div className="font-semibold text-white">
              {hangout?.name || 'Your Local Hangout'}
            </div>

            {/* Location info */}
            <div className="flex items-center gap-2 mt-1">
              <TierIcon className="w-3 h-3" style={{ color: tier.color }} />
              <span className="text-sm" style={{ color: tier.color }}>
                {tier.label}
              </span>
              {distance !== undefined && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-sm text-white/50">
                    {formatDistance(distance)}
                  </span>
                </>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2">
              {/* Members */}
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-white/40" />
                <span className="text-sm text-white/60">
                  {memberCount} members
                </span>
              </div>

              {/* Active challenges */}
              {activeChallenges > 0 && (
                <div className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm text-amber-400">
                    {activeChallenges} challenges
                  </span>
                </div>
              )}

              {/* Upcoming events */}
              {upcomingEvents > 0 && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm text-blue-400">
                    {upcomingEvents} events
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Active indicator */}
          {isActive && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="w-5 h-5 text-amber-400" />
            </motion.div>
          )}

          <ChevronRight className="w-5 h-5 text-white/30" />
        </div>
      </div>

      {/* Active hangout bonus indicator */}
      {isActive && (
        <motion.div
          className="mt-3 pt-3 border-t border-amber-400/20 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-300">
            Your home base - {tier.label.toLowerCase()} bonuses active!
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}

export default GeoHangoutCard;
