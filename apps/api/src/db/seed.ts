/**
 * Database Seed Script
 *
 * Run with: npx tsx src/db/seed.ts
 */

import { db, initializePool, closePool } from './client';

// ============================================
// MUSCLES WITH BIAS WEIGHTS
// ============================================

const muscles = [
  // Chest
  { id: 'chest-upper', name: 'Upper Chest', anatomicalName: 'Pectoralis Major (Clavicular)', muscleGroup: 'Chest', biasWeight: 15 },
  { id: 'chest-mid', name: 'Mid Chest', anatomicalName: 'Pectoralis Major (Sternal)', muscleGroup: 'Chest', biasWeight: 18 },
  { id: 'chest-lower', name: 'Lower Chest', anatomicalName: 'Pectoralis Major (Abdominal)', muscleGroup: 'Chest', biasWeight: 12 },

  // Back
  { id: 'lats', name: 'Lats', anatomicalName: 'Latissimus Dorsi', muscleGroup: 'Back', biasWeight: 20 },
  { id: 'traps-upper', name: 'Upper Traps', anatomicalName: 'Trapezius (Upper)', muscleGroup: 'Back', biasWeight: 10 },
  { id: 'traps-mid', name: 'Mid Traps', anatomicalName: 'Trapezius (Middle)', muscleGroup: 'Back', biasWeight: 12 },
  { id: 'traps-lower', name: 'Lower Traps', anatomicalName: 'Trapezius (Lower)', muscleGroup: 'Back', biasWeight: 8 },
  { id: 'rhomboids', name: 'Rhomboids', anatomicalName: 'Rhomboid Major/Minor', muscleGroup: 'Back', biasWeight: 8 },
  { id: 'teres-major', name: 'Teres Major', anatomicalName: 'Teres Major', muscleGroup: 'Back', biasWeight: 6 },
  { id: 'erector-spinae', name: 'Erector Spinae', anatomicalName: 'Erector Spinae', muscleGroup: 'Back', biasWeight: 15 },

  // Shoulders
  { id: 'delt-front', name: 'Front Delts', anatomicalName: 'Deltoid (Anterior)', muscleGroup: 'Shoulders', biasWeight: 10 },
  { id: 'delt-side', name: 'Side Delts', anatomicalName: 'Deltoid (Lateral)', muscleGroup: 'Shoulders', biasWeight: 8 },
  { id: 'delt-rear', name: 'Rear Delts', anatomicalName: 'Deltoid (Posterior)', muscleGroup: 'Shoulders', biasWeight: 6 },
  { id: 'rotator-cuff', name: 'Rotator Cuff', anatomicalName: 'Infraspinatus/Supraspinatus/Teres Minor/Subscapularis', muscleGroup: 'Shoulders', biasWeight: 4 },

  // Arms
  { id: 'biceps-long', name: 'Biceps Long Head', anatomicalName: 'Biceps Brachii (Long)', muscleGroup: 'Arms', biasWeight: 8 },
  { id: 'biceps-short', name: 'Biceps Short Head', anatomicalName: 'Biceps Brachii (Short)', muscleGroup: 'Arms', biasWeight: 8 },
  { id: 'brachialis', name: 'Brachialis', anatomicalName: 'Brachialis', muscleGroup: 'Arms', biasWeight: 6 },
  { id: 'brachioradialis', name: 'Brachioradialis', anatomicalName: 'Brachioradialis', muscleGroup: 'Arms', biasWeight: 5 },
  { id: 'triceps-long', name: 'Triceps Long Head', anatomicalName: 'Triceps Brachii (Long)', muscleGroup: 'Arms', biasWeight: 10 },
  { id: 'triceps-lateral', name: 'Triceps Lateral Head', anatomicalName: 'Triceps Brachii (Lateral)', muscleGroup: 'Arms', biasWeight: 8 },
  { id: 'triceps-medial', name: 'Triceps Medial Head', anatomicalName: 'Triceps Brachii (Medial)', muscleGroup: 'Arms', biasWeight: 6 },
  { id: 'forearm-flexors', name: 'Forearm Flexors', anatomicalName: 'Wrist Flexors', muscleGroup: 'Arms', biasWeight: 6 },
  { id: 'forearm-extensors', name: 'Forearm Extensors', anatomicalName: 'Wrist Extensors', muscleGroup: 'Arms', biasWeight: 5 },

  // Core
  { id: 'rectus-abdominis', name: 'Rectus Abdominis', anatomicalName: 'Rectus Abdominis', muscleGroup: 'Core', biasWeight: 12 },
  { id: 'obliques', name: 'Obliques', anatomicalName: 'External/Internal Obliques', muscleGroup: 'Core', biasWeight: 10 },
  { id: 'transverse-abdominis', name: 'Transverse Abdominis', anatomicalName: 'Transverse Abdominis', muscleGroup: 'Core', biasWeight: 8 },
  { id: 'serratus', name: 'Serratus Anterior', anatomicalName: 'Serratus Anterior', muscleGroup: 'Core', biasWeight: 6 },

  // Glutes & Hips
  { id: 'glute-max', name: 'Gluteus Maximus', anatomicalName: 'Gluteus Maximus', muscleGroup: 'Glutes', biasWeight: 22 },
  { id: 'glute-med', name: 'Gluteus Medius', anatomicalName: 'Gluteus Medius', muscleGroup: 'Glutes', biasWeight: 10 },
  { id: 'glute-min', name: 'Gluteus Minimus', anatomicalName: 'Gluteus Minimus', muscleGroup: 'Glutes', biasWeight: 6 },
  { id: 'hip-flexors', name: 'Hip Flexors', anatomicalName: 'Iliopsoas', muscleGroup: 'Glutes', biasWeight: 8 },

  // Quadriceps
  { id: 'quad-rectus', name: 'Rectus Femoris', anatomicalName: 'Rectus Femoris', muscleGroup: 'Quads', biasWeight: 15 },
  { id: 'quad-vastus-lat', name: 'Vastus Lateralis', anatomicalName: 'Vastus Lateralis', muscleGroup: 'Quads', biasWeight: 18 },
  { id: 'quad-vastus-med', name: 'Vastus Medialis', anatomicalName: 'Vastus Medialis', muscleGroup: 'Quads', biasWeight: 15 },
  { id: 'quad-vastus-int', name: 'Vastus Intermedius', anatomicalName: 'Vastus Intermedius', muscleGroup: 'Quads', biasWeight: 12 },

  // Hamstrings
  { id: 'hamstring-bicep', name: 'Bicep Femoris', anatomicalName: 'Biceps Femoris', muscleGroup: 'Hamstrings', biasWeight: 14 },
  { id: 'hamstring-semi-t', name: 'Semitendinosus', anatomicalName: 'Semitendinosus', muscleGroup: 'Hamstrings', biasWeight: 10 },
  { id: 'hamstring-semi-m', name: 'Semimembranosus', anatomicalName: 'Semimembranosus', muscleGroup: 'Hamstrings', biasWeight: 10 },

  // Adductors
  { id: 'adductor-magnus', name: 'Adductor Magnus', anatomicalName: 'Adductor Magnus', muscleGroup: 'Adductors', biasWeight: 12 },
  { id: 'adductor-longus', name: 'Adductor Longus', anatomicalName: 'Adductor Longus', muscleGroup: 'Adductors', biasWeight: 8 },
  { id: 'adductor-brevis', name: 'Adductor Brevis', anatomicalName: 'Adductor Brevis', muscleGroup: 'Adductors', biasWeight: 6 },

  // Calves
  { id: 'gastrocnemius', name: 'Gastrocnemius', anatomicalName: 'Gastrocnemius', muscleGroup: 'Calves', biasWeight: 12 },
  { id: 'soleus', name: 'Soleus', anatomicalName: 'Soleus', muscleGroup: 'Calves', biasWeight: 10 },
  { id: 'tibialis-anterior', name: 'Tibialis Anterior', anatomicalName: 'Tibialis Anterior', muscleGroup: 'Calves', biasWeight: 6 },
];

