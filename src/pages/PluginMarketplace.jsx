/**
 * PluginMarketplace - Browse and install community plugins
 *
 * Features:
 * - Browse available plugins
 * - Search and filter
 * - Install/uninstall plugins
 * - View plugin details
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  Download,
  Star,
  Check,
  ExternalLink,
  Settings,
  Grid,
  List,
  Filter,
  Puzzle,
  Palette,
  LayoutDashboard,
  Plug,
  ChevronRight,
  AlertCircle,
  Loader2,
  Github,
  RefreshCw,
} from 'lucide-react';
import { usePlugins, discoverPlugins, installPlugin, uninstallPlugin } from '../plugins';
import { GlassSurface, GlassButton, GlassNav, GlassSidebar, MeshBackground } from '../components/glass';
import { useToast } from '../hooks';
import api from '../utils/api';

// ============================================
// MOCK AVAILABLE PLUGINS (Replace with API)
// ============================================
const MOCK_AVAILABLE_PLUGINS = [
  {
    id: 'strava-sync',
    name: 'Strava Integration',
    description: 'Sync your workouts with Strava automatically. Import activities and export your MuscleMap workouts.',
    version: '1.2.0',
    author: 'MuscleMap Community',
    repository: 'https://github.com/musclemap-plugins/strava-sync',
    downloads: 1250,
    rating: 4.8,
    category: 'integrations',
    icon: '🔄',
    capabilities: ['routes', 'widgets', 'settings'],
    tags: ['strava', 'sync', 'import', 'export'],
  },
  {
    id: 'dark-neon-theme',
    name: 'Dark Neon Theme',
    description: 'A vibrant cyberpunk-inspired theme with neon accents and dark backgrounds.',
    version: '1.0.0',
    author: 'ThemeMaster',
    repository: 'https://github.com/musclemap-plugins/dark-neon-theme',
    downloads: 890,
    rating: 4.9,
    category: 'themes',
    icon: '🎨',
    capabilities: ['themes'],
    tags: ['theme', 'dark', 'neon', 'cyberpunk'],
  },
  {
    id: 'workout-timer-pro',
    name: 'Workout Timer Pro',
    description: 'Advanced rest timer with customizable intervals, sounds, and vibration alerts.',
    version: '2.1.0',
    author: 'FitDev',
    repository: 'https://github.com/musclemap-plugins/workout-timer-pro',
    downloads: 2100,
    rating: 4.7,
    category: 'widgets',
    icon: '⏱️',
    capabilities: ['widgets'],
    tags: ['timer', 'rest', 'workout', 'productivity'],
  },
  {
    id: 'social-feed',
    name: 'Social Feed',
    description: 'Share your workouts, follow friends, and see their progress in a social feed.',
    version: '1.5.0',
    author: 'SocialFit',
    repository: 'https://github.com/musclemap-plugins/social-feed',
    downloads: 1800,
    rating: 4.6,
    category: 'features',
    icon: '👥',
    capabilities: ['routes', 'widgets', 'graphql'],
    tags: ['social', 'feed', 'friends', 'share'],
  },
  {
    id: 'apple-health-sync',
    name: 'Apple Health Sync',
    description: 'Two-way sync with Apple Health. Import health data and export workouts.',
    version: '1.3.0',
    author: 'HealthKit Dev',
    repository: 'https://github.com/musclemap-plugins/apple-health-sync',
    downloads: 950,
    rating: 4.5,
    category: 'integrations',
    icon: '🍎',
    capabilities: ['routes', 'settings'],
    tags: ['apple', 'health', 'sync', 'ios'],
  },
  {
    id: 'pr-tracker',
    name: 'Personal Records Tracker',
    description: 'Track and celebrate your personal records with detailed history and charts.',
    version: '1.1.0',
    author: 'PRKing',
    repository: 'https://github.com/musclemap-plugins/pr-tracker',
    downloads: 1450,
    rating: 4.8,
    category: 'widgets',
    icon: '🏆',
    capabilities: ['widgets', 'routes'],
    tags: ['pr', 'records', 'tracking', 'achievements'],
  },
];

// Categories
const CATEGORIES = [
  { id: 'all', label: 'All Plugins', icon: Package },
  { id: 'widgets', label: 'Widgets', icon: LayoutDashboard },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'features', label: 'Features', icon: Puzzle },
];

// ============================================
// PLUGIN CARD COMPONENT
// ============================================
function PluginCard({ plugin, installed, onInstall, onUninstall, installing }) {
  const isInstalled = installed.some((p) => p.id === plugin.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all"
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl">
            {plugin.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white truncate">{plugin.name}</h3>
              {isInstalled && (
                <span className="flex-shrink-0 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Installed
                </span>
              )}
            </div>
            <p className="text-sm text-white/60 line-clamp-2">{plugin.description}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-4 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" />
            {plugin.rating}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {plugin.downloads.toLocaleString()}
          </span>
          <span>v{plugin.version}</span>
          <span className="truncate">by {plugin.author}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {plugin.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
        <a
          href={plugin.repository}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <Github className="w-4 h-4" />
          View Source
        </a>

        {isInstalled ? (
          <button
            onClick={() => onUninstall(plugin.id)}
            disabled={installing === plugin.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {installing === plugin.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Uninstall
          </button>
        ) : (
          <button
            onClick={() => onInstall(plugin)}
            disabled={installing === plugin.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {installing === plugin.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN MARKETPLACE COMPONENT
// ============================================
export default function PluginMarketplace() {
  const installedPlugins = usePlugins();
  const { success, error } = useToast();

  const [availablePlugins, setAvailablePlugins] = useState(MOCK_AVAILABLE_PLUGINS);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Filter plugins
  const filteredPlugins = availablePlugins.filter((plugin) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        plugin.name.toLowerCase().includes(searchLower) ||
        plugin.description.toLowerCase().includes(searchLower) ||
        plugin.tags.some((tag) => tag.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (category !== 'all' && plugin.category !== category) {
      return false;
    }

    return true;
  });

  // Handle install
  const handleInstall = async (plugin) => {
    setInstalling(plugin.id);
    try {
      // In production, this would call the API
      // const result = await installPlugin(api, plugin.repository);

      // For now, simulate installation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      success(`${plugin.name} installed successfully!`);
    } catch (err) {
      error(`Failed to install ${plugin.name}: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  };

  // Handle uninstall
  const handleUninstall = async (pluginId) => {
    const plugin = availablePlugins.find((p) => p.id === pluginId);
    setInstalling(pluginId);
    try {
      // In production, this would call the API
      // await uninstallPlugin(api, pluginId);

      // For now, simulate uninstallation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      success(`${plugin?.name || 'Plugin'} uninstalled successfully!`);
    } catch (err) {
      error(`Failed to uninstall: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  };

  // Refresh available plugins
  const handleRefresh = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const plugins = await discoverPlugins(api);
      // setAvailablePlugins(plugins);

      // Simulate refresh
      await new Promise((resolve) => setTimeout(resolve, 1000));
      success('Plugin list refreshed');
    } catch (err) {
      error('Failed to refresh plugins');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      {/* Header */}
      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo.png" alt="MuscleMap" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-white hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <div className="pt-20 px-4 pb-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-400" />
              Plugin Marketplace
            </h1>
            <p className="text-white/60 mt-1">
              Extend MuscleMap with community-built plugins
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/plugins/settings"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all"
            >
              <Settings className="w-4 h-4" />
              Manage Plugins
            </Link>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all
                  ${category === cat.id
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }
                  border
                `}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/60 text-sm">
            {filteredPlugins.length} plugin{filteredPlugins.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Plugin Grid */}
        {filteredPlugins.length > 0 ? (
          <motion.div
            layout
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-4'
            }
          >
            <AnimatePresence mode="popLayout">
              {filteredPlugins.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  installed={installedPlugins}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  installing={installing}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white/60 mb-2">No plugins found</h3>
            <p className="text-white/40">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Developer CTA */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Build Your Own Plugin
              </h3>
              <p className="text-white/60">
                Create plugins to extend MuscleMap and share them with the community
              </p>
            </div>
            <a
              href="https://github.com/jeanpaulniko/musclemap/blob/main/docs/PLUGIN-DEVELOPMENT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-purple-300 transition-all whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              Developer Guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
