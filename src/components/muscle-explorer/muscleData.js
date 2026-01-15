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
    color: '#06b6d4',
    glowColor: '#22d3ee',
    group: 'pull',
    view: 'back',
    paths: [
      {
        // Left lat
        d: 'M 70 105 Q 60 115, 55 140 Q 52 165, 55 185 Q 60 200, 75 205 Q 90 200, 95 180 Q 98 155, 95 130 Q 90 110, 70 105',
        side: 'left',
      },
      {
        // Right lat
        d: 'M 130 105 Q 140 115, 145 140 Q 148 165, 145 185 Q 140 200, 125 205 Q 110 200, 105 180 Q 102 155, 105 130 Q 110 110, 130 105',
        side: 'right',
      },
      {
        // Upper back / traps
        d: 'M 75 95 Q 85 85, 100 82 Q 115 85, 125 95 Q 130 105, 125 115 Q 115 125, 100 128 Q 85 125, 75 115 Q 70 105, 75 95',
        side: 'center',
      },
    ],
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
    color: '#0891b2',
    glowColor: '#06b6d4',
    group: 'pull',
    view: 'back',
    paths: [
      {
        // Lower back muscles along spine
        d: 'M 90 210 Q 85 225, 85 245 Q 85 265, 90 280 Q 95 285, 100 285 Q 105 285, 110 280 Q 115 265, 115 245 Q 115 225, 110 210 Q 105 205, 100 205 Q 95 205, 90 210',
        side: 'center',
      },
    ],
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
    color: '#f97316',
    glowColor: '#fb923c',
    group: 'push',
    view: 'both',
    paths: [
      {
        // Left deltoid front
        d: 'M 50 95 Q 38 100, 35 112 Q 33 125, 40 135 Q 48 140, 55 138 Q 60 130, 58 118 Q 56 105, 50 95',
        side: 'left',
        view: 'front',
      },
      {
        // Right deltoid front
        d: 'M 150 95 Q 162 100, 165 112 Q 167 125, 160 135 Q 152 140, 145 138 Q 140 130, 142 118 Q 144 105, 150 95',
        side: 'right',
        view: 'front',
      },
      {
        // Left deltoid back
        d: 'M 50 95 Q 38 100, 35 112 Q 33 125, 40 135 Q 48 140, 55 138 Q 60 130, 58 118 Q 56 105, 50 95',
        side: 'left',
        view: 'back',
      },
      {
        // Right deltoid back
        d: 'M 150 95 Q 162 100, 165 112 Q 167 125, 160 135 Q 152 140, 145 138 Q 140 130, 142 118 Q 144 105, 150 95',
        side: 'right',
        view: 'back',
      },
    ],
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
    color: '#eab308',
    glowColor: '#facc15',
    group: 'pull',
    view: 'front',
    paths: [
      {
        // Left bicep
        d: 'M 38 138 Q 30 145, 28 160 Q 27 175, 32 185 Q 40 190, 48 185 Q 52 175, 50 160 Q 48 145, 38 138',
        side: 'left',
      },
      {
        // Right bicep
        d: 'M 162 138 Q 170 145, 172 160 Q 173 175, 168 185 Q 160 190, 152 185 Q 148 175, 150 160 Q 152 145, 162 138',
        side: 'right',
      },
    ],
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
    color: '#84cc16',
    glowColor: '#a3e635',
    group: 'push',
    view: 'back',
    paths: [
      {
        // Left tricep
        d: 'M 42 138 Q 35 148, 33 165 Q 32 180, 36 190 Q 43 195, 52 190 Q 55 180, 53 165 Q 50 150, 42 138',
        side: 'left',
      },
      {
        // Right tricep
        d: 'M 158 138 Q 165 148, 167 165 Q 168 180, 164 190 Q 157 195, 148 190 Q 145 180, 147 165 Q 150 150, 158 138',
        side: 'right',
      },
    ],
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
    color: '#f59e0b',
    glowColor: '#fbbf24',
    group: 'pull',
    view: 'both',
    paths: [
      {
        // Left forearm front
        d: 'M 30 188 Q 22 200, 20 215 Q 18 235, 22 250 Q 28 258, 35 255 Q 42 248, 43 230 Q 43 210, 38 195 Q 35 188, 30 188',
        side: 'left',
        view: 'front',
      },
      {
        // Right forearm front
        d: 'M 170 188 Q 178 200, 180 215 Q 182 235, 178 250 Q 172 258, 165 255 Q 158 248, 157 230 Q 157 210, 162 195 Q 165 188, 170 188',
        side: 'right',
        view: 'front',
      },
      {
        // Left forearm back
        d: 'M 34 193 Q 26 208, 24 225 Q 22 245, 26 258 Q 32 265, 40 262 Q 48 255, 48 235 Q 48 215, 42 198 Q 38 192, 34 193',
        side: 'left',
        view: 'back',
      },
      {
        // Right forearm back
        d: 'M 166 193 Q 174 208, 176 225 Q 178 245, 174 258 Q 168 265, 160 262 Q 152 255, 152 235 Q 152 215, 158 198 Q 162 192, 166 193',
        side: 'right',
        view: 'back',
      },
    ],
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
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    group: 'core',
    view: 'front',
    paths: [
      {
        // Rectus abdominis - center abs
        d: 'M 88 145 Q 85 155, 85 175 Q 85 195, 88 210 Q 95 218, 100 220 Q 105 218, 112 210 Q 115 195, 115 175 Q 115 155, 112 145 Q 105 140, 100 140 Q 95 140, 88 145',
        side: 'center',
      },
    ],
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
    color: '#7c3aed',
    glowColor: '#8b5cf6',
    group: 'core',
    view: 'front',
    paths: [
      {
        // Left oblique
        d: 'M 70 150 Q 65 165, 65 185 Q 65 205, 70 218 Q 78 225, 85 220 Q 85 200, 85 180 Q 85 160, 82 148 Q 78 145, 70 150',
        side: 'left',
      },
      {
        // Right oblique
        d: 'M 130 150 Q 135 165, 135 185 Q 135 205, 130 218 Q 122 225, 115 220 Q 115 200, 115 180 Q 115 160, 118 148 Q 122 145, 130 150',
        side: 'right',
      },
    ],
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
    color: '#ec4899',
    glowColor: '#f472b6',
    group: 'push',
    view: 'front',
    paths: [
      {
        // Left quad
        d: 'M 75 225 Q 65 240, 62 270 Q 60 300, 62 330 Q 68 345, 78 348 Q 88 345, 92 330 Q 95 300, 93 270 Q 90 245, 75 225',
        side: 'left',
      },
      {
        // Right quad
        d: 'M 125 225 Q 135 240, 138 270 Q 140 300, 138 330 Q 132 345, 122 348 Q 112 345, 108 330 Q 105 300, 107 270 Q 110 245, 125 225',
        side: 'right',
      },
    ],
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
    color: '#14b8a6',
    glowColor: '#2dd4bf',
    group: 'pull',
    view: 'back',
    paths: [
      {
        // Left hamstring
        d: 'M 75 230 Q 65 250, 62 280 Q 60 310, 65 340 Q 72 355, 80 352 Q 90 345, 92 320 Q 94 290, 90 260 Q 85 240, 75 230',
        side: 'left',
      },
      {
        // Right hamstring
        d: 'M 125 230 Q 135 250, 138 280 Q 140 310, 135 340 Q 128 355, 120 352 Q 110 345, 108 320 Q 106 290, 110 260 Q 115 240, 125 230',
        side: 'right',
      },
    ],
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
    color: '#f43f5e',
    glowColor: '#fb7185',
    group: 'push',
    view: 'back',
    paths: [
      {
        // Left glute
        d: 'M 75 210 Q 60 215, 55 230 Q 55 250, 65 260 Q 78 268, 90 260 Q 98 248, 98 230 Q 95 215, 75 210',
        side: 'left',
      },
      {
        // Right glute
        d: 'M 125 210 Q 140 215, 145 230 Q 145 250, 135 260 Q 122 268, 110 260 Q 102 248, 102 230 Q 105 215, 125 210',
        side: 'right',
      },
    ],
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
    color: '#10b981',
    glowColor: '#34d399',
    group: 'push',
    view: 'both',
    paths: [
      {
        // Left calf front
        d: 'M 68 352 Q 62 365, 60 380 Q 60 395, 65 405 Q 72 412, 78 408 Q 85 400, 85 385 Q 85 368, 80 355 Q 75 350, 68 352',
        side: 'left',
        view: 'front',
      },
      {
        // Right calf front
        d: 'M 132 352 Q 138 365, 140 380 Q 140 395, 135 405 Q 128 412, 122 408 Q 115 400, 115 385 Q 115 368, 120 355 Q 125 350, 132 352',
        side: 'right',
        view: 'front',
      },
      {
        // Left calf back (gastrocnemius)
        d: 'M 65 352 Q 55 365, 55 385 Q 55 402, 62 412 Q 72 420, 82 415 Q 90 405, 90 385 Q 90 365, 82 352 Q 75 348, 65 352',
        side: 'left',
        view: 'back',
      },
      {
        // Right calf back (gastrocnemius)
        d: 'M 135 352 Q 145 365, 145 385 Q 145 402, 138 412 Q 128 420, 118 415 Q 110 405, 110 385 Q 110 365, 118 352 Q 125 348, 135 352',
        side: 'right',
        view: 'back',
      },
    ],
  },
};

