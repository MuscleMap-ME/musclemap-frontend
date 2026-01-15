/**
 * Muscle Data - Comprehensive muscle metadata for the 3D Explorer
 *
 * Contains anatomical information, exercise recommendations, tips,
 * and SVG position data for interactive visualization.
 */

// ============================================
// COLOR PALETTE FOR MUSCLE ACTIVATION LEVELS
// ============================================
export const ACTIVATION_COLORS = {
  none: 'rgba(71, 85, 105, 0.3)',      // Slate gray - inactive
  low: 'rgba(34, 197, 94, 0.6)',       // Green - light work
  moderate: 'rgba(234, 179, 8, 0.7)',   // Yellow - moderate
  high: 'rgba(249, 115, 22, 0.8)',      // Orange - high intensity
  max: 'rgba(239, 68, 68, 0.9)',        // Red - maximum activation
};

/**
 * Get color based on activation percentage
 * @param {number} activation - 0-100 activation level
 * @returns {string} Color value
 */
export function getActivationColor(activation) {
  if (activation <= 0) return ACTIVATION_COLORS.none;
  if (activation <= 25) return ACTIVATION_COLORS.low;
  if (activation <= 50) return ACTIVATION_COLORS.moderate;
  if (activation <= 75) return ACTIVATION_COLORS.high;
  return ACTIVATION_COLORS.max;
}

/**
 * Complete muscle data definitions
 * Each muscle includes anatomical, exercise, training, and SVG position information
 */
