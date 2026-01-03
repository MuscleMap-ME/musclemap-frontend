/**
 * Design System Showcase
 *
 * Demonstrates the MuscleMap Liquid Glass design system components.
 * Use this page to preview and validate design decisions.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Glass component imports
import {
  GlassSurface,
  GlassCard,
  GlassPanel,
  GlassModal,
  GlassButton,
  GlassIconButton,
  GlassProgressBar,
  GlassCircularProgress,
  GlassLiquidMeter,
  GlassNav,
  AnimatedLogo,
  GlassNavLink,
  MeshBackground,
  MeshBackgroundStatic,
  MuscleActivationCard,
  MuscleIndicator,
  MuscleActivationBar,
  CompactMuscleCard,
} from '../components/glass';

const Section = ({ title, children }) => (
  <section className="mb-16">
    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
      {title}
    </h2>
    {children}
  </section>
);

const SubSection = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-4">
      {title}
    </h3>
    {children}
  </div>
);

const ColorSwatch = ({ name, variable, hex }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-12 h-12 rounded-lg border border-[var(--border-default)]"
      style={{ backgroundColor: `var(${variable})` }}
    />
    <div>
      <div className="text-sm font-medium text-[var(--text-primary)]">{name}</div>
      <div className="text-xs text-[var(--text-tertiary)] font-mono">{variable}</div>
    </div>
  </div>
);

export default function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(65);

  return (
    <div className="min-h-screen relative">
      {/* Animated mesh background */}
      <MeshBackground intensity="medium" />

      {/* Demo navigation */}
      <GlassNav
        brandName="Design System"
        rightContent={
          <GlassButton variant="primary" size="sm">
            Export
          </GlassButton>
        }
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-black text-[var(--text-primary)] mb-4 tracking-tight">
            Liquid Glass
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            MuscleMap's design system inspired by visionOS, iOS 18, and spatial computing.
          </p>
        </motion.div>

        {/* Brand Colors */}
        <Section title="Brand Colors">
          <SubSection title="Primary (from logo)">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Blue 50', var: '--brand-blue-50' },
                { name: 'Blue 100', var: '--brand-blue-100' },
                { name: 'Blue 300', var: '--brand-blue-300' },
                { name: 'Blue 500', var: '--brand-blue-500' },
                { name: 'Blue 700', var: '--brand-blue-700' },
              ].map((c) => (
                <ColorSwatch key={c.var} name={c.name} variable={c.var} />
              ))}
            </div>
          </SubSection>

          <SubSection title="Pulse (accent)">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Pulse 50', var: '--brand-pulse-50' },
                { name: 'Pulse 100', var: '--brand-pulse-100' },
                { name: 'Pulse 300', var: '--brand-pulse-300' },
                { name: 'Pulse 500', var: '--brand-pulse-500' },
                { name: 'Pulse 700', var: '--brand-pulse-700' },
              ].map((c) => (
                <ColorSwatch key={c.var} name={c.name} variable={c.var} />
              ))}
            </div>
          </SubSection>

          <SubSection title="Muscle Groups">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Chest', var: '--muscle-chest' },
                { name: 'Back', var: '--muscle-back' },
                { name: 'Shoulders', var: '--muscle-shoulders' },
                { name: 'Arms', var: '--muscle-arms' },
                { name: 'Legs', var: '--muscle-legs' },
                { name: 'Core', var: '--muscle-core' },
                { name: 'Cardio', var: '--muscle-cardio' },
              ].map((c) => (
                <ColorSwatch key={c.var} name={c.name} variable={c.var} />
              ))}
            </div>
          </SubSection>
        </Section>

        {/* Logo */}
        <Section title="Animated Logo">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <AnimatedLogo size={32} breathing />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">32px</p>
            </div>
            <div className="text-center">
              <AnimatedLogo size={48} breathing />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">48px</p>
            </div>
            <div className="text-center">
              <AnimatedLogo size={64} breathing />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">64px</p>
            </div>
            <div className="text-center">
              <AnimatedLogo size={64} breathing={false} />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">Static</p>
            </div>
          </div>
        </Section>

        {/* Glass Surfaces */}
        <Section title="Glass Surfaces">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassSurface depth="subtle" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Subtle</p>
              <p className="text-xs text-[var(--text-quaternary)]">Light blur, background</p>
            </GlassSurface>
            <GlassSurface depth="default" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Default</p>
              <p className="text-xs text-[var(--text-quaternary)]">Standard glass</p>
            </GlassSurface>
            <GlassSurface depth="medium" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Medium</p>
              <p className="text-xs text-[var(--text-quaternary)]">More depth</p>
            </GlassSurface>
            <GlassSurface depth="heavy" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Heavy</p>
              <p className="text-xs text-[var(--text-quaternary)]">Maximum blur</p>
            </GlassSurface>
          </div>

          <SubSection title="Tinted Glass">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <GlassSurface tint="neutral" className="h-24">
                <p className="text-sm">Neutral</p>
              </GlassSurface>
              <GlassSurface tint="brand" className="h-24">
                <p className="text-sm">Brand (Blue)</p>
              </GlassSurface>
              <GlassSurface tint="pulse" className="h-24">
                <p className="text-sm">Pulse (Magenta)</p>
              </GlassSurface>
            </div>
          </SubSection>

          <SubSection title="Interactive Glass">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <GlassSurface interactive className="h-24">
                <p className="text-sm">Hover me (lifts on hover)</p>
              </GlassSurface>
              <GlassSurface interactive luminousBorder className="h-24">
                <p className="text-sm">With luminous border</p>
              </GlassSurface>
            </div>
          </SubSection>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <SubSection title="Variants">
            <div className="flex flex-wrap gap-4">
              <GlassButton variant="glass">Glass</GlassButton>
              <GlassButton variant="primary">Primary</GlassButton>
              <GlassButton variant="pulse">Pulse</GlassButton>
              <GlassButton variant="glass" disabled>Disabled</GlassButton>
              <GlassButton variant="primary" loading>Loading</GlassButton>
            </div>
          </SubSection>

          <SubSection title="Sizes">
            <div className="flex flex-wrap items-center gap-4">
              <GlassButton size="sm">Small</GlassButton>
              <GlassButton size="md">Medium</GlassButton>
              <GlassButton size="lg">Large</GlassButton>
              <GlassButton size="xl">Extra Large</GlassButton>
            </div>
          </SubSection>

          <SubSection title="Icon Buttons">
            <div className="flex gap-4">
              <GlassIconButton size="sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </GlassIconButton>
              <GlassIconButton size="md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </GlassIconButton>
              <GlassIconButton size="lg" variant="primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </GlassIconButton>
            </div>
          </SubSection>
        </Section>

        {/* Progress Indicators */}
        <Section title="Progress Indicators">
          <SubSection title="Progress Bars">
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Brand</p>
                <GlassProgressBar value={progressValue} variant="brand" showValue />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Pulse</p>
                <GlassProgressBar value={80} variant="pulse" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Success</p>
                <GlassProgressBar value={100} variant="success" size="lg" />
              </div>
            </div>
            <div className="mt-4">
              <input
                type="range"
                min="0"
                max="100"
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-48"
              />
              <span className="ml-4 text-sm text-[var(--text-tertiary)]">
                Drag to animate: {progressValue}%
              </span>
            </div>
          </SubSection>

          <SubSection title="Circular Progress">
            <div className="flex gap-8">
              <GlassCircularProgress value={25} size={64} showValue />
              <GlassCircularProgress value={50} size={80} variant="pulse" showValue />
              <GlassCircularProgress value={75} size={96} variant="success" showValue strokeWidth={6} />
            </div>
          </SubSection>

          <SubSection title="Liquid Meters">
            <div className="flex gap-8">
              <GlassLiquidMeter value={30} label="Hydration" />
              <GlassLiquidMeter value={65} variant="pulse" label="Energy" />
              <GlassLiquidMeter value={90} variant="success" label="Recovery" />
            </div>
          </SubSection>
        </Section>

        {/* Muscle Activation */}
        <Section title="Muscle Activation">
          <SubSection title="Muscle Indicators">
            <div className="flex flex-wrap gap-6">
              {['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'].map((muscle) => (
                <MuscleIndicator key={muscle} muscle={muscle} showLabel size="lg" />
              ))}
            </div>
          </SubSection>

          <SubSection title="Activation Bar">
            <div className="max-w-md">
              <MuscleActivationBar
                muscles={[
                  { muscle: 'chest', percentage: 40 },
                  { muscle: 'shoulders', percentage: 30 },
                  { muscle: 'arms', percentage: 30 },
                ]}
                height={8}
              />
            </div>
          </SubSection>

          <SubSection title="Exercise Cards">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MuscleActivationCard
                name="Bench Press"
                category="Strength"
                muscles={['chest', 'shoulders', 'arms']}
                primaryMuscle="chest"
                equipment="Barbell"
                difficulty="intermediate"
              />
              <MuscleActivationCard
                name="Deadlift"
                category="Compound"
                muscles={['back', 'legs', 'core']}
                primaryMuscle="back"
                equipment="Barbell"
                difficulty="advanced"
              />
              <MuscleActivationCard
                name="Plank"
                category="Core"
                muscles={['core', 'shoulders']}
                primaryMuscle="core"
                equipment="Bodyweight"
                difficulty="beginner"
              />
            </div>
          </SubSection>

          <SubSection title="Compact Cards">
            <div className="max-w-sm space-y-2">
              <CompactMuscleCard
                name="Push-ups"
                muscles={['chest', 'arms']}
                primaryMuscle="chest"
              />
              <CompactMuscleCard
                name="Squats"
                muscles={['legs', 'core']}
                primaryMuscle="legs"
              />
              <CompactMuscleCard
                name="Pull-ups"
                muscles={['back', 'arms']}
                primaryMuscle="back"
              />
            </div>
          </SubSection>
        </Section>

        {/* Cards */}
        <Section title="Glass Cards">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold mb-2">Standard Card</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Basic glass card with subtle depth and hover animation.
              </p>
            </GlassCard>
            <GlassCard className="p-6" interactive={false}>
              <h4 className="text-lg font-semibold mb-2">Static Card</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                No hover effects, for content display.
              </p>
            </GlassCard>
            <GlassCard className="p-0">
              <div className="h-32 bg-gradient-to-br from-[var(--brand-blue-500)] to-[var(--brand-pulse-500)]" />
              <div className="p-4">
                <h4 className="text-lg font-semibold">Media Card</h4>
              </div>
            </GlassCard>
          </div>
        </Section>

        {/* Modal Demo */}
        <Section title="Modal">
          <GlassButton onClick={() => setModalOpen(true)}>
            Open Modal
          </GlassButton>

          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 overlay-backdrop"
                onClick={() => setModalOpen(false)}
              />
              <GlassModal className="relative z-10 w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Glass Modal</h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  This modal uses layered glass with proper backdrop blur hierarchy.
                </p>
                <div className="flex gap-3 justify-end">
                  <GlassButton onClick={() => setModalOpen(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton variant="primary" onClick={() => setModalOpen(false)}>
                    Confirm
                  </GlassButton>
                </div>
              </GlassModal>
            </div>
          )}
        </Section>

        {/* Background Options */}
        <Section title="Backgrounds">
          <p className="text-[var(--text-secondary)] mb-4">
            This page uses the animated mesh gradient. Other options:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassSurface className="h-48 relative overflow-hidden">
              <div className="absolute inset-0">
                <MeshBackgroundStatic intensity="subtle" className="relative" />
              </div>
              <p className="relative z-10 text-sm">Static (subtle)</p>
            </GlassSurface>
            <GlassSurface className="h-48 relative overflow-hidden">
              <div className="absolute inset-0">
                <MeshBackgroundStatic intensity="medium" className="relative" />
              </div>
              <p className="relative z-10 text-sm">Static (medium)</p>
            </GlassSurface>
            <GlassSurface className="h-48 relative overflow-hidden">
              <div className="absolute inset-0">
                <MeshBackgroundStatic intensity="strong" className="relative" />
              </div>
              <p className="relative z-10 text-sm">Static (strong)</p>
            </GlassSurface>
          </div>
        </Section>

        {/* Usage Notes */}
        <Section title="Performance Notes">
          <GlassSurface depth="subtle" className="p-6">
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  <strong>backdrop-filter</strong> is GPU-intensive. Limit to 2-3 simultaneous blurred elements in viewport.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  Use <code className="px-1 bg-[var(--glass-white-10)] rounded">glass-subtle</code> for background elements (less blur = better perf).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  All animations respect <code className="px-1 bg-[var(--glass-white-10)] rounded">prefers-reduced-motion</code>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  Spring-based animations use CSS <code className="px-1 bg-[var(--glass-white-10)] rounded">cubic-bezier</code> for performance.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  Mesh background automatically falls back to static on reduced-motion.
                </span>
              </li>
            </ul>
          </GlassSurface>
        </Section>
      </main>
    </div>
  );
}