// ============================================
// EXERCISES
// ============================================

const exercises = [
  // Bodyweight - Push
  { id: 'bw-pushup', name: 'Push-Up', type: 'bodyweight', difficulty: 1, primaryMuscles: 'chest-mid,triceps-lateral,delt-front' },
  { id: 'bw-diamond-pushup', name: 'Diamond Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'triceps-long,chest-mid' },
  { id: 'bw-pike-pushup', name: 'Pike Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'delt-front,triceps-lateral' },
  { id: 'bw-decline-pushup', name: 'Decline Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'chest-upper,delt-front' },
  { id: 'bw-archer-pushup', name: 'Archer Push-Up', type: 'bodyweight', difficulty: 3, primaryMuscles: 'chest-mid,triceps-lateral' },
  { id: 'bw-dip', name: 'Dip', type: 'bodyweight', difficulty: 2, primaryMuscles: 'triceps-long,chest-lower,delt-front' },
  { id: 'bw-hspu', name: 'Handstand Push-Up', type: 'bodyweight', difficulty: 4, primaryMuscles: 'delt-front,triceps-long,traps-upper' },

  // Bodyweight - Pull
  { id: 'bw-pullup', name: 'Pull-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'lats,biceps-long,teres-major' },
  { id: 'bw-chinup', name: 'Chin-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'biceps-short,lats,brachialis' },
  { id: 'bw-row', name: 'Inverted Row', type: 'bodyweight', difficulty: 1, primaryMuscles: 'rhomboids,traps-mid,biceps-short' },
  { id: 'bw-typewriter-pullup', name: 'Typewriter Pull-Up', type: 'bodyweight', difficulty: 4, primaryMuscles: 'lats,biceps-long' },
  { id: 'bw-muscle-up', name: 'Muscle-Up', type: 'bodyweight', difficulty: 5, primaryMuscles: 'lats,triceps-long,chest-lower' },

  // Bodyweight - Legs
  { id: 'bw-squat', name: 'Bodyweight Squat', type: 'bodyweight', difficulty: 1, primaryMuscles: 'quad-vastus-lat,glute-max' },
  { id: 'bw-lunge', name: 'Lunge', type: 'bodyweight', difficulty: 1, primaryMuscles: 'quad-rectus,glute-max,hamstring-bicep' },
  { id: 'bw-bulgarian-split', name: 'Bulgarian Split Squat', type: 'bodyweight', difficulty: 2, primaryMuscles: 'quad-vastus-lat,glute-max' },
  { id: 'bw-pistol-squat', name: 'Pistol Squat', type: 'bodyweight', difficulty: 4, primaryMuscles: 'quad-rectus,glute-max,glute-med' },
  { id: 'bw-nordic-curl', name: 'Nordic Curl', type: 'bodyweight', difficulty: 4, primaryMuscles: 'hamstring-bicep,hamstring-semi-t' },
  { id: 'bw-calf-raise', name: 'Calf Raise', type: 'bodyweight', difficulty: 1, primaryMuscles: 'gastrocnemius,soleus' },
  { id: 'bw-glute-bridge', name: 'Glute Bridge', type: 'bodyweight', difficulty: 1, primaryMuscles: 'glute-max,hamstring-bicep' },

  // Bodyweight - Core
  { id: 'bw-plank', name: 'Plank', type: 'bodyweight', difficulty: 1, primaryMuscles: 'rectus-abdominis,transverse-abdominis' },
  { id: 'bw-hollow-hold', name: 'Hollow Body Hold', type: 'bodyweight', difficulty: 2, primaryMuscles: 'rectus-abdominis,hip-flexors' },
  { id: 'bw-lsit', name: 'L-Sit', type: 'bodyweight', difficulty: 3, primaryMuscles: 'rectus-abdominis,hip-flexors,triceps-long' },
  { id: 'bw-dragon-flag', name: 'Dragon Flag', type: 'bodyweight', difficulty: 4, primaryMuscles: 'rectus-abdominis,obliques' },
  { id: 'bw-hanging-leg-raise', name: 'Hanging Leg Raise', type: 'bodyweight', difficulty: 2, primaryMuscles: 'rectus-abdominis,hip-flexors' },

  // Kettlebell
  { id: 'kb-swing', name: 'Kettlebell Swing', type: 'kettlebell', difficulty: 2, primaryMuscles: 'glute-max,hamstring-bicep,erector-spinae' },
  { id: 'kb-goblet-squat', name: 'Goblet Squat', type: 'kettlebell', difficulty: 1, primaryMuscles: 'quad-vastus-lat,glute-max' },
  { id: 'kb-clean', name: 'Kettlebell Clean', type: 'kettlebell', difficulty: 2, primaryMuscles: 'glute-max,traps-upper,forearm-flexors' },
  { id: 'kb-press', name: 'Kettlebell Press', type: 'kettlebell', difficulty: 2, primaryMuscles: 'delt-front,triceps-long' },
  { id: 'kb-snatch', name: 'Kettlebell Snatch', type: 'kettlebell', difficulty: 3, primaryMuscles: 'glute-max,delt-front,traps-upper' },
  { id: 'kb-turkish-getup', name: 'Turkish Get-Up', type: 'kettlebell', difficulty: 3, primaryMuscles: 'delt-front,obliques,glute-med' },
  { id: 'kb-row', name: 'Kettlebell Row', type: 'kettlebell', difficulty: 1, primaryMuscles: 'lats,rhomboids,biceps-short' },
  { id: 'kb-deadlift', name: 'Kettlebell Deadlift', type: 'kettlebell', difficulty: 1, primaryMuscles: 'glute-max,hamstring-bicep,erector-spinae' },
  { id: 'kb-windmill', name: 'Kettlebell Windmill', type: 'kettlebell', difficulty: 2, primaryMuscles: 'obliques,glute-med,hamstring-bicep' },

  // Freeweight - Chest
  { id: 'fw-bench-press', name: 'Barbell Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-mid,triceps-lateral,delt-front' },
  { id: 'fw-incline-bench', name: 'Incline Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-upper,delt-front,triceps-lateral' },
  { id: 'fw-db-bench', name: 'Dumbbell Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-mid,triceps-lateral' },
  { id: 'fw-db-fly', name: 'Dumbbell Fly', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-mid,chest-upper' },

  // Freeweight - Back
  { id: 'fw-deadlift', name: 'Deadlift', type: 'freeweight', difficulty: 3, primaryMuscles: 'glute-max,hamstring-bicep,erector-spinae,lats' },
  { id: 'fw-barbell-row', name: 'Barbell Row', type: 'freeweight', difficulty: 2, primaryMuscles: 'lats,rhomboids,traps-mid,biceps-short' },
  { id: 'fw-db-row', name: 'Dumbbell Row', type: 'freeweight', difficulty: 1, primaryMuscles: 'lats,rhomboids,biceps-short' },
  { id: 'fw-pullover', name: 'Dumbbell Pullover', type: 'freeweight', difficulty: 2, primaryMuscles: 'lats,chest-lower,serratus' },

  // Freeweight - Shoulders
  { id: 'fw-ohp', name: 'Overhead Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'delt-front,triceps-long,traps-upper' },
  { id: 'fw-db-shoulder-press', name: 'Dumbbell Shoulder Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'delt-front,delt-side,triceps-long' },
  { id: 'fw-lateral-raise', name: 'Lateral Raise', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-side' },
  { id: 'fw-front-raise', name: 'Front Raise', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-front' },
  { id: 'fw-rear-delt-fly', name: 'Rear Delt Fly', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-rear,rhomboids' },
  { id: 'fw-face-pull', name: 'Face Pull', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-rear,rotator-cuff,traps-mid' },
  { id: 'fw-shrug', name: 'Barbell Shrug', type: 'freeweight', difficulty: 1, primaryMuscles: 'traps-upper' },

  // Freeweight - Arms
  { id: 'fw-barbell-curl', name: 'Barbell Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-short,biceps-long' },
  { id: 'fw-db-curl', name: 'Dumbbell Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-short,biceps-long' },
  { id: 'fw-hammer-curl', name: 'Hammer Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'brachialis,brachioradialis,biceps-long' },
  { id: 'fw-preacher-curl', name: 'Preacher Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-short,brachialis' },
  { id: 'fw-skull-crusher', name: 'Skull Crusher', type: 'freeweight', difficulty: 2, primaryMuscles: 'triceps-long,triceps-lateral' },
  { id: 'fw-close-grip-bench', name: 'Close Grip Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'triceps-long,triceps-lateral,chest-mid' },
  { id: 'fw-tricep-kickback', name: 'Tricep Kickback', type: 'freeweight', difficulty: 1, primaryMuscles: 'triceps-lateral,triceps-long' },
  { id: 'fw-wrist-curl', name: 'Wrist Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'forearm-flexors' },

  // Freeweight - Legs
  { id: 'fw-squat', name: 'Barbell Squat', type: 'freeweight', difficulty: 3, primaryMuscles: 'quad-vastus-lat,quad-rectus,glute-max' },
  { id: 'fw-front-squat', name: 'Front Squat', type: 'freeweight', difficulty: 3, primaryMuscles: 'quad-rectus,quad-vastus-med,rectus-abdominis' },
  { id: 'fw-leg-press', name: 'Leg Press', type: 'freeweight', difficulty: 1, primaryMuscles: 'quad-vastus-lat,glute-max' },
  { id: 'fw-romanian-dl', name: 'Romanian Deadlift', type: 'freeweight', difficulty: 2, primaryMuscles: 'hamstring-bicep,glute-max,erector-spinae' },
  { id: 'fw-leg-curl', name: 'Leg Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'hamstring-bicep,hamstring-semi-t' },
  { id: 'fw-leg-extension', name: 'Leg Extension', type: 'freeweight', difficulty: 1, primaryMuscles: 'quad-rectus,quad-vastus-lat' },
  { id: 'fw-hip-thrust', name: 'Hip Thrust', type: 'freeweight', difficulty: 2, primaryMuscles: 'glute-max,hamstring-bicep' },
  { id: 'fw-calf-raise', name: 'Weighted Calf Raise', type: 'freeweight', difficulty: 1, primaryMuscles: 'gastrocnemius,soleus' },
  { id: 'fw-good-morning', name: 'Good Morning', type: 'freeweight', difficulty: 2, primaryMuscles: 'hamstring-bicep,erector-spinae,glute-max' },
];

// ============================================
// EXERCISE ACTIVATIONS
// ============================================

const activations: { exerciseId: string; muscleId: string; activation: number }[] = [
  // Push-Up
  { exerciseId: 'bw-pushup', muscleId: 'chest-mid', activation: 70 },
  { exerciseId: 'bw-pushup', muscleId: 'chest-upper', activation: 40 },
  { exerciseId: 'bw-pushup', muscleId: 'chest-lower', activation: 30 },
  { exerciseId: 'bw-pushup', muscleId: 'triceps-lateral', activation: 60 },
  { exerciseId: 'bw-pushup', muscleId: 'triceps-long', activation: 40 },
  { exerciseId: 'bw-pushup', muscleId: 'delt-front', activation: 50 },
  { exerciseId: 'bw-pushup', muscleId: 'serratus', activation: 30 },

  // Diamond Push-Up
  { exerciseId: 'bw-diamond-pushup', muscleId: 'triceps-long', activation: 80 },
  { exerciseId: 'bw-diamond-pushup', muscleId: 'triceps-lateral', activation: 70 },
  { exerciseId: 'bw-diamond-pushup', muscleId: 'chest-mid', activation: 50 },

  // Pull-Up
  { exerciseId: 'bw-pullup', muscleId: 'lats', activation: 85 },
  { exerciseId: 'bw-pullup', muscleId: 'biceps-long', activation: 60 },
  { exerciseId: 'bw-pullup', muscleId: 'biceps-short', activation: 50 },
  { exerciseId: 'bw-pullup', muscleId: 'teres-major', activation: 55 },
  { exerciseId: 'bw-pullup', muscleId: 'rhomboids', activation: 45 },
  { exerciseId: 'bw-pullup', muscleId: 'traps-lower', activation: 35 },
  { exerciseId: 'bw-pullup', muscleId: 'forearm-flexors', activation: 40 },

  // Chin-Up
  { exerciseId: 'bw-chinup', muscleId: 'biceps-short', activation: 80 },
  { exerciseId: 'bw-chinup', muscleId: 'biceps-long', activation: 70 },
  { exerciseId: 'bw-chinup', muscleId: 'lats', activation: 70 },
  { exerciseId: 'bw-chinup', muscleId: 'brachialis', activation: 50 },

  // Dip
  { exerciseId: 'bw-dip', muscleId: 'triceps-long', activation: 80 },
  { exerciseId: 'bw-dip', muscleId: 'triceps-lateral', activation: 70 },
  { exerciseId: 'bw-dip', muscleId: 'chest-lower', activation: 65 },
  { exerciseId: 'bw-dip', muscleId: 'delt-front', activation: 50 },

  // Squat variations
  { exerciseId: 'bw-squat', muscleId: 'quad-vastus-lat', activation: 70 },
  { exerciseId: 'bw-squat', muscleId: 'quad-rectus', activation: 60 },
  { exerciseId: 'bw-squat', muscleId: 'glute-max', activation: 50 },

  { exerciseId: 'fw-squat', muscleId: 'quad-vastus-lat', activation: 90 },
  { exerciseId: 'fw-squat', muscleId: 'quad-rectus', activation: 80 },
  { exerciseId: 'fw-squat', muscleId: 'quad-vastus-med', activation: 75 },
  { exerciseId: 'fw-squat', muscleId: 'glute-max', activation: 70 },
  { exerciseId: 'fw-squat', muscleId: 'adductor-magnus', activation: 50 },
  { exerciseId: 'fw-squat', muscleId: 'erector-spinae', activation: 40 },

  // Deadlift
  { exerciseId: 'fw-deadlift', muscleId: 'glute-max', activation: 85 },
  { exerciseId: 'fw-deadlift', muscleId: 'hamstring-bicep', activation: 75 },
  { exerciseId: 'fw-deadlift', muscleId: 'erector-spinae', activation: 80 },
  { exerciseId: 'fw-deadlift', muscleId: 'lats', activation: 50 },
  { exerciseId: 'fw-deadlift', muscleId: 'traps-upper', activation: 45 },
  { exerciseId: 'fw-deadlift', muscleId: 'forearm-flexors', activation: 60 },
  { exerciseId: 'fw-deadlift', muscleId: 'quad-vastus-lat', activation: 40 },

  // Bench Press
  { exerciseId: 'fw-bench-press', muscleId: 'chest-mid', activation: 85 },
  { exerciseId: 'fw-bench-press', muscleId: 'chest-upper', activation: 50 },
  { exerciseId: 'fw-bench-press', muscleId: 'chest-lower', activation: 45 },
  { exerciseId: 'fw-bench-press', muscleId: 'triceps-lateral', activation: 65 },
  { exerciseId: 'fw-bench-press', muscleId: 'triceps-long', activation: 50 },
  { exerciseId: 'fw-bench-press', muscleId: 'delt-front', activation: 55 },

  // Kettlebell Swing
  { exerciseId: 'kb-swing', muscleId: 'glute-max', activation: 90 },
  { exerciseId: 'kb-swing', muscleId: 'hamstring-bicep', activation: 70 },
  { exerciseId: 'kb-swing', muscleId: 'erector-spinae', activation: 60 },
  { exerciseId: 'kb-swing', muscleId: 'rectus-abdominis', activation: 40 },
  { exerciseId: 'kb-swing', muscleId: 'delt-front', activation: 35 },
  { exerciseId: 'kb-swing', muscleId: 'forearm-flexors', activation: 50 },

  // Barbell Row
  { exerciseId: 'fw-barbell-row', muscleId: 'lats', activation: 80 },
  { exerciseId: 'fw-barbell-row', muscleId: 'rhomboids', activation: 70 },
  { exerciseId: 'fw-barbell-row', muscleId: 'traps-mid', activation: 65 },
  { exerciseId: 'fw-barbell-row', muscleId: 'biceps-short', activation: 55 },
  { exerciseId: 'fw-barbell-row', muscleId: 'delt-rear', activation: 45 },
  { exerciseId: 'fw-barbell-row', muscleId: 'erector-spinae', activation: 40 },

  // Overhead Press
  { exerciseId: 'fw-ohp', muscleId: 'delt-front', activation: 85 },
  { exerciseId: 'fw-ohp', muscleId: 'delt-side', activation: 50 },
  { exerciseId: 'fw-ohp', muscleId: 'triceps-long', activation: 65 },
  { exerciseId: 'fw-ohp', muscleId: 'triceps-lateral', activation: 55 },
  { exerciseId: 'fw-ohp', muscleId: 'traps-upper', activation: 45 },

  // Romanian Deadlift
  { exerciseId: 'fw-romanian-dl', muscleId: 'hamstring-bicep', activation: 85 },
  { exerciseId: 'fw-romanian-dl', muscleId: 'hamstring-semi-t', activation: 70 },
  { exerciseId: 'fw-romanian-dl', muscleId: 'glute-max', activation: 75 },
  { exerciseId: 'fw-romanian-dl', muscleId: 'erector-spinae', activation: 65 },

  // Hip Thrust
  { exerciseId: 'fw-hip-thrust', muscleId: 'glute-max', activation: 95 },
  { exerciseId: 'fw-hip-thrust', muscleId: 'hamstring-bicep', activation: 50 },
  { exerciseId: 'fw-hip-thrust', muscleId: 'adductor-magnus', activation: 35 },

  // Lateral Raise
  { exerciseId: 'fw-lateral-raise', muscleId: 'delt-side', activation: 90 },
  { exerciseId: 'fw-lateral-raise', muscleId: 'delt-front', activation: 30 },
  { exerciseId: 'fw-lateral-raise', muscleId: 'traps-upper', activation: 25 },

  // Barbell Curl
  { exerciseId: 'fw-barbell-curl', muscleId: 'biceps-short', activation: 85 },
  { exerciseId: 'fw-barbell-curl', muscleId: 'biceps-long', activation: 80 },
  { exerciseId: 'fw-barbell-curl', muscleId: 'brachialis', activation: 50 },
  { exerciseId: 'fw-barbell-curl', muscleId: 'forearm-flexors', activation: 40 },

  // Skull Crusher
  { exerciseId: 'fw-skull-crusher', muscleId: 'triceps-long', activation: 90 },
  { exerciseId: 'fw-skull-crusher', muscleId: 'triceps-lateral', activation: 70 },
  { exerciseId: 'fw-skull-crusher', muscleId: 'triceps-medial', activation: 60 },
];

/**
 * Seed the database with initial data
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Seed muscles
  for (const m of muscles) {
    await db.query(`
      INSERT INTO muscles (id, name, anatomical_name, muscle_group, bias_weight)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        anatomical_name = EXCLUDED.anatomical_name,
        muscle_group = EXCLUDED.muscle_group,
        bias_weight = EXCLUDED.bias_weight
    `, [m.id, m.name, m.anatomicalName, m.muscleGroup, m.biasWeight]);
  }
  console.log(`✓ Inserted ${muscles.length} muscles`);

  // Seed exercises
  for (const e of exercises) {
    await db.query(`
      INSERT INTO exercises (id, name, type, difficulty, primary_muscles)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        difficulty = EXCLUDED.difficulty,
        primary_muscles = EXCLUDED.primary_muscles
    `, [e.id, e.name, e.type, e.difficulty, e.primaryMuscles]);
  }
  console.log(`✓ Inserted ${exercises.length} exercises`);

  // Seed activations
  for (const a of activations) {
    await db.query(`
      INSERT INTO exercise_activations (exercise_id, muscle_id, activation)
      VALUES ($1, $2, $3)
      ON CONFLICT (exercise_id, muscle_id) DO UPDATE SET
        activation = EXCLUDED.activation
    `, [a.exerciseId, a.muscleId, a.activation]);
  }
  console.log(`✓ Inserted ${activations.length} exercise activations`);

  console.log('✅ Database seeded successfully!');
}

// Run if executed directly
if (require.main === module) {
  (async () => {
    try {
      await initializePool();
      await seedDatabase();
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
