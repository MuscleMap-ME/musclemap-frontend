import React, { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { hasExerciseIllustration } from '@musclemap/shared';
import { MuscleViewer, MuscleActivationBadge } from '../components/muscle-viewer';
import type { MuscleActivation } from '../components/muscle-viewer/types';
import { ExerciseImageUploadButton } from '../components/ExerciseImageUpload';

// Lazy load illustration component
const ExerciseIllustration = lazy(() =>
  import('../components/illustrations').then(m => ({ default: m.ExerciseIllustration }))
);

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  Dumbbell: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7"/></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Target: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Body: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 0l-3 8m3-8l3 8m-6-7l-3-1m9 1l3-1"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
};

const DIFFICULTY_LABELS = {
  1: { label: 'Beginner', color: 'text-emerald-400 bg-emerald-500/20' },
  2: { label: 'Easy', color: 'text-teal-400 bg-teal-500/20' },
  3: { label: 'Moderate', color: 'text-amber-400 bg-amber-500/20' },
  4: { label: 'Hard', color: 'text-orange-400 bg-orange-500/20' },
  5: { label: 'Expert', color: 'text-rose-400 bg-rose-500/20' },
};

const EXERCISE_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'freeweight', label: 'Free Weights' },
];

// Exercise categories with icons and subcategories
const EXERCISE_CATEGORIES = {
  chest: {
    name: 'Chest',
    icon: '💪',
    color: 'from-red-500 to-rose-600',
    subcategories: {
      push: { name: 'Push Exercises', icon: '🏋️' },
      fly: { name: 'Fly Movements', icon: '🦅' },
      press: { name: 'Press Variations', icon: '⬆️' },
    }
  },
  back: {
    name: 'Back',
    icon: '🦴',
    color: 'from-blue-500 to-indigo-600',
    subcategories: {
      pull: { name: 'Pull Exercises', icon: '🔙' },
      row: { name: 'Row Variations', icon: '🚣' },
      lat: { name: 'Lat Focus', icon: '📐' },
    }
  },
  shoulders: {
    name: 'Shoulders',
    icon: '🎯',
    color: 'from-orange-500 to-amber-600',
    subcategories: {
      press: { name: 'Overhead Press', icon: '⬆️' },
      lateral: { name: 'Lateral Raises', icon: '↔️' },
      rear: { name: 'Rear Delts', icon: '🔄' },
    }
  },
  arms: {
    name: 'Arms',
    icon: '💪',
    color: 'from-purple-500 to-violet-600',
    subcategories: {
      biceps: { name: 'Biceps', icon: '💪' },
      triceps: { name: 'Triceps', icon: '🔺' },
      forearms: { name: 'Forearms', icon: '✊' },
    }
  },
  legs: {
    name: 'Legs',
    icon: '🦵',
    color: 'from-green-500 to-emerald-600',
    subcategories: {
      quads: { name: 'Quadriceps', icon: '🦵' },
      hamstrings: { name: 'Hamstrings', icon: '🏃' },
      calves: { name: 'Calves', icon: '👟' },
    }
  },
  glutes: {
    name: 'Glutes',
    icon: '🍑',
    color: 'from-pink-500 to-rose-600',
    subcategories: {
      hip_thrust: { name: 'Hip Thrusts', icon: '⬆️' },
      squat: { name: 'Squat Variations', icon: '🏋️' },
      isolation: { name: 'Isolation', icon: '🎯' },
    }
  },
  core: {
    name: 'Core',
    icon: '🔥',
    color: 'from-yellow-500 to-orange-600',
    subcategories: {
      abs: { name: 'Abs', icon: '🎯' },
      obliques: { name: 'Obliques', icon: '↗️' },
      lower_back: { name: 'Lower Back', icon: '🔙' },
    }
  },
  cardio: {
    name: 'Cardio',
    icon: '❤️',
    color: 'from-cyan-500 to-blue-600',
    subcategories: {
      hiit: { name: 'HIIT', icon: '⚡' },
      steady: { name: 'Steady State', icon: '🏃' },
      plyo: { name: 'Plyometrics', icon: '🦘' },
    }
  },
  full_body: {
    name: 'Full Body',
    icon: '🏆',
    color: 'from-violet-500 to-purple-600',
    subcategories: {
      compound: { name: 'Compound Lifts', icon: '🏋️' },
      functional: { name: 'Functional', icon: '⚡' },
      olympic: { name: 'Olympic', icon: '🥇' },
    }
  },
};

