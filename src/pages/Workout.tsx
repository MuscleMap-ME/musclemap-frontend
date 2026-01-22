import React, { useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExerciseTip, WorkoutComplete } from '../components/tips';
import { useAuth } from '../store/authStore';
import { hasExerciseIllustration } from '@musclemap/shared';
import { MuscleViewer, MuscleActivationBadge } from '../components/muscle-viewer';
import type { MuscleActivation } from '../components/muscle-viewer/types';
import { syncSessionToServer, clearAllSessionPersistence } from '../lib/sessionPersistence';

// Lazy load illustration component
const ExerciseIllustration = lazy(() =>
  import('../components/illustrations').then(m => ({ default: m.ExerciseIllustration }))
);

// Muscle ID mapping from exercise muscles to visualization muscles
const MUSCLE_ID_MAP: Record<string, string> = {
  'chest-upper': 'chest',
  'chest-mid': 'chest',
  'chest-lower': 'chest',
  'pectoralis': 'chest',
  'pec': 'chest',
  'back-upper': 'upper_back',
  'back-mid': 'lats',
  'back-lower': 'lower_back',
  'latissimus': 'lats',
  'rhomboids': 'upper_back',
  'trapezius': 'traps',
  'traps': 'traps',
  'rear-delts': 'rear_delts',
  'front-delts': 'front_delts',
  'side-delts': 'side_delts',
  'shoulders': 'front_delts',
  'deltoid': 'front_delts',
  'biceps': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearms',
  'quadriceps': 'quads',
  'quads': 'quads',
  'hamstrings': 'hamstrings',
  'glutes': 'glutes',
  'calves': 'calves',
  'abs': 'abs',
  'obliques': 'obliques',
  'core': 'abs',
  'hip-flexors': 'hip_flexors',
  'adductors': 'adductors',
  'erector': 'lower_back',
};

function mapMuscleId(muscle: string): string {
  const normalized = muscle.toLowerCase().replace(/[_\s]/g, '-');
  return MUSCLE_ID_MAP[normalized] || normalized.replace(/-/g, '_');
}

// Constraint options
const TIME_OPTIONS = [
  { value: 15, label: '15 min', description: 'Quick session' },
  { value: 30, label: '30 min', description: 'Standard' },
  { value: 45, label: '45 min', description: 'Extended' },
  { value: 60, label: '60 min', description: 'Full workout' },
];

const LOCATION_OPTIONS = [
  { value: 'gym', label: 'Gym', icon: '🏋️' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'park', label: 'Park', icon: '🌳' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'office', label: 'Office', icon: '🏢' },
];

