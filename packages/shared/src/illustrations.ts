/**
 * Exercise Illustration Mapping
 *
 * Maps database exercise IDs to SVG illustration files
 * and provides utilities for muscle visualization.
 */

// Activation color palette (5-level system matching SVG gradients)
export const ACTIVATION_COLORS = {
  max: '#EF4444',   // 95%+ activation (red)
  high: '#F97316',  // 75-94% activation (orange)
  med: '#FB923C',   // 55-74% activation (light orange)
  low: '#14B8A6',   // 35-54% activation (teal)
  min: '#0D7377',   // 15-34% activation (dark teal)
  none: '#475569',  // <15% activation (gray)
} as const;

export type ActivationLevel = keyof typeof ACTIVATION_COLORS;

/**
 * Get activation color based on percentage (0-100)
 */
export function getActivationColor(activation: number): string {
  if (activation >= 95) return ACTIVATION_COLORS.max;
  if (activation >= 75) return ACTIVATION_COLORS.high;
  if (activation >= 55) return ACTIVATION_COLORS.med;
  if (activation >= 35) return ACTIVATION_COLORS.low;
  if (activation >= 15) return ACTIVATION_COLORS.min;
  return ACTIVATION_COLORS.none;
}

/**
 * Get activation level name based on percentage
 */
export function getActivationLevel(activation: number): ActivationLevel {
  if (activation >= 95) return 'max';
  if (activation >= 75) return 'high';
  if (activation >= 55) return 'med';
  if (activation >= 35) return 'low';
  if (activation >= 15) return 'min';
  return 'none';
}

// Body type variants
export type BodyType = 'male' | 'female' | 'youth';
export type BodyView = 'front' | 'back' | 'side';

/**
 * Get body silhouette SVG path
 */
export function getBodyIllustrationPath(type: BodyType, view: BodyView): string {
  return `/illustrations/bodies/body-${type}-${view}.svg`;
}

// Exercise illustration view types
export type ExerciseView = 'front' | 'back' | 'side';

