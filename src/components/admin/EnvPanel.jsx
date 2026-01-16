/**
 * Environment Variables Panel Component
 *
 * Provides a web interface for environment variable management:
 * - Variable list with masked/unmasked values
 * - Edit variable modal
 * - Environment comparison (dev vs prod)
 * - Audit log timeline
 * - Config validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  GitCompare,
  History,
  Key,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api';

const SENSITIVE_PATTERNS = [
  'SECRET',
  'PASSWORD',
  'TOKEN',
  'KEY',
  'PRIVATE',
  'CREDENTIAL',
  'AUTH',
  'API_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function isSensitiveKey(key) {
  const upperKey = key.toUpperCase();
  return SENSITIVE_PATTERNS.some((pattern) => upperKey.includes(pattern));
}

function maskValue(value) {
  if (!value) return '';
  if (value.length <= 4) return '********';
  return value.slice(0, 2) + '********' + value.slice(-2);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getChangeTypeColor(type) {
  switch (type) {
    case 'created':
      return 'text-green-400 bg-green-500/20';
    case 'updated':
      return 'text-blue-400 bg-blue-500/20';
    case 'deleted':
      return 'text-red-400 bg-red-500/20';
    default:
      return 'text-gray-400 bg-gray-500/20';
  }
}

// ============================================
// SUBCOMPONENTS
// ============================================

function VariableRow({ variable, onEdit, onDelete, environment: _environment }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const sensitive = isSensitiveKey(variable.key);

  const handleCopy = async () => {
    if (variable.value) {
      await navigator.clipboard.writeText(variable.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          sensitive ? 'bg-red-500/20' : 'bg-blue-500/20'
        }`}
      >
        {sensitive ? (
          <ShieldAlert className="w-5 h-5 text-red-400" />
        ) : (
          <Key className="w-5 h-5 text-blue-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{variable.key}</span>
          {sensitive && (
            <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
              Sensitive
            </span>
          )}
          {variable.required && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
        </div>
        <div className="font-mono text-xs text-gray-400 mt-1 truncate">
          {sensitive && !visible ? maskValue(variable.value) : variable.value || '(empty)'}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {sensitive && (
          <button
            onClick={() => setVisible(!visible)}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 transition-colors"
            title={visible ? 'Hide value' : 'Show value'}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 transition-colors"
          title="Copy value"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => onEdit(variable)}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 transition-colors"
          title="Edit variable"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {!variable.required && (
          <button
            onClick={() => onDelete(variable)}
            className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete variable"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function EditModal({ variable, onSave, onClose, saving }) {
  const [key, setKey] = useState(variable?.key || '');
  const [value, setValue] = useState(variable?.value || '');
  const [showValue, setShowValue] = useState(false);
  const isNew = !variable?.key;
  const sensitive = isSensitiveKey(key);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    onSave({ key: key.trim(), value: value.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-gray-900/95 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {isNew ? (
              <Key className="w-5 h-5 text-cyan-400" />
            ) : (
              <Edit3 className="w-5 h-5 text-cyan-400" />
            )}
            <h3 className="text-lg font-semibold text-white">
              {isNew ? 'Add Variable' : 'Edit Variable'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Variable Name
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              placeholder="MY_VARIABLE_NAME"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
              disabled={!isNew}
              autoFocus={isNew}
            />
            {sensitive && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                This key name indicates a sensitive value
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Value
            </label>
            <div className="relative">
              <input
                type={showValue || !sensitive ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter value..."
                className="w-full px-3 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              {sensitive && (
                <button
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-gray-400 transition-colors"
                >
                  {showValue ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !key.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isNew ? 'Add Variable' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ComparisonRow({ varKey, devValue, prodValue }) {
  const [devVisible, setDevVisible] = useState(false);
  const [prodVisible, setProdVisible] = useState(false);
  const sensitive = isSensitiveKey(varKey);
  const isDifferent = devValue !== prodValue;

  return (
    <div
      className={`grid grid-cols-3 gap-3 p-3 rounded-lg ${
        isDifferent ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-white truncate">{varKey}</span>
        {isDifferent && <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
      </div>

      <div className="flex items-center gap-2 font-mono text-xs">
        <span className={devValue ? 'text-gray-300' : 'text-gray-600'}>
          {devValue
            ? sensitive && !devVisible
              ? maskValue(devValue)
              : devValue
            : '(not set)'}
        </span>
        {sensitive && devValue && (
          <button
            onClick={() => setDevVisible(!devVisible)}
            className="p-1 rounded hover:bg-white/10 text-gray-400 transition-colors flex-shrink-0"
          >
            {devVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 font-mono text-xs">
        <span className={prodValue ? 'text-gray-300' : 'text-gray-600'}>
          {prodValue
            ? sensitive && !prodVisible
              ? maskValue(prodValue)
              : prodValue
            : '(not set)'}
        </span>
        {sensitive && prodValue && (
          <button
            onClick={() => setProdVisible(!prodVisible)}
            className="p-1 rounded hover:bg-white/10 text-gray-400 transition-colors flex-shrink-0"
          >
            {prodVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function AuditLogEntry({ entry }) {
  const typeColor = getChangeTypeColor(entry.type);

  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeColor}`}>
          {entry.type === 'created' && <Key className="w-4 h-4" />}
          {entry.type === 'updated' && <Edit3 className="w-4 h-4" />}
          {entry.type === 'deleted' && <Trash2 className="w-4 h-4" />}
        </div>
        <div className="flex-1 w-px bg-white/10 mt-2" />
      </div>

      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${typeColor.split(' ')[0]}`}>
            {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
          </span>
          <span className="font-mono text-white">{entry.key}</span>
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <User className="w-3 h-3" />
          <span>{entry.user || 'System'}</span>
          <span className="text-gray-600">•</span>
          <Clock className="w-3 h-3" />
          <span>{formatTimestamp(entry.timestamp)}</span>
        </div>

        {entry.oldValue !== undefined && entry.newValue !== undefined && (
          <div className="mt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-red-400 line-through font-mono">
                {isSensitiveKey(entry.key) ? '********' : entry.oldValue || '(empty)'}
              </span>
              <span className="text-gray-500">→</span>
              <span className="text-green-400 font-mono">
                {isSensitiveKey(entry.key) ? '********' : entry.newValue || '(empty)'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ValidationResult({ result }) {
  const isValid = result.status === 'valid';
  const isWarning = result.status === 'warning';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg ${
        isValid
          ? 'bg-green-500/10 border border-green-500/20'
          : isWarning
          ? 'bg-yellow-500/10 border border-yellow-500/20'
          : 'bg-red-500/10 border border-red-500/20'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isValid
            ? 'bg-green-500/20'
            : isWarning
            ? 'bg-yellow-500/20'
            : 'bg-red-500/20'
        }`}
      >
        {isValid ? (
          <CheckCircle
            className={`w-5 h-5 ${
              isValid ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-red-400'
            }`}
          />
        ) : (
          <XCircle
            className={`w-5 h-5 ${isWarning ? 'text-yellow-400' : 'text-red-400'}`}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{result.check}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              isValid
                ? 'bg-green-500/20 text-green-400'
                : isWarning
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {result.status}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{result.message}</p>
        {result.details && (
          <ul className="mt-2 text-xs text-gray-500 list-disc list-inside">
            {result.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnvPanel() {
  // State
  const [variables, setVariables] = useState([]);
  const [filteredVariables, setFilteredVariables] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState('variables');

  // Edit modal state
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // Comparison state
  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Audit log state
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Validation state
  const [validationResults, setValidationResults] = useState(null);
  const [validating, setValidating] = useState(false);

  // Get auth token
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch variables
  const fetchVariables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/admin/env`, {
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch variables: ${res.status}`);
      }

      const data = await res.json();
      setVariables(data.variables || []);
      setFilteredVariables(data.variables || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch variables:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Filter variables based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVariables(variables);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredVariables(
        variables.filter(
          (v) =>
            v.key.toLowerCase().includes(query) ||
            (v.value && v.value.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, variables]);

  // Save variable
  const handleSave = useCallback(
    async (data) => {
      try {
        setSaving(true);
        const isNew = !editModal?.key || editModal.key !== data.key;
        const url = isNew
          ? `${API_BASE}/admin/env`
          : `${API_BASE}/admin/env/${encodeURIComponent(data.key)}`;

        const res = await fetch(url, {
          method: isNew ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to save: ${res.status}`);
        }

        await fetchVariables();
        setEditModal(null);
      } catch (err) {
        console.error('Failed to save variable:', err);
        alert(err.message);
      } finally {
        setSaving(false);
      }
    },
    [editModal, getAuthHeader, fetchVariables]
  );

  // Delete variable
  const handleDelete = useCallback(
    async (variable) => {
      if (!confirm(`Are you sure you want to delete ${variable.key}?`)) {
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/admin/env/${encodeURIComponent(variable.key)}`,
          {
            method: 'DELETE',
            headers: getAuthHeader(),
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to delete: ${res.status}`);
        }

        await fetchVariables();
      } catch (err) {
        console.error('Failed to delete variable:', err);
        alert(err.message);
      }
    },
    [getAuthHeader, fetchVariables]
  );

  // Fetch comparison
  const fetchComparison = useCallback(async () => {
    try {
      setComparisonLoading(true);
      const res = await fetch(`${API_BASE}/admin/env/compare`, {
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch comparison: ${res.status}`);
      }

      const data = await res.json();
      setComparison(data);
    } catch (err) {
      console.error('Failed to fetch comparison:', err);
    } finally {
      setComparisonLoading(false);
    }
  }, [getAuthHeader]);

  // Fetch audit log
  const fetchAuditLog = useCallback(async () => {
    try {
      setAuditLoading(true);
      const res = await fetch(`${API_BASE}/admin/env/audit`, {
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch audit log: ${res.status}`);
      }

      const data = await res.json();
      setAuditLog(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [getAuthHeader]);

  // Run validation
  const runValidation = useCallback(async () => {
    try {
      setValidating(true);
      const res = await fetch(`${API_BASE}/admin/env/validate`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error(`Validation failed: ${res.status}`);
      }

      const data = await res.json();
      setValidationResults(data.results || []);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  }, [getAuthHeader]);

  // Initial load
  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Load section data when expanded
  useEffect(() => {
    if (expandedSection === 'comparison' && !comparison) {
      fetchComparison();
    }
    if (expandedSection === 'audit' && auditLog.length === 0) {
      fetchAuditLog();
    }
  }, [expandedSection, comparison, auditLog.length, fetchComparison, fetchAuditLog]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassSurface className="p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Failed to Load</h3>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
          <button
            onClick={fetchVariables}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </GlassSurface>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400" />
            Environment Variables
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage configuration across environments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runValidation}
            disabled={validating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 transition-colors disabled:opacity-50"
          >
            {validating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span className="text-sm">Validate</span>
          </button>
          <button
            onClick={fetchVariables}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Refresh</span>
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <GlassSurface className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Validation Results
            </h3>
            <button
              onClick={() => setValidationResults(null)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-2">
            {validationResults.map((result, i) => (
              <ValidationResult key={i} result={result} />
            ))}
          </div>
        </GlassSurface>
      )}

      {/* Variables List */}
      <GlassSurface className="p-4">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === 'variables' ? '' : 'variables')
          }
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            Variables ({variables.length})
          </h3>
          {expandedSection === 'variables' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSection === 'variables' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search variables..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>
              <button
                onClick={() => setEditModal({})}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
              >
                <Key className="w-4 h-4" />
                <span className="text-sm">Add Variable</span>
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-auto">
              {filteredVariables.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'No variables match your search' : 'No variables configured'}
                </div>
              ) : (
                filteredVariables.map((variable) => (
                  <VariableRow
                    key={variable.key}
                    variable={variable}
                    onEdit={setEditModal}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}
      </GlassSurface>

      {/* Environment Comparison */}
      <GlassSurface className="p-4">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === 'comparison' ? '' : 'comparison')
          }
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-purple-400" />
            Environment Comparison
          </h3>
          {expandedSection === 'comparison' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSection === 'comparison' && (
          <>
            {comparisonLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : comparison ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-3 text-xs font-medium text-gray-400">
                  <div>Variable</div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Development
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Production
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-auto">
                  {comparison.variables?.map((v) => (
                    <ComparisonRow
                      key={v.key}
                      varKey={v.key}
                      devValue={v.dev}
                      prodValue={v.prod}
                    />
                  ))}
                </div>

                {comparison.differences > 0 && (
                  <div className="mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {comparison.differences} variable{comparison.differences !== 1 ? 's' : ''}{' '}
                    differ between environments
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Failed to load comparison data
              </div>
            )}

            <button
              onClick={fetchComparison}
              disabled={comparisonLoading}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${comparisonLoading ? 'animate-spin' : ''}`}
              />
              <span className="text-sm">Refresh Comparison</span>
            </button>
          </>
        )}
      </GlassSurface>

      {/* Audit Log */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'audit' ? '' : 'audit')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-orange-400" />
            Audit Log
          </h3>
          {expandedSection === 'audit' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSection === 'audit' && (
          <>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : auditLog.length > 0 ? (
              <div className="max-h-96 overflow-auto">
                {auditLog.map((entry, i) => (
                  <AuditLogEntry key={i} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No audit log entries found
              </div>
            )}

            <button
              onClick={fetchAuditLog}
              disabled={auditLoading}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh Log</span>
            </button>
          </>
        )}
      </GlassSurface>

      {/* Edit Modal */}
      {editModal !== null && (
        <EditModal
          variable={editModal}
          onSave={handleSave}
          onClose={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
