/**
 * Personal Records Page
 *
 * Track and visualize personal records (PRs) including:
 * - 1RM estimates for all exercises
 * - PR history and progression charts
 * - Exercise-specific records
 * - Overall strength progression
 */

import React, { useState, useCallback, useMemo, lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@apollo/client/react';
import { MY_PERSONAL_RECORDS_QUERY } from '../graphql';
import { useAuth } from '../store';
import { calculate1RM } from '../store/workoutSessionStore';
import {
  GlassSurface,
  GlassNav,
  GlassMobileNav,
  MeshBackground,
  AnimatedLogo,
} from '../components/glass';

// Lazy load charts
const _LineChartD3 = lazy(() =>
  import('../components/d3').then(m => ({ default: m.LineChartD3 }))
);

// ============================================
// ICONS
// ============================================
const Icons = {
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  TrendingUp: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Weight: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M3 12a9 9 0 0118 0M3 12a9 9 0 0018 0M12 3v18" />
    </svg>
  ),
  Target: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Search: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  ChevronDown: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

// ============================================
// 1RM CALCULATOR CARD
// ============================================
function OneRMCalculator() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [result, setResult] = useState(null);

  const calculateResult = useCallback(() => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (w > 0 && r > 0 && r <= 30) {
      const estimated1RM = calculate1RM(w, r);
      const percentages = [
        { pct: 100, reps: 1 },
        { pct: 95, reps: 2 },
        { pct: 90, reps: 4 },
        { pct: 85, reps: 6 },
        { pct: 80, reps: 8 },
        { pct: 75, reps: 10 },
        { pct: 70, reps: 12 },
        { pct: 65, reps: 15 },
      ];
      setResult({
        estimated1RM,
        percentages: percentages.map(p => ({
          ...p,
          weight: Math.round(estimated1RM * (p.pct / 100)),
        })),
      });
    } else {
      setResult(null);
    }
  }, [weight, reps]);

  useEffect(() => {
    calculateResult();
  }, [calculateResult]);

  return (
    <GlassSurface className="p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Icons.Target className="w-5 h-5 text-blue-400" />
        1RM Calculator
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-white/60 mb-2">Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Enter weight"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">Reps (1-30)</label>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Enter reps"
            min="1"
            max="30"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
          />
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="text-center py-4 border-t border-white/10">
              <p className="text-sm text-white/60 mb-1">Estimated 1RM</p>
              <p className="text-4xl font-black text-blue-400">{result.estimated1RM} lbs</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {result.percentages.map((p) => (
                <div key={p.pct} className="text-center p-2 rounded-lg bg-white/5">
                  <p className="text-xs text-white/50">{p.pct}%</p>
                  <p className="text-sm font-semibold text-white">{p.weight}</p>
                  <p className="text-xs text-white/40">{p.reps} rep{p.reps !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassSurface>
  );
}

// ============================================
// PR RECORD CARD
// ============================================
function PRRecordCard({ record }) {
  const [expanded, setExpanded] = useState(false);

  const recordTypeLabel = {
    weight: 'Heaviest Weight',
    volume: 'Highest Volume',
    reps: 'Most Reps',
    e1rm: 'Best Estimated 1RM',
  };

  const recordTypeIcon = {
    weight: <Icons.Weight className="w-4 h-4" />,
    volume: <Icons.TrendingUp className="w-4 h-4" />,
    reps: <Icons.Target className="w-4 h-4" />,
    e1rm: <Icons.Trophy className="w-4 h-4" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <GlassSurface
        className="p-4 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
              {recordTypeIcon[record.recordType] || <Icons.Trophy className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-semibold text-white">{record.exerciseName}</h4>
              <p className="text-sm text-white/60">{recordTypeLabel[record.recordType] || record.recordType}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {record.value} {record.unit || 'lbs'}
            </p>
            <p className="text-xs text-white/50">
              {new Date(record.achievedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              {record.details && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  {record.details.weight && (
                    <div>
                      <p className="text-sm text-white/50">Weight</p>
                      <p className="font-semibold text-white">{record.details.weight} lbs</p>
                    </div>
                  )}
                  {record.details.reps && (
                    <div>
                      <p className="text-sm text-white/50">Reps</p>
                      <p className="font-semibold text-white">{record.details.reps}</p>
                    </div>
                  )}
                  {record.details.estimated1RM && (
                    <div>
                      <p className="text-sm text-white/50">Est. 1RM</p>
                      <p className="font-semibold text-white">{record.details.estimated1RM} lbs</p>
                    </div>
                  )}
                </div>
              )}
              {record.previousValue && (
                <p className="text-sm text-green-400 mt-2 text-center">
                  +{record.value - record.previousValue} improvement from previous PR
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassSurface>
    </motion.div>
  );
}

// ============================================
// TYPES
// ============================================
interface PersonalRecordDetails {
  weight?: number;
  reps?: number;
  estimated1RM?: number;
}

interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName?: string;
  recordType: string;
  value: number;
  unit?: string;
  reps?: number;
  bodyweight?: number;
  workoutId?: string;
  setNumber?: number;
  achievedAt: string;
  previousValue?: number;
  details?: PersonalRecordDetails;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function PersonalRecords() {
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all', 'weight', 'volume', 'e1rm'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'value', 'name'

  // GraphQL query for personal records
  const { data: recordsData, loading } = useQuery(MY_PERSONAL_RECORDS_QUERY, {
    variables: { limit: 100 },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  // Memoize records data
  const records: PersonalRecord[] = useMemo(() => {
    return recordsData?.myPersonalRecords || [];
  }, [recordsData]);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    // Filter by type
    if (filter !== 'all') {
      result = result.filter(r => r.recordType === filter);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(r =>
        r.exerciseName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));
    } else if (sortBy === 'value') {
      result.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.exerciseName || '').localeCompare(b.exerciseName || ''));
    }

    return result;
  }, [records, filter, search, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    const totalPRs = records.length;
    const thisMonth = records.filter(r => {
      const date = new Date(r.achievedAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const best1RMs = records.filter(r => r.recordType === 'e1rm');
    const heaviest = best1RMs.length > 0 ? Math.max(...best1RMs.map(r => r.value)) : 0;
    return { totalPRs, thisMonth, heaviest };
  }, [records]);

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <AnimatedLogo size={32} breathing />
            <span className="font-bold text-lg text-white hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <div className="pt-20 px-4 pb-24 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Icons.Trophy className="w-8 h-8 text-yellow-400" />
            Personal Records
          </h1>
          <p className="text-white/60 mt-1">
            Track your PRs and estimated 1RMs across all exercises
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <GlassSurface className="p-4 text-center">
            <p className="text-3xl font-bold text-white">{stats.totalPRs}</p>
            <p className="text-sm text-white/60">Total PRs</p>
          </GlassSurface>
          <GlassSurface className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{stats.thisMonth}</p>
            <p className="text-sm text-white/60">This Month</p>
          </GlassSurface>
          <GlassSurface className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">{stats.heaviest} lbs</p>
            <p className="text-sm text-white/60">Highest 1RM</p>
          </GlassSurface>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Calculator */}
          <div className="lg:col-span-1">
            <OneRMCalculator />
          </div>

          {/* Right Column: Records List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search exercises..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-400 outline-none"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-400 outline-none"
              >
                <option value="all">All Types</option>
                <option value="e1rm">Estimated 1RM</option>
                <option value="weight">Max Weight</option>
                <option value="volume">Volume</option>
                <option value="reps">Max Reps</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-400 outline-none"
              >
                <option value="date">Most Recent</option>
                <option value="value">Highest Value</option>
                <option value="name">Exercise Name</option>
              </select>
            </div>

            {/* Records List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <GlassSurface key={i} className="h-24 animate-pulse" />
                ))}
              </div>
            ) : filteredRecords.length === 0 ? (
              <GlassSurface className="p-8 text-center">
                <Icons.Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white/60 mb-2">No PRs Found</h3>
                <p className="text-white/40">
                  {search ? 'Try adjusting your search' : 'Complete some workouts to start setting PRs!'}
                </p>
              </GlassSurface>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <PRRecordCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <GlassMobileNav items={[
        { to: '/dashboard', icon: Icons.Target, label: 'Home' },
        { to: '/stats', icon: Icons.TrendingUp, label: 'Stats' },
        { to: '/personal-records', icon: Icons.Trophy, label: 'PRs', active: true },
        { to: '/profile', icon: Icons.Target, label: 'Profile' },
      ]} />
    </div>
  );
}
