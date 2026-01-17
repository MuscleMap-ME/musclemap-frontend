import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../store/authStore";
import { ArchetypeCard } from "../components/archetypes";
import { ChallengeCard, XPProgress } from "../components/gamification";
import { MuscleViewer, MuscleHeatmap } from "../components/muscle-viewer";
import type { MuscleActivation } from "../components/muscle-viewer/types";

// Archetype icons and colors
const ARC = {
  bodybuilder: { i: "💪", c: "from-red-500 to-orange-500", bg: "bg-red-500" },
  powerlifter: { i: "🏋️", c: "from-gray-600 to-gray-800", bg: "bg-gray-600" },
  gymnast: { i: "🤸", c: "from-purple-500 to-pink-500", bg: "bg-purple-500" },
  crossfit: { i: "⚡", c: "from-yellow-500 to-orange-500", bg: "bg-yellow-500" },
  sprinter: { i: "🏃", c: "from-blue-400 to-cyan-400", bg: "bg-blue-400" },
  swimmer: { i: "🏊", c: "from-cyan-500 to-blue-500", bg: "bg-cyan-500" },
  judoka: { i: "🥋", c: "from-red-600 to-red-800", bg: "bg-red-600" },
  boxer: { i: "🥊", c: "from-red-500 to-yellow-500", bg: "bg-red-500" },
  mma: { i: "👊", c: "from-gray-800 to-red-600", bg: "bg-gray-800" },
  wrestler: { i: "🤼", c: "from-blue-600 to-indigo-600", bg: "bg-blue-600" },
  rock_climber: { i: "🧗", c: "from-amber-500 to-orange-600", bg: "bg-amber-500" },
  marathon: { i: "🏅", c: "from-amber-400 to-yellow-500", bg: "bg-amber-400" },
  cyclist: { i: "🚴", c: "from-green-400 to-emerald-500", bg: "bg-green-400" },
  functional: { i: "🔧", c: "from-green-500 to-teal-500", bg: "bg-green-500" },
  default: { i: "🎯", c: "from-purple-500 to-blue-500", bg: "bg-purple-500" }
};
const getA = id => ARC[id] || ARC["default"];

// Archetype hex colors for ArchetypeCard component
const ARCHETYPE_COLORS = {
  bodybuilder: "#ef4444",    // red-500
  powerlifter: "#4b5563",    // gray-600
  gymnast: "#a855f7",        // purple-500
  crossfit: "#eab308",       // yellow-500
  sprinter: "#60a5fa",       // blue-400
  swimmer: "#06b6d4",        // cyan-500
  judoka: "#dc2626",         // red-600
  boxer: "#ef4444",          // red-500
  mma: "#1f2937",            // gray-800
  wrestler: "#2563eb",       // blue-600
  rock_climber: "#f59e0b",   // amber-500
  marathon: "#fbbf24",       // amber-400
  cyclist: "#4ade80",        // green-400
  functional: "#22c55e",     // green-500
  default: "#a855f7",        // purple-500
};
const getArchetypeColor = id => ARCHETYPE_COLORS[id] || ARCHETYPE_COLORS["default"];

// Muscle group colors
const MUSCLE_COLORS = {
  'Chest': 'bg-red-500',
  'Back': 'bg-blue-500',
  'Shoulders': 'bg-orange-500',
  'Arms': 'bg-purple-500',
  'Legs': 'bg-green-500',
  'Core': 'bg-yellow-500',
  'Glutes': 'bg-pink-500',
  'Other': 'bg-gray-500',
};

// Muscle ID mapping for 3D visualization
const MUSCLE_ID_MAP: Record<string, string> = {
  // Muscle groups to visualization IDs
  'Chest': 'chest',
  'Back': 'upper_back',
  'Shoulders': 'front_delts',
  'Arms': 'biceps',
  'Legs': 'quads',
  'Core': 'abs',
  'Glutes': 'glutes',
  // Individual muscles
  'chest': 'chest',
  'pectoralis': 'chest',
  'back': 'upper_back',
  'latissimus': 'lats',
  'lats': 'lats',
  'trapezius': 'traps',
  'traps': 'traps',
  'shoulders': 'front_delts',
  'deltoids': 'front_delts',
  'front deltoids': 'front_delts',
  'rear deltoids': 'rear_delts',
  'side deltoids': 'side_delts',
  'biceps': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearms',
  'quadriceps': 'quads',
  'quads': 'quads',
  'hamstrings': 'hamstrings',
  'glutes': 'glutes',
  'gluteus': 'glutes',
  'calves': 'calves',
  'abs': 'abs',
  'abdominals': 'abs',
  'obliques': 'obliques',
  'core': 'abs',
  'lower back': 'lower_back',
  'erector spinae': 'lower_back',
};

