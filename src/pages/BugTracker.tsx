/**
 * Bug Tracker - Streamlined Bug Reporting Page
 *
 * Designed for efficient bug squashing workflow:
 * - Quick submission form with structured template
 * - List of open bugs with status
 * - Mobile-friendly error capture for iOS
 * - Console error capture without dev tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlassSurface from '../components/glass/GlassSurface';
import {
  AlertCircle,
  Bug,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Loader2,
  Monitor,
  RefreshCw,
  Send,
  Smartphone,
  WifiOff,
  AlertTriangle,
  Zap,
  FileText,
} from 'lucide-react';
import { apiClient } from '../api/client';

// ============================================
// TYPES
// ============================================

interface BugReport {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'confirmed' | 'resolved' | 'closed' | 'wont_fix';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'visual' | 'functionality' | 'data' | 'error' | 'performance';
  pageUrl: string;
  consoleErrors: string[];
  networkErrors: string[];
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  resolution?: {
    resolvedAt: string;
    notes: string;
  };
}

interface BugStats {
  totals: {
    total: number;
    open: number;
    resolved: number;
    today: number;
    thisWeek: number;
  };
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

type BugType = 'visual' | 'functionality' | 'data' | 'error' | 'performance';
type Priority = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// COMPONENT
// ============================================

export default function BugTracker() {
  const { user } = useUser();
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState('');
  const [bugType, setBugType] = useState<BugType>('functionality');
  const [priority, setPriority] = useState<Priority>('medium');
  const [pageUrl, setPageUrl] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [consoleErrors, setConsoleErrors] = useState('');
  const [networkErrors, setNetworkErrors] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Bug list state
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [stats, setStats] = useState<BugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [expandedForm, setExpandedForm] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Auto-fill current URL
  useEffect(() => {
    setPageUrl(window.location.origin + window.location.pathname);
  }, []);

  // Fetch bugs
  const fetchBugs = useCallback(async () => {
    try {
      const statusParam = filter === 'all' ? 'all' : filter === 'open' ? 'open' : 'resolved';
      const response = await apiClient.get(`/admin/bugs?status=${statusParam}&limit=50`);
      setBugs(response.data.items || []);
    } catch (err) {
      console.error('Failed to fetch bugs:', err);
    }
  }, [filter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/bugs/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch bug stats:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBugs(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchBugs, fetchStats]);

  // Refresh on filter change
  useEffect(() => {
    fetchBugs();
  }, [filter, fetchBugs]);

  // Submit bug report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      // Parse console errors into array
      const consoleErrorsArray = consoleErrors
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const networkErrorsArray = networkErrors
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const bugData = {
        type: 'bug_report',
        title: title.trim(),
        description: actualBehavior.trim() || title.trim(),
        priority,
        stepsToReproduce: stepsToReproduce.trim() || undefined,
        expectedBehavior: expectedBehavior.trim() || undefined,
        actualBehavior: actualBehavior.trim() || undefined,
        category: bugType,
        metadata: {
          bugType,
          pageUrl,
          consoleErrors: consoleErrorsArray,
          networkErrors: networkErrorsArray,
          reportedVia: 'empire_bug_tracker',
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform,
        },
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
      };

      await apiClient.post('/feedback', bugData);

      // Reset form
      setTitle('');
      setStepsToReproduce('');
      setExpectedBehavior('');
      setActualBehavior('');
      setConsoleErrors('');
      setNetworkErrors('');
      setBugType('functionality');
      setPriority('medium');
      setSubmitSuccess(true);

      // Refresh list
      await Promise.all([fetchBugs(), fetchStats()]);

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit bug report';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Update bug status
  const updateBugStatus = async (bugId: string, status: string) => {
    try {
      await apiClient.patch(`/admin/bugs/${bugId}`, { status });
      await Promise.all([fetchBugs(), fetchStats()]);
      if (selectedBug?.id === bugId) {
        setSelectedBug(prev => prev ? { ...prev, status: status as BugReport['status'] } : null);
      }
    } catch (err) {
      console.error('Failed to update bug status:', err);
    }
  };

  // Priority colors
  const priorityColors: Record<Priority, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
  };

  // Status colors
  const statusColors: Record<string, string> = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-orange-500/20 text-orange-400',
    resolved: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400',
    wont_fix: 'bg-red-500/20 text-red-400',
  };

  // Bug type options
  const bugTypes: { value: BugType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'visual', label: 'Visual/CSS', icon: <Monitor className="w-4 h-4" />, description: 'Layout, styling, spacing issues' },
    { value: 'functionality', label: 'Broken Feature', icon: <Zap className="w-4 h-4" />, description: 'Button/form/feature not working' },
    { value: 'data', label: 'Data Issue', icon: <FileText className="w-4 h-4" />, description: 'Wrong or missing data displayed' },
    { value: 'error', label: 'Error Message', icon: <AlertCircle className="w-4 h-4" />, description: 'Console or API error' },
    { value: 'performance', label: 'Performance', icon: <Clock className="w-4 h-4" />, description: 'Slow, freezing, unresponsive' },
  ];

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bug className="w-8 h-8 text-red-400" />
              Bug Tracker
            </h1>
            <p className="text-gray-400 mt-1">Report and track bugs efficiently</p>
          </div>
          <button
            onClick={() => navigate('/empire')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            ← Back to Empire
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <GlassSurface className="p-4">
              <div className="text-sm text-gray-400">Total Bugs</div>
              <div className="text-2xl font-bold text-white">{stats.totals.total}</div>
            </GlassSurface>
            <GlassSurface className="p-4 cursor-pointer hover:bg-white/5" onClick={() => setFilter('open')}>
              <div className="text-sm text-gray-400">Open</div>
              <div className="text-2xl font-bold text-orange-400">{stats.totals.open}</div>
            </GlassSurface>
            <GlassSurface className="p-4 cursor-pointer hover:bg-white/5" onClick={() => setFilter('resolved')}>
              <div className="text-sm text-gray-400">Resolved</div>
              <div className="text-2xl font-bold text-green-400">{stats.totals.resolved}</div>
            </GlassSurface>
            <GlassSurface className="p-4">
              <div className="text-sm text-gray-400">Today</div>
              <div className="text-2xl font-bold text-violet-400">{stats.totals.today}</div>
            </GlassSurface>
            <GlassSurface className="p-4">
              <div className="text-sm text-gray-400">This Week</div>
              <div className="text-2xl font-bold text-blue-400">{stats.totals.thisWeek}</div>
            </GlassSurface>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Bug Submission Form */}
          <div>
            <GlassSurface className="p-6">
              <button
                onClick={() => setExpandedForm(!expandedForm)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-violet-400" />
                  Report New Bug
                </h2>
                {expandedForm ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedForm && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Bug Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Bug Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Short description of the bug"
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                      required
                    />
                  </div>

                  {/* Bug Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bug Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {bugTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setBugType(type.value)}
                          className={`p-3 rounded-lg border transition-all text-left ${
                            bugType === type.value
                              ? 'border-violet-500 bg-violet-500/20'
                              : 'border-white/10 bg-black/20 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {type.icon}
                            <span className="text-sm font-medium">{type.label}</span>
                          </div>
                          <p className="text-xs text-gray-400">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            priority === p
                              ? priorityColors[p]
                              : 'bg-white/10 text-gray-400 hover:bg-white/20'
                          }`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Page URL</label>
                    <input
                      type="text"
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      placeholder="https://musclemap.me/..."
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  {/* Steps to Reproduce */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Steps to Reproduce
                    </label>
                    <textarea
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      placeholder="1. Go to [page]&#10;2. Click [element]&#10;3. See [problem]"
                      rows={3}
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>

                  {/* Expected vs Actual */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Expected</label>
                      <textarea
                        value={expectedBehavior}
                        onChange={(e) => setExpectedBehavior(e.target.value)}
                        placeholder="What should happen"
                        rows={2}
                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Actual</label>
                      <textarea
                        value={actualBehavior}
                        onChange={(e) => setActualBehavior(e.target.value)}
                        placeholder="What actually happens"
                        rows={2}
                        className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Console Errors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                      <Code className="w-4 h-4 text-red-400" />
                      Console Errors (paste from DevTools)
                    </label>
                    <textarea
                      value={consoleErrors}
                      onChange={(e) => setConsoleErrors(e.target.value)}
                      placeholder="Paste any red error messages from the browser console here..."
                      rows={3}
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none font-mono text-sm"
                    />
                  </div>

                  {/* Network Errors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                      <WifiOff className="w-4 h-4 text-orange-400" />
                      Network Errors (failed API calls)
                    </label>
                    <textarea
                      value={networkErrors}
                      onChange={(e) => setNetworkErrors(e.target.value)}
                      placeholder="Any failed network requests (red in Network tab)..."
                      rows={2}
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none font-mono text-sm"
                    />
                  </div>

                  {/* Submit */}
                  {submitError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {submitError}
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Bug report submitted successfully!
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Bug className="w-4 h-4" />
                        Submit Bug Report
                      </>
                    )}
                  </button>
                </form>
              )}
            </GlassSurface>

            {/* iOS Debug Helper */}
            <GlassSurface className="p-6 mt-4">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-blue-400" />
                iOS Safari Debug Helper
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Cannot access DevTools on iOS? Enable the debug overlay to capture errors:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Enable mobile debug mode
                    localStorage.setItem('musclemap_debug_mode', 'true');
                    window.location.reload();
                  }}
                  className="w-full py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm transition-colors"
                >
                  Enable Debug Overlay
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('musclemap_debug_mode');
                    window.location.reload();
                  }}
                  className="w-full py-2 bg-white/10 text-gray-400 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  Disable Debug Overlay
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                When enabled, a floating bug icon will appear. Tap it to see captured errors.
              </p>
            </GlassSurface>
          </div>

          {/* Bug List */}
          <div>
            <GlassSurface className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Bug Reports
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as typeof filter)}
                    className="px-3 py-1 bg-black/30 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="all">All</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => { fetchBugs(); fetchStats(); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : bugs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No bugs found</p>
                  <p className="text-sm mt-1">Report one using the form</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {bugs.map((bug) => (
                    <div
                      key={bug.id}
                      onClick={() => setSelectedBug(selectedBug?.id === bug.id ? null : bug)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedBug?.id === bug.id
                          ? 'bg-violet-500/20 border border-violet-500/50'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[bug.priority]}`}>
                              {bug.priority}
                            </span>
                            <span className="font-medium text-sm truncate">{bug.title}</span>
                          </div>
                          {bug.pageUrl && (
                            <div className="text-xs text-gray-500 truncate">{bug.pageUrl}</div>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span className={`px-2 py-0.5 rounded ${statusColors[bug.status]}`}>
                              {bug.status.replace('_', ' ')}
                            </span>
                            <span>•</span>
                            <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedBug?.id === bug.id && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                          {bug.description && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Description</h4>
                              <p className="text-sm text-gray-300">{bug.description}</p>
                            </div>
                          )}
                          {bug.stepsToReproduce && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Steps to Reproduce</h4>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{bug.stepsToReproduce}</p>
                            </div>
                          )}
                          {bug.consoleErrors && bug.consoleErrors.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Console Errors</h4>
                              <pre className="text-xs text-red-400 bg-black/30 p-2 rounded overflow-x-auto">
                                {bug.consoleErrors.join('\n')}
                              </pre>
                            </div>
                          )}
                          {bug.resolution && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Resolution</h4>
                              <p className="text-sm text-green-400">{bug.resolution.notes}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {bug.status !== 'resolved' && bug.status !== 'closed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBugStatus(bug.id, 'resolved');
                                }}
                                className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs"
                              >
                                Mark Resolved
                              </button>
                            )}
                            {bug.status === 'open' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBugStatus(bug.id, 'in_progress');
                                }}
                                className="px-3 py-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded text-xs"
                              >
                                In Progress
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
}
