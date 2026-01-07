/**
 * MuscleMap Archetype System - PART 2
 * 4 Additional Archetypes: Powerlifter, Olympic Lifter, Physique, General Fitness
 * Each with 3 levels × 100 TU = 1200 additional Training Units
 */

import { Archetype, ArchetypeLevel } from './musclemap_archetype_system';

// ============================================================================
// POWERLIFTER ARCHETYPE
// ============================================================================

const POWERLIFTER_ARCHETYPE: Archetype = {
  id: 'powerlifter',
  name: 'Powerlifter',
  philosophy: 'Maximum strength in the big 3: squat, bench, deadlift',
  focusAreas: ['Squat strength', 'Bench press', 'Deadlift', 'Supportive work'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Strength Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 30, percentage: 30 },
        { muscleGroup: 'posterior_chain', targetTU: 30, percentage: 30 },
        { muscleGroup: 'chest', targetTU: 20, percentage: 20 },
        { muscleGroup: 'back', targetTU: 15, percentage: 15 },
        { muscleGroup: 'shoulders', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // SQUAT DAY (2x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'Main squat work - linear progression'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 3,
          reps: 8,
          intensity: 0.70,
          frequency: 1,
          notes: 'Quad emphasis accessory'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 3,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Unilateral leg work'
        },

        // BENCH DAY (2x/week)
        {
          exerciseId: 'bb_bench_press',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'Main bench work - linear progression'
        },
        {
          exerciseId: 'bb_incline_bench',
          sets: 4,
          reps: 8,
          intensity: 0.72,
          frequency: 1,
          notes: 'Upper chest accessory'
        },
        {
          exerciseId: 'bw_dip',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Tricep lockout strength'
        },

        // DEADLIFT DAY (1-2x/week)
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 1,
          notes: 'Main deadlift - once per week'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 8,
          intensity: 0.70,
          frequency: 2,
          notes: 'Hamstring and lockout work'
        },
        {
          exerciseId: 'bb_good_morning',
          sets: 3,
          reps: 10,
          intensity: 0.65,
          frequency: 1,
          notes: 'Lower back strength'
        },

        // BACK WORK (2x/week)
        {
          exerciseId: 'bb_bent_row',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Upper back thickness for bench'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Lat width and grip strength'
        },
      ],
      description: 'Build base strength in the big 3 with linear progression',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Strength Specialization',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 32, percentage: 32 },
        { muscleGroup: 'posterior_chain', targetTU: 32, percentage: 32 },
        { muscleGroup: 'chest', targetTU: 20, percentage: 20 },
        { muscleGroup: 'back', targetTU: 13, percentage: 13 },
        { muscleGroup: 'shoulders', targetTU: 3, percentage: 3 },
      ],
      weeklyPrescription: [
        // SQUAT - Periodized
        {
          exerciseId: 'bb_back_squat',
          sets: 6,
          reps: 3,
          intensity: 0.85,
          frequency: 2,
          notes: 'Heavy triples - wave loading'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 4,
          reps: 6,
          intensity: 0.75,
          frequency: 2,
          notes: 'Volume work'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 4,
          reps: 8,
          intensity: 0.80,
          frequency: 1,
          notes: 'Single leg stability'
        },

        // BENCH - Volume + Intensity
        {
          exerciseId: 'bb_bench_press',
          sets: 6,
          reps: 3,
          intensity: 0.85,
          frequency: 1,
          notes: 'Heavy day'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 5,
          reps: 8,
          intensity: 0.72,
          frequency: 1,
          notes: 'Volume day'
        },
        {
          exerciseId: 'bb_incline_bench',
          sets: 5,
          reps: 6,
          intensity: 0.78,
          frequency: 2,
          notes: 'Upper chest strength'
        },
        {
          exerciseId: 'bw_dip',
          sets: 5,
          reps: 12,
          intensity: 0.78,
          frequency: 2,
          notes: 'Weighted dips'
        },

        // DEADLIFT - Heavy singles
        {
          exerciseId: 'bb_deadlift',
          sets: 6,
          reps: 2,
          intensity: 0.87,
          frequency: 1,
          notes: 'Heavy doubles - competition style'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 5,
          reps: 6,
          intensity: 0.75,
          frequency: 2,
          notes: 'Hamstring builder'
        },
        {
          exerciseId: 'bb_good_morning',
          sets: 4,
          reps: 8,
          intensity: 0.70,
          frequency: 2,
          notes: 'Erector strength'
        },

        // BACK - Supporting work
        {
          exerciseId: 'bb_bent_row',
          sets: 6,
          reps: 6,
          intensity: 0.80,
          frequency: 2,
          notes: 'Heavy rows'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 12,
          intensity: 0.80,
          frequency: 2,
          notes: 'Weighted pullups'
        },
      ],
      description: 'Periodized training with heavy singles, doubles, triples',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Competition Strength',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 34, percentage: 34 },
        { muscleGroup: 'posterior_chain', targetTU: 34, percentage: 34 },
        { muscleGroup: 'chest', targetTU: 22, percentage: 22 },
        { muscleGroup: 'back', targetTU: 10, percentage: 10 },
      ],
      weeklyPrescription: [
        // SQUAT - Competition prep
        {
          exerciseId: 'bb_back_squat',
          sets: 8,
          reps: 1,
          intensity: 0.90,
          frequency: 2,
          notes: 'Heavy singles - opener weight'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 1,
          notes: 'Quad strength maintenance'
        },

        // BENCH - Max effort
        {
          exerciseId: 'bb_bench_press',
          sets: 8,
          reps: 1,
          intensity: 0.92,
          frequency: 1,
          notes: 'Max singles - technical practice'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 6,
          reps: 6,
          intensity: 0.75,
          frequency: 1,
          notes: 'Volume work - fatigue management'
        },
        {
          exerciseId: 'bw_dip',
          sets: 6,
          reps: 15,
          intensity: 0.82,
          frequency: 2,
          notes: 'Heavy weighted dips'
        },

        // DEADLIFT - Peaking
        {
          exerciseId: 'bb_deadlift',
          sets: 8,
          reps: 1,
          intensity: 0.92,
          frequency: 1,
          notes: 'Max effort singles'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 8,
          intensity: 0.72,
          frequency: 1,
          notes: 'Light accessory work'
        },

        // BACK - Minimal volume
        {
          exerciseId: 'bb_bent_row',
          sets: 5,
          reps: 8,
          intensity: 0.78,
          frequency: 1,
          notes: 'Maintenance only'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 1,
          notes: 'Light pulling'
        },
      ],
      description: 'Peak strength for competition - max singles and doubles',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// OLYMPIC LIFTER ARCHETYPE
