import React, { lazy, useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
// NOTE: motion import removed - we use SafeMotion exclusively for iOS Lockdown Mode / Brave compatibility
import SEO, { getOrganizationSchema, getWebsiteSchema, getSoftwareAppSchema } from '../components/SEO';
import { useShouldLoadHeavyContent, useAnimationSettings } from '../hooks/useNetworkStatus';
import { MuscleHeroAnimation } from '../components/landing';

// Log that Landing page is rendering (for iOS Brave debugging)
console.log('[Landing] Component rendering');

// Import reusable SafeMotion utilities for iOS Lockdown Mode / Brave compatibility
import { SafeMotion } from '../utils/safeMotion';

// Use SafeMotion components - these automatically detect restrictive environments
// and fall back to static elements with CSS transitions
const SafeMotionDiv = SafeMotion.div;
const SafeMotionH1 = SafeMotion.h1;
const SafeMotionA = SafeMotion.a;
const SafeMotionSpan = SafeMotion.span;

// Lazy load heavy visualization components (D3/Three.js)
const LiveCommunityStats = lazy(() => import('../components/landing/LiveCommunityStats'));

// Hook to only load component when it enters viewport
function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect(); // Only need to trigger once
      }
    }, { rootMargin: '200px', ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, isInView];
}

// Placeholder skeleton for the muscle map
function MuscleMapSkeleton() {
  return (
    <div className="w-[300px] h-[450px] bg-white/5 rounded-xl animate-pulse flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading visualization...</div>
    </div>
  );
}