export const MUSCLE_DATA = {
  // ============================================
  // CHEST
  // ============================================
  chest: {
    id: 'chest',
    name: 'Pectoralis Major',
    commonName: 'Chest',
    description:
      'The large fan-shaped muscle covering the upper front of the rib cage. It has two heads: the clavicular (upper) and sternal (lower) portions.',
    exercises: [
      'Bench Press',
      'Push-ups',
      'Dumbbell Flyes',
      'Cable Crossovers',
      'Incline Press',
      'Chest Dips',
    ],
    tips: [
      'Focus on the squeeze at the top of each rep',
      'Keep shoulders retracted and down',
      'Control the eccentric (lowering) phase',
      'Vary angles to target different portions',
    ],
    antagonist: 'back',
    synergists: ['shoulders', 'triceps'],
    color: '#ef4444',
    glowColor: '#ff6b6b',
    group: 'push',
    view: 'front',
    // SVG path data for rendering
    paths: [
      {
        // Left pec
        d: 'M 70 100 Q 55 105, 50 115 Q 48 130, 55 140 Q 70 148, 85 145 Q 95 140, 98 125 Q 98 110, 85 100 Q 78 98, 70 100',
        side: 'left',
      },
      {
        // Right pec
        d: 'M 130 100 Q 145 105, 150 115 Q 152 130, 145 140 Q 130 148, 115 145 Q 105 140, 102 125 Q 102 110, 115 100 Q 122 98, 130 100',
        side: 'right',
      },
    ],
  },

  // ============================================
  // BACK
  // ============================================
  back: {
    id: 'back',
    name: 'Latissimus Dorsi & Rhomboids',
    commonName: 'Back',
    description:
      'The broad muscles of the back including the lats (wing-like muscles) and rhomboids (between shoulder blades). Essential for pulling movements.',
    exercises: [
      'Pull-ups',
      'Lat Pulldowns',
      'Barbell Rows',
      'Dumbbell Rows',
      'Face Pulls',
      'Deadlifts',
    ],
    tips: [
      'Initiate pulls with the elbows, not the hands',
      'Squeeze shoulder blades together at contraction',
      'Keep core braced during rowing movements',
      'Use full range of motion for lat development',
    ],
    antagonist: 'chest',
    synergists: ['biceps', 'rear_delts'],
    color: 'var(--muscle-back)',
    group: 'pull',
  },

  lower_back: {
    id: 'lower_back',
    name: 'Erector Spinae',
    commonName: 'Lower Back',
    description:
      'The group of muscles running along the spine that extend and stabilize the back. Critical for posture and lifting.',
    exercises: [
      'Deadlifts',
      'Good Mornings',
      'Back Extensions',
      'Romanian Deadlifts',
      'Bird Dogs',
      'Superman Holds',
    ],
    tips: [
      'Never round the lower back under load',
      'Engage core before lifting',
      'Progress slowly to avoid injury',
      'Focus on hip hinge mechanics',
    ],
    antagonist: 'abs',
    synergists: ['glutes', 'hamstrings'],
    color: 'var(--muscle-back)',
    group: 'pull',
  },

  // ============================================
  // SHOULDERS
  // ============================================
  shoulders: {
    id: 'shoulders',
    name: 'Deltoids',
    commonName: 'Shoulders',
    description:
      'Three-headed muscle capping the shoulder joint. Anterior (front), lateral (side), and posterior (rear) heads allow multi-directional arm movement.',
    exercises: [
      'Overhead Press',
      'Lateral Raises',
      'Front Raises',
      'Arnold Press',
      'Face Pulls',
      'Upright Rows',
    ],
    tips: [
      'Control the weight - no swinging',
      'Lead with elbows on lateral raises',
      'Dont neglect rear delts for balance',
      'Keep slight bend in elbows during raises',
    ],
    antagonist: 'lats',
    synergists: ['triceps', 'chest', 'trapezius'],
    color: 'var(--muscle-shoulders)',
    group: 'push',
  },

  // ============================================
  // ARMS
  // ============================================
  biceps: {
    id: 'biceps',
    name: 'Biceps Brachii',
    commonName: 'Biceps',
    description:
      'Two-headed muscle on the front of the upper arm. Functions in elbow flexion and forearm supination.',
    exercises: [
      'Barbell Curls',
      'Dumbbell Curls',
      'Hammer Curls',
      'Preacher Curls',
      'Concentration Curls',
      'Chin-ups',
    ],
    tips: [
      'Keep elbows pinned to sides',
      'Full extension at the bottom',
      'Control the negative portion',
      'Vary grip width and angle',
    ],
    antagonist: 'triceps',
    synergists: ['forearms', 'brachialis'],
    color: 'var(--muscle-arms)',
    group: 'pull',
  },

  triceps: {
    id: 'triceps',
    name: 'Triceps Brachii',
    commonName: 'Triceps',
    description:
      'Three-headed muscle on the back of the upper arm. Makes up about two-thirds of arm mass. Primary elbow extensor.',
    exercises: [
      'Tricep Pushdowns',
      'Skull Crushers',
      'Close Grip Bench',
      'Overhead Extensions',
      'Diamond Push-ups',
      'Dips',
    ],
    tips: [
      'Lock out fully to engage the muscle',
      'Keep upper arms stationary',
      'Focus on the stretch under load',
      'Hit all three heads with variety',
    ],
    antagonist: 'biceps',
    synergists: ['chest', 'shoulders'],
    color: 'var(--muscle-arms)',
    group: 'push',
  },

  forearms: {
    id: 'forearms',
    name: 'Forearm Flexors & Extensors',
    commonName: 'Forearms',
    description:
      'Complex muscle group controlling wrist and finger movement. Essential for grip strength in all exercises.',
    exercises: [
      'Wrist Curls',
      'Reverse Curls',
      'Farmers Walks',
      'Dead Hangs',
      'Plate Pinches',
      'Grip Squeezes',
    ],
    tips: [
      'Train both flexors and extensors',
      'Use thick bar training for grip',
      'Dont overtrain - high injury risk',
      'Stretch regularly to prevent tightness',
    ],
    antagonist: null,
    synergists: ['biceps', 'brachialis'],
    color: 'var(--muscle-arms)',
    group: 'pull',
  },

  // ============================================
  // CORE
  // ============================================
  abs: {
    id: 'abs',
    name: 'Rectus Abdominis',
    commonName: 'Abs',
    description:
      'The "six-pack" muscle running vertically down the front of the abdomen. Functions in trunk flexion and posture.',
    exercises: [
      'Crunches',
      'Leg Raises',
      'Planks',
      'Ab Wheel Rollouts',
      'Cable Crunches',
      'Hanging Knee Raises',
    ],
    tips: [
      'Focus on contraction, not momentum',
      'Breathe out during the crunch',
      'Abs are made in the kitchen (diet matters)',
      'Train with resistance for hypertrophy',
    ],
    antagonist: 'lower_back',
    synergists: ['obliques', 'hip_flexors'],
    color: 'var(--muscle-core)',
    group: 'core',
  },

  obliques: {
    id: 'obliques',
    name: 'External & Internal Obliques',
    commonName: 'Obliques',
    description:
      'Diagonal muscles on the sides of the abdomen. Enable rotation and lateral flexion of the trunk.',
    exercises: [
      'Russian Twists',
      'Side Planks',
      'Woodchops',
      'Bicycle Crunches',
      'Pallof Press',
      'Side Bends',
    ],
    tips: [
      'Control rotation - dont swing',
      'Anti-rotation exercises build stability',
      'Breathe normally during planks',
      'Progress from isometric to dynamic',
    ],
    antagonist: null,
    synergists: ['abs', 'lower_back'],
    color: 'var(--muscle-core)',
    group: 'core',
  },

  // ============================================
  // LEGS - UPPER
  // ============================================
  quads: {
    id: 'quads',
    name: 'Quadriceps Femoris',
    commonName: 'Quads',
    description:
      'Four-headed muscle group on the front of the thigh. Primary knee extensor and hip flexor. Largest muscle group in the body.',
    exercises: [
      'Squats',
      'Leg Press',
      'Leg Extensions',
      'Lunges',
      'Front Squats',
      'Step-ups',
    ],
    tips: [
      'Push through the whole foot',
      'Keep knees tracking over toes',
      'Depth matters for full development',
      'Warm up thoroughly before heavy lifts',
    ],
    antagonist: 'hamstrings',
    synergists: ['glutes', 'calves'],
    color: 'var(--muscle-legs)',
    group: 'push',
  },

  hamstrings: {
    id: 'hamstrings',
    name: 'Biceps Femoris & Semis',
    commonName: 'Hamstrings',
    description:
      'Three muscles on the back of the thigh. Function in knee flexion and hip extension. Often undertrained.',
    exercises: [
      'Romanian Deadlifts',
      'Leg Curls',
      'Good Mornings',
      'Nordic Curls',
      'Glute-Ham Raises',
      'Sumo Deadlifts',
    ],
    tips: [
      'Feel the stretch at the bottom',
      'Dont hyperextend knees',
      'Train both functions (hip hinge + knee flexion)',
      'Build up slowly to prevent injury',
    ],
    antagonist: 'quads',
    synergists: ['glutes', 'lower_back'],
    color: 'var(--muscle-legs)',
    group: 'pull',
  },

  glutes: {
    id: 'glutes',
    name: 'Gluteus Maximus',
    commonName: 'Glutes',
    description:
      'The largest muscle in the body. Primary hip extensor. Essential for power, posture, and athletic performance.',
    exercises: [
      'Hip Thrusts',
      'Squats',
      'Deadlifts',
      'Bulgarian Split Squats',
      'Glute Bridges',
      'Cable Kickbacks',
    ],
    tips: [
      'Squeeze hard at the top',
      'Mind-muscle connection is key',
      'Dont overarch the lower back',
      'Activation exercises before compounds',
    ],
    antagonist: 'hip_flexors',
    synergists: ['hamstrings', 'lower_back'],
    color: 'var(--muscle-legs)',
    group: 'push',
  },

  // ============================================
  // LEGS - LOWER
  // ============================================
  calves: {
    id: 'calves',
    name: 'Gastrocnemius & Soleus',
    commonName: 'Calves',
    description:
      'Two-muscle group on the back of the lower leg. The gastrocnemius gives the rounded shape; soleus lies beneath.',
    exercises: [
      'Standing Calf Raises',
      'Seated Calf Raises',
      'Donkey Calf Raises',
      'Jump Rope',
      'Box Jumps',
      'Single-Leg Calf Raises',
    ],
    tips: [
      'Full range of motion is crucial',
      'Pause at the top and bottom',
      'Higher reps often work better',
      'Train both bent and straight knee variations',
    ],
    antagonist: 'tibialis',
    synergists: ['quads', 'hamstrings'],
    color: 'var(--muscle-legs)',
    group: 'push',
  },
};