export interface ExerciseIllustration {
  id: string;
  file: string;
  view: ExerciseView;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

/**
 * Map database exercise IDs to illustration metadata
 * Uses normalized exercise names to match illustration files
 */
export const EXERCISE_ILLUSTRATIONS: Record<string, ExerciseIllustration> = {
  // Bodyweight - Push
  'bw-pushup': {
    id: 'push-up',
    file: '/illustrations/exercises/exercise-pushup-side.svg',
    view: 'side',
    primaryMuscles: ['pectoralis-major', 'triceps'],
    secondaryMuscles: ['anterior-deltoid', 'serratus-anterior', 'core'],
  },
  'bw-dip': {
    id: 'tricep-dip',
    file: '/illustrations/exercises/exercise-tricep-dip-side.svg',
    view: 'side',
    primaryMuscles: ['triceps', 'anterior-deltoid'],
    secondaryMuscles: ['pectoralis-major', 'serratus-anterior'],
  },

  // Bodyweight - Pull
  'bw-pullup': {
    id: 'pull-up',
    file: '/illustrations/exercises/exercise-pullup-front.svg',
    view: 'front',
    primaryMuscles: ['latissimus-dorsi', 'biceps'],
    secondaryMuscles: ['rear-deltoid', 'rhomboids', 'forearm-flexors'],
  },

  // Bodyweight - Legs
  'bw-squat': {
    id: 'barbell-squat',
    file: '/illustrations/exercises/exercise-squat-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'erector-spinae', 'core'],
  },
  'bw-lunge': {
    id: 'lunge',
    file: '/illustrations/exercises/exercise-lunge-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'hip-flexors', 'adductors'],
  },
  'bw-bulgarian-split': {
    id: 'bulgarian-split-squat',
    file: '/illustrations/exercises/exercise-bulgarian-split-squat-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'adductors', 'core'],
  },
  'bw-calf-raise': {
    id: 'calf-raise',
    file: '/illustrations/exercises/exercise-calf-raise-side.svg',
    view: 'side',
    primaryMuscles: ['gastrocnemius', 'soleus'],
    secondaryMuscles: ['tibialis-anterior'],
  },
  'bw-glute-bridge': {
    id: 'glute-bridge',
    file: '/illustrations/exercises/exercise-glute-bridge-side.svg',
    view: 'side',
    primaryMuscles: ['gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'core', 'erector-spinae'],
  },

  // Bodyweight - Core
  'bw-plank': {
    id: 'plank',
    file: '/illustrations/exercises/exercise-plank-side.svg',
    view: 'side',
    primaryMuscles: ['transverse-abdominis', 'rectus-abdominis'],
    secondaryMuscles: ['erector-spinae', 'gluteus-maximus', 'anterior-deltoid'],
  },
  'bw-hanging-leg-raise': {
    id: 'hanging-leg-raise',
    file: '/illustrations/exercises/exercise-hanging-leg-raise-front.svg',
    view: 'front',
    primaryMuscles: ['rectus-abdominis', 'hip-flexors'],
    secondaryMuscles: ['external-obliques', 'latissimus-dorsi', 'forearm-flexors'],
  },

  // Kettlebell
  'kb-goblet-squat': {
    id: 'goblet-squat',
    file: '/illustrations/exercises/exercise-goblet-squat-front.svg',
    view: 'front',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['core', 'adductors', 'hamstrings'],
  },
  'kb-row': {
    id: 'dumbbell-row',
    file: '/illustrations/exercises/exercise-dumbbell-row-side.svg',
    view: 'side',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['trapezius-middle', 'rear-deltoid', 'biceps'],
  },

  // Freeweight - Chest
  'fw-bench-press': {
    id: 'bench-press',
    file: '/illustrations/exercises/exercise-benchpress-side.svg',
    view: 'side',
    primaryMuscles: ['pectoralis-major', 'triceps'],
    secondaryMuscles: ['anterior-deltoid'],
  },
  'fw-incline-bench': {
    id: 'incline-bench-press',
    file: '/illustrations/exercises/exercise-incline-bench-press-side.svg',
    view: 'side',
    primaryMuscles: ['pectoralis-major-clavicular', 'anterior-deltoid', 'triceps'],
    secondaryMuscles: ['pectoralis-major-sternal', 'serratus-anterior'],
  },
  'fw-db-bench': {
    id: 'bench-press',
    file: '/illustrations/exercises/exercise-benchpress-side.svg',
    view: 'side',
    primaryMuscles: ['pectoralis-major', 'triceps'],
    secondaryMuscles: ['anterior-deltoid'],
  },
  'fw-db-fly': {
    id: 'dumbbell-fly',
    file: '/illustrations/exercises/exercise-dumbbell-fly-side.svg',
    view: 'side',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'biceps'],
  },

  // Freeweight - Back
  'fw-deadlift': {
    id: 'deadlift',
    file: '/illustrations/exercises/exercise-deadlift-side.svg',
    view: 'side',
    primaryMuscles: ['gluteus-maximus', 'hamstrings', 'erector-spinae'],
    secondaryMuscles: ['quadriceps', 'latissimus-dorsi', 'trapezius'],
  },
  'fw-barbell-row': {
    id: 'barbell-row',
    file: '/illustrations/exercises/exercise-barbell-row-side.svg',
    view: 'side',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['rear-deltoid', 'biceps', 'trapezius-middle', 'erector-spinae'],
  },
  'fw-db-row': {
    id: 'dumbbell-row',
    file: '/illustrations/exercises/exercise-dumbbell-row-side.svg',
    view: 'side',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids'],
    secondaryMuscles: ['trapezius-middle', 'rear-deltoid', 'biceps', 'core'],
  },
  'fw-pullover': {
    id: 'pullover',
    file: '/illustrations/exercises/exercise-pullover-side.svg',
    view: 'side',
    primaryMuscles: ['latissimus-dorsi', 'pectoralis-major'],
    secondaryMuscles: ['serratus-anterior', 'triceps', 'teres-major'],
  },

  // Freeweight - Shoulders
  'fw-ohp': {
    id: 'overhead-press',
    file: '/illustrations/exercises/exercise-overhead-press-front.svg',
    view: 'front',
    primaryMuscles: ['anterior-deltoid', 'lateral-deltoid', 'triceps'],
    secondaryMuscles: ['upper-trapezius', 'serratus-anterior', 'core'],
  },
  'fw-db-shoulder-press': {
    id: 'seated-shoulder-press',
    file: '/illustrations/exercises/exercise-seated-shoulder-press-front.svg',
    view: 'front',
    primaryMuscles: ['anterior-deltoid', 'lateral-deltoid'],
    secondaryMuscles: ['triceps', 'trapezius-upper'],
  },
  'fw-lateral-raise': {
    id: 'lateral-raise',
    file: '/illustrations/exercises/exercise-lateral-raise-front.svg',
    view: 'front',
    primaryMuscles: ['lateral-deltoid'],
    secondaryMuscles: ['anterior-deltoid', 'trapezius-upper', 'supraspinatus'],
  },
  'fw-front-raise': {
    id: 'front-raise',
    file: '/illustrations/exercises/exercise-front-raise-front.svg',
    view: 'front',
    primaryMuscles: ['anterior-deltoid'],
    secondaryMuscles: ['lateral-deltoid', 'pectoralis-major-clavicular'],
  },
  'fw-rear-delt-fly': {
    id: 'reverse-fly',
    file: '/illustrations/exercises/exercise-reverse-fly-front.svg',
    view: 'front',
    primaryMuscles: ['posterior-deltoid', 'rhomboids'],
    secondaryMuscles: ['trapezius-middle', 'infraspinatus'],
  },
  'fw-face-pull': {
    id: 'face-pull',
    file: '/illustrations/exercises/exercise-face-pull-front.svg',
    view: 'front',
    primaryMuscles: ['posterior-deltoid', 'rhomboids', 'trapezius-middle'],
    secondaryMuscles: ['infraspinatus', 'teres-minor', 'biceps'],
  },
  'fw-shrug': {
    id: 'shrugs',
    file: '/illustrations/exercises/exercise-shrugs-front.svg',
    view: 'front',
    primaryMuscles: ['trapezius-upper'],
    secondaryMuscles: ['trapezius-middle', 'levator-scapulae', 'rhomboids'],
  },

  // Freeweight - Arms
  'fw-barbell-curl': {
    id: 'dumbbell-curl',
    file: '/illustrations/exercises/exercise-dumbbell-curl-front.svg',
    view: 'front',
    primaryMuscles: ['biceps', 'brachialis'],
    secondaryMuscles: ['brachioradialis', 'forearm-flexors', 'anterior-deltoid'],
  },
  'fw-db-curl': {
    id: 'dumbbell-curl',
    file: '/illustrations/exercises/exercise-dumbbell-curl-front.svg',
    view: 'front',
    primaryMuscles: ['biceps', 'brachialis'],
    secondaryMuscles: ['brachioradialis', 'forearm-flexors', 'anterior-deltoid'],
  },
  'fw-hammer-curl': {
    id: 'hammer-curl',
    file: '/illustrations/exercises/exercise-hammer-curl-front.svg',
    view: 'front',
    primaryMuscles: ['brachioradialis', 'brachialis', 'biceps'],
    secondaryMuscles: ['forearm-flexors', 'anterior-deltoid'],
  },
  'fw-preacher-curl': {
    id: 'preacher-curl',
    file: '/illustrations/exercises/exercise-preacher-curl-side.svg',
    view: 'side',
    primaryMuscles: ['biceps', 'brachialis'],
    secondaryMuscles: ['brachioradialis', 'forearm-flexors'],
  },
  'fw-skull-crusher': {
    id: 'skull-crushers',
    file: '/illustrations/exercises/exercise-skull-crushers-side.svg',
    view: 'side',
    primaryMuscles: ['triceps-long', 'triceps-lateral', 'triceps-medial'],
    secondaryMuscles: ['anterior-deltoid', 'pectoralis-major'],
  },
  'fw-close-grip-bench': {
    id: 'close-grip-bench-press',
    file: '/illustrations/exercises/exercise-close-grip-bench-press-side.svg',
    view: 'side',
    primaryMuscles: ['triceps', 'pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid'],
  },
  'fw-tricep-kickback': {
    id: 'tricep-kickback',
    file: '/illustrations/exercises/exercise-tricep-kickback-side.svg',
    view: 'side',
    primaryMuscles: ['triceps-long', 'triceps-lateral'],
    secondaryMuscles: ['rear-deltoid'],
  },

  // Freeweight - Legs
  'fw-squat': {
    id: 'barbell-squat',
    file: '/illustrations/exercises/exercise-squat-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'erector-spinae', 'core'],
  },
  'fw-front-squat': {
    id: 'barbell-squat',
    file: '/illustrations/exercises/exercise-squat-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'erector-spinae', 'core'],
  },
  'fw-leg-press': {
    id: 'leg-press',
    file: '/illustrations/exercises/exercise-leg-press-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings', 'adductors', 'gastrocnemius'],
  },
  'fw-romanian-dl': {
    id: 'romanian-deadlift',
    file: '/illustrations/exercises/exercise-romanian-deadlift-side.svg',
    view: 'side',
    primaryMuscles: ['hamstrings', 'gluteus-maximus', 'erector-spinae'],
    secondaryMuscles: ['latissimus-dorsi', 'trapezius', 'forearm-flexors'],
  },
  'fw-leg-curl': {
    id: 'leg-curl',
    file: '/illustrations/exercises/exercise-leg-curl-side.svg',
    view: 'side',
    primaryMuscles: ['hamstrings', 'biceps-femoris'],
    secondaryMuscles: ['gastrocnemius', 'gluteus-maximus'],
  },
  'fw-leg-extension': {
    id: 'leg-extension',
    file: '/illustrations/exercises/exercise-leg-extension-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps', 'rectus-femoris', 'vastus-lateralis'],
    secondaryMuscles: ['hip-flexors', 'tibialis-anterior'],
  },
  'fw-hip-thrust': {
    id: 'hip-thrust',
    file: '/illustrations/exercises/exercise-hip-thrust-side.svg',
    view: 'side',
    primaryMuscles: ['gluteus-maximus', 'gluteus-medius'],
    secondaryMuscles: ['hamstrings', 'quadriceps', 'erector-spinae', 'core'],
  },
  'fw-calf-raise': {
    id: 'calf-raise',
    file: '/illustrations/exercises/exercise-calf-raise-side.svg',
    view: 'side',
    primaryMuscles: ['gastrocnemius', 'soleus'],
    secondaryMuscles: ['tibialis-anterior', 'quadriceps'],
  },
  'fw-good-morning': {
    id: 'good-morning',
    file: '/illustrations/exercises/exercise-good-morning-side.svg',
    view: 'side',
    primaryMuscles: ['hamstrings', 'erector-spinae'],
    secondaryMuscles: ['gluteus-maximus', 'core'],
  },

  // Machine exercises
  'machine-lat-pulldown': {
    id: 'lat-pulldown',
    file: '/illustrations/exercises/exercise-lat-pulldown-front.svg',
    view: 'front',
    primaryMuscles: ['latissimus-dorsi', 'biceps'],
    secondaryMuscles: ['rhomboids', 'rear-deltoid', 'teres-major', 'forearm-flexors'],
  },
  'machine-cable-row': {
    id: 'seated-cable-row',
    file: '/illustrations/exercises/exercise-seated-cable-row-side.svg',
    view: 'side',
    primaryMuscles: ['latissimus-dorsi', 'rhomboids', 'trapezius-middle'],
    secondaryMuscles: ['biceps', 'posterior-deltoid', 'erector-spinae'],
  },
  'machine-chest-press': {
    id: 'chest-press-machine',
    file: '/illustrations/exercises/exercise-chest-press-machine-side.svg',
    view: 'side',
    primaryMuscles: ['pectoralis-major', 'triceps'],
    secondaryMuscles: ['anterior-deltoid', 'serratus-anterior'],
  },
  'machine-cable-fly': {
    id: 'cable-fly',
    file: '/illustrations/exercises/exercise-cable-fly-front.svg',
    view: 'front',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'biceps', 'serratus-anterior'],
  },
  'machine-cable-crossover': {
    id: 'cable-crossover',
    file: '/illustrations/exercises/exercise-cable-crossover-front.svg',
    view: 'front',
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['anterior-deltoid', 'biceps', 'serratus-anterior'],
  },
  'machine-tricep-pushdown': {
    id: 'tricep-pushdown',
    file: '/illustrations/exercises/exercise-tricep-pushdown-side.svg',
    view: 'side',
    primaryMuscles: ['triceps-long', 'triceps-lateral', 'triceps-medial'],
    secondaryMuscles: ['anterior-deltoid', 'forearm-extensors'],
  },
  'machine-cable-curl': {
    id: 'cable-curl',
    file: '/illustrations/exercises/exercise-cable-curl-front.svg',
    view: 'front',
    primaryMuscles: ['biceps', 'brachialis'],
    secondaryMuscles: ['brachioradialis', 'forearm-flexors'],
  },
  'machine-leg-abduction': {
    id: 'leg-abduction',
    file: '/illustrations/exercises/exercise-leg-abduction-side.svg',
    view: 'side',
    primaryMuscles: ['gluteus-medius', 'gluteus-minimus'],
    secondaryMuscles: ['tensor-fasciae-latae'],
  },
  'machine-leg-adduction': {
    id: 'leg-adduction',
    file: '/illustrations/exercises/exercise-leg-adduction-side.svg',
    view: 'side',
    primaryMuscles: ['adductor-magnus', 'adductor-longus'],
    secondaryMuscles: ['adductor-brevis', 'gracilis'],
  },
  'machine-hack-squat': {
    id: 'hack-squat',
    file: '/illustrations/exercises/exercise-hack-squat-side.svg',
    view: 'side',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['gluteus-maximus', 'hamstrings', 'gastrocnemius'],
  },
  'machine-seated-calf': {
    id: 'seated-calf-raise',
    file: '/illustrations/exercises/exercise-seated-calf-raise-side.svg',
    view: 'side',
    primaryMuscles: ['soleus'],
    secondaryMuscles: ['gastrocnemius', 'tibialis-posterior'],
  },
  'machine-back-extension': {
    id: 'back-extension',
    file: '/illustrations/exercises/exercise-back-extension-side.svg',
    view: 'side',
    primaryMuscles: ['erector-spinae', 'gluteus-maximus'],
    secondaryMuscles: ['hamstrings'],
  },
};

