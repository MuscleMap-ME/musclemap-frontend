/**
 * SVG Path Data for Muscle Groups
 *
 * Simplified anatomical paths for a stylized body silhouette.
 * Each muscle group contains paths for both left and right sides where applicable.
 * Designed for performance and visual impact on the landing page.
 *
 * Muscle groups included:
 * - chest (pectorals)
 * - shoulders (deltoids)
 * - arms (biceps, triceps - combined)
 * - biceps (front view)
 * - triceps (back view)
 * - forearms (front and back)
 * - abs (rectus abdominis)
 * - obliques (side abs)
 * - core (abs + obliques combined)
 * - back (lats, traps)
 * - legs (quads + hamstrings combined)
 * - quads (front view)
 * - hamstrings (back view)
 * - calves (front and back)
 * - glutes (back view)
 */

// Body outline - simplified silhouette
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

// Muscle group paths - simplified for stylized look
export const MUSCLE_PATHS = {
  // CHEST - pectorals
  chest: {
    id: 'chest',
    name: 'Chest',
    color: '#ef4444', // red
    glowColor: '#ff6b6b',
    view: 'front',
    paths: [
      // Left pec
      {
        d: `M 70 100
            Q 55 105, 50 115
            Q 48 130, 55 140
            Q 70 148, 85 145
            Q 95 140, 98 125
            Q 98 110, 85 100
            Q 78 98, 70 100`,
        side: 'left',
      },
      // Right pec
      {
        d: `M 130 100
            Q 145 105, 150 115
            Q 152 130, 145 140
            Q 130 148, 115 145
            Q 105 140, 102 125
            Q 102 110, 115 100
            Q 122 98, 130 100`,
        side: 'right',
      },
    ],
  },

  // SHOULDERS - deltoids
  shoulders: {
    id: 'shoulders',
    name: 'Shoulders',
    color: '#f97316', // orange
    glowColor: '#fb923c',
    view: 'both',
    paths: [
      // Left deltoid front
      {
        d: `M 50 95
            Q 38 100, 35 112
            Q 33 125, 40 135
            Q 48 140, 55 138
            Q 60 130, 58 118
            Q 56 105, 50 95`,
        side: 'left',
        view: 'front',
      },
      // Right deltoid front
      {
        d: `M 150 95
            Q 162 100, 165 112
            Q 167 125, 160 135
            Q 152 140, 145 138
            Q 140 130, 142 118
            Q 144 105, 150 95`,
        side: 'right',
        view: 'front',
      },
      // Left deltoid back
      {
        d: `M 50 95
            Q 38 100, 35 112
            Q 33 125, 40 135
            Q 48 140, 55 138
            Q 60 130, 58 118
            Q 56 105, 50 95`,
        side: 'left',
        view: 'back',
      },
      // Right deltoid back
      {
        d: `M 150 95
            Q 162 100, 165 112
            Q 167 125, 160 135
            Q 152 140, 145 138
            Q 140 130, 142 118
            Q 144 105, 150 95`,
        side: 'right',
        view: 'back',
      },
    ],
  },

  // BICEPS
  biceps: {
    id: 'biceps',
    name: 'Biceps',
    color: '#eab308', // yellow
    glowColor: '#facc15',
    view: 'front',
    paths: [
      // Left bicep
      {
        d: `M 38 138
            Q 30 145, 28 160
            Q 27 175, 32 185
            Q 40 190, 48 185
            Q 52 175, 50 160
            Q 48 145, 38 138`,
        side: 'left',
      },
      // Right bicep
      {
        d: `M 162 138
            Q 170 145, 172 160
            Q 173 175, 168 185
            Q 160 190, 152 185
            Q 148 175, 150 160
            Q 152 145, 162 138`,
        side: 'right',
      },
    ],
  },

  // TRICEPS
  triceps: {
    id: 'triceps',
    name: 'Triceps',
    color: '#84cc16', // lime
    glowColor: '#a3e635',
    view: 'back',
    paths: [
      // Left tricep
      {
        d: `M 42 138
            Q 35 148, 33 165
            Q 32 180, 36 190
            Q 43 195, 52 190
            Q 55 180, 53 165
            Q 50 150, 42 138`,
        side: 'left',
      },
      // Right tricep
      {
        d: `M 158 138
            Q 165 148, 167 165
            Q 168 180, 164 190
            Q 157 195, 148 190
            Q 145 180, 147 165
            Q 150 150, 158 138`,
        side: 'right',
      },
    ],
  },

  // Combined arms group
  arms: {
    id: 'arms',
    name: 'Arms',
    color: '#eab308', // yellow
    glowColor: '#facc15',
    view: 'both',
    paths: [
      // Left arm front (bicep area)
      {
        d: `M 38 138
            Q 30 145, 28 160
            Q 27 175, 32 185
            Q 40 190, 48 185
            Q 52 175, 50 160
            Q 48 145, 38 138`,
        side: 'left',
        view: 'front',
      },
      // Right arm front (bicep area)
      {
        d: `M 162 138
            Q 170 145, 172 160
            Q 173 175, 168 185
            Q 160 190, 152 185
            Q 148 175, 150 160
            Q 152 145, 162 138`,
        side: 'right',
        view: 'front',
      },
      // Left arm back (tricep area)
      {
        d: `M 42 138
            Q 35 148, 33 165
            Q 32 180, 36 190
            Q 43 195, 52 190
            Q 55 180, 53 165
            Q 50 150, 42 138`,
        side: 'left',
        view: 'back',
      },
      // Right arm back (tricep area)
      {
        d: `M 158 138
            Q 165 148, 167 165
            Q 168 180, 164 190
            Q 157 195, 148 190
            Q 145 180, 147 165
            Q 150 150, 158 138`,
        side: 'right',
        view: 'back',
      },
    ],
  },

  // BACK - lats and traps
  back: {
    id: 'back',
    name: 'Back',
    color: '#06b6d4', // cyan
    glowColor: '#22d3ee',
    view: 'back',
    paths: [
      // Left lat
      {
        d: `M 70 105
            Q 60 115, 55 140
            Q 52 165, 55 185
            Q 60 200, 75 205
            Q 90 200, 95 180
            Q 98 155, 95 130
            Q 90 110, 70 105`,
        side: 'left',
      },
      // Right lat
      {
        d: `M 130 105
            Q 140 115, 145 140
            Q 148 165, 145 185
            Q 140 200, 125 205
            Q 110 200, 105 180
            Q 102 155, 105 130
            Q 110 110, 130 105`,
        side: 'right',
      },
      // Upper back / traps
      {
        d: `M 75 95
            Q 85 85, 100 82
            Q 115 85, 125 95
            Q 130 105, 125 115
            Q 115 125, 100 128
            Q 85 125, 75 115
            Q 70 105, 75 95`,
        side: 'center',
      },
    ],
  },

  // CORE - abs and obliques
  core: {
    id: 'core',
    name: 'Core',
    color: '#8b5cf6', // violet
    glowColor: '#a78bfa',
    view: 'front',
    paths: [
      // Abs - center
      {
        d: `M 88 145
            Q 85 155, 85 175
            Q 85 195, 88 210
            Q 95 218, 100 220
            Q 105 218, 112 210
            Q 115 195, 115 175
            Q 115 155, 112 145
            Q 105 140, 100 140
            Q 95 140, 88 145`,
        side: 'center',
      },
      // Left oblique
      {
        d: `M 70 150
            Q 65 165, 65 185
            Q 65 205, 70 218
            Q 78 225, 85 220
            Q 85 200, 85 180
            Q 85 160, 82 148
            Q 78 145, 70 150`,
        side: 'left',
      },
      // Right oblique
      {
        d: `M 130 150
            Q 135 165, 135 185
            Q 135 205, 130 218
            Q 122 225, 115 220
            Q 115 200, 115 180
            Q 115 160, 118 148
            Q 122 145, 130 150`,
        side: 'right',
      },
    ],
  },

  // LEGS - quads
  quads: {
    id: 'quads',
    name: 'Quads',
    color: '#ec4899', // pink
    glowColor: '#f472b6',
    view: 'front',
    paths: [
      // Left quad
      {
        d: `M 75 225
            Q 65 240, 62 270
            Q 60 300, 62 330
            Q 68 345, 78 348
            Q 88 345, 92 330
            Q 95 300, 93 270
            Q 90 245, 75 225`,
        side: 'left',
      },
      // Right quad
      {
        d: `M 125 225
            Q 135 240, 138 270
            Q 140 300, 138 330
            Q 132 345, 122 348
            Q 112 345, 108 330
            Q 105 300, 107 270
            Q 110 245, 125 225`,
        side: 'right',
      },
    ],
  },

  // LEGS - hamstrings
  hamstrings: {
    id: 'hamstrings',
    name: 'Hamstrings',
    color: '#14b8a6', // teal
    glowColor: '#2dd4bf',
    view: 'back',
    paths: [
      // Left hamstring
      {
        d: `M 75 230
            Q 65 250, 62 280
            Q 60 310, 65 340
            Q 72 355, 80 352
            Q 90 345, 92 320
            Q 94 290, 90 260
            Q 85 240, 75 230`,
        side: 'left',
      },
      // Right hamstring
      {
        d: `M 125 230
            Q 135 250, 138 280
            Q 140 310, 135 340
            Q 128 355, 120 352
            Q 110 345, 108 320
            Q 106 290, 110 260
            Q 115 240, 125 230`,
        side: 'right',
      },
    ],
  },

  // GLUTES
  glutes: {
    id: 'glutes',
    name: 'Glutes',
    color: '#f43f5e', // rose
    glowColor: '#fb7185',
    view: 'back',
    paths: [
      // Left glute
      {
        d: `M 75 210
            Q 60 215, 55 230
            Q 55 250, 65 260
            Q 78 268, 90 260
            Q 98 248, 98 230
            Q 95 215, 75 210`,
        side: 'left',
      },
      // Right glute
      {
        d: `M 125 210
            Q 140 215, 145 230
            Q 145 250, 135 260
            Q 122 268, 110 260
            Q 102 248, 102 230
            Q 105 215, 125 210`,
        side: 'right',
      },
    ],
  },

  // FOREARMS
  forearms: {
    id: 'forearms',
    name: 'Forearms',
    color: '#f59e0b', // amber
    glowColor: '#fbbf24',
    view: 'both',
    paths: [
      // Left forearm front
      {
        d: `M 30 188
            Q 22 200, 20 215
            Q 18 235, 22 250
            Q 28 258, 35 255
            Q 42 248, 43 230
            Q 43 210, 38 195
            Q 35 188, 30 188`,
        side: 'left',
        view: 'front',
      },
      // Right forearm front
      {
        d: `M 170 188
            Q 178 200, 180 215
            Q 182 235, 178 250
            Q 172 258, 165 255
            Q 158 248, 157 230
            Q 157 210, 162 195
            Q 165 188, 170 188`,
        side: 'right',
        view: 'front',
      },
      // Left forearm back
      {
        d: `M 34 193
            Q 26 208, 24 225
            Q 22 245, 26 258
            Q 32 265, 40 262
            Q 48 255, 48 235
            Q 48 215, 42 198
            Q 38 192, 34 193`,
        side: 'left',
        view: 'back',
      },
      // Right forearm back
      {
        d: `M 166 193
            Q 174 208, 176 225
            Q 178 245, 174 258
            Q 168 265, 160 262
            Q 152 255, 152 235
            Q 152 215, 158 198
            Q 162 192, 166 193`,
        side: 'right',
        view: 'back',
      },
    ],
  },

  // ABS - separate from core
  abs: {
    id: 'abs',
    name: 'Abs',
    color: '#8b5cf6', // violet
    glowColor: '#a78bfa',
    view: 'front',
    paths: [
      // Rectus abdominis - center abs
      {
        d: `M 88 145
            Q 85 155, 85 175
            Q 85 195, 88 210
            Q 95 218, 100 220
            Q 105 218, 112 210
            Q 115 195, 115 175
            Q 115 155, 112 145
            Q 105 140, 100 140
            Q 95 140, 88 145`,
        side: 'center',
      },
    ],
  },

  // OBLIQUES - separate from core
  obliques: {
    id: 'obliques',
    name: 'Obliques',
    color: '#7c3aed', // purple
    glowColor: '#8b5cf6',
    view: 'front',
    paths: [
      // Left oblique
      {
        d: `M 70 150
            Q 65 165, 65 185
            Q 65 205, 70 218
            Q 78 225, 85 220
            Q 85 200, 85 180
            Q 85 160, 82 148
            Q 78 145, 70 150`,
        side: 'left',
      },
      // Right oblique
      {
        d: `M 130 150
            Q 135 165, 135 185
            Q 135 205, 130 218
            Q 122 225, 115 220
            Q 115 200, 115 180
            Q 115 160, 118 148
            Q 122 145, 130 150`,
        side: 'right',
      },
    ],
  },

  // CALVES
  calves: {
    id: 'calves',
    name: 'Calves',
    color: '#10b981', // emerald
    glowColor: '#34d399',
    view: 'both',
    paths: [
      // Left calf front
      {
        d: `M 68 352
            Q 62 365, 60 380
            Q 60 395, 65 405
            Q 72 412, 78 408
            Q 85 400, 85 385
            Q 85 368, 80 355
            Q 75 350, 68 352`,
        side: 'left',
        view: 'front',
      },
      // Right calf front
      {
        d: `M 132 352
            Q 138 365, 140 380
            Q 140 395, 135 405
            Q 128 412, 122 408
            Q 115 400, 115 385
            Q 115 368, 120 355
            Q 125 350, 132 352`,
        side: 'right',
        view: 'front',
      },
      // Left calf back (gastrocnemius)
      {
        d: `M 65 352
            Q 55 365, 55 385
            Q 55 402, 62 412
            Q 72 420, 82 415
            Q 90 405, 90 385
            Q 90 365, 82 352
            Q 75 348, 65 352`,
        side: 'left',
        view: 'back',
      },
      // Right calf back (gastrocnemius)
      {
        d: `M 135 352
            Q 145 365, 145 385
            Q 145 402, 138 412
            Q 128 420, 118 415
            Q 110 405, 110 385
            Q 110 365, 118 352
            Q 125 348, 135 352`,
        side: 'right',
        view: 'back',
      },
    ],
  },

  // Combined legs group
  legs: {
    id: 'legs',
    name: 'Legs',
    color: '#ec4899', // pink
    glowColor: '#f472b6',
    view: 'both',
    paths: [
      // Left quad
      {
        d: `M 75 225
            Q 65 240, 62 270
            Q 60 300, 62 330
            Q 68 345, 78 348
            Q 88 345, 92 330
            Q 95 300, 93 270
            Q 90 245, 75 225`,
        side: 'left',
        view: 'front',
      },
      // Right quad
      {
        d: `M 125 225
            Q 135 240, 138 270
            Q 140 300, 138 330
            Q 132 345, 122 348
            Q 112 345, 108 330
            Q 105 300, 107 270
            Q 110 245, 125 225`,
        side: 'right',
        view: 'front',
      },
      // Left hamstring + glute
      {
        d: `M 75 210
            Q 60 215, 55 235
            Q 55 270, 60 300
            Q 65 330, 72 348
            Q 82 355, 90 345
            Q 95 320, 95 280
            Q 95 240, 75 210`,
        side: 'left',
        view: 'back',
      },
      // Right hamstring + glute
      {
        d: `M 125 210
            Q 140 215, 145 235
            Q 145 270, 140 300
            Q 135 330, 128 348
            Q 118 355, 110 345
            Q 105 320, 105 280
            Q 105 240, 125 210`,
        side: 'right',
        view: 'back',
      },
    ],
  },
};

// Default highlight sequence for autoplay
export const DEFAULT_HIGHLIGHT_SEQUENCE = [
  'chest',
  'shoulders',
  'arms',
  'core',
  'back',
  'legs',
];

// Glow filter definitions for SVG
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
`;

// ViewBox for the SVG
export const VIEWBOX = '0 0 200 420';

// Get all muscles for a specific view
export function getMusclesForView(view = 'front') {
  return Object.values(MUSCLE_PATHS).filter(muscle => {
    if (muscle.view === 'both') return true;
    return muscle.view === view;
  });
}

// Get paths for a muscle filtered by view
export function getMusclePathsForView(muscle, view = 'front') {
  if (!muscle || !muscle.paths) return [];

  return muscle.paths.filter(path => {
    // If path has no view specified, use the muscle's default view
    if (!path.view) {
      return muscle.view === view || muscle.view === 'both';
    }
    return path.view === view;
  });
}
