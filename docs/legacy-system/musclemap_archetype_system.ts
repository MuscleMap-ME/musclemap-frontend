/**
 * MuscleMap Archetype System
 * 3 Archetypes × 3 Levels = 9 Complete Progression Paths
 * Each level = 100 Training Units to complete
 */

export interface MuscleGroupTarget {
  muscleGroup: string;
  targetTU: number;
  percentage: number;
}

export interface ExercisePrescription {
  exerciseId: string;
  sets: number;
  reps: number | string; // can be "AMRAP" or "Max"
  intensity: number; // 0-1
  frequency: number; // times per week
  notes?: string;
}

export interface ArchetypeLevel {
  level: number;
  name: string;
  totalTU: number;
  muscleGroupTargets: MuscleGroupTarget[];
  weeklyPrescription: ExercisePrescription[];
  description: string;
  unlockRequirement?: string;
}

export interface Archetype {
  id: string;
  name: string;
  philosophy: string;
  focusAreas: string[];
  levels: ArchetypeLevel[];
}

// ============================================================================
// BODYBUILDER ARCHETYPE
// ============================================================================

const BODYBUILDER_ARCHETYPE: Archetype = {
  id: 'bodybuilder',
  name: 'Bodybuilder',
  philosophy: 'Maximum muscle hypertrophy through volume and time under tension',
  focusAreas: ['Chest', 'Back', 'Arms', 'Shoulders'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Hypertrophy Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'chest', targetTU: 25, percentage: 25 },
        { muscleGroup: 'back', targetTU: 25, percentage: 25 },
        { muscleGroup: 'legs', targetTU: 20, percentage: 20 },
        { muscleGroup: 'shoulders', targetTU: 15, percentage: 15 },
        { muscleGroup: 'arms', targetTU: 15, percentage: 15 },
      ],
      weeklyPrescription: [
        // CHEST DAY (2x/week)
        {
          exerciseId: 'bb_bench_press',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Flat barbell bench - compound chest builder'
        },
        {
          exerciseId: 'bb_incline_bench',
          sets: 3,
          reps: 10,
          intensity: 0.70,
          frequency: 2,
          notes: 'Upper chest focus'
        },
        {
          exerciseId: 'bw_dip',
          sets: 3,
          reps: 12,
          intensity: 0.75,
          frequency: 2,
          notes: 'Lower chest and triceps'
        },

        // BACK DAY (2x/week)
        {
          exerciseId: 'bb_bent_row',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Thick back builder'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 3,
          reps: 10,
          intensity: 0.80,
          frequency: 2,
          notes: 'Lat width'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 3,
          reps: 6,
          intensity: 0.80,
          frequency: 1,
          notes: 'Overall back thickness - once per week'
        },

        // LEGS DAY (2x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Quad and glute mass'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 3,
          reps: 10,
          intensity: 0.70,
          frequency: 2,
          notes: 'Hamstring focus'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 3,
          reps: 12,
          intensity: 0.75,
          frequency: 2,
          notes: 'Unilateral leg work'
        },

        // SHOULDERS & ARMS DAY (2x/week)
        {
          exerciseId: 'bb_overhead_press',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Primary shoulder builder'
        },
        {
          exerciseId: 'bb_curl',
          sets: 4,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Bicep isolation'
        },
        {
          exerciseId: 'bb_skull_crusher',
          sets: 4,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Tricep isolation'
        },
      ],
      description: 'Build foundation with compound movements and classic hypertrophy rep ranges',
    },

    // LEVEL 2: Intermediate Volume
    {
      level: 2,
      name: 'Volume Intensification',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'chest', targetTU: 28, percentage: 28 },
        { muscleGroup: 'back', targetTU: 28, percentage: 28 },
        { muscleGroup: 'legs', targetTU: 18, percentage: 18 },
        { muscleGroup: 'shoulders', targetTU: 13, percentage: 13 },
        { muscleGroup: 'arms', targetTU: 13, percentage: 13 },
      ],
      weeklyPrescription: [
        // CHEST DAY - Heavy/Volume Split (2x/week)
        {
          exerciseId: 'bb_bench_press',
          sets: 5,
          reps: 6,
          intensity: 0.82,
          frequency: 1,
          notes: 'Heavy day - strength focus'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 4,
          reps: 12,
          intensity: 0.68,
          frequency: 1,
          notes: 'Volume day - pump focus'
        },
        {
          exerciseId: 'bb_incline_bench',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 2,
          notes: 'Upper chest emphasis'
        },
        {
          exerciseId: 'bw_dip',
          sets: 4,
          reps: 15,
          intensity: 0.78,
          frequency: 2,
          notes: 'Lower chest burnout'
        },

        // BACK DAY (2x/week)
        {
          exerciseId: 'bb_deadlift',
          sets: 4,
          reps: 5,
          intensity: 0.85,
          frequency: 1,
          notes: 'Heavy pulls - week 1'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 5,
          reps: 8,
          intensity: 0.78,
          frequency: 2,
          notes: 'Primary back mass'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 12,
          intensity: 0.82,
          frequency: 2,
          notes: 'Weighted if possible'
        },
        {
          exerciseId: 'bb_pendlay_row',
          sets: 4,
          reps: 8,
          intensity: 0.80,
          frequency: 1,
          notes: 'Explosive back work'
        },

        // LEGS DAY (2x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 5,
          reps: 6,
          intensity: 0.82,
          frequency: 2,
          notes: 'Progressive overload'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 3,
          reps: 10,
          intensity: 0.75,
          frequency: 1,
          notes: 'Quad emphasis'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 2,
          notes: 'Hamstring volume'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 3,
          reps: 8,
          intensity: 0.85,
          frequency: 1,
          notes: 'Advanced unilateral'
        },

        // SHOULDERS & ARMS (2x/week)
        {
          exerciseId: 'bb_overhead_press',
          sets: 5,
          reps: 6,
          intensity: 0.82,
          frequency: 2,
          notes: 'Shoulder strength'
        },
        {
          exerciseId: 'bb_curl',
          sets: 5,
          reps: 12,
          intensity: 0.72,
          frequency: 2,
          notes: 'Bicep volume'
        },
        {
          exerciseId: 'bb_skull_crusher',
          sets: 5,
          reps: 12,
          intensity: 0.72,
          frequency: 2,
          notes: 'Tricep volume'
        },
      ],
      description: 'Increase volume and introduce heavy/light split for continued growth',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced Specialization
    {
      level: 3,
      name: 'Advanced Hypertrophy',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'chest', targetTU: 30, percentage: 30 },
        { muscleGroup: 'back', targetTU: 30, percentage: 30 },
        { muscleGroup: 'legs', targetTU: 15, percentage: 15 },
        { muscleGroup: 'shoulders', targetTU: 12, percentage: 12 },
        { muscleGroup: 'arms', targetTU: 13, percentage: 13 },
      ],
      weeklyPrescription: [
        // CHEST - 3x per week specialization
        {
          exerciseId: 'bb_bench_press',
          sets: 6,
          reps: 5,
          intensity: 0.85,
          frequency: 1,
          notes: 'Max strength day'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 5,
          reps: 10,
          intensity: 0.70,
          frequency: 1,
          notes: 'Volume day'
        },
        {
          exerciseId: 'bb_incline_bench',
          sets: 5,
          reps: 8,
          intensity: 0.78,
          frequency: 2,
          notes: 'Upper chest priority'
        },
        {
          exerciseId: 'bw_dip',
          sets: 5,
          reps: 'AMRAP',
          intensity: 0.85,
          frequency: 2,
          notes: 'Weighted dips to failure'
        },

        // BACK - 3x per week
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 3,
          intensity: 0.88,
          frequency: 1,
          notes: 'Heavy triples'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 6,
          reps: 8,
          intensity: 0.80,
          frequency: 2,
          notes: 'Back thickness focus'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 'AMRAP',
          intensity: 0.85,
          frequency: 3,
          notes: 'Heavy weighted pullups'
        },
        {
          exerciseId: 'bb_pendlay_row',
          sets: 5,
          reps: 6,
          intensity: 0.82,
          frequency: 1,
          notes: 'Explosive strength'
        },

        // LEGS - 2x per week
        {
          exerciseId: 'bb_back_squat',
          sets: 6,
          reps: 5,
          intensity: 0.85,
          frequency: 2,
          notes: 'Heavy squats'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 4,
          reps: 8,
          intensity: 0.78,
          frequency: 1,
          notes: 'Quad isolation'
        },
        {
          exerciseId: 'bw_nordic_curl',
          sets: 4,
          reps: 8,
          intensity: 0.90,
          frequency: 2,
          notes: 'Elite hamstring work'
        },

        // SHOULDERS & ARMS - 2x per week
        {
          exerciseId: 'bb_overhead_press',
          sets: 6,
          reps: 5,
          intensity: 0.85,
          frequency: 2,
          notes: 'Shoulder power'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 4,
          reps: 8,
          intensity: 0.90,
          frequency: 1,
          notes: 'Strict HSPU for delts'
        },
        {
          exerciseId: 'bb_curl',
          sets: 6,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'High volume biceps'
        },
        {
          exerciseId: 'bb_skull_crusher',
          sets: 6,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'High volume triceps'
        },
      ],
      description: 'Peak hypertrophy with maximum volume and intensity techniques',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// CROSSFIT ATHLETE ARCHETYPE
