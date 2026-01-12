/**
 * OpenSourceHero Component
 *
 * A prominent homepage section celebrating MuscleMap's open source nature.
 * Features "Built in the Open" messaging with GitHub integration CTAs.
 */

import { Github, Star, GitFork, Users, Code2, Heart, ExternalLink } from 'lucide-react';
import { GitHubStatsWidget } from './GitHubStatsWidget';

const GITHUB_REPO = 'https://github.com/musclemap/musclemap-frontend';

interface OpenSourceHeroProps {
  className?: string;
}

export function OpenSourceHero({ className = '' }: OpenSourceHeroProps) {
  const highlights = [
    {
      icon: Code2,
      title: 'Fully Open Source',
      description: 'Every line of frontend code is open for inspection and contribution.',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Features shaped by real users and fitness enthusiasts worldwide.',
    },
    {
      icon: Heart,
      title: 'Built with Love',
      description: 'Crafted by developers who are passionate about fitness.',
    },
  ];

  return (
    <section className={`relative py-24 overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Github className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Open Source</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Built in the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Open
            </span>
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            MuscleMap is proudly open source. Join our community of developers and fitness
            enthusiasts building the future of workout visualization.
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <item.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>

        {/* GitHub Stats Widget */}
        <GitHubStatsWidget className="mb-16" />

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-100 transition-colors"
          >
            <Github className="w-5 h-5" />
            View on GitHub
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href={`${GITHUB_REPO}/stargazers`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors"
          >
            <Star className="w-5 h-5 text-yellow-400" />
            Star Repository
          </a>

          <a
            href={`${GITHUB_REPO}/fork`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white font-medium border border-white/20 hover:bg-white/20 transition-colors"
          >
            <GitFork className="w-5 h-5 text-blue-400" />
            Fork & Contribute
          </a>
        </div>

        {/* Bottom message */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Licensed under MIT • Made with ❤️ by the MuscleMap community
        </p>
      </div>
    </section>
  );
}

export default OpenSourceHero;
