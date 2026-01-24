/**
 * Dashboard - MuscleMap Liquid Glass Design
 *
 * A comprehensive, modern dashboard using the liquid glass design system
 * inspired by visionOS and iOS 18 spatial computing aesthetics.
 *
 * Integrates:
 * - SpotlightTour for new user onboarding
 * - FeatureDiscovery for feature exploration
 * - ContextualTips for contextual guidance
 * - AnimatedNumber with glow effects
 * - HelpTooltips for terminology
 * - Celebration hooks for achievements
 */

import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Dumbbell, ClipboardList, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '../contexts/UserContext';
import {
  MY_MUSCLE_ACTIVATIONS_QUERY,
  CONVERSATIONS_QUERY,
  MY_STATS_QUERY,
  ECONOMY_WALLET_QUERY,
} from '../graphql/queries';
import { COMPLETE_ONBOARDING_MUTATION } from '../graphql/mutations';
import logger from '../utils/logger';
import { DailyTip, MilestoneProgress, useContextualTips, useTipOnCondition, ActiveContextualTip } from '../components/tips';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { NutritionDashboardCard, QuickLogModal } from '../components/nutrition';
import { FeedbackHub, FeedbackModal } from '../components/feedback';
import { useNutritionDashboard } from '../hooks/useNutrition';

// Plugin System - Widget Slots
import { WidgetSlot } from '../plugins';
import Logo from '../components/Logo';

// New UI Components
import { AnimatedNumber, AnimatedCredits, AnimatedXP } from '../components/animations';
import { HelpTooltip } from '../components/help';

// Tour and Discovery Components
import { SpotlightTour, useTour } from '../components/tour';
import { FeatureDiscovery } from '../components/discovery';

// Daily Challenges Component
import { DailyChallenges } from '../components/challenges';

// Nearby Venues Widget for Outdoor Workouts
import { NearbyVenuesWidget } from '../components/dashboard';

// New Gamification & Analytics Components
import { XPProgress, DailyQuests } from '../components/gamification';
import { InsightCard } from '../components/analytics';
import { RPGStatBar } from '../components/stats';

// Celebration hooks
import { useCelebrationCallbacks } from '../store';

// Mobile UX components
import { FloatingActionButton, PullToRefresh } from '../components/mobile';
import { haptic } from '../utils/haptics';

// Lazy load heavy Atlas component (3D visualization)
const DashboardAtlas = lazy(() =>
  import('../components/atlas').then(m => ({ default: m.DashboardAtlas }))
);

// Lazy load Adventure Map Widget
const AdventureMapWidget = lazy(() =>
  import('../components/adventure-map').then(m => ({ default: m.AdventureMapWidget }))
);
const AdventureMapFullscreen = lazy(() =>
  import('../components/adventure-map').then(m => ({ default: m.AdventureMapFullscreen }))
);

// Lazy load 2D body muscle map
const BodyMuscleMap = lazy(() =>
  import('../components/illustrations').then(m => ({ default: m.BodyMuscleMap }))
);

// Glass components
import {
  GlassSurface,
  GlassButton,
  GlassIconButton,
  GlassCircularProgress,
  GlassNav,
  GlassSidebar,
  GlassSidebarSection,
  GlassSidebarItem,
  GlassMobileNav,
  MeshBackground,
  MuscleActivationBar,
  MuscleIndicator,
} from '../components/glass';

// ============================================
// ICONS
// ============================================
const Icons = {
  Home: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Play: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Journey: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Chart: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Message: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Wallet: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Settings: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Map: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Community: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Customize: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  Feedback: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Bolt: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Fire: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  Heart: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Dumbbell: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h4m10 0h4M7 12v4a1 1 0 001 1h1M7 12V8a1 1 0 011-1h1m7 5v4a1 1 0 01-1 1h-1m1-5V8a1 1 0 00-1-1h-1m-4 0h4m-4 10h4" />
    </svg>
  ),
  ChevronRight: ({ className = 'w-4 h-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Bell: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Target: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Library: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Goal: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Shield: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Clipboard: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Crown: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 0v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
    </svg>
  ),
};

// ============================================
// ARCHETYPE CONFIGURATIONS
// ============================================
const ARCHETYPES = {
  bodybuilder: { label: 'Bodybuilder', gradient: 'from-[var(--brand-pulse-500)] to-[var(--muscle-chest)]', icon: 'muscle' },
  powerlifter: { label: 'Powerlifter', gradient: 'from-slate-500 to-zinc-700', icon: 'weight' },
  gymnast: { label: 'Gymnast', gradient: 'from-violet-500 to-fuchsia-500', icon: 'rings' },
  crossfit: { label: 'CrossFit', gradient: 'from-amber-500 to-orange-500', icon: 'bolt' },
  sprinter: { label: 'Sprinter', gradient: 'from-sky-500 to-cyan-500', icon: 'run' },
  martial_artist: { label: 'Martial Artist', gradient: 'from-red-600 to-rose-800', icon: 'fist' },
  default: { label: 'Explorer', gradient: 'from-[var(--brand-blue-500)] to-[var(--brand-pulse-500)]', icon: 'compass' }
};

