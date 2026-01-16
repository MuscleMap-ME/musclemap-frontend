/**
 * Alerts Panel Component
 *
 * Provides alert configuration and management:
 * - Alert rules with metric, condition, threshold, status
 * - Add/Edit rule modal with form fields
 * - Alert history with timestamps and severity
 * - Test alert functionality
 * - Notification channels (email, slack, webhook)
 * - Enable/disable toggle for each rule
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  Webhook,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/alerts';

const METRICS = [
  { id: 'cpu_usage', name: 'CPU Usage', unit: '%' },
  { id: 'memory_usage', name: 'Memory Usage', unit: '%' },
  { id: 'disk_usage', name: 'Disk Usage', unit: '%' },
  { id: 'api_latency', name: 'API Latency', unit: 'ms' },
  { id: 'error_rate', name: 'Error Rate', unit: '%' },
  { id: 'request_count', name: 'Request Count', unit: '/min' },
  { id: 'active_connections', name: 'Active Connections', unit: '' },
  { id: 'database_connections', name: 'DB Connections', unit: '' },
];

const CONDITIONS = [
  { id: 'gt', name: 'Greater than', symbol: '>' },
  { id: 'gte', name: 'Greater than or equal', symbol: '>=' },
  { id: 'lt', name: 'Less than', symbol: '<' },
  { id: 'lte', name: 'Less than or equal', symbol: '<=' },
  { id: 'eq', name: 'Equal to', symbol: '=' },
  { id: 'neq', name: 'Not equal to', symbol: '!=' },
];

const SEVERITIES = [
  { id: 'critical', name: 'Critical', color: '#ef4444', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
  { id: 'warning', name: 'Warning', color: '#f59e0b', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  { id: 'info', name: 'Info', color: '#3b82f6', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
];

const CHANNEL_TYPES = [
  { id: 'email', name: 'Email', icon: Mail, color: '#3b82f6' },
  { id: 'slack', name: 'Slack', icon: MessageSquare, color: '#4A154B' },
  { id: 'webhook', name: 'Webhook', icon: Webhook, color: '#10b981' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function getSeverityConfig(severity) {
  return SEVERITIES.find((s) => s.id === severity) || SEVERITIES[2];
}

function getMetricName(metricId) {
  const metric = METRICS.find((m) => m.id === metricId);
  return metric ? metric.name : metricId;
}

function getConditionSymbol(conditionId) {
  const condition = CONDITIONS.find((c) => c.id === conditionId);
  return condition ? condition.symbol : conditionId;
}

function getMetricUnit(metricId) {
  const metric = METRICS.find((m) => m.id === metricId);
  return metric ? metric.unit : '';
}

// ============================================
// SUBCOMPONENTS
// ============================================

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-10 h-6 rounded-full transition-colors duration-200
        ${enabled ? 'bg-green-500' : 'bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div
        className={`
          absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
          ${enabled ? 'translate-x-5' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

function AlertRuleCard({ rule, onEdit, onDelete, onToggle, onTest }) {
  const [loading, setLoading] = useState(false);
  const severity = getSeverityConfig(rule.severity);

  const handleTest = async () => {
    setLoading(true);
    await onTest(rule.id);
    setLoading(false);
  };

  return (
    <div className={`p-4 rounded-lg bg-white/5 border ${rule.enabled ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${severity.bgColor}`}>
            {rule.severity === 'critical' && <AlertTriangle className={`w-5 h-5 ${severity.textColor}`} />}
            {rule.severity === 'warning' && <AlertTriangle className={`w-5 h-5 ${severity.textColor}`} />}
            {rule.severity === 'info' && <Info className={`w-5 h-5 ${severity.textColor}`} />}
          </div>
          <div>
            <div className="font-medium text-white">{rule.name}</div>
            <div className="text-xs text-gray-400">
              {getMetricName(rule.metric)} {getConditionSymbol(rule.condition)} {rule.threshold}{getMetricUnit(rule.metric)}
            </div>
          </div>
        </div>
        <Toggle enabled={rule.enabled} onChange={(enabled) => onToggle(rule.id, enabled)} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded ${severity.bgColor} ${severity.textColor}`}>
          {severity.name}
        </span>
        {rule.lastTriggered && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last: {formatTimestamp(rule.lastTriggered)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Test
        </button>
        <button
          onClick={() => onEdit(rule)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

function AlertHistoryItem({ alert }) {
  const severity = getSeverityConfig(alert.severity);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${severity.bgColor}`}>
        {alert.severity === 'critical' && <XCircle className={`w-4 h-4 ${severity.textColor}`} />}
        {alert.severity === 'warning' && <AlertTriangle className={`w-4 h-4 ${severity.textColor}`} />}
        {alert.severity === 'info' && <Info className={`w-4 h-4 ${severity.textColor}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{alert.message}</div>
        <div className="text-xs text-gray-400">
          {alert.ruleName} - {formatTimestamp(alert.timestamp)}
        </div>
      </div>
      <div className={`text-xs px-2 py-0.5 rounded ${severity.bgColor} ${severity.textColor}`}>
        {severity.name}
      </div>
    </div>
  );
}

function ChannelCard({ channel, onEdit, onDelete, onToggle }) {
  const channelType = CHANNEL_TYPES.find((t) => t.id === channel.type) || CHANNEL_TYPES[0];
  const Icon = channelType.icon;

  return (
    <div className={`p-4 rounded-lg bg-white/5 border ${channel.enabled ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${channelType.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: channelType.color }} />
          </div>
          <div>
            <div className="font-medium text-white">{channel.name}</div>
            <div className="text-xs text-gray-400">{channelType.name}</div>
          </div>
        </div>
        <Toggle enabled={channel.enabled} onChange={(enabled) => onToggle(channel.id, enabled)} />
      </div>

      <div className="text-xs text-gray-400 mb-3 truncate">
        {channel.type === 'email' && channel.config?.email}
        {channel.type === 'slack' && channel.config?.webhookUrl?.substring(0, 40) + '...'}
        {channel.type === 'webhook' && channel.config?.url?.substring(0, 40) + '...'}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(channel)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(channel.id)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

function RuleForm({ rule, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    metric: rule?.metric || METRICS[0].id,
    condition: rule?.condition || CONDITIONS[0].id,
    threshold: rule?.threshold || 0,
    severity: rule?.severity || 'warning',
    enabled: rule?.enabled ?? true,
    channels: rule?.channels || [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Rule Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="High CPU Alert"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Metric</label>
          <select
            value={formData.metric}
            onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            {METRICS.map((metric) => (
              <option key={metric.id} value={metric.id} className="bg-gray-900">
                {metric.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Condition</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            {CONDITIONS.map((cond) => (
              <option key={cond.id} value={cond.id} className="bg-gray-900">
                {cond.name} ({cond.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Threshold {getMetricUnit(formData.metric) && `(${getMetricUnit(formData.metric)})`}
          </label>
          <input
            type="number"
            value={formData.threshold}
            onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            {SEVERITIES.map((sev) => (
              <option key={sev.id} value={sev.id} className="bg-gray-900">
                {sev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Toggle enabled={formData.enabled} onChange={(enabled) => setFormData({ ...formData, enabled })} />
        <span className="text-sm text-gray-300">Enable rule</span>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : rule ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </form>
  );
}

function ChannelForm({ channel, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: channel?.name || '',
    type: channel?.type || 'email',
    enabled: channel?.enabled ?? true,
    config: channel?.config || {},
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Channel Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Production Alerts"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Channel Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value, config: {} })}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
        >
          {CHANNEL_TYPES.map((type) => (
            <option key={type.id} value={type.id} className="bg-gray-900">
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Type-specific configuration fields */}
      {formData.type === 'email' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
          <input
            type="email"
            value={formData.config.email || ''}
            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, email: e.target.value } })}
            placeholder="alerts@example.com"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            required
          />
        </div>
      )}

      {formData.type === 'slack' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
            <input
              type="url"
              value={formData.config.webhookUrl || ''}
              onChange={(e) => setFormData({ ...formData, config: { ...formData.config, webhookUrl: e.target.value } })}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Channel (optional)</label>
            <input
              type="text"
              value={formData.config.channel || ''}
              onChange={(e) => setFormData({ ...formData, config: { ...formData.config, channel: e.target.value } })}
              placeholder="#alerts"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </>
      )}

      {formData.type === 'webhook' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
            <input
              type="url"
              value={formData.config.url || ''}
              onChange={(e) => setFormData({ ...formData, config: { ...formData.config, url: e.target.value } })}
              placeholder="https://api.example.com/webhook"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">HTTP Method</label>
            <select
              value={formData.config.method || 'POST'}
              onChange={(e) => setFormData({ ...formData, config: { ...formData.config, method: e.target.value } })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="POST" className="bg-gray-900">POST</option>
              <option value="PUT" className="bg-gray-900">PUT</option>
              <option value="PATCH" className="bg-gray-900">PATCH</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Secret Header (optional)</label>
            <input
              type="text"
              value={formData.config.secret || ''}
              onChange={(e) => setFormData({ ...formData, config: { ...formData.config, secret: e.target.value } })}
              placeholder="X-Webhook-Secret: your-secret"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Toggle enabled={formData.enabled} onChange={(enabled) => setFormData({ ...formData, enabled })} />
        <span className="text-sm text-gray-300">Enable channel</span>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : channel ? 'Update Channel' : 'Create Channel'}
        </button>
      </div>
    </form>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AlertsPanel() {
  const [rules, setRules] = useState([]);
  const [channels, setChannels] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState('rules');

  // Modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);

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

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [rulesRes, channelsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/rules`, { headers: getAuthHeader() }),
        fetch(`${API_BASE}/channels`, { headers: getAuthHeader() }),
        fetch(`${API_BASE}/history`, { headers: getAuthHeader() }),
      ]);

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to fetch alerts data:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Save rule
  const handleSaveRule = async (formData) => {
    setSaving(true);
    try {
      const url = editingRule ? `${API_BASE}/rules/${editingRule.id}` : `${API_BASE}/rules`;
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setRuleModalOpen(false);
        setEditingRule(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save rule:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  // Toggle rule
  const handleToggleRule = async (ruleId, enabled) => {
    try {
      const res = await fetch(`${API_BASE}/rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  // Test rule
  const handleTestRule = async (ruleId) => {
    try {
      const res = await fetch(`${API_BASE}/rules/${ruleId}/test`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Test alert sent successfully!');
      } else {
        alert('Failed to send test alert');
      }
    } catch (err) {
      console.error('Failed to test rule:', err);
      alert('Failed to send test alert');
    }
  };

  // Save channel
  const handleSaveChannel = async (formData) => {
    setSaving(true);
    try {
      const url = editingChannel ? `${API_BASE}/channels/${editingChannel.id}` : `${API_BASE}/channels`;
      const method = editingChannel ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setChannelModalOpen(false);
        setEditingChannel(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save channel:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete channel
  const handleDeleteChannel = async (channelId) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;

    try {
      const res = await fetch(`${API_BASE}/channels/${channelId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  // Toggle channel
  const handleToggleChannel = async (channelId, enabled) => {
    try {
      const res = await fetch(`${API_BASE}/channels/${channelId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, enabled } : c)));
      }
    } catch (err) {
      console.error('Failed to toggle channel:', err);
    }
  };

  // Open edit modals
  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleModalOpen(true);
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);
    setChannelModalOpen(true);
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            <Bell className="w-6 h-6 text-cyan-400" />
            Alerts Configuration
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure alert rules and notification channels
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Refresh</span>
        </button>
      </div>

      {/* Alert Rules */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'rules' ? '' : 'rules')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-yellow-400" />
            Alert Rules ({rules.length})
          </h3>
          {expandedSection === 'rules' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'rules' && (
          <>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingRule(null);
                  setRuleModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
            {rules.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <BellOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No alert rules configured</p>
                <p className="text-sm">Create a rule to start monitoring</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                  <AlertRuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={handleEditRule}
                    onDelete={handleDeleteRule}
                    onToggle={handleToggleRule}
                    onTest={handleTestRule}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </GlassSurface>

      {/* Notification Channels */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'channels' ? '' : 'channels')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-green-400" />
            Notification Channels ({channels.length})
          </h3>
          {expandedSection === 'channels' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'channels' && (
          <>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingChannel(null);
                  setChannelModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Channel
              </button>
            </div>
            {channels.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notification channels configured</p>
                <p className="text-sm">Add a channel to receive alerts</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onEdit={handleEditChannel}
                    onDelete={handleDeleteChannel}
                    onToggle={handleToggleChannel}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </GlassSurface>

      {/* Alert History */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'history' ? '' : 'history')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Alert History ({history.length})
          </h3>
          {expandedSection === 'history' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'history' && (
          <>
            {history.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No alerts triggered yet</p>
                <p className="text-sm">Alerts will appear here when triggered</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {history.map((alert, index) => (
                  <AlertHistoryItem key={alert.id || index} alert={alert} />
                ))}
              </div>
            )}
          </>
        )}
      </GlassSurface>

      {/* Rule Modal */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => {
          setRuleModalOpen(false);
          setEditingRule(null);
        }}
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      >
        <RuleForm
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setRuleModalOpen(false);
            setEditingRule(null);
          }}
          loading={saving}
        />
      </Modal>

      {/* Channel Modal */}
      <Modal
        isOpen={channelModalOpen}
        onClose={() => {
          setChannelModalOpen(false);
          setEditingChannel(null);
        }}
        title={editingChannel ? 'Edit Notification Channel' : 'Create Notification Channel'}
      >
        <ChannelForm
          channel={editingChannel}
          onSave={handleSaveChannel}
          onCancel={() => {
            setChannelModalOpen(false);
            setEditingChannel(null);
          }}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
