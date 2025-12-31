import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

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

export default function Journey() {
  const { user, login } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { load(); }, []);

  async function load() {
    const token = localStorage.getItem("musclemap_token");
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch("/api/journey", { headers: { Authorization: "Bearer " + token } });
      if (res.ok) {
        const d = await res.json();
        setData(d.data);
      }
    } catch(e) {
      console.error("Failed to load journey data:", e);
    }
    setLoading(false);
  }

  async function switchPath(id) {
    setSwitching(id);
    const token = localStorage.getItem("musclemap_token");
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
    } catch(e) {
      console.error("Failed to switch archetype:", e);
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

  // If no data, show empty state
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4">🌟</div>
        <h1 className="text-2xl font-bold mb-2">Start Your Journey</h1>
        <p className="text-gray-400 text-center mb-6">Complete your first workout to begin tracking your progress</p>
        <Link to="/workout" className="bg-purple-600 px-8 py-3 rounded-full font-bold">Start Workout</Link>
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

          {/* Progress to next level */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to next level</span>
              <span>{data.progressToNextLevel.toFixed(1)}%</span>
            </div>
            <div className="bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${data.progressToNextLevel}%` }}
              />
            </div>
            <div className="text-xs opacity-70 mt-1 text-right">
              {data.nextLevelTU.toLocaleString()} TU to next level
            </div>
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
                  {data.muscleBreakdown.slice(0, 10).map((muscle, i) => (
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
              {otherPaths.map(path => (
                <button
                  key={path.archetype}
                  onClick={() => switchPath(path.archetype)}
                  disabled={!!switching}
                  className={`relative bg-gradient-to-br ${getA(path.archetype).c} rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95`}
                >
                  <span className="text-4xl">{switching === path.archetype ? "⏳" : getA(path.archetype).i}</span>
                  <div className="mt-2">
                    <div className="font-bold">{path.name}</div>
                    <div className="text-xs opacity-80">{path.percentComplete.toFixed(0)}% complete</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/30 rounded-full px-2 py-1 text-xs">
                    {path.percentComplete.toFixed(0)}%
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