const getArchetype = (id) => ARCHETYPES[id] || ARCHETYPES.default;

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ label, value, sublabel, trend, icon: Icon, variant = 'default', helpTerm, animate = false, to = null }) => {
  const variants = {
    default: 'from-[var(--glass-white-5)] to-[var(--glass-white-10)]',
    brand: 'from-[var(--brand-blue-500)]/10 to-[var(--brand-blue-500)]/5',
    pulse: 'from-[var(--brand-pulse-500)]/10 to-[var(--brand-pulse-500)]/5',
    success: 'from-[var(--feedback-success)]/10 to-[var(--feedback-success)]/5',
  };

  // Determine if value is a number that should be animated
  const isNumericValue = typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)));
  const numericValue = isNumericValue ? parseFloat(value) : 0;

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={to ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative overflow-hidden rounded-2xl p-5
        bg-gradient-to-br ${variants[variant]}
        backdrop-blur-xl border border-[var(--border-subtle)]
        hover:border-[var(--border-default)]
        transition-colors duration-300
        ${to ? 'cursor-pointer' : ''}
      `}
    >
      {/* Subtle glow effect */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[var(--brand-blue-500)]/10 rounded-full blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-[var(--glass-white-10)] rounded-xl border border-[var(--border-subtle)]">
            {Icon && <Icon className="w-5 h-5 text-[var(--text-secondary)]" />}
          </div>
          {trend !== undefined && (
            <span className={`
              text-xs font-semibold px-2.5 py-1 rounded-full
              ${trend > 0
                ? 'bg-[var(--feedback-success)]/20 text-[var(--feedback-success)]'
                : trend < 0
                  ? 'bg-[var(--feedback-error)]/20 text-[var(--feedback-error)]'
                  : 'bg-[var(--glass-white-10)] text-[var(--text-tertiary)]'
              }
            `}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
            </span>
          )}
          {to && (
            <motion.div
              className="opacity-40 group-hover:opacity-100 transition-opacity"
            >
              <Icons.ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            </motion.div>
          )}
        </div>

        <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          {animate && isNumericValue ? (
            <AnimatedNumber
              value={numericValue}
              format="comma"
              glowOnChange
              glowColor="auto"
              countUp
            />
          ) : (
            value
          )}
        </div>
        <div className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1">
          {label}
          {helpTerm && <HelpTooltip term={helpTerm} size="sm" />}
        </div>
        {sublabel && <div className="text-xs text-[var(--text-quaternary)] mt-0.5">{sublabel}</div>}
      </div>
    </motion.div>
  );

  if (to) {
    return <Link to={to} className="group">{cardContent}</Link>;
  }

  return cardContent;
};

// ============================================
// QUICK ACTION CARD
// ============================================
const QuickActionCard = ({ to, icon: Icon, label, description, gradient, delay = 0 }) => (
  <Link to={to}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        bg-gradient-to-br ${gradient}
        border border-white/10 cursor-pointer group
        shadow-lg shadow-black/20
      `}
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/10">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <motion.div
            className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
          >
            <Icons.ChevronRight className="w-5 h-5 text-white" />
          </motion.div>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">{label}</h3>
        <p className="text-sm text-white/70">{description}</p>
      </div>
    </motion.div>
  </Link>
);

// ============================================
// CHARACTER STATS METADATA
// ============================================
const STAT_META = {
  strength: { name: 'Strength', abbr: 'STR', color: '#FF3366', description: 'Raw lifting power' },
  constitution: { name: 'Constitution', abbr: 'CON', color: '#00CC66', description: 'Recovery & resilience' },
  dexterity: { name: 'Dexterity', abbr: 'DEX', color: '#FFB800', description: 'Movement skill' },
  power: { name: 'Power', abbr: 'PWR', color: '#FF6B00', description: 'Explosive force' },
  endurance: { name: 'Endurance', abbr: 'END', color: '#0066FF', description: 'Stamina' },
  vitality: { name: 'Vitality', abbr: 'VIT', color: '#9333EA', description: 'Overall health' },
};

const STAT_ORDER = ['strength', 'constitution', 'dexterity', 'power', 'endurance', 'vitality'];

