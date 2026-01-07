/**
 * LiveCommunityStats Component
 *
 * Displays real-time community statistics on the landing page.
 * Shows live visitor count, active workouts, total users, and total workouts.
 * Includes an activity ticker and milestone banners.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveCommunityStats } from '../../hooks/useLiveCommunityStats';

// Activity ticker cycling interval
const TICKER_INTERVAL = 4000;

export default function LiveCommunityStats() {
  const { stats, activity, milestone, loading, connected, formatStat } = useLiveCommunityStats();
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

  // Reset index when activity array changes to prevent out of bounds
  useEffect(() => {
    if (!activity || activity.length === 0) {
      setCurrentActivityIndex(0);
      return;
    }
    // Reset if current index is out of bounds
    if (currentActivityIndex >= activity.length) {
      setCurrentActivityIndex(0);
    }
  }, [activity, currentActivityIndex]);

  // Cycle through activity messages
  useEffect(() => {
    if (!activity || activity.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentActivityIndex((prev) => (prev + 1) % activity.length);
    }, TICKER_INTERVAL);

    return () => clearInterval(interval);
  }, [activity]);

  // Loading skeleton
  if (loading) {
    return (
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-8 w-48 bg-white/10 rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 p-6 animate-pulse"
              >
                <div className="h-4 w-16 bg-white/10 rounded mb-3" />
                <div className="h-8 w-12 bg-white/10 rounded mb-2" />
                <div className="h-3 w-20 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const currentActivity = activity?.[currentActivityIndex];

  return (
    <section className="py-12 px-6 border-t border-white/5">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl md:text-3xl font-bold">
              <span
                style={{
                  background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Join the Community
              </span>
            </h2>
            {/* Connection indicator */}
            {connected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <span className="text-xs text-green-400 font-medium">LIVE</span>
              </motion.div>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Real-time stats from athletes around the world
          </p>
        </motion.div>

        {/* Milestone Banner */}
        <AnimatePresence>
          {milestone?.reached && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-6 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 p-4"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">🎉</span>
                <span className="text-yellow-300 font-bold">
                  We just hit {milestone.value.toLocaleString()} workouts!
                </span>
                <span className="text-2xl">🎉</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Browsing Now */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-cyan-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Browsing</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatStat(stats?.activeNow)}
            </div>
            <div className="text-xs text-gray-500">people online now</div>
          </motion.div>

          {/* Working Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatStat(stats?.activeWorkouts)}
            </div>
            <div className="text-xs text-gray-500">working out now</div>
          </motion.div>

          {/* Athletes Joined */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Athletes</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatStat(stats?.totalUsers)}
            </div>
            <div className="text-xs text-gray-500">have joined</div>
          </motion.div>

          {/* Workouts Completed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-orange-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Workouts</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatStat(stats?.totalWorkouts)}
            </div>
            <div className="text-xs text-gray-500">completed</div>
          </motion.div>
        </div>

        {/* Activity Ticker */}
        <AnimatePresence mode="wait">
          {currentActivity && (
            <motion.div
              key={currentActivityIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
            >
              <div className="flex items-center justify-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                <span className="text-gray-300 text-sm">{currentActivity.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fallback when no activity */}
        {(!activity || activity.length === 0) && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-gray-400 text-sm">
                Be the first to log a workout today!
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