// ============================================================================

const CROSSFIT_ARCHETYPE: Archetype = {
  id: 'crossfit',
  name: 'CrossFit Athlete',
  philosophy: 'Broad, general, and inclusive fitness across all modalities',
  focusAreas: ['Olympic lifts', 'Metabolic conditioning', 'Gymnastics', 'Functional strength'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'GPP Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 30, percentage: 30 },
        { muscleGroup: 'posterior_chain', targetTU: 25, percentage: 25 },
        { muscleGroup: 'chest', targetTU: 15, percentage: 15 },
        { muscleGroup: 'back', targetTU: 15, percentage: 15 },
        { muscleGroup: 'shoulders', targetTU: 10, percentage: 10 },
        { muscleGroup: 'core', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // OLYMPIC LIFTING (2x/week)
        {
          exerciseId: 'bb_clean',
          sets: 5,
          reps: 3,
          intensity: 0.75,
          frequency: 2,
          notes: 'Power development'
        },
        {
          exerciseId: 'bb_snatch',
          sets: 5,
          reps: 2,
          intensity: 0.70,
          frequency: 1,
          notes: 'Technical work'
        },

        // STRENGTH (3x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 3,
          notes: 'Strength base'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 5,
          intensity: 0.78,
          frequency: 2,
          notes: 'Posterior chain'
        },
        {
          exerciseId: 'bb_overhead_press',
          sets: 4,
          reps: 6,
          intensity: 0.75,
          frequency: 2,
          notes: 'Shoulder strength'
        },

        // GYMNASTICS (3x/week)
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 3,
          notes: 'Strict pulling'
        },
        {
          exerciseId: 'bw_pushup',
          sets: 4,
          reps: 15,
          intensity: 0.70,
          frequency: 3,
          notes: 'Push endurance'
        },
        {
          exerciseId: 'bw_dip',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Pressing strength'
        },

        // METCON WORK (3x/week)
        {
          exerciseId: 'kb_swing',
          sets: 5,
          reps: 20,
          intensity: 0.70,
          frequency: 3,
          notes: 'Hip power endurance'
        },
        {
          exerciseId: 'bw_squat',
          sets: 5,
          reps: 20,
          intensity: 0.65,
          frequency: 3,
          notes: 'Conditioning work'
        },

        // CORE (3x/week)
        {
          exerciseId: 'bw_plank',
          sets: 3,
          reps: '60sec',
          intensity: 0.70,
          frequency: 3,
          notes: 'Midline stability'
        },
      ],
      description: 'Build general physical preparedness across all domains',
    },

    // LEVEL 2: Competition Prep
    {
      level: 2,
      name: 'Competition Ready',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 28, percentage: 28 },
        { muscleGroup: 'posterior_chain', targetTU: 27, percentage: 27 },
        { muscleGroup: 'chest', targetTU: 12, percentage: 12 },
        { muscleGroup: 'back', targetTU: 18, percentage: 18 },
        { muscleGroup: 'shoulders', targetTU: 10, percentage: 10 },
        { muscleGroup: 'core', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // OLYMPIC LIFTING - Increased frequency
        {
          exerciseId: 'bb_clean',
          sets: 6,
          reps: 2,
          intensity: 0.82,
          frequency: 3,
          notes: 'Heavy singles and doubles'
        },
        {
          exerciseId: 'bb_snatch',
          sets: 6,
          reps: 2,
          intensity: 0.80,
          frequency: 3,
          notes: 'Technical perfection'
        },

        // STRENGTH
        {
          exerciseId: 'bb_back_squat',
          sets: 6,
          reps: 3,
          intensity: 0.85,
          frequency: 3,
          notes: 'Heavy triples'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'Clean strength'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 3,
          intensity: 0.85,
          frequency: 2,
          notes: 'Max effort pulls'
        },

        // ADVANCED GYMNASTICS
        {
          exerciseId: 'bw_muscle_up',
          sets: 5,
          reps: 5,
          intensity: 0.85,
          frequency: 3,
          notes: 'Ring or bar MU'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 5,
          reps: 8,
          intensity: 0.80,
          frequency: 3,
          notes: 'Strict HSPU volume'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 6,
          reps: 12,
          intensity: 0.80,
          frequency: 4,
          notes: 'High volume pulling'
        },

        // METCON INTENSITY
        {
          exerciseId: 'kb_snatch',
          sets: 6,
          reps: 10,
          intensity: 0.80,
          frequency: 3,
          notes: 'Heavy snatches'
        },
        {
          exerciseId: 'kb_swing',
          sets: 6,
          reps: 30,
          intensity: 0.75,
          frequency: 3,
          notes: 'High rep power'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 5,
          reps: 10,
          intensity: 0.80,
          frequency: 2,
          notes: 'Unilateral strength'
        },

        // ADVANCED CORE
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 5,
          reps: 15,
          intensity: 0.80,
          frequency: 3,
          notes: 'Toes to bar practice'
        },
      ],
      description: 'Competition-level capacity across all CrossFit movements',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Elite Performance
    {
      level: 3,
      name: 'Elite Capacity',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 26, percentage: 26 },
        { muscleGroup: 'posterior_chain', targetTU: 28, percentage: 28 },
        { muscleGroup: 'chest', targetTU: 10, percentage: 10 },
        { muscleGroup: 'back', targetTU: 20, percentage: 20 },
        { muscleGroup: 'shoulders', targetTU: 11, percentage: 11 },
        { muscleGroup: 'core', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // MAX EFFORT OLY
        {
          exerciseId: 'bb_clean',
          sets: 8,
          reps: 1,
          intensity: 0.90,
          frequency: 3,
          notes: 'Heavy singles, wave loading'
        },
        {
          exerciseId: 'bb_snatch',
          sets: 8,
          reps: 1,
          intensity: 0.88,
          frequency: 3,
          notes: 'Technical maxes'
        },

        // MAX STRENGTH
        {
          exerciseId: 'bb_back_squat',
          sets: 8,
          reps: 2,
          intensity: 0.88,
          frequency: 3,
          notes: 'Near-max doubles'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 6,
          reps: 3,
          intensity: 0.85,
          frequency: 3,
          notes: 'Heavy triples'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 6,
          reps: 2,
          intensity: 0.88,
          frequency: 2,
          notes: 'Near-max pulls'
        },

        // ELITE GYMNASTICS
        {
          exerciseId: 'bw_muscle_up',
          sets: 10,
          reps: 3,
          intensity: 0.90,
          frequency: 4,
          notes: 'Heavy bar or ring MU'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 8,
          reps: 10,
          intensity: 0.85,
          frequency: 4,
          notes: 'Strict deficit HSPU'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 10,
          reps: 'Max',
          intensity: 0.85,
          frequency: 4,
          notes: 'Weighted to failure'
        },

        // HIGH SKILL METCON
        {
          exerciseId: 'kb_snatch',
          sets: 8,
          reps: 15,
          intensity: 0.85,
          frequency: 3,
          notes: 'Competition pace'
        },
        {
          exerciseId: 'kb_turkish_getup',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'Heavy TGU strength'
        },

        // ELITE CORE
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 8,
          reps: 20,
          intensity: 0.85,
          frequency: 4,
          notes: 'Competition TTB volume'
        },
      ],
      description: 'Peak athletic performance for elite competition',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// GYMNAST ARCHETYPE