// ============================================
// SVG CONSTANTS
// ============================================

/**
 * ViewBox for the SVG body model
 */
export const VIEWBOX = '0 0 200 420';

/**
 * Body outline paths for front and back views
 */
export const BODY_OUTLINE = {
  front: `
    M 100 20
    C 85 20, 75 35, 75 50
    C 75 65, 85 75, 100 80
    C 115 75, 125 65, 125 50
    C 125 35, 115 20, 100 20
    M 100 80
    L 100 95
    M 75 100
    C 55 100, 45 105, 40 120
    L 25 170
    L 30 175
    L 55 130
    L 60 130
    M 125 100
    C 145 100, 155 105, 160 120
    L 175 170
    L 170 175
    L 145 130
    L 140 130
    M 70 100
    L 60 130
    L 60 220
    C 60 235, 65 250, 75 260
    L 75 340
    L 55 400
    L 60 405
    L 85 350
    L 90 350
    L 100 400
    L 100 405
    M 130 100
    L 140 130
    L 140 220
    C 140 235, 135 250, 125 260
    L 125 340
    L 145 400
    L 140 405
    L 115 350
    L 110 350
    L 100 400
  `,
  back: `
    M 100 20
    C 85 20, 75 35, 75 50
    C 75 65, 85 75, 100 80
    C 115 75, 125 65, 125 50
    C 125 35, 115 20, 100 20
    M 100 80
    L 100 95
    M 75 100
    C 55 100, 45 105, 40 120
    L 25 170
    L 30 175
    L 55 130
    L 60 130
    M 125 100
    C 145 100, 155 105, 160 120
    L 175 170
    L 170 175
    L 145 130
    L 140 130
    M 70 100
    L 60 130
    L 60 220
    C 60 235, 65 250, 75 260
    L 75 340
    L 55 400
    L 60 405
    L 85 350
    L 90 350
    L 100 400
    L 100 405
    M 130 100
    L 140 130
    L 140 220
    C 140 235, 135 250, 125 260
    L 125 340
    L 145 400
    L 140 405
    L 115 350
    L 110 350
    L 100 400
  `,
};

