/**
 * Features Page
 *
 * Showcases MuscleMap features with VGA-style graphics, charts, and bars.
 */

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  GlassProgressBar,
  MeshBackground,
  MuscleIndicator,
} from '../components/glass';

// VGA-style color palette
const VGA_COLORS = {
  blue: '#0000AA',
  cyan: '#00AAAA',
  magenta: '#AA00AA',
  red: '#AA0000',
  green: '#00AA00',
  yellow: '#AAAA00',
  white: '#AAAAAA',
  brightBlue: '#5555FF',
  brightCyan: '#55FFFF',
  brightMagenta: '#FF55FF',
  brightRed: '#FF5555',
  brightGreen: '#55FF55',
  brightYellow: '#FFFF55',
  brightWhite: '#FFFFFF',
};

// Feature categories
const FEATURE_CATEGORIES = [
  {
    title: 'Workout System',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4m10 0h4M7 12v4a1 1 0 001 1h1M7 12V8a1 1 0 011-1h1m7 5v4a1 1 0 01-1 1h-1m1-5V8a1 1 0 00-1-1h-1m-4 0h4m-4 10h4" />
      </svg>
    ),
    features: [
      { name: 'AI Workout Generation', progress: 100, status: 'Live' },
      { name: '90+ Exercise Library', progress: 100, status: 'Live' },
      { name: 'Real-time Muscle Activation', progress: 100, status: 'Live' },
      { name: 'Training Units (TU) Tracking', progress: 100, status: 'Live' },
    ],
    color: VGA_COLORS.brightBlue,
  },
  {
    title: 'Progression System',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    features: [
      { name: '10 Training Archetypes', progress: 100, status: 'Live' },
      { name: 'Multi-tier Level System', progress: 100, status: 'Live' },
      { name: 'Milestone Achievements', progress: 100, status: 'Live' },
      { name: 'Journey Visualization', progress: 100, status: 'Live' },
    ],
    color: VGA_COLORS.brightGreen,
  },
  {
    title: 'Social Features',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    features: [
      { name: 'Community Dashboard', progress: 100, status: 'Live' },
      { name: 'Competitions & Challenges', progress: 100, status: 'Live' },
      { name: 'High Fives System', progress: 100, status: 'Live' },
      { name: 'Direct Messaging', progress: 100, status: 'Live' },
    ],
    color: VGA_COLORS.brightMagenta,
  },
  {
    title: 'Cross-Platform Apps',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    features: [
      { name: 'Web Browser (Any)', progress: 100, status: 'Live' },
      { name: 'iOS & Android Apps', progress: 100, status: 'Live' },
      { name: 'Mac, Windows & Linux', progress: 100, status: 'Live' },
      { name: 'Apple Vision Pro', progress: 100, status: 'Live' },
    ],
    color: VGA_COLORS.brightYellow,
  },
];

// Biometric integrations
const BIOMETRIC_INTEGRATIONS = [
  { name: 'Apple HealthKit', status: 'Supported', color: VGA_COLORS.brightGreen },
  { name: 'Google Fit', status: 'Supported', color: VGA_COLORS.brightGreen },
  { name: 'Apple Watch', status: 'Supported', color: VGA_COLORS.brightGreen },
  { name: 'Fitbit', status: 'Supported', color: VGA_COLORS.brightGreen },
  { name: 'Oura Ring', status: 'Supported', color: VGA_COLORS.brightGreen },
  { name: 'Garmin Connect', status: 'Coming Soon', color: VGA_COLORS.brightYellow },
  { name: 'Whoop', status: 'Coming Soon', color: VGA_COLORS.brightYellow },
  { name: 'Polar', status: 'Planned', color: VGA_COLORS.brightCyan },
];

// Platform support
const PLATFORMS = [
  { name: 'Web Browser', icon: '🌐', desc: 'Chrome, Safari, Firefox, Edge' },
  { name: 'iOS', icon: '📱', desc: 'iPhone & iPad' },
  { name: 'Android', icon: '🤖', desc: 'Phones & Tablets' },
  { name: 'macOS', icon: '💻', desc: 'Native Mac App' },
  { name: 'Windows', icon: '🪟', desc: 'Native Windows App' },
  { name: 'Linux', icon: '🐧', desc: 'Native Linux App' },
  { name: 'visionOS', icon: '🥽', desc: 'Apple Vision Pro' },
  { name: 'watchOS', icon: '⌚', desc: 'Apple Watch' },
];

