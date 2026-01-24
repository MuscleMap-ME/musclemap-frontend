/**
 * Stats Page
 *
 * Character stats display with radar chart visualization and leaderboards.
 * Fully converted to GraphQL.
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';
import { InsightCard, WeeklyHeatmap, MiniChart } from '../components/analytics';
import { MuscleViewer, MuscleHeatmap } from '../components/muscle-viewer';
import { RPGStatBar } from '../components/stats';
import type { MuscleActivation } from '../components/muscle-viewer/types';
import {
  MY_MUSCLE_ACTIVATIONS_QUERY,
  MY_STATS_WITH_RANKINGS_QUERY,
  EXTENDED_PROFILE_QUERY,
  STAT_LEADERBOARD_QUERY,
} from '../graphql/queries';
import { RECALCULATE_STATS_MUTATION } from '../graphql/mutations';

// Lazy load heavy D3 chart component
const RadarChartD3 = lazy(() =>
  import('../components/d3').then(m => ({ default: m.RadarChartD3 }))
);

// Lazy load MuscleExplorer for 3D-like muscle visualization (fallback)
const MuscleExplorer = lazy(() =>
  import('../components/muscle-explorer').then(m => ({ default: m.default || m.MuscleExplorer }))
);

// ============================================
// TYPES
// ============================================
interface CharacterStats {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  strength: number;
  endurance: number;
  agility: number;
  flexibility: number;
  balance: number;
  mentalFocus: number;
  totalWorkouts: number;
  totalExercises: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutAt: string | null;
}

interface StatRanking {
  rank: number;
  total: number;
  percentile: number;
}

interface StatRankingsByScope {
  global: StatRanking;
  country?: StatRanking;
  state?: StatRanking;
  city?: StatRanking;
}

interface StatsWithRankingsData {
  myStatsWithRankings: {
    stats: CharacterStats;
    rankings: Record<string, StatRankingsByScope>;
  } | null;
}

interface VolumeTrendEntry {
  label: string;
  value: number;
}

interface ExtendedProfileData {
  extendedProfile: {
    height: number | null;
    weight: number | null;
    age: number | null;
    gender: string | null;
    fitnessLevel: string | null;
    goals: string[] | null;
    preferredUnits: string | null;
    city: string | null;
    county: string | null;
    state: string | null;
    country: string | null;
    countryCode: string | null;
    leaderboardOptIn: boolean;
    profileVisibility: string;
    weeklyActivity: number[];
    volumeTrend: VolumeTrendEntry[];
    previousStrength: number;
  } | null;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  statValue: number;
  rank: number;
  gender: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
}

interface StatLeaderboardData {
  statLeaderboard: {
    entries: LeaderboardEntry[];
    total: number;
  };
}

interface MuscleActivationData {
  myMuscleActivations: Array<{ muscleId: string; activation: number }>;
}


// ============================================
// ICONS
// ============================================
const Icons = {
  Refresh: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Globe: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  MapPin: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  TrendingUp: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// ============================================
// STAT METADATA
// ============================================
const STAT_META: Record<string, { name: string; abbr: string; color: string; description: string }> = {
  strength: { name: 'Strength', abbr: 'STR', color: '#FF3366', description: 'Raw lifting power' },
  constitution: { name: 'Constitution', abbr: 'CON', color: '#00CC66', description: 'Recovery & resilience' },
  dexterity: { name: 'Dexterity', abbr: 'DEX', color: '#FFB800', description: 'Movement skill' },
  power: { name: 'Power', abbr: 'PWR', color: '#FF6B00', description: 'Explosive force' },
  endurance: { name: 'Endurance', abbr: 'END', color: '#0066FF', description: 'Stamina' },
  vitality: { name: 'Vitality', abbr: 'VIT', color: '#9333EA', description: 'Overall health' },
};

const STAT_ORDER = ['strength', 'constitution', 'dexterity', 'power', 'endurance', 'vitality'];

// ============================================
// RADAR CHART COMPONENT (SVG version - kept for reference, D3 version in use)
// ============================================
/* eslint-disable @typescript-eslint/no-unused-vars */
interface RadarChartProps {
  stats: Record<string, number>;
  size?: number;
}