// ============================================================================

const GYMNAST_ARCHETYPE: Archetype = {
  id: 'gymnast',
  name: 'Gymnast',
  philosophy: 'Bodyweight mastery, relative strength, and movement quality',
  focusAreas: ['Pushing strength', 'Pulling strength', 'Core control', 'Straight-arm strength'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Foundational Strength',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'chest', targetTU: 20, percentage: 20 },
        { muscleGroup: 'back', targetTU: 25, percentage: 25 },
        { muscleGroup: 'shoulders', targetTU: 20, percentage: 20 },
        { muscleGroup: 'arms', targetTU: 15, percentage: 15 },
        { muscleGroup: 'core', targetTU: 15, percentage: 15 },
        { muscleGroup: 'legs', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // PUSH (4x/week)
        {
          exerciseId: 'bw_pushup',
          sets: 5,
          reps: 15,
          intensity: 0.70,
          frequency: 4,
          notes: 'Perfect form, full ROM'
        },
        {
          exerciseId: 'bw_dip',
          sets: 5,
          reps: 10,
          intensity: 0.75,
          frequency: 3,
          notes: 'Deep dips, control'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 3,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'Wall-assisted if needed'
        },

        // PULL (4x/week)
        {
          exerciseId: 'bw_pullup',
          sets: 6,
          reps: 8,
          intensity: 0.75,
          frequency: 4,
          notes: 'Strict, chest to bar'
        },
        {
          exerciseId: 'bw_chinup',
          sets: 5,
          reps: 10,
          intensity: 0.75,
          frequency: 3,
          notes: 'Bicep emphasis'
        },
        {
          exerciseId: 'bw_inverted_row',
          sets: 5,
          reps: 12,
          intensity: 0.70,
          frequency: 4,
          notes: 'Horizontal pulling'
        },

        // CORE (5x/week)
        {
          exerciseId: 'bw_plank',
          sets: 5,
          reps: '60sec',
          intensity: 0.70,
          frequency: 5,
          notes: 'Daily midline work'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 5,
          reps: '45sec',
          intensity: 0.75,
          frequency: 4,
          notes: 'Gymnastics core position'
        },
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 3,
          notes: 'Compression strength'
        },

        // LEGS (2x/week)
        {
          exerciseId: 'bw_squat',
          sets: 5,
          reps: 20,
          intensity: 0.65,
          frequency: 2,
          notes: 'Leg endurance'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 4,
          reps: 8,
          intensity: 0.80,
          frequency: 2,
          notes: 'Unilateral control'
        },
      ],
      description: 'Build base strength for gymnastics movements',
    },

    // LEVEL 2: Skill Development
    {
      level: 2,
      name: 'Skill Integration',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'chest', targetTU: 22, percentage: 22 },
        { muscleGroup: 'back', targetTU: 28, percentage: 28 },
        { muscleGroup: 'shoulders', targetTU: 22, percentage: 22 },
        { muscleGroup: 'arms', targetTU: 13, percentage: 13 },
        { muscleGroup: 'core', targetTU: 13, percentage: 13 },
        { muscleGroup: 'legs', targetTU: 2, percentage: 2 },
      ],
      weeklyPrescription: [
        // ADVANCED PUSH
        {
          exerciseId: 'bw_pushup',
          sets: 8,
          reps: 20,
          intensity: 0.75,
          frequency: 4,
          notes: 'Diamond, archer variations'
        },
        {
          exerciseId: 'bw_dip',
          sets: 6,
          reps: 15,
          intensity: 0.80,
          frequency: 4,
          notes: 'Ring dips if possible'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 6,
          reps: 10,
          intensity: 0.85,
          frequency: 3,
          notes: 'Freestanding work'
        },

        // ADVANCED PULL
        {
          exerciseId: 'bw_pullup',
          sets: 8,
          reps: 12,
          intensity: 0.80,
          frequency: 4,
          notes: 'L-sit pullups'
        },
        {
          exerciseId: 'bw_muscle_up',
          sets: 5,
          reps: 5,
          intensity: 0.85,
          frequency: 3,
          notes: 'Strict muscle-ups'
        },
        {
          exerciseId: 'bw_chinup',
          sets: 6,
          reps: 15,
          intensity: 0.78,
          frequency: 3,
          notes: 'High volume pulling'
        },

        // CORE MASTERY
        {
          exerciseId: 'bw_hollow_hold',
          sets: 8,
          reps: '60sec',
          intensity: 0.80,
          frequency: 5,
          notes: 'Extended holds'
        },
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 6,
          reps: 15,
          intensity: 0.82,
          frequency: 4,
          notes: 'Toes to bar'
        },

        // SUPPORTING WORK
        {
          exerciseId: 'bw_nordic_curl',
          sets: 5,
          reps: 8,
          intensity: 0.85,
          frequency: 2,
          notes: 'Hamstring strength'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 5,
          reps: 12,
          intensity: 0.83,
          frequency: 2,
          notes: 'Single leg mastery'
        },
      ],
      description: 'Advanced bodyweight skills and strength combinations',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Elite Mastery
    {
      level: 3,
      name: 'Elite Movement',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'chest', targetTU: 24, percentage: 24 },
        { muscleGroup: 'back', targetTU: 30, percentage: 30 },
        { muscleGroup: 'shoulders', targetTU: 24, percentage: 24 },
        { muscleGroup: 'arms', targetTU: 10, percentage: 10 },
        { muscleGroup: 'core', targetTU: 12, percentage: 12 },
      ],
      weeklyPrescription: [
        // ELITE PUSH
        {
          exerciseId: 'bw_hspu',
          sets: 10,
          reps: 15,
          intensity: 0.88,
          frequency: 4,
          notes: 'Freestanding deficit HSPU'
        },
        {
          exerciseId: 'bw_dip',
          sets: 10,
          reps: 20,
          intensity: 0.85,
          frequency: 4,
          notes: 'Weighted ring dips'
        },

        // ELITE PULL
        {
          exerciseId: 'bw_muscle_up',
          sets: 10,
          reps: 8,
          intensity: 0.90,
          frequency: 4,
          notes: 'Strict bar & ring MU'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 10,
          reps: 'Max',
          intensity: 0.85,
          frequency: 5,
          notes: 'Weighted to failure'
        },

        // ELITE CORE
        {
          exerciseId: 'bw_hollow_hold',
          sets: 10,
          reps: '90sec',
          intensity: 0.85,
          frequency: 5,
          notes: 'Extended with weight'
        },
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 10,
          reps: 20,
          intensity: 0.88,
          frequency: 5,
          notes: 'Windshield wipers'
        },

        // SUPPORTING
        {
          exerciseId: 'bw_nordic_curl',
          sets: 8,
          reps: 12,
          intensity: 0.90,
          frequency: 3,
          notes: 'Full eccentric control'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 8,
          reps: 15,
          intensity: 0.88,
          frequency: 2,
          notes: 'Weighted pistols'
        },
      ],
      description: 'Peak gymnastics strength and control',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// EXPORT
// ============================================================================

export const ARCHETYPE_DATABASE: Archetype[] = [
  BODYBUILDER_ARCHETYPE,
  CROSSFIT_ARCHETYPE,
  GYMNAST_ARCHETYPE,
];

// Helper functions
export function getArchetypeById(id: string): Archetype | undefined {
  return ARCHETYPE_DATABASE.find(a => a.id === id);
}

export function calculateLevelProgress(
  completedTU: number,
  level: ArchetypeLevel
): number {
  return (completedTU / level.totalTU) * 100;
}

export function getNextLevel(
  archetype: Archetype,
  currentLevel: number
): ArchetypeLevel | undefined {
  return archetype.levels.find(l => l.level === currentLevel + 1);
}

// Statistics
console.log(`Total archetypes: ${ARCHETYPE_DATABASE.length}`);
console.log(`Total levels: ${ARCHETYPE_DATABASE.reduce((sum, a) => sum + a.levels.length, 0)}`);
console.log(`Total exercise prescriptions: ${ARCHETYPE_DATABASE.reduce((sum, a) => 
  sum + a.levels.reduce((lsum, l) => lsum + l.weeklyPrescription.length, 0), 0)}`);