// Map muscle names/IDs to categories
// Includes both database muscle IDs (e.g., 'quad-rectus') and common names
const MUSCLE_TO_CATEGORY = {
  // Chest - DB IDs
  'chest-upper': 'chest',
  'chest-mid': 'chest',
  'chest-lower': 'chest',
  'pec-minor': 'chest',
  // Chest - common names
  'chest': 'chest',
  'pectoralis major': 'chest',
  'pectoralis minor': 'chest',
  'upper chest': 'chest',
  'lower chest': 'chest',

  // Back - DB IDs
  'lats': 'back',
  'rhomboids': 'back',
  'traps-upper': 'back',
  'traps-mid': 'back',
  'traps-lower': 'back',
  'erector-spinae': 'back',
  'teres-major': 'back',
  'teres-minor': 'back',
  'infraspinatus': 'back',
  // Back - common names
  'back': 'back',
  'latissimus dorsi': 'back',
  'trapezius': 'back',
  'traps': 'back',
  'erector spinae': 'back',

  // Shoulders - DB IDs
  'delt-front': 'shoulders',
  'delt-side': 'shoulders',
  'delt-rear': 'shoulders',
  'rotator-cuff': 'shoulders',
  // Shoulders - common names
  'shoulders': 'shoulders',
  'deltoids': 'shoulders',
  'anterior deltoid': 'shoulders',
  'lateral deltoid': 'shoulders',
  'posterior deltoid': 'shoulders',
  'front delts': 'shoulders',
  'side delts': 'shoulders',
  'rear delts': 'shoulders',

  // Arms - DB IDs
  'bicep-long': 'arms',
  'bicep-short': 'arms',
  'tricep-long': 'arms',
  'tricep-lateral': 'arms',
  'tricep-medial': 'arms',
  'brachialis': 'arms',
  'brachioradialis': 'arms',
  'forearm-flexors': 'arms',
  'forearm-extensors': 'arms',
  // Arms - common names
  'biceps': 'arms',
  'triceps': 'arms',
  'forearms': 'arms',

  // Legs - DB IDs
  'quad-rectus': 'legs',
  'quad-vastus-lat': 'legs',
  'quad-vastus-med': 'legs',
  'quad-vastus-int': 'legs',
  'hamstring-bicep': 'legs',
  'hamstring-semi-t': 'legs',
  'hamstring-semi-m': 'legs',
  'gastrocnemius': 'legs',
  'soleus': 'legs',
  'tibialis-ant': 'legs',
  'adductors': 'legs',
  'abductors': 'legs',
  // Legs - common names
  'quadriceps': 'legs',
  'quads': 'legs',
  'hamstrings': 'legs',
  'calves': 'legs',

  // Glutes - DB IDs
  'glute-max': 'glutes',
  'glute-med': 'glutes',
  'glute-min': 'glutes',
  'hip-flexors': 'glutes',
  'tensor-fl': 'glutes',
  // Glutes - common names
  'glutes': 'glutes',
  'gluteus maximus': 'glutes',
  'gluteus medius': 'glutes',
  'hip flexors': 'glutes',

  // Core - DB IDs
  'rectus-abdominis': 'core',
  'obliques-ext': 'core',
  'obliques-int': 'core',
  'transverse-abdominis': 'core',
  'serratus': 'core',
  'lower-back': 'core',
  // Core - common names
  'abs': 'core',
  'abdominals': 'core',
  'rectus abdominis': 'core',
  'obliques': 'core',
  'transverse abdominis': 'core',
  'lower back': 'core',
  'core': 'core',
};

