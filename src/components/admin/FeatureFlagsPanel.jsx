/**
 * Feature Flags Panel Component
 *
 * Provides a web interface for feature flag management:
 * - List flags with name, status (on/off), rollout percentage
 * - Quick toggle switch for each flag
 * - Add/Edit flag modal with targeting rules
 * - Rollout percentage slider
 * - Flag usage statistics
 * - Search/filter functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  Filter,
  Flag,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/features';

const FLAG_CATEGORIES = [
  { id: 'all', label: 'All Flags' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'rollout', label: 'In Rollout' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num?.toString() || '0';
}

function getStatusColor(flag) {
  if (!flag.enabled) return { bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400' };
  if (flag.rolloutPercentage < 100) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' };
  return { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' };
}

// ============================================
// SUBCOMPONENTS
// ============================================

function ToggleSwitch({ enabled, onChange, disabled }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-12 h-6 rounded-full transition-colors duration-200
        ${enabled ? 'bg-green-500' : 'bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div
        className={`
          absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200
          ${enabled ? 'translate-x-7' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

function RolloutSlider({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`
          flex-1 h-2 rounded-full appearance-none cursor-pointer
          bg-white/10
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{
          background: `linear-gradient(to right, #22c55e ${value}%, rgba(255,255,255,0.1) ${value}%)`,
        }}
      />
      <div className="flex items-center gap-1 min-w-[60px] justify-end">
        <Percent className="w-3 h-3 text-gray-400" />
        <span className="text-sm font-mono text-white">{value}</span>
      </div>
    </div>
  );
}

function FlagCard({ flag, onToggle, onEdit, onDelete, loading }) {
  const statusColors = getStatusColor(flag);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Flag className={`w-4 h-4 ${statusColors.text}`} />
            <span className="font-medium text-white truncate">{flag.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors.bg} ${statusColors.text}`}>
              {flag.enabled ? (flag.rolloutPercentage < 100 ? 'Rollout' : 'Enabled') : 'Disabled'}
            </span>
          </div>
          {flag.description && (
            <p className="text-xs text-gray-400 line-clamp-2">{flag.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ToggleSwitch
            enabled={flag.enabled}
            onChange={(enabled) => onToggle(flag.id, enabled)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Percent className="w-3.5 h-3.5" />
          <span>{flag.rolloutPercentage}% rollout</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span>{formatNumber(flag.usersAffected)} users</span>
        </div>
        {flag.targetingRules && Object.keys(flag.targetingRules).length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-cyan-400">
            <Target className="w-3.5 h-3.5" />
            <span>{Object.keys(flag.targetingRules).length} rules</span>
          </div>
        )}
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 mt-3 pt-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        {expanded ? (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>Hide details</span>
          </>
        ) : (
          <>
            <ChevronRight className="w-3 h-3" />
            <span>Show details</span>
          </>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
          {/* Rollout Slider */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">
              Rollout Percentage
            </label>
            <RolloutSlider
              value={flag.rolloutPercentage}
              onChange={(value) => onEdit(flag.id, { rolloutPercentage: value })}
              disabled={loading || !flag.enabled}
            />
          </div>

          {/* Targeting Rules Preview */}
          {flag.targetingRules && Object.keys(flag.targetingRules).length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">
                Targeting Rules
              </label>
              <div className="bg-black/40 rounded-lg p-2 font-mono text-xs text-gray-300 overflow-auto max-h-32">
                {JSON.stringify(flag.targetingRules, null, 2)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onEdit(flag.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => onDelete(flag.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FlagModal({ flag, onSave, onClose, loading }) {
  const isEditing = !!flag?.id;
  const [formData, setFormData] = useState({
    name: flag?.name || '',
    description: flag?.description || '',
    enabled: flag?.enabled ?? false,
    rolloutPercentage: flag?.rolloutPercentage ?? 100,
    targetingRules: flag?.targetingRules || {},
  });
  const [rulesMode, setRulesMode] = useState('form'); // 'form' or 'json'
  const [jsonError, setJsonError] = useState(null);
  const [rulesJson, setRulesJson] = useState(
    JSON.stringify(formData.targetingRules, null, 2)
  );

  // Form-based targeting rules
  const [formRules, setFormRules] = useState(() => {
    const rules = flag?.targetingRules || {};
    return Object.entries(rules).map(([key, value]) => ({
      key,
      operator: 'equals',
      value: String(value),
    }));
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleJsonChange = (json) => {
    setRulesJson(json);
    try {
      const parsed = JSON.parse(json);
      setFormData((prev) => ({ ...prev, targetingRules: parsed }));
      setJsonError(null);
    } catch (_err) {
      setJsonError('Invalid JSON');
    }
  };

  const handleFormRulesChange = (rules) => {
    setFormRules(rules);
    const rulesObj = {};
    rules.forEach((rule) => {
      if (rule.key) {
        rulesObj[rule.key] = rule.value;
      }
    });
    setFormData((prev) => ({ ...prev, targetingRules: rulesObj }));
    setRulesJson(JSON.stringify(rulesObj, null, 2));
  };

  const addFormRule = () => {
    handleFormRulesChange([...formRules, { key: '', operator: 'equals', value: '' }]);
  };

  const removeFormRule = (index) => {
    handleFormRulesChange(formRules.filter((_, i) => i !== index));
  };

  const updateFormRule = (index, field, value) => {
    const newRules = [...formRules];
    newRules[index] = { ...newRules[index], [field]: value };
    handleFormRulesChange(newRules);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-cyan-400" />
            {isEditing ? 'Edit Flag' : 'Create New Flag'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Flag Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., new_dashboard_beta"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="What does this flag control?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
            />
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div>
              <div className="text-sm font-medium text-white">Enabled</div>
              <div className="text-xs text-gray-400">Turn this flag on or off</div>
            </div>
            <ToggleSwitch
              enabled={formData.enabled}
              onChange={(enabled) => updateField('enabled', enabled)}
              disabled={loading}
            />
          </div>

          {/* Rollout Percentage */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Rollout Percentage
            </label>
            <RolloutSlider
              value={formData.rolloutPercentage}
              onChange={(value) => updateField('rolloutPercentage', value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Percentage of users who will see this feature when enabled
            </p>
          </div>

          {/* Targeting Rules */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-300">
                Targeting Rules
              </label>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setRulesMode('form')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    rulesMode === 'form'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Form
                </button>
                <button
                  onClick={() => setRulesMode('json')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    rulesMode === 'json'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {rulesMode === 'form' ? (
              <div className="space-y-2">
                {formRules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rule.key}
                      onChange={(e) => updateFormRule(index, 'key', e.target.value)}
                      placeholder="Key (e.g., userTier)"
                      className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    <select
                      value={rule.operator}
                      onChange={(e) => updateFormRule(index, 'operator', e.target.value)}
                      className="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="equals">=</option>
                      <option value="notEquals">!=</option>
                      <option value="contains">contains</option>
                      <option value="greaterThan">&gt;</option>
                      <option value="lessThan">&lt;</option>
                    </select>
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateFormRule(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={() => removeFormRule(index)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addFormRule}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </div>
            ) : (
              <div>
                <textarea
                  value={rulesJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder='{"userTier": "premium", "country": "US"}'
                  rows={4}
                  className={`w-full px-3 py-2 rounded-lg bg-black/40 border font-mono text-sm text-gray-300 placeholder-gray-600 focus:outline-none transition-colors resize-none ${
                    jsonError ? 'border-red-500/50' : 'border-white/10 focus:border-cyan-500/50'
                  }`}
                />
                {jsonError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {jsonError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim() || jsonError}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isEditing ? 'Save Changes' : 'Create Flag'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ flagName, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Delete Flag</h3>
            <p className="text-sm text-gray-400">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-6">
          Are you sure you want to delete the flag{' '}
          <span className="font-mono text-cyan-400">{flagName}</span>?
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-lg bg-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FeatureFlagsPanel() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stats, setStats] = useState(null);

  // Get auth token
  const getAuthHeader = useCallback(() => {
    try {
      // Try musclemap-auth (Zustand store)
      const authData = localStorage.getItem('musclemap-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.state?.token) {
          return { Authorization: `Bearer ${parsed.state.token}` };
        }
      }
      // Fallback to legacy token
      const token = localStorage.getItem('musclemap_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (e) {
      console.error('Failed to get auth header:', e);
      return {};
    }
  }, []);

  // Fetch flags
  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch(API_BASE, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch flags:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Toggle flag
  const handleToggle = useCallback(async (flagId, enabled) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${flagId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => (f.id === flagId ? { ...f, enabled } : f))
        );
      }
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    } finally {
      setActionLoading(false);
    }
  }, [getAuthHeader]);

  // Update flag (quick update like rollout percentage)
  const _handleQuickUpdate = useCallback(async (flagId, updates) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${flagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const updatedFlag = await res.json();
        setFlags((prev) =>
          prev.map((f) => (f.id === flagId ? { ...f, ...updatedFlag } : f))
        );
      }
    } catch (err) {
      console.error('Failed to update flag:', err);
    } finally {
      setActionLoading(false);
    }
  }, [getAuthHeader]);

  // Open edit modal
  const handleEdit = useCallback((flagId) => {
    const flag = flags.find((f) => f.id === flagId);
    if (flag) {
      setEditingFlag(flag);
      setShowModal(true);
    }
  }, [flags]);

  // Save flag (create or update)
  const handleSave = useCallback(async (formData) => {
    setActionLoading(true);
    try {
      const isEditing = !!editingFlag?.id;
      const url = isEditing ? `${API_BASE}/${editingFlag.id}` : API_BASE;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const savedFlag = await res.json();
        if (isEditing) {
          setFlags((prev) =>
            prev.map((f) => (f.id === savedFlag.id ? savedFlag : f))
          );
        } else {
          setFlags((prev) => [savedFlag, ...prev]);
        }
        setShowModal(false);
        setEditingFlag(null);
      }
    } catch (err) {
      console.error('Failed to save flag:', err);
    } finally {
      setActionLoading(false);
    }
  }, [editingFlag, getAuthHeader]);

  // Delete flag
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Failed to delete flag:', err);
    } finally {
      setActionLoading(false);
    }
  }, [deleteTarget, getAuthHeader]);

  // Filter flags
  const filteredFlags = flags.filter((flag) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    let matchesCategory = true;
    if (activeFilter === 'enabled') {
      matchesCategory = flag.enabled && flag.rolloutPercentage === 100;
    } else if (activeFilter === 'disabled') {
      matchesCategory = !flag.enabled;
    } else if (activeFilter === 'rollout') {
      matchesCategory = flag.enabled && flag.rolloutPercentage < 100;
    }

    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const computedStats = stats || {
    total: flags.length,
    enabled: flags.filter((f) => f.enabled).length,
    inRollout: flags.filter((f) => f.enabled && f.rolloutPercentage < 100).length,
    totalUsers: flags.reduce((sum, f) => sum + (f.usersAffected || 0), 0),
  };

  // Initial load
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-cyan-400" />
            Feature Flags
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage feature rollouts and targeting rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFlags}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => {
              setEditingFlag(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Flag</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassSurface padding={false}>
          <StatsCard
            icon={Flag}
            label="Total Flags"
            value={computedStats.total}
            color="text-cyan-400"
          />
        </GlassSurface>
        <GlassSurface padding={false}>
          <StatsCard
            icon={Check}
            label="Enabled"
            value={computedStats.enabled}
            color="text-green-400"
          />
        </GlassSurface>
        <GlassSurface padding={false}>
          <StatsCard
            icon={Sliders}
            label="In Rollout"
            value={computedStats.inRollout}
            color="text-yellow-400"
          />
        </GlassSurface>
        <GlassSurface padding={false}>
          <StatsCard
            icon={Users}
            label="Users Affected"
            value={formatNumber(computedStats.totalUsers)}
            color="text-purple-400"
          />
        </GlassSurface>
      </div>

      {/* Search and Filter */}
      <GlassSurface className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flags..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {FLAG_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveFilter(category.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activeFilter === category.id
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </GlassSurface>

      {/* Flags List */}
      <GlassSurface className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            {activeFilter === 'all' ? 'All Flags' : FLAG_CATEGORIES.find(c => c.id === activeFilter)?.label}
            <span className="text-gray-400 font-normal">
              ({filteredFlags.length})
            </span>
          </h3>
        </div>

        {filteredFlags.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchQuery
                ? 'No flags match your search'
                : 'No feature flags yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingFlag(null);
                  setShowModal(true);
                }}
                className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Create your first flag
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFlags.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteTarget(flags.find(f => f.id === id))}
                loading={actionLoading}
              />
            ))}
          </div>
        )}
      </GlassSurface>

      {/* Modals */}
      {showModal && (
        <FlagModal
          flag={editingFlag}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingFlag(null);
          }}
          loading={actionLoading}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          flagName={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
