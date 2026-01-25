/**
 * ActivityLog Page
 *
 * Multi-input workout logging system supporting:
 * - Manual entry with quick picks
 * - Voice input (Web Speech API)
 * - Text/clipboard paste
 * - Screenshot OCR import
 * - CSV/file import
 * - Health platform sync
 *
 * Mobile-first, touchscreen-optimized, step-by-step workflow.
 */

import React, { useState, useCallback, Suspense, lazy, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  ArrowLeft,
  Dumbbell,
  Mic,
  Clipboard,
  Camera,
  FileUp,
  Watch,
  Flame,
  Trophy,
  ChevronRight,
  Zap,
  History,
  Plus,
  CheckCircle2,
  Download,
  Keyboard,
} from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { SafeMotion, SafeAnimatePresence, getIsRestrictive } from '@/utils/safeMotion';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { haptic } from '@/utils/haptics';
import {
  SkipLink,
  ScreenReaderAnnouncer,
  KeyboardShortcutsHelp,
  useKeyboardShortcuts,
} from '@/components/activity-log/AccessibilityFeatures';

// Lazy load heavy components
const _QuickEntryMethods = lazy(() => import('@/components/activity-log/QuickEntryMethods'));
const ExerciseQuickPicker = lazy(() => import('@/components/activity-log/ExerciseQuickPicker'));
const WorkoutSummaryCard = lazy(() => import('@/components/activity-log/WorkoutSummaryCard'));
const VoiceInputButton = lazy(() => import('@/components/activity-log/VoiceInputButton'));
const TextImportSheet = lazy(() => import('@/components/activity-log/TextImportSheet'));
const ScreenshotImportSheet = lazy(() => import('@/components/activity-log/ScreenshotImportSheet'));
const FileImportSheet = lazy(() => import('@/components/activity-log/FileImportSheet'));
const HealthSyncSheet = lazy(() => import('@/components/activity-log/HealthSyncSheet'));
const ExportSheet = lazy(() => import('@/components/activity-log/ExportSheet'));
const OfflineIndicator = lazy(() => import('@/components/activity-log/OfflineIndicator'));

// GraphQL imports
import { gql } from '@apollo/client/core';

// ============================================
// GRAPHQL QUERIES & MUTATIONS
// ============================================

const RECENT_EXERCISES_QUERY = gql`
  query RecentExercises($limit: Int) {
    recentExercises(limit: $limit) {
      exercise {
        id
        name
        primaryMuscles
        equipment
      }
      lastUsedAt
      lastWeight
      lastReps
      lastSets
      useCount
    }
  }
`;

const SUGGESTED_WORKOUTS_QUERY = gql`
  query SuggestedWorkouts($limit: Int) {
    suggestedWorkouts(limit: $limit) {
      type
      name
      reason
      confidence
      sourceWorkoutId
      sourceDate
      exercises {
        exerciseId
        name
        suggestedSets
        suggestedReps
        suggestedWeight
        lastWeight
        lastReps
      }
    }
  }
`;

const QUICK_LOG_SET_MUTATION = gql`
  mutation QuickLogSet($input: QuickLogSetInput!) {
    quickLogSet(input: $input) {
      success
      set {
        id
        reps
        weightKg
        tu
        isPRWeight
        isPR1RM
      }
      session {
        id
        startedAt
      }
      error
    }
  }
`;

const QUICK_LOG_WORKOUT_MUTATION = gql`
  mutation QuickLogWorkout($input: QuickLogWorkoutInput!) {
    quickLogWorkout(input: $input) {
      success
      workout {
        id
        createdAt
      }
      session {
        id
      }
      tuEarned
      xpEarned
      creditsAwarded
      prsAchieved {
        exerciseId
        prType
        value
      }
      error
    }
  }
`;

// ============================================
// TYPES
// ============================================

type EntryMethod = 'quick' | 'voice' | 'text' | 'screenshot' | 'file' | 'health';

interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  source: string;
}

