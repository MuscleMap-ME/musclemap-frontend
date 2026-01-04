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

      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center md:py-28">
        <h1 className="mb-4 text-4xl font-black leading-tight text-white md:text-6xl">
          See Every Rep.
          <br />
          <span
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Know Every Muscle.
          </span>
        </h1>

        <p className="mb-8 max-w-2xl text-lg text-gray-300 md:text-xl">
          Real-time muscle activation visualization. Log a set, watch it light up.
        </p>

        <RouterLink
          to="/signup"
          className="rounded-xl bg-indigo-500 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
        >
          Start Your Journey
        </RouterLink>
      </main>

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
              <img
                src="/MuscleMap-Landing-Page-Decal.svg"
                alt="MuscleMap - Visualize Every Muscle. Track Every Rep."
                className="max-w-full h-auto rounded-xl"
              />
            </RouterLink>
          </motion.div>

          {/* Subtle footer links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex justify-center gap-6 text-sm text-gray-500"
          >
            <RouterLink to="/features" className="hover:text-gray-300 transition">Features</RouterLink>
            <RouterLink to="/technology" className="hover:text-gray-300 transition">Technology</RouterLink>
            <RouterLink to="/science" className="hover:text-gray-300 transition">Science</RouterLink>
            <RouterLink to="/design" className="hover:text-gray-300 transition">Design</RouterLink>
            <RouterLink to="/design-system" className="hover:text-gray-300 transition">Design System</RouterLink>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
