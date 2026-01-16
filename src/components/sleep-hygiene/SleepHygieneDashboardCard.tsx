/**
 * Sleep Hygiene Dashboard Card
 *
 * Compact sleep hygiene summary for the main dashboard
 * Shows checklist progress, streaks, and credit earnings
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Flame, Star, ChevronRight, Plus, Check, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassSurface } from '../glass/GlassSurface';
import { GlassButton } from '../glass/GlassButton';
import {
  useSleepHygieneEnabled,
  useSleepHygieneTodayAssessment,
  useSleepHygieneStreaks,
  useSleepHygieneTodayCredits,
  useSleepHygieneTotalCredits,
  useSleepHygieneStore,
  SLEEP_CREDIT_AMOUNTS,
} from '../../store/sleepHygieneStore';

/**
 * Circular progress ring component
 */
function ProgressRing({ progress, size = 80, strokeWidth = 6, color = 'var(--brand-blue-500)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--glass-white-10)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

/**
 * Streak badge component
 */
function StreakBadge({ streak, label, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
      <Icon className="w-4 h-4 text-amber-400" />
      <div>
        <div className="text-lg font-bold text-white">{streak}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

/**
 * Credit earned animation
 */
function CreditEarnedBadge({ amount }) {
  if (amount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
    >
      <Coins className="w-3 h-3 text-amber-400" />
      <span className="text-xs font-medium text-amber-300">+{amount} today</span>
    </motion.div>
  );
}

/**
 * Checklist item preview
 */
function ChecklistPreview({ preSleep, postSleep }) {
  const preItems = preSleep ? Object.values(preSleep).filter(v => v === true).length : 0;
  const postItems = postSleep ? Object.values(postSleep).filter(v => v === true).length : 0;

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Pre-Sleep</span>
          <span className="text-xs text-gray-300">{preItems}/10</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${(preItems / 10) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Post-Sleep</span>
          <span className="text-xs text-gray-300">{postItems}/6</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${(postItems / 6) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Not enabled state
 */
function SleepHygieneDisabled() {
  return (
    <GlassSurface className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <Moon className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="font-semibold text-white">Sleep Hygiene</h3>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Track your sleep habits, follow science-backed tips, and earn credits for sleeping well.
      </p>

      <div className="flex items-center gap-2 mb-4 text-sm text-amber-300">
        <Coins className="w-4 h-4" />
        <span>Earn up to {SLEEP_CREDIT_AMOUNTS.daily_log + SLEEP_CREDIT_AMOUNTS.target_met + SLEEP_CREDIT_AMOUNTS.good_quality + SLEEP_CREDIT_AMOUNTS.hygiene_checklist}+ credits daily</span>
      </div>

      <Link to="/sleep-hygiene/settings">
        <GlassButton variant="primary" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Enable Sleep Hygiene
        </GlassButton>
      </Link>
    </GlassSurface>
  );
}

/**
 * Main dashboard card
 */
export function SleepHygieneDashboardCard() {
  const enabled = useSleepHygieneEnabled();
  const todayAssessment = useSleepHygieneTodayAssessment();
  const streaks = useSleepHygieneStreaks();
  const todayCredits = useSleepHygieneTodayCredits();
  const totalCredits = useSleepHygieneTotalCredits();
  const openChecklistModal = useSleepHygieneStore((s) => s.openChecklistModal);

  if (!enabled) {
    return <SleepHygieneDisabled />;
  }

  // Get the best current streak
  const sleepLoggedStreak = streaks.find(s => s.streakType === 'sleep_logged');
  const hygieneStreak = streaks.find(s => s.streakType === 'hygiene_checklist');
  const currentStreak = sleepLoggedStreak?.currentStreak || 0;
  const _hygieneCurrentStreak = hygieneStreak?.currentStreak || 0;

  // Calculate overall progress
  const overallScore = todayAssessment?.overallScore || 0;
  const hasCompletedToday = todayAssessment !== null;

  // Get progress color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <GlassSurface className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <Moon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Sleep Hygiene</h3>
            <p className="text-xs text-gray-400">
              {hasCompletedToday ? `${overallScore}% hygiene score` : 'Complete your checklist'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreditEarnedBadge amount={todayCredits} />
          <Link
            to="/sleep-hygiene"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Main progress ring and stats */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          <ProgressRing
            progress={overallScore}
            size={100}
            strokeWidth={8}
            color={getScoreColor(overallScore)}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hasCompletedToday ? (
              <>
                <span className="text-2xl font-bold text-white">{overallScore}%</span>
                <span className="text-xs text-gray-400">score</span>
              </>
            ) : (
              <Moon className="w-8 h-8 text-gray-500" />
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <StreakBadge
            streak={currentStreak}
            label="day streak"
            icon={Flame}
          />
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300">{totalCredits} total earned</span>
          </div>
        </div>
      </div>

      {/* Checklist progress */}
      <div className="mb-4">
        <ChecklistPreview
          preSleep={todayAssessment?.preSleepChecklist}
          postSleep={todayAssessment?.postSleepChecklist}
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <GlassButton
          variant="primary"
          className="flex-1"
          onClick={openChecklistModal}
        >
          {hasCompletedToday ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Update Checklist
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Complete Checklist
            </>
          )}
        </GlassButton>
        <Link to="/sleep-hygiene/tips">
          <GlassButton variant="ghost" className="px-3">
            <Star className="w-4 h-4" />
          </GlassButton>
        </Link>
      </div>

      {/* Credit incentive */}
      {!hasCompletedToday && (
        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
          <p className="text-sm text-gray-300">
            <Coins className="w-4 h-4 inline mr-1 text-amber-400" />
            Complete your checklist to earn <span className="text-amber-300 font-medium">{SLEEP_CREDIT_AMOUNTS.hygiene_checklist} credits</span>
            {currentStreak >= 6 && (
              <span className="text-green-400 ml-1">+ {SLEEP_CREDIT_AMOUNTS.streak_milestone_7} streak bonus tomorrow!</span>
            )}
          </p>
        </div>
      )}

      {/* Perfect score celebration */}
      {overallScore === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20"
        >
          <p className="text-sm text-green-300 flex items-center gap-2">
            <Star className="w-4 h-4 text-green-400" />
            Perfect sleep hygiene today! +{SLEEP_CREDIT_AMOUNTS.perfect_hygiene} bonus credits
          </p>
        </motion.div>
      )}
    </GlassSurface>
  );
}

export default SleepHygieneDashboardCard;