// ============================================
// COMPONENT
// ============================================

export default function ActivityLog() {
  const { user: _user } = useAuth();
  const _isRestrictive = getIsRestrictive();

  // State
  const [activeMethod, setActiveMethod] = useState<EntryMethod | null>(null);
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [showScreenshotImport, setShowScreenshotImport] = useState(false);
  const [showFileImport, setShowFileImport] = useState(false);
  const [showHealthSync, setShowHealthSync] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const mainContentRef = useRef<HTMLElement>(null);

  // GraphQL
  const { data: recentData, loading: recentLoading } = useQuery(RECENT_EXERCISES_QUERY, {
    variables: { limit: 10 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: suggestionsData, loading: _suggestionsLoading } = useQuery(SUGGESTED_WORKOUTS_QUERY, {
    variables: { limit: 3 },
    fetchPolicy: 'cache-and-network',
  });

  const [quickLogSet] = useMutation(QUICK_LOG_SET_MUTATION);
  const [quickLogWorkout] = useMutation(QUICK_LOG_WORKOUT_MUTATION);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewEntry: () => {
      setShowExercisePicker(true);
      setAnnouncement('Exercise picker opened');
    },
    onVoice: () => {
      setActiveMethod('voice');
      setAnnouncement('Voice input activated');
    },
    onPaste: () => {
      setShowTextImport(true);
      setAnnouncement('Text import opened');
    },
    onSearch: () => {
      setShowExercisePicker(true);
      setAnnouncement('Search exercises');
    },
    onShowHelp: () => setShowKeyboardHelp(true),
    disabled: showExercisePicker || showTextImport || showScreenshotImport || showFileImport || showHealthSync || showExport || showKeyboardHelp,
  });

  // Handlers
  const handleMethodSelect = useCallback((method: EntryMethod) => {
    haptic('light');
    setActiveMethod(method);

    switch (method) {
      case 'quick':
        setShowExercisePicker(true);
        break;
      case 'voice':
        // Voice input handled by VoiceInputButton
        break;
      case 'text':
        setShowTextImport(true);
        break;
      case 'screenshot':
        setShowScreenshotImport(true);
        break;
      case 'file':
        setShowFileImport(true);
        break;
      case 'health':
        setShowHealthSync(true);
        break;
    }
  }, []);

  const handleExerciseSelect = useCallback(async (exercise: {
    id: string;
    name: string;
    weight?: number;
    reps?: number;
    sets?: number;
  }) => {
    haptic('medium');
    setIsLogging(true);

    try {
      const result = await quickLogSet({
        variables: {
          input: {
            exerciseId: exercise.id,
            weight: exercise.weight || 0,
            reps: exercise.reps || 10,
            source: 'MANUAL',
          },
        },
      });

      if (result.data?.quickLogSet?.success) {
        setLoggedExercises(prev => [...prev, {
          exerciseId: exercise.id,
          name: exercise.name,
          sets: exercise.sets || 1,
          reps: exercise.reps || 10,
          weight: exercise.weight,
          source: 'manual',
        }]);

        setSuccessMessage(`Logged ${exercise.name}!`);
        setTimeout(() => setSuccessMessage(null), 2000);

        // Check for PR
        if (result.data.quickLogSet.set?.isPRWeight || result.data.quickLogSet.set?.isPR1RM) {
          haptic('success');
        }
      }
    } catch (err) {
      console.error('Failed to log exercise:', err);
    } finally {
      setIsLogging(false);
      setShowExercisePicker(false);
    }
  }, [quickLogSet]);

  const handleVoiceResult = useCallback((parsed: {
    exerciseName: string;
    exerciseId?: string;
    weight?: number;
    reps?: number;
    sets?: number;
  }) => {
    if (parsed.exerciseId) {
      handleExerciseSelect({
        id: parsed.exerciseId,
        name: parsed.exerciseName,
        weight: parsed.weight,
        reps: parsed.reps,
        sets: parsed.sets,
      });
    } else {
      // Need to match exercise
      setShowExercisePicker(true);
    }
  }, [handleExerciseSelect]);

  const handleTextImport = useCallback((exercises: LoggedExercise[]) => {
    setLoggedExercises(prev => [...prev, ...exercises]);
    setShowTextImport(false);
    haptic('success');
    setSuccessMessage(`Imported ${exercises.length} exercises!`);
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  const handleScreenshotImport = useCallback((parsedExercises: Array<{
    exerciseName: string;
    sets: Array<{ weight?: number; reps?: number; setNumber: number }>;
  }>) => {
    const exercises: LoggedExercise[] = parsedExercises.map(e => ({
      exerciseId: e.exerciseName.toLowerCase().replace(/\s+/g, '-'),
      name: e.exerciseName,
      sets: e.sets.length,
      reps: e.sets[0]?.reps || 10,
      weight: e.sets[0]?.weight,
      source: 'screenshot',
    }));
    setLoggedExercises(prev => [...prev, ...exercises]);
    setShowScreenshotImport(false);
    haptic('success');
    setSuccessMessage(`Imported ${exercises.length} exercises from screenshot!`);
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  const handleFileImport = useCallback((parsedExercises: Array<{
    exerciseName: string;
    sets: Array<{ weight?: number; reps?: number; setNumber: number }>;
  }>) => {
    const exercises: LoggedExercise[] = parsedExercises.map(e => ({
      exerciseId: e.exerciseName.toLowerCase().replace(/\s+/g, '-'),
      name: e.exerciseName,
      sets: e.sets.length,
      reps: e.sets[0]?.reps || 10,
      weight: e.sets[0]?.weight,
      source: 'file',
    }));
    setLoggedExercises(prev => [...prev, ...exercises]);
    setShowFileImport(false);
    haptic('success');
    setSuccessMessage(`Imported ${exercises.length} exercises from file!`);
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  const handleCompleteWorkout = useCallback(async () => {
    if (loggedExercises.length === 0) return;

    haptic('medium');
    setIsLogging(true);

    try {
      const result = await quickLogWorkout({
        variables: {
          input: {
            source: 'MANUAL',
            exercises: loggedExercises.map(e => ({
              exerciseId: e.exerciseId,
              sets: [{ weight: e.weight || 0, reps: e.reps }],
            })),
          },
        },
      });

      if (result.data?.quickLogWorkout?.success) {
        haptic('success');
        setSuccessMessage(`Workout complete! +${result.data.quickLogWorkout.tuEarned} TU`);
        setLoggedExercises([]);
      }
    } catch (err) {
      console.error('Failed to complete workout:', err);
    } finally {
      setIsLogging(false);
    }
  }, [loggedExercises, quickLogWorkout]);

  // Entry method cards
  const entryMethods = [
    {
      id: 'quick' as const,
      label: 'Quick Log',
      description: 'Recent exercises',
      icon: Dumbbell,
      color: 'from-blue-600 to-blue-500',
      available: true,
    },
    {
      id: 'voice' as const,
      label: 'Voice',
      description: 'Say it',
      icon: Mic,
      color: 'from-purple-600 to-purple-500',
      available: true,
    },
    {
      id: 'text' as const,
      label: 'Paste',
      description: 'From clipboard',
      icon: Clipboard,
      color: 'from-green-600 to-green-500',
      available: true,
    },
    {
      id: 'screenshot' as const,
      label: 'Screenshot',
      description: 'OCR import',
      icon: Camera,
      color: 'from-orange-600 to-orange-500',
      available: true,
    },
    {
      id: 'file' as const,
      label: 'Import',
      description: 'CSV, JSON',
      icon: FileUp,
      color: 'from-cyan-600 to-cyan-500',
      available: true,
    },
    {
      id: 'health' as const,
      label: 'Sync',
      description: 'Apple, Garmin',
      icon: Watch,
      color: 'from-red-600 to-red-500',
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {/* Accessibility: Skip Link */}
      <SkipLink targetId="main-content" />

      {/* Accessibility: Screen Reader Announcements */}
      <ScreenReaderAnnouncer message={announcement} />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Success Toast */}
      <SafeAnimatePresence>
        {successMessage && (
          <SafeMotion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>

      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/workout"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Back to workout"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="hidden sm:inline">Workout</span>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" aria-hidden="true" />
            Activity Log
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="hidden sm:flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors min-h-[44px] px-2"
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors min-h-[44px] min-w-[44px] justify-center"
              title="Export Data"
              aria-label="Export workout data"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        {/* Offline indicator */}
        <Suspense fallback={null}>
          <OfflineIndicator className="mt-2 max-w-5xl mx-auto" />
        </Suspense>
      </header>

      <main
        id="main-content"
        ref={mainContentRef}
        className="max-w-lg mx-auto p-4 space-y-6"
        role="main"
        aria-label="Activity Log main content"
        tabIndex={-1}
      >
        {/* Quick Stats Bar */}
        <div className="flex items-center justify-between bg-gray-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-xl">
              <Flame className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Today</p>
              <p className="font-bold">{loggedExercises.length} exercises</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-xl">
              <Trophy className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Streak</p>
              <p className="font-bold">3 days</p>
            </div>
          </div>
        </div>

        {/* Entry Methods Grid */}
        <section aria-labelledby="log-activity-heading">
          <h2 id="log-activity-heading" className="text-sm text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Log Activity
          </h2>
          <div className="grid grid-cols-3 gap-3" role="group" aria-label="Workout entry methods">
            {entryMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => method.available && handleMethodSelect(method.id)}
                  disabled={!method.available}
                  aria-label={`${method.label}: ${method.description}${!method.available ? ' (coming soon)' : ''}`}
                  aria-disabled={!method.available}
                  className={`
                    relative rounded-2xl p-4 text-center transition-all min-h-[100px]
                    ${method.available
                      ? `bg-gradient-to-br ${method.color} hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-gray-900`
                      : 'bg-gray-800/50 opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  {!method.available && (
                    <span className="absolute top-2 right-2 text-[10px] bg-gray-700 px-1.5 py-0.5 rounded-full" aria-hidden="true">
                      Soon
                    </span>
                  )}
                  <Icon className="w-6 h-6 mx-auto mb-2" aria-hidden="true" />
                  <p className="font-medium text-sm">{method.label}</p>
                  <p className="text-xs opacity-80">{method.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Voice Input - Inline when active */}
        {activeMethod === 'voice' && (
          <Suspense fallback={<div className="h-24 bg-gray-800/50 rounded-2xl animate-pulse" />}>
            <VoiceInputButton
              onResult={handleVoiceResult}
              onClose={() => setActiveMethod(null)}
            />
          </Suspense>
        )}

        {/* Recent Exercises */}
        <section aria-labelledby="recent-exercises-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="recent-exercises-heading" className="text-sm text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <History className="w-4 h-4" aria-hidden="true" />
              Recent Exercises
            </h2>
            <button
              onClick={() => setShowExercisePicker(true)}
              className="text-blue-400 text-sm hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 rounded px-1"
              aria-label="See all exercises"
            >
              See all →
            </button>
          </div>

          {recentLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recentData?.recentExercises?.slice(0, 5).map((item: {
                exercise: { id: string; name: string; primaryMuscles: string[] };
                lastWeight: number | null;
                lastReps: number | null;
                lastSets: number | null;
                useCount: number;
              }) => (
                <button
                  key={item.exercise.id}
                  onClick={() => handleExerciseSelect({
                    id: item.exercise.id,
                    name: item.exercise.name,
                    weight: item.lastWeight || undefined,
                    reps: item.lastReps || undefined,
                    sets: item.lastSets || undefined,
                  })}
                  className="w-full bg-gray-800/50 hover:bg-gray-800 rounded-xl p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Dumbbell className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{item.exercise.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.lastWeight ? `${Math.round(item.lastWeight * 2.205)} lbs` : 'Bodyweight'} × {item.lastReps || 10}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              ))}

              {(!recentData?.recentExercises || recentData.recentExercises.length === 0) && (
                <div className="bg-gray-800/30 rounded-xl p-6 text-center">
                  <Dumbbell className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">No recent exercises</p>
                  <p className="text-sm text-gray-500">Start logging to see your history</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Suggested Workouts */}
        {suggestionsData?.suggestedWorkouts?.length > 0 && (
          <section>
            <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Pick
            </h2>
            <div className="space-y-2">
              {suggestionsData.suggestedWorkouts.map((suggestion: {
                name: string;
                type: string;
                reason: string;
                exercises: { name: string }[];
              }, index: number) => (
                <button
                  key={index}
                  className="w-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/20 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{suggestion.name}</p>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      {suggestion.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{suggestion.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {suggestion.exercises.slice(0, 3).map(e => e.name).join(' • ')}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Logged Exercises Summary */}
        {loggedExercises.length > 0 && (
          <Suspense fallback={<div className="h-32 bg-gray-800/50 rounded-2xl animate-pulse" />}>
            <WorkoutSummaryCard
              exercises={loggedExercises}
              onComplete={handleCompleteWorkout}
              onRemove={(index) => {
                setLoggedExercises(prev => prev.filter((_, i) => i !== index));
                haptic('light');
              }}
              isLoading={isLogging}
            />
          </Suspense>
        )}
      </main>

      {/* Exercise Picker Bottom Sheet */}
      <BottomSheet
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        title="Select Exercise"
        snapPoints={[0.7, 0.9]}
      >
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-800/50 rounded-xl" />}>
          <ExerciseQuickPicker
            onSelect={handleExerciseSelect}
            recentExercises={recentData?.recentExercises || []}
          />
        </Suspense>
      </BottomSheet>

      {/* Text Import Bottom Sheet */}
      <BottomSheet
        isOpen={showTextImport}
        onClose={() => setShowTextImport(false)}
        title="Paste Workout"
        snapPoints={[0.6, 0.9]}
      >
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800/50 rounded-xl" />}>
          <TextImportSheet
            onImport={handleTextImport}
            onClose={() => setShowTextImport(false)}
          />
        </Suspense>
      </BottomSheet>

      {/* Screenshot Import Bottom Sheet */}
      <BottomSheet
        isOpen={showScreenshotImport}
        onClose={() => setShowScreenshotImport(false)}
        title="Screenshot Import"
        snapPoints={[0.7, 0.9]}
      >
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800/50 rounded-xl" />}>
          <ScreenshotImportSheet
            onImport={handleScreenshotImport}
            onClose={() => setShowScreenshotImport(false)}
          />
        </Suspense>
      </BottomSheet>

      {/* File Import Bottom Sheet */}
      <BottomSheet
        isOpen={showFileImport}
        onClose={() => setShowFileImport(false)}
        title="File Import"
        snapPoints={[0.7, 0.9]}
      >
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800/50 rounded-xl" />}>
          <FileImportSheet
            onImport={handleFileImport}
            onClose={() => setShowFileImport(false)}
          />
        </Suspense>
      </BottomSheet>

      {/* Health Sync Bottom Sheet */}
      <BottomSheet
        isOpen={showHealthSync}
        onClose={() => setShowHealthSync(false)}
        title="Health Sync"
        snapPoints={[0.8, 0.95]}
      >
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800/50 rounded-xl" />}>
          <HealthSyncSheet
            onClose={() => setShowHealthSync(false)}
          />
        </Suspense>
      </BottomSheet>

      {/* Export Bottom Sheet */}
      <BottomSheet
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        title="Export Data"
        snapPoints={[0.8, 0.95]}
      >
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-800/50 rounded-xl" />}>
          <ExportSheet
            onClose={() => setShowExport(false)}
          />
        </Suspense>
      </BottomSheet>
    </div>
  );
}
