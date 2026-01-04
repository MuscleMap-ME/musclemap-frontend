/**
 * Technology Stack Page
 *
 * Showcases MuscleMap's technology architecture with VGA-style graphics.
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

// Tech stack categories
const TECH_STACK = {
  backend: {
    title: 'Backend',
    color: VGA_COLORS.brightBlue,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    technologies: [
      { name: 'Node.js 20+', desc: 'Runtime', perf: 95 },
      { name: 'TypeScript 5.x', desc: 'Language', perf: 100 },
      { name: 'Fastify 5.x', desc: 'Framework', perf: 98 },
      { name: 'PostgreSQL 16+', desc: 'Database', perf: 97 },
      { name: 'Redis', desc: 'Cache/Realtime', perf: 99 },
      { name: 'Pino', desc: 'Logging', perf: 96 },
    ],
  },
  frontend: {
    title: 'Frontend',
    color: VGA_COLORS.brightCyan,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    technologies: [
      { name: 'Vite 5.x', desc: 'Build Tool', perf: 99 },
      { name: 'React 18.x', desc: 'UI Library', perf: 98 },
      { name: 'Tailwind CSS', desc: 'Styling', perf: 97 },
      { name: 'Three.js', desc: '3D Visualization', perf: 94 },
      { name: 'Framer Motion', desc: 'Animation', perf: 96 },
      { name: '@musclemap/client', desc: 'HTTP Client', perf: 99 },
    ],
  },
  infrastructure: {
    title: 'Infrastructure',
    color: VGA_COLORS.brightGreen,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    technologies: [
      { name: 'Linux VPS', desc: 'Debian Server', perf: 99 },
      { name: 'Caddy', desc: 'Reverse Proxy', perf: 99 },
      { name: 'PM2', desc: 'Process Manager', perf: 98 },
      { name: 'pnpm', desc: 'Package Manager', perf: 97 },
      { name: 'Git', desc: 'Version Control', perf: 100 },
      { name: 'systemd', desc: 'Service Manager', perf: 99 },
    ],
  },
};

// Monorepo structure
const MONOREPO_STRUCTURE = [
  { path: 'apps/', children: ['api/', 'mobile/'], desc: 'Applications' },
  { path: 'packages/', children: ['client/', 'core/', 'shared/', 'plugin-sdk/'], desc: 'Shared Packages' },
  { path: 'plugins/', children: ['...'], desc: 'Drop-in Plugins' },
  { path: 'src/', children: ['components/', 'pages/', 'utils/'], desc: 'Web Frontend' },
  { path: 'docs/', children: ['ARCHITECTURE.md', 'FEATURES.md', '...'], desc: 'Documentation' },
];

// API endpoints visualization
const API_ENDPOINTS = [
  { method: 'POST', path: '/auth/register', desc: 'User registration', color: VGA_COLORS.brightGreen },
  { method: 'POST', path: '/auth/login', desc: 'Authentication', color: VGA_COLORS.brightGreen },
  { method: 'GET', path: '/exercises', desc: 'Exercise library', color: VGA_COLORS.brightBlue },
  { method: 'POST', path: '/prescription/generate', desc: 'AI workout', color: VGA_COLORS.brightCyan },
  { method: 'POST', path: '/workouts', desc: 'Log workout', color: VGA_COLORS.brightGreen },
  { method: 'GET', path: '/journey', desc: 'Progress tracking', color: VGA_COLORS.brightBlue },
  { method: 'GET', path: '/credits/balance', desc: 'Credit balance', color: VGA_COLORS.brightBlue },
  { method: 'GET', path: '/tips/contextual', desc: 'Smart tips', color: VGA_COLORS.brightBlue },
];

// VGA Terminal Component
const VGATerminal = ({ title, children }) => (
  <div className="font-mono rounded-lg overflow-hidden border-2" style={{ borderColor: VGA_COLORS.brightCyan }}>
    <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: VGA_COLORS.cyan }}>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VGA_COLORS.brightRed }} />
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VGA_COLORS.brightYellow }} />
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VGA_COLORS.brightGreen }} />
      </div>
      <span className="text-black text-sm font-bold">{title}</span>
    </div>
    <div className="p-4 bg-black/90" style={{ minHeight: '200px' }}>
      {children}
    </div>
  </div>
);

// Architecture Diagram Component
const ArchitectureDiagram = () => (
  <div className="font-mono text-sm">
    <div className="flex flex-col items-center gap-4">
      {/* Client Layer */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4"
      >
        <div className="px-6 py-3 border-2 text-center" style={{ borderColor: VGA_COLORS.brightCyan, color: VGA_COLORS.brightCyan }}>
          Web App<br/><span className="text-xs">React + Vite</span>
        </div>
        <div className="px-6 py-3 border-2 text-center" style={{ borderColor: VGA_COLORS.brightMagenta, color: VGA_COLORS.brightMagenta }}>
          Mobile App<br/><span className="text-xs">React Native</span>
        </div>
      </motion.div>

      {/* Arrow */}
      <div className="flex flex-col items-center" style={{ color: VGA_COLORS.brightYellow }}>
        <div>|</div>
        <div>V</div>
      </div>

      {/* API Layer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-8 py-4 border-2 text-center"
        style={{ borderColor: VGA_COLORS.brightBlue, color: VGA_COLORS.brightBlue }}
      >
        Fastify API Server<br/>
        <span className="text-xs">TypeScript + TypeBox</span>
      </motion.div>

      {/* Arrow */}
      <div className="flex flex-col items-center" style={{ color: VGA_COLORS.brightYellow }}>
        <div>|</div>
        <div>V</div>
      </div>

      {/* Data Layer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-4"
      >
        <div className="px-6 py-3 border-2 text-center" style={{ borderColor: VGA_COLORS.brightGreen, color: VGA_COLORS.brightGreen }}>
          PostgreSQL<br/><span className="text-xs">Primary DB</span>
        </div>
        <div className="px-6 py-3 border-2 text-center" style={{ borderColor: VGA_COLORS.brightRed, color: VGA_COLORS.brightRed }}>
          Redis<br/><span className="text-xs">Cache/PubSub</span>
        </div>
      </motion.div>
    </div>
  </div>
);

// Tech Card Component
const TechCard = ({ category, index }) => (
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
        <h3 className="text-xl font-bold font-mono" style={{ color: category.color }}>
          {category.title.toUpperCase()}
        </h3>
      </div>

      <div className="space-y-4 font-mono">
        {category.technologies.map((tech, i) => (
          <motion.div
            key={tech.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 + i * 0.05 }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white">{tech.name}</span>
              <span className="text-xs" style={{ color: VGA_COLORS.white }}>{tech.desc}</span>
            </div>
            <div className="h-2 bg-black/30 rounded overflow-hidden relative">
              <motion.div
                className="h-full rounded"
                style={{ backgroundColor: category.color }}
                initial={{ width: 0 }}
                animate={{ width: `${tech.perf}%` }}
                transition={{ duration: 0.8, delay: index * 0.15 + i * 0.05 }}
              />
              {/* Scanline effect */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.3) 2px)'
              }} />
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  </motion.div>
);

