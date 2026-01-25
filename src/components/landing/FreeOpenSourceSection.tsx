import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SafeMotion } from '../../utils/safeMotion';

const SafeMotionDiv = SafeMotion.div;

export function FreeOpenSourceSection() {
  return (
    <section className="relative z-10 py-20 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span
              style={{
                background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Free. Forever. For Everyone.
            </span>
          </h2>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
              100% Free
            </span>
            <span className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-semibold">
              Open Source
            </span>
            <span className="px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-semibold">
              Privacy-First
            </span>
            <span className="px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-sm font-semibold">
              Community-Driven
            </span>
          </div>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We believe <strong className="text-white">fitness science should be accessible to everyone</strong>.
            No paywalls. No premium tiers. No locked features. No data harvesting.
            Just a global community building the future of exercise together.
          </p>
        </SafeMotionDiv>

        {/* Comparison Grid */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          {/* Other Apps */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="text-xl">🚫</span> Proprietary Apps
            </h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Black box algorithms you can&apos;t verify
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Best features locked behind $$$
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Company decides roadmap alone
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Your data is their product
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Shut down = you lose everything
              </li>
            </ul>
          </div>

          {/* MuscleMap */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <span className="text-xl">✓</span> MuscleMap (Open Source)
            </h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">✓</span>
                Transparent, auditable code on GitHub
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">✓</span>
                Every feature free for everyone
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">✓</span>
                Community shapes the future
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">✓</span>
                Your data is yours alone
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">✓</span>
                Fork it and keep going forever
              </li>
            </ul>
          </div>
        </SafeMotionDiv>

        {/* CTA Buttons */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="https://github.com/jeanpaulniko/musclemap"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-600 hover:bg-gray-700 transition-all"
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-white">Star on GitHub</span>
            <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
          </a>

          <RouterLink
            to="/slack"
            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all"
          >
            <span className="text-2xl">💬</span>
            <span className="font-semibold text-purple-300">Join Slack Community</span>
            <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
          </RouterLink>
        </SafeMotionDiv>
      </div>
    </section>
  );
}

export default FreeOpenSourceSection;
