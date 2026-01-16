/**
 * Stats Page
 *
 * Character stats display with radar chart visualization and leaderboards.
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';
import { InsightCard, WeeklyHeatmap, MiniChart } from '../components/analytics';

// Lazy load heavy D3 chart component
const RadarChartD3 = lazy(() =>
  import('../components/d3').then(m => ({ default: m.RadarChartD3 }))
);

// Lazy load MuscleExplorer for 3D-like muscle visualization
const MuscleExplorer = lazy(() =>
  import('../components/muscle-explorer').then(m => ({ default: m.default || m.MuscleExplorer }))
);


// ============================================
// ICONS
// ============================================
const Icons = {
  Refresh: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Globe: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  MapPin: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  TrendingUp: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// ============================================
// STAT METADATA
// ============================================
const STAT_META = {
  strength: { name: 'Strength', abbr: 'STR', color: '#FF3366', description: 'Raw lifting power' },
  constitution: { name: 'Constitution', abbr: 'CON', color: '#00CC66', description: 'Recovery & resilience' },
  dexterity: { name: 'Dexterity', abbr: 'DEX', color: '#FFB800', description: 'Movement skill' },
  power: { name: 'Power', abbr: 'PWR', color: '#FF6B00', description: 'Explosive force' },
  endurance: { name: 'Endurance', abbr: 'END', color: '#0066FF', description: 'Stamina' },
  vitality: { name: 'Vitality', abbr: 'VIT', color: '#9333EA', description: 'Overall health' },
};

const STAT_ORDER = ['strength', 'constitution', 'dexterity', 'power', 'endurance', 'vitality'];

// ============================================
// RADAR CHART COMPONENT
// ============================================
function RadarChart({ stats, size = 300 }) { // eslint-disable-line no-unused-vars
  const center = size / 2;
  const maxRadius = size * 0.32; // Reduced to leave room for labels
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Calculate max stat for normalization
  const maxStat = useMemo(() => {
    return Math.max(
      ...STAT_ORDER.map((key) => stats[key] || 0),
      100 // Minimum scale
    );
  }, [stats]);

  // Calculate polygon points
  const points = useMemo(() => {
    const pts = [];
    const angleStep = (2 * Math.PI) / 6;

    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const statKey = STAT_ORDER[i];
      const value = (stats[statKey] || 0) / maxStat;
      const radius = value * maxRadius;

      pts.push({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    }

    return pts;
  }, [stats, maxStat, center, maxRadius]);

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Axis endpoints and labels
  const axisPoints = useMemo(() => {
    const pts = [];
    const angleStep = (2 * Math.PI) / 6;

    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i - Math.PI / 2;
      pts.push({
        x1: center,
        y1: center,
        x2: center + maxRadius * Math.cos(angle),
        y2: center + maxRadius * Math.sin(angle),
        labelX: center + (maxRadius + 35) * Math.cos(angle),
        labelY: center + (maxRadius + 35) * Math.sin(angle),
        key: STAT_ORDER[i],
      });
    }

    return pts;
  }, [center, maxRadius]);

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background level rings */}
      {levels.map((level) => {
        const pts = [];
        const angleStep = (2 * Math.PI) / 6;
        for (let i = 0; i < 6; i++) {
          const angle = angleStep * i - Math.PI / 2;
          const radius = level * maxRadius;
          pts.push(`${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`);
        }
        return (
          <polygon
            key={level}
            points={pts.join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        );
      })}

      {/* Axis lines */}
      {axisPoints.map(({ x1, y1, x2, y2, key }) => (
        <line
          key={key}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* Stats polygon */}
      <motion.polygon
        points={polygonPoints}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3B82F6"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Points on vertices */}
      {points.map((point, i) => (
        <motion.circle
          key={STAT_ORDER[i]}
          cx={point.x}
          cy={point.y}
          r={5}
          fill={STAT_META[STAT_ORDER[i]].color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
        />
      ))}

      {/* Labels */}
      {axisPoints.map(({ labelX, labelY, key }) => (
        <text
          key={`label-${key}`}
          x={labelX}
          y={labelY}
          fill={STAT_META[key].color}
          fontSize={12}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {STAT_META[key].abbr}
        </text>
      ))}
    </svg>
  );
}

// ============================================
// STAT BAR COMPONENT
// ============================================
function StatBar({ statKey, value, maxValue }) {
  const meta = STAT_META[statKey];
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <motion.div
      className="space-y-1"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: STAT_ORDER.indexOf(statKey) * 0.1 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span className="font-semibold text-white/90">{meta.abbr}</span>
          <span className="text-white/50 text-sm">{meta.name}</span>
        </div>
        <span className="font-bold" style={{ color: meta.color }}>
          {value.toFixed(0)}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: meta.color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: STAT_ORDER.indexOf(statKey) * 0.1 }}
        />
      </div>
    </motion.div>
  );
}

