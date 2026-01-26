import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
} from 'lucide-react';

interface TeamMemberReadiness {
  id: string;
  name: string;
  avatarUrl?: string;
  readinessScore: number;
  trend: 'up' | 'down' | 'stable';
  lastWorkout?: string;
  fatigueLevel: 'low' | 'moderate' | 'high' | 'critical';
  status: 'ready' | 'recovering' | 'resting' | 'injured';
}

interface TeamReadinessBoardProps {
  members: TeamMemberReadiness[];
  teamAverageReadiness: number;
  onMemberClick?: (memberId: string) => void;
}

export function TeamReadinessBoard({
  members,
  teamAverageReadiness,
  onMemberClick,
}: TeamReadinessBoardProps) {
  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getTrendIcon = (trend: TeamMemberReadiness['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-emerald-400" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-400" />;
      default:
        return <Minus className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TeamMemberReadiness['status']) => {
    const styles = {
      ready: 'bg-emerald-500/20 text-emerald-400',
      recovering: 'bg-blue-500/20 text-blue-400',
      resting: 'bg-amber-500/20 text-amber-400',
      injured: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const readyCount = members.filter((m) => m.status === 'ready').length;
  const atRiskCount = members.filter(
    (m) => m.readinessScore < 60 || m.fatigueLevel === 'high' || m.fatigueLevel === 'critical'
  ).length;

  return (
    <div className="space-y-4">
      {/* Team Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-gray-800/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <p
            className={`text-2xl font-bold ${
              teamAverageReadiness >= 70
                ? 'text-emerald-400'
                : teamAverageReadiness >= 50
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            {teamAverageReadiness}%
          </p>
          <p className="text-xs text-gray-500">Team Readiness</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{readyCount}</p>
          <p className="text-xs text-gray-500">Ready to Train</p>
        </div>

        <div className="p-4 bg-gray-800/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{atRiskCount}</p>
          <p className="text-xs text-gray-500">Need Attention</p>
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-gray-400">Team Members ({members.length})</span>
          <span className="text-xs text-gray-500">Sorted by readiness</span>
        </div>

        {members
          .sort((a, b) => b.readinessScore - a.readinessScore)
          .map((member, index) => (
            <SafeMotion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onMemberClick?.(member.id)}
              className={`flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 ${
                onMemberClick ? 'cursor-pointer hover:bg-gray-800' : ''
              } transition-colors`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Name and status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">{member.name}</p>
                  {getStatusBadge(member.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {member.lastWorkout && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last: {new Date(member.lastWorkout).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Readiness score */}
              <div className="flex items-center gap-2">
                {getTrendIcon(member.trend)}
                <div
                  className={`px-3 py-1.5 rounded-lg font-semibold ${getReadinessColor(
                    member.readinessScore
                  )}`}
                >
                  {member.readinessScore}%
                </div>
              </div>
            </SafeMotion.div>
          ))}
      </div>
    </div>
  );
}
