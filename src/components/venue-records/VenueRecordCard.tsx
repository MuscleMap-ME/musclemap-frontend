/**
 * VenueRecordCard - Display a Single Venue Record
 *
 * Shows:
 * - Record holder info with avatar
 * - Record value and type
 * - Verification status
 * - Venue and exercise info
 * - Time since achieved
 */

import React from 'react';
import { Trophy, Medal, Award, MapPin, Clock, Shield, Video, Users, ChevronRight } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface VenueRecordCardProps {
  record: {
    id: string;
    venueId: string;
    venueName: string;
    exerciseId: string;
    exerciseName: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    recordType: 'MAX_WEIGHT' | 'MAX_REPS' | 'FASTEST_TIME' | 'MAX_DISTANCE' | 'MAX_1RM';
    recordValue: number;
    recordUnit: string;
    rank: number;
    verificationStatus: 'UNVERIFIED' | 'SELF_VERIFIED' | 'WITNESS_VERIFIED' | 'VIDEO_VERIFIED' | 'PENDING_VERIFICATION';
    achievedAt: string;
    repsAtWeight?: number;
    weightAtReps?: number;
  };
  isCurrentUser?: boolean;
  showVenue?: boolean;
  showExercise?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const VERIFICATION_CONFIG = {
  UNVERIFIED: {
    icon: null,
    label: 'Unverified',
    color: 'text-white/40',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
  SELF_VERIFIED: {
    icon: Shield,
    label: 'Self-Verified',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  WITNESS_VERIFIED: {
    icon: Users,
    label: 'Witness Verified',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  VIDEO_VERIFIED: {
    icon: Video,
    label: 'Video Verified',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  PENDING_VERIFICATION: {
    icon: Clock,
    label: 'Pending Verification',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

const RANK_CONFIG = [
  { icon: Trophy, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-400/20 to-yellow-600/20', glow: 'shadow-amber-500/20' },
  { icon: Medal, color: 'text-gray-300', bg: 'bg-gradient-to-br from-gray-300/20 to-gray-500/20', glow: 'shadow-gray-400/20' },
  { icon: Award, color: 'text-orange-400', bg: 'bg-gradient-to-br from-orange-400/20 to-orange-600/20', glow: 'shadow-orange-500/20' },
];

const RECORD_TYPE_LABELS: Record<string, string> = {
  MAX_WEIGHT: 'Max Weight',
  MAX_REPS: 'Max Reps',
  FASTEST_TIME: 'Fastest Time',
  MAX_DISTANCE: 'Max Distance',
  MAX_1RM: 'Estimated 1RM',
};

// ============================================
// COMPONENT
// ============================================

export function VenueRecordCard({
  record,
  isCurrentUser = false,
  showVenue = true,
  showExercise = true,
  compact = false,
  onClick,
  className = '',
}: VenueRecordCardProps) {
  const verificationConfig = VERIFICATION_CONFIG[record.verificationStatus];
  const VerificationIcon = verificationConfig.icon;
  const rankConfig = record.rank <= 3 ? RANK_CONFIG[record.rank - 1] : null;

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
        return `${value.toFixed(1)} kg`;
      default:
        return `${value.toFixed(1)} ${unit}`;
    }
  };

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  // Compact view
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          flex items-center gap-3 p-3 rounded-xl
          bg-white/5 border border-white/10
          hover:bg-white/10 transition-colors
          ${onClick ? 'cursor-pointer' : ''}
          ${isCurrentUser ? 'ring-1 ring-violet-500/50' : ''}
          ${className}
        `}
      >
        {/* Rank Badge */}
        {rankConfig ? (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rankConfig.bg}`}>
            <rankConfig.icon className={`w-4 h-4 ${rankConfig.color}`} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <span className="text-white/60 text-sm font-bold">#{record.rank}</span>
          </div>
        )}

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium truncate ${isCurrentUser ? 'text-violet-400' : 'text-white'}`}>
            {record.username}
            {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
          </div>
          {showExercise && (
            <div className="text-white/60 text-xs truncate">{record.exerciseName}</div>
          )}
        </div>

        {/* Value */}
        <div className="text-right">
          <div className="text-white font-bold">{formatValue(record.recordValue, record.recordUnit)}</div>
          <div className="text-white/40 text-xs">{formatTimeAgo(record.achievedAt)}</div>
        </div>

        {onClick && <ChevronRight className="w-4 h-4 text-white/40" />}
      </div>
    );
  }

  // Full card view
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/5 border ${verificationConfig.border}
        hover:bg-white/10 transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${isCurrentUser ? 'ring-2 ring-violet-500/50' : ''}
        ${rankConfig ? `shadow-lg ${rankConfig.glow}` : ''}
        ${className}
      `}
    >
      {/* Rank Badge (Top Right) */}
      {rankConfig && (
        <div className="absolute top-3 right-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rankConfig.bg}`}>
            <rankConfig.icon className={`w-5 h-5 ${rankConfig.color}`} />
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: User Info */}
        <div className="flex items-center gap-3 mb-4">
          {record.avatarUrl ? (
            <img
              src={record.avatarUrl}
              alt={record.username}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-white text-lg font-bold">
                {record.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-lg ${isCurrentUser ? 'text-violet-400' : 'text-white'}`}>
              {record.username}
              {isCurrentUser && (
                <span className="ml-2 text-sm font-normal text-violet-400">(You)</span>
              )}
            </div>
            {!rankConfig && (
              <div className="text-white/60 text-sm">Rank #{record.rank}</div>
            )}
          </div>
        </div>

        {/* Record Value (Hero) */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white">
            {formatValue(record.recordValue, record.recordUnit)}
          </div>
          <div className="text-white/60 text-sm">{RECORD_TYPE_LABELS[record.recordType]}</div>
          {record.repsAtWeight && (
            <div className="text-white/40 text-xs mt-1">@ {record.repsAtWeight} reps</div>
          )}
          {record.weightAtReps && (
            <div className="text-white/40 text-xs mt-1">@ {record.weightAtReps} kg</div>
          )}
        </div>

        {/* Verification Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${verificationConfig.bg}`}>
            {VerificationIcon && (
              <VerificationIcon className={`w-4 h-4 ${verificationConfig.color}`} />
            )}
            <span className={`text-sm ${verificationConfig.color}`}>
              {verificationConfig.label}
            </span>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 text-sm text-white/60">
          {showExercise && (
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>{record.exerciseName}</span>
            </div>
          )}
          {showVenue && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{record.venueName}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTimeAgo(record.achievedAt)}</span>
          </div>
        </div>
      </div>

      {/* Click Indicator */}
      {onClick && (
        <div className="absolute bottom-3 right-3">
          <ChevronRight className="w-5 h-5 text-white/40" />
        </div>
      )}
    </div>
  );
}

export default VenueRecordCard;
