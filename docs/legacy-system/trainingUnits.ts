/**
 * MuscleMap Training Unit System
 * 
 * Core Concept: 1 Training Unit = 1% normalized activation across target muscle group
 * Formula: displayed_activation = raw_activation / bias_weight
 */

import { muscles, calculateDisplayedActivation } from '../data/muscles';
import { exercises, Exercise, EquipmentPath } from '../data/exercises';

// ============================================
// TYPES
// ============================================

export interface MuscleActivationState {
  muscleId: string;
  rawActivation: number;
  displayedActivation: number;
  biasWeight: number;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
  timestamp: Date;
}

export interface WorkoutSession {
  exercises: LoggedExercise[];
  totalUnits: number;
  muscleActivations: Map<string, MuscleActivationState>;
  completionPercentage: number;
}

export interface PrescribedExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string[];
}

export interface WorkoutPrescription {
  exercises: PrescribedExercise[];
  totalUnits: number;
  estimatedDuration: number;
  musclesCovered: string[];
}

export interface Archetype {
  id: string;
  name: string;
  description: string;
  primaryMuscles: string[];
  totalUnitsRequired: number;
}

// ============================================
// ACTIVATION CALCULATION
// ============================================

function calculateSetActivation(exerciseActivation: number, reps: number, weight?: number): number {
  const repFactor = Math.min(1.2, Math.max(0.8, reps / 10));
  const weightFactor = weight ? Math.min(1.5, 1 + (weight / 200)) : 1;
  return exerciseActivation * repFactor * weightFactor * 0.1;
}

export function calculateExerciseActivation(logged: LoggedExercise): Map<string, number> {
  const exercise = exercises.find(e => e.id === logged.exerciseId);
  if (!exercise) return new Map();
  
  const activations = new Map<string, number>();
  
  for (const muscleAct of exercise.muscleActivations) {
    const setActivation = calculateSetActivation(muscleAct.activation, logged.reps, logged.weight);
    const totalActivation = setActivation * logged.sets;
    const existing = activations.get(muscleAct.muscleId) || 0;
    activations.set(muscleAct.muscleId, existing + totalActivation);
  }
  
  return activations;
}

export function createWorkoutSession(loggedExercises: LoggedExercise[]): WorkoutSession {
  const muscleActivations = new Map<string, MuscleActivationState>();
  
  // Initialize all muscles
  for (const [muscleId, muscle] of Object.entries(muscles)) {
    muscleActivations.set(muscleId, {
      muscleId,
      rawActivation: 0,
      displayedActivation: 0,
      biasWeight: muscle.biasWeight
    });
  }
  
  // Accumulate activations
  for (const logged of loggedExercises) {
    const exerciseActivations = calculateExerciseActivation(logged);
    for (const [muscleId, activation] of exerciseActivations) {
      const state = muscleActivations.get(muscleId);
      if (state) {
        state.rawActivation += activation;
        state.displayedActivation = calculateDisplayedActivation(state.rawActivation, state.biasWeight);
      }
    }
  }
  
  // Calculate totals
  let totalDisplayed = 0;
  let muscleCount = 0;
  for (const state of muscleActivations.values()) {
    totalDisplayed += state.displayedActivation;
    muscleCount++;
  }
  
  const avgActivation = totalDisplayed / muscleCount;
  
  return {
    exercises: loggedExercises,
    totalUnits: Math.round(avgActivation),
    muscleActivations,
    completionPercentage: avgActivation
  };
}

// ============================================
// WORKOUT PRESCRIPTION
// ============================================

