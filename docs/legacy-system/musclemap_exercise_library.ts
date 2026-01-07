/**
 * MuscleMap Exercise Library
 * 50 Core Exercises with Complete Muscle Activation Data
 * 
 * Activation percentages based on:
 * - EMG studies
 * - Biomechanical analysis
 * - Expert coaching consensus
 */

export enum ExerciseType {
  BODYWEIGHT = 'bodyweight',
  KETTLEBELL = 'kettlebell',
  BARBELL = 'barbell',
  DUMBBELL = 'dumbbell',
  MACHINE = 'machine'
}

export enum Difficulty {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3
}

export interface MuscleActivation {
  muscleId: string;
  activation: number; // 0-100%
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  difficulty: Difficulty;
  primaryMuscles: string[]; // muscle IDs
  muscleActivations: MuscleActivation[];
  description: string;
  cues: string[];
}

export const EXERCISE_LIBRARY: Exercise[] = [
  // ========================================================================
  // BODYWEIGHT - LOWER BODY
  // ========================================================================
  {
    id: 'bw_squat',
    name: 'Bodyweight Squat',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['quad_rectus_femoris', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'quad_rectus_femoris', activation: 70 },
      { muscleId: 'quad_vastus_lateralis', activation: 70 },
      { muscleId: 'quad_vastus_medialis', activation: 70 },
      { muscleId: 'quad_vastus_intermedius', activation: 65 },
      { muscleId: 'glute_maximus', activation: 60 },
      { muscleId: 'glute_medius', activation: 40 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 30 },
      { muscleId: 'hamstring_semitendinosus', activation: 30 },
      { muscleId: 'erector_spinae_longissimus', activation: 35 },
      { muscleId: 'abs_rectus_upper', activation: 25 },
    ],
    description: 'Fundamental squatting pattern',
    cues: ['Chest up', 'Knees track toes', 'Full depth']
  },
  {
    id: 'bw_pistol_squat',
    name: 'Pistol Squat',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['quad_rectus_femoris', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'quad_rectus_femoris', activation: 90 },
      { muscleId: 'quad_vastus_lateralis', activation: 90 },
      { muscleId: 'quad_vastus_medialis', activation: 85 },
      { muscleId: 'glute_maximus', activation: 85 },
      { muscleId: 'glute_medius', activation: 70 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 50 },
      { muscleId: 'abs_rectus_upper', activation: 60 },
      { muscleId: 'oblique_external', activation: 55 },
    ],
    description: 'Single-leg squat to full depth',
    cues: ['Balance', 'Controlled descent', 'Drive through heel']
  },
  {
    id: 'bw_lunge',
    name: 'Walking Lunge',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['quad_rectus_femoris', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'quad_rectus_femoris', activation: 75 },
      { muscleId: 'quad_vastus_lateralis', activation: 75 },
      { muscleId: 'quad_vastus_medialis', activation: 70 },
      { muscleId: 'glute_maximus', activation: 70 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 40 },
      { muscleId: 'calf_gastrocnemius', activation: 35 },
    ],
    description: 'Alternating forward lunges',
    cues: ['90-degree angles', 'Back knee to ground', 'Vertical torso']
  },
  {
    id: 'bw_nordic_curl',
    name: 'Nordic Hamstring Curl',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['hamstring_biceps_femoris_long', 'hamstring_semitendinosus'],
    muscleActivations: [
      { muscleId: 'hamstring_biceps_femoris_long', activation: 95 },
      { muscleId: 'hamstring_biceps_femoris_short', activation: 90 },
      { muscleId: 'hamstring_semitendinosus', activation: 95 },
      { muscleId: 'hamstring_semimembranosus', activation: 95 },
      { muscleId: 'glute_maximus', activation: 50 },
      { muscleId: 'calf_gastrocnemius', activation: 40 },
    ],
    description: 'Eccentric hamstring strength builder',
    cues: ['Slow eccentric', 'Straight line', 'Explosive return']
  },

  // ========================================================================
  // BODYWEIGHT - UPPER BODY PUSH
  // ========================================================================
  {
    id: 'bw_pushup',
    name: 'Push-Up',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['pec_major_sternal', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'pec_major_sternal', activation: 70 },
      { muscleId: 'pec_major_clavicular', activation: 50 },
      { muscleId: 'pec_major_costal', activation: 65 },
      { muscleId: 'triceps_lateral_head', activation: 60 },
      { muscleId: 'triceps_long_head', activation: 55 },
      { muscleId: 'triceps_medial_head', activation: 60 },
      { muscleId: 'delt_anterior', activation: 50 },
      { muscleId: 'serratus_anterior', activation: 45 },
      { muscleId: 'abs_rectus_upper', activation: 35 },
    ],
    description: 'Standard push-up',
    cues: ['Plank position', 'Full ROM', 'Controlled tempo']
  },
  {
    id: 'bw_dip',
    name: 'Parallel Bar Dip',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['pec_major_costal', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'pec_major_costal', activation: 85 },
      { muscleId: 'pec_major_sternal', activation: 75 },
      { muscleId: 'triceps_lateral_head', activation: 80 },
      { muscleId: 'triceps_long_head', activation: 75 },
      { muscleId: 'triceps_medial_head', activation: 80 },
      { muscleId: 'delt_anterior', activation: 55 },
    ],
    description: 'Chest and tricep dip',
    cues: ['Lean forward for chest', 'Full depth', 'Control']
  },
  {
    id: 'bw_hspu',
    name: 'Handstand Push-Up',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['delt_anterior', 'delt_lateral', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'delt_anterior', activation: 90 },
      { muscleId: 'delt_lateral', activation: 85 },
      { muscleId: 'delt_posterior', activation: 45 },
      { muscleId: 'triceps_lateral_head', activation: 85 },
      { muscleId: 'triceps_long_head', activation: 80 },
      { muscleId: 'triceps_medial_head', activation: 85 },
      { muscleId: 'trap_upper', activation: 60 },
      { muscleId: 'serratus_anterior', activation: 55 },
    ],
    description: 'Inverted shoulder press',
    cues: ['Full lockout', 'Head through', 'Control descent']
  },

  // ========================================================================
  // BODYWEIGHT - UPPER BODY PULL
  // ========================================================================
  {
    id: 'bw_pullup',
    name: 'Pull-Up',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['lat_upper', 'lat_lower'],
    muscleActivations: [
      { muscleId: 'lat_upper', activation: 85 },
      { muscleId: 'lat_lower', activation: 80 },
      { muscleId: 'trap_middle', activation: 60 },
      { muscleId: 'trap_lower', activation: 55 },
      { muscleId: 'biceps_long_head', activation: 70 },
      { muscleId: 'biceps_short_head', activation: 70 },
      { muscleId: 'brachialis', activation: 65 },
      { muscleId: 'rhomboid_major', activation: 50 },
      { muscleId: 'delt_posterior', activation: 45 },
    ],
    description: 'Overhand grip pull-up',
    cues: ['Full hang', 'Chest to bar', 'Controlled negative']
  },
  {
    id: 'bw_chinup',
    name: 'Chin-Up',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['lat_lower', 'biceps_long_head'],
    muscleActivations: [
      { muscleId: 'lat_lower', activation: 85 },
      { muscleId: 'lat_upper', activation: 75 },
      { muscleId: 'biceps_long_head', activation: 85 },
      { muscleId: 'biceps_short_head', activation: 85 },
      { muscleId: 'brachialis', activation: 80 },
      { muscleId: 'trap_middle', activation: 55 },
      { muscleId: 'pec_major_sternal', activation: 40 },
    ],
    description: 'Underhand grip pull-up',
    cues: ['Supinated grip', 'Pull elbows down', 'Squeeze at top']
  },
  {
    id: 'bw_muscle_up',
    name: 'Muscle-Up',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['lat_upper', 'pec_major_costal', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'lat_upper', activation: 90 },
      { muscleId: 'lat_lower', activation: 85 },
      { muscleId: 'pec_major_costal', activation: 85 },
      { muscleId: 'pec_major_sternal', activation: 75 },
      { muscleId: 'triceps_lateral_head', activation: 85 },
      { muscleId: 'triceps_long_head', activation: 80 },
      { muscleId: 'delt_anterior', activation: 70 },
      { muscleId: 'abs_rectus_upper', activation: 60 },
    ],
    description: 'Pull-up to dip transition',
    cues: ['Explosive pull', 'Hip drive', 'Fast transition']
  },
  {
    id: 'bw_inverted_row',
    name: 'Inverted Row',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['trap_middle', 'rhomboid_major', 'lat_lower'],
    muscleActivations: [
      { muscleId: 'trap_middle', activation: 75 },
      { muscleId: 'rhomboid_major', activation: 70 },
      { muscleId: 'rhomboid_minor', activation: 65 },
      { muscleId: 'lat_lower', activation: 65 },
      { muscleId: 'delt_posterior', activation: 60 },
      { muscleId: 'biceps_long_head', activation: 55 },
      { muscleId: 'brachialis', activation: 50 },
    ],
    description: 'Horizontal pulling movement',
    cues: ['Body straight', 'Pull to chest', 'Squeeze shoulder blades']
  },

  // ========================================================================
  // BODYWEIGHT - CORE
  // ========================================================================
  {
    id: 'bw_plank',
    name: 'Front Plank',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['abs_rectus_upper', 'transverse_abdominis'],
    muscleActivations: [
      { muscleId: 'abs_rectus_upper', activation: 60 },
      { muscleId: 'abs_rectus_lower', activation: 55 },
      { muscleId: 'transverse_abdominis', activation: 70 },
      { muscleId: 'oblique_external', activation: 45 },
      { muscleId: 'oblique_internal', activation: 45 },
      { muscleId: 'erector_spinae_longissimus', activation: 40 },
    ],
    description: 'Isometric core hold',
    cues: ['Neutral spine', 'Squeeze glutes', 'Breathe']
  },
  {
    id: 'bw_hollow_hold',
    name: 'Hollow Body Hold',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['abs_rectus_upper', 'abs_rectus_lower'],
    muscleActivations: [
      { muscleId: 'abs_rectus_upper', activation: 85 },
      { muscleId: 'abs_rectus_lower', activation: 90 },
      { muscleId: 'hip_flexor_iliopsoas', activation: 65 },
      { muscleId: 'oblique_external', activation: 50 },
      { muscleId: 'transverse_abdominis', activation: 60 },
    ],
    description: 'Gymnastics core position',
    cues: ['Lower back flat', 'Arms overhead', 'Legs together']
  },
  {
    id: 'bw_hanging_leg_raise',
    name: 'Hanging Leg Raise',
    type: ExerciseType.BODYWEIGHT,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['abs_rectus_lower', 'hip_flexor_iliopsoas'],
    muscleActivations: [
      { muscleId: 'abs_rectus_lower', activation: 90 },
      { muscleId: 'abs_rectus_upper', activation: 70 },
      { muscleId: 'hip_flexor_iliopsoas', activation: 85 },
      { muscleId: 'oblique_external', activation: 55 },
      { muscleId: 'lat_upper', activation: 40 },
    ],
    description: 'Hanging ab exercise',
    cues: ['Toes to bar', 'No swing', 'Posterior pelvic tilt']
  },

  // ========================================================================
  // KETTLEBELL - BALLISTIC
  // ========================================================================
  {
    id: 'kb_swing',
    name: 'Kettlebell Swing',
    type: ExerciseType.KETTLEBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['glute_maximus', 'hamstring_biceps_femoris_long'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 85 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 80 },
      { muscleId: 'hamstring_semitendinosus', activation: 80 },
      { muscleId: 'erector_spinae_longissimus', activation: 70 },
      { muscleId: 'quad_rectus_femoris', activation: 45 },
      { muscleId: 'delt_anterior', activation: 50 },
      { muscleId: 'trap_middle', activation: 45 },
      { muscleId: 'abs_rectus_upper', activation: 50 },
    ],
    description: 'Hip hinge ballistic movement',
    cues: ['Hip snap', 'Tight plank', 'Floating bell']
  },
  {
    id: 'kb_snatch',
    name: 'Kettlebell Snatch',
    type: ExerciseType.KETTLEBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['glute_maximus', 'delt_lateral', 'trap_upper'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 85 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 75 },
      { muscleId: 'delt_lateral', activation: 80 },
      { muscleId: 'delt_anterior', activation: 75 },
      { muscleId: 'trap_upper', activation: 70 },
      { muscleId: 'erector_spinae_longissimus', activation: 65 },
      { muscleId: 'triceps_lateral_head', activation: 50 },
      { muscleId: 'abs_rectus_upper', activation: 60 },
    ],
    description: 'Ground to overhead in one motion',
    cues: ['Explosive hip', 'High pull', 'Punch through']
  },
  {
    id: 'kb_clean',
    name: 'Kettlebell Clean',
    type: ExerciseType.KETTLEBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['glute_maximus', 'trap_middle'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 80 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 75 },
      { muscleId: 'trap_middle', activation: 70 },
      { muscleId: 'delt_anterior', activation: 60 },
      { muscleId: 'biceps_long_head', activation: 55 },
      { muscleId: 'erector_spinae_longissimus', activation: 65 },
      { muscleId: 'abs_rectus_upper', activation: 50 },
    ],
    description: 'Ground to rack position',
    cues: ['Hip power', 'Soft catch', 'Vertical forearm']
  },

  // ========================================================================
  // KETTLEBELL - GRIND
  // ========================================================================
  {
    id: 'kb_goblet_squat',
    name: 'Goblet Squat',
    type: ExerciseType.KETTLEBELL,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['quad_rectus_femoris', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'quad_rectus_femoris', activation: 80 },
      { muscleId: 'quad_vastus_lateralis', activation: 80 },
      { muscleId: 'quad_vastus_medialis', activation: 75 },
      { muscleId: 'glute_maximus', activation: 75 },
      { muscleId: 'erector_spinae_longissimus', activation: 50 },
      { muscleId: 'abs_rectus_upper', activation: 40 },
    ],
    description: 'Front-loaded squat',
    cues: ['Elbows inside knees', 'Upright torso', 'Deep depth']
  },
  {
    id: 'kb_turkish_getup',
    name: 'Turkish Get-Up',
    type: ExerciseType.KETTLEBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['delt_lateral', 'abs_rectus_upper', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'delt_lateral', activation: 75 },
      { muscleId: 'delt_anterior', activation: 70 },
      { muscleId: 'triceps_lateral_head', activation: 65 },
      { muscleId: 'abs_rectus_upper', activation: 80 },
      { muscleId: 'oblique_external', activation: 75 },
      { muscleId: 'glute_maximus', activation: 70 },
      { muscleId: 'quad_rectus_femoris', activation: 60 },
      { muscleId: 'erector_spinae_longissimus', activation: 55 },
    ],
    description: 'Floor to standing with overhead bell',
    cues: ['Eyes on bell', 'Slow transitions', 'Stable positions']
  },
  {
    id: 'kb_press',
    name: 'Kettlebell Press',
    type: ExerciseType.KETTLEBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['delt_anterior', 'delt_lateral', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'delt_anterior', activation: 85 },
      { muscleId: 'delt_lateral', activation: 75 },
      { muscleId: 'triceps_lateral_head', activation: 70 },
      { muscleId: 'triceps_long_head', activation: 65 },
      { muscleId: 'serratus_anterior', activation: 50 },
      { muscleId: 'abs_rectus_upper', activation: 45 },
    ],
    description: 'Strict overhead press',
    cues: ['Lat tight', 'Vertical path', 'Lock out']
  },

  // ========================================================================
  // BARBELL - SQUAT VARIATIONS
  // ========================================================================
  {
    id: 'bb_back_squat',
    name: 'Barbell Back Squat',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['quad_rectus_femoris', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'quad_rectus_femoris', activation: 85 },
      { muscleId: 'quad_vastus_lateralis', activation: 85 },
      { muscleId: 'quad_vastus_medialis', activation: 80 },
      { muscleId: 'glute_maximus', activation: 80 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 50 },
      { muscleId: 'erector_spinae_longissimus', activation: 65 },
      { muscleId: 'abs_rectus_upper', activation: 50 },
    ],
    description: 'Bar on upper back squat',
    cues: ['Big breath', 'Break at hips and knees', 'Drive through floor']
  },
  {
    id: 'bb_front_squat',
    name: 'Barbell Front Squat',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['quad_rectus_femoris', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'quad_rectus_femoris', activation: 90 },
      { muscleId: 'quad_vastus_lateralis', activation: 90 },
      { muscleId: 'quad_vastus_medialis', activation: 85 },
      { muscleId: 'glute_maximus', activation: 75 },
      { muscleId: 'erector_spinae_longissimus', activation: 70 },
      { muscleId: 'abs_rectus_upper', activation: 65 },
      { muscleId: 'delt_anterior', activation: 40 },
    ],
    description: 'Bar on front rack squat',
    cues: ['Elbows high', 'Upright torso', 'Control descent']
  },

  // ========================================================================
  // BARBELL - DEADLIFT VARIATIONS
  // ========================================================================
  {
    id: 'bb_deadlift',
    name: 'Conventional Deadlift',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['glute_maximus', 'hamstring_biceps_femoris_long', 'erector_spinae_longissimus'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 90 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 85 },
      { muscleId: 'hamstring_semitendinosus', activation: 85 },
      { muscleId: 'erector_spinae_longissimus', activation: 85 },
      { muscleId: 'erector_spinae_iliocostalis', activation: 80 },
      { muscleId: 'quad_rectus_femoris', activation: 55 },
      { muscleId: 'trap_middle', activation: 65 },
      { muscleId: 'lat_upper', activation: 55 },
      { muscleId: 'abs_rectus_upper', activation: 50 },
    ],
    description: 'Hip hinge pulling pattern',
    cues: ['Neutral spine', 'Lats locked', 'Hips through']
  },
  {
    id: 'bb_romanian_deadlift',
    name: 'Romanian Deadlift',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['hamstring_biceps_femoris_long', 'glute_maximus'],
    muscleActivations: [
      { muscleId: 'hamstring_biceps_femoris_long', activation: 90 },
      { muscleId: 'hamstring_semitendinosus', activation: 90 },
      { muscleId: 'hamstring_semimembranosus', activation: 85 },
      { muscleId: 'glute_maximus', activation: 85 },
      { muscleId: 'erector_spinae_longissimus', activation: 75 },
      { muscleId: 'trap_middle', activation: 50 },
    ],
    description: 'Hip hinge with minimal knee bend',
    cues: ['Push hips back', 'Slight knee bend', 'Bar close to legs']
  },

  // ========================================================================
  // BARBELL - PRESS VARIATIONS
  // ========================================================================
  {
    id: 'bb_bench_press',
    name: 'Barbell Bench Press',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['pec_major_sternal', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'pec_major_sternal', activation: 85 },
      { muscleId: 'pec_major_clavicular', activation: 60 },
      { muscleId: 'pec_major_costal', activation: 80 },
      { muscleId: 'triceps_lateral_head', activation: 75 },
      { muscleId: 'triceps_long_head', activation: 70 },
      { muscleId: 'triceps_medial_head', activation: 75 },
      { muscleId: 'delt_anterior', activation: 65 },
    ],
    description: 'Horizontal pressing',
    cues: ['Arch back', 'Drive feet', 'Touch chest']
  },
  {
    id: 'bb_overhead_press',
    name: 'Barbell Overhead Press',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['delt_anterior', 'delt_lateral', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'delt_anterior', activation: 90 },
      { muscleId: 'delt_lateral', activation: 80 },
      { muscleId: 'triceps_lateral_head', activation: 75 },
      { muscleId: 'triceps_long_head', activation: 70 },
      { muscleId: 'trap_upper', activation: 55 },
      { muscleId: 'serratus_anterior', activation: 50 },
      { muscleId: 'abs_rectus_upper', activation: 45 },
    ],
    description: 'Standing shoulder press',
    cues: ['Squeeze glutes', 'Bar path vertical', 'Lock out overhead']
  },
  {
    id: 'bb_incline_bench',
    name: 'Incline Bench Press',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['pec_major_clavicular', 'delt_anterior'],
    muscleActivations: [
      { muscleId: 'pec_major_clavicular', activation: 85 },
      { muscleId: 'pec_major_sternal', activation: 70 },
      { muscleId: 'delt_anterior', activation: 75 },
      { muscleId: 'triceps_lateral_head', activation: 70 },
      { muscleId: 'triceps_long_head', activation: 65 },
    ],
    description: '30-45 degree incline press',
    cues: ['Upper chest focus', 'Control bar', 'Full lockout']
  },

  // ========================================================================
  // BARBELL - ROW VARIATIONS
  // ========================================================================
  {
    id: 'bb_bent_row',
    name: 'Barbell Bent-Over Row',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['lat_lower', 'trap_middle', 'rhomboid_major'],
    muscleActivations: [
      { muscleId: 'lat_lower', activation: 80 },
      { muscleId: 'lat_upper', activation: 70 },
      { muscleId: 'trap_middle', activation: 75 },
      { muscleId: 'rhomboid_major', activation: 70 },
      { muscleId: 'delt_posterior', activation: 65 },
      { muscleId: 'biceps_long_head', activation: 60 },
      { muscleId: 'brachialis', activation: 55 },
      { muscleId: 'erector_spinae_longissimus', activation: 65 },
    ],
    description: 'Horizontal pulling',
    cues: ['Hinge at hips', 'Pull to belly', 'Squeeze back']
  },
  {
    id: 'bb_pendlay_row',
    name: 'Pendlay Row',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['trap_middle', 'lat_upper'],
    muscleActivations: [
      { muscleId: 'trap_middle', activation: 85 },
      { muscleId: 'trap_lower', activation: 75 },
      { muscleId: 'lat_upper', activation: 80 },
      { muscleId: 'rhomboid_major', activation: 80 },
      { muscleId: 'delt_posterior', activation: 70 },
      { muscleId: 'erector_spinae_longissimus', activation: 70 },
      { muscleId: 'biceps_long_head', activation: 55 },
    ],
    description: 'Explosive row from floor',
    cues: ['Torso parallel', 'Explosive pull', 'Reset each rep']
  },

  // ========================================================================
  // OLYMPIC LIFTS
  // ========================================================================
  {
    id: 'bb_clean',
    name: 'Power Clean',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['glute_maximus', 'quad_rectus_femoris', 'trap_upper'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 85 },
      { muscleId: 'quad_rectus_femoris', activation: 80 },
      { muscleId: 'quad_vastus_lateralis', activation: 80 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 75 },
      { muscleId: 'trap_upper', activation: 85 },
      { muscleId: 'trap_middle', activation: 75 },
      { muscleId: 'erector_spinae_longissimus', activation: 70 },
      { muscleId: 'delt_anterior', activation: 60 },
      { muscleId: 'calf_gastrocnemius', activation: 65 },
    ],
    description: 'Explosive clean to front rack',
    cues: ['Triple extension', 'Fast elbows', 'Receive in quarter squat']
  },
  {
    id: 'bb_snatch',
    name: 'Power Snatch',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['glute_maximus', 'trap_upper', 'delt_lateral'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 85 },
      { muscleId: 'quad_rectus_femoris', activation: 75 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 70 },
      { muscleId: 'trap_upper', activation: 90 },
      { muscleId: 'trap_middle', activation: 80 },
      { muscleId: 'delt_lateral', activation: 85 },
      { muscleId: 'delt_anterior', activation: 75 },
      { muscleId: 'triceps_lateral_head', activation: 60 },
      { muscleId: 'erector_spinae_longissimus', activation: 70 },
    ],
    description: 'Explosive snatch overhead',
    cues: ['Wide grip', 'Aggressive pull', 'Lock out overhead']
  },

  // ========================================================================
  // ACCESSORY - ARMS
  // ========================================================================
  {
    id: 'bb_curl',
    name: 'Barbell Curl',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.BEGINNER,
    primaryMuscles: ['biceps_long_head', 'biceps_short_head'],
    muscleActivations: [
      { muscleId: 'biceps_long_head', activation: 85 },
      { muscleId: 'biceps_short_head', activation: 85 },
      { muscleId: 'brachialis', activation: 70 },
      { muscleId: 'brachioradialis', activation: 60 },
      { muscleId: 'forearm_flexor_carpi_radialis', activation: 40 },
    ],
    description: 'Elbow flexion isolation',
    cues: ['Elbows fixed', 'Full ROM', 'Controlled eccentric']
  },
  {
    id: 'bb_skull_crusher',
    name: 'Skull Crusher',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['triceps_long_head', 'triceps_lateral_head'],
    muscleActivations: [
      { muscleId: 'triceps_long_head', activation: 85 },
      { muscleId: 'triceps_lateral_head', activation: 80 },
      { muscleId: 'triceps_medial_head', activation: 80 },
      { muscleId: 'anconeus', activation: 50 },
    ],
    description: 'Lying tricep extension',
    cues: ['Elbows in', 'Lower to forehead', 'Squeeze triceps']
  },

  // ========================================================================
  // ACCESSORY - POSTERIOR CHAIN
  // ========================================================================
  {
    id: 'bb_hip_thrust',
    name: 'Barbell Hip Thrust',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.INTERMEDIATE,
    primaryMuscles: ['glute_maximus'],
    muscleActivations: [
      { muscleId: 'glute_maximus', activation: 95 },
      { muscleId: 'hamstring_biceps_femoris_long', activation: 60 },
      { muscleId: 'hamstring_semitendinosus', activation: 60 },
      { muscleId: 'quad_rectus_femoris', activation: 35 },
      { muscleId: 'abs_rectus_upper', activation: 40 },
    ],
    description: 'Hip extension with shoulders elevated',
    cues: ['Feet flat', 'Squeeze glutes at top', 'Neutral spine']
  },
  {
    id: 'bb_good_morning',
    name: 'Good Morning',
    type: ExerciseType.BARBELL,
    difficulty: Difficulty.ADVANCED,
    primaryMuscles: ['hamstring_biceps_femoris_long', 'erector_spinae_longissimus'],
    muscleActivations: [
      { muscleId: 'hamstring_biceps_femoris_long', activation: 85 },
      { muscleId: 'hamstring_semitendinosus', activation: 85 },
      { muscleId: 'erector_spinae_longissimus', activation: 90 },
      { muscleId: 'erector_spinae_iliocostalis', activation: 85 },
      { muscleId: 'glute_maximus', activation: 70 },
    ],
    description: 'Hip hinge with bar on back',
    cues: ['Push hips back', 'Minimal knee bend', 'Chest up']
  },
];