// ============================================
// RANKING DISPLAY
// ============================================
function RankingDisplay({ statKey, rankings }) {
  const meta = STAT_META[statKey];

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold" style={{ color: meta.color }}>
          {meta.abbr}
        </span>
        <span className="text-white/50 text-sm">Rankings</span>
      </div>

      <div className="flex justify-around">
        {rankings.global && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-white/50 text-xs mb-1">
              <Icons.Globe className="w-3 h-3" />
              <span>Global</span>
            </div>
            <div className="font-bold text-lg text-white">#{rankings.global.rank}</div>
            <div className="text-white/40 text-xs">Top {rankings.global.percentile.toFixed(0)}%</div>
          </div>
        )}

        {rankings.country && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-white/50 text-xs mb-1">
              <Icons.MapPin className="w-3 h-3" />
              <span>Country</span>
            </div>
            <div className="font-bold text-lg text-white">#{rankings.country.rank}</div>
            <div className="text-white/40 text-xs">Top {rankings.country.percentile.toFixed(0)}%</div>
          </div>
        )}

        {rankings.state && (
          <div className="text-center">
            <div className="text-white/50 text-xs mb-1">State</div>
            <div className="font-bold text-lg text-white">#{rankings.state.rank}</div>
            <div className="text-white/40 text-xs">Top {rankings.state.percentile.toFixed(0)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// LEADERBOARD COMPONENT
// ============================================
function Leaderboard({ userLocation }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('global');
  const [statType, setStatType] = useState('vitality');

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const options = {
        stat: statType,
        scope: scope,
        limit: 20,
      };

      if (scope === 'country' && userLocation?.country) {
        options.scopeValue = userLocation.country;
      } else if (scope === 'state' && userLocation?.state) {
        options.scopeValue = userLocation.state;
      }

      const response = await api.characterStats.leaderboard(options);
      setLeaderboard(response.data || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [scope, statType, userLocation]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Icons.Trophy className="w-5 h-5 text-yellow-400" />
          Leaderboard
        </h3>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={statType}
          onChange={(e) => setStatType(e.target.value)}
          className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm border border-white/10 focus:border-violet-500 outline-none"
        >
          {STAT_ORDER.map((key) => (
            <option key={key} value={key} className="bg-gray-900">
              {STAT_META[key].name}
            </option>
          ))}
        </select>

        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm border border-white/10 focus:border-violet-500 outline-none"
        >
          <option value="global" className="bg-gray-900">Global</option>
          {userLocation?.country && (
            <option value="country" className="bg-gray-900">Country</option>
          )}
          {userLocation?.state && (
            <option value="state" className="bg-gray-900">State</option>
          )}
        </select>
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 text-center font-bold ${
                    entry.rank <= 3 ? 'text-yellow-400' : 'text-white/50'
                  }`}
                >
                  #{entry.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {entry.username?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium">{entry.username}</div>
                  {entry.country && (
                    <div className="text-white/40 text-xs">{entry.country}</div>
                  )}
                </div>
              </div>
              <span className="font-bold" style={{ color: STAT_META[statType].color }}>
                {entry.statValue.toFixed(0)}
              </span>
            </motion.div>
          ))}

          {leaderboard.length === 0 && (
            <div className="text-center text-white/50 py-8">
              No entries yet. Start working out to join the leaderboard!
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ============================================
// MAIN STATS PAGE
// ============================================
export default function Stats() {
  const { user: _user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);

  // Muscle Explorer state
  const [muscleActivations, setMuscleActivations] = useState({});
  const [selectedMuscle, setSelectedMuscle] = useState(searchParams.get('muscle') || null);
  const [muscleHistory, _setMuscleHistory] = useState({});

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, profileRes] = await Promise.all([
        api.characterStats.me(),
        api.characterStats.extendedProfile(),
      ]);

      setStats(statsRes.data.stats);
      setRankings(statsRes.data.rankings);
      setProfile(profileRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load muscle activation data
  const loadMuscleData = useCallback(async () => {
    try {
      const response = await fetch('/api/muscles/activations');
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        // Convert array to object map for MuscleExplorer
        const activationMap = {};
        data.data.forEach(item => {
          activationMap[item.muscleId] = item.activation;
        });
        setMuscleActivations(activationMap);
      }
    } catch (_err) {
      // Use mock data if API fails
      setMuscleActivations({
        'pectoralis-major': 65,
        'deltoid-anterior': 45,
        'biceps-brachii': 30,
        'rectus-abdominis': 20,
        'quadriceps': 50,
        'latissimus-dorsi': 35,
        'trapezius': 40,
        'gluteus-maximus': 55,
      });
    }
  }, []);

  // Handle muscle selection - navigates to exercises filtered by muscle
  const handleFindExercises = useCallback((muscleId) => {
    navigate(`/exercises?muscle=${muscleId}`);
  }, [navigate]);

  // Handle muscle click to filter stats by that muscle
  const handleMuscleSelect = useCallback((muscleId) => {
    setSelectedMuscle(muscleId);
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (muscleId) {
      params.set('muscle', muscleId);
    } else {
      params.delete('muscle');
    }
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate, searchParams]);

  useEffect(() => {
    loadData();
    loadMuscleData();
  }, [loadData, loadMuscleData]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const response = await api.characterStats.recalculate();
      setStats(response.data.stats);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to recalculate stats');
    } finally {
      setRecalculating(false);
    }
  };

  const maxStat = useMemo(() => {
    if (!stats) return 100;
    return Math.max(...STAT_ORDER.map((key) => stats[key] || 0), 100);
  }, [stats]);

  if (loading) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading stats...</p>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Stats</h1>
            <p className="text-white/60 text-sm">Track your fitness progress</p>
          </div>
          <GlassButton
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2"
          >
            <Icons.Refresh className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recalculate</span>
          </GlassButton>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Weekly Activity & Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Weekly Heatmap */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">This Week</h3>
            <WeeklyHeatmap
              data={profile?.weeklyActivity || [2, 1, 3, 0, 2, 1, 0]}
              colorScheme="teal"
            />
          </GlassCard>

          {/* Volume Chart */}
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Volume Trend</h3>
            <MiniChart
              data={profile?.volumeTrend || [
                { label: 'M', value: 4500 },
                { label: 'T', value: 0 },
                { label: 'W', value: 6200 },
                { label: 'T', value: 5800 },
                { label: 'F', value: 7100 },
                { label: 'S', value: 8500 },
                { label: 'S', value: 0 },
              ]}
              colorScheme="purple"
              height={60}
            />
          </GlassCard>

          {/* Insight Card */}
          <InsightCard
            type={stats?.strength > (profile?.previousStrength || 0) ? 'positive' : 'info'}
            title={stats?.strength > (profile?.previousStrength || 0) ? 'Getting Stronger!' : 'Keep Pushing'}
            message={stats?.strength > (profile?.previousStrength || 0)
              ? `Your strength increased ${Math.round(((stats?.strength || 0) / (profile?.previousStrength || 1) - 1) * 100)}% this week`
              : 'Consistency is key - keep showing up!'
            }
            icon={stats?.strength > (profile?.previousStrength || 0) ? '📈' : '💪'}
          />
        </div>

        {/* Muscle Explorer Section - Full Width */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.User className="w-5 h-5 text-violet-400" />
                Muscle Activation Explorer
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Click on muscles to see activation history and find exercises
              </p>
            </div>
            {selectedMuscle && (
              <GlassButton
                onClick={() => handleMuscleSelect(null)}
                className="text-sm"
              >
                Clear Selection
              </GlassButton>
            )}
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white/50 text-sm">Loading muscle explorer...</p>
                </div>
              </div>
            }
          >
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Front and Back Views */}
              <MuscleExplorer
                view="both"
                activations={muscleActivations}
                selectedMuscle={selectedMuscle}
                onMuscleSelect={handleMuscleSelect}
                interactive
                showLabels
                size="md"
                colorScheme="heat"
                showControls
                showLegend
                activationHistory={muscleHistory}
                onFindExercises={handleFindExercises}
                onViewHistory={(muscleId) => {
                  // Could navigate to a dedicated muscle history page
                  console.log('View history for', muscleId);
                }}
                onExerciseClick={(exercise) => {
                  navigate(`/exercises?search=${encodeURIComponent(exercise)}`);
                }}
                className="flex-1"
              />
            </div>
          </Suspense>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* D3 Radar Chart - Hyper-realistic with animations */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Stat Overview</h2>
            {stats && (
              <RadarChartD3
                axes={STAT_ORDER.map((key) => ({
                  key,
                  label: STAT_META[key].abbr,
                  color: STAT_META[key].color,
                }))}
                series={[
                  {
                    name: 'Your Stats',
                    data: stats,
                    color: '#8b5cf6',
                    fillOpacity: 0.4,
                  },
                ]}
                height={320}
                showValues
                animated
                pulsing
                interactive
              />
            )}
          </GlassCard>

          {/* Stat Bars */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Individual Stats</h2>
            <div className="space-y-4">
              {stats && STAT_ORDER.map((key) => (
                <StatBar
                  key={key}
                  statKey={key}
                  value={stats[key] || 0}
                  maxValue={maxStat * 1.2}
                />
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Rankings */}
        {rankings && (
          <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.TrendingUp className="w-5 h-5 text-blue-400" />
                Your Rankings
              </h2>
            </div>

            {/* Vitality (Overall) prominent */}
            {rankings.vitality && (
              <div className="mb-4">
                <RankingDisplay statKey="vitality" rankings={rankings.vitality} />
              </div>
            )}

            {/* Other stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {['strength', 'constitution', 'dexterity', 'power', 'endurance'].map((key) =>
                rankings[key] && (
                  <RankingDisplay key={key} statKey={key} rankings={rankings[key]} />
                )
              )}
            </div>
          </GlassCard>
        )}

        {/* Leaderboard */}
        <Leaderboard userLocation={profile} />

        {/* Location Info */}
        {profile && (profile.city || profile.country) && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-2">Your Location</h3>
            <div className="flex items-center gap-2 text-white/60">
              <Icons.MapPin className="w-4 h-4" />
              <span>
                {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
              </span>
            </div>
            <p className="text-white/40 text-sm mt-2">
              Update your location in settings for local rankings
            </p>
          </GlassCard>
        )}
      </div>
    </GlassSurface>
  );
}
