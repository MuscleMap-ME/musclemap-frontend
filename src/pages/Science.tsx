/**
 * Science Page
 *
 * Explains the science behind MuscleMap's Training Units and muscle activation system.
 */

import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  MeshBackground,
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

// Muscle bias weight data
const MUSCLE_BIAS_DATA = [
  { muscle: 'Glutes', biasWeight: 22, size: 'Large', color: '#22c55e' },
  { muscle: 'Latissimus Dorsi', biasWeight: 20, size: 'Large', color: '#3b82f6' },
  { muscle: 'Quadriceps', biasWeight: 20, size: 'Large', color: '#22c55e' },
  { muscle: 'Pectoralis Major', biasWeight: 16, size: 'Medium', color: '#ef4444' },
  { muscle: 'Deltoids', biasWeight: 12, size: 'Medium', color: '#f97316' },
  { muscle: 'Biceps', biasWeight: 8, size: 'Small', color: '#a855f7' },
  { muscle: 'Triceps', biasWeight: 8, size: 'Small', color: '#a855f7' },
  { muscle: 'Rear Delts', biasWeight: 4, size: 'Small', color: '#f97316' },
];

// Exercise activation examples
const EXERCISE_ACTIVATIONS = [
  {
    name: 'Bench Press',
    muscles: [
      { name: 'Pectoralis Major', activation: 85, type: 'Primary' },
      { name: 'Anterior Deltoids', activation: 60, type: 'Secondary' },
      { name: 'Triceps', activation: 55, type: 'Secondary' },
      { name: 'Serratus Anterior', activation: 25, type: 'Stabilizer' },
    ],
  },
  {
    name: 'Deadlift',
    muscles: [
      { name: 'Glutes', activation: 90, type: 'Primary' },
      { name: 'Hamstrings', activation: 80, type: 'Primary' },
      { name: 'Erector Spinae', activation: 75, type: 'Primary' },
      { name: 'Quadriceps', activation: 50, type: 'Secondary' },
      { name: 'Core', activation: 45, type: 'Stabilizer' },
    ],
  },
  {
    name: 'Pull-ups',
    muscles: [
      { name: 'Latissimus Dorsi', activation: 95, type: 'Primary' },
      { name: 'Biceps', activation: 70, type: 'Secondary' },
      { name: 'Rhomboids', activation: 55, type: 'Secondary' },
      { name: 'Forearms', activation: 40, type: 'Stabilizer' },
    ],
  },
];

// HRV & Recovery data
const RECOVERY_METRICS = [
  { name: 'Sleep Quality', weight: 30, desc: 'Total sleep & deep sleep duration' },
  { name: 'HRV Status', weight: 25, desc: 'Heart rate variability vs baseline' },
  { name: 'Resting HR', weight: 15, desc: 'Morning resting heart rate' },
  { name: 'Recovery Time', weight: 20, desc: 'Hours since last workout' },
  { name: 'Muscle Recovery', weight: 10, desc: 'TU decay calculation' },
];

// VGA Formula Display Component
const FormulaDisplay = ({ title, formula, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 border-2 rounded-lg font-mono"
    style={{ borderColor: VGA_COLORS.brightCyan, backgroundColor: 'rgba(0,0,0,0.5)' }}
  >
    <div className="text-sm uppercase tracking-wider mb-2" style={{ color: VGA_COLORS.white }}>
      {title}
    </div>
    <div className="text-xl font-bold mb-3" style={{ color: VGA_COLORS.brightCyan }}>
      {formula}
    </div>
    <div className="text-sm" style={{ color: VGA_COLORS.white }}>
      {description}
    </div>
  </motion.div>
);

// Interactive TU Calculator
const TUCalculator = () => {
  const [activation, setActivation] = useState(80);
  const [biasWeight, setBiasWeight] = useState(16);

  const normalizedTU = ((activation / biasWeight) * 100).toFixed(1);

  return (
    <GlassSurface className="p-6">
      <h3 className="text-lg font-bold mb-6 font-mono" style={{ color: VGA_COLORS.brightYellow }}>
        INTERACTIVE TU CALCULATOR
      </h3>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm mb-2" style={{ color: VGA_COLORS.white }}>
            Raw Activation: {activation}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={activation}
            onChange={(e) => setActivation(Number(e.target.value))}
            className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: VGA_COLORS.brightGreen }}
          />
        </div>

        <div>
          <label className="block text-sm mb-2" style={{ color: VGA_COLORS.white }}>
            Bias Weight: {biasWeight}
          </label>
          <input
            type="range"
            min="4"
            max="22"
            value={biasWeight}
            onChange={(e) => setBiasWeight(Number(e.target.value))}
            className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: VGA_COLORS.brightBlue }}
          />
        </div>
      </div>

      <div className="p-4 border-2 text-center rounded" style={{ borderColor: VGA_COLORS.brightGreen }}>
        <div className="text-sm mb-1" style={{ color: VGA_COLORS.white }}>
          Normalized Training Units
        </div>
        <div className="text-4xl font-black font-mono" style={{ color: VGA_COLORS.brightGreen }}>
          {normalizedTU}
        </div>
        <div className="text-xs mt-2 font-mono" style={{ color: VGA_COLORS.brightCyan }}>
          ({activation} / {biasWeight}) * 100 = {normalizedTU}
        </div>
      </div>
    </GlassSurface>
  );
};