// ============================================
// STATS CARD
// ============================================
const CharacterStatsCard = ({ characterStats, loading }) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-[var(--glass-white-5)] to-[var(--glass-white-10)] backdrop-blur-xl border border-[var(--border-subtle)]"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--glass-white-10)] rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-[var(--glass-white-10)] rounded w-1/2" />
                <div className="h-8 bg-[var(--glass-white-10)] rounded" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const stats = characterStats?.stats || {
    strength: 0,
    constitution: 0,
    dexterity: 0,
    power: 0,
    endurance: 0,
    vitality: 0,
  };

  // Calculate total and average
  const total = STAT_ORDER.reduce((sum, key) => sum + (stats[key] || 0), 0);
  const maxStat = Math.max(...STAT_ORDER.map(key => stats[key] || 0), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full rounded-2xl p-4 lg:p-5 bg-gradient-to-br from-[var(--glass-white-5)] to-[var(--glass-white-10)] backdrop-blur-xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-[var(--brand-blue-500)]/20 to-purple-500/20 rounded-lg border border-[var(--border-subtle)]">
            <Icons.Target className="w-4 h-4 text-[var(--brand-blue-400)]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Your Stats</h3>
          </div>
        </div>
        <Link
          to="/stats"
          className="text-xs text-[var(--brand-blue-400)] hover:text-[var(--brand-blue-300)] transition-colors flex items-center gap-0.5"
        >
          Details
          <Icons.ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Compact Radar Visualization */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Mini Radar Chart - hidden on small containers */}
        <div className="hidden xl:flex flex-shrink-0 justify-center">
          <svg width={140} height={140} className="mx-auto">
            {/* Background hexagon rings */}
            {[0.33, 0.66, 1].map((level, idx) => {
              const pts = [];
              const center = 70;
              const maxRadius = 55;
              const angleStep = (2 * Math.PI) / 6;
              for (let i = 0; i < 6; i++) {
                const angle = angleStep * i - Math.PI / 2;
                const radius = level * maxRadius;
                pts.push(`${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`);
              }
              return (
                <polygon
                  key={idx}
                  points={pts.join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
              );
            })}

            {/* Axis lines */}
            {STAT_ORDER.map((_, i) => {
              const center = 70;
              const maxRadius = 55;
              const angleStep = (2 * Math.PI) / 6;
              const angle = angleStep * i - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={center + maxRadius * Math.cos(angle)}
                  y2={center + maxRadius * Math.sin(angle)}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                />
              );
            })}

            {/* Stats polygon */}
            {(() => {
              const center = 70;
              const maxRadius = 55;
              const angleStep = (2 * Math.PI) / 6;
              const pts = STAT_ORDER.map((key, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const value = (stats[key] || 0) / maxStat;
                const radius = value * maxRadius;
                return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
              });
              return (
                <motion.polygon
                  points={pts.join(' ')}
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                />
              );
            })()}

            {/* Stat points only (labels shown in stat bars) */}
            {STAT_ORDER.map((key, i) => {
              const center = 70;
              const maxRadius = 55;
              const angleStep = (2 * Math.PI) / 6;
              const angle = angleStep * i - Math.PI / 2;
              const value = (stats[key] || 0) / maxStat;
              const radius = value * maxRadius;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);

              return (
                <motion.circle
                  key={key}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={STAT_META[key].color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                />
              );
            })}
          </svg>
        </div>

        {/* RPG-Style Stat Bars */}
        <div className="flex-1 space-y-2">
          {STAT_ORDER.map((key, index) => {
            const value = stats[key] || 0;
            const meta = STAT_META[key];

            return (
              <RPGStatBar
                key={key}
                statKey={key}
                label={meta.name}
                abbreviation={meta.abbr}
                value={value}
                maxValue={maxStat * 1.2}
                color={meta.color}
                description={meta.description}
                delay={index * 0.06}
                showSegments={true}
                segmentCount={10}
                size="sm"
                variant="default"
              />
            );
          })}
        </div>
      </div>

      {/* Total Score */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-xs text-[var(--text-tertiary)]">Power Level</span>
        <span className="text-lg font-bold bg-gradient-to-r from-[var(--brand-blue-400)] to-purple-400 bg-clip-text text-transparent">
          {total.toFixed(0)}
        </span>
      </div>
    </motion.div>
  );
};

// ============================================
// CURRENT PATH CARD (Hero Card)
// ============================================
const CurrentPathCard = ({ archetype, stats, wallet: _wallet }) => {
  const arch = getArchetype(archetype);
  const xpProgress = stats?.xp ? Math.min((stats.xp % 1000) / 10, 100) : 15;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`
        relative overflow-hidden rounded-3xl p-8
        bg-gradient-to-br ${arch.gradient}
        border border-white/10
        shadow-2xl shadow-black/30
      `}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/80 mb-3">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Current Path
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{arch.label}</h2>

            <div className="flex items-center gap-6 mt-6">
              <div>
                <div className="text-3xl font-bold text-white">
                  <AnimatedNumber value={stats?.level || 1} countUp glowOnChange glowColor="auto" />
                </div>
                <div className="text-sm text-white/60 flex items-center gap-1">
                  Level <HelpTooltip term="Level" size="sm" iconColor="rgba(255,255,255,0.6)" />
                </div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">
                  <AnimatedXP value={stats?.xp || 0} />
                </div>
                <div className="text-sm text-white/60 flex items-center gap-1">
                  Total XP <HelpTooltip term="XP" size="sm" iconColor="rgba(255,255,255,0.6)" />
                </div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-3xl font-bold text-white">
                  <AnimatedNumber value={stats?.streak || 0} countUp glowOnChange glowColor="auto" />
                </div>
                <div className="text-sm text-white/60">Day Streak</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-4">
            <Link
              to="/journey"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-semibold text-white transition-all border border-white/10"
            >
              View Journey
              <Icons.ChevronRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 text-sm text-white/70">
              <GlassCircularProgress value={xpProgress} size={36} strokeWidth={3} />
              <span>{Math.round(xpProgress)}% to Level {(stats?.level || 1) + 1}</span>
            </div>
          </div>
        </div>

        {/* XP Progress bar */}
        <div className="mt-8">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>Level Progress</span>
            <span>{stats?.xp ? stats.xp % 1000 : 0} / 1,000 XP</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// ACTIVITY ITEM
// ============================================
const ActivityItem = ({ icon: Icon, title, subtitle, time, trailing }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-white-5)] border border-[var(--border-subtle)] hover:bg-[var(--glass-white-10)] transition-colors cursor-pointer"
  >
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--glass-white-10)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)]">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</p>
      <p className="text-xs text-[var(--text-tertiary)]">{subtitle}</p>
    </div>
    <div className="flex items-center gap-3">
      {trailing}
      <span className="text-xs text-[var(--text-quaternary)]">{time}</span>
    </div>
  </motion.div>
);

