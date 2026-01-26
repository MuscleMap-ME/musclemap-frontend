import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Target,
  CheckCircle,
  Clock,
  MessageCircle,
  Calendar,
  TrendingUp,
  Award,
  Star,
  ChevronRight,
} from 'lucide-react';

interface MentorshipSession {
  id: string;
  date: string;
  duration: number;
  notes?: string;
  rating?: number;
  completed: boolean;
}

interface MentorshipGoal {
  id: string;
  title: string;
  progress: number;
  target: string;
  deadline?: string;
  completed: boolean;
}

interface MentorshipData {
  id: string;
  mentor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  startDate: string;
  totalSessions: number;
  completedSessions: number;
  nextSession?: string;
  goals: MentorshipGoal[];
  recentSessions: MentorshipSession[];
  overallProgress: number;
  streakWeeks: number;
}

interface MentorshipProgressProps {
  data: MentorshipData;
  onScheduleSession?: () => void;
  onMessageMentor?: () => void;
  onViewGoals?: () => void;
}

export function MentorshipProgress({
  data,
  onScheduleSession,
  onMessageMentor,
  onViewGoals,
}: MentorshipProgressProps) {
  const {
    mentor,
    startDate,
    totalSessions,
    completedSessions,
    nextSession,
    goals,
    recentSessions,
    overallProgress,
    streakWeeks,
  } = data;

  const daysActive = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      {/* Mentor Header */}
      <SafeMotion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-700 overflow-hidden">
            {mentor.avatarUrl ? (
              <img src={mentor.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                {mentor.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-purple-300">Your Mentor</p>
            <h3 className="text-lg font-semibold text-white">{mentor.name}</h3>
            <p className="text-xs text-gray-400">{daysActive} days together</p>
          </div>

          <div className="flex gap-2">
            {onMessageMentor && (
              <button
                onClick={onMessageMentor}
                className="p-2 bg-gray-800/50 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
            {onScheduleSession && (
              <button
                onClick={onScheduleSession}
                className="p-2 bg-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors"
              >
                <Calendar className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Next Session */}
        {nextSession && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">Next Session</span>
              </div>
              <span className="text-sm font-medium text-white">
                {new Date(nextSession).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}
      </SafeMotion.div>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-3">
        <SafeMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-gray-800/50 rounded-xl text-center"
        >
          <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white">{overallProgress}%</p>
          <p className="text-xs text-gray-500">Progress</p>
        </SafeMotion.div>

        <SafeMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 bg-gray-800/50 rounded-xl text-center"
        >
          <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white">
            {completedSessions}/{totalSessions}
          </p>
          <p className="text-xs text-gray-500">Sessions</p>
        </SafeMotion.div>

        <SafeMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-gray-800/50 rounded-xl text-center"
        >
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white">{streakWeeks}</p>
          <p className="text-xs text-gray-500">Week Streak</p>
        </SafeMotion.div>
      </div>

      {/* Goals Section */}
      <SafeMotion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-gray-800/50 rounded-xl overflow-hidden"
      >
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={onViewGoals}
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-white">Goals</h4>
            <span className="px-2 py-0.5 text-xs bg-gray-700 rounded text-gray-400">
              {goals.filter((g) => g.completed).length}/{goals.length}
            </span>
          </div>
          {onViewGoals && <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>

        <div className="px-4 pb-4 space-y-3">
          {goals.slice(0, 3).map((goal) => (
            <div key={goal.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {goal.completed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                  )}
                  <span
                    className={`text-sm ${
                      goal.completed ? 'text-gray-500 line-through' : 'text-white'
                    }`}
                  >
                    {goal.title}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{goal.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden ml-6">
                <div
                  className={`h-full rounded-full ${
                    goal.completed ? 'bg-emerald-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}

          {goals.length > 3 && (
            <button
              onClick={onViewGoals}
              className="w-full mt-2 py-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all {goals.length} goals
            </button>
          )}
        </div>
      </SafeMotion.div>

      {/* Recent Sessions */}
      <SafeMotion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/50 rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-700/50">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h4 className="font-medium text-white">Recent Sessions</h4>
        </div>

        <div className="divide-y divide-gray-700/50">
          {recentSessions.slice(0, 3).map((session) => (
            <div key={session.id} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">
                  {new Date(session.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{session.duration} min</span>
                  {session.rating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span className="text-xs text-amber-400">{session.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              {session.notes && (
                <p className="text-xs text-gray-400 line-clamp-2">{session.notes}</p>
              )}
            </div>
          ))}

          {recentSessions.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No sessions yet</p>
              {onScheduleSession && (
                <button
                  onClick={onScheduleSession}
                  className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  Schedule your first session
                </button>
              )}
            </div>
          )}
        </div>
      </SafeMotion.div>
    </div>
  );
}
