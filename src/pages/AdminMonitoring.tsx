/**
 * Admin Monitoring Dashboard
 *
 * Comprehensive system monitoring with:
 * - Live API test runner
 * - User journey viewer
 * - Error tracking
 * - System health metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlassSurface from '../components/glass/GlassSurface';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Server,
  XCircle,
  Bug,
  Route,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

const API_BASE = '/api/monitoring';

export default function AdminMonitoring() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [errors, setErrors] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [runningTests, setRunningTests] = useState(false);
  const [expandedJourney, setExpandedJourney] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);

  // Fetch auth token
  const getAuthHeader = useCallback(() => {
    try {
      const authData = localStorage.getItem('musclemap-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) return { Authorization: `Bearer ${token}` };
      }
    } catch (_e) {}
    return {};
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard:', e);
    }
  }, [getAuthHeader]);

  // Fetch system health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setSystemHealth(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch health:', e);
    }
  }, [getAuthHeader]);

  // Fetch test history
  const fetchTestHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tests/history?limit=10`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setTestHistory(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch test history:', e);
    }
  }, [getAuthHeader]);

  // Fetch user journeys
  const fetchJourneys = useCallback(async (hasErrors = false) => {
    try {
      const res = await fetch(`${API_BASE}/journeys?limit=20&hasErrors=${hasErrors}`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setJourneys(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch journeys:', e);
    }
  }, [getAuthHeader]);

  // Fetch errors
  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/errors?limit=50`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setErrors(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch errors:', e);
    }
  }, [getAuthHeader]);

  // Run API tests
  const runTests = async (targetUrl = 'https://musclemap.me') => {
    setRunningTests(true);
    setTestResults(null);

    try {
      const authData = localStorage.getItem('musclemap-auth');
      const token = authData ? JSON.parse(authData)?.state?.token : null;

      const res = await fetch(`${API_BASE}/tests/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          targetUrl,
          authToken: token,
          verbose: true,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setTestResults(json);
        fetchTestHistory();
      } else {
        const error = await res.json();
        setTestResults({ error: error.error?.message || 'Test run failed' });
      }
    } catch (e) {
      setTestResults({ error: e.message });
    } finally {
      setRunningTests(false);
    }
  };

  // Resolve error
  const resolveError = async (errorId) => {
    try {
      await fetch(`${API_BASE}/errors/${errorId}/resolve`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      fetchErrors();
    } catch (e) {
      console.error('Failed to resolve error:', e);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchHealth(),
        fetchTestHistory(),
        fetchJourneys(),
        fetchErrors(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchHealth, fetchTestHistory, fetchJourneys, fetchErrors]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        fetchDashboard();
        fetchHealth();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchDashboard, fetchHealth]);

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin access required</p>
          <Link to="/dashboard" className="mt-4 inline-block text-violet-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const StatusBadge = ({ status }) => {
    const colors = {
      healthy: 'bg-green-500/20 text-green-400',
      degraded: 'bg-yellow-500/20 text-yellow-400',
      unhealthy: 'bg-red-500/20 text-red-400',
      pass: 'bg-green-500/20 text-green-400',
      fail: 'bg-red-500/20 text-red-400',
      skip: 'bg-gray-500/20 text-gray-400',
      error: 'bg-orange-500/20 text-orange-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin-control" className="text-gray-400 hover:text-white">
                ← Admin
              </Link>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Server className="w-6 h-6 text-violet-400" />
                System Monitoring
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {systemHealth && (
                <StatusBadge status={systemHealth.overall} />
              )}
              <button
                onClick={() => {
                  fetchDashboard();
                  fetchHealth();
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {['dashboard', 'tests', 'journeys', 'errors'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <GlassSurface className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Tests (24h)</div>
                    <div className="text-2xl font-bold">{dashboardData?.testsRun24h || 0}</div>
                    <div className="text-xs text-green-400 mt-1">
                      {dashboardData?.testPassRate || 100}% pass rate
                    </div>
                  </GlassSurface>
                  <GlassSurface className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Journeys (24h)</div>
                    <div className="text-2xl font-bold">{dashboardData?.journeysTracked24h || 0}</div>
                    <div className="text-xs text-yellow-400 mt-1">
                      {dashboardData?.journeysWithErrors || 0} with errors
                    </div>
                  </GlassSurface>
                  <GlassSurface className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Unresolved Errors</div>
                    <div className="text-2xl font-bold text-red-400">
                      {dashboardData?.unresolvedErrors || 0}
                    </div>
                  </GlassSurface>
                  <GlassSurface className="p-4">
                    <div className="text-sm text-gray-400 mb-1">System Status</div>
                    <div className="flex items-center gap-2 mt-2">
                      {systemHealth?.overall === 'healthy' ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : systemHealth?.overall === 'degraded' ? (
                        <AlertTriangle className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                      <span className="capitalize">{systemHealth?.overall || 'Unknown'}</span>
                    </div>
                  </GlassSurface>
                </div>

                {/* Health Checks */}
                {systemHealth && (
                  <GlassSurface className="p-4">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Health Checks
                    </h2>
                    <div className="grid gap-3">
                      {systemHealth.checks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            {check.status === 'healthy' ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : check.status === 'degraded' ? (
                              <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                            <span className="capitalize">{check.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            {check.latency && <span>{check.latency}ms</span>}
                            {check.message && <span>{check.message}</span>}
                            <StatusBadge status={check.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassSurface>
                )}

                {/* Top Errors */}
                {dashboardData?.topErrors?.length > 0 && (
                  <GlassSurface className="p-4">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Bug className="w-5 h-5" />
                      Top Errors
                    </h2>
                    <div className="space-y-2">
                      {dashboardData.topErrors.map((err, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg">
                          <span className="text-sm truncate flex-1">{err.message}</span>
                          <span className="text-red-400 font-mono text-sm ml-4">
                            ×{err.occurrences}
                          </span>
                        </div>
                      ))}
                    </div>
                  </GlassSurface>
                )}
              </div>
            )}

            {/* Tests Tab */}
            {activeTab === 'tests' && (
              <div className="space-y-6">
                {/* Run Tests */}
                <GlassSurface className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Run API Tests</h2>
                    <button
                      onClick={() => runTests()}
                      disabled={runningTests}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {runningTests ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {runningTests ? 'Running...' : 'Run Tests'}
                    </button>
                  </div>

                  {/* Test Results */}
                  {testResults && (
                    <div className="mt-4">
                      {testResults.error ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="text-red-400 font-medium">Test run failed</div>
                          <div className="text-sm text-gray-400 mt-1">{testResults.error}</div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-green-500/10 rounded-lg">
                              <div className="text-2xl font-bold text-green-400">
                                {testResults.summary?.passed}
                              </div>
                              <div className="text-xs text-gray-400">Passed</div>
                            </div>
                            <div className="text-center p-3 bg-red-500/10 rounded-lg">
                              <div className="text-2xl font-bold text-red-400">
                                {testResults.summary?.failed}
                              </div>
                              <div className="text-xs text-gray-400">Failed</div>
                            </div>
                            <div className="text-center p-3 bg-gray-500/10 rounded-lg">
                              <div className="text-2xl font-bold text-gray-400">
                                {testResults.summary?.skipped}
                              </div>
                              <div className="text-xs text-gray-400">Skipped</div>
                            </div>
                            <div className="text-center p-3 bg-white/5 rounded-lg">
                              <div className="text-2xl font-bold">
                                {testResults.summary?.duration}ms
                              </div>
                              <div className="text-xs text-gray-400">Duration</div>
                            </div>
                          </div>

                          {/* Individual Results */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {testResults.data?.results?.map((result, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-lg cursor-pointer ${
                                  result.status === 'pass'
                                    ? 'bg-green-500/5 hover:bg-green-500/10'
                                    : result.status === 'fail'
                                    ? 'bg-red-500/5 hover:bg-red-500/10'
                                    : 'bg-gray-500/5 hover:bg-gray-500/10'
                                }`}
                                onClick={() => setExpandedTest(expandedTest === i ? null : i)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {result.status === 'pass' ? (
                                      <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : result.status === 'fail' ? (
                                      <XCircle className="w-4 h-4 text-red-400" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span>{result.name}</span>
                                    <span className="text-xs text-gray-500">{result.category}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">{result.duration}ms</span>
                                    {result.message || result.details ? (
                                      expandedTest === i ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )
                                    ) : null}
                                  </div>
                                </div>
                                {expandedTest === i && (result.message || result.details) && (
                                  <div className="mt-3 pt-3 border-t border-white/10 text-sm">
                                    {result.message && (
                                      <div className="text-red-400 mb-2">{result.message}</div>
                                    )}
                                    {result.details && (
                                      <pre className="text-xs text-gray-400 overflow-x-auto">
                                        {JSON.stringify(result.details, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </GlassSurface>

                {/* Test History */}
                <GlassSurface className="p-4">
                  <h2 className="text-lg font-semibold mb-4">Test History</h2>
                  <div className="space-y-2">
                    {testHistory.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">No test history</div>
                    ) : (
                      testHistory.map((suite, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{suite.name}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(suite.startedAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-400">{suite.passed} passed</span>
                              <span className="text-red-400">{suite.failed} failed</span>
                              <span className="text-gray-400">{suite.skipped} skipped</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassSurface>
              </div>
            )}

            {/* Journeys Tab */}
            {activeTab === 'journeys' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Route className="w-5 h-5" />
                    User Journeys
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchJourneys(false)}
                      className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      All
                    </button>
                    <button
                      onClick={() => fetchJourneys(true)}
                      className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      With Errors
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {journeys.length === 0 ? (
                    <GlassSurface className="p-8 text-center text-gray-400">
                      No journeys recorded yet
                    </GlassSurface>
                  ) : (
                    journeys.map((journey) => (
                      <GlassSurface
                        key={journey.id}
                        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setExpandedJourney(expandedJourney === journey.id ? null : journey.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedJourney === journey.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <div>
                              <div className="font-medium">
                                {journey.userId || 'Anonymous'} - {journey.sessionId.substring(0, 16)}...
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(journey.startedAt).toLocaleString()}
                                {journey.endedAt && ` - ${Math.round((new Date(journey.endedAt) - new Date(journey.startedAt)) / 1000)}s`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">{journey.steps?.length || 0} steps</span>
                            {journey.errors?.length > 0 && (
                              <span className="text-red-400 flex items-center gap-1">
                                <Bug className="w-4 h-4" />
                                {journey.errors.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {expandedJourney === journey.id && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            {/* Steps */}
                            {journey.steps?.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm text-gray-400 mb-2">Steps</div>
                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                  {journey.steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                                      <span className="text-xs text-gray-500 w-16">{step.type}</span>
                                      <span className="flex-1">{step.name}</span>
                                      {step.duration && (
                                        <span className="text-xs text-gray-400">{step.duration}ms</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Errors */}
                            {journey.errors?.length > 0 && (
                              <div>
                                <div className="text-sm text-red-400 mb-2">Errors</div>
                                <div className="space-y-2">
                                  {journey.errors.map((error, i) => (
                                    <div key={i} className="p-2 bg-red-500/10 rounded text-sm">
                                      <div className="text-red-400">{error.message}</div>
                                      {error.stack && (
                                        <pre className="text-xs text-gray-500 mt-1 overflow-x-auto">
                                          {error.stack.split('\n').slice(0, 3).join('\n')}
                                        </pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </GlassSurface>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Errors Tab */}
            {activeTab === 'errors' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    Tracked Errors
                  </h2>
                  <button
                    onClick={fetchErrors}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {errors.length === 0 ? (
                    <GlassSurface className="p-8 text-center text-gray-400">
                      No errors tracked
                    </GlassSurface>
                  ) : (
                    errors.map((error) => (
                      <GlassSurface key={error.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                error.resolved
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {error.resolved ? 'Resolved' : error.type}
                              </span>
                              <span className="text-xs text-gray-400">
                                ×{error.occurrences}
                              </span>
                            </div>
                            <div className="text-sm mb-2 truncate">{error.message}</div>
                            <div className="text-xs text-gray-500">
                              {error.path && <span className="mr-3">{error.path}</span>}
                              {new Date(error.timestamp).toLocaleString()}
                            </div>
                            {error.stack && (
                              <pre className="text-xs text-gray-600 mt-2 overflow-x-auto max-h-20">
                                {error.stack.split('\n').slice(0, 3).join('\n')}
                              </pre>
                            )}
                          </div>
                          {!error.resolved && (
                            <button
                              onClick={() => resolveError(error.id)}
                              className="px-3 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </GlassSurface>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