function findBestExercises(underActivated: string[], path: EquipmentPath, maxDiff: number = 3): Exercise[] {
  const pathExercises = exercises.filter(e => e.path === path && e.difficulty <= maxDiff);
  
  const scored = pathExercises.map(exercise => {
    let score = 0;
    for (const ma of exercise.muscleActivations) {
      if (underActivated.includes(ma.muscleId)) {
        const mult = ma.role === 'primary' ? 1 : ma.role === 'secondary' ? 0.5 : 0.25;
        score += ma.activation * mult;
      }
    }
    return { exercise, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).map(s => s.exercise);
}

export function generateWorkoutPrescription(
  targetUnits: number,
  path: EquipmentPath,
  currentSession?: WorkoutSession,
  maxDifficulty: number = 3
): WorkoutPrescription {
  const prescription: PrescribedExercise[] = [];
  let estimatedDuration = 0;
  const musclesCovered = new Set<string>();
  
  // Find under-activated muscles
  const underActivated: string[] = [];
  if (currentSession) {
    for (const [muscleId, state] of currentSession.muscleActivations) {
      if (state.displayedActivation < targetUnits) {
        underActivated.push(muscleId);
      }
    }
  } else {
    underActivated.push(...Object.keys(muscles));
  }
  
  const candidates = findBestExercises(underActivated, path, maxDifficulty);
  
  let currentUnits = currentSession?.totalUnits || 0;
  const usedCategories = new Set<string>();
  
  for (const exercise of candidates) {
    if (currentUnits >= targetUnits) break;
    if (usedCategories.has(exercise.category) && usedCategories.size < 4) continue;
    
    const sets = exercise.difficulty >= 4 ? 3 : 4;
    const reps = exercise.category === 'core' ? 12 : exercise.difficulty >= 4 ? 5 : 8;
    
    prescription.push({
      exercise,
      sets,
      reps,
      restSeconds: exercise.difficulty >= 4 ? 180 : 90,
      notes: exercise.cues
    });
    
    for (const ma of exercise.muscleActivations) {
      musclesCovered.add(ma.muscleId);
    }
    
    estimatedDuration += (exercise.timePerSet * sets) / 60;
    currentUnits += sets * 2;
    usedCategories.add(exercise.category);
  }
  
  return {
    exercises: prescription,
    totalUnits: targetUnits,
    estimatedDuration: Math.round(estimatedDuration),
    musclesCovered: Array.from(musclesCovered)
  };
}

// ============================================
// ARCHETYPES
// ============================================

export const archetypes: Archetype[] = [
  {
    id: 'judoka',
    name: 'Judoka',
    description: 'Grappling power with explosive hips and grip strength',
    primaryMuscles: ['HG-001', 'HG-002', 'BA-001', 'BA-002', 'AR-015', 'AR-016', 'LP-001', 'LP-002'],
    totalUnitsRequired: 100
  },
  {
    id: 'samoan-warrior',
    name: 'Samoan Warrior',
    description: 'Powerful explosive build with emphasis on legs and shoulders',
    primaryMuscles: ['LA-003', 'LA-004', 'HG-001', 'HG-002', 'SH-001', 'SH-002', 'SH-003', 'SH-004'],
    totalUnitsRequired: 100
  },
  {
    id: 'tennis-player',
    name: 'Pro Tennis Player',
    description: 'Rotational power, shoulder stability, and leg endurance',
    primaryMuscles: ['CA-003', 'CA-004', 'SH-005', 'SH-006', 'SH-018', 'SH-019', 'LA-003', 'LA-004'],
    totalUnitsRequired: 100
  },
  {
    id: 'swimmer',
    name: 'Competitive Swimmer',
    description: 'Lat-dominant with strong shoulders and streamlined core',
    primaryMuscles: ['BA-001', 'BA-002', 'SH-005', 'SH-006', 'CH-001', 'CH-002', 'CA-001', 'CA-002'],
    totalUnitsRequired: 100
  },
  {
    id: 'sprinter',
    name: 'Olympic Sprinter',
    description: 'Explosive glutes, powerful hamstrings, strong hip flexors',
    primaryMuscles: ['HG-001', 'HG-002', 'LP-001', 'LP-002', 'HG-009', 'HG-010', 'LP-009', 'LP-010'],
    totalUnitsRequired: 100
  },
  {
    id: 'gymnast',
    name: 'Male Gymnast',
    description: 'Upper body strength with exceptional core control',
    primaryMuscles: ['CH-002', 'BA-001', 'BA-002', 'SH-001', 'SH-002', 'CA-001', 'CA-002', 'AR-001', 'AR-002'],
    totalUnitsRequired: 100
  },
  {
    id: 'bodybuilder',
    name: 'Classic Bodybuilder',
    description: 'Balanced aesthetic development across all muscle groups',
    primaryMuscles: ['CH-001', 'CH-002', 'BA-001', 'BA-002', 'SH-003', 'SH-004', 'AR-001', 'AR-002', 'LA-003', 'LA-004'],
    totalUnitsRequired: 100
  },
  {
    id: 'powerlifter',
    name: 'Powerlifter',
    description: 'Maximum strength in squat, bench, deadlift',
    primaryMuscles: ['LA-003', 'LA-004', 'CH-002', 'HG-001', 'HG-002', 'BA-003', 'BA-004', 'AP-001', 'AP-002'],
    totalUnitsRequired: 100
  },
  {
    id: 'boxer',
    name: 'Professional Boxer',
    description: 'Rotational power, shoulder endurance, leg drive',
    primaryMuscles: ['CA-003', 'CA-004', 'SH-001', 'SH-002', 'AP-001', 'AP-002', 'LP-009', 'LP-010', 'HG-001', 'HG-002'],
    totalUnitsRequired: 100
  },
  {
    id: 'climber',
    name: 'Rock Climber',
    description: 'Grip strength, pulling power, finger flexors',
    primaryMuscles: ['AR-015', 'AR-016', 'AR-017', 'AR-018', 'BA-001', 'BA-002', 'AR-001', 'AR-002', 'CA-001', 'CA-002'],
    totalUnitsRequired: 100
  }
];

export function getArchetypeById(id: string): Archetype | undefined {
  return archetypes.find(a => a.id === id);
}

export function generateArchetypeWorkout(
  archetypeId: string,
  path: EquipmentPath,
  targetUnits: number = 100
): WorkoutPrescription {
  const archetype = getArchetypeById(archetypeId);
  if (!archetype) {
    return generateWorkoutPrescription(targetUnits, path);
  }
  
  // Prioritize exercises that hit archetype's primary muscles
  const prescription: PrescribedExercise[] = [];
  const musclesCovered = new Set<string>();
  let estimatedDuration = 0;
  
  const pathExercises = exercises.filter(e => e.path === path);
  
  // Score exercises by archetype relevance
  const scored = pathExercises.map(exercise => {
    let score = 0;
    for (const ma of exercise.muscleActivations) {
      if (archetype.primaryMuscles.includes(ma.muscleId)) {
        const mult = ma.role === 'primary' ? 2 : ma.role === 'secondary' ? 1 : 0.5;
        score += ma.activation * mult;
      }
    }
    return { exercise, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  const usedCategories = new Set<string>();
  let exerciseCount = 0;
  
  for (const { exercise, score } of scored) {
    if (score === 0) continue;
    if (exerciseCount >= 8) break; // Max 8 exercises
    
    // Limit exercises per category
    const categoryCount = [...usedCategories].filter(c => c === exercise.category).length;
    if (categoryCount >= 2) continue;
    
    const sets = exercise.difficulty >= 4 ? 3 : 4;
    const reps = exercise.category === 'core' ? 12 : exercise.difficulty >= 4 ? 5 : 10;
    
    prescription.push({
      exercise,
      sets,
      reps,
      restSeconds: exercise.difficulty >= 4 ? 180 : 90,
      notes: exercise.cues
    });
    
    for (const ma of exercise.muscleActivations) {
      musclesCovered.add(ma.muscleId);
    }
    
    estimatedDuration += (exercise.timePerSet * sets) / 60;
    usedCategories.add(exercise.category);
    exerciseCount++;
  }
  
  return {
    exercises: prescription,
    totalUnits: targetUnits,
    estimatedDuration: Math.round(estimatedDuration),
    musclesCovered: Array.from(musclesCovered)
  };
}