// Archetype data for chart
const ARCHETYPES = [
  { name: 'Bodybuilder', users: 28, color: '#ef4444' },
  { name: 'Powerlifter', users: 22, color: '#3b82f6' },
  { name: 'Gymnast', users: 15, color: '#22c55e' },
  { name: 'CrossFit', users: 12, color: '#f97316' },
  { name: 'Martial Artist', users: 8, color: '#a855f7' },
  { name: 'Runner', users: 7, color: '#14b8a6' },
  { name: 'Other', users: 8, color: '#6b7280' },
];

// VGA Bar Chart Component
const VGABarChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.users));

  return (
    <div className="font-mono">
      <div className="text-center mb-4 text-lg font-bold" style={{ color: VGA_COLORS.brightCyan }}>
        {title}
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-28 text-right text-sm truncate" style={{ color: VGA_COLORS.white }}>
              {item.name}
            </div>
            <div className="flex-1 h-6 bg-black/50 border border-white/20 relative overflow-hidden">
              <motion.div
                className="h-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.users / maxValue) * 100}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
              {/* VGA scanline effect */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 2px, transparent 3px)'
              }} />
            </div>
            <div className="w-10 text-right font-bold" style={{ color: item.color }}>
              {item.users}%
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// VGA Stat Box Component
const VGAStatBox = ({ value, label, color, icon }) => (
  <motion.div
    className="relative p-4 border-2 text-center font-mono"
    style={{ borderColor: color, backgroundColor: 'rgba(0,0,0,0.5)' }}
    whileHover={{ scale: 1.05 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    {/* Corner decorations */}
    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: color }} />
    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: color }} />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: color }} />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: color }} />

    <div className="flex justify-center mb-2" style={{ color }}>
      {icon}
    </div>
    <div className="text-3xl font-black mb-1" style={{ color }}>
      {value}
    </div>
    <div className="text-xs uppercase tracking-wider" style={{ color: VGA_COLORS.white }}>
      {label}
    </div>
  </motion.div>
);