// ============================================================================

const OLYMPIC_LIFTER_ARCHETYPE: Archetype = {
  id: 'olympic_lifter',
  name: 'Olympic Lifter',
  philosophy: 'Explosive power and technical mastery in snatch and clean & jerk',
  focusAreas: ['Snatch', 'Clean & Jerk', 'Squat strength', 'Pulling power'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Technical Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 35, percentage: 35 },
        { muscleGroup: 'posterior_chain', targetTU: 30, percentage: 30 },
        { muscleGroup: 'back', targetTU: 15, percentage: 15 },
        { muscleGroup: 'shoulders', targetTU: 15, percentage: 15 },
        { muscleGroup: 'core', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // SNATCH (3x/week)
        {
          exerciseId: 'bb_snatch',
          sets: 6,
          reps: 2,
          intensity: 0.70,
          frequency: 3,
          notes: 'Technical work - power snatch'
        },
        {
          exerciseId: 'kb_snatch',
          sets: 5,
          reps: 8,
          intensity: 0.65,
          frequency: 2,
          notes: 'Unilateral power development'
        },

        // CLEAN & JERK (3x/week)
        {
          exerciseId: 'bb_clean',
          sets: 6,
          reps: 2,
          intensity: 0.75,
          frequency: 3,
          notes: 'Power clean technique'
        },
        {
          exerciseId: 'bb_overhead_press',
          sets: 5,
          reps: 5,
          intensity: 0.75,
          frequency: 3,
          notes: 'Jerk strength foundation'
        },

        // SQUAT (4x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 5,
          reps: 5,
          intensity: 0.80,
          frequency: 2,
          notes: 'General strength'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 5,
          reps: 5,
          intensity: 0.78,
          frequency: 3,
          notes: 'Clean recovery strength'
        },

        // PULLS (3x/week)
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 5,
          intensity: 0.75,
          frequency: 2,
          notes: 'Pulling strength base'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 4,
          reps: 8,
          intensity: 0.70,
          frequency: 2,
          notes: 'First pull position'
        },

        // ACCESSORIES (2x/week)
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Upper back strength'
        },
        {
          exerciseId: 'bw_dip',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Lockout strength'
        },
      ],
      description: 'Master technical positions and build strength base',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Power Development',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 36, percentage: 36 },
        { muscleGroup: 'posterior_chain', targetTU: 32, percentage: 32 },
        { muscleGroup: 'back', targetTU: 12, percentage: 12 },
        { muscleGroup: 'shoulders', targetTU: 16, percentage: 16 },
        { muscleGroup: 'core', targetTU: 4, percentage: 4 },
      ],
      weeklyPrescription: [
        // SNATCH - Heavier
        {
          exerciseId: 'bb_snatch',
          sets: 8,
          reps: 1,
          intensity: 0.82,
          frequency: 4,
          notes: 'Heavy singles - full snatch'
        },
        {
          exerciseId: 'kb_snatch',
          sets: 6,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'High rep explosiveness'
        },

        // CLEAN & JERK - Competition style
        {
          exerciseId: 'bb_clean',
          sets: 8,
          reps: 1,
          intensity: 0.85,
          frequency: 4,
          notes: 'Full clean + front squat'
        },
        {
          exerciseId: 'bb_overhead_press',
          sets: 6,
          reps: 3,
          intensity: 0.82,
          frequency: 3,
          notes: 'Heavy pressing for jerk'
        },

        // SQUAT - Volume
        {
          exerciseId: 'bb_back_squat',
          sets: 6,
          reps: 3,
          intensity: 0.85,
          frequency: 3,
          notes: 'Heavy back squat'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 6,
          reps: 2,
          intensity: 0.87,
          frequency: 3,
          notes: 'Heavy doubles - clean recovery'
        },

        // PULLS - Max effort
        {
          exerciseId: 'bb_deadlift',
          sets: 6,
          reps: 3,
          intensity: 0.82,
          frequency: 2,
          notes: 'Heavy pulling'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 5,
          reps: 5,
          intensity: 0.78,
          frequency: 2,
          notes: 'Position strength'
        },

        // ACCESSORIES
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 15,
          intensity: 0.80,
          frequency: 2,
          notes: 'Weighted if possible'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 5,
          reps: 8,
          intensity: 0.80,
          frequency: 2,
          notes: 'Overhead strength'
        },
      ],
      description: 'Develop maximal explosive power with heavy Olympic lifts',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Competition Ready',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 38, percentage: 38 },
        { muscleGroup: 'posterior_chain', targetTU: 34, percentage: 34 },
        { muscleGroup: 'back', targetTU: 10, percentage: 10 },
        { muscleGroup: 'shoulders', targetTU: 16, percentage: 16 },
        { muscleGroup: 'core', targetTU: 2, percentage: 2 },
      ],
      weeklyPrescription: [
        // SNATCH - Max attempts
        {
          exerciseId: 'bb_snatch',
          sets: 10,
          reps: 1,
          intensity: 0.88,
          frequency: 5,
          notes: 'Daily max singles - technical practice'
        },

        // CLEAN & JERK - Max attempts
        {
          exerciseId: 'bb_clean',
          sets: 10,
          reps: 1,
          intensity: 0.90,
          frequency: 5,
          notes: 'Competition clean & jerk'
        },

        // SQUAT - Peak strength
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
          sets: 8,
          reps: 1,
          intensity: 0.92,
          frequency: 3,
          notes: 'Max singles'
        },

        // PULLS - Minimal
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 3,
          intensity: 0.80,
          frequency: 1,
          notes: 'Maintenance only'
        },

        // ACCESSORIES - Light
        {
          exerciseId: 'bw_pullup',
          sets: 3,
          reps: 10,
          intensity: 0.70,
          frequency: 2,
          notes: 'Recovery work'
        },
      ],
      description: 'Peak for competition - daily maxes and technical perfection',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// PHYSIQUE ARCHETYPE
