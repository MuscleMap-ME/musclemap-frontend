/**
 * VenueLeaderboardTable - Sortable Venue Leaderboard
 *
 * Displays a table showing:
 * - Top performers at a venue
 * - Sortable columns (rank, value, date)
 * - Verification status badges
 * - Interactive row highlighting
 */

import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Award, Shield, Video, Users, Clock, ChevronUp, ChevronDown } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  value: number;
  unit: string;
  achievedAt: string;
  verificationStatus: 'UNVERIFIED' | 'SELF_VERIFIED' | 'WITNESS_VERIFIED' | 'VIDEO_VERIFIED' | 'PENDING_VERIFICATION';
  isCurrentUser?: boolean;
}

export interface VenueLeaderboardTableProps {
  entries: LeaderboardEntry[];
  exerciseName: string;
  recordType: string;
  myRank?: number;
  totalParticipants?: number;
  onRowClick?: (entry: LeaderboardEntry) => void;
  className?: string;
  maxRows?: number;
  showPagination?: boolean;
}

type SortKey = 'rank' | 'value' | 'achievedAt';
type SortDirection = 'asc' | 'desc';

// ============================================
// CONSTANTS
// ============================================

const VERIFICATION_CONFIG = {
  UNVERIFIED: {
    icon: null,
    label: 'Unverified',
    color: 'text-white/40',
    bg: 'bg-white/5',
  },
  SELF_VERIFIED: {
    icon: Shield,
    label: 'Self-Verified',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  WITNESS_VERIFIED: {
    icon: Users,
    label: 'Witness Verified',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  VIDEO_VERIFIED: {
    icon: Video,
    label: 'Video Verified',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  PENDING_VERIFICATION: {
    icon: Clock,
    label: 'Pending',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
};

const RANK_ICONS = [
  { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { icon: Medal, color: 'text-gray-300', bg: 'bg-gray-500/20' },
  { icon: Award, color: 'text-orange-400', bg: 'bg-orange-500/20' },
];

// ============================================
// COMPONENT
// ============================================

export function VenueLeaderboardTable({
  entries,
  exerciseName,
  recordType,
  myRank,
  totalParticipants,
  onRowClick,
  className = '',
  maxRows = 10,
  showPagination = true,
}: VenueLeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(0);

  // Format record type for display
  const formattedRecordType = useMemo(() => {
    return recordType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, [recordType]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'value':
          comparison = b.value - a.value;
          break;
        case 'achievedAt':
          comparison = new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [entries, sortKey, sortDirection]);

  // Paginate
  const paginatedEntries = useMemo(() => {
    const start = currentPage * maxRows;
    return sortedEntries.slice(start, start + maxRows);
  }, [sortedEntries, currentPage, maxRows]);

  const totalPages = Math.ceil(entries.length / maxRows);

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'rank' ? 'asc' : 'desc');
    }
  };

  // Format value based on unit
  const formatValue = (value: number, unit: string) => {
    switch (unit.toLowerCase()) {
      case 'kg':
      case 'lbs':
        return `${value.toFixed(1)} ${unit}`;
      case 'reps':
        return `${Math.floor(value)} reps`;
      case 'seconds':
        if (value >= 60) {
          const mins = Math.floor(value / 60);
          const secs = Math.floor(value % 60);
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return `${value.toFixed(1)}s`;
      case 'meters':
        if (value >= 1000) {
          return `${(value / 1000).toFixed(2)} km`;
        }
        return `${value.toFixed(1)} m`;
      case '1rm_kg':
        return `${value.toFixed(1)} kg (1RM)`;
      default:
        return `${value.toFixed(1)} ${unit}`;
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return date.toLocaleDateString();
  };

  // Sort header component
  const SortHeader = ({ sortKeyName, label }: { sortKeyName: SortKey; label: string }) => {
    const isActive = sortKey === sortKeyName;
    return (
      <button
        onClick={() => handleSort(sortKeyName)}
        className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
          isActive ? 'text-violet-400' : 'text-white/60 hover:text-white/80'
        }`}
      >
        {label}
        {isActive && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </button>
    );
  };

  return (
    <div className={`bg-white/5 rounded-xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
        <div>
          <h3 className="text-white font-medium">{exerciseName}</h3>
          <p className="text-white/60 text-sm">{formattedRecordType} Leaderboard</p>
        </div>
        {totalParticipants !== undefined && (
          <div className="text-right">
            <div className="text-white/60 text-xs">Total Participants</div>
            <div className="text-white font-bold">{totalParticipants.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* My Rank Banner (if not in visible entries) */}
      {myRank !== undefined && myRank > maxRows && (
        <div className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20 flex items-center justify-between">
          <span className="text-violet-400 text-sm">Your Position</span>
          <span className="text-white font-bold">#{myRank}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left">
                <SortHeader sortKeyName="rank" label="Rank" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Athlete
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader sortKeyName="value" label="Record" />
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Status
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader sortKeyName="achievedAt" label="Date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedEntries.map((entry) => {
              const rankConfig = entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : null;
              const verificationConfig = VERIFICATION_CONFIG[entry.verificationStatus];
              const VerificationIcon = verificationConfig.icon;

              return (
                <tr
                  key={entry.userId}
                  onClick={() => onRowClick?.(entry)}
                  className={`
                    border-b border-white/5 transition-colors cursor-pointer
                    ${entry.isCurrentUser ? 'bg-violet-500/10' : 'hover:bg-white/5'}
                  `}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    {rankConfig ? (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${rankConfig.bg}`}
                      >
                        <rankConfig.icon className={`w-4 h-4 ${rankConfig.color}`} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
                        <span className="text-white/60 text-sm font-medium">
                          {entry.rank}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Athlete */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className={`font-medium ${entry.isCurrentUser ? 'text-violet-400' : 'text-white'}`}>
                          {entry.username}
                          {entry.isCurrentUser && (
                            <span className="ml-2 text-xs text-violet-400">(You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Record Value */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-bold text-lg">
                      {formatValue(entry.value, entry.unit)}
                    </span>
                  </td>

                  {/* Verification Status */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <div
                        className={`px-2 py-1 rounded-full flex items-center gap-1 ${verificationConfig.bg}`}
                      >
                        {VerificationIcon && (
                          <VerificationIcon className={`w-3 h-3 ${verificationConfig.color}`} />
                        )}
                        <span className={`text-xs ${verificationConfig.color}`}>
                          {verificationConfig.label}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-white/60 text-sm">
                      {formatDate(entry.achievedAt)}
                    </span>
                  </td>
                </tr>
              );
            })}

            {paginatedEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  No records yet. Be the first!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-white/60 text-sm">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-1 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default VenueLeaderboardTable;
