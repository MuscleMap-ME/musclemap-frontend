/**
 * Design Page
 *
 * Showcases MuscleMap's design system with links to the interactive design system page.
 */

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  GlassProgressBar,
  GlassCircularProgress,
  MeshBackground,
  MuscleIndicator,
  AnimatedLogo,
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

// Design principles
const DESIGN_PRINCIPLES = [
  {
    title: 'Liquid Glass',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    description: 'Inspired by visionOS and iOS 18, our glass morphism creates depth and hierarchy through layered transparency and blur.',
    color: VGA_COLORS.brightCyan,
  },
  {
    title: 'Spatial Computing',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    description: 'Elements exist in 3D space with natural depth cues, shadows, and lighting inspired by Apple Vision Pro interfaces.',
    color: VGA_COLORS.brightBlue,
  },
  {
    title: 'Motion Design',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description: 'Spring-based physics animations create natural, responsive interactions that feel alive and organic.',
    color: VGA_COLORS.brightGreen,
  },
  {
    title: 'Muscle-Driven Color',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    description: 'Each muscle group has a distinct color identity, creating intuitive visual feedback for muscle activation.',
    color: VGA_COLORS.brightMagenta,
  },
];

// Color palette data
const COLOR_PALETTE = {
  brand: [
    { name: 'Blue 500', value: '#0066FF', desc: 'Primary brand' },
    { name: 'Pulse 500', value: '#FF3366', desc: 'Accent/energy' },
  ],
  muscles: [
    { name: 'Chest', value: '#ef4444' },
    { name: 'Back', value: '#3b82f6' },
    { name: 'Shoulders', value: '#f97316' },
    { name: 'Arms', value: '#a855f7' },
    { name: 'Legs', value: '#22c55e' },
    { name: 'Core', value: '#eab308' },
    { name: 'Cardio', value: '#ec4899' },
  ],
  void: [
    { name: 'Void Deep', value: '#050508' },
    { name: 'Void Base', value: '#0a0a0f' },
    { name: 'Void Elevated', value: '#12121a' },
  ],
};

// Component showcase items
const COMPONENTS = [
  { name: 'GlassSurface', desc: 'Core primitive with depth & tint variants' },
  { name: 'GlassButton', desc: 'Interactive buttons with spring animations' },
  { name: 'GlassProgress', desc: 'Progress bars, circles, and liquid meters' },
  { name: 'GlassNav', desc: 'Navigation with animated logo' },
  { name: 'MeshBackground', desc: 'Animated gradient backgrounds' },
  { name: 'MuscleActivationCard', desc: 'Exercise cards with muscle indicators' },
];

// Color Swatch Component
const ColorSwatch = ({ name, value, desc }) => (
  <motion.div
    className="flex items-center gap-3"
    whileHover={{ x: 5 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div
      className="w-12 h-12 rounded-lg border border-white/20"
      style={{ backgroundColor: value }}
    />
    <div>
      <div className="text-sm font-medium text-white">{name}</div>
      <div className="text-xs font-mono" style={{ color: VGA_COLORS.white }}>{value}</div>
      {desc && <div className="text-xs" style={{ color: VGA_COLORS.brightCyan }}>{desc}</div>}
    </div>
  </motion.div>
);

// Principle Card Component
const PrincipleCard = ({ principle, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.15 }}
  >
    <GlassCard className="p-6 h-full">
      <div className="flex items-center gap-4 mb-4">
        <div
          className="p-3 rounded-lg border-2"
          style={{ borderColor: principle.color, color: principle.color }}
        >
          {principle.icon}
        </div>
        <h3 className="text-xl font-bold" style={{ color: principle.color }}>
          {principle.title}
        </h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {principle.description}
      </p>
    </GlassCard>
  </motion.div>
);

// Glass Depth Demo
const GlassDepthDemo = () => (
  <div className="grid grid-cols-4 gap-4">
    {['subtle', 'default', 'medium', 'heavy'].map((depth, i) => (
      <motion.div
        key={depth}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.1 }}
      >
        <GlassSurface depth={depth} className="h-24 flex items-center justify-center">
          <span className="text-sm capitalize">{depth}</span>
        </GlassSurface>
      </motion.div>
    ))}
  </div>
);

// Typography Demo
const TypographyDemo = () => (
  <div className="space-y-4">
    <div>
      <span className="text-xs uppercase tracking-wider" style={{ color: VGA_COLORS.white }}>Display</span>
      <div className="text-4xl font-black text-white">MuscleMap</div>
    </div>
    <div>
      <span className="text-xs uppercase tracking-wider" style={{ color: VGA_COLORS.white }}>Heading</span>
      <div className="text-2xl font-bold text-white">Your Fitness Journey</div>
    </div>
    <div>
      <span className="text-xs uppercase tracking-wider" style={{ color: VGA_COLORS.white }}>Body</span>
      <div className="text-base text-[var(--text-secondary)]">Real-time muscle activation visualization for every workout.</div>
    </div>
    <div>
      <span className="text-xs uppercase tracking-wider" style={{ color: VGA_COLORS.white }}>Caption</span>
      <div className="text-sm text-[var(--text-tertiary)]">Last workout: 2 hours ago</div>
    </div>
  </div>
);