/**
 * Get muscle data by ID
 * @param {string} muscleId - The muscle identifier
 * @returns {Object|null} Muscle data or null if not found
 */
export function getMuscleData(muscleId) {
  return MUSCLE_DATA[muscleId] || null;
}

/**
 * Get all muscles in a specific group
 * @param {string} group - 'push' | 'pull' | 'core'
 * @returns {Object[]} Array of muscle data objects
 */
export function getMusclesByGroup(group) {
  return Object.values(MUSCLE_DATA).filter((m) => m.group === group);
}

/**
 * Get antagonist pairs
 * @param {string} muscleId - The muscle identifier
 * @returns {Object|null} The antagonist muscle data
 */
export function getAntagonist(muscleId) {
  const muscle = MUSCLE_DATA[muscleId];
  if (!muscle || !muscle.antagonist) return null;
  return MUSCLE_DATA[muscle.antagonist];
}

/**
 * Get synergist muscles
 * @param {string} muscleId - The muscle identifier
 * @returns {Object[]} Array of synergist muscle data objects
 */
export function getSynergists(muscleId) {
  const muscle = MUSCLE_DATA[muscleId];
  if (!muscle || !muscle.synergists) return [];
  return muscle.synergists.map((id) => MUSCLE_DATA[id]).filter(Boolean);
}

/**
 * Search muscles by exercise name
 * @param {string} exerciseName - The exercise to search for
 * @returns {Object[]} Array of muscles that use this exercise
 */
export function getMusclesForExercise(exerciseName) {
  const normalized = exerciseName.toLowerCase();
  return Object.values(MUSCLE_DATA).filter((muscle) =>
    muscle.exercises.some((ex) => ex.toLowerCase().includes(normalized))
  );
}

/**
 * All muscle IDs for iteration
 */
export const MUSCLE_IDS = Object.keys(MUSCLE_DATA);

/**
 * Muscle groups organized by body region
 */
export const MUSCLE_REGIONS = {
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms'],
  core: ['abs', 'obliques', 'lower_back'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves'],
};

export default MUSCLE_DATA;
