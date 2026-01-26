import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Star,
  Award,
  Users,
  MessageCircle,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface MentorData {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  title?: string;
  specializations: string[];
  rating: number;
  totalReviews: number;
  menteesCount: number;
  yearsExperience: number;
  availability: 'available' | 'limited' | 'unavailable';
  responseTime?: string;
  certifications?: string[];
  bio?: string;
  hourlyRate?: number;
}

interface MentorCardProps {
  mentor: MentorData;
  onConnect?: (mentorId: string) => void;
  onMessage?: (mentorId: string) => void;
  onViewProfile?: (mentorId: string) => void;
  compact?: boolean;
}

export function MentorCard({
  mentor,
  onConnect,
  onMessage,
  onViewProfile,
  compact = false,
}: MentorCardProps) {
  const {
    id,
    name,
    avatarUrl,
    title,
    specializations,
    rating,
    totalReviews,
    menteesCount,
    yearsExperience,
    availability,
    responseTime,
    certifications,
    bio,
    hourlyRate,
  } = mentor;

  const getAvailabilityStyle = () => {
    switch (availability) {
      case 'available':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'limited':
        return 'bg-amber-500/20 text-amber-400';
      case 'unavailable':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const getAvailabilityLabel = () => {
    switch (availability) {
      case 'available':
        return 'Available';
      case 'limited':
        return 'Limited Slots';
      case 'unavailable':
        return 'Unavailable';
    }
  };

  if (compact) {
    return (
      <SafeMotion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onViewProfile?.(id)}
        className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 cursor-pointer hover:bg-gray-800 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">
            {specializations.slice(0, 2).join(' • ')}
          </p>
        </div>

        <div className="flex items-center gap-1 text-amber-400">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        </div>
      </SafeMotion.div>
    );
  }

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 overflow-hidden"
    >
      {/* Header with avatar and basic info */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gray-700 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                {name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white text-lg">{name}</h3>
                {title && <p className="text-sm text-gray-400">{title}</p>}
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getAvailabilityStyle()}`}>
                {getAvailabilityLabel()}
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({totalReviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="mt-4 text-sm text-gray-400 line-clamp-2">{bio}</p>
        )}

        {/* Specializations */}
        <div className="flex flex-wrap gap-2 mt-4">
          {specializations.slice(0, 4).map((spec, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded"
            >
              {spec}
            </span>
          ))}
          {specializations.length > 4 && (
            <span className="px-2 py-1 text-xs text-gray-500">
              +{specializations.length - 4} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Users className="w-3 h-3" />
            </div>
            <p className="text-lg font-semibold text-white">{menteesCount}</p>
            <p className="text-xs text-gray-500">Mentees</p>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Calendar className="w-3 h-3" />
            </div>
            <p className="text-lg font-semibold text-white">{yearsExperience}+</p>
            <p className="text-xs text-gray-500">Years Exp</p>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Clock className="w-3 h-3" />
            </div>
            <p className="text-lg font-semibold text-white">{responseTime || '< 24h'}</p>
            <p className="text-xs text-gray-500">Response</p>
          </div>
        </div>

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-gray-400">Certifications</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {certifications.slice(0, 3).map((cert, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/10 text-amber-400 rounded"
                >
                  <CheckCircle className="w-3 h-3" />
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hourly rate */}
        {hourlyRate !== undefined && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Hourly Rate</span>
              <span className="text-lg font-bold text-white">
                ${hourlyRate}
                <span className="text-sm text-gray-500">/hr</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-700/50">
        {onMessage && (
          <button
            onClick={() => onMessage(id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Message</span>
          </button>
        )}
        {onConnect && availability !== 'unavailable' && (
          <button
            onClick={() => onConnect(id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Connect</span>
          </button>
        )}
      </div>
    </SafeMotion.div>
  );
}
