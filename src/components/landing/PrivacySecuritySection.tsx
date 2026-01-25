import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SafeMotion } from '../../utils/safeMotion';

const SafeMotionDiv = SafeMotion.div;

const securityFeatures = [
  {
    icon: '🔒',
    title: 'End-to-End Encrypted Messaging',
    description: 'Your DMs use Signal-level encryption. We can\'t read your conversations even if we wanted to.',
    color: 'cyan',
  },
  {
    icon: '📱',
    title: 'Local-First Data',
    description: 'Your workouts live on YOUR device first. Cloud sync is optional and encrypted.',
    color: 'blue',
  },
  {
    icon: '🚫',
    title: 'No Data Selling. Ever.',
    description: 'We don\'t sell your data. We don\'t share it. We don\'t even want to see it.',
    color: 'red',
  },
  {
    icon: '👤',
    title: 'Pseudonymous by Default',
    description: 'Use MuscleMap without revealing your real identity. Your choice.',
    color: 'purple',
  },
  {
    icon: '💾',
    title: 'Export & Delete Anytime',
    description: 'Download all your data. Delete everything. No questions asked.',
    color: 'green',
  },
  {
    icon: '👁️',
    title: 'Open Source Transparency',
    description: 'Audit our code yourself. We have nothing to hide.',
    color: 'yellow',
  },
];

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
};

export function PrivacySecuritySection() {
  return (
    <section className="relative z-10 py-20 px-6 border-t border-white/5 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="text-4xl mr-3">🔐</span>
            <span
              style={{
                background: 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Your Body. Your Data. Your Control.
            </span>
          </h2>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            MuscleMap is built on a foundation of <strong className="text-white">privacy-first design</strong>.
            We believe your fitness data is deeply personal — and it should stay that way.
          </p>
        </SafeMotionDiv>

        {/* Security Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {securityFeatures.map((feature, index) => {
            const colors = colorClasses[feature.color];
            return (
              <SafeMotionDiv
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`${colors.bg} ${colors.border} border rounded-xl p-5 hover:scale-[1.02] transition-transform`}
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className={`font-bold ${colors.text} mb-2`}>{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </SafeMotionDiv>
            );
          })}
        </div>

        {/* E2EE Explainer */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
        >
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            How End-to-End Encryption Works
          </h3>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2 mb-6">
            <div className="flex flex-col items-center p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <span className="text-2xl mb-2">💬</span>
              <span className="text-sm text-cyan-400 font-medium">Your Message</span>
            </div>

            <div className="text-cyan-500 text-2xl rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <span className="text-2xl mb-2">🔐</span>
              <span className="text-sm text-purple-400 font-medium text-center">Encrypted on<br/>YOUR device</span>
            </div>

            <div className="text-purple-500 text-2xl rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center p-4 bg-gray-500/10 rounded-xl border border-gray-500/20">
              <span className="text-2xl mb-2">☁️</span>
              <span className="text-sm text-gray-400 font-medium text-center">Travels encrypted<br/>(unreadable by us)</span>
            </div>

            <div className="text-gray-500 text-2xl rotate-90 md:rotate-0">→</div>

            <div className="flex flex-col items-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span className="text-2xl mb-2">🔓</span>
              <span className="text-sm text-emerald-400 font-medium text-center">Decrypted on<br/>recipient&apos;s device</span>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm">
            Private keys never leave your device. Even we can&apos;t read your messages.
          </p>
        </SafeMotionDiv>

        {/* CTA */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8"
        >
          <RouterLink
            to="/privacy"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>Learn more about our privacy practices</span>
            <span>→</span>
          </RouterLink>
        </SafeMotionDiv>
      </div>
    </section>
  );
}

export default PrivacySecuritySection;
