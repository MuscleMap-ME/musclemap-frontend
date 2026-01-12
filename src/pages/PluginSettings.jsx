/**
 * PluginSettings - Manage installed plugins
 *
 * Features:
 * - View installed plugins
 * - Enable/disable plugins
 * - Configure plugin settings
 * - Uninstall plugins
 * - View plugin permissions
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Package,
  Power,
  Trash2,
  ChevronRight,
  Shield,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Info,
  Puzzle,
  Palette,
  LayoutDashboard,
  Plug,
  Search,
} from 'lucide-react';
import {
  usePlugins,
  usePluginRegistryStore,
  usePluginThemes,
  ThemeSelector,
} from '../plugins';
import { GlassNav, MeshBackground } from '../components/glass';
import { useToast } from '../hooks';

// ============================================
// PLUGIN SETTINGS CARD
// ============================================
function InstalledPluginCard({ plugin, onToggle, onUninstall, onConfigure }) {
  const [expanded, setExpanded] = useState(false);

  const capabilityIcons = {
    routes: Puzzle,
    widgets: LayoutDashboard,
    themes: Palette,
    settings: Settings,
    graphql: Plug,
    hooks: RefreshCw,
    commands: Package,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        rounded-2xl border transition-all overflow-hidden
        ${plugin.enabled
          ? 'bg-gradient-to-br from-white/5 to-white/10 border-white/10'
          : 'bg-white/[0.02] border-white/5 opacity-60'
        }
      `}
    >
      {/* Main Row */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`
              flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl
              ${plugin.enabled
                ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10'
                : 'bg-white/5 border border-white/5'
              }
            `}
          >
            {plugin.manifest?.icon || '🧩'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white truncate">{plugin.name}</h3>
              <span className="text-xs text-white/40">v{plugin.version}</span>
              {plugin.enabled ? (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-white/10 text-white/40 text-xs rounded-full">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-sm text-white/50 line-clamp-1">
              {plugin.description || 'No description available'}
            </p>

            {/* Capabilities */}
            <div className="flex items-center gap-2 mt-2">
              {plugin.manifest?.capabilities?.map((cap) => {
                const Icon = capabilityIcons[cap] || Package;
                return (
                  <div
                    key={cap}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-xs text-white/40"
                    title={cap}
                  >
                    <Icon className="w-3 h-3" />
                    {cap}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Toggle */}
            <button
              onClick={() => onToggle(plugin.id, !plugin.enabled)}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${plugin.enabled ? 'bg-green-500' : 'bg-white/20'}
              `}
            >
              <motion.div
                layout
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                style={{ left: plugin.enabled ? '1.75rem' : '0.25rem' }}
              />
            </button>

            {/* Expand */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <motion.div
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-5 h-5 text-white/40" />
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              {/* Permissions */}
              {plugin.manifest?.permissions?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Permissions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {plugin.manifest.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-lg"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Plugin Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-white/40">Author:</span>
                  <span className="text-white/70 ml-2">{plugin.author || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-white/40">Loaded:</span>
                  <span className="text-white/70 ml-2">
                    {plugin.loadedAt
                      ? new Date(plugin.loadedAt).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {plugin.manifest?.entry?.frontend && (
                  <button
                    onClick={() => onConfigure(plugin.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                )}
                {plugin.manifest?.repository && (
                  <a
                    href={plugin.manifest.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Source
                  </a>
                )}
                <button
                  onClick={() => onUninstall(plugin.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm text-red-400 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Uninstall
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// MAIN SETTINGS COMPONENT
// ============================================
export default function PluginSettings() {
  const plugins = usePlugins();
  const themes = usePluginThemes();
  const setPluginEnabled = usePluginRegistryStore((s) => s.setPluginEnabled);
  const unregisterPlugin = usePluginRegistryStore((s) => s.unregisterPlugin);
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'enabled' | 'disabled'

  // Filter plugins
  const filteredPlugins = plugins.filter((plugin) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      if (!plugin.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filter === 'enabled' && !plugin.enabled) return false;
    if (filter === 'disabled' && plugin.enabled) return false;

    return true;
  });

  // Handle toggle
  const handleToggle = (pluginId, enabled) => {
    setPluginEnabled(pluginId, enabled);
    const plugin = plugins.find((p) => p.id === pluginId);
    success(`${plugin?.name || 'Plugin'} ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Handle uninstall
  const handleUninstall = (pluginId) => {
    const plugin = plugins.find((p) => p.id === pluginId);
    if (window.confirm(`Are you sure you want to uninstall ${plugin?.name}?`)) {
      unregisterPlugin(pluginId);
      success(`${plugin?.name || 'Plugin'} uninstalled`);
    }
  };

  // Handle configure
  const handleConfigure = (pluginId) => {
    // TODO: Open plugin settings modal/page
    console.log('Configure plugin:', pluginId);
  };

  const enabledCount = plugins.filter((p) => p.enabled).length;

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

      <div className="pt-20 px-4 pb-8 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-400" />
              Plugin Settings
            </h1>
            <p className="text-white/60 mt-1">
              Manage your installed plugins and themes
            </p>
          </div>

          <Link
            to="/plugins"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all"
          >
            <Package className="w-4 h-4" />
            Browse Marketplace
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-white">{plugins.length}</div>
            <div className="text-sm text-white/50">Installed</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-green-400">{enabledCount}</div>
            <div className="text-sm text-white/50">Active</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-2xl font-bold text-purple-400">{themes.length}</div>
            <div className="text-sm text-white/50">Themes</div>
          </div>
        </div>

        {/* Theme Selector */}
        {themes.length > 0 && (
          <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              Active Theme
            </h2>
            <ThemeSelector />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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

          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'enabled', label: 'Enabled' },
              { id: 'disabled', label: 'Disabled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`
                  px-4 py-2 rounded-xl transition-all
                  ${filter === f.id
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }
                  border
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plugins List */}
        {filteredPlugins.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredPlugins.map((plugin) => (
                <InstalledPluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onToggle={handleToggle}
                  onUninstall={handleUninstall}
                  onConfigure={handleConfigure}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : plugins.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white/60 mb-2">No plugins installed</h3>
            <p className="text-white/40 mb-6">
              Browse the marketplace to find plugins for your fitness journey
            </p>
            <Link
              to="/plugins"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 transition-all"
            >
              <Package className="w-4 h-4" />
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white/60 mb-2">No plugins found</h3>
            <p className="text-white/40">
              Try adjusting your search or filter
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/70">
            <p className="font-semibold text-white/90 mb-1">About Plugin Permissions</p>
            <p>
              Plugins request permissions to access specific features. Review permissions
              carefully before enabling plugins. You can disable any plugin at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
