/**
 * OpenSourceBanner Component
 *
 * A banner that highlights MuscleMap's open source nature
 * and provides quick links to the GitHub repository.
 */

import { Github, Star, GitFork, ExternalLink } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/musclemap/musclemap-frontend';

interface OpenSourceBannerProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function OpenSourceBanner({ className = '', variant = 'default' }: OpenSourceBannerProps) {
  if (variant === 'compact') {
    return (
      <a
        href={GITHUB_REPO}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm ${className}`}
      >
        <Github className="w-4 h-4" />
        <span>Open Source</span>
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-white/10 p-6 ${className}`}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 animate-pulse" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur">
            <Github className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              MuscleMap is Open Source
            </h3>
            <p className="text-sm text-gray-300 max-w-md">
              The frontend is community-powered. Report bugs, suggest features, or
              contribute code to make MuscleMap better for everyone.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`${GITHUB_REPO}/stargazers`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-sm text-white transition-colors"
          >
            <Star className="w-4 h-4" />
            Star
          </a>
          <a
            href={`${GITHUB_REPO}/fork`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-sm text-white transition-colors"
          >
            <GitFork className="w-4 h-4" />
            Fork
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
          >
            View Source
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default OpenSourceBanner;
