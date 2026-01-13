/**
 * Plugin Development Guide
 *
 * A visual, step-by-step guide for creating MuscleMap plugins
 * with interactive diagrams and code examples.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

// ============================================
// ICONS
// ============================================

const Icons = {
  Check: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Copy: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Folder: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  File: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  ArrowRight: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ArrowDown: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
};

// ============================================
// CODE BLOCK COMPONENT
// ============================================

function CodeBlock({ code, language = 'javascript', filename }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {filename && (
            <span className="text-xs text-gray-500 font-mono ml-2">{filename}</span>
          )}
        </div>
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
      <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================
// STEP COMPONENT
// ============================================

function Step({ number, title, description, children, color = 'purple' }) {
  const colorClasses = {
    purple: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
    green: 'from-green-500/20 to-emerald-500/10 border-green-500/30',
    blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30',
    cyan: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30',
  };

  const numberColors = {
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`p-6 md:p-8 rounded-2xl border bg-gradient-to-br ${colorClasses[color]}`}
    >
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl ${numberColors[color]} flex items-center justify-center font-bold text-xl shrink-0`}>
          {number}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-400 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ============================================
// WIDGET SLOT VISUALIZER
// ============================================

function WidgetSlotVisualizer() {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const slots = [
    { id: 'dashboard.header', label: 'Header', position: 'top-0 left-0 right-0 h-12' },
    { id: 'dashboard.stats', label: 'Stats Area', position: 'top-16 left-0 right-0 h-20' },
    { id: 'dashboard.main', label: 'Main Content', position: 'top-40 left-0 right-2/3 bottom-16' },
    { id: 'dashboard.sidebar', label: 'Sidebar', position: 'top-40 right-0 w-1/3 bottom-16' },
    { id: 'dashboard.footer', label: 'Footer', position: 'bottom-0 left-0 right-0 h-12' },
  ];

  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-black/40">
      <h4 className="text-lg font-bold text-white mb-4">Dashboard Widget Slots</h4>
      <p className="text-sm text-gray-400 mb-6">
        Hover over each slot to see where your widget will appear.
      </p>

      <div className="relative aspect-video bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`absolute ${slot.position} border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer ${
              hoveredSlot === slot.id
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-white/20 hover:border-white/40'
            }`}
            onMouseEnter={() => setHoveredSlot(slot.id)}
            onMouseLeave={() => setHoveredSlot(null)}
            style={{ margin: '8px' }}
          >
            <div className={`text-center transition-opacity ${hoveredSlot === slot.id ? 'opacity-100' : 'opacity-50'}`}>
              <div className="text-xs font-medium text-white">{slot.label}</div>
              <div className="text-[10px] text-gray-500 font-mono">{slot.id}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Slot Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.id}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
              hoveredSlot === slot.id
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-white/5 text-gray-500 hover:text-gray-300'
            }`}
            onMouseEnter={() => setHoveredSlot(slot.id)}
            onMouseLeave={() => setHoveredSlot(null)}
          >
            {slot.id}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PLUGIN LIFECYCLE DIAGRAM
// ============================================

function LifecycleDiagram() {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-black/40 overflow-x-auto">
      <h4 className="text-lg font-bold text-white mb-6">Plugin Lifecycle</h4>

      <div className="flex items-center justify-center gap-4 min-w-[600px]">
        {/* Discovery */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
          <div className="mt-2 text-sm font-medium text-white">Discovery</div>
          <div className="text-[10px] text-gray-500 text-center">Scan plugins/</div>
        </div>

        <Icons.ArrowRight className="w-6 h-6 text-gray-600" />

        {/* Validation */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <div className="mt-2 text-sm font-medium text-white">Validation</div>
          <div className="text-[10px] text-gray-500 text-center">Check manifest</div>
        </div>

        <Icons.ArrowRight className="w-6 h-6 text-gray-600" />

        {/* Loading */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
          <div className="mt-2 text-sm font-medium text-white">Loading</div>
          <div className="text-[10px] text-gray-500 text-center">Import modules</div>
        </div>

        <Icons.ArrowRight className="w-6 h-6 text-gray-600" />

        {/* Registration */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <span className="text-2xl">🎯</span>
          </div>
          <div className="mt-2 text-sm font-medium text-white">Registration</div>
          <div className="text-[10px] text-gray-500 text-center">Add to registry</div>
        </div>

        <Icons.ArrowRight className="w-6 h-6 text-gray-600" />

        {/* Active */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center animate-pulse">
            <span className="text-2xl">⚡</span>
          </div>
          <div className="mt-2 text-sm font-medium text-white">Active</div>
          <div className="text-[10px] text-gray-500 text-center">Running!</div>
        </div>
      </div>

      {/* Lifecycle hooks */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-green-400 font-mono mb-1">onLoad(ctx)</div>
          <div className="text-[10px] text-gray-500">Called when plugin activates</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-yellow-400 font-mono mb-1">onUnload()</div>
          <div className="text-[10px] text-gray-500">Called before deactivation</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-blue-400 font-mono mb-1">onSettingsChange()</div>
          <div className="text-[10px] text-gray-500">Called on config update</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-purple-400 font-mono mb-1">onUserLogin()</div>
          <div className="text-[10px] text-gray-500">Called on user auth</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PluginGuide() {
  return (
    <>
      <SEO
        title="Plugin Development Guide"
        description="Learn how to build MuscleMap plugins with our visual step-by-step guide"
      />
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/community/bulletin" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">Plugin Development Guide</h1>
                  <p className="text-sm text-gray-400">Build your first plugin in 15 minutes</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-6 border-b border-white/5">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-6"
            >
              <span className="text-xl">🧩</span>
              <span className="text-purple-400 text-sm font-medium">Plugin SDK v1.0</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black mb-6"
            >
              <span
                style={{
                  background: 'linear-gradient(90deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Build Amazing Plugins
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Extend MuscleMap with custom widgets, themes, pages, and integrations.
              No complex setup required.
            </motion.p>
          </div>
        </section>

        {/* Quick Overview */}
        <section className="py-12 px-6 border-b border-white/5">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-6 text-center">What You Can Build</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '📊', label: 'Dashboard Widgets', desc: 'Stats, charts, info cards' },
                { icon: '🎨', label: 'Custom Themes', desc: 'Colors, fonts, effects' },
                { icon: '📱', label: 'New Pages', desc: 'Full-page features' },
                { icon: '🔗', label: 'Integrations', desc: 'Connect external apps' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 text-center"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="font-semibold text-white text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Step-by-Step Guide */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Step 1: Create Directory */}
            <Step
              number={1}
              title="Create Your Plugin Directory"
              description="Set up the folder structure for your plugin"
              color="green"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-sm font-medium text-white mb-3">Directory Structure</div>
                    <div className="font-mono text-sm space-y-1">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Icons.Folder className="w-4 h-4" />
                        <span>plugins/my-plugin/</span>
                      </div>
                      <div className="ml-6 flex items-center gap-2 text-blue-400">
                        <Icons.File className="w-4 h-4" />
                        <span>plugin.json</span>
                      </div>
                      <div className="ml-6 flex items-center gap-2 text-gray-500">
                        <Icons.Folder className="w-4 h-4" />
                        <span>frontend/</span>
                      </div>
                      <div className="ml-12 flex items-center gap-2 text-green-400">
                        <Icons.File className="w-4 h-4" />
                        <span>index.jsx</span>
                      </div>
                      <div className="ml-6 flex items-center gap-2 text-gray-500">
                        <Icons.File className="w-4 h-4" />
                        <span>README.md</span>
                      </div>
                    </div>
                  </div>
                </div>

                <CodeBlock
                  filename="Terminal"
                  code={`# Create your plugin directory
mkdir -p plugins/my-plugin/frontend

# Create the required files
touch plugins/my-plugin/plugin.json
touch plugins/my-plugin/frontend/index.jsx`}
                />
              </div>
            </Step>

            {/* Step 2: Plugin Manifest */}
            <Step
              number={2}
              title="Define Your Plugin Manifest"
              description="The plugin.json file tells MuscleMap about your plugin"
              color="blue"
            >
              <CodeBlock
                filename="plugins/my-plugin/plugin.json"
                code={`{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A brief description of what your plugin does",
  "author": "YourName",

  "entry": {
    "frontend": "./frontend/index.jsx"
  },

  "contributes": {
    "widgets": [
      {
        "slot": "dashboard.main",
        "component": "MyWidget",
        "defaultProps": {}
      }
    ]
  },

  "permissions": [
    "workouts:read"
  ],

  "capabilities": ["widgets"]
}`}
              />

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs font-medium text-blue-400 mb-1">Required Fields</div>
                  <div className="text-xs text-gray-500">id, name, version, entry</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs font-medium text-green-400 mb-1">Contributes</div>
                  <div className="text-xs text-gray-500">widgets, routes, themes, navItems</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs font-medium text-yellow-400 mb-1">Permissions</div>
                  <div className="text-xs text-gray-500">workouts, user, external APIs</div>
                </div>
              </div>
            </Step>

            {/* Step 3: Frontend Entry */}
            <Step
              number={3}
              title="Create Your Widget Component"
              description="Build your widget using React and the plugin context"
              color="purple"
            >
              <CodeBlock
                filename="plugins/my-plugin/frontend/index.jsx"
                code={`import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Your widget component
export function MyWidget({ user, stats }) {
  const [count, setCount] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br
                 from-purple-500/20 to-pink-500/10
                 border border-white/10"
    >
      <h3 className="font-bold text-white text-lg mb-2">
        My Plugin Widget
      </h3>
      <p className="text-gray-400 mb-4">
        Hello, {user?.username || 'Athlete'}!
      </p>
      <button
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-purple-500/20 border border-purple-500/30
                   text-purple-400 rounded-lg hover:bg-purple-500/30"
      >
        Clicked {count} times
      </button>
    </motion.div>
  );
}

// Plugin entry point
export default {
  onLoad(ctx) {
    console.log('Plugin loaded!', ctx.pluginId);

    // Subscribe to events
    ctx.on('workout:completed', (data) => {
      ctx.notify({ title: 'Great workout!', type: 'success' });
    });
  },

  onUnload() {
    console.log('Plugin unloaded');
  },

  // Register widgets
  widgets: {
    MyWidget: () => Promise.resolve({ default: MyWidget }),
  },
};`}
              />
            </Step>

            {/* Widget Slots Visualizer */}
            <div className="my-12">
              <h3 className="text-xl font-bold text-white mb-6">Available Widget Slots</h3>
              <WidgetSlotVisualizer />
            </div>

            {/* Step 4: Test Your Plugin */}
            <Step
              number={4}
              title="Test Your Plugin"
              description="Run the development server and see your plugin in action"
              color="yellow"
            >
              <CodeBlock
                filename="Terminal"
                code={`# Start the development server
pnpm dev

# Your plugin will hot-reload as you make changes
# Open http://localhost:5173/dashboard to see your widget`}
              />

              <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-medium text-yellow-400">Pro Tip</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Open the browser console to see plugin lifecycle logs. Your <code className="px-1 py-0.5 bg-white/10 rounded text-xs">onLoad</code> message
                      will appear when the plugin activates.
                    </div>
                  </div>
                </div>
              </div>
            </Step>

            {/* Lifecycle Diagram */}
            <div className="my-12">
              <h3 className="text-xl font-bold text-white mb-6">Plugin Lifecycle</h3>
              <LifecycleDiagram />
            </div>

            {/* Step 5: Publish */}
            <Step
              number={5}
              title="Publish Your Plugin"
              description="Share your plugin with the MuscleMap community"
              color="cyan"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="font-medium text-white mb-3">Publishing Checklist</h4>
                  <div className="space-y-2">
                    {[
                      'Add a README.md with usage instructions',
                      'Include screenshots in your README',
                      'Test on different screen sizes',
                      'Add proper error handling',
                      'Update version number in plugin.json',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-gray-400">
                        <Icons.Check className="w-4 h-4 text-green-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <CodeBlock
                  filename="Terminal"
                  code={`# Push to your GitHub repository
git init
git add .
git commit -m "Initial plugin release"
git remote add origin https://github.com/you/my-plugin
git push -u origin main

# Add the topic "musclemap-plugin" to your repo
# for automatic discovery in the marketplace`}
                />
              </div>
            </Step>
          </div>
        </section>

        {/* Next Steps */}
        <section className="py-16 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Keep Learning</h3>

            <div className="grid md:grid-cols-3 gap-6">
              <Link
                to="/community/bulletin"
                className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-500/30 transition-colors group"
              >
                <div className="text-3xl mb-4">💡</div>
                <h4 className="font-bold text-white mb-2">Plugin Ideas</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Browse community-requested plugins with bounties.
                </p>
                <span className="inline-flex items-center gap-1 text-purple-400 text-sm font-medium group-hover:gap-2 transition-all">
                  View Ideas
                  <Icons.ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link
                to="/docs/plugins"
                className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-cyan-500/30 transition-colors group"
              >
                <div className="text-3xl mb-4">📚</div>
                <h4 className="font-bold text-white mb-2">Full Documentation</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Complete API reference and advanced patterns.
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
                <div className="text-3xl mb-4">🔧</div>
                <h4 className="font-bold text-white mb-2">Source Code</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Explore the MuscleMap frontend repository on GitHub.
                </p>
                <span className="inline-flex items-center gap-1 text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
                  View on GitHub
                  <Icons.ArrowRight className="w-4 h-4" />
                </span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
