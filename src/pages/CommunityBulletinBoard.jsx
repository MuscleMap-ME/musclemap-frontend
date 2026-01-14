/**
 * Community Bulletin Board
 *
 * A central hub for community contributions, plugin showcases,
 * code snippets, ideas, and collaboration.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

// ============================================
// ICONS
// ============================================

const Icons = {
  Plugin: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  Code: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Lightbulb: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Sparkles: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Users: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Book: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  ExternalLink: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Copy: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Check: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ArrowRight: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Star: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Heart: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  GitHub: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
};

// ============================================
// CODE BLOCK COMPONENT
// ============================================

function CodeBlock({ code, language = 'javascript', title, description }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
          <div>
            <h4 className="font-semibold text-white text-sm">{title}</h4>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/30 text-purple-300 font-mono">
              {language}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Icons.Check className="w-4 h-4 text-green-400" />
              ) : (
                <Icons.Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      )}
      <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================
// PLUGIN IDEAS DATA
// ============================================

const pluginIdeas = [
  {
    id: 'strava-sync',
    title: 'Strava Integration',
    description: 'Sync workouts with Strava, import activities, show running/cycling stats on dashboard',
    difficulty: 'Medium',
    category: 'Integration',
    features: ['OAuth connection', 'Activity import', 'Dashboard widget', 'Auto-sync'],
    bounty: 500,
  },
  {
    id: 'workout-music',
    title: 'Workout Music Player',
    description: 'Spotify/Apple Music integration with BPM-matched playlists for workout intensity',
    difficulty: 'Medium',
    category: 'Integration',
    features: ['Music controls widget', 'BPM detection', 'Playlist suggestions', 'Rest timer sync'],
    bounty: 400,
  },
  {
    id: 'body-measurements',
    title: 'Body Measurements Tracker',
    description: 'Track body measurements over time with progress photos and trend charts',
    difficulty: 'Easy',
    category: 'Tracking',
    features: ['Measurement input', 'Progress charts', 'Photo gallery', 'Goal tracking'],
    bounty: 300,
  },
  {
    id: 'social-challenges',
    title: 'Social Challenges',
    description: 'Create and join fitness challenges with friends, leaderboards, and prizes',
    difficulty: 'Hard',
    category: 'Social',
    features: ['Challenge creation', 'Leaderboards', 'Notifications', 'Prize pool'],
    bounty: 600,
  },
  {
    id: 'nutrition-ai',
    title: 'AI Nutrition Coach',
    description: 'AI-powered meal suggestions based on workout goals and calorie targets',
    difficulty: 'Hard',
    category: 'AI',
    features: ['Meal planning', 'Macro tracking', 'Recipe suggestions', 'Grocery lists'],
    bounty: 700,
  },
  {
    id: 'dark-themes',
    title: 'Premium Theme Pack',
    description: 'Collection of beautiful dark themes: Cyberpunk, Forest, Ocean, Sunset',
    difficulty: 'Easy',
    category: 'Theme',
    features: ['Multiple themes', 'Color customization', 'Font options', 'Preview mode'],
    bounty: 200,
  },
  {
    id: 'workout-timer',
    title: 'Advanced Workout Timer',
    description: 'Customizable interval timers, HIIT protocols, and audio cues',
    difficulty: 'Easy',
    category: 'Utility',
    features: ['Custom intervals', 'HIIT presets', 'Voice countdown', 'Apple Watch sync'],
    bounty: 250,
  },
  {
    id: 'gym-finder',
    title: 'Gym Finder & Reviews',
    description: 'Find nearby gyms, read reviews, check equipment, and see crowd levels',
    difficulty: 'Medium',
    category: 'Utility',
    features: ['Map integration', 'User reviews', 'Equipment list', 'Crowd predictions'],
    bounty: 450,
  },
];

// ============================================
// CODE SNIPPETS DATA
// ============================================

const codeSnippets = [
  {
    id: 'basic-widget',
    title: 'Basic Dashboard Widget',
    description: 'A simple widget that displays data on the dashboard',
    language: 'jsx',
    category: 'Widget',
    code: `// MyWidget.jsx
import React from 'react';
import { motion } from 'framer-motion';

export function MyWidget({ user, stats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br
                 from-blue-500/20 to-cyan-500/10
                 border border-white/10"
    >
      <h3 className="font-bold text-white mb-2">
        Hello, {user?.username}!
      </h3>
      <p className="text-gray-400">
        You've completed {stats?.totalWorkouts || 0} workouts
      </p>
    </motion.div>
  );
}`,
  },
  {
    id: 'event-listener',
    title: 'Listen to App Events',
    description: 'Subscribe to workout events and react to user actions',
    language: 'jsx',
    category: 'Events',
    code: `// In your plugin's onLoad function
export default {
  onLoad(ctx) {
    // Listen for workout completion
    ctx.on('workout:completed', ({ workoutId, stats }) => {
      console.log('Workout done!', stats);

      // Show a notification
      ctx.notify({
        title: 'Great workout!',
        message: \`You burned \${stats.calories} calories\`,
        type: 'success'
      });
    });

    // Listen for exercise changes
    ctx.on('exercise:started', ({ exercise }) => {
      console.log('Started:', exercise.name);
    });
  }
};`,
  },
  {
    id: 'filter-hook',
    title: 'Modify Data with Filters',
    description: 'Use filter hooks to modify data before it\'s displayed',
    language: 'jsx',
    category: 'Hooks',
    code: `// Add custom stats to the dashboard
export default {
  onLoad(ctx) {
    // Add a filter to modify dashboard stats
    ctx.addFilter('filter:dashboard-stats', (stats) => {
      return {
        ...stats,
        // Add your custom data
        myPluginData: {
          customMetric: 42,
          label: 'My Custom Stat'
        }
      };
    }, { priority: 10 });

    // Modify workout data before display
    ctx.addFilter('filter:workout-display', (workout) => {
      return {
        ...workout,
        customBadge: workout.duration > 60 ? 'Long Session' : null
      };
    });
  }
};`,
  },
  {
    id: 'custom-theme',
    title: 'Create a Custom Theme',
    description: 'Define colors, fonts, and styles for your theme',
    language: 'json',
    category: 'Theme',
    code: `{
  "id": "cyberpunk-neon",
  "name": "Cyberpunk Neon",
  "author": "YourName",
  "colors": {
    "brand-primary": "#ff00ff",
    "brand-secondary": "#00ffff",
    "bg-primary": "#0a0012",
    "bg-secondary": "#1a0025",
    "bg-card": "rgba(255, 0, 255, 0.1)",
    "text-primary": "#ffffff",
    "text-secondary": "#b4a0c4",
    "border": "rgba(255, 0, 255, 0.3)",
    "success": "#00ff88",
    "warning": "#ffaa00",
    "error": "#ff0044"
  },
  "fonts": {
    "heading": "Orbitron, sans-serif",
    "body": "Inter, sans-serif",
    "mono": "JetBrains Mono, monospace"
  },
  "effects": {
    "glow": "0 0 20px rgba(255, 0, 255, 0.5)",
    "blur": "12px"
  }
}`,
  },
  {
    id: 'api-call',
    title: 'Make API Calls',
    description: 'Fetch data from MuscleMap API or external services',
    language: 'jsx',
    category: 'API',
    code: `// Using the plugin API client
export default {
  onLoad(ctx) {
    // Fetch user's workouts
    async function loadWorkouts() {
      const workouts = await ctx.api.get('/workouts', {
        limit: 10,
        sort: 'date:desc'
      });
      return workouts;
    }

    // Post data to your plugin's backend
    async function saveSettings(settings) {
      await ctx.api.post('/plugins/my-plugin/settings', {
        body: settings
      });
    }

    // Call external API (requires permission)
    async function fetchExternalData() {
      const response = await fetch('https://api.example.com/data', {
        headers: {
          'Authorization': \`Bearer \${ctx.config.apiKey}\`
        }
      });
      return response.json();
    }
  }
};`,
  },
  {
    id: 'navigation',
    title: 'Add Navigation & Routes',
    description: 'Register new pages and navigation items',
    language: 'jsx',
    category: 'Routes',
    code: `// plugin.json - Register routes
{
  "contributes": {
    "routes": [
      {
        "path": "/my-plugin",
        "title": "My Plugin",
        "icon": "Sparkles"
      },
      {
        "path": "/my-plugin/settings",
        "title": "Settings",
        "protected": true
      }
    ],
    "navItems": [
      {
        "label": "My Plugin",
        "path": "/my-plugin",
        "icon": "Sparkles",
        "section": "plugins"
      }
    ]
  }
}

// frontend/index.jsx - Export route components
export default {
  routes: {
    '/my-plugin': () => import('./pages/MainPage'),
    '/my-plugin/settings': () => import('./pages/SettingsPage')
  }
};`,
  },
];

// ============================================
// COMMUNITY CONTRIBUTIONS
// ============================================

const communityShowcase = [
  {
    id: 1,
    title: 'Workout Streak Widget',
    author: 'FitnessDevPro',
    avatar: '🔥',
    description: 'Shows your current workout streak with fire animations',
    stars: 47,
    downloads: 234,
    category: 'Widget',
  },
  {
    id: 2,
    title: 'Midnight Purple Theme',
    author: 'DesignGuru',
    avatar: '🎨',
    description: 'A deep purple theme with subtle gradients',
    stars: 89,
    downloads: 567,
    category: 'Theme',
  },
  {
    id: 3,
    title: 'PR Celebration Confetti',
    author: 'PartyLifter',
    avatar: '🎉',
    description: 'Adds confetti animation when you hit a new PR',
    stars: 156,
    downloads: 892,
    category: 'Widget',
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CommunityBulletinBoard() {
  const [activeTab, setActiveTab] = useState('ideas');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const tabs = [
    { id: 'ideas', label: 'Plugin Ideas', icon: Icons.Lightbulb },
    { id: 'snippets', label: 'Code Snippets', icon: Icons.Code },
    { id: 'showcase', label: 'Community Showcase', icon: Icons.Star },
    { id: 'guides', label: 'Quick Guides', icon: Icons.Book },
  ];

  const categories = ['all', 'Widget', 'Theme', 'Integration', 'Utility', 'Social', 'AI'];

  const filteredSnippets = selectedCategory === 'all'
    ? codeSnippets
    : codeSnippets.filter(s => s.category === selectedCategory);

  const filteredIdeas = selectedCategory === 'all'
    ? pluginIdeas
    : pluginIdeas.filter(i => i.category === selectedCategory);

  return (
    <>
      <SEO
        title="Community Bulletin Board"
        description="Explore plugin ideas, code snippets, and community contributions for MuscleMap"
      />
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">Community Bulletin Board</h1>
                  <p className="text-sm text-gray-400">Ideas, snippets, and contributions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/MuscleMap-ME/musclemap-frontend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <Icons.GitHub className="w-4 h-4" />
                  <span className="hidden sm:inline">GitHub</span>
                </a>
                <Link
                  to="/docs/plugins"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors"
                >
                  <Icons.Book className="w-4 h-4" />
                  <span className="hidden sm:inline">Docs</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-white/10 bg-black/20">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Category Filter */}
        {(activeTab === 'ideas' || activeTab === 'snippets') && (
          <div className="border-b border-white/5 bg-black/10">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs text-gray-500 mr-2">Filter:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-white/10 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {/* Plugin Ideas Tab */}
            {activeTab === 'ideas' && (
              <motion.div
                key="ideas"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-2">Plugin Ideas & Bounties</h2>
                  <p className="text-gray-400">
                    These plugins are wanted by the community. Build one and earn recognition!
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {filteredIdeas.map((idea, index) => (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-white text-lg">{idea.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              idea.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                              idea.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {idea.difficulty}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400">
                              {idea.category}
                            </span>
                          </div>
                        </div>
                        {idea.bounty && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-400">{idea.bounty}</div>
                            <div className="text-[10px] text-gray-500">COINS</div>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-400 text-sm mb-4">{idea.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {idea.features.map((feature) => (
                          <span key={feature} className="px-2 py-1 rounded bg-white/5 text-xs text-gray-400">
                            {feature}
                          </span>
                        ))}
                      </div>

                      <Link
                        to="/docs/plugins"
                        className="inline-flex items-center gap-1 text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
                      >
                        Start Building
                        <Icons.ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Submit Idea CTA */}
                <div className="mt-12 p-8 rounded-2xl border border-dashed border-white/20 bg-white/5 text-center">
                  <Icons.Lightbulb className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Have a Plugin Idea?</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Share your plugin idea with the community. If it gets enough votes, we&apos;ll add a bounty!
                  </p>
                  <a
                    href="https://github.com/MuscleMap-ME/musclemap-frontend/discussions/new?category=plugin-ideas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30 transition-colors font-medium"
                  >
                    <Icons.Lightbulb className="w-5 h-5" />
                    Submit Your Idea
                  </a>
                </div>
              </motion.div>
            )}

            {/* Code Snippets Tab */}
            {activeTab === 'snippets' && (
              <motion.div
                key="snippets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-2">Ready-to-Use Code Snippets</h2>
                  <p className="text-gray-400">
                    Copy and paste these snippets to jumpstart your plugin development.
                  </p>
                </div>

                <div className="space-y-6">
                  {filteredSnippets.map((snippet, index) => (
                    <motion.div
                      key={snippet.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CodeBlock
                        code={snippet.code}
                        language={snippet.language}
                        title={snippet.title}
                        description={snippet.description}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* More Resources */}
                <div className="mt-12 grid md:grid-cols-2 gap-6">
                  <Link
                    to="/docs/plugins"
                    className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-cyan-500/30 transition-colors group"
                  >
                    <Icons.Book className="w-10 h-10 text-cyan-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Full Documentation</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Complete API reference, manifest schema, and advanced patterns.
                    </p>
                    <span className="inline-flex items-center gap-1 text-cyan-400 text-sm font-medium group-hover:gap-2 transition-all">
                      Read Docs
                      <Icons.ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>

                  <a
                    href="https://github.com/MuscleMap-ME/musclemap-frontend"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-green-500/30 transition-colors group"
                  >
                    <Icons.GitHub className="w-10 h-10 text-green-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Source Code</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Explore the MuscleMap frontend repository on GitHub.
                    </p>
                    <span className="inline-flex items-center gap-1 text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
                      View on GitHub
                      <Icons.ExternalLink className="w-4 h-4" />
                    </span>
                  </a>
                </div>
              </motion.div>
            )}

            {/* Community Showcase Tab */}
            {activeTab === 'showcase' && (
              <motion.div
                key="showcase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-2">Community Showcase</h2>
                  <p className="text-gray-400">
                    Plugins and themes created by the MuscleMap community.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  {communityShowcase.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-purple-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl">
                          {item.avatar}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{item.title}</h3>
                          <p className="text-sm text-gray-500">by {item.author}</p>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-4">{item.description}</p>

                      <div className="flex items-center justify-between">
                        <span className="px-2 py-1 rounded bg-white/10 text-xs text-gray-400">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Icons.Star className="w-3 h-3 text-yellow-500" />
                            {item.stars}
                          </span>
                          <span>{item.downloads} installs</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Coming Soon */}
                <div className="p-8 rounded-2xl border border-dashed border-purple-500/30 bg-purple-500/5 text-center">
                  <Icons.Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Plugin Marketplace Coming Soon</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    We&apos;re building a full marketplace where you can publish, discover, and install plugins with one click.
                  </p>
                  <Link
                    to="/plugins"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors font-medium"
                  >
                    <Icons.Plugin className="w-5 h-5" />
                    Preview Marketplace
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Quick Guides Tab */}
            {activeTab === 'guides' && (
              <motion.div
                key="guides"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-2">Quick Start Guides</h2>
                  <p className="text-gray-400">
                    Step-by-step guides to get you building plugins in minutes.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Guide 1: Your First Widget */}
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <span className="text-xl">1</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Your First Widget</h3>
                        <p className="text-xs text-gray-500">5 min read</p>
                      </div>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-400 mb-4">
                      <li className="flex gap-2">
                        <span className="text-green-400">1.</span>
                        Create <code className="px-1 py-0.5 bg-white/10 rounded text-xs">plugins/my-widget/plugin.json</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400">2.</span>
                        Define widget slot as <code className="px-1 py-0.5 bg-white/10 rounded text-xs">dashboard.main</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400">3.</span>
                        Create <code className="px-1 py-0.5 bg-white/10 rounded text-xs">frontend/index.jsx</code> with your component
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400">4.</span>
                        Export widget in the <code className="px-1 py-0.5 bg-white/10 rounded text-xs">widgets</code> object
                      </li>
                    </ol>
                    <Link
                      to="/docs/plugins"
                      className="inline-flex items-center gap-1 text-green-400 text-sm font-medium"
                    >
                      Full Guide <Icons.ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Guide 2: Creating Themes */}
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <span className="text-xl">2</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Creating Themes</h3>
                        <p className="text-xs text-gray-500">3 min read</p>
                      </div>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-400 mb-4">
                      <li className="flex gap-2">
                        <span className="text-purple-400">1.</span>
                        Define color palette in <code className="px-1 py-0.5 bg-white/10 rounded text-xs">theme.json</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-400">2.</span>
                        Map colors to CSS variables
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-400">3.</span>
                        Optionally add custom fonts
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-400">4.</span>
                        Register in plugin manifest
                      </li>
                    </ol>
                    <Link
                      to="/docs/plugins"
                      className="inline-flex items-center gap-1 text-purple-400 text-sm font-medium"
                    >
                      Full Guide <Icons.ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Guide 3: Adding Routes */}
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-xl">3</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Adding New Pages</h3>
                        <p className="text-xs text-gray-500">7 min read</p>
                      </div>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-400 mb-4">
                      <li className="flex gap-2">
                        <span className="text-blue-400">1.</span>
                        Define routes in <code className="px-1 py-0.5 bg-white/10 rounded text-xs">plugin.json</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">2.</span>
                        Create page components in <code className="px-1 py-0.5 bg-white/10 rounded text-xs">frontend/pages/</code>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">3.</span>
                        Add navigation items (optional)
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400">4.</span>
                        Use <code className="px-1 py-0.5 bg-white/10 rounded text-xs">ctx.navigate()</code> for navigation
                      </li>
                    </ol>
                    <Link
                      to="/docs/plugins"
                      className="inline-flex items-center gap-1 text-blue-400 text-sm font-medium"
                    >
                      Full Guide <Icons.ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Guide 4: Backend Integration */}
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <span className="text-xl">4</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Backend Integration</h3>
                        <p className="text-xs text-gray-500">10 min read</p>
                      </div>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-400 mb-4">
                      <li className="flex gap-2">
                        <span className="text-cyan-400">1.</span>
                        Add <code className="px-1 py-0.5 bg-white/10 rounded text-xs">backend/index.ts</code> entry point
                      </li>
                      <li className="flex gap-2">
                        <span className="text-cyan-400">2.</span>
                        Define API routes with Fastify
                      </li>
                      <li className="flex gap-2">
                        <span className="text-cyan-400">3.</span>
                        Extend GraphQL schema (optional)
                      </li>
                      <li className="flex gap-2">
                        <span className="text-cyan-400">4.</span>
                        Use <code className="px-1 py-0.5 bg-white/10 rounded text-xs">ctx.api</code> from frontend
                      </li>
                    </ol>
                    <Link
                      to="/docs/plugins"
                      className="inline-flex items-center gap-1 text-cyan-400 text-sm font-medium"
                    >
                      Full Guide <Icons.ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Visual Diagram */}
                <div className="mt-12 p-8 rounded-2xl border border-white/10 bg-black/40">
                  <h3 className="text-lg font-bold text-white mb-6 text-center">Plugin Architecture Overview</h3>

                  {/* ASCII-style Diagram */}
                  <div className="font-mono text-xs md:text-sm overflow-x-auto">
                    <pre className="text-center text-gray-400">
{`┌─────────────────────────────────────────────────────────────┐
│                    YOUR PLUGIN                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │ `}<span className="text-purple-400">plugin.json</span>{`  │    │  `}<span className="text-green-400">frontend/</span>{`   │    │  `}<span className="text-cyan-400">backend/</span>{`    │  │
│   │              │    │              │    │              │  │
│   │ • id         │    │ • widgets    │    │ • routes     │  │
│   │ • name       │    │ • pages      │    │ • graphql    │  │
│   │ • version    │    │ • themes     │    │ • services   │  │
│   │ • contributes│    │ • hooks      │    │              │  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│          │                   │                   │          │
│          └───────────────────┼───────────────────┘          │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                 MUSCLEMAP PLUGIN HOST                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   `}<span className="text-yellow-400">Plugin Registry</span>{` ──► `}<span className="text-blue-400">Widget Slots</span>{` ──► `}<span className="text-pink-400">Theme Provider</span>{`   │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│   `}<span className="text-green-400">Event Bus</span>{`    ◄───►    `}<span className="text-purple-400">Routes</span>{`    ◄───►    `}<span className="text-cyan-400">Hooks</span>{`          │
│                                                              │
└──────────────────────────────────────────────────────────────┘`}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/40 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <Link to="/plugins" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Plugin Marketplace
                </Link>
                <Link to="/docs/plugins" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Documentation
                </Link>
                <a
                  href="https://github.com/MuscleMap-ME/musclemap-frontend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  GitHub
                </a>
              </div>
              <p className="text-gray-500 text-sm">
                Built with love by the MuscleMap community
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
