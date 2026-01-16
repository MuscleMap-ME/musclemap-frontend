// MuscleMap Complete Page Templates
// All application screens with full functionality

import React, { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const HomePage = ({ user = { name: 'Niko', streak: 7, workoutsThisWeek: 4, totalWorkouts: 24 } }) => {
  const [greeting, setGreeting] = useState('Good morning');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17) setGreeting('Good evening');
  }, []);

  const suggestedWorkout = { name: 'Push Day B', duration: 50, exercises: 7, muscles: ['Chest', 'Shoulders', 'Triceps'] };
  const recentWorkouts = [
    { name: 'Push Day A', date: 'Today', duration: 45, icon: '💪' },
    { name: 'Pull Day A', date: 'Yesterday', duration: 52, icon: '🏋️' },
    { name: 'Leg Day', date: '2 days ago', duration: 55, icon: '🦵' },
  ];
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const completedDays = [true, true, true, true, false, false, false];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      {/* Header */}
      <header className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-400 text-sm">{greeting}</p>
            <h1 className="text-2xl font-bold">{user.name} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center relative">
              <span>🔔</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">3</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold">{user.name[0]}</div>
          </div>
        </div>

        {/* Streak Banner */}
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl p-4 border border-orange-500/30 flex items-center gap-4">
          <span className="text-4xl">🔥</span>
          <div className="flex-1">
            <p className="font-bold text-lg">{user.streak} Day Streak!</p>
            <p className="text-sm text-slate-300">Keep it up! Train today to continue.</p>
          </div>
          <span className="text-3xl font-bold text-orange-400 font-mono">{user.streak}</span>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Workouts', value: user.totalWorkouts, icon: '🏋️', color: 'teal' },
            { label: 'Streak', value: user.streak, icon: '🔥', color: 'orange' },
            { label: 'This Week', value: user.workoutsThisWeek, icon: '📅', color: 'purple' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl p-3 border ${stat.color === 'teal' ? 'bg-teal-500/10 border-teal-500/30' : stat.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-purple-500/10 border-purple-500/30'}`}>
              <span className="text-xl">{stat.icon}</span>
              <p className="text-xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Suggested Workout */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Suggested for Today</h2>
            <span className="text-xs text-slate-400">Based on your schedule</span>
          </div>
          <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-2xl p-5 border border-teal-500/30">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-xl mb-1">{suggestedWorkout.name}</h3>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span>⏱️ {suggestedWorkout.duration} min</span>
                  <span>{suggestedWorkout.exercises} exercises</span>
                </div>
              </div>
              <button className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedWorkout.muscles.map((m) => (
                <span key={m} className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-sm font-medium">{m}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Workouts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Recent Workouts</h2>
            <button className="text-sm text-teal-400 font-medium">See All</button>
          </div>
          <div className="space-y-3">
            {recentWorkouts.map((workout, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-xl">{workout.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{workout.name}</h4>
                  <p className="text-sm text-slate-400">{workout.date} • {workout.duration} min</p>
                </div>
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly Progress */}
        <section>
          <h2 className="font-semibold text-lg mb-3">This Week</h2>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="flex justify-between mb-4">
              {weekDays.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-500">{day}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${completedDays[i] ? 'bg-teal-500 text-white' : i === user.workoutsThisWeek ? 'border-2 border-dashed border-slate-600' : 'bg-slate-700'}`}>
                    {completedDays[i] && '✓'}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Weekly Goal: 5 workouts</span>
              <span className="text-teal-400 font-medium">{user.workoutsThisWeek}/5 complete</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all" style={{ width: `${(user.workoutsThisWeek / 5) * 100}%` }} />
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '➕', label: 'New Workout', color: 'teal' },
              { icon: '📊', label: 'View Progress', color: 'purple' },
              { icon: '🎯', label: 'Set Goals', color: 'orange' },
              { icon: '🏆', label: 'Leaderboard', color: 'blue' },
            ].map((action) => (
              <button key={action.label} className={`p-4 rounded-xl border text-left hover:scale-[1.02] transition-transform ${action.color === 'teal' ? 'bg-teal-500/10 border-teal-500/30' : action.color === 'purple' ? 'bg-purple-500/10 border-purple-500/30' : action.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                <span className="text-2xl">{action.icon}</span>
                <p className="font-medium mt-2">{action.label}</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation active="home" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISE LIBRARY PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const ExerciseLibraryPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const filters = ['all', 'push', 'pull', 'legs', 'core'];
  const exercises = [
    { id: 1, name: 'Barbell Squat', category: 'legs', muscles: ['Quads', 'Glutes', 'Core'], equipment: 'Barbell', difficulty: 'intermediate' },
    { id: 2, name: 'Bench Press', category: 'push', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Barbell', difficulty: 'beginner' },
    { id: 3, name: 'Deadlift', category: 'pull', muscles: ['Back', 'Hamstrings', 'Glutes'], equipment: 'Barbell', difficulty: 'advanced' },
    { id: 4, name: 'Pull-up', category: 'pull', muscles: ['Lats', 'Biceps', 'Core'], equipment: 'Bodyweight', difficulty: 'intermediate' },
    { id: 5, name: 'Overhead Press', category: 'push', muscles: ['Shoulders', 'Triceps'], equipment: 'Barbell', difficulty: 'intermediate' },
    { id: 6, name: 'Romanian Deadlift', category: 'pull', muscles: ['Hamstrings', 'Glutes'], equipment: 'Barbell', difficulty: 'intermediate' },
    { id: 7, name: 'Lunges', category: 'legs', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbell', difficulty: 'beginner' },
    { id: 8, name: 'Plank', category: 'core', muscles: ['Core', 'Shoulders'], equipment: 'Bodyweight', difficulty: 'beginner' },
  ];

  const filteredExercises = exercises.filter(ex => 
    (activeFilter === 'all' || ex.category === activeFilter) &&
    (searchQuery === '' || ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const diffColors = { beginner: 'bg-emerald-500/20 text-emerald-400', intermediate: 'bg-amber-500/20 text-amber-400', advanced: 'bg-red-500/20 text-red-400' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Exercise Library</h1>
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search 65+ exercises..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${activeFilter === f ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{f}</button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">{filteredExercises.length} exercises</p>
          <div className="flex gap-2">
            {['grid', 'list'].map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`w-9 h-9 rounded-lg flex items-center justify-center ${viewMode === mode ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {mode === 'grid' ? '⊞' : '☰'}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredExercises.map((ex) => (
              <div key={ex.id} className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden hover:border-slate-600 cursor-pointer">
                <div className="aspect-square bg-gradient-to-br from-slate-700 to-slate-800 relative flex items-center justify-center">
                  <span className="text-4xl opacity-50">🏋️</span>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-xs capitalize">{ex.category}</span>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{ex.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{ex.muscles.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map((ex) => (
              <div key={ex.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 cursor-pointer">
                <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center text-2xl">🏋️</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{ex.name}</h4>
                  <p className="text-sm text-slate-400 truncate">{ex.muscles.join(', ')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-xs capitalize ${diffColors[ex.difficulty]}`}>{ex.difficulty}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <button className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-xl shadow-teal-500/30 flex items-center justify-center text-2xl z-40">➕</button>
      <BottomNavigation active="exercises" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISE DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const ExerciseDetailPage = ({ exercise = {
  name: 'Barbell Squat',
  category: 'Legs',
  equipment: 'Barbell',
  difficulty: 'intermediate',
  description: 'The barbell squat is a compound exercise that primarily targets the quadriceps, glutes, and core. It is considered one of the most effective exercises for building lower body strength and muscle mass.',
  muscles: [
    { name: 'Quadriceps', activation: 95, role: 'Primary' },
    { name: 'Glutes', activation: 85, role: 'Primary' },
    { name: 'Hamstrings', activation: 45, role: 'Synergist' },
    { name: 'Core', activation: 60, role: 'Stabilizer' },
    { name: 'Calves', activation: 25, role: 'Stabilizer' },
  ],
  instructions: [
    'Position the barbell on your upper back, gripping it wider than shoulder-width.',
    'Stand with feet shoulder-width apart, toes slightly pointed out.',
    'Brace your core and keep your chest up throughout the movement.',
    'Lower your body by bending at the hips and knees simultaneously.',
    'Descend until your thighs are at least parallel to the floor.',
    'Drive through your heels to return to the starting position.',
  ],
  tips: [
    'Keep your knees tracking over your toes',
    'Maintain a neutral spine throughout',
    'Breathe in on the way down, out on the way up',
  ],
  history: [
    { date: 'Jan 10', weight: 185, reps: 8, sets: 4 },
    { date: 'Jan 7', weight: 180, reps: 8, sets: 4 },
    { date: 'Jan 3', weight: 175, reps: 10, sets: 3 },
  ],
  pr: { weight: 225, reps: 5, date: 'Dec 15, 2025' }
}}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = ['overview', 'muscles', 'history'];

  const getActivationColor = (a) => a >= 80 ? 'from-red-500 to-red-400' : a >= 60 ? 'from-orange-500 to-orange-400' : a >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-teal-500 to-teal-400';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      {/* Header with image */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
          <span className="text-8xl opacity-30">🏋️</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        <button className="absolute top-12 left-4 w-10 h-10 rounded-xl bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button className="absolute top-12 right-4 w-10 h-10 rounded-xl bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">⋯</button>
        
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded-lg bg-slate-800/80 text-xs">{exercise.category}</span>
            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs capitalize">{exercise.difficulty}</span>
          </div>
          <h1 className="text-2xl font-bold">{exercise.name}</h1>
          <p className="text-sm text-slate-400">{exercise.equipment}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <main className="px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Description */}
            <section>
              <h2 className="font-semibold text-lg mb-3">Description</h2>
              <p className="text-slate-300 leading-relaxed">{exercise.description}</p>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="font-semibold text-lg mb-3">Instructions</h2>
              <div className="space-y-3">
                {exercise.instructions.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                    <p className="text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tips */}
            <section>
              <h2 className="font-semibold text-lg mb-3">Pro Tips</h2>
              <div className="bg-teal-500/10 rounded-xl p-4 border border-teal-500/30 space-y-2">
                {exercise.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-teal-400">💡</span>
                    <p className="text-slate-300 text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'muscles' && (
          <div className="space-y-6">
            {/* Muscle Heatmap */}
            <section className="flex justify-center">
              <MuscleHeatmapMini activations={{ quads: 95, glutes: 85, hamstrings: 45, core: 60, calves: 25 }} />
            </section>

            {/* Muscle List */}
            <section>
              <h2 className="font-semibold text-lg mb-3">Muscle Activation</h2>
              <div className="space-y-3">
                {exercise.muscles.map((muscle) => (
                  <div key={muscle.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`font-medium ${muscle.role === 'Primary' ? 'text-white' : 'text-slate-400'}`}>{muscle.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{muscle.role}</span>
                      </div>
                      <span className="text-sm font-mono text-slate-400">{muscle.activation}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${getActivationColor(muscle.activation)} rounded-full`} style={{ width: `${muscle.activation}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* PR Card */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <h3 className="font-semibold">Personal Record</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-yellow-400 font-mono">{exercise.pr.weight}</span>
                <span className="text-slate-400">lbs × {exercise.pr.reps} reps</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{exercise.pr.date}</p>
            </div>

            {/* History List */}
            <section>
              <h2 className="font-semibold text-lg mb-3">Recent Sessions</h2>
              <div className="space-y-2">
                {exercise.history.map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div>
                      <p className="font-medium">{session.date}</p>
                      <p className="text-sm text-slate-400">{session.sets} sets × {session.reps} reps</p>
                    </div>
                    <span className="text-xl font-bold font-mono">{session.weight}<span className="text-sm text-slate-400 ml-1">lbs</span></span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
        <button className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-teal-500/25">
          Add to Workout
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT SESSION PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const WorkoutSessionPage = () => {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [workoutStartTime] = useState(Date.now());
  const [completedSets, setCompletedSets] = useState([]);

  const workout = {
    name: 'Push Day A',
    exercises: [
      { name: 'Bench Press', sets: 4, targetReps: 8, targetWeight: 135, muscles: ['Chest', 'Triceps'] },
      { name: 'Overhead Press', sets: 3, targetReps: 10, targetWeight: 95, muscles: ['Shoulders', 'Triceps'] },
      { name: 'Incline Dumbbell Press', sets: 3, targetReps: 12, targetWeight: 50, muscles: ['Upper Chest'] },
      { name: 'Lateral Raises', sets: 3, targetReps: 15, targetWeight: 20, muscles: ['Side Delts'] },
      { name: 'Tricep Pushdowns', sets: 3, targetReps: 12, targetWeight: 40, muscles: ['Triceps'] },
    ],
  };

  const exercise = workout.exercises[currentExercise];
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSetsCount = completedSets.length;

  const handleCompleteSet = (data) => {
    setCompletedSets([...completedSets, { exercise: currentExercise, set: currentSet, ...data }]);
    
    if (currentSet < exercise.sets - 1) {
      setCurrentSet(currentSet + 1);
      setIsResting(true);
    } else if (currentExercise < workout.exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      setCurrentSet(0);
      setIsResting(true);
    }
  };

  const handleSkipRest = () => setIsResting(false);

  if (isResting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
        <header className="px-4 py-4 flex items-center justify-between">
          <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">✕</button>
          <WorkoutTimerDisplay startTime={workoutStartTime} />
          <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">⚙️</button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-slate-400 mb-2">Up Next</p>
          <h2 className="text-xl font-bold mb-8">{exercise.name} - Set {currentSet + 1}</h2>
          
          <RestTimerComponent duration={90} onComplete={() => setIsResting(false)} onSkip={handleSkipRest} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800">
        <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">✕</button>
        <div className="text-center">
          <p className="text-xs text-slate-400">{workout.name}</p>
          <WorkoutTimerDisplay startTime={workoutStartTime} />
        </div>
        <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">⚙️</button>
      </header>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Progress</span>
          <span className="text-teal-400 font-medium">{completedSetsCount}/{totalSets} sets</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all" style={{ width: `${(completedSetsCount / totalSets) * 100}%` }} />
        </div>
      </div>

      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Exercise Header */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-teal-400 uppercase tracking-wider font-medium mb-1">Set {currentSet + 1} of {exercise.sets}</p>
              <h2 className="text-xl font-bold">{exercise.name}</h2>
            </div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400">ℹ️</button>
              <button className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400">🔄</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exercise.muscles.map((m) => <span key={m} className="px-2 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs font-medium">{m}</span>)}
          </div>
        </div>

        {/* Set Progress */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: exercise.sets }).map((_, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${i < currentSet ? 'bg-teal-500 text-white' : i === currentSet ? 'bg-teal-500/20 text-teal-400 border-2 border-teal-500 scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
              {i < currentSet ? '✓' : i + 1}
            </div>
          ))}
        </div>

        {/* Set Logger */}
        <SetLoggerComponent targetReps={exercise.targetReps} targetWeight={exercise.targetWeight} onComplete={handleCompleteSet} />
      </main>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const ProfilePage = ({ user = {
  name: 'Niko',
  username: '@niko',
  avatar: null,
  joinDate: 'January 2025',
  stats: { workouts: 124, streak: 7, totalVolume: '1.2M', prs: 23 },
  achievements: [
    { name: '7 Day Streak', icon: '🔥', tier: 'bronze', unlocked: true },
    { name: 'First PR', icon: '⚡', tier: 'silver', unlocked: true },
    { name: '100 Workouts', icon: '💯', tier: 'gold', unlocked: true },
    { name: 'Elite', icon: '👑', tier: 'platinum', unlocked: false, progress: 75 },
  ],
  credits: 2450,
}}) => {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      {/* Header */}
      <header className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Profile</h1>
          <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">⚙️</button>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-3xl font-bold">
            {user.avatar || user.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-slate-400">{user.username}</p>
            <p className="text-xs text-slate-500">Member since {user.joinDate}</p>
          </div>
        </div>

        {/* Credits */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">⚡</div>
          <div className="flex-1">
            <p className="text-sm text-slate-300">Credit Balance</p>
            <p className="text-xl font-bold font-mono text-yellow-400">{user.credits.toLocaleString()}</p>
          </div>
          <button className="px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-300 text-sm font-medium">Earn More</button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Workouts', value: user.stats.workouts },
            { label: 'Streak', value: user.stats.streak },
            { label: 'Volume', value: user.stats.totalVolume },
            { label: 'PRs', value: user.stats.prs },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-slate-800 rounded-xl p-1">
          {['stats', 'achievements', 'history'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize ${activeTab === tab ? 'bg-teal-500 text-white' : 'text-slate-400'}`}>{tab}</button>
          ))}
        </div>
      </div>

      <main className="px-4">
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Lifetime Stats</h3>
            {[
              { label: 'Total Workouts', value: '124' },
              { label: 'Total Sets', value: '2,456' },
              { label: 'Total Reps', value: '28,934' },
              { label: 'Total Volume', value: '1.2M lbs' },
              { label: 'Longest Streak', value: '21 days' },
              { label: 'Favorite Exercise', value: 'Bench Press' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <span className="text-slate-400">{stat.label}</span>
                <span className="font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Achievements</h3>
            <div className="grid grid-cols-4 gap-4">
              {user.achievements.map((badge) => {
                const tiers = { bronze: 'from-amber-700 to-amber-900 border-amber-600', silver: 'from-slate-300 to-slate-500 border-slate-400', gold: 'from-yellow-400 to-yellow-600 border-yellow-500', platinum: 'from-slate-200 to-cyan-200 border-cyan-300' };
                return (
                  <div key={badge.name} className={`text-center ${!badge.unlocked ? 'opacity-40 grayscale' : ''}`}>
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${tiers[badge.tier]} border-2 flex items-center justify-center shadow-lg relative`}>
                      <span className="text-2xl">{badge.icon}</span>
                      {badge.unlocked && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-xs">✓</div>}
                    </div>
                    <p className="text-xs mt-2 text-slate-300">{badge.name}</p>
                    {badge.progress && <p className="text-xs text-slate-500">{badge.progress}%</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Workout History</h3>
            {[
              { name: 'Push Day A', date: 'Today', duration: 45, volume: 12500 },
              { name: 'Pull Day A', date: 'Yesterday', duration: 52, volume: 14200 },
              { name: 'Leg Day', date: '2 days ago', duration: 55, volume: 18500 },
            ].map((workout, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex justify-between mb-2">
                  <h4 className="font-semibold">{workout.name}</h4>
                  <span className="text-sm text-slate-400">{workout.date}</span>
                </div>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>{workout.duration} min</span>
                  <span>{workout.volume.toLocaleString()} lbs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation active="profile" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const ProgressPage = () => {
  const [period, setPeriod] = useState('week');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      <header className="px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold mb-4">Progress</h1>
        <div className="flex bg-slate-800 rounded-xl p-1">
          {['week', 'month', 'year'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize ${period === p ? 'bg-teal-500 text-white' : 'text-slate-400'}`}>{p}</button>
          ))}
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Workouts', value: '12', change: '+3', up: true, icon: '🏋️' },
            { label: 'Volume', value: '145K', change: '+12%', up: true, icon: '📊' },
            { label: 'Avg Duration', value: '48m', change: '-5m', up: false, icon: '⏱️' },
            { label: 'PRs Set', value: '4', change: '+2', up: true, icon: '🏆' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{stat.icon}</span>
                <span className={`text-xs font-medium ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>{stat.change}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Volume Chart Placeholder */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Volume Over Time</h2>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 h-48 flex items-end justify-between gap-2">
            {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t" style={{ height: `${h}%` }} />
                <span className="text-xs text-slate-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Muscle Balance */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Muscle Balance</h2>
          <div className="space-y-3">
            {[
              { muscle: 'Chest', volume: 85 },
              { muscle: 'Back', volume: 78 },
              { muscle: 'Shoulders', volume: 72 },
              { muscle: 'Arms', volume: 65 },
              { muscle: 'Legs', volume: 45 },
              { muscle: 'Core', volume: 55 },
            ].map((m) => (
              <div key={m.muscle} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{m.muscle}</span>
                  <span className="text-slate-400">{m.volume}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full" style={{ width: `${m.volume}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent PRs */}
        <section>
          <h2 className="font-semibold text-lg mb-3">Recent PRs</h2>
          <div className="space-y-2">
            {[
              { exercise: 'Bench Press', value: '185 × 8', date: '2 days ago' },
              { exercise: 'Squat', value: '225 × 5', date: '5 days ago' },
              { exercise: 'Deadlift', value: '275 × 3', date: '1 week ago' },
            ].map((pr, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <span className="text-xl">🏆</span>
                <div className="flex-1">
                  <p className="font-medium">{pr.exercise}</p>
                  <p className="text-sm text-slate-400">{pr.date}</p>
                </div>
                <span className="font-bold font-mono text-yellow-400">{pr.value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation active="progress" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const BottomNavigation = ({ active }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50">
    <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
      {[
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'exercises', icon: '💪', label: 'Exercises' },
        { id: 'workouts', icon: '📋', label: 'Workouts' },
        { id: 'progress', icon: '📊', label: 'Progress' },
        { id: 'profile', icon: '👤', label: 'Profile' },
      ].map((item) => (
        <button key={item.id} className={`flex flex-col items-center gap-1 px-3 py-2 ${active === item.id ? 'text-teal-400' : 'text-slate-500'}`}>
          <span className="text-lg">{item.icon}</span>
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

const WorkoutTimerDisplay = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const m = Math.floor(elapsed / 60), s = elapsed % 60;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50">
      <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      <span className="font-mono text-white font-medium">{m}:{s.toString().padStart(2, '0')}</span>
    </div>
  );
};

const RestTimerComponent = ({ duration, onComplete, onSkip }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  useEffect(() => {
    if (timeLeft <= 0) { onComplete(); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onComplete]);
  const pct = (timeLeft / duration) * 100;
  const circ = 2 * Math.PI * 45;
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90">
          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#334155" strokeWidth="8" />
          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          <span className="text-slate-400 uppercase text-sm">Rest</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium">Pause</button>
        <button onClick={onSkip} className="px-6 py-3 rounded-xl bg-teal-500 text-white font-semibold">Skip Rest</button>
      </div>
    </div>
  );
};

const SetLoggerComponent = ({ targetReps, targetWeight, onComplete }) => {
  const [reps, setReps] = useState(targetReps);
  const [weight, setWeight] = useState(targetWeight);
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Weight</label>
          <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Reps</label>
          <input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-slate-500 text-center">Weight</p>
          <div className="flex gap-1">
            {[-5, -2.5, 2.5, 5].map(n => <button key={n} onClick={() => setWeight(w => Math.max(0, w + n))} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-medium">{n > 0 ? '+' : ''}{n}</button>)}
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs text-slate-500 text-center">Reps</p>
          <div className="flex gap-1">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-medium">-1</button>
            <button onClick={() => setReps(r => r + 1)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-medium">+1</button>
          </div>
        </div>
      </div>
      <button onClick={() => onComplete({ reps, weight })} className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-teal-500/25 active:scale-[0.98]">Complete Set</button>
    </div>
  );
};

const MuscleHeatmapMini = ({ activations }) => {
  const getColor = (a) => a >= 80 ? '#EF4444' : a >= 60 ? '#F97316' : a >= 40 ? '#EAB308' : a >= 20 ? '#14B8A6' : '#334155';
  const getOpacity = (a) => a >= 20 ? 0.7 : 0.3;
  return (
    <svg viewBox="0 0 200 280" className="w-40">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="body" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#334155" /></linearGradient>
      </defs>
      <g fill="url(#body)">
        <ellipse cx="100" cy="30" rx="20" ry="25" /><rect x="92" y="52" width="16" height="12" rx="3" />
        <path d="M 65 64 Q 100 56 135 64 Q 143 105 135 155 Q 100 163 65 155 Q 57 105 65 64" />
        <ellipse cx="52" cy="82" rx="13" ry="22" /><ellipse cx="148" cy="82" rx="13" ry="22" />
        <ellipse cx="78" cy="195" rx="18" ry="42" /><ellipse cx="122" cy="195" rx="18" ry="42" />
      </g>
      <g filter="url(#glow)">
        <ellipse cx="78" cy="190" rx="15" ry="38" fill={getColor(activations.quads || 0)} opacity={getOpacity(activations.quads || 0)} />
        <ellipse cx="122" cy="190" rx="15" ry="38" fill={getColor(activations.quads || 0)} opacity={getOpacity(activations.quads || 0)} />
        <ellipse cx="100" cy="120" rx="16" ry="28" fill={getColor(activations.core || 0)} opacity={getOpacity(activations.core || 0)} />
      </g>
    </svg>
  );
};

export default { HomePage, ExerciseLibraryPage, ExerciseDetailPage, WorkoutSessionPage, ProfilePage, ProgressPage };
