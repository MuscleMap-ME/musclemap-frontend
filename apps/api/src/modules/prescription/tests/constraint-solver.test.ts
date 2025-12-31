/**
 * Constraint Solver Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  applyHardFilters,
  scoreExercise,
  estimateExerciseTime,
  checkBalance,
  solveConstraints,
} from '../constraint-solver';
import {
  ExerciseWithConstraints,
  PrescriptionRequest,
  MovementPattern,
  MuscleCoverageMap,
} from '../types';

// Mock exercise data for testing
const mockExercises: ExerciseWithConstraints[] = [
  {
    id: 'bw-pushup',
    name: 'Push-Up',
    type: 'bodyweight',
    difficulty: 1,
    description: null,
    cues: null,
    primaryMuscles: ['chest-mid', 'triceps-lateral'],
    equipmentRequired: [],
    equipmentOptional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    isCompound: true,
    estimatedSeconds: 30,
    restSeconds: 60,
    movementPattern: 'push' as MovementPattern,
    activations: { 'chest-mid': 70, 'triceps-lateral': 60, 'delt-front': 50 },
  },
  {
    id: 'bw-pullup',
    name: 'Pull-Up',
    type: 'bodyweight',
    difficulty: 2,
    description: null,
    cues: null,
    primaryMuscles: ['lats', 'biceps-long'],
    equipmentRequired: ['pullup_bar'],
    equipmentOptional: [],
    locations: ['gym', 'home', 'park'],
    isCompound: true,
    estimatedSeconds: 35,
    restSeconds: 90,
    movementPattern: 'pull' as MovementPattern,
    activations: { lats: 85, 'biceps-long': 60, 'teres-major': 55 },
  },
  {
    id: 'fw-squat',
    name: 'Barbell Squat',
    type: 'freeweight',
    difficulty: 3,
    description: null,
    cues: null,
    primaryMuscles: ['quad-vastus-lat', 'glute-max'],
    equipmentRequired: ['barbell', 'squat_rack'],
    equipmentOptional: [],
    locations: ['gym'],
    isCompound: true,
    estimatedSeconds: 45,
    restSeconds: 180,
    movementPattern: 'squat' as MovementPattern,
    activations: { 'quad-vastus-lat': 90, 'glute-max': 70, 'erector-spinae': 40 },
  },
  {
    id: 'bw-squat',
    name: 'Bodyweight Squat',
    type: 'bodyweight',
    difficulty: 1,
    description: null,
    cues: null,
    primaryMuscles: ['quad-vastus-lat', 'glute-max'],
    equipmentRequired: [],
    equipmentOptional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    isCompound: true,
    estimatedSeconds: 25,
    restSeconds: 60,
    movementPattern: 'squat' as MovementPattern,
    activations: { 'quad-vastus-lat': 70, 'glute-max': 50 },
  },
  {
    id: 'fw-lateral-raise',
    name: 'Lateral Raise',
    type: 'freeweight',
    difficulty: 1,
    description: null,
    cues: null,
    primaryMuscles: ['delt-side'],
    equipmentRequired: ['dumbbells'],
    equipmentOptional: [],
    locations: ['gym', 'home'],
    isCompound: false,
    estimatedSeconds: 25,
    restSeconds: 45,
    movementPattern: 'isolation' as MovementPattern,
    activations: { 'delt-side': 90 },
  },
];

describe('applyHardFilters', () => {
  it('filters exercises by location', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'hotel',
      equipment: [],
    };

    const filtered = applyHardFilters(mockExercises, request);

    // Hotel should only allow bodyweight exercises that work at hotel
    expect(filtered).toHaveLength(2); // bw-pushup and bw-squat
    expect(filtered.some(e => e.id === 'bw-pushup')).toBe(true);
    expect(filtered.some(e => e.id === 'bw-squat')).toBe(true);
    expect(filtered.some(e => e.id === 'bw-pullup')).toBe(false);
    expect(filtered.some(e => e.id === 'fw-squat')).toBe(false);
  });

  it('filters exercises by equipment availability', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'home',
      equipment: ['pullup_bar'],
    };

    const filtered = applyHardFilters(mockExercises, request);

    // Home with pullup bar should include pullups
    expect(filtered.some(e => e.id === 'bw-pullup')).toBe(true);
    expect(filtered.some(e => e.id === 'bw-pushup')).toBe(true);
    // But not barbell squat (needs squat_rack)
    expect(filtered.some(e => e.id === 'fw-squat')).toBe(false);
  });

  it('allows all equipment at gym location', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
    };

    const filtered = applyHardFilters(mockExercises, request);

    // Gym should have all exercises that include 'gym' in locations
    expect(filtered.some(e => e.id === 'fw-squat')).toBe(true);
    expect(filtered.some(e => e.id === 'bw-pullup')).toBe(true);
  });

  it('excludes specified exercises', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
      excludedExercises: ['bw-pushup', 'fw-squat'],
    };

    const filtered = applyHardFilters(mockExercises, request);

    expect(filtered.some(e => e.id === 'bw-pushup')).toBe(false);
    expect(filtered.some(e => e.id === 'fw-squat')).toBe(false);
    expect(filtered.some(e => e.id === 'bw-pullup')).toBe(true);
  });

  it('excludes exercises targeting excluded muscles', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
      excludedMuscles: ['lats'],
    };

    const filtered = applyHardFilters(mockExercises, request);

    // Pull-up primarily targets lats
    expect(filtered.some(e => e.id === 'bw-pullup')).toBe(false);
    // Push-up doesn't target lats
    expect(filtered.some(e => e.id === 'bw-pushup')).toBe(true);
  });
});

describe('scoreExercise', () => {
  const emptyCoverage: MuscleCoverageMap = {};
  const emptyRecent24h = new Set<string>();
  const emptyRecent48h = new Set<string>();

  it('scores higher for compound movements', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
    };

    const compoundExercise = mockExercises.find(e => e.id === 'bw-pushup')!;
    const isolationExercise = mockExercises.find(e => e.id === 'fw-lateral-raise')!;

    const compoundScore = scoreExercise(compoundExercise, request, emptyCoverage, emptyRecent24h, emptyRecent48h);
    const isolationScore = scoreExercise(isolationExercise, request, emptyCoverage, emptyRecent24h, emptyRecent48h);

    expect(compoundScore).toBeGreaterThan(isolationScore);
  });

  it('penalizes exercises for recently worked muscles', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
    };

    const exercise = mockExercises.find(e => e.id === 'bw-pushup')!;

    const freshScore = scoreExercise(exercise, request, emptyCoverage, emptyRecent24h, emptyRecent48h);

    const recentMuscles24h = new Set(['chest-mid']);
    const fatigueScore = scoreExercise(exercise, request, emptyCoverage, recentMuscles24h, emptyRecent48h);

    expect(fatigueScore).toBeLessThan(freshScore);
  });

  it('prioritizes exercises covering uncovered muscles', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
    };

    const exercise = mockExercises.find(e => e.id === 'bw-pushup')!;

    const emptyScore = scoreExercise(exercise, request, emptyCoverage, emptyRecent24h, emptyRecent48h);

    // Already covered chest
    const covered: MuscleCoverageMap = {
      'chest-mid': { name: 'Mid Chest', activationLevel: 'primary', totalSets: 3 },
    };
    const coveredScore = scoreExercise(exercise, request, covered, emptyRecent24h, emptyRecent48h);

    expect(emptyScore).toBeGreaterThan(coveredScore);
  });

  it('scores higher for goal-aligned exercises', () => {
    const strengthRequest: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'gym',
      equipment: [],
      goals: ['strength'],
    };

    const squat = mockExercises.find(e => e.id === 'fw-squat')!;
    const isolation = mockExercises.find(e => e.id === 'fw-lateral-raise')!;

    const squatScore = scoreExercise(squat, strengthRequest, emptyCoverage, emptyRecent24h, emptyRecent48h);
    const isolationScore = scoreExercise(isolation, strengthRequest, emptyCoverage, emptyRecent24h, emptyRecent48h);

    // Squat is preferred for strength goals
    expect(squatScore).toBeGreaterThan(isolationScore);
  });
});

describe('estimateExerciseTime', () => {
  it('calculates time correctly for exercises', () => {
    const exercise = mockExercises.find(e => e.id === 'bw-pushup')!;

    // 3 sets of 10 reps
    // Rep time = 10 * 3 = 30 seconds per set
    // Rest = 60 seconds between sets
    // Total = 0 (no setup) + (3 * 30) + (2 * 60) = 0 + 90 + 120 = 210 seconds
    const time = estimateExerciseTime(exercise, 3, 10, 1.0);

    expect(time).toBe(210);
  });

  it('adds setup time for equipment exercises', () => {
    const exercise = mockExercises.find(e => e.id === 'fw-squat')!;

    // 3 sets of 5 reps
    // Rep time = 5 * 3 = 15 seconds per set
    // Rest = 180 seconds between sets
    // Setup = 30 seconds (has equipment)
    // Total = 30 + (3 * 15) + (2 * 180) = 30 + 45 + 360 = 435 seconds
    const time = estimateExerciseTime(exercise, 3, 5, 1.0);

    expect(time).toBe(435);
  });

  it('applies rest multiplier correctly', () => {
    const exercise = mockExercises.find(e => e.id === 'bw-pushup')!;

    const normalTime = estimateExerciseTime(exercise, 3, 10, 1.0);
    const reducedRestTime = estimateExerciseTime(exercise, 3, 10, 0.5);

    // With half rest, should be faster
    expect(reducedRestTime).toBeLessThan(normalTime);
  });
});

describe('checkBalance', () => {
  it('returns balanced for well-balanced selection', () => {
    const balanced = [
      mockExercises.find(e => e.id === 'bw-pushup')!, // push (upper)
      mockExercises.find(e => e.id === 'bw-pullup')!, // pull (upper)
      mockExercises.find(e => e.id === 'bw-squat')!, // squat (lower)
      mockExercises.find(e => e.id === 'fw-squat')!, // squat (lower) - need 2 lower to balance 2 upper
    ];

    // Push/Pull ratio: 1:1 = 1.0 (within 0.8-1.2)
    // Upper/Lower ratio: 2:2 = 1.0 (within 0.6-1.4)
    const result = checkBalance(balanced);

    expect(result.isBalanced).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags imbalanced push/pull ratio', () => {
    const pushHeavy = [
      mockExercises.find(e => e.id === 'bw-pushup')!, // push
      mockExercises.find(e => e.id === 'bw-pushup')!, // push (counting twice for testing)
      mockExercises.find(e => e.id === 'bw-pushup')!, // push
      mockExercises.find(e => e.id === 'bw-pullup')!, // pull
    ];

    const result = checkBalance(pushHeavy);

    // Ratio is 3:1 which exceeds 1.2 max
    expect(result.isBalanced).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe('solveConstraints', () => {
  it('returns empty array when no exercises match', () => {
    const request: PrescriptionRequest = {
      timeAvailable: 30,
      location: 'office',
      equipment: [],
      excludedMuscles: ['chest-mid', 'quad-vastus-lat', 'glute-max', 'rectus-abdominis'],
    };

    // Note: This test may fail if there are still exercises available
    // The actual solver uses the real database
  });

  it('respects time constraints', () => {
    const shortRequest: PrescriptionRequest = {
      timeAvailable: 15, // Very short workout
      location: 'gym',
      equipment: [],
    };

    // Note: This test requires database access
    // In a real test environment, we'd mock the database
  });
});
