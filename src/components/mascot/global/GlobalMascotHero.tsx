/**
 * GlobalMascotHero
 *
 * Hero section placement of the global mascot.
 * Displays prominently on landing pages with ecosystem info.
 */

import React, { Suspense, lazy } from 'react';
import { useGlobalMascot } from './useGlobalMascot';
import GlobalMascot2D from './GlobalMascot2D';

// Lazy load 3D component
const GlobalMascot3D = lazy(() => import('./GlobalMascot3D'));

export default function GlobalMascotHero({ className = '' }) {
  const { config, use3D, loading, prefersReducedMotion } = useGlobalMascot();

  if (loading) {
    return (
      <div className={`w-full h-80 flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative w-full flex flex-col items-center justify-center ${className}`}>
      {/* Mascot visualization */}
      <div className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64">
        {use3D ? (
          <Suspense fallback={<GlobalMascot2D size="large" reducedMotion={prefersReducedMotion} />}>
            <GlobalMascot3D size="large" showStars animationState="idle" />
          </Suspense>
        ) : (
          <GlobalMascot2D size="large" animationState="idle" reducedMotion={prefersReducedMotion} />
        )}
      </div>

      {/* Mascot info */}
      {config && (
        <div className="mt-6 text-center">
          <h2 className="text-2xl font-bold text-white tracking-wide font-bebas">
            TЯIPTθMΞAN
          </h2>
          <p className="text-purple-400 italic text-sm mt-1">
            {config.tagline}
          </p>
          <a
            href={config.ecosystem_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200 text-xs mt-3 inline-flex items-center gap-1 transition-colors"
          >
            Explore the Ecosystem
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