// Get category for exercise based on primary muscles
const getExerciseCategory = (exercise) => {
  if (exercise.category) return exercise.category;

  const primaryMuscle = exercise.primaryMuscles?.[0]?.toLowerCase();
  if (!primaryMuscle) return 'full_body';

  return MUSCLE_TO_CATEGORY[primaryMuscle] || 'full_body';
};

const IllustrationFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 animate-pulse rounded-lg" />
);

// Convert exercise muscles to MuscleActivation format
const exerciseToMuscleActivations = (exercise: { primaryMuscles?: string[]; secondaryMuscles?: string[] }): MuscleActivation[] => {
  const activations: MuscleActivation[] = [];

  // Map database muscle IDs to our visualization muscle IDs
  const muscleMapping: Record<string, string> = {
    'chest-upper': 'chest', 'chest-mid': 'chest', 'chest-lower': 'chest', 'pec-minor': 'chest',
    'lats': 'lats', 'rhomboids': 'upper_back', 'traps-upper': 'traps', 'traps-mid': 'traps', 'traps-lower': 'traps',
    'erector-spinae': 'lower_back', 'teres-major': 'upper_back', 'teres-minor': 'upper_back',
    'delt-front': 'front_delts', 'delt-side': 'side_delts', 'delt-rear': 'rear_delts',
    'bicep-long': 'biceps', 'bicep-short': 'biceps', 'brachialis': 'biceps',
    'tricep-long': 'triceps', 'tricep-lateral': 'triceps', 'tricep-medial': 'triceps',
    'brachioradialis': 'forearms', 'forearm-flexors': 'forearms', 'forearm-extensors': 'forearms',
    'quad-rectus': 'quads', 'quad-vastus-lat': 'quads', 'quad-vastus-med': 'quads', 'quad-vastus-int': 'quads',
    'hamstring-bicep': 'hamstrings', 'hamstring-semi-t': 'hamstrings', 'hamstring-semi-m': 'hamstrings',
    'gastrocnemius': 'calves', 'soleus': 'calves',
    'glute-max': 'glutes', 'glute-med': 'glutes', 'glute-min': 'glutes',
    'hip-flexors': 'hip_flexors', 'adductors': 'adductors',
    'rectus-abdominis': 'abs', 'obliques-ext': 'obliques', 'obliques-int': 'obliques',
    // Common name mappings
    'chest': 'chest', 'back': 'upper_back', 'shoulders': 'front_delts',
    'biceps': 'biceps', 'triceps': 'triceps', 'forearms': 'forearms',
    'quadriceps': 'quads', 'quads': 'quads', 'hamstrings': 'hamstrings', 'calves': 'calves',
    'glutes': 'glutes', 'abs': 'abs', 'core': 'abs', 'obliques': 'obliques',
  };

  exercise.primaryMuscles?.forEach(muscle => {
    const mapped = muscleMapping[muscle.toLowerCase()] || muscle.toLowerCase();
    if (!activations.find(a => a.id === mapped)) {
      activations.push({ id: mapped, intensity: 1.0, isPrimary: true });
    }
  });

  exercise.secondaryMuscles?.forEach(muscle => {
    const mapped = muscleMapping[muscle.toLowerCase()] || muscle.toLowerCase();
    if (!activations.find(a => a.id === mapped)) {
      activations.push({ id: mapped, intensity: 0.5, isPrimary: false });
    }
  });

  return activations;
};