// Static fallback for slow connections - shows muscle groups without D3
function MuscleMapStaticFallback() {
  return (
    <div className="w-[300px] h-[450px] bg-gradient-to-b from-red-500/10 via-orange-500/5 to-yellow-500/10 rounded-xl flex flex-col items-center justify-center p-6 border border-white/10">
      <div className="text-6xl mb-4">💪</div>
      <div className="text-center">
        <div className="text-white font-semibold mb-2">Muscle Visualization</div>
        <div className="text-gray-400 text-sm mb-4">
          Interactive 3D body map showing real-time muscle activation
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs">
            Chest
          </span>
          <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded text-xs">
            Shoulders
          </span>
          <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded text-xs">
            Arms
          </span>
          <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded text-xs">
            Core
          </span>
        </div>
        <div className="text-gray-500 text-xs mt-4">
          Full visualization on faster connections
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  // Track that Landing actually mounted
  useEffect(() => {
    console.log('[Landing] Component mounted');
    // Send to server for iOS debugging
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/client-error', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({
        type: 'component_mount',
        message: '[Landing] Component mounted',
        source: 'Landing.tsx',
        time: new Date().toISOString()
      }));
    } catch { /* ignore */ }
  }, []);

  // Only load the heavy D3 visualization when it's in view
  const [muscleMapRef, isMuscleMapInView] = useInView();

  // Check network conditions for adaptive loading
  const shouldLoadHeavyContent = useShouldLoadHeavyContent();
  const { enabled: animationsEnabled } = useAnimationSettings();

  // Combined structured data for the landing page
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(),
      getWebsiteSchema(),
      getSoftwareAppSchema(),
    ],
  };

  return (
    <>
      <SEO
        title={null}
        description="See every rep. Know every muscle. Own your progress. MuscleMap visualizes muscle activation in real-time for effective fitness tracking."
        structuredData={structuredData}
      />
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15), transparent 35%), radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.2), transparent 30%)',
        color: '#e5e7eb',
      }}
    >
      <header className="relative z-10 w-full border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <RouterLink
            to="/"
            className="flex items-center gap-3"
          >
            <picture>
              <source srcSet="/logo.avif" type="image/avif" />
              <source srcSet="/logo.webp" type="image/webp" />
              <img
                src="/logo.png"
                alt="MuscleMap"
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg"
                loading="eager"
                fetchPriority="high"
              />
            </picture>
            <span
              className="text-xl font-extrabold"
              style={{
                background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MuscleMap
            </span>
          </RouterLink>

          <div className="flex items-center gap-3">
            <RouterLink
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-200 transition hover:text-white"
            >
              Log In
            </RouterLink>
            <RouterLink
              to="/signup"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Sign Up
            </RouterLink>
          </div>
        </div>
      </header>

      {/* Development Notice Banner */}
      {/* Note: Using SafeMotionDiv with CSS fallback in case Framer Motion fails on iOS Brave */}
      <SafeMotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 animate-fadeIn"
      >
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚧</span>
              <span className="text-amber-300 font-semibold text-sm">Active Development</span>
            </div>
            <p className="text-gray-300 text-sm">
              MuscleMap is under heavy development with features added daily.
              <span className="text-amber-200"> Use as-is</span> — it&apos;s experimental but functional!
            </p>
            <RouterLink
              to="/roadmap"
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
            >
              View Roadmap
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </RouterLink>
          </div>
        </div>
      </SafeMotionDiv>

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center md:py-24">
        {/* CTA Button at top */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <RouterLink
            to="/signup"
            className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/40 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/60"
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            <span>Begin Your Journey</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-50" />
          </RouterLink>
        </SafeMotionDiv>

        {/* Main headline with 3D embossed effect */}
        <SafeMotionH1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 mb-8 text-5xl font-black leading-tight md:text-7xl"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #c7d2fe 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 4px 8px rgba(99, 102, 241, 0.3), 0 8px 32px rgba(139, 92, 246, 0.2)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          Your Goal.{' '}
          <span
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 8px rgba(168, 85, 247, 0.5))',
            }}
          >
            Your Form.
          </span>
          <br />
          <span
            style={{
              display: 'inline-block',
              background: 'linear-gradient(180deg, #ffffff 0%, #e0e7ff 50%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Your Tribe.
          </span>
        </SafeMotionH1>

        {/* Subtext with glass card effect */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          style={{
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <p className="text-lg font-medium text-gray-200 md:text-xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            Build the <span className="text-indigo-400 font-bold">Spartan physique</span>—or lose 10 pounds before summer.
            <br className="hidden md:block" />{' '}
            Train for the <span className="text-purple-400 font-bold">archetype you admire</span>—or the marathon you signed up for.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            <span className="text-indigo-400">✦</span>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          </div>

          <p className="mt-4 text-lg text-gray-300 md:text-xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            See every muscle <span className="text-cyan-400 font-semibold">fire</span>. Find your people along the way.
          </p>
        </SafeMotionDiv>

        {/* Hero Muscle Animation - Small interactive preview */}
        {shouldLoadHeavyContent && (
          <SafeMotionDiv
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10"
          >
            <MuscleHeroAnimation
              interactive
              style="bioluminescent"
              size="sm"
              showLabels={false}
              showParticles={animationsEnabled}
              highlightSequence={['chest', 'shoulders', 'arms']}
              speed="slow"
            />
          </SafeMotionDiv>
        )}
      </main>

      {/* Live Community Stats */}
      <LiveCommunityStats />

      {/* Feature Compass - Visual Navigation */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span
                style={{
                  background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Your Fitness Universe
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need for your fitness journey. Click any card to explore.
            </p>
          </SafeMotionDiv>

          {/* Feature Compass Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Train */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <RouterLink
                to="/workout"
                className="group block p-6 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-orange-500/5 hover:border-red-500/40 hover:from-red-500/20 hover:to-orange-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">💪</div>
                <h3 className="font-bold text-white text-lg mb-1">Train</h3>
                <p className="text-sm text-gray-400">Log workouts & track sets</p>
                <div className="mt-3 flex items-center gap-1 text-red-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Start workout</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Progress */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <RouterLink
                to="/stats"
                className="group block p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 hover:border-blue-500/40 hover:from-blue-500/20 hover:to-cyan-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📊</div>
                <h3 className="font-bold text-white text-lg mb-1">Progress</h3>
                <p className="text-sm text-gray-400">Stats, charts & PRs</p>
                <div className="mt-3 flex items-center gap-1 text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View stats</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Exercises */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <RouterLink
                to="/exercises"
                className="group block p-6 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/5 hover:border-green-500/40 hover:from-green-500/20 hover:to-emerald-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏋️</div>
                <h3 className="font-bold text-white text-lg mb-1">Exercises</h3>
                <p className="text-sm text-gray-400">500+ movements</p>
                <div className="mt-3 flex items-center gap-1 text-green-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Browse library</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Achievements */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <RouterLink
                to="/achievements"
                className="group block p-6 rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 hover:border-yellow-500/40 hover:from-yellow-500/20 hover:to-amber-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏆</div>
                <h3 className="font-bold text-white text-lg mb-1">Achievements</h3>
                <p className="text-sm text-gray-400">Badges & milestones</p>
                <div className="mt-3 flex items-center gap-1 text-yellow-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View trophies</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Goals */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <RouterLink
                to="/goals"
                className="group block p-6 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/5 hover:border-purple-500/40 hover:from-purple-500/20 hover:to-violet-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎯</div>
                <h3 className="font-bold text-white text-lg mb-1">Goals</h3>
                <p className="text-sm text-gray-400">Set & crush targets</p>
                <div className="mt-3 flex items-center gap-1 text-purple-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Set goals</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Skills */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <RouterLink
                to="/skills"
                className="group block p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 hover:border-cyan-500/40 hover:from-cyan-500/20 hover:to-teal-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚡</div>
                <h3 className="font-bold text-white text-lg mb-1">Skills</h3>
                <p className="text-sm text-gray-400">RPG-style progression</p>
                <div className="mt-3 flex items-center gap-1 text-cyan-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Level up</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Community */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <RouterLink
                to="/community"
                className="group block p-6 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-rose-500/5 hover:border-pink-500/40 hover:from-pink-500/20 hover:to-rose-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                <h3 className="font-bold text-white text-lg mb-1">Community</h3>
                <p className="text-sm text-gray-400">Find your tribe</p>
                <div className="mt-3 flex items-center gap-1 text-pink-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Join now</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>

            {/* Plugins */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <RouterLink
                to="/plugins"
                className="group block p-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 hover:border-indigo-500/40 hover:from-indigo-500/20 hover:to-violet-500/10 transition-all duration-300"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🧩</div>
                <h3 className="font-bold text-white text-lg mb-1">Plugins</h3>
                <p className="text-sm text-gray-400">Extend & customize</p>
                <div className="mt-3 flex items-center gap-1 text-indigo-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Browse plugins</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </RouterLink>
            </SafeMotionDiv>
          </div>

          {/* Secondary Features Row */}
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { to: '/rivals', icon: '⚔️', label: 'Rivals', color: 'red' },
              { to: '/crews', icon: '🛡️', label: 'Crews', color: 'blue' },
              { to: '/martial-arts', icon: '🥋', label: 'Martial Arts', color: 'orange' },
              { to: '/wallet', icon: '💎', label: 'Wallet', color: 'emerald' },
            ].map((item, _i) => (
              <RouterLink
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-${item.color}-500/30 transition-all`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="font-medium text-white text-sm">{item.label}</span>
              </RouterLink>
            ))}
          </SafeMotionDiv>
        </div>
      </section>

      {/* Interactive Muscle Map Demo */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span
                style={{
                  background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                See Your Muscles Fire
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Real-time muscle activation visualization. Every rep, every set — watch your body work.
            </p>
          </SafeMotionDiv>

          <SafeMotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col lg:flex-row gap-8 items-center justify-center"
            ref={muscleMapRef}
          >
            {/* Muscle Visualization */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-red-500/20 via-transparent to-orange-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                {isMuscleMapInView ? (
                  shouldLoadHeavyContent ? (
                    <MuscleHeroAnimation
                      autoPlay
                      highlightSequence={['chest', 'shoulders', 'arms', 'core', 'legs']}
                      style="bioluminescent"
                      size="lg"
                      showParticles={animationsEnabled}
                      showLabels
                      interactive
                      speed="normal"
                    />
                  ) : (
                    <MuscleMapStaticFallback />
                  )
                ) : (
                  <MuscleMapSkeleton />
                )}
              </div>
            </div>

            {/* Exercise Info */}
            <div className="max-w-xs space-y-4">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Exercise</div>
                <div className="text-xl font-bold text-white">Bench Press</div>
                <div className="text-sm text-gray-500">Compound Movement</div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-2">Primary Muscles</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs font-medium">
                    Chest 85%
                  </span>
                  <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded text-xs font-medium">
                    Shoulders 70%
                  </span>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-2">Secondary Muscles</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded text-xs font-medium">
                    Triceps 50%
                  </span>
                  <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded text-xs font-medium">
                    Core 40%
                  </span>
                </div>
              </div>

              {/* Interactive hint */}
              <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 backdrop-blur-sm border border-violet-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-violet-400 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Click any muscle to explore</span>
                </div>
              </div>
            </div>
          </SafeMotionDiv>
        </div>
      </section>

      {/* How It Works - Visual Architecture */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span
                style={{
                  background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                How It Works
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              One platform, any device. Your data flows securely through our GraphQL API.
            </p>
          </SafeMotionDiv>

          {/* Architecture Diagram */}
          <SafeMotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 mb-12"
          >
            {/* Device Layer */}
            <div className="flex justify-center gap-4 md:gap-8 mb-6 flex-wrap">
              {[
                { icon: '🌐', label: 'Web Browser', desc: 'Chrome, Safari, Firefox' },
                { icon: '📱', label: 'iOS & Android', desc: 'Native Apps' },
                { icon: '⌚', label: 'Apple Watch', desc: 'Wearables' },
                { icon: '🥽', label: 'Vision Pro', desc: 'Spatial Computing' },
              ].map((device, i) => (
                <SafeMotionDiv
                  key={device.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors"
                >
                  <span className="text-2xl mb-1">{device.icon}</span>
                  <span className="text-xs font-medium text-white">{device.label}</span>
                  <span className="text-[10px] text-gray-500">{device.desc}</span>
                </SafeMotionDiv>
              ))}
            </div>

            {/* Connection Lines */}
            <div className="flex justify-center mb-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-8 bg-gradient-to-b from-blue-500/50 to-purple-500/50" />
                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-purple-500/30 text-xs text-purple-300 font-mono">
                  HTTPS / SSL Encrypted
                </div>
                <div className="w-px h-8 bg-gradient-to-b from-purple-500/50 to-cyan-500/50" />
              </div>
            </div>

            {/* API Layer */}
            <SafeMotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center mb-4"
            >
              <div className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-white">Fastify API + GraphQL</div>
                    <div className="text-xs text-gray-400">Single endpoint for all data</div>
                  </div>
                </div>
              </div>
            </SafeMotionDiv>

            {/* Connection to DB */}
            <div className="flex justify-center mb-4">
              <div className="w-px h-8 bg-gradient-to-b from-cyan-500/50 to-green-500/50" />
            </div>

            {/* Database Layer */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center gap-4"
            >
              <div className="px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold text-sm">PostgreSQL</span>
                  <span className="text-[10px] text-gray-500">Single Source of Truth</span>
                </div>
              </div>
              <div className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold text-sm">Redis</span>
                  <span className="text-[10px] text-gray-500">Cache & Real-time</span>
                </div>
              </div>
            </SafeMotionDiv>

            {/* Tech Stack Pills */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex flex-wrap justify-center gap-2">
                {['React', 'TypeScript', 'Fastify', 'Caddy', 'React Native', 'Expo'].map((tech, i) => (
                  <SafeMotionSpan
                    key={tech}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.05 }}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 font-mono"
                  >
                    {tech}
                  </SafeMotionSpan>
                ))}
              </div>
              <p className="text-center text-xs text-gray-600 mt-3">
                No Docker. No SQLite. No Express. No Nginx. Just clean, modern infrastructure.
              </p>
            </div>
          </SafeMotionDiv>

          {/* Feature Examples Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Real-time Muscle Tracking */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-red-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="font-bold text-white mb-2">Real-time Muscle Tracking</h3>
              <p className="text-sm text-gray-400 mb-4">See exactly which muscles you&apos;re hitting with every exercise.</p>
              <div className="flex gap-2">
                {['Chest', 'Back', 'Legs'].map((muscle) => (
                  <span key={muscle} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs">
                    {muscle}
                  </span>
                ))}
              </div>
            </SafeMotionDiv>

            {/* AI Workout Generation */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-purple-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-bold text-white mb-2">AI-Generated Workouts</h3>
              <p className="text-sm text-gray-400 mb-4">Get personalized workouts based on your goals and archetype.</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded bg-purple-500/20">
                  <div className="h-full w-3/4 rounded bg-gradient-to-r from-purple-500 to-pink-500" />
                </div>
                <span className="text-xs text-purple-400">75%</span>
              </div>
            </SafeMotionDiv>

            {/* Cross-Platform Sync */}
            <SafeMotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-blue-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="font-bold text-white mb-2">Instant Cross-Platform Sync</h3>
              <p className="text-sm text-gray-400 mb-4">Start on your phone, continue on web. Always in sync.</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Web</span>
                <span className="text-blue-400">Synced</span>
                <span>Mobile</span>
              </div>
            </SafeMotionDiv>
          </div>
        </div>
      </section>

      {/* Open Source & Community Section */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-6">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-green-400 font-semibold text-sm">Open Source Frontend</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span
                style={{
                  background: 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Built by the Community,
              </span>
              <br />
              <span className="text-white">For the Community</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              MuscleMap&apos;s frontend is open source. Build plugins, create themes, add features —
              the platform grows with every contribution.
            </p>
          </SafeMotionDiv>

          {/* Stats Row */}
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-2xl font-bold text-green-400">100%</div>
              <div className="text-sm text-gray-400">Open Source UI</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-2xl font-bold text-purple-400">∞</div>
              <div className="text-sm text-gray-400">Plugin Slots</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-2xl font-bold text-cyan-400">MIT</div>
              <div className="text-sm text-gray-400">License</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-2xl font-bold text-yellow-400">🧩</div>
              <div className="text-sm text-gray-400">Extensible</div>
            </div>
          </SafeMotionDiv>

          {/* Plugin System Highlight */}
          <SafeMotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 p-8 mb-12 overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col lg:flex-row gap-8 items-center">
              {/* Left: Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-2xl">🧩</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Plugin Marketplace</h3>
                    <p className="text-sm text-gray-400">Extend MuscleMap your way</p>
                  </div>
                </div>

                <p className="text-gray-300 mb-6">
                  Our plugin system lets you add dashboard widgets, create new pages, build custom themes,
                  and integrate with external services. If you can imagine it, you can build it.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { icon: '📊', label: 'Dashboard Widgets', desc: 'Add custom stat cards' },
                    { icon: '🎨', label: 'Custom Themes', desc: 'Design your own look' },
                    { icon: '📱', label: 'New Pages', desc: 'Build entire features' },
                    { icon: '🔗', label: 'Integrations', desc: 'Connect external apps' },
                  ].map((item, i) => (
                    <SafeMotionDiv
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                    </SafeMotionDiv>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <RouterLink
                    to="/plugins"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Browse Plugins
                  </RouterLink>
                  <a
                    href="https://github.com/MuscleMap-ME/musclemap-frontend"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    View on GitHub
                  </a>
                </div>
              </div>

              {/* Right: Code Preview */}
              <div className="flex-shrink-0 w-full lg:w-80">
                <div className="rounded-xl bg-black/60 border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-gray-500 font-mono ml-2">plugin.json</span>
                  </div>
                  <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto">
{`{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "contributes": {
    "widgets": [{
      "slot": "dashboard.main",
      "component": "MyWidget"
    }],
    "themes": [{
      "id": "dark-neon",
      "name": "Dark Neon"
    }]
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </SafeMotionDiv>

          {/* Contribute CTA */}
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Build a Plugin */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-green-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🛠️</span>
              </div>
              <h3 className="font-bold text-white mb-2">Build a Plugin</h3>
              <p className="text-sm text-gray-400 mb-4">Create widgets, themes, or entire features. Our SDK makes it easy.</p>
              <RouterLink
                to="/docs/plugins"
                className="inline-flex items-center gap-1 text-green-400 text-sm font-medium hover:text-green-300 transition-colors"
              >
                Read the docs
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </RouterLink>
            </div>

            {/* Contribute Code */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-blue-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💻</span>
              </div>
              <h3 className="font-bold text-white mb-2">Contribute Code</h3>
              <p className="text-sm text-gray-400 mb-4">Found a bug? Have an idea? PRs are welcome on GitHub.</p>
              <a
                href="https://github.com/MuscleMap-ME/musclemap-frontend/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors"
              >
                View issues
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Join Community */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="font-bold text-white mb-2">Join the Community</h3>
              <p className="text-sm text-gray-400 mb-4">Connect with other developers and fitness enthusiasts.</p>
              <RouterLink
                to="/community"
                className="inline-flex items-center gap-1 text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
              >
                Explore community
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </RouterLink>
            </div>
          </SafeMotionDiv>
        </div>
      </section>

      {/* Explore Section with Navigation Icons */}
      <section className="relative z-10 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Navigation Icons */}
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {/* Features */}
            <RouterLink
              to="/features"
              className="group p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">Features</h3>
                <p className="text-xs text-gray-400">Explore capabilities</p>
              </div>
            </RouterLink>

            {/* Technology */}
            <RouterLink
              to="/technology"
              className="group p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">Technology</h3>
                <p className="text-xs text-gray-400">Under the hood</p>
              </div>
            </RouterLink>

            {/* Science */}
            <RouterLink
              to="/science"
              className="group p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">Science</h3>
                <p className="text-xs text-gray-400">The methodology</p>
              </div>
            </RouterLink>

            {/* Design */}
            <RouterLink
              to="/design"
              className="group p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-pink-500/30 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white mb-1">Design</h3>
                <p className="text-xs text-gray-400">Visual system</p>
              </div>
            </RouterLink>
          </SafeMotionDiv>

          {/* Learn MuscleMap - Your Journey Section */}
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-16 w-full"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-3">
                <span
                  style={{
                    background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Start Your Journey
                </span>
              </h3>
              <p className="text-gray-400 max-w-xl mx-auto">
                Everything you need to master MuscleMap - from your first workout to advanced features.
              </p>
            </div>

            {/* Journey Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Step 1: Getting Started */}
              <SafeMotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <RouterLink
                  to="/docs/getting-started"
                  className="group block h-full p-6 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent backdrop-blur-sm hover:border-green-500/50 hover:bg-green-500/10 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <span className="text-2xl">1</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg mb-2">Getting Started</h4>
                      <p className="text-sm text-gray-400 mb-3">Create your account, choose your archetype, and log your first workout in minutes.</p>
                      <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                        <span>Read guide</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </RouterLink>
              </SafeMotionDiv>

              {/* Step 2: Explore Features */}
              <SafeMotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <RouterLink
                  to="/docs/features"
                  className="group block h-full p-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent backdrop-blur-sm hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <span className="text-2xl">2</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg mb-2">Explore Features</h4>
                      <p className="text-sm text-gray-400 mb-3">Discover muscle tracking, AI prescriptions, RPG progression, and character stats.</p>
                      <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium">
                        <span>See all features</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </RouterLink>
              </SafeMotionDiv>

              {/* Step 3: Join Community */}
              <SafeMotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <RouterLink
                  to="/docs/community"
                  className="group block h-full p-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent backdrop-blur-sm hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <span className="text-2xl">3</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg mb-2">Join the Community</h4>
                      <p className="text-sm text-gray-400 mb-3">Find your tribe with Hangouts, Crews, Rivalries, and connect with fellow lifters.</p>
                      <div className="flex items-center gap-1 text-violet-400 text-sm font-medium">
                        <span>Community guide</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </RouterLink>
              </SafeMotionDiv>
            </div>

            {/* Quick Links Row */}
            <SafeMotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <RouterLink
                to="/docs/guides"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-blue-500/30 hover:text-white transition-all"
              >
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                User Guides
              </RouterLink>
              <RouterLink
                to="/docs/api"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-cyan-500/30 hover:text-white transition-all"
              >
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                API Reference
              </RouterLink>
              <RouterLink
                to="/docs"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-white hover:from-indigo-500/30 hover:to-purple-500/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                All Documentation
              </RouterLink>
            </SafeMotionDiv>
          </SafeMotionDiv>

          {/* Visual Documentation - Front and Center */}
          <SafeMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 w-full"
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">
                <span
                  style={{
                    background: 'linear-gradient(90deg, #a855f7 0%, #6366f1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Visual Documentation
                </span>
              </h3>
              <p className="text-gray-400 text-sm">
                Beautiful LaTeX-generated guides with diagrams and examples
              </p>
            </div>

            {/* PDF Document Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Architecture PDF */}
              <SafeMotionA
                href="/docs/pdf/musclemap-architecture.pdf"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group p-5 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent backdrop-blur-sm hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">System Architecture</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/30 text-purple-300">PDF</span>
                    </div>
                    <p className="text-xs text-gray-400">Data flow diagrams, tech stack, deployment guide</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </SafeMotionA>

              {/* Features PDF */}
              <SafeMotionA
                href="/docs/pdf/musclemap-features.pdf"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group p-5 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent backdrop-blur-sm hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">Feature Guide</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/30 text-yellow-300">PDF</span>
                    </div>
                    <p className="text-xs text-gray-400">Muscle tracking, archetypes, RPG progression</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </SafeMotionA>

              {/* API Reference PDF */}
              <SafeMotionA
                href="/docs/pdf/musclemap-api-reference.pdf"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group p-5 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent backdrop-blur-sm hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">API Reference</h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/30 text-cyan-300">PDF</span>
                    </div>
                    <p className="text-xs text-gray-400">Printable quick reference card for all endpoints</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </SafeMotionA>
            </div>

            {/* Text docs fallback link */}
            <SafeMotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center"
            >
              <RouterLink
                to="/docs"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View complete documentation library
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </RouterLink>
            </SafeMotionDiv>
          </SafeMotionDiv>

          {/* Subtle footer links */}
          <SafeMotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500"
          >
            <RouterLink to="/features" className="hover:text-gray-300 transition">Features</RouterLink>
            <RouterLink to="/technology" className="hover:text-gray-300 transition">Technology</RouterLink>
            <RouterLink to="/science" className="hover:text-gray-300 transition">Science</RouterLink>
            <RouterLink to="/design" className="hover:text-gray-300 transition">Design</RouterLink>
            <RouterLink to="/docs" className="hover:text-violet-400 transition font-medium">Documentation</RouterLink>
          </SafeMotionDiv>
        </div>
      </section>
    </div>
    </>
  );
}