// Feature Card with VGA styling
const FeatureCard = ({ category, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.15 }}
  >
    <GlassCard className="p-6 h-full">
      <div className="flex items-center gap-4 mb-6">
        <div
          className="p-3 rounded-lg border-2"
          style={{ borderColor: category.color, color: category.color }}
        >
          {category.icon}
        </div>
        <h3 className="text-xl font-bold" style={{ color: category.color }}>
          {category.title}
        </h3>
      </div>

      <div className="space-y-4">
        {category.features.map((feature, i) => (
          <div key={feature.name}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[var(--text-secondary)]">{feature.name}</span>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  backgroundColor: feature.status === 'Live' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  color: feature.status === 'Live' ? '#22c55e' : '#eab308'
                }}
              >
                {feature.status}
              </span>
            </div>
            <div className="h-2 bg-black/30 rounded overflow-hidden">
              <motion.div
                className="h-full rounded"
                style={{ backgroundColor: category.color }}
                initial={{ width: 0 }}
                animate={{ width: `${feature.progress}%` }}
                transition={{ duration: 1, delay: i * 0.1 + index * 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  </motion.div>
);

export default function Features() {
  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="medium" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[var(--void-base)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <RouterLink to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="MuscleMap" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              MuscleMap
            </span>
          </RouterLink>

          <nav className="hidden md:flex items-center gap-6">
            <RouterLink to="/features" className="text-sm font-medium text-[var(--brand-blue-400)]">Features</RouterLink>
            <RouterLink to="/technology" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Technology</RouterLink>
            <RouterLink to="/science" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Science</RouterLink>
            <RouterLink to="/design" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Design</RouterLink>
          </nav>

          <div className="flex items-center gap-3">
            <RouterLink to="/login">
              <GlassButton size="sm">Log In</GlassButton>
            </RouterLink>
            <RouterLink to="/signup">
              <GlassButton variant="primary" size="sm">Sign Up</GlassButton>
            </RouterLink>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-5xl md:text-6xl font-black mb-6">
              <span className="text-white">Powerful </span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Features</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              Everything you need to transform your fitness journey with real-time muscle visualization and intelligent workout tracking.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid with VGA Style */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VGAStatBox
              value="90+"
              label="Exercises"
              color={VGA_COLORS.brightBlue}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4m10 0h4M7 12v4a1 1 0 001 1h1M7 12V8a1 1 0 011-1h1m7 5v4a1 1 0 01-1 1h-1m1-5V8a1 1 0 00-1-1h-1m-4 0h4m-4 10h4" /></svg>}
            />
            <VGAStatBox
              value="40+"
              label="Muscles"
              color={VGA_COLORS.brightRed}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            />
            <VGAStatBox
              value="10"
              label="Archetypes"
              color={VGA_COLORS.brightGreen}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
            <VGAStatBox
              value="24/7"
              label="Tracking"
              color={VGA_COLORS.brightMagenta}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span style={{ color: VGA_COLORS.brightCyan }}>FEATURE</span>
            <span className="text-white"> MATRIX</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURE_CATEGORIES.map((category, index) => (
              <FeatureCard key={category.title} category={category} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Archetype Distribution Chart */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <GlassSurface className="p-8">
            <VGABarChart data={ARCHETYPES} title="ARCHETYPE DISTRIBUTION" />
          </GlassSurface>
        </div>
      </section>

      {/* Platform Support */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span style={{ color: VGA_COLORS.brightYellow }}>AVAILABLE</span>
            <span className="text-white"> EVERYWHERE</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PLATFORMS.map((platform, i) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 border-2 text-center font-mono"
                style={{ borderColor: VGA_COLORS.brightYellow, backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                <div className="text-3xl mb-2">{platform.icon}</div>
                <div className="font-bold text-white">{platform.name}</div>
                <div className="text-xs" style={{ color: VGA_COLORS.white }}>{platform.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Biometric Integrations */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span style={{ color: VGA_COLORS.brightMagenta }}>BIOMETRIC</span>
            <span className="text-white"> INTEGRATIONS</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BIOMETRIC_INTEGRATIONS.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 border-2 text-center font-mono"
                style={{ borderColor: item.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                <div className="font-bold mb-1" style={{ color: item.color }}>{item.name}</div>
                <div className="text-xs" style={{ color: VGA_COLORS.white }}>{item.status}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Muscle Groups Display */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span style={{ color: VGA_COLORS.brightCyan }}>MUSCLE</span>
            <span className="text-white"> TRACKING</span>
          </h2>

          <GlassSurface className="p-8">
            <div className="flex flex-wrap justify-center gap-8">
              {['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'].map((muscle, i) => (
                <motion.div
                  key={muscle}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  className="text-center"
                >
                  <MuscleIndicator muscle={muscle} size="xl" showLabel />
                  <div className="mt-2 font-mono text-xs" style={{ color: VGA_COLORS.brightGreen }}>
                    ACTIVE
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassSurface>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <GlassSurface className="p-12" tint="brand">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Join thousands of athletes tracking their progress with MuscleMap.
            </p>
            <RouterLink to="/signup">
              <GlassButton variant="primary" size="lg">
                Get Started Free
              </GlassButton>
            </RouterLink>
          </GlassSurface>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MuscleMap" className="w-8 h-8 rounded" />
            <span className="text-sm text-[var(--text-tertiary)]">
              MuscleMap - See Every Rep. Know Every Muscle.
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-[var(--text-tertiary)]">
            <RouterLink to="/features" className="hover:text-white transition">Features</RouterLink>
            <RouterLink to="/technology" className="hover:text-white transition">Technology</RouterLink>
            <RouterLink to="/science" className="hover:text-white transition">Science</RouterLink>
            <RouterLink to="/design" className="hover:text-white transition">Design</RouterLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
