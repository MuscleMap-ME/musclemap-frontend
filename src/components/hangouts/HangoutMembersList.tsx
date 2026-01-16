/**
 * HangoutMembersList - Shows members of a geo hangout sorted by distance
 *
 * Displays members with their distance tier, wealth tier, and activity status.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MapPin,
  Crown,
  Star,
  Gem,
  Award,
  Clock,
  MessageCircle,
  UserPlus,
  Search,
} from 'lucide-react';

// Distance tier colors
const DISTANCE_COLORS = {
  neighbor: '#22C55E',
  local: '#3B82F6',
  regional: '#A855F7',
  extended: '#F59E0B',
};

// Wealth tier icons
const WEALTH_ICONS = {
  0: null,
  1: Award,
  2: Award,
  3: Crown,
  4: Crown,
  5: Gem,
  6: Star,
};

const WEALTH_COLORS = {
  0: '#6B7280',
  1: '#CD7F32',
  2: '#C0C0C0',
  3: '#FFD700',
  4: '#E5E4E2',
  5: '#B9F2FF',
  6: '#0D0D0D',
};

function formatDistance(miles) {
  if (miles < 1) return `${Math.round(miles * 5280)} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function formatLastActive(date) {
  if (!date) return 'Unknown';
  const now = new Date();
  const then = new Date(date);
  const hours = Math.floor((now - then) / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
  return 'Week+ ago';
}

function MemberCard({ member, onMessage, onViewProfile }) {
  const distanceColor = DISTANCE_COLORS[member.distanceTier] || DISTANCE_COLORS.extended;
  const WealthIcon = WEALTH_ICONS[member.wealthTier] || null;
  const wealthColor = WEALTH_COLORS[member.wealthTier] || WEALTH_COLORS[0];
  const isOnline = member.lastActiveAt && (Date.now() - new Date(member.lastActiveAt).getTime()) < 15 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center overflow-hidden"
          style={member.wealthTier >= 3 ? {
            boxShadow: `0 0 12px ${wealthColor}40`,
            border: `2px solid ${wealthColor}60`,
          } : undefined}
        >
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-white/60">
              {member.displayName?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Online indicator */}
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
        )}

        {/* Wealth tier badge */}
        {WealthIcon && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: wealthColor }}
          >
            <WealthIcon className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {member.displayName || member.username}
          </span>
          {member.isTrainer && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
              Trainer
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-0.5">
          {/* Distance */}
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" style={{ color: distanceColor }} />
            <span className="text-xs" style={{ color: distanceColor }}>
              {formatDistance(member.distance)}
            </span>
          </div>

          {/* Last active */}
          <div className="flex items-center gap-1 text-white/40">
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {formatLastActive(member.lastActiveAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onMessage?.(member)}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-white/40 hover:text-white transition-colors"
          title="Send message"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewProfile?.(member)}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-white/40 hover:text-white transition-colors"
          title="View profile"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function HangoutMembersList({
  members = [],
  totalCount = 0,
  onLoadMore,
  onMessage,
  onViewProfile,
  loading = false,
  className = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('all');

  // Filter and search members
  const filteredMembers = useMemo(() => {
    let result = members;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.displayName?.toLowerCase().includes(query) ||
        m.username?.toLowerCase().includes(query)
      );
    }

    // Filter by distance tier
    if (filterTier !== 'all') {
      result = result.filter(m => m.distanceTier === filterTier);
    }

    return result;
  }, [members, searchQuery, filterTier]);

  // Group by distance tier for display
  const groupedMembers = useMemo(() => {
    const groups = {
      neighbor: [],
      local: [],
      regional: [],
      extended: [],
    };

    filteredMembers.forEach(member => {
      const tier = member.distanceTier || 'extended';
      if (groups[tier]) {
        groups[tier].push(member);
      }
    });

    return groups;
  }, [filteredMembers]);

  return (
    <div className={`bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Hangout Members</h3>
          </div>
          <span className="text-sm text-white/50">
            {totalCount} total
          </span>
        </div>

        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400/50"
          >
            <option value="all">All distances</option>
            <option value="neighbor">Neighbors (&lt;5mi)</option>
            <option value="local">Local (5-15mi)</option>
            <option value="regional">Regional (15-50mi)</option>
            <option value="extended">Extended (50+mi)</option>
          </select>
        </div>
      </div>

      {/* Members list */}
      <div className="p-3 space-y-4 max-h-[500px] overflow-y-auto">
        {Object.entries(groupedMembers).map(([tier, tierMembers]) => {
          if (tierMembers.length === 0) return null;

          return (
            <div key={tier}>
              {/* Tier header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: DISTANCE_COLORS[tier] }}
                />
                <span
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: DISTANCE_COLORS[tier] }}
                >
                  {tier} ({tierMembers.length})
                </span>
              </div>

              {/* Members */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {tierMembers.map(member => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      onMessage={onMessage}
                      onViewProfile={onViewProfile}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-white/50">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No members found</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try a different search term</p>
            )}
          </div>
        )}
      </div>

      {/* Load more */}
      {totalCount > members.length && (
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full py-2 text-sm text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load more (${totalCount - members.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}

export default HangoutMembersList;