// ============================================
// TODAY'S WORKOUT CARD
// ============================================
const TodaysWorkoutCard = ({ stats: _stats }) => {
  const muscles = [
    { muscle: 'chest', percentage: 35 },
    { muscle: 'shoulders', percentage: 25 },
    { muscle: 'arms', percentage: 25 },
    { muscle: 'core', percentage: 15 },
  ];

  return (
    <GlassSurface className="p-6" depth="medium">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Today&apos;s Focus</h3>
          <p className="text-sm text-[var(--text-tertiary)]">Push Day - Upper Body</p>
        </div>
        <Link to="/workout">
          <GlassButton variant="primary" size="sm">
            <Icons.Play className="w-4 h-4 mr-2" />
            Start
          </GlassButton>
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">6</div>
          <div className="text-xs text-[var(--text-tertiary)]">Exercises</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">45</div>
          <div className="text-xs text-[var(--text-tertiary)]">Minutes</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">380</div>
          <div className="text-xs text-[var(--text-tertiary)]">Calories</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">18</div>
          <div className="text-xs text-[var(--text-tertiary)]">Sets</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[var(--text-secondary)]">Target Muscles</span>
          <div className="flex gap-2">
            {['chest', 'shoulders', 'arms'].map((muscle) => (
              <MuscleIndicator key={muscle} muscle={muscle} size="sm" />
            ))}
          </div>
        </div>
        <MuscleActivationBar muscles={muscles} height={8} />
      </div>
    </GlassSurface>
  );
};

// ============================================
// MUSCLE MAP CARD (2D Body Visualization)
// ============================================
const MuscleMapCard = ({ muscleActivations }) => {
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const navigate = useNavigate();

  const handleMuscleClick = (muscleId, data, _event) => {
    setSelectedMuscle({ muscleId, ...data });
  };

  const handleViewExercises = (muscleId) => {
    navigate(`/exercises?muscle=${muscleId}`);
  };

  return (
    <GlassSurface className="p-6" depth="medium">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Muscle Activation</h3>
          <p className="text-sm text-[var(--text-tertiary)]">Click muscles for details</p>
        </div>
        <Link to="/exercises" className="text-sm text-[var(--brand-blue-400)] hover:text-[var(--brand-blue-300)] transition-colors flex items-center gap-1">
          All exercises
          <Icons.ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="h-64">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-[var(--glass-white-5)] rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--brand-blue-500)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm text-[var(--text-tertiary)]">Loading body map...</span>
            </div>
          </div>
        }>
          <BodyMuscleMap
            muscleActivations={muscleActivations}
            view="front"
            size="md"
            showLabels={false}
            interactive={true}
            onMuscleClick={handleMuscleClick}
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {selectedMuscle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-[var(--glass-white-5)] rounded-xl border border-[var(--border-subtle)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                {selectedMuscle.muscleId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {selectedMuscle.activation || 0}% activated recently
              </p>
            </div>
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => handleViewExercises(selectedMuscle.muscleId)}
            >
              View Exercises
            </GlassButton>
          </div>
        </motion.div>
      )}
    </GlassSurface>
  );
};

// ============================================
// WEEKLY PROGRESS CARD
// ============================================
const WeeklyProgressCard = ({ stats }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1; // Convert Sun=0 to index 6

  // Mock workout data - in real app this would come from API
  const workoutDays = [true, true, false, true, true, false, false];

  return (
    <GlassSurface className="p-6" depth="subtle">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">This Week</h3>
          <p className="text-sm text-[var(--text-tertiary)]">{stats?.workouts || 4} workouts completed</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[var(--brand-blue-400)]">{stats?.streak || 0}</span>
          <span className="text-sm text-[var(--text-tertiary)]">day streak</span>
        </div>
      </div>

      <div className="flex justify-between gap-2">
        {days.map((day, i) => (
          <div key={day} className="flex-1 text-center">
            <div
              className={`
                aspect-square rounded-xl flex items-center justify-center mb-2
                ${i === adjustedToday
                  ? 'bg-[var(--brand-blue-500)] text-white'
                  : workoutDays[i]
                    ? 'bg-[var(--feedback-success)]/20 text-[var(--feedback-success)]'
                    : 'bg-[var(--glass-white-5)] text-[var(--text-quaternary)]'
                }
                ${i <= adjustedToday ? '' : 'opacity-50'}
              `}
            >
              {workoutDays[i] && i < adjustedToday ? (
                <Icons.Check className="w-4 h-4" />
              ) : i === adjustedToday ? (
                <Icons.Fire className="w-4 h-4" />
              ) : null}
            </div>
            <span className={`text-xs ${i === adjustedToday ? 'text-[var(--brand-blue-400)] font-semibold' : 'text-[var(--text-quaternary)]'}`}>
              {day}
            </span>
          </div>
        ))}
      </div>
    </GlassSurface>
  );
};

