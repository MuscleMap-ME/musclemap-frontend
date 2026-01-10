/**
 * DashboardAtlas - Compact atlas for dashboard with user context
 *
 * Shows "You are here" and recommended next routes based on user progress.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { RouteAtlas } from './RouteAtlas';

interface DashboardAtlasProps {
  userProgress?: {
    level?: number;
    xp?: number;
    skillTreesCompleted?: number;
    journeyStep?: number;
    journeyTotal?: number;
  };
  className?: string;
}

interface RecommendedRoute {
  path: string;
  label: string;
  reason: string;
  icon: string;
  color: string;
}

// Generate recommendations based on user progress
function getRecommendations(progress?: DashboardAtlasProps['userProgress']): RecommendedRoute[] {
  const recommendations: RecommendedRoute[] = [];

  if (!progress) {
    // Default recommendations for new users
    return [
      { path: '/journey', label: 'Start Journey', reason: 'Begin your training path', icon: '🗺️', color: '#3b82f6' },
      { path: '/exercises', label: 'Exercises', reason: 'Explore 65+ exercises', icon: '💪', color: '#22c55e' },
      { path: '/skills', label: 'Skills', reason: 'Check out skill trees', icon: '🌳', color: '#8b5cf6' },
    ];
  }

  // Journey-based recommendations
  if (progress.journeyStep && progress.journeyTotal && progress.journeyStep < progress.journeyTotal) {
    recommendations.push({
      path: '/journey',
      label: 'Continue Journey',
      reason: `Step ${progress.journeyStep} of ${progress.journeyTotal}`,
      icon: '🗺️',
      color: '#3b82f6',
    });
  }

  // Workout recommendation
  recommendations.push({
    path: '/workout',
    label: 'Log Workout',
    reason: 'Track your session',
    icon: '🏋️',
    color: '#22c55e',
  });

  // Progress check
  recommendations.push({
    path: '/progression',
    label: 'View Progress',
    reason: 'Check your gains',
    icon: '📈',
    color: '#f59e0b',
  });

  // Skills if not many completed
  if (!progress.skillTreesCompleted || progress.skillTreesCompleted < 3) {
    recommendations.push({
      path: '/skills',
      label: 'Skill Trees',
      reason: `${progress.skillTreesCompleted || 0}/7 completed`,
      icon: '🌳',
      color: '#8b5cf6',
    });
  }

  return recommendations.slice(0, 3);
}

export function DashboardAtlas({ userProgress, className = '' }: DashboardAtlasProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const recommendations = getRecommendations(userProgress);

  return (
    <div className={`dashboard-atlas ${className}`}>
      {/* Compact card view */}
      <div
        className="
          relative rounded-xl overflow-hidden
          bg-white/5 border border-white/10
          backdrop-blur-md
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Site Map</h3>
              <p className="text-xs text-gray-400">Explore MuscleMap</p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              p-2 rounded-lg
              bg-white/5 hover:bg-white/10
              text-gray-400 hover:text-white
              transition-colors
            "
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        {/* User progress badges */}
        {userProgress && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
            {userProgress.level && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">
                Level {userProgress.level}
              </span>
            )}
            {userProgress.skillTreesCompleted !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                {userProgress.skillTreesCompleted}/7 Skills
              </span>
            )}
            {userProgress.journeyStep && userProgress.journeyTotal && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                Journey {Math.round((userProgress.journeyStep / userProgress.journeyTotal) * 100)}%
              </span>
            )}
          </div>
        )}

        {/* Recommended routes */}
        <div className="p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Recommended
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recommendations.map((rec) => (
              <button
                key={rec.path}
                onClick={() => navigate(rec.path)}
                className="
                  flex flex-col items-center p-3 rounded-lg
                  bg-white/5 hover:bg-white/10
                  border border-transparent hover:border-white/10
                  transition-all duration-200
                  group
                "
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">
                  {rec.icon}
                </span>
                <span className="text-xs font-medium text-white">{rec.label}</span>
                <span className="text-[10px] text-gray-500">{rec.reason}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current location */}
        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="text-pink-400 animate-pulse">●</span>
            <span>You are here:</span>
            <span className="text-white font-medium">{location.pathname}</span>
          </div>
        </div>
      </div>

      {/* Expanded full atlas modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-gray-900 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">MuscleMap Site Map</h2>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Full atlas */}
              <div className="p-4">
                <RouteAtlas height={600} showSearch showLegend />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
