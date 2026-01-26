import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Trophy,
  Shield,
  ChevronRight,
  MapPin,
  Calendar,
  Star,
  CheckCircle,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  type: 'gym' | 'team' | 'military' | 'school' | 'company' | 'other';
  logoUrl?: string;
  memberCount: number;
  location?: string;
  isVerified: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  stats?: {
    activeWorkouts: number;
    weeklyVolume: number;
    avgAttendance: number;
  };
  role?: 'owner' | 'admin' | 'coach' | 'member';
  joinedAt?: string;
}

interface OrganizationCardProps {
  organization: Organization;
  showStats?: boolean;
  onJoin?: () => void;
  isJoined?: boolean;
}

export function OrganizationCard({
  organization,
  showStats = false,
  onJoin,
  isJoined = false,
}: OrganizationCardProps) {
  const {
    id,
    name,
    type,
    logoUrl,
    memberCount,
    location,
    isVerified,
    tier,
    stats,
    role,
    joinedAt,
  } = organization;

  const getTypeIcon = () => {
    switch (type) {
      case 'gym':
        return <Building2 className="w-5 h-5" />;
      case 'team':
        return <Users className="w-5 h-5" />;
      case 'military':
        return <Shield className="w-5 h-5" />;
      case 'school':
        return <Trophy className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const getTypeLabel = () => {
    const labels = {
      gym: 'Gym',
      team: 'Team',
      military: 'Military Unit',
      school: 'School/University',
      company: 'Company',
      other: 'Organization',
    };
    return labels[type];
  };

  const getTierBadge = () => {
    const styles = {
      free: 'bg-gray-500/20 text-gray-400',
      pro: 'bg-purple-500/20 text-purple-400',
      enterprise: 'bg-amber-500/20 text-amber-400',
    };
    const labels = {
      free: 'Free',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[tier]}`}>
        {labels[tier]}
      </span>
    );
  };

  const getRoleBadge = () => {
    if (!role) return null;
    const styles = {
      owner: 'bg-amber-500/20 text-amber-400',
      admin: 'bg-purple-500/20 text-purple-400',
      coach: 'bg-blue-500/20 text-blue-400',
      member: 'bg-gray-500/20 text-gray-400',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${styles[role]}`}>
        {role}
      </span>
    );
  };

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600 transition-colors"
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-purple-400">{getTypeIcon()}</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-white truncate">{name}</h4>
              {isVerified && (
                <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs text-gray-500">{getTypeLabel()}</span>
              {getTierBadge()}
              {getRoleBadge()}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {memberCount.toLocaleString()} members
              </div>
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {showStats && stats && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-700/50">
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{stats.activeWorkouts}</p>
              <p className="text-xs text-gray-500">This Week</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">
                {(stats.weeklyVolume / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-gray-500">Volume (lbs)</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{stats.avgAttendance}%</p>
              <p className="text-xs text-gray-500">Attendance</p>
            </div>
          </div>
        )}

        {/* Join date or action */}
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          {isJoined || role ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {joinedAt
                  ? `Joined ${new Date(joinedAt).toLocaleDateString()}`
                  : 'Member'}
              </div>
              <Link
                to={`/organization/${id}`}
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
              >
                View Dashboard
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : onJoin ? (
            <button
              onClick={onJoin}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Request to Join
            </button>
          ) : (
            <Link
              to={`/organization/${id}`}
              className="flex items-center justify-center gap-1 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              View Details
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </SafeMotion.div>
  );
}