// ============================================
// NAVIGATION ITEMS CONFIG
// ============================================
const navSections = [
  {
    title: 'Training',
    items: [
      { to: '/dashboard', icon: Icons.Home, label: 'Overview', active: true },
      { to: '/workout', icon: Icons.Play, label: 'Train' },
      { to: '/templates', icon: Icons.Clipboard, label: 'Templates', badge: 'New' },
      { to: '/journey', icon: Icons.Journey, label: 'Journey' },
      { to: '/exercises', icon: Icons.Library, label: 'Exercises' },
      { to: '/progression', icon: Icons.Chart, label: 'Progress' },
      { to: '/body-measurements', icon: Icons.Target, label: 'Body Stats', badge: 'New' },
      { to: '/stats', icon: Icons.Target, label: 'Stats' },
      { to: '/wellness', icon: Icons.Heart, label: 'Wellness' },
      { to: '/goals', icon: Icons.Goal, label: 'Goals' },
      { to: '/limitations', icon: Icons.Shield, label: 'Limitations' },
      { to: '/pt-tests', icon: Icons.Clipboard, label: 'PT Tests' },
    ]
  },
  {
    title: 'Social',
    items: [
      { to: '/messages', icon: Icons.Message, label: 'Messages' },
      { to: '/community', icon: Icons.Community, label: 'Community' },
      { to: '/crews', icon: Icons.Community, label: 'Crews' },
      { to: '/rivals', icon: Icons.Trophy, label: 'Rivals' },
      { to: '/competitions', icon: Icons.Trophy, label: 'Competitions' },
      { to: '/locations', icon: Icons.Map, label: 'Locations' },
      { to: '/discover', icon: Icons.Map, label: 'Discover', badge: 'New' },
    ]
  },
  {
    title: 'Account',
    items: [
      { to: '/wallet', icon: Icons.Wallet, label: 'Wallet' },
      { to: '/skins', icon: Icons.Customize, label: 'Customize' },
      { to: '/settings', icon: Icons.Settings, label: 'Settings' },
      { to: '/profile', icon: Icons.User, label: 'Profile' },
      { to: '/issues', icon: Icons.Feedback, label: 'Feedback' },
    ]
  }
];

const mobileNavItems = [
  { to: '/dashboard', icon: Icons.Home, label: 'Home', active: true },
  { to: '/workout', icon: Icons.Play, label: 'Train' },
  { to: '/journey', icon: Icons.Journey, label: 'Journey' },
  { to: '/community', icon: Icons.Community, label: 'Social' },
  { to: '/profile', icon: Icons.User, label: 'Profile' },
];

