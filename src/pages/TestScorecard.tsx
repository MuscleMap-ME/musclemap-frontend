/**
 * Test Scorecard Dashboard
 *
 * Empire dashboard component for viewing API test results, including:
 * - Overall score with grade (A+/A/B/C/D/F)
 * - Category breakdown (core, edge, security, performance)
 * - Failed tests list with details
 * - Recommendations
 * - Historical trend chart
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlassSurface from '../components/glass/GlassSurface';
import GlassButton from '../components/glass/GlassButton';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileWarning,
  Lightbulb,
  Play,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// SCORE RING COMPONENT
// ============================================

function ScoreRing({ score, grade, size = 200 }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Color based on grade
  const getColor = () => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#06b6d4'; // Cyan
    if (score >= 70) return '#f59e0b'; // Yellow
    if (score >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const color = getColor();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 12px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-bold"
          style={{ color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          {grade}
        </motion.span>
        <motion.span
          className="text-2xl text-gray-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {score}%
        </motion.span>
      </div>
    </div>
  );
}

// ============================================
// CATEGORY CARD COMPONENT
// ============================================

function CategoryCard({ name, icon: Icon, passed, failed, score, color }) {
  const total = passed + failed;

  return (
    <GlassSurface className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <div className="font-semibold capitalize">{name}</div>
            <div className="text-xs text-gray-500">
              {passed}/{total} passed
            </div>
          </div>
        </div>
        <div
          className="text-2xl font-bold"
          style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }}
        >
          {score}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center gap-1 text-green-400">
          <CheckCircle className="w-3 h-3" />
          {passed} passed
        </div>
        {failed > 0 && (
          <div className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3 h-3" />
            {failed} failed
          </div>
        )}
      </div>
    </GlassSurface>
  );
}

// ============================================
// FAILED TEST LIST COMPONENT
// ============================================

function FailedTestList({ tests }) {
  const [expandedTest, setExpandedTest] = useState(null);

  if (!tests || tests.length === 0) {
    return (
      <GlassSurface className="p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <div className="font-semibold text-green-400">All Tests Passing!</div>
        <div className="text-sm text-gray-500 mt-1">
          No failed tests to display
        </div>
      </GlassSurface>
    );
  }

  const categoryIcons = {
    core: Target,
    edge: FileWarning,
    security: Shield,
    performance: Zap,
  };

  const categoryColors = {
    core: '#8b5cf6',
    edge: '#06b6d4',
    security: '#ef4444',
    performance: '#f59e0b',
  };

  return (
    <div className="space-y-2">
      {tests.map((test, index) => {
        const Icon = categoryIcons[test.category] || Target;
        const color = categoryColors[test.category] || '#8b5cf6';
        const isExpanded = expandedTest === index;

        return (
          <GlassSurface
            key={index}
            className="p-0 overflow-hidden cursor-pointer"
            onClick={() => setExpandedTest(isExpanded ? null : index)}
          >
            <div className="p-4 flex items-center gap-3">
              <div
                className="p-2 rounded-lg flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{test.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {test.category} test
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xs text-gray-400">
                  {test.duration?.toFixed(0) || 0}ms
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-white/10"
                >
                  <div className="p-4 bg-white/5">
                    {test.error && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-1">Error:</div>
                        <div className="text-sm text-red-400 font-mono bg-red-500/10 p-2 rounded">
                          {test.error}
                        </div>
                      </div>
                    )}
                    {test.details && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Details:</div>
                        <pre className="text-xs text-gray-300 font-mono bg-white/5 p-2 rounded overflow-x-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!test.error && !test.details && (
                      <div className="text-sm text-gray-500">
                        No additional details available
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassSurface>
        );
      })}
    </div>
  );
}

// ============================================
// SCORE TREND CHART COMPONENT
// ============================================

function ScoreTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <GlassSurface className="p-6 text-center">
        <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <div className="text-gray-400">No historical data yet</div>
        <div className="text-sm text-gray-500 mt-1">
          Run tests multiple times to see trends
        </div>
      </GlassSurface>
    );
  }

  // Format data for chart
  const chartData = data
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score: item.score,
      passed: item.passed,
      failed: item.failed,
    }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="date"
            stroke="#666"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke="#666"
            fontSize={10}
            domain={[0, 100]}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10,10,15,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: '#888' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#colorScore)"
            name="Score"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TestScorecard() {
  const { user } = useUser();
  const [scorecard, setScorecard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // Get auth header
  const getAuthHeader = useCallback(() => {
    try {
      const authData = localStorage.getItem('musclemap-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return { Authorization: `Bearer ${parsed?.state?.token}` };
      }
    } catch (_e) { /* ignore */ }
    return {};
  }, []);

  // Fetch latest scorecard
  const fetchScorecard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [scorecardRes, historyRes] = await Promise.all([
        fetch('/api/admin/test-scorecard', {
          headers: getAuthHeader(),
        }),
        fetch('/api/admin/test-scorecard/history?limit=20', {
          headers: getAuthHeader(),
        }),
      ]);

      if (scorecardRes.ok) {
        const data = await scorecardRes.json();
        setScorecard(data.data);
      } else if (scorecardRes.status !== 404) {
        throw new Error('Failed to fetch scorecard');
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.data || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Run tests
  const runTests = useCallback(async () => {
    try {
      setRunning(true);
      setError(null);

      const res = await fetch('/api/monitoring/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          targetUrl: 'https://musclemap.me',
          verbose: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to run tests');
      }

      const data = await res.json();

      // Convert monitoring test results to scorecard format
      const results = (data.data?.tests || []).map((t) => ({
        name: t.name,
        category: t.category || 'core',
        passed: t.passed,
        duration: t.duration || 0,
        error: t.error,
        details: t.details,
      }));

      // Submit scorecard
      const submitRes = await fetch('/api/admin/test-scorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          targetUrl: 'https://musclemap.me',
          environment: 'production',
          results,
          duration: data.summary?.duration || 0,
        }),
      });

      if (submitRes.ok) {
        const scorecardData = await submitRes.json();
        setScorecard(scorecardData.data);
      }

      // Refresh history
      await fetchScorecard();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [getAuthHeader, fetchScorecard]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  // Check admin access
  if (!user?.is_admin && !user?.is_owner && !user?.roles?.includes('admin')) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin access required to view test scorecard.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-violet-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const categoryConfig = {
    core: { icon: Target, color: '#8b5cf6' },
    edge: { icon: FileWarning, color: '#06b6d4' },
    security: { icon: Shield, color: '#ef4444' },
    performance: { icon: Zap, color: '#f59e0b' },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/empire"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6 text-violet-400" />
                  Test Scorecard
                </h1>
                <p className="text-sm text-gray-500">API test results and health</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={fetchScorecard}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={runTests}
                disabled={running}
                leftIcon={running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              >
                {running ? 'Running...' : 'Run Tests'}
              </GlassButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <GlassSurface className="p-4 border border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </GlassSurface>
        )}

        {loading && !scorecard ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : !scorecard ? (
          <GlassSurface className="p-12 text-center">
            <Target className="w-16 h-16 text-violet-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Test Results Yet</h2>
            <p className="text-gray-400 mb-6">
              Run the API test suite to generate your first scorecard.
            </p>
            <GlassButton
              variant="primary"
              onClick={runTests}
              disabled={running}
              leftIcon={running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            >
              {running ? 'Running Tests...' : 'Run Test Suite'}
            </GlassButton>
          </GlassSurface>
        ) : (
          <>
            {/* Score Overview */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Score Ring */}
              <GlassSurface className="p-6 flex flex-col items-center justify-center">
                <ScoreRing score={scorecard.score} grade={scorecard.grade} />
                <div className="mt-4 text-center">
                  <div className="text-lg font-semibold">Overall Score</div>
                  <div className="text-sm text-gray-500">
                    {scorecard.passed}/{scorecard.totalTests} tests passing
                  </div>
                </div>
              </GlassSurface>

              {/* Quick Stats */}
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassSurface className="p-4">
                  <div className="text-sm text-gray-400">Total Tests</div>
                  <div className="text-2xl font-bold text-white">
                    {scorecard.totalTests}
                  </div>
                </GlassSurface>
                <GlassSurface className="p-4">
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    Passed
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {scorecard.passed}
                  </div>
                </GlassSurface>
                <GlassSurface className="p-4">
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-400" />
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {scorecard.failed}
                  </div>
                </GlassSurface>
                <GlassSurface className="p-4">
                  <div className="text-sm text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    Duration
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {(scorecard.duration / 1000).toFixed(1)}s
                  </div>
                </GlassSurface>

                {/* Environment Info */}
                <div className="col-span-2 md:col-span-4">
                  <GlassSurface className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Target</div>
                        <div className="text-sm font-mono text-violet-400">
                          {scorecard.targetUrl}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Environment</div>
                        <div className="text-sm capitalize">{scorecard.environment}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Last run: {new Date(scorecard.createdAt).toLocaleString()}
                    </div>
                  </GlassSurface>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-400" />
                Category Breakdown
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(scorecard.categories || {}).map(([name, data]) => {
                  const config = categoryConfig[name] || { icon: Target, color: '#8b5cf6' };
                  return (
                    <CategoryCard
                      key={name}
                      name={name}
                      icon={config.icon}
                      color={config.color}
                      passed={data.passed}
                      failed={data.failed}
                      score={data.score}
                    />
                  );
                })}
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Failed Tests */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Failed Tests ({scorecard.failedTests?.length || 0})
                </h2>
                <FailedTestList tests={scorecard.failedTests} />
              </div>

              {/* Recommendations */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  Recommendations
                </h2>
                <GlassSurface className="p-4">
                  {scorecard.recommendations?.length > 0 ? (
                    <ul className="space-y-3">
                      {scorecard.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-yellow-400">
                              {index + 1}
                            </span>
                          </div>
                          <span className="text-sm text-gray-300">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <div className="text-green-400 font-medium">
                        All Systems Go!
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        No recommendations at this time
                      </div>
                    </div>
                  )}
                </GlassSurface>
              </div>
            </div>

            {/* Historical Trend */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Score Trend
              </h2>
              <GlassSurface className="p-4">
                <ScoreTrendChart data={history} />
              </GlassSurface>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