// Animation Demo
const AnimationDemo = () => {
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-8 py-8">
      <motion.div
        animate={{
          scale: pulse ? 1.1 : 1,
          boxShadow: pulse
            ? '0 0 30px rgba(0, 102, 255, 0.4)'
            : '0 0 15px rgba(0, 102, 255, 0.2)'
        }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="w-20 h-20 rounded-2xl bg-[var(--brand-blue-500)]/20 border border-[var(--brand-blue-500)]/30 flex items-center justify-center"
      >
        <span style={{ color: VGA_COLORS.brightBlue }}>Spring</span>
      </motion.div>

      <motion.div
        animate={{
          rotate: pulse ? 360 : 0,
        }}
        transition={{ duration: 1, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-[var(--brand-pulse-500)]/20 border border-[var(--brand-pulse-500)]/30 flex items-center justify-center"
      >
        <span style={{ color: VGA_COLORS.brightMagenta }}>Rotate</span>
      </motion.div>

      <motion.div
        animate={{
          y: pulse ? -10 : 0,
          boxShadow: pulse
            ? '0 20px 40px rgba(0, 0, 0, 0.4)'
            : '0 5px 15px rgba(0, 0, 0, 0.2)'
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-2xl bg-[var(--feedback-success)]/20 border border-[var(--feedback-success)]/30 flex items-center justify-center"
      >
        <span style={{ color: VGA_COLORS.brightGreen }}>Lift</span>
      </motion.div>
    </div>
  );
};

export default function Design() {
  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="medium" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[var(--void-base)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <RouterLink to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="MuscleMap" className="w-8 h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              MuscleMap
            </span>
          </RouterLink>

          <nav className="hidden md:flex items-center gap-6">
            <RouterLink to="/features" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Features</RouterLink>
            <RouterLink to="/technology" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Technology</RouterLink>
            <RouterLink to="/science" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Science</RouterLink>
            <RouterLink to="/design" className="text-sm font-medium text-[var(--brand-blue-400)]">Design</RouterLink>
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
            <div className="flex justify-center mb-6">
              <AnimatedLogo size={80} breathing />
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-6 font-mono">
              <span style={{ color: VGA_COLORS.brightCyan }}>LIQUID</span>
              <span className="text-white"> GLASS</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
              A design system inspired by visionOS, iOS 18, and spatial computing interfaces.
            </p>

            <RouterLink to="/design-system">
              <GlassButton variant="primary" size="lg">
                Explore Interactive Design System
              </GlassButton>
            </RouterLink>
          </motion.div>
        </div>
      </section>

      {/* Design Principles */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightCyan }}>DESIGN</span>
            <span className="text-white"> PRINCIPLES</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DESIGN_PRINCIPLES.map((principle, index) => (
              <PrincipleCard key={principle.title} principle={principle} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Glass Depth */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightBlue }}>GLASS</span>
            <span className="text-white"> DEPTH</span>
          </h2>

          <GlassSurface className="p-8">
            <GlassDepthDemo />
          </GlassSurface>
        </div>
      </section>

      {/* Color Palette */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightMagenta }}>COLOR</span>
            <span className="text-white"> PALETTE</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Brand Colors */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: VGA_COLORS.brightCyan }}>Brand</h3>
              <div className="space-y-4">
                {COLOR_PALETTE.brand.map(c => (
                  <ColorSwatch key={c.name} {...c} />
                ))}
              </div>
            </GlassCard>

            {/* Muscle Colors */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: VGA_COLORS.brightCyan }}>Muscles</h3>
              <div className="space-y-3">
                {COLOR_PALETTE.muscles.map(c => (
                  <ColorSwatch key={c.name} {...c} />
                ))}
              </div>
            </GlassCard>

            {/* Void Colors */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: VGA_COLORS.brightCyan }}>Void</h3>
              <div className="space-y-4">
                {COLOR_PALETTE.void.map(c => (
                  <ColorSwatch key={c.name} {...c} />
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Muscle Indicators */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightRed }}>MUSCLE</span>
            <span className="text-white"> INDICATORS</span>
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
                </motion.div>
              ))}
            </div>
          </GlassSurface>
        </div>
      </section>

      {/* Typography */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightYellow }}>TYPOGRAPHY</span>
          </h2>

          <GlassSurface className="p-8">
            <TypographyDemo />
          </GlassSurface>
        </div>
      </section>

      {/* Animation */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightGreen }}>MOTION</span>
            <span className="text-white"> DESIGN</span>
          </h2>

          <GlassSurface className="p-8">
            <AnimationDemo />
          </GlassSurface>
        </div>
      </section>

      {/* Component Library */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightCyan }}>COMPONENT</span>
            <span className="text-white"> LIBRARY</span>
          </h2>

          <GlassSurface className="p-8">
            <div className="grid md:grid-cols-2 gap-4">
              {COMPONENTS.map((comp, i) => (
                <motion.div
                  key={comp.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 border border-white/10 rounded-lg"
                >
                  <div className="font-mono text-sm" style={{ color: VGA_COLORS.brightCyan }}>
                    {comp.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: VGA_COLORS.white }}>
                    {comp.desc}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <RouterLink to="/design-system">
                <GlassButton variant="glass" size="lg">
                  View Full Component Library
                </GlassButton>
              </RouterLink>
            </div>
          </GlassSurface>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <GlassSurface className="p-12" tint="brand">
            <h2 className="text-3xl font-bold text-white mb-4">
              Explore the Full Design System
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Interactive components, color tokens, spacing scales, and more.
            </p>
            <RouterLink to="/design-system">
              <GlassButton variant="primary" size="lg">
                Launch Design System
              </GlassButton>
            </RouterLink>
          </GlassSurface>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="MuscleMap" className="w-6 h-6" />
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
