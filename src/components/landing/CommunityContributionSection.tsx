import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SafeMotion } from '../../utils/safeMotion';

const SafeMotionDiv = SafeMotion.div;

const contributionWays = [
  {
    icon: '⭐',
    title: 'Star on GitHub',
    description: 'Show your support and help us grow',
    link: 'https://github.com/jeanpaulniko/musclemap',
    external: true,
    color: 'yellow',
  },
  {
    icon: '💬',
    title: 'Join Slack',
    description: 'Real-time community discussion',
    link: '/slack',
    external: false,
    color: 'purple',
  },
  {
    icon: '🐛',
    title: 'Report Bugs',
    description: 'Help us squash issues',
    link: 'https://github.com/jeanpaulniko/musclemap/issues',
    external: true,
    color: 'red',
  },
  {
    icon: '💡',
    title: 'Suggest Features',
    description: 'Shape the roadmap',
    link: 'https://github.com/jeanpaulniko/musclemap/discussions',
    external: true,
    color: 'cyan',
  },
  {
    icon: '🔧',
    title: 'Contribute Code',
    description: 'Submit a pull request',
    link: 'https://github.com/jeanpaulniko/musclemap/pulls',
    external: true,
    color: 'green',
  },
  {
    icon: '📚',
    title: 'Improve Docs',
    description: 'Help others understand',
    link: '/docs',
    external: false,
    color: 'blue',
  },
];

const colorClasses: Record<string, { bg: string; border: string; hoverBorder: string }> = {
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', hoverBorder: 'hover:border-yellow-500/40' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', hoverBorder: 'hover:border-purple-500/40' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', hoverBorder: 'hover:border-red-500/40' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', hoverBorder: 'hover:border-cyan-500/40' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', hoverBorder: 'hover:border-green-500/40' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', hoverBorder: 'hover:border-blue-500/40' },
};

const slackChannels = [
  { name: '#general', description: 'Community discussion' },
  { name: '#development', description: 'Technical discussions' },
  { name: '#feature-requests', description: 'Propose and vote on features' },
  { name: '#exercise-science', description: 'Discuss the physiology' },
  { name: '#show-and-tell', description: 'Share your progress' },
  { name: '#help', description: 'Get support' },
];

export function CommunityContributionSection() {
  return (
    <section className="relative z-10 py-20 px-6 border-t border-white/5 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
                background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Join the Movement
            </span>
          </h2>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            MuscleMap is built by the community, for the community.
            Every contribution makes fitness science more accessible.
          </p>
        </SafeMotionDiv>

        {/* Contribution Grid */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12"
        >
          {contributionWays.map((way, index) => {
            const colors = colorClasses[way.color];
            const Component = way.external ? 'a' : RouterLink;
            const linkProps = way.external
              ? { href: way.link, target: '_blank', rel: 'noopener noreferrer' }
              : { to: way.link };

            return (
              <SafeMotionDiv
                key={way.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Component
                  {...(linkProps as any)}
                  className={`block ${colors.bg} ${colors.border} ${colors.hoverBorder} border rounded-xl p-5 transition-all hover:scale-[1.02] group`}
                >
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{way.icon}</div>
                  <h3 className="font-bold text-white mb-1">{way.title}</h3>
                  <p className="text-sm text-gray-400">{way.description}</p>
                </Component>
              </SafeMotionDiv>
            );
          })}
        </SafeMotionDiv>

        {/* Slack Channels Preview */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">💬</span>
            <div>
              <h3 className="text-xl font-bold text-white">Slack Community</h3>
              <p className="text-gray-400 text-sm">Real-time discussion with fellow fitness enthusiasts</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {slackChannels.map((channel) => (
              <div
                key={channel.name}
                className="flex items-center gap-2 text-sm bg-purple-500/10 rounded-lg px-3 py-2"
              >
                <span className="text-purple-400 font-mono">{channel.name}</span>
                <span className="text-gray-500">—</span>
                <span className="text-gray-400 truncate">{channel.description}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <RouterLink
              to="/slack"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold transition-colors"
            >
              <span>Join Slack Now</span>
              <span>→</span>
            </RouterLink>
          </div>
        </SafeMotionDiv>

        {/* GitHub CTA */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <a
            href="https://github.com/jeanpaulniko/musclemap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-700 transition-all group"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <div className="text-left">
              <div className="text-white font-bold">github.com/jeanpaulniko/musclemap</div>
              <div className="text-gray-400 text-sm">Star, fork, or contribute</div>
            </div>
            <span className="text-gray-400 group-hover:translate-x-1 transition-transform text-xl">→</span>
          </a>
        </SafeMotionDiv>
      </div>
    </section>
  );
}

export default CommunityContributionSection;