// File Tree Component
const FileTree = () => (
  <div className="font-mono text-sm">
    {MONOREPO_STRUCTURE.map((item, i) => (
      <motion.div
        key={item.path}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
        className="mb-3"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: VGA_COLORS.brightYellow }}>+--</span>
          <span style={{ color: VGA_COLORS.brightCyan }}>{item.path}</span>
          <span style={{ color: VGA_COLORS.white }}>({item.desc})</span>
        </div>
        <div className="ml-6">
          {item.children.map((child, j) => (
            <div key={child} className="flex items-center gap-2">
              <span style={{ color: VGA_COLORS.brightYellow }}>{j === item.children.length - 1 ? '`--' : '|--'}</span>
              <span style={{ color: VGA_COLORS.brightGreen }}>{child}</span>
            </div>
          ))}
        </div>
      </motion.div>
    ))}
  </div>
);

export default function Technology() {
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
            <RouterLink to="/technology" className="text-sm font-medium text-[var(--brand-blue-400)]">Technology</RouterLink>
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
            <h1 className="text-5xl md:text-6xl font-black mb-6 font-mono">
              <span style={{ color: VGA_COLORS.brightCyan }}>TECH</span>
              <span className="text-white"> STACK</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
              Built with modern, battle-tested technologies for performance, scalability, and developer experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <VGATerminal title="SYSTEM ARCHITECTURE">
            <ArchitectureDiagram />
          </VGATerminal>
        </div>
      </section>

      {/* Tech Stack Cards */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightCyan }}>TECHNOLOGY</span>
            <span className="text-white"> MATRIX</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {Object.values(TECH_STACK).map((category, index) => (
              <TechCard key={category.title} category={category} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Monorepo Structure */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <VGATerminal title="MONOREPO STRUCTURE">
            <FileTree />
          </VGATerminal>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightCyan }}>API</span>
            <span className="text-white"> ENDPOINTS</span>
          </h2>

          <GlassSurface className="p-6">
            <div className="font-mono space-y-2">
              {API_ENDPOINTS.map((endpoint, i) => (
                <motion.div
                  key={endpoint.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0"
                >
                  <span
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{
                      backgroundColor: endpoint.method === 'POST' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: endpoint.method === 'POST' ? '#22c55e' : '#3b82f6'
                    }}
                  >
                    {endpoint.method}
                  </span>
                  <span style={{ color: endpoint.color }} className="flex-1">{endpoint.path}</span>
                  <span style={{ color: VGA_COLORS.white }} className="text-sm">{endpoint.desc}</span>
                </motion.div>
              ))}
            </div>
          </GlassSurface>
        </div>
      </section>

      {/* Performance Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono">
            <span style={{ color: VGA_COLORS.brightCyan }}>PERFORMANCE</span>
            <span className="text-white"> METRICS</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'API Response', value: '<50ms', color: VGA_COLORS.brightGreen },
              { label: 'Page Load', value: '<1.5s', color: VGA_COLORS.brightCyan },
              { label: 'DB Query', value: '<10ms', color: VGA_COLORS.brightBlue },
              { label: 'Uptime', value: '99.9%', color: VGA_COLORS.brightYellow },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 border-2 text-center font-mono"
                style={{ borderColor: stat.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                <div className="text-3xl font-black mb-2" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-xs uppercase" style={{ color: VGA_COLORS.white }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <GlassSurface className="p-12" tint="brand">
            <h2 className="text-3xl font-bold text-white mb-4">
              Built for Scale
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Our architecture handles thousands of concurrent users with sub-50ms response times.
            </p>
            <RouterLink to="/signup">
              <GlassButton variant="primary" size="lg">
                Start Your Journey
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