/**
 * Get illustration for an exercise by database ID
 * Returns undefined if no illustration exists
 */
export function getExerciseIllustration(exerciseId: string): ExerciseIllustration | undefined {
  return EXERCISE_ILLUSTRATIONS[exerciseId];
}

/**
 * Get illustration URL for an exercise
 * Returns a placeholder if no illustration exists
 */
export function getExerciseIllustrationUrl(exerciseId: string): string {
  const illustration = EXERCISE_ILLUSTRATIONS[exerciseId];
  return illustration?.file || '/illustrations/exercises/exercise-placeholder.svg';
}

/**
 * Check if an exercise has an illustration
 */
export function hasExerciseIllustration(exerciseId: string): boolean {
  return exerciseId in EXERCISE_ILLUSTRATIONS;
}

/**
 * Muscle group colors for visualization
 */
export const MUSCLE_GROUP_COLORS: Record<string, { color: string; glow: string }> = {
  Chest: { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.5)' },
  Back: { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.5)' },
  Shoulders: { color: '#F97316', glow: 'rgba(249, 115, 22, 0.5)' },
  Arms: { color: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.5)' },
  Core: { color: '#10B981', glow: 'rgba(16, 185, 129, 0.5)' },
  Glutes: { color: '#EC4899', glow: 'rgba(236, 72, 153, 0.5)' },
  Quads: { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.5)' },
  Hamstrings: { color: '#6366F1', glow: 'rgba(99, 102, 241, 0.5)' },
  Calves: { color: '#14B8A6', glow: 'rgba(20, 184, 166, 0.5)' },
  Adductors: { color: '#A855F7', glow: 'rgba(168, 85, 247, 0.5)' },
};

