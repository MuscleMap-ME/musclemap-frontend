/**
 * RoadmapAtlas - Git-derived feature timeline visualization
 *
 * Shows phases and feature clusters without dates.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { RoadmapAtlasManifest, RoadmapPhase, FeatureCluster } from '../atlasTypes';

// Static roadmap data derived from git history
const STATIC_ROADMAP: RoadmapAtlasManifest = {
  version: '1.0.0',
  generated: 'static',
  phases: [
    {
      id: 'phase-1',
      number: 1,
      label: 'Foundation',
      description: 'Core infrastructure and basic features',
      clusters: [
        {
          id: 'auth-foundation',
          label: 'Authentication',
          description: 'User accounts, JWT auth, session management',
          status: 'completed',
          size: 'medium',
          icon: '🔐',
          relatedRoutes: ['login', 'signup'],
        },
        {
          id: 'muscle-system',
          label: 'Muscle Visualization',
          description: '65+ exercises with real-time muscle activation tracking',
          status: 'completed',
          size: 'large',
          icon: '💪',
          relatedRoutes: ['exercises'],
        },
        {
          id: 'workout-logging',
          label: 'Workout Logging',
          description: 'Log sets, reps, weight with progress tracking',
          status: 'completed',
          size: 'large',
          icon: '📝',
          relatedRoutes: ['workout', 'progression'],
        },
      ],
    },
    {
      id: 'phase-2',
      number: 2,
      label: 'Core Features',
      description: 'Journey system, skills, and progression',
      clusters: [
        {
          id: 'journey-system',
          label: 'Journey System',
          description: 'Personalized training paths with archetype selection',
          status: 'completed',
          size: 'large',
          icon: '🗺️',
          relatedRoutes: ['journey', 'onboarding'],
        },
        {
          id: 'skills-system',
          label: 'Skills & Progression',
          description: '7 skill trees with 45+ skills, XP, and mastery',
          status: 'completed',
          size: 'large',
          icon: '🌳',
          relatedRoutes: ['skills'],
        },
        {
          id: 'martial-arts',
          label: 'Martial Arts',
          description: '10 disciplines with techniques and rank progression',
          status: 'completed',
          size: 'medium',
          icon: '🥋',
          relatedRoutes: ['martial-arts'],
        },
        {
          id: 'character-stats',
          label: 'Character Stats',
          description: 'RPG-style stats, levels, and leaderboards',
          status: 'completed',
          size: 'medium',
          icon: '📊',
          relatedRoutes: ['stats'],
        },
      ],
    },
    {
      id: 'phase-3',
      number: 3,
      label: 'Community',
      description: 'Social features and community',
      clusters: [
        {
          id: 'community-hub',
          label: 'Community Hub',
          description: 'Activity feed, map view, and community stats',
          status: 'completed',
          size: 'large',
          icon: '👥',
          relatedRoutes: ['community'],
        },
        {
          id: 'crews-rivalries',
          label: 'Crews & Rivalries',
          description: 'Team up or compete with others',
          status: 'completed',
          size: 'medium',
          icon: '⚔️',
          relatedRoutes: ['crews', 'rivals'],
        },
        {
          id: 'messaging',
          label: 'Messaging',
          description: 'Direct messaging and conversations',
          status: 'completed',
          size: 'medium',
          icon: '💬',
          relatedRoutes: ['messages'],
        },
        {
          id: 'competitions',
          label: 'Competitions',
          description: 'Challenges and competitive events',
          status: 'completed',
          size: 'medium',
          icon: '🏆',
          relatedRoutes: ['competitions'],
        },
      ],
    },
    {
      id: 'phase-4',
      number: 4,
      label: 'Economy',
      description: 'Credits, marketplace, and rewards',
      clusters: [
        {
          id: 'credits-economy',
          label: 'Credits Economy',
          description: 'Virtual currency with earning and spending',
          status: 'completed',
          size: 'large',
          icon: '💰',
          relatedRoutes: ['credits', 'wallet'],
        },
        {
          id: 'credits-v2',
          label: 'Credits V2',
          description: 'Trust tiers, escrow, and dispute resolution',
          status: 'completed',
          size: 'medium',
          icon: '🏦',
          highlights: ['Trust tiers', 'Escrow system', 'Dispute resolution'],
        },
        {
          id: 'skins-store',
          label: 'Skins Store',
          description: 'Customization marketplace',
          status: 'completed',
          size: 'small',
          icon: '🎨',
          relatedRoutes: ['skins'],
        },
      ],
    },
    {
      id: 'phase-5',
      number: 5,
      label: 'Polish & Scale',
      description: 'Refinements and new platforms',
      clusters: [
        {
          id: 'visual-atlas',
          label: 'Visual Architecture Maps',
          description: 'Interactive site navigation and architecture visualization',
          status: 'in-progress',
          size: 'medium',
          icon: '🗺️',
          highlights: ['Route Atlas', 'Docs Atlas', 'Roadmap Atlas'],
        },
        {
          id: 'mobile-app',
          label: 'Mobile App',
          description: 'Native iOS and Android via Expo',
          status: 'in-progress',
          size: 'large',
          icon: '📱',
        },
        {
          id: 'wearables',
          label: 'Wearable Integration',
          description: 'Apple Watch, Fitbit, and health data sync',
          status: 'planned',
          size: 'medium',
          icon: '⌚',
          relatedRoutes: ['health'],
        },
      ],
    },
  ],
};

const statusConfig = {
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Completed' },
  'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'In Progress' },
  planned: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Planned' },
};

const sizeConfig = {
  small: { width: 'col-span-1' },
  medium: { width: 'col-span-1 md:col-span-2' },
  large: { width: 'col-span-1 md:col-span-2 lg:col-span-3' },
};

interface ClusterCardProps {
  cluster: FeatureCluster;
  onNavigate: (path: string) => void;
}

function ClusterCard({ cluster, onNavigate }: ClusterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[cluster.status];

  return (
    <motion.div
      layout
      className={`
        rounded-xl overflow-hidden
        bg-white/5 border ${status.border}
        hover:bg-white/[0.08] transition-colors
      `}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-2xl">{cluster.icon}</span>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold text-white">{cluster.label}</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400">{cluster.description}</p>
          </div>

          {/* Expand icon */}
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/10">
              {/* Highlights */}
              {cluster.highlights && cluster.highlights.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Highlights</div>
                  <div className="flex flex-wrap gap-1">
                    {cluster.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="px-2 py-0.5 rounded bg-white/10 text-xs text-gray-300"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related routes */}
              {cluster.relatedRoutes && cluster.relatedRoutes.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Related Pages</div>
                  <div className="flex flex-wrap gap-1">
                    {cluster.relatedRoutes.map((routeId) => (
                      <button
                        key={routeId}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(`/${routeId}`);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-500/20 text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
                      >
                        /{routeId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface RoadmapAtlasProps {
  className?: string;
  viewMode?: 'timeline' | 'list';
}

export function RoadmapAtlas({ className = '', viewMode = 'timeline' }: RoadmapAtlasProps) {
  const navigate = useNavigate();
  const [expandedPhase, setExpandedPhase] = useState<string | null>('phase-5'); // Default to latest

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className={`roadmap-atlas ${className}`}>
      {/* Phase navigation */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {STATIC_ROADMAP.phases.map((phase, index) => (
          <React.Fragment key={phase.id}>
            <button
              onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap
                transition-colors
                ${expandedPhase === phase.id
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                }
              `}
            >
              <span className="text-lg font-bold">{phase.number}</span>
              <span className="font-medium">{phase.label}</span>
            </button>
            {index < STATIC_ROADMAP.phases.length - 1 && (
              <div className="w-8 h-px bg-gradient-to-r from-white/20 to-transparent" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {STATIC_ROADMAP.phases.map((phase) => {
          if (expandedPhase !== phase.id) return null;

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Phase header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">
                  Phase {phase.number}: {phase.label}
                </h3>
                {phase.description && (
                  <p className="text-gray-400">{phase.description}</p>
                )}
              </div>

              {/* Clusters grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {phase.clusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Summary stats */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">
              {STATIC_ROADMAP.phases.reduce(
                (acc, p) => acc + p.clusters.filter((c) => c.status === 'completed').length,
                0
              )}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {STATIC_ROADMAP.phases.reduce(
                (acc, p) => acc + p.clusters.filter((c) => c.status === 'in-progress').length,
                0
              )}
            </div>
            <div className="text-xs text-gray-500">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {STATIC_ROADMAP.phases.reduce(
                (acc, p) => acc + p.clusters.filter((c) => c.status === 'planned').length,
                0
              )}
            </div>
            <div className="text-xs text-gray-500">Planned</div>
          </div>
        </div>
      </div>
    </div>
  );
}