// ============================================================================

const PHYSIQUE_ARCHETYPE: Archetype = {
  id: 'physique',
  name: 'Physique',
  philosophy: 'Aesthetic proportions, symmetry, and stage-ready conditioning',
  focusAreas: ['Shoulder width', 'V-taper', 'Proportions', 'Definition'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Proportion Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'shoulders', targetTU: 25, percentage: 25 },
        { muscleGroup: 'back', targetTU: 25, percentage: 25 },
        { muscleGroup: 'chest', targetTU: 20, percentage: 20 },
        { muscleGroup: 'arms', targetTU: 15, percentage: 15 },
        { muscleGroup: 'legs', targetTU: 10, percentage: 10 },
        { muscleGroup: 'core', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // SHOULDERS - Priority (3x/week)
        {
          exerciseId: 'bb_overhead_press',
          sets: 5,
          reps: 8,
          intensity: 0.75,
          frequency: 3,
          notes: 'Boulder shoulders'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 4,
          reps: 10,
          intensity: 0.78,
          frequency: 2,
          notes: 'Delt development'
        },

        // BACK - Width emphasis (3x/week)
        {
          exerciseId: 'bw_pullup',
          sets: 5,
          reps: 10,
          intensity: 0.78,
          frequency: 3,
          notes: 'Wide grip for V-taper'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 5,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Thickness'
        },
        {
          exerciseId: 'bw_inverted_row',
          sets: 4,
          reps: 15,
          intensity: 0.72,
          frequency: 2,
          notes: 'Rear delt emphasis'
        },

        // CHEST - Upper focus (2x/week)
        {
          exerciseId: 'bb_incline_bench',
          sets: 5,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Upper chest priority'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 4,
          reps: 10,
          intensity: 0.73,
          frequency: 2,
          notes: 'Overall mass'
        },
        {
          exerciseId: 'bw_dip',
          sets: 4,
          reps: 12,
          intensity: 0.75,
          frequency: 2,
          notes: 'Lower chest shape'
        },

        // ARMS (2x/week)
        {
          exerciseId: 'bb_curl',
          sets: 5,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Bicep peaks'
        },
        {
          exerciseId: 'bb_skull_crusher',
          sets: 5,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Tricep horseshoe'
        },

        // LEGS - Moderate (2x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 4,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Leg development without excess mass'
        },

        // CORE (3x/week)
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 4,
          reps: 15,
          intensity: 0.75,
          frequency: 3,
          notes: 'Ab definition'
        },
      ],
      description: 'Build proportionate physique with shoulder and back emphasis',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Symmetry Development',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'shoulders', targetTU: 28, percentage: 28 },
        { muscleGroup: 'back', targetTU: 28, percentage: 28 },
        { muscleGroup: 'chest', targetTU: 18, percentage: 18 },
        { muscleGroup: 'arms', targetTU: 16, percentage: 16 },
        { muscleGroup: 'legs', targetTU: 7, percentage: 7 },
        { muscleGroup: 'core', targetTU: 3, percentage: 3 },
      ],
      weeklyPrescription: [
        // SHOULDERS - High frequency
        {
          exerciseId: 'bb_overhead_press',
          sets: 6,
          reps: 8,
          intensity: 0.78,
          frequency: 3,
          notes: 'Heavy pressing'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 5,
          reps: 12,
          intensity: 0.82,
          frequency: 3,
          notes: 'Volume work'
        },

        // BACK - Width + thickness
        {
          exerciseId: 'bw_pullup',
          sets: 6,
          reps: 12,
          intensity: 0.82,
          frequency: 3,
          notes: 'Weighted wide-grip'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 6,
          reps: 10,
          intensity: 0.78,
          frequency: 3,
          notes: 'Heavy rows'
        },
        {
          exerciseId: 'bb_pendlay_row',
          sets: 5,
          reps: 8,
          intensity: 0.80,
          frequency: 2,
          notes: 'Explosive thickness'
        },

        // CHEST - Sculpting
        {
          exerciseId: 'bb_incline_bench',
          sets: 6,
          reps: 10,
          intensity: 0.78,
          frequency: 3,
          notes: 'Upper chest priority'
        },
        {
          exerciseId: 'bw_dip',
          sets: 5,
          reps: 15,
          intensity: 0.80,
          frequency: 2,
          notes: 'Lower chest definition'
        },

        // ARMS - Peak development
        {
          exerciseId: 'bb_curl',
          sets: 6,
          reps: 12,
          intensity: 0.73,
          frequency: 3,
          notes: 'Bicep volume'
        },
        {
          exerciseId: 'bb_skull_crusher',
          sets: 6,
          reps: 12,
          intensity: 0.73,
          frequency: 3,
          notes: 'Tricep detail'
        },

        // LEGS - Maintenance
        {
          exerciseId: 'bb_front_squat',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 2,
          notes: 'Quad sweep'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 4,
          reps: 10,
          intensity: 0.78,
          frequency: 1,
          notes: 'Definition work'
        },

        // CORE
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 5,
          reps: 20,
          intensity: 0.80,
          frequency: 3,
          notes: 'Shredded abs'
        },
      ],
      description: 'Refine proportions with targeted high-volume work',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Stage Ready',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'shoulders', targetTU: 30, percentage: 30 },
        { muscleGroup: 'back', targetTU: 30, percentage: 30 },
        { muscleGroup: 'chest', targetTU: 16, percentage: 16 },
        { muscleGroup: 'arms', targetTU: 18, percentage: 18 },
        { muscleGroup: 'legs', targetTU: 5, percentage: 5 },
        { muscleGroup: 'core', targetTU: 1, percentage: 1 },
      ],
      weeklyPrescription: [
        // SHOULDERS - Maximum volume
        {
          exerciseId: 'bb_overhead_press',
          sets: 8,
          reps: 8,
          intensity: 0.80,
          frequency: 4,
          notes: 'Daily shoulder work'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 8,
          reps: 15,
          intensity: 0.85,
          frequency: 4,
          notes: 'Peak development'
        },

        // BACK - V-taper perfection
        {
          exerciseId: 'bw_pullup',
          sets: 10,
          reps: 15,
          intensity: 0.85,
          frequency: 4,
          notes: 'Heavy weighted wide-grip'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 8,
          reps: 10,
          intensity: 0.82,
          frequency: 3,
          notes: 'Maximum thickness'
        },

        // CHEST - Final polish
        {
          exerciseId: 'bb_incline_bench',
          sets: 8,
          reps: 10,
          intensity: 0.80,
          frequency: 3,
          notes: 'Upper chest fullness'
        },
        {
          exerciseId: 'bw_dip',
          sets: 8,
          reps: 20,
          intensity: 0.85,
          frequency: 3,
          notes: 'Lower chest striations'
        },

        // ARMS - Peak conditioning
        {
          exerciseId: 'bb_curl',
          sets: 8,
          reps: 15,
          intensity: 0.75,
          frequency: 4,
          notes: 'Maximum pump'
        },
        {
          exerciseId: 'bb_skull_crusher',
          sets: 8,
          reps: 15,
          intensity: 0.75,
          frequency: 4,
          notes: 'Tricep detail'
        },

        // LEGS - Minimal
        {
          exerciseId: 'bw_pistol_squat',
          sets: 5,
          reps: 12,
          intensity: 0.80,
          frequency: 2,
          notes: 'Definition only'
        },

        // CORE - Contest prep
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 8,
          reps: 25,
          intensity: 0.85,
          frequency: 4,
          notes: 'Competition abs'
        },
      ],
      description: 'Peak aesthetics with maximum shoulder/back development',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// GENERAL FITNESS ARCHETYPE