/**
 * Get color for a muscle group
 */
export function getMuscleGroupColor(muscleGroup: string): { color: string; glow: string } {
  return MUSCLE_GROUP_COLORS[muscleGroup] || { color: '#64748B', glow: 'rgba(100, 116, 139, 0.5)' };
}

/**
 * Map database muscle IDs to illustration muscle IDs
 * (Database uses abbreviated names, illustrations use full anatomical names)
 */
export const MUSCLE_ID_MAP: Record<string, string[]> = {
  // Chest
  'chest-upper': ['pectoralis-major-clavicular'],
  'chest-mid': ['pectoralis-major', 'pectoralis-major-sternal'],
  'chest-lower': ['pectoralis-major'],

  // Back
  'lats': ['latissimus-dorsi'],
  'traps-upper': ['trapezius-upper', 'trapezius'],
  'traps-mid': ['trapezius-middle'],
  'traps-lower': ['trapezius-lower'],
  'rhomboids': ['rhomboids'],
  'teres-major': ['teres-major'],
  'erector-spinae': ['erector-spinae'],

  // Shoulders
  'delt-front': ['anterior-deltoid'],
  'delt-side': ['lateral-deltoid'],
  'delt-rear': ['posterior-deltoid', 'rear-deltoid'],
  'rotator-cuff': ['infraspinatus', 'supraspinatus', 'teres-minor'],

  // Arms
  'biceps-long': ['biceps-long-head', 'biceps'],
  'biceps-short': ['biceps-short-head', 'biceps'],
  'brachialis': ['brachialis'],
  'brachioradialis': ['brachioradialis'],
  'triceps-long': ['triceps-long', 'triceps'],
  'triceps-lateral': ['triceps-lateral', 'triceps'],
  'triceps-medial': ['triceps-medial', 'triceps'],
  'forearm-flexors': ['forearm-flexors'],
  'forearm-extensors': ['forearm-extensors'],

  // Core
  'rectus-abdominis': ['rectus-abdominis'],
  'obliques': ['external-obliques', 'internal-obliques'],
  'transverse-abdominis': ['transverse-abdominis'],
  'serratus': ['serratus-anterior'],

  // Glutes
  'glute-max': ['gluteus-maximus'],
  'glute-med': ['gluteus-medius'],
  'glute-min': ['gluteus-minimus'],
  'hip-flexors': ['hip-flexors'],

  // Quads
  'quad-rectus': ['rectus-femoris', 'quadriceps'],
  'quad-vastus-lat': ['vastus-lateralis', 'quadriceps'],
  'quad-vastus-med': ['vastus-medialis', 'quadriceps'],
  'quad-vastus-int': ['vastus-intermedius', 'quadriceps'],

  // Hamstrings
  'hamstring-bicep': ['biceps-femoris', 'hamstrings'],
  'hamstring-semi-t': ['semitendinosus', 'hamstrings'],
  'hamstring-semi-m': ['semimembranosus', 'hamstrings'],

  // Adductors
  'adductor-magnus': ['adductor-magnus', 'adductors'],
  'adductor-longus': ['adductor-longus', 'adductors'],
  'adductor-brevis': ['adductor-brevis', 'adductors'],

  // Calves
  'gastrocnemius': ['gastrocnemius', 'gastrocnemius-lateral', 'gastrocnemius-medial'],
  'soleus': ['soleus'],
  'tibialis-anterior': ['tibialis-anterior'],
};

/**
 * Convert database muscle ID to illustration muscle IDs
 */
export function getMuscleIllustrationIds(dbMuscleId: string): string[] {
  return MUSCLE_ID_MAP[dbMuscleId] || [dbMuscleId];
}

/**
 * Interface for muscle activation data used in visualization
 */
export interface MuscleVisualizationData {
  muscleId: string;
  illustrationIds: string[];
  activation: number;
  color: string;
  level: ActivationLevel;
}

/**
 * Convert database muscle activations to visualization format
 */
export function prepareVisualizationData(
  activations: Array<{ muscleId: string; activation: number }>
): MuscleVisualizationData[] {
  return activations.map(({ muscleId, activation }) => ({
    muscleId,
    illustrationIds: getMuscleIllustrationIds(muscleId),
    activation,
    color: getActivationColor(activation),
    level: getActivationLevel(activation),
  }));
}