function RadarChart({ stats, size = 300 }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = size * 0.32;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const maxStat = useMemo(() => {
    return Math.max(
      ...STAT_ORDER.map((key) => stats[key] || 0),
      100
    );
  }, [stats]);

  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
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

  const axisPoints = useMemo(() => {
    const pts: { x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number; key: string }[] = [];
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
      {levels.map((level) => {
        const pts: string[] = [];
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

      <motion.polygon
        points={polygonPoints}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3B82F6"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      />

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
/* eslint-enable @typescript-eslint/no-unused-vars */


// ============================================
// RANKING DISPLAY
// ============================================
interface RankingDisplayProps {
  statKey: string;
  rankings: StatRankingsByScope;
}

function RankingDisplay({ statKey, rankings }: RankingDisplayProps) {
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
interface LeaderboardProps {
  userLocation: { country?: string | null; state?: string | null } | null;
}

function Leaderboard({ userLocation }: LeaderboardProps) {
  const [scope, setScope] = useState('global');
  const [statType, setStatType] = useState('vitality');

  const { data: leaderboardData, loading } = useQuery<StatLeaderboardData>(STAT_LEADERBOARD_QUERY, {
    variables: {
      stat: statType,
      scope: scope,
      scopeValue: scope === 'country' ? userLocation?.country : scope === 'state' ? userLocation?.state : undefined,
      limit: 20,
    },
    fetchPolicy: 'cache-and-network',
  });

  const leaderboard = useMemo(() => leaderboardData?.statLeaderboard?.entries || [], [leaderboardData]);

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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // Muscle Explorer state
  const [muscleActivations, setMuscleActivations] = useState<Record<string, number>>({});
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(searchParams.get('muscle') || null);
  const [muscleHistory] = useState({});

  // Muscle ID mapping for MuscleViewer
  const MUSCLE_ID_MAP: Record<string, string> = {
    'pectoralis-major': 'chest',
    'deltoid-anterior': 'front_delts',
    'deltoid-lateral': 'side_delts',
    'deltoid-posterior': 'rear_delts',
    'biceps-brachii': 'biceps',
    'triceps-brachii': 'triceps',
    'rectus-abdominis': 'abs',
    'obliques': 'obliques',
    'quadriceps': 'quads',
    'hamstrings': 'hamstrings',
    'gluteus-maximus': 'glutes',
    'latissimus-dorsi': 'lats',
    'trapezius': 'traps',
    'rhomboids': 'upper_back',
    'erector-spinae': 'lower_back',
    'gastrocnemius': 'calves',
    'forearm-flexors': 'forearms',
  };

  // GraphQL Queries
  const { data: statsData, loading: loadingStats, refetch: refetchStats } = useQuery<StatsWithRankingsData>(MY_STATS_WITH_RANKINGS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const { data: profileData, loading: loadingProfile } = useQuery<ExtendedProfileData>(EXTENDED_PROFILE_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const { data: muscleData } = useQuery<MuscleActivationData>(MY_MUSCLE_ACTIVATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const [recalculateStats, { loading: recalculating }] = useMutation(RECALCULATE_STATS_MUTATION, {
    onCompleted: () => {
      refetchStats();
    },
    onError: (err) => setError(err.message),
  });

  // Extract data from queries
  const stats = useMemo(() => {
    const s = statsData?.myStatsWithRankings?.stats;
    if (!s) return null;
    return {
      strength: s.strength,
      constitution: s.flexibility,
      dexterity: s.agility,
      power: s.balance,
      endurance: s.endurance,
      vitality: s.mentalFocus,
    };
  }, [statsData]);

  const rankings = useMemo(() => statsData?.myStatsWithRankings?.rankings || null, [statsData]);
  const profile = useMemo(() => profileData?.extendedProfile || null, [profileData]);

  // Convert muscle activations to MuscleActivation array format for MuscleViewer
  const muscleViewerActivations = useMemo((): MuscleActivation[] => {
    return Object.entries(muscleActivations).map(([muscleId, activation]) => {
      const mappedId = MUSCLE_ID_MAP[muscleId] || muscleId.replace(/-/g, '_');
      return {
        id: mappedId,
        intensity: activation / 100,
        isPrimary: activation > 50,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscleActivations]);

  // Convert GraphQL data to object map for MuscleExplorer
  useEffect(() => {
    if (muscleData?.myMuscleActivations && muscleData.myMuscleActivations.length > 0) {
      const activationMap: Record<string, number> = {};
      muscleData.myMuscleActivations.forEach(item => {
        activationMap[item.muscleId] = item.activation;
      });
      setMuscleActivations(activationMap);
    } else if (muscleData && muscleData.myMuscleActivations?.length === 0) {
      // Use mock data if no data available
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
  }, [muscleData]);

  // Handle muscle selection - navigates to exercises filtered by muscle
  const handleFindExercises = useCallback((muscleId: string) => {
    navigate(`/exercises?muscle=${muscleId}`);
  }, [navigate]);

  // Handle muscle click to filter stats by that muscle
  const handleMuscleSelect = useCallback((muscleId: string | null) => {
    setSelectedMuscle(muscleId);
    const params = new URLSearchParams(searchParams);
    if (muscleId) {
      params.set('muscle', muscleId);
    } else {
      params.delete('muscle');
    }
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate, searchParams]);

  const handleRecalculate = async () => {
    try {
      await recalculateStats();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate stats');
    }
  };

  const maxStat = useMemo(() => {
    if (!stats) return 100;
    return Math.max(...STAT_ORDER.map((key) => stats[key as keyof typeof stats] || 0), 100);
  }, [stats]);

  const loading = loadingStats || loadingProfile;

  if (loading && !stats) {
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
            type={stats?.strength && profile?.previousStrength && stats.strength > profile.previousStrength ? 'positive' : 'info'}
            title={stats?.strength && profile?.previousStrength && stats.strength > profile.previousStrength ? 'Getting Stronger!' : 'Keep Pushing'}
            message={stats?.strength && profile?.previousStrength && stats.strength > profile.previousStrength
              ? `Your strength increased ${Math.round(((stats.strength) / (profile.previousStrength || 1) - 1) * 100)}% this week`
              : 'Consistency is key - keep showing up!'
            }
            icon={stats?.strength && profile?.previousStrength && stats.strength > profile.previousStrength ? '📈' : '💪'}
          />
        </div>

        {/* 3D Muscle Visualization - New */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.User className="w-5 h-5 text-violet-400" />
                Muscle Development
              </h2>
              <p className="text-white/60 text-sm mt-1">
                3D visualization of your training distribution
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive 3D Model */}
            <div className="flex flex-col items-center">
              <MuscleViewer
                muscles={muscleViewerActivations}
                mode="card"
                interactive={true}
                showLabels={true}
                autoRotate={true}
                initialView="front"
                onMuscleClick={(muscleId) => handleMuscleSelect(muscleId)}
                className="w-full"
                style={{ height: 360 }}
              />
              <p className="text-white/40 text-xs mt-2 text-center">
                Click muscles to see related exercises
              </p>
            </div>

            {/* Muscle Heatmap */}
            <div>
              <MuscleHeatmap
                muscles={muscleViewerActivations}
                timeRange="All Time"
                showComparison={false}
                view="both"
                className="w-full"
              />
            </div>
          </div>
        </GlassCard>

        {/* Muscle Explorer Section - Full Width (Fallback 2D) */}
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
                onViewHistory={() => {
                  // Could navigate to a dedicated muscle history page
                }}
                onExerciseClick={(exercise: string) => {
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
              <Suspense fallback={<div className="h-80 flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
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
              </Suspense>
            )}
          </GlassCard>

          {/* RPG-Style Stat Bars */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              Character Stats
            </h2>
            <div className="space-y-4">
              {stats && STAT_ORDER.map((key, index) => (
                <RPGStatBar
                  key={key}
                  statKey={key}
                  label={STAT_META[key].name}
                  abbreviation={STAT_META[key].abbr}
                  value={stats[key as keyof typeof stats] || 0}
                  maxValue={maxStat * 1.2}
                  color={STAT_META[key].color}
                  description={STAT_META[key].description}
                  delay={index * 0.08}
                  showSegments={true}
                  segmentCount={12}
                  size="md"
                  variant="default"
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