// ============================================================================

const GENERAL_FITNESS_ARCHETYPE: Archetype = {
  id: 'general_fitness',
  name: 'General Fitness',
  philosophy: 'Balanced, sustainable fitness for health and longevity',
  focusAreas: ['Strength', 'Mobility', 'Cardiovascular health', 'Injury prevention'],
  levels: [
    // LEVEL 1: Foundation
    {
      level: 1,
      name: 'Health Foundation',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 25, percentage: 25 },
        { muscleGroup: 'chest', targetTU: 15, percentage: 15 },
        { muscleGroup: 'back', targetTU: 20, percentage: 20 },
        { muscleGroup: 'shoulders', targetTU: 15, percentage: 15 },
        { muscleGroup: 'core', targetTU: 15, percentage: 15 },
        { muscleGroup: 'posterior_chain', targetTU: 10, percentage: 10 },
      ],
      weeklyPrescription: [
        // TOTAL BODY (3x/week)
        {
          exerciseId: 'bw_squat',
          sets: 3,
          reps: 15,
          intensity: 0.65,
          frequency: 3,
          notes: 'Foundational movement pattern'
        },
        {
          exerciseId: 'bw_pushup',
          sets: 3,
          reps: 12,
          intensity: 0.68,
          frequency: 3,
          notes: 'Upper body push'
        },
        {
          exerciseId: 'bw_inverted_row',
          sets: 3,
          reps: 10,
          intensity: 0.70,
          frequency: 3,
          notes: 'Upper body pull'
        },
        {
          exerciseId: 'bw_plank',
          sets: 3,
          reps: '45sec',
          intensity: 0.65,
          frequency: 3,
          notes: 'Core stability'
        },

        // LOWER BODY (2x/week)
        {
          exerciseId: 'kb_goblet_squat',
          sets: 3,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Loaded squat pattern'
        },
        {
          exerciseId: 'bw_lunge',
          sets: 3,
          reps: 12,
          intensity: 0.70,
          frequency: 2,
          notes: 'Single leg strength'
        },
        {
          exerciseId: 'bb_romanian_deadlift',
          sets: 3,
          reps: 10,
          intensity: 0.65,
          frequency: 2,
          notes: 'Hip hinge pattern'
        },

        // UPPER BODY (2x/week)
        {
          exerciseId: 'bw_dip',
          sets: 3,
          reps: 10,
          intensity: 0.70,
          frequency: 2,
          notes: 'Push strength'
        },
        {
          exerciseId: 'bw_pullup',
          sets: 3,
          reps: 8,
          intensity: 0.72,
          frequency: 2,
          notes: 'Pull strength'
        },
        {
          exerciseId: 'kb_press',
          sets: 3,
          reps: 10,
          intensity: 0.70,
          frequency: 2,
          notes: 'Overhead strength'
        },

        // CORE (3x/week)
        {
          exerciseId: 'bw_hollow_hold',
          sets: 3,
          reps: '40sec',
          intensity: 0.70,
          frequency: 3,
          notes: 'Anti-extension'
        },

        // CONDITIONING (2x/week)
        {
          exerciseId: 'kb_swing',
          sets: 5,
          reps: 15,
          intensity: 0.65,
          frequency: 2,
          notes: 'Cardiovascular + power'
        },
      ],
      description: 'Build balanced fitness foundation with full-body training',
    },

    // LEVEL 2: Intermediate
    {
      level: 2,
      name: 'Fitness Progression',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 26, percentage: 26 },
        { muscleGroup: 'chest', targetTU: 16, percentage: 16 },
        { muscleGroup: 'back', targetTU: 22, percentage: 22 },
        { muscleGroup: 'shoulders', targetTU: 16, percentage: 16 },
        { muscleGroup: 'core', targetTU: 12, percentage: 12 },
        { muscleGroup: 'posterior_chain', targetTU: 8, percentage: 8 },
      ],
      weeklyPrescription: [
        // STRENGTH DAYS (3x/week)
        {
          exerciseId: 'bb_back_squat',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 2,
          notes: 'Build leg strength'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 4,
          reps: 8,
          intensity: 0.73,
          frequency: 2,
          notes: 'Posterior chain strength'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 2,
          notes: 'Upper body push'
        },
        {
          exerciseId: 'bb_bent_row',
          sets: 4,
          reps: 10,
          intensity: 0.72,
          frequency: 2,
          notes: 'Upper body pull'
        },
        {
          exerciseId: 'bb_overhead_press',
          sets: 4,
          reps: 8,
          intensity: 0.73,
          frequency: 2,
          notes: 'Shoulder strength'
        },

        // BODYWEIGHT (3x/week)
        {
          exerciseId: 'bw_pullup',
          sets: 4,
          reps: 10,
          intensity: 0.75,
          frequency: 3,
          notes: 'Pull-up progression'
        },
        {
          exerciseId: 'bw_dip',
          sets: 4,
          reps: 12,
          intensity: 0.75,
          frequency: 3,
          notes: 'Dip progression'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 3,
          reps: 8,
          intensity: 0.78,
          frequency: 2,
          notes: 'Unilateral leg work'
        },

        // CORE (4x/week)
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 4,
          reps: 12,
          intensity: 0.75,
          frequency: 3,
          notes: 'Advanced core'
        },
        {
          exerciseId: 'bw_plank',
          sets: 4,
          reps: '60sec',
          intensity: 0.72,
          frequency: 4,
          notes: 'Core endurance'
        },

        // POWER (2x/week)
        {
          exerciseId: 'kb_swing',
          sets: 6,
          reps: 20,
          intensity: 0.72,
          frequency: 2,
          notes: 'Hip power'
        },
        {
          exerciseId: 'kb_snatch',
          sets: 5,
          reps: 10,
          intensity: 0.75,
          frequency: 2,
          notes: 'Total body power'
        },
      ],
      description: 'Progress to intermediate strength with balanced programming',
      unlockRequirement: 'Complete 100 TU in Level 1'
    },

    // LEVEL 3: Advanced
    {
      level: 3,
      name: 'Peak Fitness',
      totalTU: 100,
      muscleGroupTargets: [
        { muscleGroup: 'legs', targetTU: 27, percentage: 27 },
        { muscleGroup: 'chest', targetTU: 17, percentage: 17 },
        { muscleGroup: 'back', targetTU: 24, percentage: 24 },
        { muscleGroup: 'shoulders', targetTU: 17, percentage: 17 },
        { muscleGroup: 'core', targetTU: 10, percentage: 10 },
        { muscleGroup: 'posterior_chain', targetTU: 5, percentage: 5 },
      ],
      weeklyPrescription: [
        // STRENGTH - Advanced
        {
          exerciseId: 'bb_back_squat',
          sets: 5,
          reps: 8,
          intensity: 0.78,
          frequency: 2,
          notes: 'Heavy squats'
        },
        {
          exerciseId: 'bb_front_squat',
          sets: 4,
          reps: 8,
          intensity: 0.75,
          frequency: 2,
          notes: 'Quad emphasis'
        },
        {
          exerciseId: 'bb_deadlift',
          sets: 5,
          reps: 6,
          intensity: 0.80,
          frequency: 2,
          notes: 'Heavy pulls'
        },
        {
          exerciseId: 'bb_bench_press',
          sets: 5,
          reps: 8,
          intensity: 0.78,
          frequency: 2,
          notes: 'Pressing strength'
        },
        {
          exerciseId: 'bb_overhead_press',
          sets: 5,
          reps: 6,
          intensity: 0.80,
          frequency: 2,
          notes: 'Overhead power'
        },

        // ADVANCED BODYWEIGHT
        {
          exerciseId: 'bw_muscle_up',
          sets: 5,
          reps: 5,
          intensity: 0.85,
          frequency: 2,
          notes: 'Elite pulling'
        },
        {
          exerciseId: 'bw_hspu',
          sets: 5,
          reps: 10,
          intensity: 0.82,
          frequency: 2,
          notes: 'Advanced pressing'
        },
        {
          exerciseId: 'bw_pistol_squat',
          sets: 5,
          reps: 12,
          intensity: 0.82,
          frequency: 2,
          notes: 'Mastered unilateral'
        },

        // CORE MASTERY
        {
          exerciseId: 'bw_hanging_leg_raise',
          sets: 6,
          reps: 20,
          intensity: 0.82,
          frequency: 3,
          notes: 'Advanced core strength'
        },
        {
          exerciseId: 'bw_hollow_hold',
          sets: 5,
          reps: '75sec',
          intensity: 0.80,
          frequency: 3,
          notes: 'Core endurance'
        },

        // POWER & CONDITIONING
        {
          exerciseId: 'kb_snatch',
          sets: 8,
          reps: 12,
          intensity: 0.80,
          frequency: 2,
          notes: 'High power output'
        },
        {
          exerciseId: 'bb_clean',
          sets: 6,
          reps: 3,
          intensity: 0.78,
          frequency: 2,
          notes: 'Olympic lift integration'
        },
      ],
      description: 'Peak general fitness with advanced strength and conditioning',
      unlockRequirement: 'Complete 100 TU in Level 2'
    },
  ],
};

// ============================================================================
// EXPORT
// ============================================================================

export const ADDITIONAL_ARCHETYPES: Archetype[] = [
  POWERLIFTER_ARCHETYPE,
  OLYMPIC_LIFTER_ARCHETYPE,
  PHYSIQUE_ARCHETYPE,
  GENERAL_FITNESS_ARCHETYPE,
];

// Statistics
console.log(`Additional archetypes: ${ADDITIONAL_ARCHETYPES.length}`);
console.log(`Additional levels: ${ADDITIONAL_ARCHETYPES.reduce((sum, a) => sum + a.levels.length, 0)}`);
console.log(`Additional TU content: ${ADDITIONAL_ARCHETYPES.length * 3 * 100}`);