const ExerciseCard = ({ exercise, onClick }) => {
  const difficulty = DIFFICULTY_LABELS[exercise.difficulty] || DIFFICULTY_LABELS[2];
  const hasIllustration = exercise.illustration?.hasIllustration || hasExerciseIllustration(exercise.id);
  const hasWgerImage = !!exercise.imageUrl;
  const muscleActivations = useMemo(() => exerciseToMuscleActivations(exercise), [exercise]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(exercise)}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
    >
      {/* Exercise image - prefer external images, fall back to illustrations, then muscle visualization */}
      {hasWgerImage ? (
        <div className="relative h-32 bg-[#0d0d12] border-b border-white/5 overflow-hidden">
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
          {/* Attribution badge - show source */}
          <div className="absolute bottom-1 right-1 text-[8px] text-gray-500 bg-black/60 px-1 rounded">
            {exercise.imageUrl?.includes('free-exercise-db') ? 'free-exercise-db' : 'wger.de'}
          </div>
        </div>
      ) : hasIllustration ? (
        <div className="relative h-32 bg-[#0d0d12] border-b border-white/5">
          <Suspense fallback={<IllustrationFallback />}>
            <ExerciseIllustration
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              primaryMuscles={exercise.primaryMuscles}
              size="sm"
              showMuscleLabels={false}
              interactive={false}
              className="w-full h-full"
            />
          </Suspense>
        </div>
      ) : muscleActivations.length > 0 ? (
        // Fallback: Show muscle badge visualization when no image available
        <div className="relative h-32 bg-gradient-to-br from-[#0d0d12] via-[#12121a] to-[#0f0f18] border-b border-white/5">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Large centered muscle badge */}
            <MuscleActivationBadge
              muscles={muscleActivations}
              size={80}
              showGlow={true}
            />
          </div>
          {/* Muscle names */}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
            <span className="text-[8px] text-gray-400 bg-black/60 px-1.5 py-0.5 rounded capitalize truncate max-w-[60%]">
              {exercise.primaryMuscles?.slice(0, 2).join(', ') || exercise.type || 'bodyweight'}
            </span>
            <span className="text-[8px] text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">
              No image
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-white">{exercise.name}</h3>
          <div className="flex items-center gap-2">
            {/* Muscle activation badge */}
            {muscleActivations.length > 0 && (
              <MuscleActivationBadge
                muscles={muscleActivations}
                size={28}
                showGlow={false}
              />
            )}
            <span className={clsx('text-xs px-2 py-0.5 rounded-full', difficulty.color)}>
              {difficulty.label}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {exercise.description || 'No description available'}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Icons.Clock />
            <span>{exercise.estimatedSeconds || 45}s</span>
          </div>
          {exercise.isCompound && (
            <div className="flex items-center gap-1">
              <Icons.Target />
              <span>Compound</span>
            </div>
          )}
          {exercise.primaryMuscles?.length > 0 && (
            <div className="text-gray-400">
              {exercise.primaryMuscles.slice(0, 2).join(', ')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ExerciseModal = ({ exercise, onClose }) => {
  if (!exercise) return null;

  const difficulty = DIFFICULTY_LABELS[exercise.difficulty] || DIFFICULTY_LABELS[2];
  const hasIllustration = exercise.illustration?.hasIllustration || hasExerciseIllustration(exercise.id);
  const hasWgerImage = !!exercise.imageUrl;
  const muscleActivations = exerciseToMuscleActivations(exercise);
  const hasVisual = hasWgerImage || hasIllustration;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Visual header: Image/Illustration + 3D Muscle Viewer side by side */}
        <div className="relative border-b border-white/10 rounded-t-2xl overflow-hidden">
          <div className="flex">
            {/* Exercise image or illustration */}
            {hasWgerImage ? (
              <div className="flex-1 h-48 bg-[#0d0d12] relative">
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="w-full h-full object-contain"
                />
                {/* Attribution - show correct source */}
                <div className="absolute bottom-2 left-2 text-[10px] text-gray-400 bg-black/70 px-2 py-0.5 rounded">
                  Image: {exercise.imageUrl?.includes('free-exercise-db') ? 'free-exercise-db' : 'wger.de'} ({exercise.imageLicense || 'CC-BY-SA'})
                </div>
              </div>
            ) : hasIllustration ? (
              <div className="flex-1 h-48 bg-[#0d0d12]">
                <Suspense fallback={<IllustrationFallback />}>
                  <ExerciseIllustration
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    primaryMuscles={exercise.primaryMuscles}
                    size="md"
                    showMuscleLabels={true}
                    interactive={true}
                    className="w-full h-full"
                  />
                </Suspense>
              </div>
            ) : null}
            {/* 3D Muscle Visualization */}
            {muscleActivations.length > 0 && (
              <div className={clsx(
                'h-48 bg-[#0d0d12]',
                hasVisual ? 'w-40 border-l border-white/5' : 'flex-1'
              )}>
                <MuscleViewer
                  muscles={muscleActivations}
                  mode="inline"
                  interactive={false}
                  showLabels={false}
                  autoRotate={true}
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
          {/* Community image upload button */}
          <div className="px-4 py-2 bg-black/30 border-t border-white/5">
            <ExerciseImageUploadButton
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              hasImage={hasWgerImage}
              onUploadSuccess={() => {
                // Refresh exercise data after upload
                // The user will see "pending review" status
              }}
            />
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full', difficulty.color)}>
                  {difficulty.label}
                </span>
                <span className="text-xs text-gray-500 capitalize">{exercise.type}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {exercise.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                <p className="text-white">{exercise.description}</p>
              </div>
            )}

            {exercise.cues && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Cues</h3>
                <p className="text-white">{exercise.cues}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Duration</div>
                <div className="text-white font-medium">{exercise.estimatedSeconds || 45}s</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Rest</div>
                <div className="text-white font-medium">{exercise.restSeconds || 60}s</div>
              </div>
            </div>

            {exercise.primaryMuscles?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Primary Muscles</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.primaryMuscles.map(muscle => (
                    <span key={muscle} className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded-lg text-xs">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.equipmentRequired?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Equipment Required</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipmentRequired.map(eq => (
                    <span key={eq} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exercise.locations?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Available Locations</h3>
                <div className="flex flex-wrap gap-2">
                  {exercise.locations.map(loc => (
                    <span key={loc} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs capitalize">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Category Card Component
const CategoryCard = ({ category, exerciseCount, onClick }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={clsx(
      'relative overflow-hidden rounded-2xl p-4 text-left transition-all',
      'bg-gradient-to-br',
      category.color,
      'hover:shadow-lg hover:shadow-black/20'
    )}
  >
    <div className="flex items-start justify-between">
      <div className="text-4xl mb-3">{category.icon}</div>
      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
        {exerciseCount}
      </span>
    </div>
    <h3 className="text-lg font-bold text-white">{category.name}</h3>
    <p className="text-xs text-white/70 mt-1">
      {Object.keys(category.subcategories || {}).length} subcategories
    </p>
  </motion.button>
);

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' | 'list' | 'muscle'
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]); // For muscle-first discovery

  useEffect(() => {
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          // Normalize primaryMuscles to always be an array
          // Handles PostgreSQL array format: {"muscle1","muscle2"}
          const normalized = data.data.map(ex => {
            let muscles = [];
            if (Array.isArray(ex.primaryMuscles)) {
              muscles = ex.primaryMuscles;
            } else if (typeof ex.primaryMuscles === 'string') {
              // Parse PostgreSQL array format: {"chest-upper","delt-front"}
              const pgArrayMatch = ex.primaryMuscles.match(/^\{(.+)\}$/);
              if (pgArrayMatch) {
                // Remove quotes and split by comma
                muscles = pgArrayMatch[1]
                  .split(',')
                  .map(m => m.replace(/^"|"$/g, '').trim())
                  .filter(Boolean);
              } else {
                muscles = ex.primaryMuscles.split(',').map(m => m.trim()).filter(Boolean);
              }
            }
            return {
              ...ex,
              primaryMuscles: muscles,
              category: getExerciseCategory({ ...ex, primaryMuscles: muscles }),
            };
          });
          setExercises(normalized);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Count exercises per category
  const exercisesByCategory = exercises.reduce((acc, ex) => {
    const cat = ex.category || 'full_body';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Handle muscle click from MuscleViewer
  const handleMuscleClick = useCallback((muscleId: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleId)
        ? prev.filter(m => m !== muscleId)
        : [...prev, muscleId]
    );
  }, []);

  // Create muscle activations for the selector based on selected muscles
  const selectorMuscleActivations = useMemo((): MuscleActivation[] =>
    selectedMuscles.map(id => ({ id, intensity: 1.0, isPrimary: true })),
    [selectedMuscles]
  );

  // Check if an exercise targets any of the selected muscles
  const exerciseMatchesMuscles = useCallback((exercise: { primaryMuscles?: string[]; secondaryMuscles?: string[] }) => {
    if (selectedMuscles.length === 0) return true;

    const exerciseMuscles = exerciseToMuscleActivations(exercise);
    return selectedMuscles.some(selectedMuscle =>
      exerciseMuscles.some(em => em.id === selectedMuscle)
    );
  }, [selectedMuscles]);

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.description?.toLowerCase().includes(search.toLowerCase()) ||
      ex.primaryMuscles?.some(m => m.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'all' || ex.type === selectedType;

    const matchesCategory = !selectedCategory || ex.category === selectedCategory;

    const matchesMuscles = exerciseMatchesMuscles(ex);

    return matchesSearch && matchesType && matchesCategory && matchesMuscles;
  });

  // Handle category selection
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setViewMode('list');
  };

  // Handle back to categories
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedMuscles([]);
    setViewMode('categories');
    setSearch('');
  };

  // Clear muscle selection
  const clearMuscleSelection = () => {
    setSelectedMuscles([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {viewMode === 'list' && selectedCategory ? (
              <button onClick={handleBackToCategories} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <Icons.Back />
              </button>
            ) : (
              <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <Icons.Back />
              </Link>
            )}
            <div>
              <h1 className="font-semibold text-lg">
                {selectedCategory ? EXERCISE_CATEGORIES[selectedCategory]?.name : 'Exercise Library'}
              </h1>
              {selectedCategory && (
                <p className="text-xs text-gray-400">{filteredExercises.length} exercises</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Muscle view toggle */}
            <button
              onClick={() => {
                if (viewMode === 'muscle') {
                  handleBackToCategories();
                } else {
                  setViewMode('muscle');
                  setSelectedCategory(null);
                }
              }}
              className={clsx(
                'p-2 rounded-lg transition-all',
                viewMode === 'muscle' ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/10 text-gray-400'
              )}
              title="Find exercises by muscle"
            >
              <Icons.Body />
            </button>
            {/* View mode toggle */}
            <button
              onClick={() => {
                if (viewMode === 'categories' || viewMode === 'muscle') {
                  setViewMode('list');
                  setSelectedCategory(null);
                  setSelectedMuscles([]);
                } else {
                  handleBackToCategories();
                }
              }}
              className={clsx(
                'p-2 rounded-lg transition-all text-xs',
                viewMode === 'list' ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/10 text-gray-400'
              )}
            >
              {viewMode === 'categories' || viewMode === 'muscle' ? '📋 List' : '📂 Groups'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'p-2 rounded-lg transition-all',
                showFilters ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/10'
              )}
            >
              <Icons.Filter />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Muscle Selector View */}
          {viewMode === 'muscle' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-300">Find Exercises by Muscle</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Click on muscles to find exercises that target them
                  </p>
                </div>
                {selectedMuscles.length > 0 && (
                  <button
                    onClick={clearMuscleSelection}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    <Icons.Close />
                    Clear ({selectedMuscles.length})
                  </button>
                )}
              </div>

              {/* Interactive Muscle Selector */}
              <div className="bg-gradient-to-b from-[#0d0d15] to-[#0a0a10] rounded-2xl border border-white/10 p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                  {/* 3D/2D Muscle Model */}
                  <div className="w-full lg:w-1/2 flex justify-center">
                    <MuscleViewer
                      muscles={selectorMuscleActivations}
                      mode="card"
                      interactive={true}
                      showLabels={true}
                      autoRotate={selectedMuscles.length === 0}
                      onMuscleClick={handleMuscleClick}
                      className="w-full max-w-[280px]"
                      style={{ height: 360 }}
                    />
                  </div>

                  {/* Selected muscles chips */}
                  <div className="w-full lg:w-1/2">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">
                      {selectedMuscles.length > 0 ? 'Selected Muscles' : 'Click a muscle to start'}
                    </h3>

                    {selectedMuscles.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedMuscles.map(muscleId => (
                          <button
                            key={muscleId}
                            onClick={() => handleMuscleClick(muscleId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-full text-sm hover:bg-violet-500/30 transition-all"
                          >
                            {muscleId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            <span className="text-violet-300">×</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm mb-4">
                        Select muscles from the model to find matching exercises
                      </div>
                    )}

                    {/* Result count */}
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Matching exercises</span>
                        <span className="text-2xl font-bold text-white">{filteredExercises.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtered Exercise Grid */}
              {filteredExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredExercises.slice(0, 20).map(exercise => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onClick={setSelectedExercise}
                    />
                  ))}
                  {filteredExercises.length > 20 && (
                    <div className="col-span-full text-center py-4">
                      <p className="text-gray-500 text-sm">
                        Showing 20 of {filteredExercises.length} exercises.
                        Use search or select more muscles to narrow down.
                      </p>
                    </div>
                  )}
                </div>
              ) : selectedMuscles.length > 0 ? (
                <div className="text-center py-12">
                  <Icons.Dumbbell />
                  <p className="text-gray-400 mt-2">No exercises found for selected muscles</p>
                  <p className="text-sm text-gray-500">Try selecting different muscles</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Category Grid View */}
          {viewMode === 'categories' && !selectedCategory && (
            <>
              <h2 className="text-lg font-semibold mb-4 text-gray-300">Browse by Muscle Group</h2>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {Object.entries(EXERCISE_CATEGORIES).map(([categoryId, category]) => (
                    <CategoryCard
                      key={categoryId}
                      category={category}
                      exerciseCount={exercisesByCategory[categoryId] || 0}
                      onClick={() => handleCategorySelect(categoryId)}
                    />
                  ))}
                </div>
              )}

              {/* Quick search below categories */}
              <div className="border-t border-white/10 pt-6 mt-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-300">Quick Search</h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Icons.Search />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      if (e.target.value) setViewMode('list');
                    }}
                    placeholder="Search all exercises..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* List View */}
          {(viewMode === 'list' || selectedCategory) && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Icons.Search />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={selectedCategory ? `Search ${EXERCISE_CATEGORIES[selectedCategory]?.name} exercises...` : 'Search exercises, muscles...'}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>

              {/* Type Filter */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="flex flex-wrap gap-2 pb-2">
                      {EXERCISE_TYPES.map(type => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            selectedType === type.id
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          )}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results count */}
              <div className="text-sm text-gray-500 mb-4">
                {loading ? 'Loading...' : `${filteredExercises.length} exercises`}
              </div>

              {/* Exercise Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.Dumbbell />
                  <p className="text-gray-400 mt-2">No exercises found</p>
                  <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredExercises.map(exercise => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      onClick={setSelectedExercise}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Exercise Detail Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <ExerciseModal
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
