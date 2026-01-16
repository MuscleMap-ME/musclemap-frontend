/**
 * Security Panel Component
 *
 * Provides security monitoring and management:
 * - Failed login attempts tracking
 * - Active session management
 * - IP blocklist management
 * - Rate limit configuration
 * - Security audit log
 * - Security scan with results
 * - Suspicious activity alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/security';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  info: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
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

function formatFullTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
}

// ============================================
// SUBCOMPONENTS
// ============================================

function SecurityStat({ icon: Icon, label, value, color, alert }) {
  return (
    <div className={`p-4 rounded-lg ${alert ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${color || 'text-gray-400'}`} />
        {alert && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function FailedLoginRow({ attempt, onBlock }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm text-white">{attempt.ip}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">{attempt.username || 'Unknown'}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">{formatTimestamp(attempt.timestamp)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded ${
          attempt.attempts > 5 ? 'bg-red-500/20 text-red-400' :
          attempt.attempts > 3 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {attempt.attempts} attempt{attempt.attempts !== 1 ? 's' : ''}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onBlock(attempt.ip)}
          className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          title="Block IP"
        >
          <Ban className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function SessionRow({ session, onTerminate, isCurrentSession }) {
  return (
    <div className={`p-4 rounded-lg border ${
      isCurrentSession ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isCurrentSession ? 'bg-green-500/20' : 'bg-white/10'
          }`}>
            <Monitor className={`w-5 h-5 ${isCurrentSession ? 'text-green-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="text-sm font-medium text-white flex items-center gap-2">
              {session.device || 'Unknown Device'}
              {isCurrentSession && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                  Current
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {session.browser || 'Unknown Browser'} - {session.os || 'Unknown OS'}
            </div>
          </div>
        </div>
        {!isCurrentSession && (
          <button
            onClick={() => onTerminate(session.id)}
            className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            title="Terminate Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          {session.ip || 'Unknown IP'}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last active: {formatTimestamp(session.lastActive)}
        </div>
        {session.location && (
          <div>{session.location}</div>
        )}
      </div>
    </div>
  );
}

function BlockedIPRow({ item, onUnblock }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
          <Ban className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="font-mono text-sm text-white">{item.ip}</div>
          <div className="text-xs text-gray-400">
            Blocked {formatTimestamp(item.blockedAt)} - {item.reason || 'No reason provided'}
          </div>
        </div>
      </div>
      <button
        onClick={() => onUnblock(item.ip)}
        className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-400 transition-colors"
        title="Unblock IP"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AuditLogEntry({ entry }) {
  const severity = SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.info;

  return (
    <div className={`p-3 rounded-lg ${severity.bg} border ${severity.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {entry.severity === 'critical' || entry.severity === 'high' ? (
            <ShieldAlert className={`w-4 h-4 ${severity.text}`} />
          ) : (
            <Shield className={`w-4 h-4 ${severity.text}`} />
          )}
          <span className={`text-sm font-medium ${severity.text}`}>{entry.action}</span>
        </div>
        <span className="text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</span>
      </div>
      <div className="mt-2 text-sm text-gray-300">{entry.details}</div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        {entry.ip && (
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {entry.ip}
          </span>
        )}
        {entry.user && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {entry.user}
          </span>
        )}
      </div>
    </div>
  );
}

function ScanResultItem({ result }) {
  const severity = SEVERITY_COLORS[result.severity] || SEVERITY_COLORS.info;

  return (
    <div className={`p-3 rounded-lg ${severity.bg} border ${severity.border}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${severity.text}`}>{result.title}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${severity.bg} ${severity.text}`}>
          {result.severity?.toUpperCase()}
        </span>
      </div>
      <div className="text-sm text-gray-300">{result.description}</div>
      {result.recommendation && (
        <div className="mt-2 text-xs text-gray-400">
          <span className="font-medium">Recommendation:</span> {result.recommendation}
        </div>
      )}
    </div>
  );
}

function SuspiciousActivityAlert({ alert, onDismiss, onInvestigate }) {
  const severity = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;

  return (
    <div className={`p-4 rounded-lg ${severity.bg} border ${severity.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${severity.text}`} />
          <span className={`text-sm font-semibold ${severity.text}`}>{alert.type}</span>
        </div>
        <span className="text-xs text-gray-400">{formatTimestamp(alert.timestamp)}</span>
      </div>
      <div className="mt-2 text-sm text-gray-300">{alert.description}</div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        {alert.ip && (
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {alert.ip}
          </span>
        )}
        {alert.user && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {alert.user}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onInvestigate(alert.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
        >
          <Eye className="w-3 h-3" />
          Investigate
        </button>
        <button
          onClick={() => onDismiss(alert.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors"
        >
          <XCircle className="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

function RateLimitForm({ config, onSave, loading }) {
  const [formData, setFormData] = useState({
    loginAttempts: config?.loginAttempts || 5,
    loginWindow: config?.loginWindow || 15,
    apiRequests: config?.apiRequests || 100,
    apiWindow: config?.apiWindow || 1,
    blockDuration: config?.blockDuration || 60,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Login Attempts
          </label>
          <input
            type="number"
            value={formData.loginAttempts}
            onChange={(e) => setFormData({ ...formData, loginAttempts: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
            min="1"
            max="20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Login Window (minutes)
          </label>
          <input
            type="number"
            value={formData.loginWindow}
            onChange={(e) => setFormData({ ...formData, loginWindow: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
            min="1"
            max="60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            API Requests/min
          </label>
          <input
            type="number"
            value={formData.apiRequests}
            onChange={(e) => setFormData({ ...formData, apiRequests: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
            min="10"
            max="1000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            API Window (minutes)
          </label>
          <input
            type="number"
            value={formData.apiWindow}
            onChange={(e) => setFormData({ ...formData, apiWindow: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
            min="1"
            max="60"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Auto-block Duration (minutes)
        </label>
        <input
          type="number"
          value={formData.blockDuration}
          onChange={(e) => setFormData({ ...formData, blockDuration: parseInt(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
          min="5"
          max="1440"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Save Configuration
      </button>
    </form>
  );
}

function AddBlockIPModal({ isOpen, onClose, onAdd }) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ip) return;
    setLoading(true);
    await onAdd(ip, reason);
    setLoading(false);
    setIp('');
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-400" />
          Block IP Address
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              IP Address *
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.1 or 192.168.1.0/24"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-red-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for blocking"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !ip}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Block IP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SecurityPanel() {
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState('alerts');

  // Data state
  const [stats, setStats] = useState(null);
  const [failedLogins, setFailedLogins] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [rateLimitConfig, setRateLimitConfig] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [scanResults, setScanResults] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // UI state
  const [scanning, setScanning] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  // Get auth token
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch all security data
  const fetchSecurityData = useCallback(async () => {
    try {
      const headers = getAuthHeader();

      // Fetch all data in parallel
      const [
        statsRes,
        loginsRes,
        sessionsRes,
        blockedRes,
        configRes,
        auditRes,
        alertsRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/stats`, { headers }),
        fetch(`${API_BASE}/failed-logins`, { headers }),
        fetch(`${API_BASE}/sessions`, { headers }),
        fetch(`${API_BASE}/blocked-ips`, { headers }),
        fetch(`${API_BASE}/rate-limit-config`, { headers }),
        fetch(`${API_BASE}/audit-log`, { headers }),
        fetch(`${API_BASE}/alerts`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (loginsRes.ok) setFailedLogins((await loginsRes.json()).attempts || []);
      if (sessionsRes.ok) setSessions((await sessionsRes.json()).sessions || []);
      if (blockedRes.ok) setBlockedIPs((await blockedRes.json()).blocked || []);
      if (configRes.ok) setRateLimitConfig(await configRes.json());
      if (auditRes.ok) setAuditLog((await auditRes.json()).entries || []);
      if (alertsRes.ok) setAlerts((await alertsRes.json()).alerts || []);
    } catch (err) {
      console.error('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Block IP
  const blockIP = useCallback(async (ip, reason = 'Manual block') => {
    try {
      const res = await fetch(`${API_BASE}/block-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ ip, reason }),
      });

      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error('Failed to block IP:', err);
    }
  }, [getAuthHeader, fetchSecurityData]);

  // Unblock IP
  const unblockIP = useCallback(async (ip) => {
    try {
      const res = await fetch(`${API_BASE}/unblock-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ ip }),
      });

      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    }
  }, [getAuthHeader, fetchSecurityData]);

  // Terminate session
  const terminateSession = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        fetchSecurityData();
      }
    } catch (err) {
      console.error('Failed to terminate session:', err);
    }
  }, [getAuthHeader, fetchSecurityData]);

  // Save rate limit config
  const saveRateLimitConfig = useCallback(async (config) => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE}/rate-limit-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        setRateLimitConfig(config);
      }
    } catch (err) {
      console.error('Failed to save rate limit config:', err);
    } finally {
      setSavingConfig(false);
    }
  }, [getAuthHeader]);

  // Run security scan
  const runSecurityScan = useCallback(async () => {
    setScanning(true);
    setScanResults(null);
    try {
      const res = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        setScanResults(data);
      }
    } catch (err) {
      console.error('Failed to run security scan:', err);
      setScanResults({ error: err.message });
    } finally {
      setScanning(false);
    }
  }, [getAuthHeader]);

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  }, [getAuthHeader]);

  // Investigate alert
  const investigateAlert = useCallback((alertId) => {
    // For now, just expand the audit log section with relevant filters
    setExpandedSection('audit');
    // In a full implementation, this would filter the audit log or open a detail view
  }, []);

  // Initial load
  useEffect(() => {
    fetchSecurityData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [fetchSecurityData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const currentSessionId = localStorage.getItem('session_id');
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            Security Panel
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor security events, manage access, and configure protection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runSecurityScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-colors disabled:opacity-50"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="text-sm">Run Scan</span>
          </button>
          <button
            onClick={fetchSecurityData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Refresh</span>
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SecurityStat
          icon={AlertTriangle}
          label="Failed Logins (24h)"
          value={stats?.failedLogins24h || 0}
          color="text-red-400"
          alert={stats?.failedLogins24h > 50}
        />
        <SecurityStat
          icon={Monitor}
          label="Active Sessions"
          value={stats?.activeSessions || sessions.length}
          color="text-blue-400"
        />
        <SecurityStat
          icon={Ban}
          label="Blocked IPs"
          value={stats?.blockedIPs || blockedIPs.length}
          color="text-yellow-400"
        />
        <SecurityStat
          icon={ShieldCheck}
          label="Security Score"
          value={stats?.securityScore || 'N/A'}
          color="text-green-400"
          alert={stats?.securityScore && stats.securityScore < 70}
        />
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span className="text-sm font-semibold text-red-400">
              {criticalAlerts.length} Critical Alert{criticalAlerts.length !== 1 ? 's' : ''} Require Attention
            </span>
          </div>
          <div className="text-sm text-gray-300">
            There are active security alerts that need immediate review.
          </div>
        </div>
      )}

      {/* Suspicious Activity Alerts */}
      {alerts.length > 0 && (
        <GlassSurface className="p-4">
          <button
            onClick={() => setExpandedSection(expandedSection === 'alerts' ? '' : 'alerts')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Suspicious Activity ({alerts.length})
            </h3>
            {expandedSection === 'alerts' ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'alerts' && (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <SuspiciousActivityAlert
                  key={alert.id}
                  alert={alert}
                  onDismiss={dismissAlert}
                  onInvestigate={investigateAlert}
                />
              ))}
            </div>
          )}
        </GlassSurface>
      )}

      {/* Security Scan Results */}
      {scanResults && (
        <GlassSurface className="p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-cyan-400" />
            Scan Results
            {scanResults.completedAt && (
              <span className="text-xs text-gray-400">
                {formatFullTimestamp(scanResults.completedAt)}
              </span>
            )}
          </h3>
          {scanResults.error ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              Scan failed: {scanResults.error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  scanResults.score >= 80 ? 'bg-green-500/20 text-green-400' :
                  scanResults.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                  Score: {scanResults.score || 'N/A'}/100
                </div>
                <div className="text-sm text-gray-400">
                  {scanResults.findings?.length || 0} finding{(scanResults.findings?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>
              {scanResults.findings?.length > 0 && (
                <div className="space-y-2">
                  {scanResults.findings.map((result, idx) => (
                    <ScanResultItem key={idx} result={result} />
                  ))}
                </div>
              )}
              {(!scanResults.findings || scanResults.findings.length === 0) && (
                <div className="text-center py-6 text-gray-400">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <div className="text-sm">No security issues found</div>
                </div>
              )}
            </>
          )}
        </GlassSurface>
      )}

      {/* Failed Login Attempts */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'logins' ? '' : 'logins')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-400" />
            Failed Login Attempts
            {failedLogins.length > 0 && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                {failedLogins.length}
              </span>
            )}
          </h3>
          {expandedSection === 'logins' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'logins' && (
          <>
            {failedLogins.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-white/10">
                      <th className="px-4 py-2">IP Address</th>
                      <th className="px-4 py-2">Username</th>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Attempts</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedLogins.map((attempt, idx) => (
                      <FailedLoginRow
                        key={idx}
                        attempt={attempt}
                        onBlock={blockIP}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <div className="text-sm">No failed login attempts</div>
              </div>
            )}
          </>
        )}
      </GlassSurface>

      {/* Active Sessions */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'sessions' ? '' : 'sessions')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            Active Sessions ({sessions.length})
          </h3>
          {expandedSection === 'sessions' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'sessions' && (
          <div className="space-y-3">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isCurrentSession={session.id === currentSessionId}
                  onTerminate={terminateSession}
                />
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Monitor className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm">No active sessions</div>
              </div>
            )}
          </div>
        )}
      </GlassSurface>

      {/* IP Blocklist */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'blocked' ? '' : 'blocked')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Ban className="w-4 h-4 text-yellow-400" />
            IP Blocklist ({blockedIPs.length})
          </h3>
          {expandedSection === 'blocked' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'blocked' && (
          <>
            <div className="mb-3">
              <button
                onClick={() => setShowAddBlockModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add IP to Blocklist</span>
              </button>
            </div>
            <div className="space-y-2">
              {blockedIPs.length > 0 ? (
                blockedIPs.map((item, idx) => (
                  <BlockedIPRow
                    key={idx}
                    item={item}
                    onUnblock={unblockIP}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Ban className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">No blocked IPs</div>
                </div>
              )}
            </div>
          </>
        )}
      </GlassSurface>

      {/* Rate Limit Configuration */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'ratelimit' ? '' : 'ratelimit')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            Rate Limit Configuration
          </h3>
          {expandedSection === 'ratelimit' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'ratelimit' && (
          <RateLimitForm
            config={rateLimitConfig}
            onSave={saveRateLimitConfig}
            loading={savingConfig}
          />
        )}
      </GlassSurface>

      {/* Security Audit Log */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'audit' ? '' : 'audit')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-400" />
            Security Audit Log
          </h3>
          {expandedSection === 'audit' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'audit' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLog.length > 0 ? (
              auditLog.map((entry, idx) => (
                <AuditLogEntry key={idx} entry={entry} />
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm">No audit log entries</div>
              </div>
            )}
          </div>
        )}
      </GlassSurface>

      {/* Add Block IP Modal */}
      <AddBlockIPModal
        isOpen={showAddBlockModal}
        onClose={() => setShowAddBlockModal(false)}
        onAdd={blockIP}
      />
    </div>
  );
}