/**
 * SVG filter definitions for glow effects
 */
export const GLOW_FILTER_DEF = `
  <filter id="muscle-glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <filter id="muscle-glow-intense" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
  <filter id="muscle-hover" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
`;

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
 * Get all muscles visible in a specific view
 * @param {string} view - 'front' | 'back'
 * @returns {Object[]} Array of muscle data objects
 */
export function getMusclesForView(view = 'front') {
  return Object.values(MUSCLE_DATA).filter((muscle) => {
    if (muscle.view === 'both') return true;
    return muscle.view === view;
  });
}

/**
 * Get paths for a muscle filtered by view
 * @param {Object} muscle - The muscle data object
 * @param {string} view - 'front' | 'back'
 * @returns {Object[]} Array of path objects for rendering
 */
export function getMusclePathsForView(muscle, view = 'front') {
  if (!muscle || !muscle.paths) return [];

  return muscle.paths.filter((path) => {
    // If path has no view specified, use the muscle's default view
    if (!path.view) {
      return muscle.view === view || muscle.view === 'both';
    }
    return path.view === view;
  });
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
 * Search muscles by name or common name
 * @param {string} query - The search query
 * @returns {Object[]} Array of matching muscles
 */
export function searchMuscles(query) {
  if (!query || query.length < 2) return [];
  const normalized = query.toLowerCase();
  return Object.values(MUSCLE_DATA).filter(
    (muscle) =>
      muscle.name.toLowerCase().includes(normalized) ||
      muscle.commonName.toLowerCase().includes(normalized) ||
      muscle.id.toLowerCase().includes(normalized)
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

/**
 * Default highlight sequence for animations
 */
export const DEFAULT_HIGHLIGHT_SEQUENCE = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'back',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
];

export default MUSCLE_DATA;