// ============================================
// ONBOARDING TOUR LOCAL STORAGE KEY
// ============================================
const ONBOARDING_COMPLETE_KEY = 'musclemap_onboarding_tour_complete';
const LAST_WORKOUT_KEY = 'musclemap_last_workout_date';

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export default function Dashboard() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // GraphQL query for stats (replaces api.progress.stats() and api.characterStats.me())
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(
    MY_STATS_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  // GraphQL query for wallet (replaces api.wallet.balance())
  const { data: walletData, refetch: refetchWallet } = useQuery(
    ECONOMY_WALLET_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  // GraphQL query for muscle activations
  const { data: muscleData } = useQuery<{ myMuscleActivations: Array<{ muscleId: string; activation: number }> }>(
    MY_MUSCLE_ACTIVATIONS_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  // GraphQL query for conversations (to get unread count)
  const { data: conversationsData } = useQuery(
    CONVERSATIONS_QUERY,
    { variables: { tab: 'inbox' }, fetchPolicy: 'cache-and-network' }
  );

  // Memoize stats from GraphQL data
  const stats = useMemo(() => {
    const s = statsData?.myStats;
    if (!s) return null;
    return {
      streak: s.currentStreak || 0,
      workouts: s.totalWorkouts || 0,
      xp: s.xp || 0,
      level: s.level || 1,
      levelName: `Level ${s.level || 1}`,
      lastWorkoutDate: s.lastWorkoutAt,
    };
  }, [statsData]);

  // Memoize character stats from GraphQL data
  const characterStats = useMemo(() => {
    const s = statsData?.myStats;
    if (!s) return null;
    return {
      stats: {
        strength: s.strength || 0,
        constitution: s.endurance || 0, // Map endurance to constitution
        dexterity: s.agility || 0,      // Map agility to dexterity
        power: s.flexibility || 0,       // Map flexibility to power
        endurance: s.balance || 0,       // Map balance to endurance
        vitality: s.mentalFocus || 0,    // Map mentalFocus to vitality
      },
    };
  }, [statsData]);

  // Memoize wallet from GraphQL data
  const wallet = useMemo(() => {
    const w = walletData?.economyWallet;
    if (!w) return null;
    return {
      wallet: { balance: w.credits || 0 },
      ranking: { vip_tier: 'Bronze' }, // Default tier, could be enhanced
    };
  }, [walletData]);

  // Memoize muscle activations
  const muscleActivations = useMemo(() => {
    if (muscleData?.myMuscleActivations && muscleData.myMuscleActivations.length > 0) {
      return muscleData.myMuscleActivations;
    }
    // Fallback to mock data if no activations
    return [
      { muscleId: 'pectoralis-major', activation: 65 },
      { muscleId: 'deltoid-anterior', activation: 45 },
      { muscleId: 'biceps-brachii', activation: 30 },
      { muscleId: 'rectus-abdominis', activation: 20 },
      { muscleId: 'quadriceps', activation: 50 },
    ];
  }, [muscleData]);

  // Memoize unread message count
  const unreadMessageCount = useMemo(() => {
    if (!conversationsData?.conversations) return 0;
    return conversationsData.conversations.reduce(
      (sum: number, conv: { unreadCount?: number }) => sum + (conv.unreadCount || 0),
      0
    );
  }, [conversationsData]);

  // ============================================
  // ONBOARDING TOUR STATE
  // ============================================
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const { hasCompletedTour } = useTour();

  // GraphQL mutation for onboarding completion
  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING_MUTATION);

  // Check if user needs onboarding tour
  // Uses multiple sources to determine completion:
  // 1. Server-side: user.onboardingCompletedAt (persists across devices/sessions)
  // 2. localStorage: ONBOARDING_COMPLETE_KEY (fast check, may be cleared on iOS)
  // 3. Zustand store: hasCompletedTour (session state)
  useEffect(() => {
    // Server-side check is the authoritative source (fixes iOS localStorage issues)
    const serverCompleted = !!(user?.onboardingCompletedAt);
    const localCompleted = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
    const tourCompleted = hasCompletedTour('onboarding');

    // If server says completed but localStorage doesn't, sync it
    if (serverCompleted && !localCompleted) {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    }

    // Only show tour if ALL sources say it's incomplete
    if (!serverCompleted && !localCompleted && !tourCompleted && user) {
      // Delay the tour start to let the dashboard render first
      const timer = setTimeout(() => {
        setShowOnboardingTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, hasCompletedTour]);

  // Handle tour completion - sync to both localStorage and server
  const handleTourComplete = useCallback(async () => {
    // Set localStorage immediately for fast UI response
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setShowOnboardingTour(false);

    // Sync to server so completion persists across devices/sessions (fixes iOS issues)
    try {
      await completeOnboarding();
      logger.info('Tour completion synced to server');
    } catch (error) {
      // Non-blocking - localStorage already set, server sync is best-effort
      logger.warn('Failed to sync tour completion to server', { error });
    }
  }, [completeOnboarding]);

  // ============================================
  // CONTEXTUAL TIP TRIGGERS
  // ============================================
  // Check if profile is incomplete (no avatar or bio)
  const isProfileIncomplete = user && (!user.avatar_url || !user.bio);
  const [wasProfileIncomplete, setWasProfileIncomplete] = useState(isProfileIncomplete);

  // Check if no workout in 3 days
  const [noRecentWorkout, setNoRecentWorkout] = useState(false);
  useEffect(() => {
    const lastWorkout = localStorage.getItem(LAST_WORKOUT_KEY);
    if (lastWorkout) {
      const daysSinceWorkout = (Date.now() - parseInt(lastWorkout, 10)) / (1000 * 60 * 60 * 24);
      setNoRecentWorkout(daysSinceWorkout >= 3);
    } else {
      // No record of last workout, check from stats
      if (stats?.lastWorkoutDate) {
        const daysSinceWorkout = (Date.now() - new Date(stats.lastWorkoutDate).getTime()) / (1000 * 60 * 60 * 24);
        setNoRecentWorkout(daysSinceWorkout >= 3);
      }
    }
  }, [stats]);

  // Trigger contextual tips after dashboard loads
  useTipOnCondition('profile_incomplete', isProfileIncomplete, { delay: 3000 });
  useTipOnCondition('no_workout_3_days', noRecentWorkout, { delay: 5000 });

  // ============================================
  // CELEBRATION CALLBACKS
  // ============================================
  const { register: registerCelebrations, clear: clearCelebrations } = useCelebrationCallbacks();
  const { showTip } = useContextualTips();

  useEffect(() => {
    // Register celebration callbacks for workout events
    registerCelebrations({
      onComplete: (data) => {
        // Update last workout date
        localStorage.setItem(LAST_WORKOUT_KEY, Date.now().toString());
        // Show workout complete tip
        showTip('workout_complete', { data });
      },
      onPR: (data) => {
        // Show achievement tip for PR
        showTip('new_achievement', { data: { type: 'pr', ...data } });
      },
      onLevelUp: (data) => {
        // Show level up tip
        showTip('level_up', { data });
      },
    });

    return () => clearCelebrations();
  }, [registerCelebrations, clearCelebrations, showTip]);

  // Show celebration when profile becomes complete
  useEffect(() => {
    if (wasProfileIncomplete && !isProfileIncomplete && user) {
      // Profile was incomplete and is now complete - show celebration
      showTip('profile_completed', {
        data: {
          title: '🎉 Profile Complete!',
          message: 'Welcome to MuscleMap! You\'re all set to start your fitness journey.',
        }
      });
    }
    setWasProfileIncomplete(isProfileIncomplete);
  }, [isProfileIncomplete, wasProfileIncomplete, user, showTip]);

  // ============================================
  // FEATURE DISCOVERY HANDLER
  // ============================================
  const handleFeatureClick = useCallback((feature) => {
    if (feature.route) {
      navigate(feature.route);
    }
  }, [navigate]);

  // Load nutrition data
  const { load: loadNutrition } = useNutritionDashboard();

  useEffect(() => {
    // Load nutrition dashboard data
    loadNutrition().catch(() => {});
  }, [loadNutrition]);

  // All stats, wallet, and muscle activations are now loaded via GraphQL queries above

  // Pull to refresh handler - refetches GraphQL queries
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    haptic('medium');

    await Promise.all([
      refetchStats(),
      refetchWallet(),
      loadNutrition().catch(() => null),
    ]);

    setIsRefreshing(false);
  }, [refetchStats, refetchWallet, loadNutrition]);

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      refreshText="Refreshing dashboard..."
      pullText="Pull to refresh"
      releaseText="Release to refresh"
      className="min-h-screen relative"
    >
      {/* Animated mesh background */}
      <MeshBackground intensity="subtle" />

      {/* Navigation */}
      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
          </Link>
        }
        rightContent={
          <div className="flex items-center gap-2">
            {/* Messages */}
            <Link to="/messages" className="relative">
              <GlassIconButton size="sm">
                <Icons.Message className="w-5 h-5" />
              </GlassIconButton>
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[var(--brand-pulse-500)] rounded-full border-2 border-[var(--void-base)] text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>

            {/* Wallet */}
            <Link
              to="/wallet"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-white-5)] hover:bg-[var(--glass-white-10)] rounded-xl border border-[var(--border-subtle)] transition-all"
            >
              <Icons.Wallet className="w-4 h-4 text-[var(--brand-blue-400)]" />
              <span className="font-semibold text-[var(--text-primary)]">
                <AnimatedCredits value={wallet?.wallet?.balance || user?.credits || 0} />
              </span>
              <HelpTooltip term="Credits" size="sm" />
            </Link>

            {/* Settings/Logout */}
            <GlassIconButton size="sm" onClick={logout}>
              <Icons.Settings className="w-5 h-5" />
            </GlassIconButton>
          </div>
        }
      />

      <div className="flex pt-16">
        {/* Sidebar - Desktop */}
        <GlassSidebar className="hidden lg:flex">
          {navSections.map((section, i) => (
            <GlassSidebarSection key={i} title={section.title}>
              {section.items.map((item, j) => (
                <GlassSidebarItem
                  key={j}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={item.active}
                  badge={item.to === '/messages' && unreadMessageCount > 0 ? unreadMessageCount : item.badge}
                />
              ))}
            </GlassSidebarSection>
          ))}
        </GlassSidebar>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">
                Welcome back, {user?.username || 'Athlete'}
              </h1>
              <p className="text-[var(--text-secondary)]">
                Continue your training journey. You&apos;re doing great!
              </p>
            </motion.div>

            {/* Current Path Hero Card + Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Current Path - Takes 2 columns on large screens */}
              <div className="lg:col-span-2" data-tour="welcome">
                <CurrentPathCard
                  archetype={user?.archetype}
                  stats={stats}
                  wallet={wallet}
                />
              </div>

              {/* Stats - Takes 1 column on large screens */}
              <div className="lg:col-span-1" data-tour="stats-card">
                <CharacterStatsCard
                  characterStats={characterStats}
                  loading={statsLoading}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Icons.Fire}
                label="Day Streak"
                value={stats?.streak || 0}
                trend={12}
                variant="pulse"
                animate
              />
              <StatCard
                icon={Icons.Dumbbell}
                label="Workouts"
                value={stats?.workouts || 0}
                sublabel="This month"
                variant="brand"
                animate
              />
              <StatCard
                icon={Icons.Trophy}
                label="Achievements"
                value={12}
                sublabel="3 new"
                animate
                to="/achievements"
              />
              <StatCard
                icon={Icons.Target}
                label="VIP Status"
                value={wallet?.ranking?.vip_tier || 'Bronze'}
                variant="success"
              />
            </div>

            {/* Plugin Widget Slot: Dashboard Stats Area */}
            <WidgetSlot
              name="dashboard.stats"
              context={{ user, stats, wallet }}
              className="mb-8"
              layout="grid"
              gap={4}
            />

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div data-tour="start-workout">
                  <QuickActionCard
                    to="/workout"
                    icon={Icons.Play}
                    label="Start Workout"
                    description="Begin your training session"
                    gradient="from-emerald-500 to-teal-600"
                    delay={0}
                  />
                </div>
                <QuickActionCard
                  to="/journey"
                  icon={Icons.Journey}
                  label="Journey Map"
                  description="Track your progression path"
                  gradient="from-[var(--brand-blue-500)] to-violet-600"
                  delay={0.1}
                />
                <QuickActionCard
                  to="/exercises"
                  icon={Icons.Library}
                  label="Exercise Library"
                  description="Browse all exercises"
                  gradient="from-[var(--brand-pulse-500)] to-rose-600"
                  delay={0.2}
                />
                {/* Empire Control - Admin only */}
                {user?.is_admin && (
                  <QuickActionCard
                    to="/empire"
                    icon={Icons.Crown}
                    label="Empire Control"
                    description="Admin dashboard & controls"
                    gradient="from-amber-500 to-orange-600"
                    delay={0.3}
                  />
                )}
              </div>
            </div>

            {/* XP Progress & Daily Quests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <XPProgress
                currentXP={stats?.xp || 0}
                xpForNextLevel={1000}
                level={stats?.level || 1}
                levelTitle={stats?.levelName || 'Beginner'}
              />
              <DailyQuests
                quests={[
                  { id: '1', title: 'Complete a workout', xpReward: 50, completed: false, progress: 0, total: 1, icon: '🏋️' },
                  { id: '2', title: 'Log 5,000 lbs volume', xpReward: 75, completed: false, progress: 2500, total: 5000, icon: '💪' },
                  { id: '3', title: 'Hit a personal record', xpReward: 100, completed: false, progress: 0, total: 1, icon: '🏆' },
                ]}
                onClaimReward={() => {}}
                resetTime="6h 30m"
              />
            </div>

            {/* Smart Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <InsightCard
                type="positive"
                title="Strength Gains!"
                message="Your bench press improved 12% this month"
                icon="💪"
                action={{ label: 'View Progress', onClick: () => navigate('/progression') }}
              />
              <InsightCard
                type="info"
                title="New Exercises"
                message="5 new exercises match your goals"
                icon="🎯"
                action={{ label: 'Explore', onClick: () => navigate('/exercises') }}
              />
              <InsightCard
                type={stats?.streak >= 3 ? 'positive' : 'warning'}
                title={stats?.streak >= 3 ? 'Great Streak!' : 'Keep Going!'}
                message={stats?.streak >= 3 ? `${stats.streak} day streak - you're on fire!` : 'Get back on track with a workout today'}
                icon={stats?.streak >= 3 ? '🔥' : '⚡'}
              />
            </div>

            {/* Daily Challenges Section */}
            <div className="mb-8" data-tour="daily-challenges">
              <DailyChallenges
                userId={user?.id}
                onChallengeComplete={(challenge) => {
                  logger.info('challenge_completed', { challengeId: challenge.id });
                }}
                onRewardClaimed={(challenge, rewards) => {
                  logger.info('challenge_reward_claimed', { challengeId: challenge.id, rewards });
                }}
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Today's Workout */}
              <TodaysWorkoutCard stats={stats} />

              {/* Weekly Progress */}
              <WeeklyProgressCard stats={stats} />
            </div>

            {/* Nutrition Dashboard Card */}
            <div className="mb-8">
              <NutritionDashboardCard />
            </div>

            {/* Nearby Outdoor Fitness Locations */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Nearby Outdoor Spots</h2>
                  <p className="text-sm text-[var(--text-tertiary)]">Outdoor fitness equipment near you</p>
                </div>
                <Link
                  to="/discover"
                  className="text-sm text-[var(--brand-blue-400)] hover:text-[var(--brand-blue-300)] transition-colors flex items-center gap-1"
                >
                  Explore Map
                  <Icons.ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <NearbyVenuesWidget limit={3} compact />
            </div>

            {/* Muscle Activation Map */}
            <div className="mb-8" data-tour="muscle-map">
              <MuscleMapCard muscleActivations={muscleActivations} />
            </div>

            {/* Daily Tip */}
            <div className="mb-8">
              <DailyTip />
            </div>

            {/* Milestones */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Milestones</h2>
                <Link to="/journey" className="text-sm text-[var(--brand-blue-400)] hover:text-[var(--brand-blue-300)] transition-colors">
                  View all
                </Link>
              </div>
              <GlassSurface className="p-6" depth="subtle">
                <MilestoneProgress limit={4} />
              </GlassSurface>
            </div>

            {/* Adventure Map Widget - Prominent section for navigation */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Adventure Map</h2>
                  <p className="text-sm text-[var(--text-tertiary)]">Explore MuscleMap like an RPG - move your character to navigate</p>
                </div>
                <Link
                  to="/adventure-map"
                  className="text-sm text-[var(--brand-blue-400)] hover:text-[var(--brand-blue-300)] transition-colors flex items-center gap-1"
                >
                  Full Map
                  <Icons.ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <Suspense fallback={<div className="h-[250px] md:h-[280px] bg-white/5 rounded-2xl animate-pulse" />}>
                <AdventureMapWidget
                  className="w-full"
                  variant="default"
                  onExpand={() => {
                    // Map will open via store
                  }}
                />
                <AdventureMapFullscreen />
              </Suspense>
            </div>

            {/* Site Navigation Atlas */}
            {FEATURE_FLAGS.ATLAS_ENABLED && (
              <div className="mb-8">
                <DashboardAtlas />
              </div>
            )}

            {/* Recent Activity */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <ActivityItem
                  icon={Icons.Dumbbell}
                  title="Completed Chest Workout"
                  subtitle="6 exercises, 45 minutes"
                  time="2h ago"
                  trailing={<span className="text-xs text-[var(--feedback-success)]">+120 XP</span>}
                />
                <ActivityItem
                  icon={Icons.Trophy}
                  title="Achievement Unlocked"
                  subtitle="First Week Warrior"
                  time="1d ago"
                  trailing={<span className="text-xs text-[var(--brand-blue-400)]">+50 XP</span>}
                />
                <ActivityItem
                  icon={Icons.Heart}
                  title="Received High Five"
                  subtitle="From @FitnessPro"
                  time="2d ago"
                />
              </div>
            </div>

            {/* Feature Discovery Section */}
            <div className="mb-8">
              <FeatureDiscovery
                maxVisible={3}
                layout="carousel"
                filter={['social', 'tracking', 'economy', 'competitive']}
                onFeatureClick={handleFeatureClick}
                showProgress
              />
            </div>

            {/* Plugin Widget Slot: Main Dashboard Area */}
            <WidgetSlot
              name="dashboard.main"
              context={{ user, stats, wallet, characterStats }}
              className="mb-8"
              layout="vertical"
              gap={6}
            />
          </div>
        </main>
      </div>

      {/* Floating Action Button for Quick Workout */}
      <FloatingActionButton
        position="bottom-right"
        ariaLabel="Start workout"
        actions={[
          {
            id: 'start-workout',
            icon: <Play className="w-5 h-5" />,
            label: 'Start Workout',
            onClick: () => navigate('/workout'),
            color: 'bg-green-500',
          },
          {
            id: 'exercises',
            icon: <Dumbbell className="w-5 h-5" />,
            label: 'Exercises',
            onClick: () => navigate('/exercises'),
            color: 'bg-blue-500',
          },
          {
            id: 'templates',
            icon: <ClipboardList className="w-5 h-5" />,
            label: 'Templates',
            onClick: () => navigate('/templates'),
            color: 'bg-purple-500',
          },
          {
            id: 'schedule',
            icon: <Calendar className="w-5 h-5" />,
            label: 'Schedule',
            onClick: () => navigate('/schedule'),
            color: 'bg-orange-500',
          },
        ]}
      />

      {/* Mobile Bottom Navigation */}
      <GlassMobileNav items={mobileNavItems} />

      {/* Nutrition Quick Log Modal */}
      <QuickLogModal />

      {/* Feedback System */}
      <FeedbackHub />
      <FeedbackModal />

      {/* Onboarding Tour for new users */}
      <SpotlightTour
        preset="onboarding"
        isOpen={showOnboardingTour}
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
        showProgress
        showSkip
      />

      {/* Active Contextual Tips */}
      <ActiveContextualTip />
    </PullToRefresh>
  );
}
