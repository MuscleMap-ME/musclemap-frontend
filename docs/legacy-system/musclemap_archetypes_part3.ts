/**
 * MuscleMap Archetype System - PART 3 (FINAL)
 * 3 Final Archetypes: Strongman, Endurance Athlete, Functional Fitness
 * Each with 3 levels × 100 TU = 900 additional Training Units
 */

import { Archetype, ArchetypeLevel } from './musclemap_archetype_system';

// ============================================================================
// STRONGMAN ARCHETYPE
// ============================================================================

const STRONGMAN_ARCHETYPE: Archetype = {
  id: 'strongman',
  name: 'Strongman',
  philosophy: 'Maximum absolute strength with varied implements and odd objects',
  focusAreas: ['Maximal strength', 'Grip strength', 'Event-specific power', 'Work capacity'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Strength Base',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'posterior_chain', targetTU: 35, percentage: 35 },
        { muscleGroup: 'legs', targetTU: 30, percentage: 30 },
        { muscleGroup: 'back', targetTU: 20, percentage: 20 },
        { muscleGroup: 'shoulders', targetTU: 10, percentage: 10 },
        { muscleGroup: 'core', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // DEADLIFT VARIATIONS (2x/week)
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 5,
          intensity: 0.82,
          frequency: 2,
          notes: 'Heavy conventional pulls'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Hamstring builder'
        },

        // SQUAT VARIATIONS (2x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 5,
          reps: 5,
          intensity: 0.82,
          frequency: 2,
          notes: 'Low bar power squat'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 4,
          reps: 6,
          intensity: 0.78,
          frequency: 1,
          notes: 'Quad strength'
        },

        // PRESSING (2x/week)
        {
          exerciseId: 'bb_overhead_press',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'Strict press strength'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Pressing base'
        },

        // BACK WORK (2x/week)
        {
          exerciseId: 'bb_bent_row',
          sets: 5,
          reps: 8,
          intensity: 0.78,
          frequency: 2,
          notes: 'Upper back strength'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 10,
          intensity: 0.78,
          frequency: 2,
          notes: 'Weighted pullups for grip'
        },

        // KETTLEBELL WORK (2x/week)
        {
          exerciseId: 'kb_swing',
          sets: 5,
          reps: 20,
          intensity: 0.75,
          frequency: 2,
          notes: 'Hip snap power'
        },
        {
          exerciseId: 'kb_turkish_getup',
          sets: 3,
          reps: 5,
          intensity: 0.78,
          frequency: 2,
          notes: 'Total body strength'
        },

        // CORE (2x/week)
        {
          exerciseId: 'bw_plank',
          sets: 4,
          reps: '60sec',
          intensity: 0.75,
          frequency: 2,
          notes: 'Midline stability'
        },
      ],
      description: 'Build foundational strength for strongman events',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Event Training',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'posterior_chain', targetTU: 38, percentage: 38 },
        { muscleGroup: 'legs', targetTU: 32, percentage: 32 },
        { muscleGroup: 'back', targetTU: 18, percentage: 18 },
        { muscleGroup: 'shoulders', targetTU: 8, percentage: 8 },
        { muscleGroup: 'core', targetTU: 4, percentage: 4 },
      ],
      weeklyPrescription: [
        // HEAVY PULLS (2x/week)
        {
          exerciseId: 'bb_deadlift',
          sets: 6,
          reps: 3,
          intensity: 0.87,
          frequency: 2,
          notes: 'Heavy triples - competition style'
        },
        {
          exerciseId: 'bb_good_morning',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Lower back endurance'
        },

        // SQUATS - Max effort (2x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 6,
          reps: 3,
          intensity: 0.87,
          frequency: 2,
          notes: 'Heavy back squat'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 5,
          reps: 5,
          intensity: 0.82,
          frequency: 2,
          notes: 'Front squat strength'
        },

        // OVERHEAD - Event simulation (2x/week)
        {
          exerciseId: 'bb_overhead_press',
          sets: 6,
          reps: 3,
          intensity: 0.85,
          frequency: 2,
          notes: 'Push press allowed'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 5,
          reps: 10,
          intensity: 0.82,
          frequency: 2,
          notes: 'Overhead endurance'
        },

        // BACK & GRIP (2x/week)
        {
          exerciseId: 'bb_bent_row',
          sets: 6,
          reps: 8,
          intensity: 0.82,
          frequency: 2,
          notes: 'Heavy rows'
        },
        {
          exerciseId: 'bb_pendlay_row',
          sets: 5,
          reps: 6,
          intensity: 0.83,
          frequency: 2,
          notes: 'Explosive pulling'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 12,
          intensity: 0.82,
          frequency: 2,
          notes: 'Heavy weighted for grip'
        },

        // LOADED CARRIES SIMULATION (2x/week)
        {
          exerciseId: 'kb_swing',
          sets: 8,
          reps: 25,
          intensity: 0.80,
          frequency: 2,
          notes: 'Heavy swings for work capacity'
        },
        {
          exerciseId: 'kb_turkish_getup',
          sets: 5,
          reps: 5,
          intensity: 0.83,
          frequency: 2,
          notes: 'Heavy TGU'
        },

        // CORE STRENGTH
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 5,
          reps: 15,
          intensity: 0.80,
          frequency: 2,
          notes: 'Weighted core work'
        },
      ],
      description: 'Develop event-specific strength and work capacity',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Competition Ready',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'posterior_chain', targetTU: 40, percentage: 40 },
        { muscleGroup: 'legs', targetTU: 34, percentage: 34 },
        { muscleGroup: 'back', targetTU: 16, percentage: 16 },
        { muscleGroup: 'shoulders', targetTU: 7, percentage: 7 },
        { muscleGroup: 'core', targetTU: 3, percentage: 3 },
      ],
      weeklyPrescription: [
        // MAX EFFORT DEADLIFT
        {
          exerciseId: 'bb_deadlift',
          sets: 8,
          reps: 1,
          intensity: 0.92,
          frequency: 2,
          notes: 'Max singles - straps allowed'
        },
        {
          exerciseId: 'bb_hip_thrust',
          sets: 6,
          reps: 8,
          intensity: 0.85,
          frequency: 2,
          notes: 'Glute power for lockout'
        },

        // MAX SQUAT
        {
          exerciseId: 'bb_back_squat',
          sets: 8,
          reps: 1,
          intensity: 0.92,
          frequency: 2,
          notes: 'Competition depth'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 6,
          reps: 3,
          intensity: 0.87,
          frequency: 1,
          notes: 'Heavy triples'
        },

        // MAX OVERHEAD
        {
          exerciseId: 'bb_overhead_press',
          sets: 8,
          reps: 1,
          intensity: 0.92,
          frequency: 2,
          notes: 'Log press simulation - push press'
        },

        // BACK STRENGTH
        {
          exerciseId: 'bb_bent_row',
          sets: 8,
          reps: 6,
          intensity: 0.85,
          frequency: 2,
          notes: 'Maximal back work'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 8,
          reps: 'Max',
          intensity: 0.88,
          frequency: 2,
          notes: 'Heavy weighted to failure'
        },

        // EVENT WORK
        {
          exerciseId: 'kb_swing',
          sets: 10,
          reps: 30,
          intensity: 0.85,
          frequency: 2,
          notes: 'Max weight, max reps'
        },
        {
          exerciseId: 'bb_clean',
          sets: 6,
          reps: 2,
          intensity: 0.85,
          frequency: 2,
          notes: 'Clean and press simulation'
        },
      ],
      description: 'Peak strength for strongman competition',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// ENDURANCE ATHLETE ARCHETYPE
