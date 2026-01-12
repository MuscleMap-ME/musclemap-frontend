/**
 * Contribute Ideas Page
 *
 * A page showcasing ways to contribute to MuscleMap,
 * with project improvement ideas and suggestions.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

// ============================================
// CONTRIBUTION CATEGORIES
// ============================================

const contributionAreas = [
  {
    id: 'code',
    icon: '💻',
    title: 'Code Contributions',
    description: 'Help build new features and fix bugs',
    color: 'blue',
    items: [
      {
        title: 'Improve Performance',
        description: 'Optimize bundle size, lazy loading, and render performance',
        difficulty: 'Medium',
        impact: 'High',
        skills: ['React', 'Profiling', 'Webpack'],
      },
      {
        title: 'Add PWA Support',
        description: 'Make MuscleMap installable as a Progressive Web App',
        difficulty: 'Medium',
        impact: 'High',
        skills: ['Service Workers', 'Manifest'],
      },
      {
        title: 'Accessibility Improvements',
        description: 'Improve keyboard navigation and screen reader support',
        difficulty: 'Easy',
        impact: 'High',
        skills: ['a11y', 'ARIA', 'Testing'],
      },
      {
        title: 'Offline Mode',
        description: 'Allow workout logging when offline with sync on reconnect',
        difficulty: 'Hard',
        impact: 'High',
        skills: ['IndexedDB', 'Service Workers'],
      },
    ],
  },
  {
    id: 'design',
    icon: '🎨',
    title: 'Design & UX',
    description: 'Improve the visual experience',
    color: 'purple',
    items: [
      {
        title: 'Dark Theme Variants',
        description: 'Create AMOLED black, high contrast, and colorblind-friendly themes',
        difficulty: 'Easy',
        impact: 'Medium',
        skills: ['CSS', 'Design Systems'],
      },
      {
        title: 'Onboarding Flow',
        description: 'Design a welcoming first-time user experience',
        difficulty: 'Medium',
        impact: 'High',
        skills: ['UX', 'Animation'],
      },
      {
        title: 'Microinteractions',
        description: 'Add delightful animations to buttons, cards, and transitions',
        difficulty: 'Easy',
        impact: 'Medium',
        skills: ['Framer Motion', 'CSS'],
      },
      {
        title: 'Mobile Optimization',
        description: 'Improve touch targets, gestures, and mobile layouts',
        difficulty: 'Medium',
        impact: 'High',
        skills: ['Responsive Design', 'Touch UX'],
      },
    ],
  },
  {
    id: 'content',
    icon: '📝',
    title: 'Content & Docs',
    description: 'Write guides and documentation',
    color: 'green',
    items: [
      {
        title: 'Exercise Descriptions',
        description: 'Add detailed instructions and tips for exercises',
        difficulty: 'Easy',
        impact: 'High',
        skills: ['Writing', 'Fitness Knowledge'],
      },
      {
        title: 'Video Tutorials',
        description: 'Create video guides for features and workout techniques',
        difficulty: 'Medium',
        impact: 'High',
        skills: ['Video Editing', 'Teaching'],
      },
      {
        title: 'API Documentation',
        description: 'Improve developer docs with examples and use cases',
        difficulty: 'Easy',
        impact: 'Medium',
        skills: ['Technical Writing'],
      },
      {
        title: 'Translations',
        description: 'Help translate MuscleMap to other languages',
        difficulty: 'Easy',
        impact: 'High',
        skills: ['Language Skills'],
      },
    ],
  },
  {
    id: 'community',
    icon: '👥',
    title: 'Community Building',
    description: 'Help grow the MuscleMap community',
    color: 'pink',
    items: [
      {
        title: 'Answer Questions',
        description: 'Help users on GitHub Discussions and Discord',
        difficulty: 'Easy',
        impact: 'Medium',
        skills: ['Communication'],
      },
      {
        title: 'Write Blog Posts',
        description: 'Share your MuscleMap journey and tips',
        difficulty: 'Easy',
        impact: 'Medium',
        skills: ['Writing'],
      },
      {
        title: 'Bug Reports',
        description: 'Report issues with detailed reproduction steps',
        difficulty: 'Easy',
        impact: 'High',
        skills: ['Testing', 'Communication'],
      },
      {
        title: 'Feature Requests',
        description: 'Suggest and discuss new features thoughtfully',
        difficulty: 'Easy',
        impact: 'Medium',
        skills: ['Product Thinking'],
      },
    ],
  },
];

// ============================================
// FEATURE IDEAS
// ============================================

const featureIdeas = [
  {
    id: 1,
    title: 'AI Form Checker',
    description: 'Use device camera to analyze exercise form and provide feedback',
    category: 'AI/ML',
    votes: 234,
    status: 'proposed',
  },
  {
    id: 2,
    title: 'Wearable Integration',
    description: 'Sync with Apple Watch, Garmin, Fitbit for heart rate and calories',
    category: 'Integration',
    votes: 189,
    status: 'planned',
  },
  {
    id: 3,
    title: 'Workout Templates Marketplace',
    description: 'Share and discover workout templates from other users',
    category: 'Social',
    votes: 156,
    status: 'proposed',
  },
  {
    id: 4,
    title: 'Voice Commands',
    description: 'Control workouts hands-free during exercise',
    category: 'UX',
    votes: 142,
    status: 'proposed',
  },
  {
    id: 5,
    title: 'AR Muscle Overlay',
    description: 'Use AR to show muscle activation on your own body',
    category: 'AR/VR',
    votes: 128,
    status: 'exploring',
  },
  {
    id: 6,
    title: 'Gym Equipment Scanner',
    description: 'Scan gym equipment to auto-add exercise to workout',
    category: 'UX',
    votes: 98,
    status: 'proposed',
  },
];

// ============================================
// QUICK WINS
// ============================================

const quickWins = [
  {
    title: 'Fix Typos',
    description: 'Found a typo? Fix it and submit a PR',
    time: '5 min',
    link: 'https://github.com/MuscleMap-ME/musclemap-frontend',
  },
  {
    title: 'Update Dependencies',
    description: 'Help keep packages up to date',
    time: '15 min',
    link: 'https://github.com/MuscleMap-ME/musclemap-frontend/issues?q=is%3Aissue+is%3Aopen+label%3Adependencies',
  },
  {
    title: 'Add Tests',
    description: 'Improve test coverage for existing code',
    time: '30 min',
    link: 'https://github.com/MuscleMap-ME/musclemap-frontend',
  },
  {
    title: 'Improve Comments',
    description: 'Add JSDoc comments to functions',
    time: '15 min',
    link: 'https://github.com/MuscleMap-ME/musclemap-frontend',
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ContributeIdeas() {
  const [selectedArea, setSelectedArea] = useState(null);
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500/20 text-green-400';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Hard':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'exploring':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'proposed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <>
      <SEO
        title="Contribute Ideas"
        description="Discover ways to contribute to MuscleMap and help shape the future of fitness tracking"
      />
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/community/bulletin" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">Contribute to MuscleMap</h1>
                  <p className="text-sm text-gray-400">Every contribution makes a difference</p>
                </div>
              </div>
              <a
                href="https://github.com/MuscleMap-ME/musclemap-frontend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-6xl mb-6"
            >
              🤝
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-black mb-4"
            >
              <span
                style={{
                  background: 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Shape the Future of Fitness
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              MuscleMap is built by the community. Whether you code, design, write, or just have great ideas —
              there's a place for you.
            </motion.p>
          </div>
        </section>

        {/* Quick Wins */}
        <section className="py-12 px-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-6">Quick Wins - Start Here!</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickWins.map((win, i) => (
                <motion.a
                  key={win.title}
                  href={win.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-green-500/30 hover:bg-green-500/5 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                      {win.time}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white mb-1">{win.title}</h4>
                  <p className="text-xs text-gray-500">{win.description}</p>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Contribution Areas */}
        <section className="py-12 px-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-6">Ways to Contribute</h3>

            {/* Area Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {contributionAreas.map((area, i) => (
                <motion.button
                  key={area.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    selectedArea === area.id
                      ? `border-${area.color}-500/50 bg-${area.color}-500/10`
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="text-4xl mb-4">{area.icon}</div>
                  <h4 className="font-bold text-white mb-1">{area.title}</h4>
                  <p className="text-sm text-gray-500">{area.description}</p>
                  <div className="mt-3 text-xs text-gray-600">
                    {area.items.length} opportunities
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Expanded Area Items */}
            {selectedArea && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <div className="p-6 rounded-2xl border border-white/10 bg-black/40">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-white text-lg">
                      {contributionAreas.find((a) => a.id === selectedArea)?.title}
                    </h4>
                    <div className="flex gap-2">
                      {['all', 'Easy', 'Medium', 'Hard'].map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setFilterDifficulty(diff)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            filterDifficulty === diff
                              ? 'bg-white/10 text-white'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {diff === 'all' ? 'All' : diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {contributionAreas
                      .find((a) => a.id === selectedArea)
                      ?.items.filter(
                        (item) => filterDifficulty === 'all' || item.difficulty === filterDifficulty
                      )
                      .map((item, i) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          className="p-4 rounded-xl border border-white/10 bg-white/5"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-white">{item.title}</h5>
                            <div className="flex gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getDifficultyColor(item.difficulty)}`}>
                                {item.difficulty}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                item.impact === 'High'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {item.impact} Impact
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {item.skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-500"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Feature Ideas */}
        <section className="py-12 px-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Community Feature Ideas</h3>
              <a
                href="https://github.com/MuscleMap-ME/musclemap-frontend/discussions/new?category=feature-requests"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                + Suggest a Feature
              </a>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featureIdeas.map((idea, i) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="p-5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(idea.status)}`}>
                      {idea.status}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21L12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
                      </svg>
                      <span className="text-sm font-medium">{idea.votes}</span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-white mb-2">{idea.title}</h4>
                  <p className="text-sm text-gray-400 mb-3">{idea.description}</p>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-500">
                    {idea.category}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Embellishments & Enhancements */}
        <section className="py-12 px-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-6">Polish & Embellishments</h3>
            <p className="text-gray-400 mb-8">
              Small touches that make a big difference. These don't require major code changes.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Animation Ideas */}
              <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-3xl mb-4">✨</div>
                <h4 className="font-bold text-white mb-2">Animation Ideas</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Confetti on achievements</li>
                  <li>• Muscle pulse on activation</li>
                  <li>• Streak fire animation</li>
                  <li>• XP bar fill animation</li>
                  <li>• Button hover ripples</li>
                  <li>• Page transition effects</li>
                </ul>
              </div>

              {/* Sound Effects */}
              <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-3xl mb-4">🔊</div>
                <h4 className="font-bold text-white mb-2">Audio Feedback</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Set completion sound</li>
                  <li>• PR celebration fanfare</li>
                  <li>• Timer countdown beeps</li>
                  <li>• Achievement unlock sound</li>
                  <li>• Button click feedback</li>
                  <li>• Workout start/end tones</li>
                </ul>
              </div>

              {/* Visual Touches */}
              <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                <div className="text-3xl mb-4">🎨</div>
                <h4 className="font-bold text-white mb-2">Visual Touches</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Gradient text effects</li>
                  <li>• Glass morphism cards</li>
                  <li>• Particle backgrounds</li>
                  <li>• Progress ring effects</li>
                  <li>• Icon animations</li>
                  <li>• Loading skeletons</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started CTA */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-cyan-500/5"
            >
              <div className="text-5xl mb-6">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Contribute?</h3>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Fork the repo, make your changes, and submit a pull request.
                Every contribution, big or small, is appreciated!
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://github.com/MuscleMap-ME/musclemap-frontend/fork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Fork Repository
                </a>
                <Link
                  to="/docs/plugins"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Read the Docs
                </Link>
                <Link
                  to="/community/bulletin"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Join Community
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