// Muscle Activation Visualization
const MuscleActivationViz = ({ exercise }) => (
  <GlassCard className="p-6">
    <h4 className="text-lg font-bold mb-4" style={{ color: VGA_COLORS.brightCyan }}>
      {exercise.name}
    </h4>

    <div className="space-y-3">
      {exercise.muscles.map((muscle, i) => (
        <motion.div
          key={muscle.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-white">{muscle.name}</span>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{
                backgroundColor:
                  muscle.type === 'Primary' ? 'rgba(239, 68, 68, 0.2)' :
                  muscle.type === 'Secondary' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                color:
                  muscle.type === 'Primary' ? '#ef4444' :
                  muscle.type === 'Secondary' ? '#eab308' : '#6b7280'
              }}
            >
              {muscle.type}
            </span>
          </div>
          <div className="h-4 bg-black/30 rounded overflow-hidden relative">
            <motion.div
              className="h-full rounded"
              style={{
                backgroundColor:
                  muscle.activation >= 70 ? VGA_COLORS.brightRed :
                  muscle.activation >= 40 ? VGA_COLORS.brightYellow : VGA_COLORS.brightGreen
              }}
              initial={{ width: 0 }}
              animate={{ width: `${muscle.activation}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-2">
              <span className="text-xs font-mono font-bold text-white drop-shadow">
                {muscle.activation}%
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </GlassCard>
);

// Bias Weight Chart
const BiasWeightChart = () => {
  const maxBias = Math.max(...MUSCLE_BIAS_DATA.map(d => d.biasWeight));

  return (
    <div className="font-mono">
      <div className="text-center mb-6 text-lg font-bold" style={{ color: VGA_COLORS.brightYellow }}>
        MUSCLE BIAS WEIGHTS
      </div>
      <div className="space-y-3">
        {MUSCLE_BIAS_DATA.map((item, index) => (
          <motion.div
            key={item.muscle}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-36 text-right text-sm truncate" style={{ color: VGA_COLORS.white }}>
              {item.muscle}
            </div>
            <div className="flex-1 h-6 bg-black/50 border border-white/20 relative overflow-hidden">
              <motion.div
                className="h-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.biasWeight / maxBias) * 100}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
              {/* VGA scanline effect */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 2px, transparent 3px)'
              }} />
            </div>
            <div className="w-16 text-right font-bold flex items-center gap-2" style={{ color: item.color }}>
              <span>{item.biasWeight}</span>
              <span className="text-xs" style={{ color: VGA_COLORS.white }}>({item.size})</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Recovery Score Breakdown
const RecoveryBreakdown = () => (
  <div className="font-mono">
    <div className="text-center mb-6 text-lg font-bold" style={{ color: VGA_COLORS.brightMagenta }}>
      READINESS SCORE FACTORS
    </div>
    <div className="space-y-4">
      {RECOVERY_METRICS.map((metric, i) => (
        <motion.div
          key={metric.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-4"
        >
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-black"
            style={{ backgroundColor: 'rgba(170, 0, 170, 0.2)', color: VGA_COLORS.brightMagenta }}
          >
            {metric.weight}%
          </div>
          <div className="flex-1">
            <div className="font-bold text-white">{metric.name}</div>
            <div className="text-sm" style={{ color: VGA_COLORS.white }}>{metric.desc}</div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default function Science() {
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
            <RouterLink to="/features" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Features</RouterLink>
            <RouterLink to="/technology" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition">Technology</RouterLink>
            <RouterLink to="/science" className="text-sm font-medium text-[var(--brand-blue-400)]">Science</RouterLink>
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
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">THE SCIENCE</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
              Evidence-based muscle activation tracking powered by our proprietary Training Unit algorithm.
            </p>
            <a
              href="https://github.com/jeanpaulniko/musclemap/blob/main/docs/BIOMETRICS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--brand-blue-400)] hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Read Full Documentation
            </a>
          </motion.div>
        </div>
      </section>

      {/* Colorful Muscle Activation Examples - FIRST */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent">MUSCLE ACTIVATION</span>
            <span className="text-white"> IN ACTION</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {EXERCISE_ACTIVATIONS.map((exercise, i) => (
              <motion.div
                key={exercise.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
              >
                <MuscleActivationViz exercise={exercise} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Colorful Bias Weight Chart */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">MUSCLE SIZE</span>
            <span className="text-white"> BIAS WEIGHTS</span>
          </h2>
          <GlassSurface className="p-8">
            <BiasWeightChart />
          </GlassSurface>
        </div>
      </section>

      {/* Interactive TU Calculator */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">TRY IT</span>
            <span className="text-white"> YOURSELF</span>
          </h2>
          <TUCalculator />
        </div>
      </section>

      {/* Recovery Science with colorful visuals */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">RECOVERY</span>
            <span className="text-white"> SCORING</span>
          </h2>

          <GlassSurface className="p-8">
            <RecoveryBreakdown />
          </GlassSurface>
        </div>
      </section>

      {/* Future Biometrics - Colorful */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">BIOMETRIC</span>
            <span className="text-white"> INTEGRATIONS</span>
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { name: 'Apple HealthKit', status: 'Supported', color: '#22c55e' },
              { name: 'Google Fit', status: 'Supported', color: '#22c55e' },
              { name: 'Apple Watch', status: 'Supported', color: '#22c55e' },
              { name: 'Fitbit', status: 'Supported', color: '#22c55e' },
              { name: 'Oura Ring', status: 'Supported', color: '#22c55e' },
              { name: 'Garmin Connect', status: 'Coming Soon', color: '#eab308' },
              { name: 'Whoop', status: 'Coming Soon', color: '#eab308' },
              { name: 'CGM Sensors', status: '2025', color: '#a855f7' },
            ].map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 border-2 text-center rounded-xl"
                style={{ borderColor: item.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: item.color }}>
                  {item.name}
                </div>
                <div className="text-xs text-gray-400">
                  {item.status}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Formulas - AT THE BOTTOM */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightCyan }}>TECHNICAL</span>
            <span className="text-white"> FORMULAS</span>
          </h2>

          <div className="grid gap-6">
            <FormulaDisplay
              title="Training Units (TU)"
              formula="TU = Σ(muscleActivation / biasWeight) × 100"
              description="Normalizes muscle activation across different muscle sizes for fair workout comparison."
            />

            <FormulaDisplay
              title="Normalized Activation"
              formula="normalizedActivation = rawActivation / biasWeight × 100"
              description="Large muscles (glutes, lats) have higher bias weights (18-22), small muscles (rear delts) have lower weights (4-8)."
            />

            <FormulaDisplay
              title="HRV Status"
              formula="deviation = (currentHRV - baseline) / baseline"
              description="Positive deviation indicates better recovery. 7-day baseline weighted 70%, 30-day baseline weighted 30%."
            />

            <FormulaDisplay
              title="Readiness Score"
              formula="score = Σ(factor × weight) / totalWeight × 100"
              description="Missing factors excluded from calculation, normalizing based on available biometric data."
            />
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://github.com/jeanpaulniko/musclemap/blob/main/docs/BIOMETRICS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              View Full Technical Documentation
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <GlassSurface className="p-12" tint="pulse">
            <h2 className="text-3xl font-bold text-white mb-4">
              Science-Backed Training
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Join the revolution in evidence-based fitness tracking with MuscleMap.
            </p>
            <RouterLink to="/signup">
              <GlassButton variant="primary" size="lg">
                Start Training Smarter
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
