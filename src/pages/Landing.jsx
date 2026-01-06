import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15), transparent 35%), radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.2), transparent 30%)',
        color: '#e5e7eb',
      }}
    >
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <RouterLink
            to="/"
            className="flex items-center gap-3"
          >
            <img src="/logo.png" alt="MuscleMap" className="w-10 h-10 rounded-lg" />
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

      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center md:py-24">
        {/* CTA Button at top */}
        <motion.div
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
        </motion.div>

        {/* Main headline with 3D embossed effect */}
        <motion.h1
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
        </motion.h1>

        {/* Subtext with glass card effect */}
        <motion.div
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
        </motion.div>
      </main>

      {/* How It Works - Visual Architecture */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
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
          </motion.div>

          {/* Architecture Diagram */}
          <motion.div
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
                <motion.div
                  key={device.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors"
                >
                  <span className="text-2xl mb-1">{device.icon}</span>
                  <span className="text-xs font-medium text-white">{device.label}</span>
                  <span className="text-[10px] text-gray-500">{device.desc}</span>
                </motion.div>
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
            <motion.div
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
            </motion.div>

            {/* Connection to DB */}
            <div className="flex justify-center mb-4">
              <div className="w-px h-8 bg-gradient-to-b from-cyan-500/50 to-green-500/50" />
            </div>

            {/* Database Layer */}
            <motion.div
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
            </motion.div>

            {/* Tech Stack Pills */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex flex-wrap justify-center gap-2">
                {['React', 'TypeScript', 'Fastify', 'Caddy', 'React Native', 'Expo'].map((tech, i) => (
                  <motion.span
                    key={tech}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.05 }}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 font-mono"
                  >
                    {tech}
                  </motion.span>
                ))}
              </div>
              <p className="text-center text-xs text-gray-600 mt-3">
                No Docker. No SQLite. No Express. No Nginx. Just clean, modern infrastructure.
              </p>
            </div>
          </motion.div>

          {/* Feature Examples Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Real-time Muscle Tracking */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-red-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="font-bold text-white mb-2">Real-time Muscle Tracking</h3>
              <p className="text-sm text-gray-400 mb-4">See exactly which muscles you're hitting with every exercise.</p>
              <div className="flex gap-2">
                {['Chest', 'Back', 'Legs'].map((muscle) => (
                  <span key={muscle} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs">
                    {muscle}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* AI Workout Generation */}
            <motion.div
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
            </motion.div>

            {/* Cross-Platform Sync */}
            <motion.div
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* Explore Section with Navigation Icons */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Navigation Icons */}
          <motion.div
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
          </motion.div>

          {/* Decal - Clickable */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <RouterLink to="/features" className="block hover:scale-[1.02] transition-transform duration-300">
              <picture>
                <source
                  type="image/webp"
                  srcSet="/landing-decal-640w.webp 640w, /landing-decal-1024w.webp 1024w, /landing-decal-1600w.webp 1600w, /landing-decal-2400w.webp 2400w"
                  sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, (max-width: 1600px) 1600px, 2400px"
                />
                <source
                  type="image/png"
                  srcSet="/landing-decal-640w.png 640w, /landing-decal-1024w.png 1024w, /landing-decal-1600w.png 1600w, /landing-decal-2400w.png 2400w"
                  sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, (max-width: 1600px) 1600px, 2400px"
                />
                <img
                  src="/landing-decal-1024w.png"
                  alt="MuscleMap - Visualize Every Muscle. Track Every Rep."
                  className="max-w-full h-auto rounded-xl"
                  loading="lazy"
                />
              </picture>
            </RouterLink>
          </motion.div>

          {/* Visual Documentation - Front and Center */}
          <motion.div
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
              <motion.a
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
              </motion.a>

              {/* Features PDF */}
              <motion.a
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
              </motion.a>

              {/* API Reference PDF */}
              <motion.a
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
              </motion.a>
            </div>

            {/* Text docs fallback link */}
            <motion.div
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
                Prefer plain text? View all 13 markdown docs
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </RouterLink>
            </motion.div>
          </motion.div>

          {/* Subtle footer links */}
          <motion.div
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
            <a href="https://triptomean.com/about" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition">About the Creator</a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