// ============================================================================

const ENDURANCE_ATHLETE_ARCHETYPE: Archetype = {
  id: 'endurance',
  name: 'Endurance Athlete',
  philosophy: 'Muscular endurance, injury prevention, and metabolic conditioning',
  focusAreas: ['Muscular endurance', 'Core stability', 'Injury prevention', 'Movement efficiency'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Endurance Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 30, percentage: 30 },
        { muscleGroup: 'core', targetTU: 25, percentage: 25 },
        { muscleGroup: 'posterior_chain', targetTU: 20, percentage: 20 },
        { muscleGroup: 'back', targetTU: 15, percentage: 15 },
        { muscleGroup: 'shoulders', targetTU: 10, percentage: 10 },
      ],
      weeklyPrescription: [
        // LEG ENDURANCE (3x/week)
        {
          exerciseId: 'bw_squat',
          sets: 4,
          reps: 25,
          intensity: 0.60,
          frequency: 3,
          notes: 'High rep squats for endurance'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 4,
          reps: 20,
          intensity: 0.65,
          frequency: 3,
          notes: 'Unilateral endurance'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 3,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Single leg strength'
        },

        // CORE STABILITY (5x/week)
        {
          exerciseId: 'bw_plank',
          sets: 4,
          reps: '60sec',
          intensity: 0.65,
          frequency: 5,
          notes: 'Daily core work'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 4,
          reps: '45sec',
          intensity: 0.68,
          frequency: 4,
          notes: 'Anti-extension endurance'
        },
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 3,
          reps: 15,
          intensity: 0.70,
          frequency: 3,
          notes: 'Hip flexor endurance'
        },

        // POSTERIOR CHAIN (2x/week)
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 3,
          reps: 15,
          intensity: 0.60,
          frequency: 2,
          notes: 'Light hamstring work'
        },
        {
          exerciseId: 'bw_nordic_curl',
          sets: 3,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Hamstring injury prevention'
        },
        {
          exerciseId: 'bb_hip_thrust',
          sets: 3,
          reps: 20,
          intensity: 0.65,
          frequency: 2,
          notes: 'Glute activation'
        },

        // UPPER BODY (2x/week)
        {
          exerciseId: 'bw_pushup',
          sets: 4,
          reps: 20,
          intensity: 0.65,
          frequency: 2,
          notes: 'Push endurance'
        },
        {
          exerciseId: 'bw_inverted_row',
          sets: 4,
          reps: 15,
          intensity: 0.68,
          frequency: 2,
          notes: 'Pull endurance'
        },

        // CONDITIONING (3x/week)
        {
          exerciseId: 'kb_swing',
          sets: 6,
          reps: 30,
          intensity: 0.65,
          frequency: 3,
          notes: 'Metabolic conditioning'
        },
      ],
      description: 'Build muscular endurance and injury resilience',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Endurance Development',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 32, percentage: 32 },
        { muscleGroup: 'core', targetTU: 28, percentage: 28 },
        { muscleGroup: 'posterior_chain', targetTU: 20, percentage: 20 },
        { muscleGroup: 'back', targetTU: 12, percentage: 12 },
        { muscleGroup: 'shoulders', targetTU: 8, percentage: 8 },
      ],
      weeklyPrescription: [
        // HIGH REP LEGS (4x/week)
        {
          exerciseId: 'bw_squat',
          sets: 5,
          reps: 40,
          intensity: 0.62,
          frequency: 4,
          notes: 'Ultra-high rep endurance'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 5,
          reps: 30,
          intensity: 0.68,
          frequency: 3,
          notes: 'Lunge endurance'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 5,
          reps: 15,
          intensity: 0.75,
          frequency: 3,
          notes: 'Advanced single leg'
        },

        // CORE MASTERY (5x/week)
        {
          exerciseId: 'bw_plank',
          sets: 5,
          reps: '90sec',
          intensity: 0.70,
          frequency: 5,
          notes: 'Extended holds'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 5,
          reps: '60sec',
          intensity: 0.73,
          frequency: 5,
          notes: 'Longer holds'
        },
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 5,
          reps: 20,
          intensity: 0.75,
          frequency: 4,
          notes: 'High volume core'
        },

        // POSTERIOR RESILIENCE (3x/week)
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 20,
          intensity: 0.65,
          frequency: 3,
          notes: 'High rep RDLs'
        },
        {
          exerciseId: 'bw_nordic_curl',
          sets: 5,
          reps: 10,
          intensity: 0.80,
          frequency: 3,
          notes: 'Progressive hamstring strength'
        },
        {
          exerciseId: 'bb_hip_thrust',
          sets: 5,
          reps: 25,
          intensity: 0.70,
          frequency: 3,
          notes: 'Glute endurance'
        },

        // UPPER ENDURANCE (3x/week)
        {
          exerciseId: 'bw_pushup',
          sets: 5,
          reps: 30,
          intensity: 0.70,
          frequency: 3,
          notes: 'Push volume'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 12,
          intensity: 0.75,
          frequency: 3,
          notes: 'Pull endurance'
        },
        {
          exerciseId: 'bw_inverted_row',
          sets: 5,
          reps: 20,
          intensity: 0.72,
          frequency: 3,
          notes: 'Horizontal pull volume'
        },

        // CONDITIONING (4x/week)
        {
          exerciseId: 'kb_swing',
          sets: 8,
          reps: 40,
          intensity: 0.70,
          frequency: 4,
          notes: 'High volume swings'
        },
        {
          exerciseId: 'kb_snatch',
          sets: 6,
          reps: 15,
          intensity: 0.72,
          frequency: 3,
          notes: 'Conditioning power'
        },
      ],
      description: 'Advanced endurance with high volume training',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Elite Endurance',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 35, percentage: 35 },
        { muscleGroup: 'core', targetTU: 30, percentage: 30 },
        { muscleGroup: 'posterior_chain', targetTU: 18, percentage: 18 },
        { muscleGroup: 'back', targetTU: 10, percentage: 10 },
        { muscleGroup: 'shoulders', targetTU: 7, percentage: 7 },
      ],
      weeklyPrescription: [
        // EXTREME LEG ENDURANCE (5x/week)
        {
          exerciseId: 'bw_squat',
          sets: 8,
          reps: 50,
          intensity: 0.65,
          frequency: 5,
          notes: 'Competition endurance'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 8,
          reps: 40,
          intensity: 0.72,
          frequency: 4,
          notes: 'Max volume lunges'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 8,
          reps: 20,
          intensity: 0.80,
          frequency: 4,
          notes: 'Elite single leg'
        },

        // PEAK CORE (6x/week)
        {
          exerciseId: 'bw_plank',
          sets: 8,
          reps: '120sec',
          intensity: 0.75,
          frequency: 6,
          notes: '2-minute holds'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 8,
          reps: '90sec',
          intensity: 0.78,
          frequency: 6,
          notes: 'Extended hollow holds'
        },
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 8,
          reps: 30,
          intensity: 0.80,
          frequency: 5,
          notes: 'Maximum volume'
        },

        // POSTERIOR PERFECTION (4x/week)
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 6,
          reps: 25,
          intensity: 0.68,
          frequency: 4,
          notes: 'Ultra-high rep RDLs'
        },
        {
          exerciseId: 'bw_nordic_curl',
          sets: 8,
          reps: 12,
          intensity: 0.85,
          frequency: 4,
          notes: 'Maximum hamstring capacity'
        },
        {
          exerciseId: 'bb_hip_thrust',
          sets: 8,
          reps: 30,
          intensity: 0.73,
          frequency: 4,
          notes: 'Peak glute endurance'
        },

        // UPPER BODY CAPACITY (4x/week)
        {
          exerciseId: 'bw_pushup',
          sets: 10,
          reps: 40,
          intensity: 0.73,
          frequency: 4,
          notes: 'Max push endurance'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 10,
          reps: 15,
          intensity: 0.78,
          frequency: 4,
          notes: 'High volume pulling'
        },

        // MAX CONDITIONING (5x/week)
        {
          exerciseId: 'kb_swing',
          sets: 10,
          reps: 50,
          intensity: 0.73,
          frequency: 5,
          notes: 'Competition swing endurance'
        },
        {
          exerciseId: 'kb_snatch',
          sets: 10,
          reps: 20,
          intensity: 0.75,
          frequency: 4,
          notes: 'Max snatch volume'
        },
      ],
      description: 'Peak endurance capacity for ultra-distance events',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// FUNCTIONAL FITNESS ARCHETYPE