// Equipment options organized by location
const EQUIPMENT_BY_LOCATION = {
  gym: [
    { value: 'barbell', label: 'Barbell', icon: '🏋️' },
    { value: 'dumbbells', label: 'Dumbbells', icon: '🔩' },
    { value: 'cable_machine', label: 'Cable Machine', icon: '⚙️' },
    { value: 'leg_press', label: 'Leg Press', icon: '🦵' },
    { value: 'lat_pulldown', label: 'Lat Pulldown', icon: '📐' },
    { value: 'bench', label: 'Bench', icon: '🪑' },
    { value: 'squat_rack', label: 'Squat Rack', icon: '🏗️' },
    { value: 'smith_machine', label: 'Smith Machine', icon: '🔧' },
    { value: 'rowing_machine', label: 'Row Machine', icon: '🚣' },
    { value: 'treadmill', label: 'Treadmill', icon: '🏃' },
    { value: 'elliptical', label: 'Elliptical', icon: '⭕' },
    { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
  ],
  home: [
    { value: 'dumbbells', label: 'Dumbbells', icon: '🔩' },
    { value: 'pullup_bar', label: 'Pull-up Bar', icon: '🔲' },
    { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
    { value: 'bands', label: 'Resistance Bands', icon: '➰' },
    { value: 'yoga_mat', label: 'Yoga Mat', icon: '🧘' },
    { value: 'foam_roller', label: 'Foam Roller', icon: '🛼' },
    { value: 'jump_rope', label: 'Jump Rope', icon: '🪢' },
    { value: 'stability_ball', label: 'Stability Ball', icon: '⚪' },
  ],
  park: [
    { value: 'pullup_bar', label: 'Pull-up Bar', icon: '🔲' },
    { value: 'parallel_bars', label: 'Parallel Bars', icon: '⏸️' },
    { value: 'bench', label: 'Park Bench', icon: '🪑' },
    { value: 'bands', label: 'Resistance Bands', icon: '➰' },
    { value: 'jump_rope', label: 'Jump Rope', icon: '🪢' },
    { value: 'stairs', label: 'Stairs', icon: '📶' },
  ],
  hotel: [
    { value: 'bands', label: 'Resistance Bands', icon: '➰' },
    { value: 'dumbbells', label: 'Hotel Dumbbells', icon: '🔩' },
    { value: 'yoga_mat', label: 'Yoga Mat', icon: '🧘' },
    { value: 'chair', label: 'Chair', icon: '💺' },
    { value: 'treadmill', label: 'Treadmill', icon: '🏃' },
  ],
  office: [
    { value: 'bands', label: 'Resistance Bands', icon: '➰' },
    { value: 'chair', label: 'Office Chair', icon: '💺' },
    { value: 'desk', label: 'Desk', icon: '🖥️' },
    { value: 'stairs', label: 'Stairs', icon: '📶' },
  ],
};

// Fallback equipment options
const DEFAULT_EQUIPMENT_OPTIONS = [
  { value: 'dumbbells', label: 'Dumbbells', icon: '🔩' },
  { value: 'pullup_bar', label: 'Pull-up Bar', icon: '🔲' },
  { value: 'kettlebell', label: 'Kettlebell', icon: '🔔' },
  { value: 'bands', label: 'Resistance Bands', icon: '➰' },
  { value: 'barbell', label: 'Barbell', icon: '🏋️' },
];

const GOAL_OPTIONS = [
  { value: 'strength', label: 'Strength', icon: '💪' },
  { value: 'hypertrophy', label: 'Muscle Growth', icon: '📈' },
  { value: 'endurance', label: 'Endurance', icon: '🏃' },
  { value: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
];

// Body parts for manual mode filtering
const BODY_PARTS = [
  { id: 'chest', name: 'Chest', icon: '🪶', match: ['ch_', 'pec', 'chest'] },
  { id: 'back', name: 'Back', icon: '🔧', match: ['bk_', 'lat', 'romboid', 'trap', 'back'] },
  { id: 'shoulders', name: 'Shoulders', icon: '💪', match: ['sh_', 'delt', 'shoulder'] },
  { id: 'arms', name: 'Arms', icon: '💪', match: ['ar_', 'bicep', 'tricep', 'forearm'] },
  { id: 'legs', name: 'Legs', icon: '🦵', match: ['lg_', 'quad', 'hamstring', 'calf', 'leg'] },
  { id: 'glutes', name: 'Glutes', icon: '🍑', match: ['glute'] },
  { id: 'core', name: 'Core', icon: '🤳', match: ['core', 'ab', 'oblique'] }
];

function getBodyPart(muscles) {
  if (!muscles || !muscles.length) return null;
  const m = (muscles[0] || '').toLowerCase();
  for (const part of BODY_PARTS) {
    if (part.match.some(p => m.includes(p))) return part;
  }
  return null;
}

const CATEGORY = {
  barbell: { c: 'from-red-500 to-orange-500' },
  dumbbell: { c: 'from-blue-500 to-purple-500' },
  bodyweight: { c: 'from-green-500 to-teal-500' },
  kettlebell: { c: 'from-yellow-500 to-orange-500' },
  machine: { c: 'from-gray-500 to-gray-700' },
  cable: { c: 'from-purple-500 to-pink-500' },
  default: { c: 'from-gray-600 to-gray-700' }
};

export default function Workout() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Mode: 'select' (constraints), 'workout' (doing exercises), 'manual' (browse all)
  const [mode, setMode] = useState('select');

  // Muscle panel visibility
  const [showMusclePanel, setShowMusclePanel] = useState(true);

  // Constraint selection
  const [selectedTime, setSelectedTime] = useState(30);
  const [selectedLocation, setSelectedLocation] = useState('gym');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState(['strength']);

  // Prescription data
  const [prescription, setPrescription] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Manual mode state (original functionality)
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);

  // Shared state
  const [logged, setLogged] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [sets, setSets] = useState(3);
  const [completing, setCompleting] = useState(false);
  const [rewards, setRewards] = useState(null);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Session tracking for real-time sync
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  // Initialize session when workout mode starts
  useEffect(() => {
    if ((mode === 'workout' || mode === 'manual') && !sessionIdRef.current) {
      sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStartRef.current = Date.now();
    }
  }, [mode]);

  // Sync session to server when logged exercises change
  const syncSession = useCallback(async (loggedExercises: typeof logged) => {
    if (!token || !sessionIdRef.current || loggedExercises.length === 0) return;

    const session = {
      sessionId: sessionIdRef.current,
      isActive: true,
      startTime: sessionStartRef.current || Date.now(),
      pausedAt: null,
      totalPausedTime: 0,
      exercises: loggedExercises.map(e => ({
        id: e.id,
        name: e.name,
        primaryMuscles: e.primaryMuscles || e.primary_muscles || [],
        secondaryMuscles: e.secondaryMuscles || e.secondary_muscles || [],
      })),
      currentExercise: loggedExercises[loggedExercises.length - 1] || null,
      currentExerciseIndex: loggedExercises.length - 1,
      currentSetIndex: 0,
      sets: loggedExercises.map((e, i) => ({
        id: `set-${i}`,
        exerciseId: e.id,
        exerciseName: e.name,
        weight: e.weight || 0,
        reps: e.reps || 0,
        tag: 'working' as const,
        timestamp: Date.now(),
      })),
      totalVolume: loggedExercises.reduce((sum, e) => sum + (e.weight || 0) * (e.reps || 0) * (e.sets || 1), 0),
      totalReps: loggedExercises.reduce((sum, e) => sum + (e.reps || 0) * (e.sets || 1), 0),
      estimatedCalories: loggedExercises.length * 50,
      musclesWorked: [...new Set(loggedExercises.flatMap(e => e.primaryMuscles || e.primary_muscles || []))],
      sessionPRs: [],
      exerciseGroups: [],
      activeGroupExerciseIndex: 0,
      activeGroupRound: 1,
      groupSets: [],
      clientVersion: 1,
    };

    try {
      await syncSessionToServer(session, false);
    } catch (err) {
      console.error('Failed to sync workout session:', err);
    }
  }, [token]);

  // Sync whenever logged exercises change
  useEffect(() => {
    if (logged.length > 0 && (mode === 'workout' || mode === 'manual')) {
      syncSession(logged);
    }
  }, [logged, mode, syncSession]);

  // Clear selected equipment when location changes (equipment varies by location)
  useEffect(() => {
    setSelectedEquipment([]);
  }, [selectedLocation]);

  // Get equipment options for current location
  const currentEquipmentOptions = EQUIPMENT_BY_LOCATION[selectedLocation] || DEFAULT_EQUIPMENT_OPTIONS;

  // Get all exercises from prescription (main + warmup + cooldown)
  // Moved here so it can be used in useMemo
  const getAllPrescribedExercises = () => {
    if (!prescription) return [];
    const all: Array<{
      id?: string;
      exerciseId?: string;
      name?: string;
      description?: string;
      phase?: string;
      sets?: number;
      reps?: number | string;
      restSeconds?: number;
      notes?: string;
      primaryMuscles?: string[];
      secondaryMuscles?: string[];
      primary_muscles?: string[];
      secondary_muscles?: string[];
      isActivity?: boolean;
    }> = [];
    if (prescription.warmup) all.push(...prescription.warmup.map((e: unknown) => ({ ...(e as object), phase: 'warmup' })));
    if (prescription.exercises) all.push(...prescription.exercises.map((e: unknown) => ({ ...(e as object), phase: 'main' })));
    if (prescription.cooldown) all.push(...prescription.cooldown.map((e: unknown) => ({ ...(e as object), phase: 'cooldown' })));
    return all;
  };

  // Compute cumulative muscle activation from logged exercises
  const cumulativeMuscleActivations = useMemo((): MuscleActivation[] => {
    const muscleMap: Record<string, { intensity: number; isPrimary: boolean }> = {};

    logged.forEach((exercise) => {
      const primaryMuscles = exercise.primaryMuscles || exercise.primary_muscles || [];
      const secondaryMuscles = exercise.secondaryMuscles || exercise.secondary_muscles || [];
      const sets = exercise.sets || 3;
      const reps = exercise.reps || 10;

      // Intensity based on volume (normalized)
      const baseIntensity = Math.min(1, (sets * reps) / 50);

      primaryMuscles.forEach((muscle: string) => {
        const mappedId = mapMuscleId(muscle);
        const current = muscleMap[mappedId] || { intensity: 0, isPrimary: false };
        muscleMap[mappedId] = {
          intensity: Math.min(1, current.intensity + baseIntensity * 0.4),
          isPrimary: true,
        };
      });

      secondaryMuscles.forEach((muscle: string) => {
        const mappedId = mapMuscleId(muscle);
        const current = muscleMap[mappedId] || { intensity: 0, isPrimary: false };
        if (!current.isPrimary) {
          muscleMap[mappedId] = {
            intensity: Math.min(1, current.intensity + baseIntensity * 0.2),
            isPrimary: false,
          };
        } else {
          muscleMap[mappedId].intensity = Math.min(1, current.intensity + baseIntensity * 0.2);
        }
      });
    });

    return Object.entries(muscleMap).map(([id, { intensity, isPrimary }]) => ({
      id,
      intensity,
      isPrimary,
    }));
  }, [logged]);

  // Compute current exercise muscle activation
  const currentExerciseMuscles = useMemo((): MuscleActivation[] => {
    if (!prescription) return [];
    const allExercises = getAllPrescribedExercises();
    const current = allExercises[currentExerciseIndex];
    if (!current) return [];

    const activations: MuscleActivation[] = [];
    const primaryMuscles = current.primaryMuscles || current.primary_muscles || [];
    const secondaryMuscles = current.secondaryMuscles || current.secondary_muscles || [];

    primaryMuscles.forEach((muscle: string) => {
      activations.push({
        id: mapMuscleId(muscle),
        intensity: 1.0,
        isPrimary: true,
      });
    });

    secondaryMuscles.forEach((muscle: string) => {
      activations.push({
        id: mapMuscleId(muscle),
        intensity: 0.5,
        isPrimary: false,
      });
    });

    return activations;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription, currentExerciseIndex]);

  // Load exercises for manual mode
  useEffect(() => {
    if (mode === 'manual' && exercises.length === 0) {
      setLoading(true);
      fetch('/api/exercises').then(r => r.json()).then(d => {
        // API returns {data: [...]} - normalize primaryMuscles from comma-separated string to array
        const exerciseList = d.data || d.exercises || [];
        const normalized = exerciseList.map(ex => ({
          ...ex,
          primary_muscles: typeof ex.primaryMuscles === 'string'
            ? ex.primaryMuscles.split(',').map(m => m.trim()).filter(Boolean)
            : ex.primaryMuscles || [],
        }));
        setExercises(normalized);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [mode, exercises.length]);

  // Generate workout from prescription API
  const generateWorkout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/prescription/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeAvailable: selectedTime,
          location: selectedLocation,
          equipment: selectedEquipment,
          goals: selectedGoals,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate workout');
      }

      // API returns { data: prescription }
      const prescriptionData = result.data;
      setPrescription(prescriptionData);
      setCurrentExerciseIndex(0);
      setMode('workout');
    } catch (err) {
      setError(err.message || 'Failed to generate workout. Try different constraints.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle equipment selection
  const toggleEquipment = (eq) => {
    setSelectedEquipment(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  // Toggle goal selection
  const toggleGoal = (goal) => {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) {
        return prev.length > 1 ? prev.filter(g => g !== goal) : prev;
      }
      return [...prev, goal];
    });
  };

  // Ref to prevent race conditions during workout completion
  const completingRef = useRef(false);

  const completeWorkout = async () => {
    // Prevent double-submission with ref (handles rapid clicks before state updates)
    if (completingRef.current || logged.length === 0) return;
    completingRef.current = true;
    setCompleting(true);

    // Capture logged state at submission time to prevent race conditions
    const loggedSnapshot = [...logged];

    try {
      // Format exercises for the workouts API
      // Filter out warmup/cooldown activities that don't have real exercise IDs
      const exercises = loggedSnapshot
        .filter(e => {
          // Keep items that have a valid exercise ID (not activity placeholders)
          const hasValidId = e.id && typeof e.id === 'string' && !e.id.startsWith('activity-');
          const isNotActivity = !e.isActivity;
          return hasValidId && isNotActivity;
        })
        .map(e => ({
          exerciseId: e.id,
          sets: e.sets || 3,
          reps: typeof e.reps === 'number' ? e.reps : 10,
          weight: e.weight || undefined,
        }));

      // If no actual exercises (only activities), show message
      if (exercises.length === 0) {
        alert('No exercises to log. Complete at least one exercise (not just warmup/cooldown) to save your workout.');
        completingRef.current = false;
        setCompleting(false);
        return;
      }

      const idempotencyKey = `workout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          exercises,
          idempotencyKey,
          notes: `${logged.length} exercises completed`,
        })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        // Clear the active session from server
        if (sessionIdRef.current) {
          await clearAllSessionPersistence('completed', data.data.id);
          sessionIdRef.current = null;
          sessionStartRef.current = null;
        }
        // Capture exercise stats before clearing logged
        const exerciseCount = loggedSnapshot.length;
        const totalSets = loggedSnapshot.reduce((sum, e) => sum + (e.sets || 0), 0);

        setRewards({
          tuEarned: data.data.totalTU,
          characterStats: data.data.characterStats,
          exerciseCount,
          totalSets,
          exercises: loggedSnapshot,
        });
        setLogged([]);
      } else {
        alert(data.error?.message || data.error || 'Failed to complete workout');
      }
    } catch {
      alert('Error completing workout. Please try again.');
    } finally {
      completingRef.current = false;
      setCompleting(false);
    }
  };

  const filtered = exercises.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const part = getBodyPart(e.primary_muscles);
    const matchFilter = !filter || (part && part.id === filter);
    return matchSearch && matchFilter;
  }).slice(0, 24);

  async function logExercise() {
    if (!adding) return;
    try {
      await fetch('/api/workouts/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ exerciseId: adding.id, sets, reps, weight })
      });
      setLogged([...logged, { ...adding, sets, reps, weight }]);
      setSuccess(adding.name);
      setTimeout(() => setSuccess(null), 2000);
      setAdding(null);
    } catch {
      // Failed to log exercise
    }
  }

  const getCat = (e) => CATEGORY[e.type] || CATEGORY.default;
  const getIcon = (e) => { const p = getBodyPart(e.primary_muscles || e.primaryMuscles); return p ? p.icon : '💪'; };
  const getPartName = (e) => { const p = getBodyPart(e.primary_muscles || e.primaryMuscles); return p ? p.name : ''; };

  // Log an exercise from prescription mode
  const logPrescribedExercise = async (exercise) => {
    // Prescription API returns `id` for exercises, `isActivity` for warmup/cooldown
    const exerciseId = exercise.id || exercise.exerciseId;
    const isActivityItem = exercise.isActivity || !exerciseId;

    // For warmup/cooldown activities, just mark as done and move on (no API call needed)
    if (isActivityItem) {
      setLogged([...logged, {
        id: `activity-${Date.now()}`,
        name: exercise.name || exercise.description || 'Activity',
        sets: exercise.sets || 1,
        reps: exercise.reps || 1,
        weight: 0,
        isActivity: true, // Flag to exclude from workout submission
      }]);
      setSuccess(exercise.name || exercise.description);
      setTimeout(() => setSuccess(null), 2000);
      const allExercises = getAllPrescribedExercises();
      if (currentExerciseIndex < allExercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
      return;
    }

    try {
      await fetch('/api/workouts/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          exerciseId: exerciseId,
          sets: exercise.sets,
          reps: typeof exercise.reps === 'number' ? exercise.reps : 10,
          weight: 0
        })
      });
      setLogged([...logged, {
        id: exerciseId,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: 0,
        primaryMuscles: exercise.primaryMuscles
      }]);
      setSuccess(exercise.name);
      setTimeout(() => setSuccess(null), 2000);
      // Move to next exercise
      const allExercises = getAllPrescribedExercises();
      if (currentExerciseIndex < allExercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
    } catch {
      // Failed to log exercise
    }
  };

  // Render constraint selection screen
  const renderConstraintSelection = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <span>←</span>
            <img src="/logo.png" alt="MuscleMap" className="w-6 h-6 rounded-md" />
          </Link>
          <h1 className="text-xl font-bold">Start Workout</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Time Selection */}
        <section>
          <h2 className="text-sm text-gray-400 uppercase mb-3">How long do you have?</h2>
          <div className="grid grid-cols-4 gap-2">
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedTime(opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedTime === opt.value
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="font-bold">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Location Selection */}
        <section>
          <h2 className="text-sm text-gray-400 uppercase mb-3">Where are you?</h2>
          <div className="grid grid-cols-5 gap-2">
            {LOCATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedLocation(opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedLocation === opt.value
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="text-xs">{opt.label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Equipment Selection - changes based on location */}
        <section>
          <h2 className="text-sm text-gray-400 uppercase mb-3">
            Available at {LOCATION_OPTIONS.find(l => l.value === selectedLocation)?.label || 'Location'} (optional)
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {currentEquipmentOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleEquipment(opt.value)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedEquipment.includes(opt.value)
                    ? 'bg-green-600 ring-2 ring-green-400'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="text-xs leading-tight">{opt.label}</div>
              </button>
            ))}
          </div>
          {selectedEquipment.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">No equipment selected = bodyweight exercises</p>
          )}
          {selectedEquipment.length > 0 && (
            <p className="text-xs text-green-400 mt-2">{selectedEquipment.length} item{selectedEquipment.length > 1 ? 's' : ''} selected</p>
          )}
        </section>

        {/* Goal Selection */}
        <section>
          <h2 className="text-sm text-gray-400 uppercase mb-3">Your Goal</h2>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleGoal(opt.value)}
                className={`p-3 rounded-xl text-left transition-all ${
                  selectedGoals.includes(opt.value)
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span className="text-xl mr-2">{opt.icon}</span>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={generateWorkout}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Workout'}
        </button>

        {/* Manual Mode Link */}
        <button
          onClick={() => setMode('manual')}
          className="w-full bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-gray-400 text-sm"
        >
          Or browse all exercises manually
        </button>
      </main>
    </div>
  );

  // Render the prescription workout
  const renderWorkoutMode = () => {
    const allExercises = getAllPrescribedExercises();
    const currentExercise = allExercises[currentExerciseIndex];
    const progress = allExercises.length > 0 ? ((currentExerciseIndex + 1) / allExercises.length) * 100 : 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
        {success && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 px-8 py-4 rounded-2xl font-bold animate-bounce">Done: {success}</div>}

        <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => { setMode('select'); setPrescription(null); }} className="text-blue-400">← Exit</button>
              <h1 className="text-xl font-bold">Your Workout</h1>
              <div className="bg-green-600 px-3 py-1 rounded-full text-sm font-bold">{logged.length}/{allExercises.length}</div>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-4">
          {/* Muscle Activation Panel - Collapsible */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden mb-6 border border-white/5">
            <button
              onClick={() => setShowMusclePanel(!showMusclePanel)}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔥</div>
                <div>
                  <div className="text-sm font-medium text-white">Muscle Activation</div>
                  <div className="text-xs text-gray-400">
                    {cumulativeMuscleActivations.length} muscle groups worked
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showMusclePanel ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMusclePanel && (
              <div className="p-4 pt-0">
                <div className="flex gap-4 items-start">
                  {/* Current exercise muscles */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 uppercase mb-2">Current Exercise</div>
                    <MuscleViewer
                      muscles={currentExerciseMuscles}
                      mode="compact"
                      interactive={false}
                      showLabels={false}
                      autoRotate={false}
                      className="w-full"
                      style={{ height: 140 }}
                    />
                    {currentExercise && (
                      <div className="flex flex-wrap gap-1 mt-2 justify-center">
                        {currentExercise.primaryMuscles?.slice(0, 3).map((m: string) => (
                          <span key={m} className="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded text-xs">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cumulative workout muscles */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 uppercase mb-2">Workout Total</div>
                    <MuscleViewer
                      muscles={cumulativeMuscleActivations}
                      mode="compact"
                      interactive={false}
                      showLabels={false}
                      autoRotate={false}
                      className="w-full"
                      style={{ height: 140 }}
                    />
                    {cumulativeMuscleActivations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 justify-center">
                        {cumulativeMuscleActivations.slice(0, 3).map((m) => (
                          <span key={m.id} className="bg-green-500/30 text-green-200 px-2 py-0.5 rounded text-xs">
                            {m.id.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Workout Summary */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{prescription?.actualDuration || selectedTime} min</span>
              <span>{LOCATION_OPTIONS.find(l => l.value === selectedLocation)?.icon} {selectedLocation}</span>
              <span>{allExercises.length} exercises</span>
            </div>
            {prescription?.muscleCoverage && (
              <div className="flex flex-wrap gap-1">
                {Object.keys(prescription.muscleCoverage).slice(0, 6).map(muscle => (
                  <span key={muscle} className="bg-gray-700 px-2 py-1 rounded text-xs">{muscle}</span>
                ))}
              </div>
            )}
          </div>

          {/* Current Exercise Card */}
          {currentExercise && (
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl overflow-hidden mb-6 shadow-2xl">
              {/* Exercise Illustration */}
              {currentExercise.id && hasExerciseIllustration(currentExercise.id) && (
                <div className="h-40 bg-black/20">
                  <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />}>
                    <ExerciseIllustration
                      exerciseId={currentExercise.id}
                      exerciseName={currentExercise.name}
                      primaryMuscles={currentExercise.primaryMuscles}
                      size="md"
                      showMuscleLabels={false}
                      interactive={false}
                      className="w-full h-full"
                    />
                  </Suspense>
                </div>
              )}

              <div className="p-6">
                <div className="text-xs uppercase tracking-wide opacity-70 mb-2">
                  {currentExercise.phase === 'warmup' ? 'Warm-up' : currentExercise.phase === 'cooldown' ? 'Cool-down' : `Exercise ${currentExerciseIndex + 1 - (prescription?.warmup?.length || 0)}`}
                </div>
                <h2 className="text-2xl font-bold mb-4">{currentExercise.name}</h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{currentExercise.sets}</div>
                    <div className="text-xs opacity-80">Sets</div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{currentExercise.reps}</div>
                    <div className="text-xs opacity-80">Reps</div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <div className="text-3xl font-bold">{currentExercise.restSeconds}s</div>
                    <div className="text-xs opacity-80">Rest</div>
                  </div>
                </div>
                {currentExercise.notes && (
                  <p className="text-sm opacity-80 mb-4">{currentExercise.notes}</p>
                )}
                <div className="flex gap-2 text-xs opacity-70 flex-wrap">
                  {currentExercise.primaryMuscles?.map(m => (
                    <span key={m} className="bg-white/10 px-2 py-1 rounded">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contextual Tip */}
          {currentExercise && (
            <div className="mb-6">
              <ExerciseTip exerciseId={currentExercise.exerciseId} delay={1500} />
            </div>
          )}

          {/* Action Buttons */}
          {currentExercise && (
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => currentExerciseIndex > 0 && setCurrentExerciseIndex(currentExerciseIndex - 1)}
                disabled={currentExerciseIndex === 0}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 py-4 rounded-xl font-bold"
              >
                Previous
              </button>
              <button
                onClick={() => logPrescribedExercise(currentExercise)}
                className="flex-[2] bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-lg"
              >
                Done
              </button>
              <button
                onClick={() => currentExerciseIndex < allExercises.length - 1 && setCurrentExerciseIndex(currentExerciseIndex + 1)}
                disabled={currentExerciseIndex === allExercises.length - 1}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 py-4 rounded-xl font-bold"
              >
                Skip
              </button>
            </div>
          )}

          {/* Logged Exercises */}
          {logged.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm text-gray-400 uppercase mb-3">Completed</h3>
              <div className="space-y-2">
                {logged.map((e, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="bg-green-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">✓</div>
                    <div className="flex-1">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.sets} x {e.reps}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete Workout Button */}
          {logged.length > 0 && (
            <button
              onClick={completeWorkout}
              disabled={completing}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 py-4 rounded-2xl font-bold text-lg transition-all"
            >
              {completing ? 'Completing...' : `Complete Workout (${logged.length} exercises)`}
            </button>
          )}

          {/* Exercise List Overview */}
          <div className="mt-8">
            <h3 className="text-sm text-gray-400 uppercase mb-3">All Exercises</h3>
            <div className="space-y-2">
              {allExercises.map((e, i) => {
                const isCompleted = logged.some(l => l.name === e.name);
                const isCurrent = i === currentExerciseIndex;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentExerciseIndex(i)}
                    className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all ${
                      isCurrent ? 'bg-purple-600' : isCompleted ? 'bg-gray-800 opacity-60' : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      isCompleted ? 'bg-green-600' : isCurrent ? 'bg-white/20' : 'bg-gray-700'
                    }`}>
                      {isCompleted ? '✓' : i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.sets} x {e.reps} | {e.phase}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Render manual exercise browser (original functionality)
  const renderManualMode = () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {success && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 px-8 py-4 rounded-2xl font-bold animate-bounce">{success}!</div>}

      {adding && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => setAdding(null)}>
          <div className="bg-gray-800 rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl">{getIcon(adding)}</span>
              <div>
                <h2 className="text-xl font-bold">{adding.name}</h2>
                <p className="text-gray-400">{getPartName(adding)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <label className="text-sm text-gray-400">Sets</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={()=>setSets(Math.max(1,sets-1))} className="bg-gray-700 w-10 h-10 rounded-full text-xl">-</button>
                  <span className="text-3xl font-bold w-12 text-center">{sets}</span>
                  <button onClick={()=>setSets(sets+1)} className="bg-gray-700 w-10 h-10 rounded-full text-xl">+</button>
                </div>
              </div>
              <div className="text-center">
                <label className="text-sm text-gray-400">Reps</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={()=>setReps(Math.max(1,reps-1))} className="bg-gray-700 w-10 h-10 rounded-full text-xl">-</button>
                  <span className="text-3xl font-bold w-12 text-center">{reps}</span>
                  <button onClick={()=>setReps(reps+1)} className="bg-gray-700 w-10 h-10 rounded-full text-xl">+</button>
                </div>
              </div>
              <div className="text-center">
                <label className="text-sm text-gray-400">lbs</label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={()=>setWeight(Math.max(0,weight-5))} className="bg-gray-700 w-10 h-10 rounded-full text-xl">-</button>
                  <span className="text-3xl font-bold w-12 text-center">{weight}</span>
                  <button onClick={()=>setWeight(weight+5)} className="bg-gray-700 w-10 h-10 rounded-full text-xl">+</button>
                </div>
              </div>
            </div>
            <button onClick={logExercise} className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-bold text-lg">Log Exercise</button>
          </div>
        </div>
      )}

      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => setMode('select')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <span>←</span>
            <img src="/logo.png" alt="MuscleMap" className="w-6 h-6 rounded-md" />
          </button>
          <h1 className="text-xl font-bold">Browse Exercises</h1>
          <div className="bg-green-600 px-3 py-1 rounded-full text-sm font-bold">{logged.length} logged</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {logged.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm text-gray-400 mb-2 uppercase">Today&apos;s Workout</h2>
            <div className="grid grid-cols-2 gap-2">
              {logged.map((e, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">{getIcon(e)}</span>
                  <div>
                    <div className="font-bold text-sm truncate">{e.name}</div>
                    <div className="text-xs text-gray-400">{e.sets}x{e.reps} {e.weight>0?`${e.weight}lb`:''}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={completeWorkout} disabled={completing} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-2xl font-bold text-lg mt-4 transition-all">{completing ? "Completing..." : "Complete Workout"}</button>
          </div>
        )}

        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 rounded-2xl p-4 mb-4 text-lg"
        />

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          <button onClick={()=>setFilter(null)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${!filter?'bg-purple-600':'bg-gray-700'}`}>All</button>
          {BODY_PARTS.map(p => (
            <button key={p.id} onClick={()=>setFilter(p.id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter===p.id?'bg-purple-600':'bg-gray-700'}`}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading exercises...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(e => {
              const exerciseMuscles: MuscleActivation[] = [
                ...(e.primary_muscles || []).map((m: string) => ({ id: mapMuscleId(m), intensity: 1.0, isPrimary: true })),
                ...(e.secondary_muscles || []).slice(0, 2).map((m: string) => ({ id: mapMuscleId(m), intensity: 0.5, isPrimary: false })),
              ];
              return (
                <button
                  key={e.id}
                  onClick={() => setAdding(e)}
                  className={`bg-gradient-to-br ${getCat(e).c} rounded-2xl p-3 text-left hover:scale-105 active:scale-95 transition-all shadow-lg relative`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl">{getIcon(e)}</div>
                    {exerciseMuscles.length > 0 && (
                      <MuscleActivationBadge
                        muscles={exerciseMuscles}
                        size="xs"
                        className="opacity-90"
                      />
                    )}
                  </div>
                  <div className="font-bold text-sm truncate mt-1">{e.name}</div>
                  <div className="text-xs opacity-80">{getPartName(e)}</div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );

  // Rewards modal (using WorkoutComplete component)
  const renderRewardsModal = () => (
    rewards && (
      <WorkoutComplete
        workout={{
          duration: selectedTime,
          exerciseCount: rewards.exerciseCount || 0,
          totalSets: rewards.totalSets || 0,
          totalTU: rewards.tuEarned || 0,
          exercises: rewards.exercises || [],
          goals: selectedGoals,
        }}
        onClose={() => {
          setRewards(null);
          setMode('select');
          setPrescription(null);
          setLogged([]);
          // Navigate to dashboard after completing workout
          navigate('/dashboard');
        }}
      />
    )
  );

  return (
    <>
      {renderRewardsModal()}
      {mode === 'select' && renderConstraintSelection()}
      {mode === 'workout' && renderWorkoutMode()}
      {mode === 'manual' && renderManualMode()}
    </>
  );
}