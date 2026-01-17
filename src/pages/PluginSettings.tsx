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
  Trash2,
  ChevronRight,
  Shield,
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
// DYNAMIC SETTINGS FORM FIELD RENDERER
// ============================================
function SettingsField({ field, value, onChange }) {
  const { key, type, label, description, options, min, max, step, placeholder } = field;

  const baseInputClass = `
    w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
    text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50
    transition-colors
  `;

  switch (type) {
    case 'boolean':
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-medium text-white">{label || key}</div>
            {description && <div className="text-xs text-white/50 mt-0.5">{description}</div>}
          </div>
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${value ? 'bg-blue-500' : 'bg-white/20'}
            `}
          >
            <motion.div
              layout
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
              style={{ left: value ? '1.75rem' : '0.25rem' }}
            />
          </button>
        </div>
      );

    case 'select':
      return (
        <div className="py-2">
          <label className="block text-sm font-medium text-white mb-2">{label || key}</label>
          {description && <p className="text-xs text-white/50 mb-2">{description}</p>}
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {options?.map((opt) => (
              <option key={opt.value ?? opt} value={opt.value ?? opt}>
                {opt.label ?? opt}
              </option>
            ))}
          </select>
        </div>
      );

    case 'number':
    case 'range':
      return (
        <div className="py-2">
          <label className="block text-sm font-medium text-white mb-2">
            {label || key}
            {type === 'range' && <span className="ml-2 text-blue-400">{value ?? min ?? 0}</span>}
          </label>
          {description && <p className="text-xs text-white/50 mb-2">{description}</p>}
          <input
            type={type === 'range' ? 'range' : 'number'}
            value={value ?? (min || 0)}
            onChange={(e) => onChange(type === 'range' ? parseInt(e.target.value) : parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step || 1}
            className={type === 'range' ? 'w-full accent-blue-500' : baseInputClass}
          />
          {type === 'range' && (
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>{min ?? 0}</span>
              <span>{max ?? 100}</span>
            </div>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="py-2">
          <label className="block text-sm font-medium text-white mb-2">{label || key}</label>
          {description && <p className="text-xs text-white/50 mb-2">{description}</p>}
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className={`${baseInputClass} resize-none`}
          />
        </div>
      );

    case 'color':
      return (
        <div className="py-2">
          <label className="block text-sm font-medium text-white mb-2">{label || key}</label>
          {description && <p className="text-xs text-white/50 mb-2">{description}</p>}
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value || '#0066FF'}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={value || '#0066FF'}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className={`${baseInputClass} flex-1`}
            />
          </div>
        </div>
      );

    case 'string':
    case 'text':
    default:
      return (
        <div className="py-2">
          <label className="block text-sm font-medium text-white mb-2">{label || key}</label>
          {description && <p className="text-xs text-white/50 mb-2">{description}</p>}
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={baseInputClass}
          />
        </div>
      );
  }
}

// ============================================
// PLUGIN CONFIGURATION MODAL
// ============================================
function PluginConfigModal({ plugin, isOpen, onClose, onSettingsChange }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  // Get settings schema from plugin manifest or use defaults
  const settingsSchema = plugin?.manifest?.settingsSchema ||
    plugin?.settingsSchema ||
    plugin?.manifest?.settings ||
    null;

  // Check if plugin has settings to configure
  const hasSettings = settingsSchema && (
    Array.isArray(settingsSchema) ? settingsSchema.length > 0 : Object.keys(settingsSchema).length > 0
  );

  // Normalize settings schema to array format
  const normalizedSchema = React.useMemo(() => {
    if (!settingsSchema) return [];
    if (Array.isArray(settingsSchema)) return settingsSchema;

    // Convert object schema to array format
    return Object.entries(settingsSchema).map(([key, config]) => {
      if (typeof config === 'string') {
        return { key, type: config, label: key };
      }
      return { key, ...config };
    });
  }, [settingsSchema]);

  // Load settings when modal opens
  React.useEffect(() => {
    if (!isOpen || !plugin) return;

    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to load from API first (for backend-registered plugins)
        const response = await fetch(`/api/plugins/${plugin.id}/settings`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('musclemap_token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings || {});
        } else if (response.status === 404) {
          // Plugin not registered in backend, use localStorage
          const localSettings = localStorage.getItem(`plugin:${plugin.id}:settings`);
          setSettings(localSettings ? JSON.parse(localSettings) : {});
        } else {
          throw new Error('Failed to load settings');
        }
      } catch {
        // Fallback to localStorage for frontend-only plugins
        try {
          const localSettings = localStorage.getItem(`plugin:${plugin.id}:settings`);
          setSettings(localSettings ? JSON.parse(localSettings) : {});
        } catch {
          setSettings({});
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
    setHasChanges(false);
  }, [isOpen, plugin]);

  // Handle setting change
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    if (!plugin || !hasChanges) return;

    setSaving(true);
    setError(null);

    try {
      // Try to save to API first
      const response = await fetch(`/api/plugins/${plugin.id}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('musclemap_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toastSuccess(`${plugin.name} settings saved`);
      } else if (response.status === 404) {
        // Plugin not registered in backend, save to localStorage
        localStorage.setItem(`plugin:${plugin.id}:settings`, JSON.stringify(settings));
        toastSuccess(`${plugin.name} settings saved locally`);
      } else {
        throw new Error('Failed to save settings');
      }

      // Also update localStorage for immediate frontend access
      localStorage.setItem(`plugin:${plugin.id}:settings`, JSON.stringify(settings));

      // Notify parent component of settings change
      if (onSettingsChange) {
        onSettingsChange(plugin.id, settings);
      }

      setHasChanges(false);
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`plugin:${plugin.id}:settings`, JSON.stringify(settings));
        toastSuccess(`${plugin.name} settings saved locally`);
        setHasChanges(false);
      } catch {
        setError('Failed to save settings');
        toastError('Failed to save plugin settings');
      }
    } finally {
      setSaving(false);
    }
  };

  // Reset settings to defaults
  const handleReset = async () => {
    if (!window.confirm('Reset all settings to defaults? This cannot be undone.')) return;

    setSaving(true);
    try {
      // Try to reset via API
      const response = await fetch(`/api/plugins/${plugin.id}/settings`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('musclemap_token')}`,
        },
      });

      if (response.ok || response.status === 404) {
        // Also clear localStorage
        localStorage.removeItem(`plugin:${plugin.id}:settings`);
        setSettings({});
        setHasChanges(false);
        toastSuccess(`${plugin.name} settings reset to defaults`);
      } else {
        throw new Error('Failed to reset settings');
      }
    } catch {
      // Fallback: just clear localStorage
      localStorage.removeItem(`plugin:${plugin.id}:settings`);
      setSettings({});
      setHasChanges(false);
      toastSuccess(`${plugin.name} settings reset`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !plugin) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[#0d0d12] border border-white/10 rounded-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl">
                  {plugin.manifest?.icon || '🧩'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{plugin.name}</h2>
                  <p className="text-sm text-white/60">v{plugin.version}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Plugin Description */}
            {plugin.description && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/80 text-sm">{plugin.description}</p>
              </div>
            )}

            {/* Plugin Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white/50 mb-1">Author</p>
                <p className="text-sm text-white">{plugin.author || 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white/50 mb-1">Status</p>
                <p className={`text-sm ${plugin.enabled ? 'text-green-400' : 'text-white/60'}`}>
                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            {/* Capabilities */}
            {(plugin.manifest?.capabilities || plugin.capabilities)?.length > 0 && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {(plugin.manifest?.capabilities || plugin.capabilities).map((cap) => (
                    <span
                      key={cap}
                      className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Section */}
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-white/60">Loading settings...</p>
              </div>
            ) : hasSettings ? (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Plugin Settings
                  </h3>
                  {hasChanges && (
                    <span className="text-xs text-yellow-400 px-2 py-0.5 bg-yellow-400/10 rounded-full">
                      Unsaved changes
                    </span>
                  )}
                </div>
                <div className="space-y-1 divide-y divide-white/5">
                  {normalizedSchema.map((field) => (
                    <SettingsField
                      key={field.key}
                      field={field}
                      value={settings[field.key]}
                      onChange={(value) => handleSettingChange(field.key, value)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                <Info className="w-8 h-8 text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/60">
                  This plugin has no configurable settings.
                </p>
              </div>
            )}

            {/* Documentation Link */}
            {(plugin.manifest?.homepage || plugin.homepage || plugin.manifest?.repository) && (
              <a
                href={plugin.manifest?.homepage || plugin.homepage || plugin.manifest?.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </a>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/10 space-y-3">
            {hasSettings && (
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium transition-colors disabled:opacity-50"
                >
                  Reset to Defaults
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`
                    flex-1 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50
                    ${hasChanges
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-white/10 text-white/60'
                    }
                  `}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              {hasChanges ? 'Cancel' : 'Close'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function PluginSettings() {
  const plugins = usePlugins();
  const themes = usePluginThemes();
  const setPluginEnabled = usePluginRegistryStore((s) => s.setPluginEnabled);
  const unregisterPlugin = usePluginRegistryStore((s) => s.unregisterPlugin);
  const { success, error: _error } = useToast();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'enabled' | 'disabled'
  const [configPlugin, setConfigPlugin] = useState(null);

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
    const plugin = plugins.find((p) => p.id === pluginId);
    if (plugin) {
      setConfigPlugin(plugin);
    }
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

      {/* Plugin Configuration Modal */}
      <PluginConfigModal
        plugin={configPlugin}
        isOpen={!!configPlugin}
        onClose={() => setConfigPlugin(null)}
      />
    </div>
  );
}