// ============================================================================

const FUNCTIONAL_FITNESS_ARCHETYPE: Archetype = {
  id: 'functional',
  name: 'Functional Fitness',
  philosophy: 'Movement quality, longevity, and real-world strength',
  focusAreas: ['Movement patterns', 'Mobility', 'Stability', 'Longevity'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Movement Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'core', targetTU: 25, percentage: 25 },
        { muscleGroup: 'legs', targetTU: 20, percentage: 20 },
        { muscleGroup: 'back', targetTU: 20, percentage: 20 },
        { muscleGroup: 'posterior_chain', targetTU: 15, percentage: 15 },
        { muscleGroup: 'shoulders', targetTU: 15, percentage: 15 },
        { muscleGroup: 'chest', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // MOVEMENT PATTERNS (4x/week)
        {
          exerciseId: 'kb_goblet_squat',
          sets: 4,
          reps: 12,
          intensity: 0.70,
          frequency: 4,
          notes: 'Perfect squat pattern'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 10,
          intensity: 0.68,
          frequency: 3,
          notes: 'Hip hinge mastery'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 4,
          reps: 12,
          intensity: 0.70,
          frequency: 3,
          notes: 'Lunging pattern'
        },

        // PUSH/PULL BALANCE (3x/week)
        {
          exerciseId: 'bw_pushup',
          sets: 4,
          reps: 15,
          intensity: 0.70,
          frequency: 3,
          notes: 'Horizontal push'
        },
        {
          exerciseId: 'kb_press',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 3,
          notes: 'Vertical push'
        },
        {
          exerciseId: 'bw_inverted_row',
          sets: 4,
          reps: 12,
          intensity: 0.72,
          frequency: 3,
          notes: 'Horizontal pull'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 8,
          intensity: 0.73,
          frequency: 3,
          notes: 'Vertical pull'
        },

        // CORE STABILITY (5x/week)
        {
          exerciseId: 'bw_plank',
          sets: 4,
          reps: '60sec',
          intensity: 0.70,
          frequency: 5,
          notes: 'Anti-extension'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 4,
          reps: '45sec',
          intensity: 0.72,
          frequency: 4,
          notes: 'Core bracing'
        },

        // TOTAL BODY (3x/week)
        {
          exerciseId: 'kb_swing',
          sets: 5,
          reps: 20,
          intensity: 0.70,
          frequency: 3,
          notes: 'Hip power'
        },
        {
          exerciseId: 'kb_turkish_getup',
          sets: 3,
          reps: 5,
          intensity: 0.75,
          frequency: 3,
          notes: 'Integrative movement'
        },
      ],
      description: 'Master fundamental movement patterns with quality',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Movement Integration',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'core', targetTU: 26, percentage: 26 },
        { muscleGroup: 'legs', targetTU: 22, percentage: 22 },
        { muscleGroup: 'back', targetTU: 22, percentage: 22 },
        { muscleGroup: 'posterior_chain', targetTU: 14, percentage: 14 },
        { muscleGroup: 'shoulders', targetTU: 14, percentage: 14 },
        { muscleGroup: 'chest', targetTU: 2, percentage: 2 },
      ],
      weeklyPrescription: [
        // LOADED PATTERNS (4x/week)
        {
          exerciseId: 'bb_front_squat',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 3,
          notes: 'Loaded squat variation'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 3,
          notes: 'Heavy hip hinge'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 4,
          reps: 10,
          intensity: 0.78,
          frequency: 3,
          notes: 'Single leg mastery'
        },

        // PUSH/PULL PROGRESSION (4x/week)
        {
          exerciseId: 'bw_dip',
          sets: 5,
          reps: 12,
          intensity: 0.77,
          frequency: 3,
          notes: 'Advanced push'
        },
        {
          exerciseId: 'bb_overhead_press',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 3,
          notes: 'Overhead strength'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 12,
          intensity: 0.78,
          frequency: 4,
          notes: 'Pullup volume'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 5,
          reps: 10,
          intensity: 0.75,
          frequency: 3,
          notes: 'Heavy rowing'
        },

        // ADVANCED CORE (5x/week)
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 5,
          reps: 15,
          intensity: 0.77,
          frequency: 4,
          notes: 'Advanced anti-extension'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 5,
          reps: '60sec',
          intensity: 0.75,
          frequency: 5,
          notes: 'Extended holds'
        },

        // COMPLEX MOVEMENTS (3x/week)
        {
          exerciseId: 'kb_snatch',
          sets: 6,
          reps: 10,
          intensity: 0.75,
          frequency: 3,
          notes: 'Total body power'
        },
        {
          exerciseId: 'kb_clean',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 3,
          notes: 'Clean pattern'
        },
        {
          exerciseId: 'kb_turkish_getup',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 3,
          notes: 'Heavy TGU'
        },
      ],
      description: 'Integrate complex movement patterns with load',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Movement Mastery',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'core', targetTU: 28, percentage: 28 },
        { muscleGroup: 'legs', targetTU: 24, percentage: 24 },
        { muscleGroup: 'back', targetTU: 24, percentage: 24 },
        { muscleGroup: 'posterior_chain', targetTU: 12, percentage: 12 },
        { muscleGroup: 'shoulders', targetTU: 12, percentage: 12 },
      ],
      weeklyPrescription: [
        // MASTERY PATTERNS (4x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 6,
          reps: 6,
          intensity: 0.82,
          frequency: 3,
          notes: 'Heavy squat strength'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 5,
          intensity: 0.83,
          frequency: 3,
          notes: 'Competition deadlift'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 6,
          reps: 12,
          intensity: 0.83,
          frequency: 3,
          notes: 'Mastered single leg'
        },

        // ELITE PUSH/PULL (4x/week)
        {
          exerciseId: 'bw_muscle_up',
          sets: 6,
          reps: 6,
          intensity: 0.87,
          frequency: 3,
          notes: 'Muscle-up proficiency'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 6,
          reps: 12,
          intensity: 0.85,
          frequency: 3,
          notes: 'Advanced pressing'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 8,
          reps: 15,
          intensity: 0.83,
          frequency: 4,
          notes: 'High volume weighted'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 6,
          reps: 8,
          intensity: 0.82,
          frequency: 3,
          notes: 'Heavy rows'
        },

        // PEAK CORE (5x/week)
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 8,
          reps: 20,
          intensity: 0.83,
          frequency: 5,
          notes: 'Max core strength'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 8,
          reps: '90sec',
          intensity: 0.82,
          frequency: 5,
          notes: 'Extended hollow holds'
        },

        // OLYMPIC INTEGRATION (3x/week)
        {
          exerciseId: 'bb_clean',
          sets: 6,
          reps: 3,
          intensity: 0.80,
          frequency: 3,
          notes: 'Power clean technique'
        },
        {
          exerciseId: 'bb_snatch',
          sets: 5,
          reps: 2,
          intensity: 0.78,
          frequency: 3,
          notes: 'Snatch integration'
        },
        {
          exerciseId: 'kb_turkish_getup',
          sets: 6,
          reps: 5,
          intensity: 0.85,
          frequency: 3,
          notes: 'Elite TGU'
        },
      ],
      description: 'Master all movement patterns for peak functional capacity',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// EXPORT
// ============================================================================

export const FINAL_ARCHETYPES: Archetype[] = [
  STRONGMAN_ARCHETYPE,
  ENDURANCE_ATHLETE_ARCHETYPE,
  FUNCTIONAL_FITNESS_ARCHETYPE,
];

// Statistics
console.log(`Final archetypes: ${FINAL_ARCHETYPES.length}`);
console.log(`Final levels: ${FINAL_ARCHETYPES.reduce((sum, a) => sum + a.levels.length, 0)}`);
console.log(`Final TU content: ${FINAL_ARCHETYPES.length * 3 * 100}`);
