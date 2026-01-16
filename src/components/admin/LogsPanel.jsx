/**
 * Logs Panel Component
 *
 * Advanced log analysis interface with:
 * - Search bar with regex support
 * - Level filtering (info, warn, error)
 * - Time range selection (last hour, day, week, custom)
 * - Expandable log entries with details
 * - Error grouping by type with counts
 * - Pattern detection display
 * - Export to JSON/CSV
 * - Live tail mode via WebSocket
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  Info,
  Layers,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/logs';

const LOG_LEVELS = [
  { id: 'info', label: 'Info', color: '#3b82f6', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: Info },
  { id: 'warn', label: 'Warn', color: '#f59e0b', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', icon: AlertTriangle },
  { id: 'error', label: 'Error', color: '#ef4444', bgColor: 'bg-red-500/20', textColor: 'text-red-400', icon: AlertCircle },
];

const TIME_RANGES = [
  { id: 'hour', label: 'Last Hour', ms: 60 * 60 * 1000 },
  { id: 'day', label: 'Last 24 Hours', ms: 24 * 60 * 60 * 1000 },
  { id: 'week', label: 'Last Week', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: 'custom', label: 'Custom Range', ms: null },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getLogLevelInfo(level) {
  return LOG_LEVELS.find((l) => l.id === level?.toLowerCase()) || LOG_LEVELS[0];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// SUBCOMPONENTS
// ============================================

function SearchBar({ value, onChange, isRegex, onRegexToggle, placeholder }) {
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (isRegex && newValue) {
      try {
        new RegExp(newValue);
        setError(null);
      } catch (_err) {
        setError('Invalid regex');
      }
    } else {
      setError(null);
    }
    onChange(newValue);
  };

  return (
    <div className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder || 'Search logs...'}
          className={`
            w-full pl-10 pr-20 py-2 rounded-lg
            bg-white/5 border transition-colors
            text-white placeholder-gray-500 text-sm
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            ${error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}
          `}
        />
        <button
          onClick={onRegexToggle}
          className={`
            absolute right-2 top-1/2 -translate-y-1/2
            px-2 py-1 rounded text-xs font-mono transition-colors
            ${isRegex
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }
          `}
          title={isRegex ? 'Regex mode enabled' : 'Enable regex mode'}
        >
          .*
        </button>
      </div>
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function LevelFilter({ selectedLevels, onToggle }) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-gray-400" />
      {LOG_LEVELS.map((level) => {
        const Icon = level.icon;
        const isSelected = selectedLevels.includes(level.id);
        return (
          <button
            key={level.id}
            onClick={() => onToggle(level.id)}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors
              ${isSelected
                ? `${level.bgColor} ${level.textColor} border border-current/30`
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }
            `}
          >
            <Icon className="w-3 h-3" />
            {level.label}
          </button>
        );
      })}
    </div>
  );
}

function TimeRangeSelector({ selected, onSelect, customRange, onCustomRangeChange }) {
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (rangeId) => {
    if (rangeId === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
    onSelect(rangeId);
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-gray-400" />
      <div className="flex items-center gap-1">
        {TIME_RANGES.map((range) => (
          <button
            key={range.id}
            onClick={() => handleSelect(range.id)}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-colors
              ${selected === range.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }
            `}
          >
            {range.label}
          </button>
        ))}
      </div>
      {showCustom && selected === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="datetime-local"
            value={customRange.start}
            onChange={(e) => onCustomRangeChange({ ...customRange, start: e.target.value })}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="datetime-local"
            value={customRange.end}
            onChange={(e) => onCustomRangeChange({ ...customRange, end: e.target.value })}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
          />
        </div>
      )}
    </div>
  );
}

function LogEntry({ log, expanded, onToggle, searchTerm, isRegex }) {
  const levelInfo = getLogLevelInfo(log.level);
  const Icon = levelInfo.icon;

  // Highlight search term in message
  const highlightedMessage = useMemo(() => {
    if (!searchTerm || !log.message) return log.message;
    try {
      const regex = isRegex ? new RegExp(`(${searchTerm})`, 'gi') : new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
      return log.message.replace(regex, '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
    } catch {
      return log.message;
    }
  }, [log.message, searchTerm, isRegex]);

  return (
    <div className={`
      border-b border-white/5 last:border-0
      ${expanded ? 'bg-white/5' : 'hover:bg-white/[0.02]'}
    `}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <div className={`
          w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5
          ${levelInfo.bgColor}
        `}>
          <Icon className={`w-3.5 h-3.5 ${levelInfo.textColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${levelInfo.textColor}`}>
              {log.level?.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(log.timestamp)}
            </span>
            <span className="text-xs text-gray-600">
              ({formatRelativeTime(log.timestamp)})
            </span>
            {log.source && (
              <span className="text-xs bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                {log.source}
              </span>
            )}
          </div>
          <div
            className="text-sm text-gray-300 truncate font-mono"
            dangerouslySetInnerHTML={{ __html: highlightedMessage }}
          />
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 ml-9">
          <div className="bg-black/40 rounded-lg p-3 font-mono text-xs space-y-2">
            <div>
              <span className="text-gray-500">Timestamp: </span>
              <span className="text-gray-300">{log.timestamp}</span>
            </div>
            <div>
              <span className="text-gray-500">Level: </span>
              <span className={levelInfo.textColor}>{log.level}</span>
            </div>
            {log.source && (
              <div>
                <span className="text-gray-500">Source: </span>
                <span className="text-gray-300">{log.source}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Message: </span>
              <pre className="text-gray-300 whitespace-pre-wrap mt-1">{log.message}</pre>
            </div>
            {log.stack && (
              <div>
                <span className="text-gray-500">Stack Trace: </span>
                <pre className="text-red-400 whitespace-pre-wrap mt-1 text-[10px]">{log.stack}</pre>
              </div>
            )}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <span className="text-gray-500">Metadata: </span>
                <pre className="text-cyan-400 whitespace-pre-wrap mt-1">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorGrouping({ errors, onSelectError }) {
  // Group errors by type/message pattern
  const groupedErrors = useMemo(() => {
    const groups = {};
    errors.forEach((log) => {
      // Extract error type from message
      const match = log.message?.match(/^(\w+Error|Error|Exception):/);
      const type = match ? match[1] : 'Unknown Error';
      const key = type + (log.message?.substring(0, 50) || '');

      if (!groups[key]) {
        groups[key] = {
          type,
          message: log.message?.substring(0, 100),
          count: 0,
          lastSeen: log.timestamp,
          logs: [],
        };
      }
      groups[key].count++;
      groups[key].logs.push(log);
      if (new Date(log.timestamp) > new Date(groups[key].lastSeen)) {
        groups[key].lastSeen = log.timestamp;
      }
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [errors]);

  if (groupedErrors.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No errors in selected time range</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groupedErrors.map((group, index) => (
        <button
          key={index}
          onClick={() => onSelectError(group.logs[0])}
          className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-left"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-red-400">{group.type}</span>
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              {group.count} occurrence{group.count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-xs text-gray-400 truncate font-mono">
            {group.message}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Last seen: {formatRelativeTime(group.lastSeen)}
          </div>
        </button>
      ))}
    </div>
  );
}

function PatternDetection({ logs }) {
  // Detect common patterns in logs
  const patterns = useMemo(() => {
    const detected = [];

    // Count error frequency
    const errorCount = logs.filter((l) => l.level === 'error').length;
    const totalCount = logs.length;
    const errorRate = totalCount > 0 ? (errorCount / totalCount * 100) : 0;

    if (errorRate > 10) {
      detected.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate detected: ${errorRate.toFixed(1)}% of logs are errors`,
        icon: AlertCircle,
      });
    }

    // Detect repeated errors
    const errorMessages = logs
      .filter((l) => l.level === 'error')
      .map((l) => l.message?.substring(0, 50));
    const messageCounts = {};
    errorMessages.forEach((msg) => {
      if (msg) messageCounts[msg] = (messageCounts[msg] || 0) + 1;
    });
    const repeatedErrors = Object.entries(messageCounts)
      .filter(([, count]) => count > 5)
      .sort((a, b) => b[1] - a[1]);

    if (repeatedErrors.length > 0) {
      detected.push({
        type: 'repeated_errors',
        severity: 'warning',
        message: `${repeatedErrors.length} error patterns repeating frequently`,
        icon: TrendingUp,
      });
    }

    // Detect burst patterns (many logs in short time)
    if (logs.length > 10) {
      const timestamps = logs.map((l) => new Date(l.timestamp).getTime()).sort();
      let maxBurstCount = 0;
      for (let i = 0; i < timestamps.length - 10; i++) {
        if (timestamps[i + 10] - timestamps[i] < 1000) {
          maxBurstCount = Math.max(maxBurstCount, 10);
        }
      }
      if (maxBurstCount > 0) {
        detected.push({
          type: 'burst',
          severity: 'info',
          message: 'Log burst detected: 10+ logs within 1 second',
          icon: Zap,
        });
      }
    }

    return detected;
  }, [logs]);

  if (patterns.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <TrendingUp className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No anomalous patterns detected</p>
      </div>
    );
  }

  const severityColors = {
    critical: 'border-red-500/30 bg-red-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    info: 'border-blue-500/30 bg-blue-500/10',
  };

  const severityTextColors = {
    critical: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  return (
    <div className="space-y-2">
      {patterns.map((pattern, index) => {
        const Icon = pattern.icon;
        return (
          <div
            key={index}
            className={`p-3 rounded-lg border ${severityColors[pattern.severity]}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 ${severityTextColors[pattern.severity]}`} />
              <div>
                <div className={`text-sm font-medium ${severityTextColors[pattern.severity]}`}>
                  {pattern.severity.charAt(0).toUpperCase() + pattern.severity.slice(1)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {pattern.message}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExportButton({ logs, disabled }) {
  const [showMenu, setShowMenu] = useState(false);

  const exportJSON = () => {
    const data = JSON.stringify(logs, null, 2);
    const filename = `logs-${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(data, filename, 'application/json');
    setShowMenu(false);
  };

  const exportCSV = () => {
    const headers = ['timestamp', 'level', 'source', 'message'];
    const rows = logs.map((log) => [
      log.timestamp,
      log.level,
      log.source || '',
      `"${(log.message || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const filename = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csv, filename, 'text/csv');
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || logs.length === 0}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
          ${disabled || logs.length === 0
            ? 'bg-white/5 text-gray-500 cursor-not-allowed'
            : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
          }
        `}
      >
        <Download className="w-4 h-4" />
        <span className="text-sm">Export</span>
      </button>
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-white/10 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 w-full text-left"
            >
              <FileJson className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-white">Export as JSON</span>
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 w-full text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white">Export as CSV</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LiveTailIndicator({ enabled, onToggle, connected }) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
        ${enabled
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
        }
      `}
    >
      {enabled ? (
        <>
          <Pause className="w-4 h-4" />
          <span className="text-sm">Stop Live</span>
          {connected && (
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </>
      ) : (
        <>
          <Play className="w-4 h-4" />
          <span className="text-sm">Go Live</span>
        </>
      )}
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function LogsPanel() {
  // State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState(['info', 'warn', 'error']);
  const [timeRange, setTimeRange] = useState('hour');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [expandedLog, setExpandedLog] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list' | 'errors' | 'patterns'
  const [liveTailEnabled, setLiveTailEnabled] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Refs
  const wsRef = useRef(null);
  const logsContainerRef = useRef(null);

  // Auth helper
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch logs from API
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Add time range
      const range = TIME_RANGES.find((r) => r.id === timeRange);
      if (range?.ms) {
        params.set('since', new Date(Date.now() - range.ms).toISOString());
      } else if (timeRange === 'custom' && customRange.start && customRange.end) {
        params.set('since', new Date(customRange.start).toISOString());
        params.set('until', new Date(customRange.end).toISOString());
      }

      // Add levels
      if (selectedLevels.length < 3) {
        params.set('levels', selectedLevels.join(','));
      }

      // Add search
      if (searchTerm) {
        params.set('search', searchTerm);
        if (isRegex) {
          params.set('regex', 'true');
        }
      }

      const res = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: getAuthHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, customRange, selectedLevels, searchTerm, isRegex, getAuthHeader]);

  // WebSocket connection for live tail
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      console.error('No auth token for WebSocket');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/admin/logs/stream?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Log stream WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'log' && message.data) {
          setLogs((prev) => {
            // Add new log at the beginning, keep max 1000 entries
            const newLogs = [message.data, ...prev].slice(0, 1000);
            return newLogs;
          });
        }
      } catch {
        // Handle raw log lines if not JSON
        console.warn('Received non-JSON WebSocket message');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
      wsRef.current = null;
    };
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  const handleToggleLiveTail = useCallback(() => {
    if (liveTailEnabled) {
      disconnectWebSocket();
      setLiveTailEnabled(false);
    } else {
      setLiveTailEnabled(true);
      connectWebSocket();
    }
  }, [liveTailEnabled, connectWebSocket, disconnectWebSocket]);

  // Filter logs client-side
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Level filter
      if (!selectedLevels.includes(log.level?.toLowerCase())) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        try {
          const regex = isRegex
            ? new RegExp(searchTerm, 'i')
            : new RegExp(escapeRegex(searchTerm), 'i');
          if (!regex.test(log.message || '')) {
            return false;
          }
        } catch {
          // Invalid regex, skip filtering
        }
      }

      return true;
    });
  }, [logs, selectedLevels, searchTerm, isRegex]);

  // Error logs only
  const errorLogs = useMemo(() => {
    return logs.filter((log) => log.level?.toLowerCase() === 'error');
  }, [logs]);

  // Level toggle handler
  const handleLevelToggle = useCallback((level) => {
    setSelectedLevels((prev) => {
      if (prev.includes(level)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((l) => l !== level);
      }
      return [...prev, level];
    });
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    if (!liveTailEnabled) {
      fetchLogs();
    }
  }, [fetchLogs, liveTailEnabled]);

  // Auto-scroll when live tail is enabled
  useEffect(() => {
    if (liveTailEnabled && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [logs, liveTailEnabled]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-cyan-400" />
            Log Analysis
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Search, filter, and analyze application logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveTailIndicator
            enabled={liveTailEnabled}
            onToggle={handleToggleLiveTail}
            connected={wsConnected}
          />
          <ExportButton logs={filteredLogs} disabled={loading} />
          {!liveTailEnabled && (
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm text-gray-300">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <GlassSurface className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            isRegex={isRegex}
            onRegexToggle={() => setIsRegex(!isRegex)}
            placeholder={isRegex ? 'Search with regex...' : 'Search logs...'}
          />
          <LevelFilter
            selectedLevels={selectedLevels}
            onToggle={handleLevelToggle}
          />
        </div>
        <TimeRangeSelector
          selected={timeRange}
          onSelect={setTimeRange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </GlassSurface>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveView('list')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${activeView === 'list'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          <Terminal className="w-4 h-4" />
          Log List
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
            {filteredLogs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveView('errors')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${activeView === 'errors'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          <Layers className="w-4 h-4" />
          Error Groups
          <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
            {errorLogs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveView('patterns')}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${activeView === 'patterns'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }
          `}
        >
          <TrendingUp className="w-4 h-4" />
          Patterns
        </button>
      </div>

      {/* Content */}
      <GlassSurface padding={false} className="overflow-hidden">
        {loading && !liveTailEnabled ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : activeView === 'list' ? (
          <div
            ref={logsContainerRef}
            className="max-h-[600px] overflow-auto"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No logs match your filters</p>
                <p className="text-xs mt-1">Try adjusting your search or time range</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <LogEntry
                  key={log.id || `${log.timestamp}-${index}`}
                  log={log}
                  expanded={expandedLog === index}
                  onToggle={() => setExpandedLog(expandedLog === index ? null : index)}
                  searchTerm={searchTerm}
                  isRegex={isRegex}
                />
              ))
            )}
          </div>
        ) : activeView === 'errors' ? (
          <div className="p-4">
            <ErrorGrouping
              errors={errorLogs}
              onSelectError={(log) => {
                const index = filteredLogs.findIndex((l) => l.id === log.id || l.timestamp === log.timestamp);
                setExpandedLog(index);
                setActiveView('list');
              }}
            />
          </div>
        ) : (
          <div className="p-4">
            <PatternDetection logs={logs} />
          </div>
        )}
      </GlassSurface>

      {/* Stats Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
          {liveTailEnabled && wsConnected && (
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live streaming
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Info: {logs.filter((l) => l.level === 'info').length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            Warn: {logs.filter((l) => l.level === 'warn').length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-400 rounded-full" />
            Error: {logs.filter((l) => l.level === 'error').length}
          </span>
        </div>
      </div>
    </div>
  );
}