export default function Journey() {
  const { token, user, login } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMuscleViewer, setShowMuscleViewer] = useState(true);

  // Convert muscle data to MuscleActivation format for 3D visualization
  const muscleActivations = useMemo((): MuscleActivation[] => {
    if (!data?.muscleBreakdown?.length) return [];

    const maxTotal = Math.max(...data.muscleBreakdown.map((m: { totalActivation: number }) => m.totalActivation));

    return data.muscleBreakdown.map((muscle: { name: string; totalActivation: number }) => {
      const normalizedName = muscle.name.toLowerCase();
      const mappedId = MUSCLE_ID_MAP[normalizedName] || normalizedName.replace(/\s+/g, '_');
      const intensity = maxTotal > 0 ? muscle.totalActivation / maxTotal : 0;

      return {
        id: mappedId,
        intensity,
        isPrimary: intensity > 0.5,
      };
    });
  }, [data?.muscleBreakdown]);

  // Convert muscle groups to MuscleActivation format
  const muscleGroupActivations = useMemo((): MuscleActivation[] => {
    if (!data?.muscleGroups?.length) return [];

    const maxTotal = Math.max(...data.muscleGroups.map((g: { total: number }) => g.total));

    return data.muscleGroups.map((group: { name: string; total: number }) => {
      const mappedId = MUSCLE_ID_MAP[group.name] || group.name.toLowerCase().replace(/\s+/g, '_');
      const intensity = maxTotal > 0 ? group.total / maxTotal : 0;

      return {
        id: mappedId,
        intensity,
        isPrimary: intensity > 0.5,
      };
    });
  }, [data?.muscleGroups]);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch("/api/journey", { headers: { Authorization: "Bearer " + token } });
      if (res.ok) {
        const d = await res.json();
        setData(d.data);
      }
    } catch {
      // Failed to load journey data
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function switchPath(id) {
    setSwitching(id);
    try {
      const res = await fetch("/api/journey/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ archetype: id })
      });
      const result = await res.json();
      if (result.success) {
        const updatedUser = { ...user, archetype: id };
        login(updatedUser, token);
        setSuccess(id);
        setTimeout(() => setSuccess(null), 2000);
        await load();
      }
    } catch {
      // Failed to switch archetype
    }
    setSwitching(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-3xl">🌌 Loading your journey...</div>
      </div>
    );
  }

  // If no data, show a helpful empty state with journey info
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
        {/* Header */}
        <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link to="/dashboard" className="text-blue-400">← Back</Link>
            <h1 className="text-xl font-bold">Your Journey</h1>
            <div className="w-16"></div>
          </div>
        </header>

        <div className="max-w-lg mx-auto p-6 flex flex-col items-center text-center mt-12">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6">
            <span className="text-5xl">🌟</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Your Journey Awaits</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Every fitness journey begins with a single step. Complete your first workout to unlock personalized progress tracking, muscle activation stats, and level progression.
          </p>

          {/* Journey Preview */}
          <div className="w-full bg-gray-800/50 rounded-2xl p-6 mb-8 border border-gray-700/50">
            <h3 className="text-sm text-gray-400 uppercase mb-4">What you&apos;ll unlock</h3>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-lg">📊</div>
                <div>
                  <div className="font-medium text-sm">Progress Tracking</div>
                  <div className="text-xs text-gray-500">Weekly & monthly stats</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-lg">💪</div>
                <div>
                  <div className="font-medium text-sm">Muscle Balance</div>
                  <div className="text-xs text-gray-500">See what you train</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center text-lg">🔥</div>
                <div>
                  <div className="font-medium text-sm">Streak Counter</div>
                  <div className="text-xs text-gray-500">Build consistency</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center text-lg">⬆️</div>
                <div>
                  <div className="font-medium text-sm">Level Up</div>
                  <div className="text-xs text-gray-500">Earn TU & rank up</div>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/workout"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-8 py-4 rounded-2xl font-bold text-lg transition-all"
          >
            Begin Your First Workout
          </Link>
        </div>
      </div>
    );
  }

  const currentPath = data.paths?.find(p => p.isCurrent);
  const otherPaths = data.paths?.filter(p => !p.isCurrent) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {success && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl text-lg font-bold bg-green-500 animate-bounce">
          Switched to {success}!
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400">← Back</Link>
          <h1 className="text-xl font-bold">Your Journey</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">
        {/* Hero Stats Card */}
        <div className={`bg-gradient-to-br ${getA(data.currentArchetype).c} rounded-3xl p-6 mb-6 shadow-2xl`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{getA(data.currentArchetype).i}</span>
              <div>
                <div className="text-sm opacity-80 uppercase tracking-wider">Level {data.currentLevel}</div>
                <h2 className="text-2xl font-bold">{data.currentLevelName}</h2>
                <div className="text-sm opacity-80">{data.daysSinceJoined} days on journey</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{data.totalTU.toLocaleString()}</div>
              <div className="text-sm opacity-80">Total TU</div>
            </div>
          </div>

          {/* XP Progress Component */}
          <div className="mb-4">
            <XPProgress
              currentXP={data.totalTU}
              xpForNextLevel={data.nextLevelTU + data.totalTU}
              level={data.currentLevel}
              levelTitle={data.currentLevelName}
              colorScheme="light"
            />
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{data.totalWorkouts}</div>
              <div className="text-xs opacity-80">Workouts</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{data.streak}</div>
              <div className="text-xs opacity-80">Day Streak</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{data.stats?.weekly?.workouts || 0}</div>
              <div className="text-xs opacity-80">This Week</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{data.stats?.weekly?.tu?.toLocaleString() || 0}</div>
              <div className="text-xs opacity-80">Weekly TU</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['overview', 'muscles', 'history', 'paths'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all ${
                activeTab === tab ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="text-sm text-gray-400 mb-2">Weekly</div>
                <div className="text-2xl font-bold">{data.stats?.weekly?.tu?.toLocaleString() || 0} TU</div>
                <div className="text-sm text-gray-400">{data.stats?.weekly?.workouts || 0} workouts</div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg {data.stats?.weekly?.avgTuPerWorkout || 0} TU/workout
                </div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="text-sm text-gray-400 mb-2">Monthly</div>
                <div className="text-2xl font-bold">{data.stats?.monthly?.tu?.toLocaleString() || 0} TU</div>
                <div className="text-sm text-gray-400">{data.stats?.monthly?.workouts || 0} workouts</div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg {data.stats?.monthly?.avgTuPerWorkout || 0} TU/workout
                </div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="text-sm text-gray-400 mb-2">All Time</div>
                <div className="text-2xl font-bold">{data.stats?.allTime?.tu?.toLocaleString() || 0} TU</div>
                <div className="text-sm text-gray-400">{data.stats?.allTime?.workouts || 0} workouts</div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg {data.stats?.allTime?.avgTuPerWorkout || 0} TU/workout
                </div>
              </div>
            </div>

            {/* 30-Day Chart */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-sm text-gray-400 uppercase mb-4">Last 30 Days Activity</h3>
              <div className="flex items-end gap-1 h-32">
                {data.workoutHistory?.map((day, i) => {
                  const maxTU = Math.max(...(data.workoutHistory?.map(d => d.tu) || [1]));
                  const height = day.tu > 0 ? Math.max(8, (day.tu / maxTU) * 100) : 4;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t transition-all ${day.tu > 0 ? 'bg-purple-500' : 'bg-gray-700'}`}
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${day.tu} TU (${day.count} workouts)`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Top Exercises */}
            {data.topExercises?.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-4">
                <h3 className="text-sm text-gray-400 uppercase mb-4">Top Exercises</h3>
                <div className="space-y-2">
                  {data.topExercises.slice(0, 5).map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 truncate">{ex.name}</div>
                      <div className="text-gray-400 text-sm">{ex.count}x</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Journey Challenges */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-sm text-gray-400 uppercase mb-4">Active Challenges</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChallengeCard
                  title="Volume Master"
                  description={`Lift ${(25000).toLocaleString()} lbs this week`}
                  progress={data.stats?.weekly?.tu || 0}
                  total={25000}
                  xpReward={150}
                  difficulty="medium"
                  icon="🏋️"
                  timeRemaining="5d 12h"
                />
                <ChallengeCard
                  title="Streak Builder"
                  description="Maintain a 7-day workout streak"
                  progress={data.streak || 0}
                  total={7}
                  xpReward={200}
                  difficulty="hard"
                  icon="🔥"
                  timeRemaining="Ongoing"
                />
              </div>
            </div>

            {/* Level Milestones */}
            {data.levels?.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-4">
                <h3 className="text-sm text-gray-400 uppercase mb-4">Level Milestones</h3>
                <div className="space-y-3">
                  {data.levels.map((level, i) => (
                    <div key={i} className={`flex items-center gap-3 ${level.achieved ? '' : 'opacity-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        level.achieved ? 'bg-green-600' : 'bg-gray-700'
                      }`}>
                        {level.achieved ? '✓' : level.level}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{level.name}</div>
                        <div className="text-xs text-gray-400">{level.total_tu.toLocaleString()} TU required</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Muscles Tab */}
        {activeTab === 'muscles' && (
          <div className="space-y-6">
            {/* 3D Muscle Visualization */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-400 uppercase">Muscle Development</h3>
                <button
                  onClick={() => setShowMuscleViewer(!showMuscleViewer)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {showMuscleViewer ? 'Hide 3D' : 'Show 3D'}
                </button>
              </div>

              {showMuscleViewer && (muscleActivations.length > 0 || muscleGroupActivations.length > 0) ? (
                <div className="space-y-4">
                  {/* Interactive 3D Model */}
                  <div className="bg-gray-900/50 rounded-xl overflow-hidden">
                    <MuscleViewer
                      muscles={muscleActivations.length > 0 ? muscleActivations : muscleGroupActivations}
                      mode="card"
                      interactive={true}
                      showLabels={true}
                      autoRotate={true}
                      className="h-64"
                    />
                  </div>

                  {/* Heatmap Views */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-2 text-center">Front</div>
                      <MuscleHeatmap
                        muscles={muscleActivations.length > 0 ? muscleActivations : muscleGroupActivations}
                        view="front"
                        showLabels={false}
                        className="h-40"
                      />
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-2 text-center">Back</div>
                      <MuscleHeatmap
                        muscles={muscleActivations.length > 0 ? muscleActivations : muscleGroupActivations}
                        view="back"
                        showLabels={false}
                        className="h-40"
                      />
                    </div>
                  </div>
                </div>
              ) : showMuscleViewer ? (
                <div className="bg-gray-900/50 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-2">💪</div>
                  <p className="text-gray-400 text-sm">Complete workouts to see your muscle development</p>
                </div>
              ) : null}
            </div>

            {/* Muscle Groups Summary */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-sm text-gray-400 uppercase mb-4">Muscle Group Distribution</h3>
              {data.muscleGroups?.length > 0 ? (
                <div className="space-y-3">
                  {data.muscleGroups.map(group => {
                    const maxTotal = Math.max(...(data.muscleGroups?.map(g => g.total) || [1]));
                    const percent = (group.total / maxTotal) * 100;
                    return (
                      <div key={group.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{group.name}</span>
                          <span className="text-gray-400">{group.total.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${MUSCLE_COLORS[group.name] || 'bg-gray-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Complete workouts to see muscle data</p>
              )}
            </div>

            {/* Individual Muscles */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-sm text-gray-400 uppercase mb-4">Top Trained Muscles</h3>
              {data.muscleBreakdown?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {data.muscleBreakdown.slice(0, 10).map((muscle, _i) => (
                    <div key={muscle.id} className="bg-gray-700 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${MUSCLE_COLORS[muscle.group] || 'bg-gray-500'}`} />
                        <span className="text-sm truncate">{muscle.name}</span>
                      </div>
                      <div className="text-xl font-bold mt-1">{muscle.totalActivation.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{muscle.group}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No muscle data yet</p>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-sm text-gray-400 uppercase">Recent Workouts</h3>
            {data.recentWorkouts?.length > 0 ? (
              data.recentWorkouts.map(workout => (
                <div key={workout.id} className="bg-gray-800 rounded-2xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{new Date(workout.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(workout.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{workout.tu} TU</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-800 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-2">🏋️</div>
                <p className="text-gray-400">No workouts yet</p>
                <Link to="/workout" className="text-purple-400 text-sm">Start your first workout</Link>
              </div>
            )}
          </div>
        )}

        {/* Paths Tab */}
        {activeTab === 'paths' && (
          <div className="space-y-6">
            {/* Current Path */}
            {currentPath && (
              <div className="mb-6">
                <h3 className="text-sm text-gray-400 uppercase mb-3">Current Path</h3>
                <div className={`bg-gradient-to-br ${getA(currentPath.archetype).c} rounded-3xl p-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-6xl">{getA(currentPath.archetype).i}</span>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">{currentPath.name}</h3>
                      <p className="text-sm opacity-80">{currentPath.philosophy}</p>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-full h-3 overflow-hidden mb-2">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${currentPath.percentComplete}%` }}
                    />
                  </div>
                  <div className="text-sm opacity-80">{currentPath.percentComplete.toFixed(1)}% mastery</div>
                  {currentPath.focusAreas?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {currentPath.focusAreas.map(area => (
                        <span key={area} className="bg-white/20 px-3 py-1 rounded-full text-xs">{area}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other Paths */}
            <h3 className="text-sm text-gray-400 uppercase mb-3">Explore Other Paths</h3>
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {otherPaths.map(path => {
                  // Map path data to ArchetypeCard format
                  const archetypeData = {
                    id: path.archetype,
                    name: path.name,
                    description: path.philosophy,
                    philosophy: path.philosophy,
                    icon: switching === path.archetype ? "⏳" : getA(path.archetype).i,
                    // Convert gradient classes to a hex color for the card
                    color: getArchetypeColor(path.archetype),
                  };

                  return (
                    <motion.div
                      key={path.archetype}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="relative"
                    >
                      <ArchetypeCard
                        archetype={archetypeData}
                        size="md"
                        onClick={() => !switching && switchPath(path.archetype)}
                        showDetails={true}
                      />
                      {/* Progress badge */}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold border border-white/20">
                        {path.percentComplete.toFixed(0)}% mastery
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
