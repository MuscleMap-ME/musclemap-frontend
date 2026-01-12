/**
 * Hello World Plugin - Frontend Entry Point
 *
 * This is a minimal example plugin demonstrating how to:
 * - Create a dashboard widget
 * - Register a custom route/page
 * - Use plugin services (events, hooks, API)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smile, Sparkles, ArrowRight, Heart } from 'lucide-react';

// ============================================
// DASHBOARD WIDGET
// ============================================

/**
 * A simple dashboard widget that displays a greeting
 * and demonstrates plugin capabilities
 */
export function HelloWidget({ greeting = 'Hello, MuscleMap!' }) {
  const [clicks, setClicks] = useState(0);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Hello World Plugin</h3>
          <p className="text-sm text-white/60">Example plugin widget</p>
        </div>
      </div>

      <p className="text-white/80 mb-4">{greeting}</p>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setClicks(c => c + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${clicks > 0 ? 'text-pink-400 fill-pink-400' : ''}`} />
          {clicks > 0 ? `${clicks} clicks` : 'Click me!'}
        </motion.button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors"
        >
          Learn more
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-white/10"
        >
          <p className="text-sm text-white/60">
            This widget was added by the Hello World plugin. It demonstrates
            how plugins can extend the MuscleMap dashboard with custom widgets,
            interactive elements, and more.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// PLUGIN PAGE
// ============================================

/**
 * A custom page route provided by the plugin
 */
export function HelloPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
            <Smile className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4">
            Hello World Plugin
          </h1>
          <p className="text-xl text-white/60">
            Welcome to your first MuscleMap plugin!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">What can plugins do?</h2>
          <ul className="space-y-3 text-white/70">
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
              <span>Add widgets to the dashboard and other pages</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-pink-400 mt-0.5" />
              <span>Create new pages and navigation items</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
              <span>Provide custom themes and styles</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-green-400 mt-0.5" />
              <span>Extend the backend with GraphQL and API routes</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400 mt-0.5" />
              <span>Hook into core functionality with filters and actions</span>
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <h2 className="text-xl font-bold text-white mb-4">Get started</h2>
          <p className="text-white/70 mb-4">
            Check out the plugin development documentation to learn how to create
            your own plugins and contribute to the MuscleMap ecosystem.
          </p>
          <a
            href="https://github.com/MuscleMap-ME/musclemap-frontend/blob/main/docs/PLUGIN-DEVELOPMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-purple-400 transition-colors"
          >
            View Documentation
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================
// PLUGIN ENTRY POINT
// ============================================

/**
 * Plugin lifecycle hooks and exports
 */
const plugin = {
  /**
   * Called when the plugin is loaded
   */
  onLoad(ctx) {
    console.log('[HelloWorld] Plugin loaded!', ctx.pluginId);

    // Subscribe to app events
    ctx.on('app:ready', () => {
      console.log('[HelloWorld] App is ready!');
    });

    // Register a filter hook example
    ctx.addFilter('filter:dashboard-stats', (stats) => {
      // Plugins can modify data flowing through the app
      return {
        ...stats,
        pluginGreeting: 'Hello from the plugin!',
      };
    }, { pluginId: ctx.pluginId, priority: 10 });
  },

  /**
   * Called when the plugin is unloaded
   */
  onUnload() {
    console.log('[HelloWorld] Plugin unloaded!');
  },

  /**
   * Widget components to be registered
   */
  widgets: {
    HelloWidget: () => Promise.resolve({ default: HelloWidget }),
  },

  /**
   * Route components to be registered
   */
  routes: {
    '/plugins/hello': () => Promise.resolve({ default: HelloPage }),
  },
};

export default plugin;
