/**
 * Database Panel Component
 *
 * Provides a web interface for database management:
 * - Table list with sizes and row counts
 * - SQL query editor with syntax highlighting
 * - Query results with pagination
 * - Slow queries viewer
 * - Connection pool stats
 * - Index usage statistics
 * - Vacuum maintenance
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  HardDrive,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Table,
  Trash2,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api';

// ============================================
// HELPER FUNCTIONS
// ============================================

function _formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (typeof bytes === 'string') {
    // Handle PostgreSQL size strings like "8192 bytes" or "16 kB"
    return bytes;
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatNumber(num) {
  if (!num && num !== 0) return '-';
  return new Intl.NumberFormat().format(num);
}

function formatDuration(ms) {
  if (!ms && ms !== 0) return '-';
  if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function StatCard({ icon: Icon, label, value, subValue, color = '#0ea5e9' }) {
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 truncate">{label}</div>
          <div className="text-lg font-bold text-white">{value}</div>
          {subValue && <div className="text-xs text-gray-500">{subValue}</div>}
        </div>
      </div>
    </div>
  );
}

function TableRow({ table, onSelect, selected }) {
  return (
    <tr
      onClick={() => onSelect(table)}
      className={`
        cursor-pointer transition-colors
        ${selected ? 'bg-cyan-500/20' : 'hover:bg-white/5'}
      `}
    >
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-white">{table.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 text-right">
        {formatNumber(table.rowCount)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 text-right">
        {table.size}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 text-right">
        {table.indexSize || '-'}
      </td>
    </tr>
  );
}

function QueryEditor({ value, onChange, onRun, running, error }) {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    // Run query on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
    // Tab key inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Move cursor after inserted spaces
      setTimeout(() => {
        textareaRef.current.selectionStart = start + 2;
        textareaRef.current.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">SQL Query</span>
          <span className="text-xs text-gray-500">Ctrl+Enter to run</span>
        </div>
        <button
          onClick={onRun}
          disabled={running || !value.trim()}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${running || !value.trim()
              ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }
          `}
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run Query
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="SELECT * FROM users LIMIT 10;"
        className="
          w-full h-40 p-4 bg-black/40 text-gray-200 font-mono text-sm
          placeholder-gray-600 resize-none focus:outline-none
        "
        spellCheck={false}
      />
      {error && (
        <div className="p-3 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono">
              {error}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function QueryResults({ results, loading, pagination, onPageChange }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        <Database className="w-8 h-8 mb-2" />
        <p className="text-sm">Run a query to see results</p>
      </div>
    );
  }

  if (results.rowCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        <Search className="w-8 h-8 mb-2" />
        <p className="text-sm">Query returned no results</p>
      </div>
    );
  }

  const { rows, fields, rowCount, executionTime } = results;

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {formatNumber(rowCount)} row{rowCount !== 1 ? 's' : ''}
          </span>
          {executionTime !== undefined && (
            <span className="text-xs text-gray-500">
              Executed in {formatDuration(executionTime)}
            </span>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-xs text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              {fields?.map((field, i) => (
                <th
                  key={i}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  {field.name || field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows?.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-white/5">
                {fields?.map((field, colIndex) => {
                  const value = row[field.name || field];
                  return (
                    <td
                      key={colIndex}
                      className="px-4 py-2 text-sm text-gray-300 whitespace-nowrap max-w-xs truncate"
                      title={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    >
                      {value === null ? (
                        <span className="text-gray-600 italic">NULL</span>
                      ) : typeof value === 'object' ? (
                        <span className="text-yellow-400 font-mono text-xs">
                          {JSON.stringify(value).slice(0, 50)}
                        </span>
                      ) : typeof value === 'boolean' ? (
                        <span className={value ? 'text-green-400' : 'text-red-400'}>
                          {value.toString()}
                        </span>
                      ) : (
                        String(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlowQueryRow({ query, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-gray-500 w-6">#{index + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-mono truncate text-left">
              {query.query?.slice(0, 80)}
              {query.query?.length > 80 && '...'}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span>{formatDuration(query.duration || query.mean_time)}</span>
              <span>{formatNumber(query.calls)} calls</span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="p-3 bg-black/20">
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
            {query.query}
          </pre>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-500">Total Time</div>
              <div className="text-white">{formatDuration(query.total_time)}</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-500">Mean Time</div>
              <div className="text-white">{formatDuration(query.mean_time)}</div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-500">Calls</div>
              <div className="text-white">{formatNumber(query.calls)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IndexUsageRow({ index }) {
  const usagePercent = index.idx_scan && index.seq_scan
    ? (index.idx_scan / (index.idx_scan + index.seq_scan)) * 100
    : index.idx_scan > 0 ? 100 : 0;

  const usageColor = usagePercent >= 80 ? 'text-green-400' : usagePercent >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <tr className="hover:bg-white/5">
      <td className="px-4 py-3 text-sm">
        <div className="font-medium text-white">{index.indexrelname || index.name}</div>
        <div className="text-xs text-gray-500">{index.relname || index.table}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 text-right">
        {formatNumber(index.idx_scan)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 text-right">
        {formatNumber(index.idx_tup_read)}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <span className={usageColor}>{usagePercent.toFixed(1)}%</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 text-right">
        {index.index_size || '-'}
      </td>
    </tr>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DatabasePanel() {
  // Data state
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [poolStats, setPoolStats] = useState(null);
  const [slowQueries, setSlowQueries] = useState([]);
  const [indexStats, setIndexStats] = useState([]);

  // Query state
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryPage, setQueryPage] = useState(1);

  // UI state
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState('tables');
  const [vacuumRunning, setVacuumRunning] = useState(false);
  const [vacuumResult, setVacuumResult] = useState(null);

  // Get auth token
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch table list
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/database/tables`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  }, [getAuthHeader]);

  // Fetch connection pool stats
  const fetchPoolStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/database/pool`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setPoolStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch pool stats:', err);
    }
  }, [getAuthHeader]);

  // Fetch slow queries
  const fetchSlowQueries = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/database/slow-queries`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setSlowQueries(data.queries || []);
      }
    } catch (err) {
      console.error('Failed to fetch slow queries:', err);
    }
  }, [getAuthHeader]);

  // Fetch index stats
  const fetchIndexStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/database/indexes`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setIndexStats(data.indexes || []);
      }
    } catch (err) {
      console.error('Failed to fetch index stats:', err);
    }
  }, [getAuthHeader]);

  // Run SQL query
  const runQuery = useCallback(async (page = 1) => {
    if (!query.trim()) return;

    setQueryRunning(true);
    setQueryError(null);
    setQueryPage(page);

    try {
      const res = await fetch(`${API_BASE}/admin/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          query: query.trim(),
          page,
          pageSize: 50,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setQueryError(data.error || data.message || 'Query failed');
        setQueryResults(null);
      } else {
        setQueryResults({
          rows: data.rows,
          fields: data.fields,
          rowCount: data.rowCount,
          executionTime: data.executionTime,
        });
        setQueryError(null);
      }
    } catch (err) {
      setQueryError(err.message);
      setQueryResults(null);
    } finally {
      setQueryRunning(false);
    }
  }, [query, getAuthHeader]);

  // Run vacuum
  const runVacuum = useCallback(async (tableName = null) => {
    setVacuumRunning(true);
    setVacuumResult(null);

    try {
      const res = await fetch(`${API_BASE}/admin/database/vacuum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ table: tableName }),
      });

      const data = await res.json();
      setVacuumResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Vacuum completed' : 'Vacuum failed'),
      });

      // Refresh table stats after vacuum
      if (res.ok) {
        fetchTables();
      }
    } catch (err) {
      setVacuumResult({
        success: false,
        message: err.message,
      });
    } finally {
      setVacuumRunning(false);
    }
  }, [getAuthHeader, fetchTables]);

  // Handle table selection
  const handleTableSelect = useCallback((table) => {
    setSelectedTable(table);
    setQuery(`SELECT * FROM ${table.name} LIMIT 50;`);
  }, []);

  // Handle page change in results
  const handlePageChange = useCallback((newPage) => {
    runQuery(newPage);
  }, [runQuery]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchTables(),
      fetchPoolStats(),
      fetchSlowQueries(),
      fetchIndexStats(),
    ]);
    setLoading(false);
  }, [fetchTables, fetchPoolStats, fetchSlowQueries, fetchIndexStats]);

  // Initial load
  useEffect(() => {
    refreshAll();

    // Auto-refresh pool stats every 30 seconds
    const interval = setInterval(fetchPoolStats, 30000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchPoolStats]);

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
            <Database className="w-6 h-6 text-cyan-400" />
            Database Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor tables, run queries, and maintain the database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runVacuum()}
            disabled={vacuumRunning}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
              ${vacuumRunning
                ? 'bg-gray-500/20 border-gray-500/30 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30'
              }
            `}
          >
            {vacuumRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="text-sm">Vacuum All</span>
          </button>
          <button
            onClick={refreshAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Refresh</span>
          </button>
        </div>
      </div>

      {/* Vacuum Result */}
      {vacuumResult && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 ${
            vacuumResult.success
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          {vacuumResult.success ? (
            <Zap className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm ${vacuumResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {vacuumResult.message}
          </span>
          <button
            onClick={() => setVacuumResult(null)}
            className="ml-auto p-1 hover:bg-white/10 rounded"
          >
            <XCircle className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Connection Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Total Connections"
          value={poolStats?.totalCount || 0}
          subValue="In pool"
          color="#0ea5e9"
        />
        <StatCard
          icon={Activity}
          label="Active"
          value={poolStats?.activeCount || 0}
          subValue="In use now"
          color="#22c55e"
        />
        <StatCard
          icon={Clock}
          label="Idle"
          value={poolStats?.idleCount || 0}
          subValue="Available"
          color="#f59e0b"
        />
        <StatCard
          icon={TrendingUp}
          label="Waiting"
          value={poolStats?.waitingCount || 0}
          subValue="In queue"
          color={poolStats?.waitingCount > 0 ? '#ef4444' : '#6b7280'}
        />
      </div>

      {/* Tables Section */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'tables' ? '' : 'tables')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Tables ({tables.length})
          </h3>
          {expandedSection === 'tables' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'tables' && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rows
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Index Size
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tables.map((table) => (
                  <TableRow
                    key={table.name}
                    table={table}
                    onSelect={handleTableSelect}
                    selected={selectedTable?.name === table.name}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassSurface>

      {/* SQL Query Editor */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'query' ? '' : 'query')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-green-400" />
            SQL Query Editor
          </h3>
          {expandedSection === 'query' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'query' && (
          <div className="space-y-4">
            <QueryEditor
              value={query}
              onChange={setQuery}
              onRun={() => runQuery(1)}
              running={queryRunning}
              error={queryError}
            />
            <QueryResults
              results={queryResults}
              loading={queryRunning}
              pagination={queryResults ? {
                page: queryPage,
                totalPages: Math.ceil((queryResults.rowCount || 0) / 50),
              } : null}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </GlassSurface>

      {/* Slow Queries */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'slow' ? '' : 'slow')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            Slow Queries ({slowQueries.length})
          </h3>
          {expandedSection === 'slow' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'slow' && (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            {slowQueries.length > 0 ? (
              slowQueries.map((q, i) => (
                <SlowQueryRow key={i} query={q} index={i} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Zap className="w-6 h-6 mb-2" />
                <p className="text-sm">No slow queries detected</p>
              </div>
            )}
          </div>
        )}
      </GlassSurface>

      {/* Index Usage Statistics */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'indexes' ? '' : 'indexes')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            Index Usage ({indexStats.length})
          </h3>
          {expandedSection === 'indexes' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'indexes' && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Index / Table
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Scans
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tuples Read
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Usage %
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {indexStats.length > 0 ? (
                  indexStats.map((idx, i) => (
                    <IndexUsageRow key={i} index={idx} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No index statistics available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassSurface>
    </div>
  );
}