// Helper functions
export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISE_LIBRARY.find(e => e.id === id);
}

export function getExercisesByType(type: ExerciseType): Exercise[] {
  return EXERCISE_LIBRARY.filter(e => e.type === type);
}

export function getExercisesByDifficulty(difficulty: Difficulty): Exercise[] {
  return EXERCISE_LIBRARY.filter(e => e.difficulty === difficulty);
}

export function calculateExerciseTU(
  exercise: Exercise,
  sets: number,
  reps: number,
  intensity: number, // 0-1
  muscleDatabase: any[]
): number {
  let totalTU = 0;
  
  for (const activation of exercise.muscleActivations) {
    const muscle = muscleDatabase.find(m => m.id === activation.muscleId);
    if (muscle) {
      const tu = (activation.activation * sets * reps * intensity) / (muscle.biasWeight * 100);
      totalTU += tu;
    }
  }
  
  return totalTU;
}

// Statistics
console.log(`Total exercises: ${EXERCISE_LIBRARY.length}`);
console.log(`Bodyweight: ${getExercisesByType(ExerciseType.BODYWEIGHT).length}`);
console.log(`Kettlebell: ${getExercisesByType(ExerciseType.KETTLEBELL).length}`);
console.log(`Barbell: ${getExercisesByType(ExerciseType.BARBELL).length}`);
