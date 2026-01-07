/**
 * MuscleMap SVG Anatomical Visualization
 * 
 * A 2D SVG-based body visualization that can display muscle activation levels.
 * This serves as a performant placeholder until 3D models are integrated.
 * 
 * Features:
 * - Front and back views
 * - Color-coded activation levels (5-tier system)
 * - Responsive sizing
 * - Touch/click interaction for muscle details
 */

import React, { useState, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

interface MuscleActivation {
  muscleId: string;
  displayedActivation: number; // 0-100
}

interface AnatomyViewerProps {
  activations: MuscleActivation[];
  view: 'front' | 'back';
  width?: number;
  height?: number;
  onMuscleClick?: (muscleId: string) => void;
}

// ============================================
// COLOR SYSTEM
// ============================================

function getActivationColor(activation: number): string {
  if (activation === 0) return '#2a2a2a';      // Dark gray - untrained
  if (activation < 25) return '#3b82f6';       // Blue - light activation
  if (activation < 50) return '#22c55e';       // Green - moderate
  if (activation < 75) return '#eab308';       // Yellow - good
  if (activation < 100) return '#f97316';      // Orange - high
  return '#ef4444';                             // Red - maximum
}

function getActivationGlow(activation: number): string {
  if (activation < 25) return 'none';
  const intensity = Math.min(20, activation / 5);
  return `drop-shadow(0 0 ${intensity}px ${getActivationColor(activation)})`;
}

// ============================================
// MUSCLE PATH DATA - FRONT VIEW
// ============================================

const frontMusclePaths: Record<string, { path: string; muscleIds: string[]; label: string }> = {
  // CHEST
  chestLeft: {
    path: 'M 85 95 Q 70 100 65 120 Q 65 140 80 150 Q 95 145 100 130 Q 100 110 85 95',
    muscleIds: ['CH-001', 'CH-002', 'CH-003'],
    label: 'Chest (L)'
  },
  chestRight: {
    path: 'M 115 95 Q 130 100 135 120 Q 135 140 120 150 Q 105 145 100 130 Q 100 110 115 95',
    muscleIds: ['CH-001', 'CH-002', 'CH-003'],
    label: 'Chest (R)'
  },
  
  // SHOULDERS
  deltLeft: {
    path: 'M 60 90 Q 50 95 48 110 Q 50 125 60 130 Q 70 120 70 105 Q 68 92 60 90',
    muscleIds: ['SH-001', 'SH-002', 'SH-003', 'SH-004'],
    label: 'Shoulder (L)'
  },
  deltRight: {
    path: 'M 140 90 Q 150 95 152 110 Q 150 125 140 130 Q 130 120 130 105 Q 132 92 140 90',
    muscleIds: ['SH-001', 'SH-002', 'SH-003', 'SH-004'],
    label: 'Shoulder (R)'
  },
  
  // BICEPS
  bicepLeft: {
    path: 'M 55 135 Q 48 145 48 165 Q 50 180 58 185 Q 65 180 65 160 Q 62 142 55 135',
    muscleIds: ['AR-001', 'AR-002', 'AR-003', 'AR-004'],
    label: 'Bicep (L)'
  },
  bicepRight: {
    path: 'M 145 135 Q 152 145 152 165 Q 150 180 142 185 Q 135 180 135 160 Q 138 142 145 135',
    muscleIds: ['AR-001', 'AR-002', 'AR-003', 'AR-004'],
    label: 'Bicep (R)'
  },
  
  // FOREARMS
  forearmLeft: {
    path: 'M 50 190 Q 45 210 45 235 Q 48 250 55 252 Q 62 248 62 230 Q 60 205 55 190 Z',
    muscleIds: ['AR-007', 'AR-008', 'AR-011', 'AR-012', 'AR-015', 'AR-016'],
    label: 'Forearm (L)'
  },
  forearmRight: {
    path: 'M 150 190 Q 155 210 155 235 Q 152 250 145 252 Q 138 248 138 230 Q 140 205 145 190 Z',
    muscleIds: ['AR-007', 'AR-008', 'AR-011', 'AR-012', 'AR-015', 'AR-016'],
    label: 'Forearm (R)'
  },
  
  // ABS
  absUpper: {
    path: 'M 88 155 L 112 155 L 112 175 L 88 175 Z',
    muscleIds: ['CA-001'],
    label: 'Upper Abs'
  },
  absMid: {
    path: 'M 88 178 L 112 178 L 112 198 L 88 198 Z',
    muscleIds: ['CA-001', 'CA-002'],
    label: 'Mid Abs'
  },
  absLower: {
    path: 'M 88 201 L 112 201 L 112 225 L 88 225 Z',
    muscleIds: ['CA-002'],
    label: 'Lower Abs'
  },
  
  // OBLIQUES
  obliqueLeft: {
    path: 'M 70 160 Q 65 180 68 210 Q 75 220 82 215 Q 85 190 82 165 Q 78 158 70 160',
    muscleIds: ['CA-003', 'CA-005'],
    label: 'Oblique (L)'
  },
  obliqueRight: {
    path: 'M 130 160 Q 135 180 132 210 Q 125 220 118 215 Q 115 190 118 165 Q 122 158 130 160',
    muscleIds: ['CA-004', 'CA-006'],
    label: 'Oblique (R)'
  },
  
  // QUADS
  quadLeft: {
    path: 'M 75 235 Q 68 260 68 300 Q 70 340 78 355 Q 90 360 95 340 Q 95 300 92 260 Q 88 238 75 235',
    muscleIds: ['LA-001', 'LA-003', 'LA-005', 'LA-007'],
    label: 'Quad (L)'
  },
  quadRight: {
    path: 'M 125 235 Q 132 260 132 300 Q 130 340 122 355 Q 110 360 105 340 Q 105 300 108 260 Q 112 238 125 235',
    muscleIds: ['LA-002', 'LA-004', 'LA-006', 'LA-008'],
    label: 'Quad (R)'
  },
  
  // ADDUCTORS
  adductorLeft: {
    path: 'M 88 240 Q 85 270 88 310 Q 92 300 95 270 Q 93 245 88 240',
    muscleIds: ['LA-011', 'LA-013', 'LA-015'],
    label: 'Adductor (L)'
  },
  adductorRight: {
    path: 'M 112 240 Q 115 270 112 310 Q 108 300 105 270 Q 107 245 112 240',
    muscleIds: ['LA-012', 'LA-014', 'LA-016'],
    label: 'Adductor (R)'
  },
  
  // CALVES (front view - tibialis)
  tibLeft: {
    path: 'M 72 365 Q 70 390 72 420 Q 78 425 82 420 Q 84 390 80 365 Z',
    muscleIds: ['LP-015'],
    label: 'Shin (L)'
  },
  tibRight: {
    path: 'M 128 365 Q 130 390 128 420 Q 122 425 118 420 Q 116 390 120 365 Z',
    muscleIds: ['LP-016'],
    label: 'Shin (R)'
  },
};

// ============================================
// MUSCLE PATH DATA - BACK VIEW
// ============================================

const backMusclePaths: Record<string, { path: string; muscleIds: string[]; label: string }> = {
  // TRAPS
  trapUpper: {
    path: 'M 85 75 Q 100 65 115 75 Q 115 90 100 95 Q 85 90 85 75',
    muscleIds: ['SH-007'],
    label: 'Upper Traps'
  },
  trapMid: {
    path: 'M 80 95 Q 100 100 120 95 Q 125 115 100 125 Q 75 115 80 95',
    muscleIds: ['SH-008'],
    label: 'Mid Traps'
  },
  
  // REAR DELTS
  rearDeltLeft: {
    path: 'M 62 92 Q 52 98 50 115 Q 55 125 65 120 Q 70 108 68 95 Q 65 90 62 92',
    muscleIds: ['SH-005'],
    label: 'Rear Delt (L)'
  },
  rearDeltRight: {
    path: 'M 138 92 Q 148 98 150 115 Q 145 125 135 120 Q 130 108 132 95 Q 135 90 138 92',
    muscleIds: ['SH-006'],
    label: 'Rear Delt (R)'
  },
  
  // LATS
  latLeft: {
    path: 'M 68 125 Q 60 145 65 180 Q 75 195 85 185 Q 88 155 85 130 Q 78 122 68 125',
    muscleIds: ['BA-001'],
    label: 'Lat (L)'
  },
  latRight: {
    path: 'M 132 125 Q 140 145 135 180 Q 125 195 115 185 Q 112 155 115 130 Q 122 122 132 125',
    muscleIds: ['BA-002'],
    label: 'Lat (R)'
  },
  
  // RHOMBOIDS
  rhomboidLeft: {
    path: 'M 80 100 Q 75 115 78 135 Q 88 140 92 130 Q 92 115 88 102 Q 85 98 80 100',
    muscleIds: ['SH-012', 'SH-014'],
    label: 'Rhomboid (L)'
  },
  rhomboidRight: {
    path: 'M 120 100 Q 125 115 122 135 Q 112 140 108 130 Q 108 115 112 102 Q 115 98 120 100',
    muscleIds: ['SH-013', 'SH-015'],
    label: 'Rhomboid (R)'
  },
  
  // TRICEPS
  tricepLeft: {
    path: 'M 52 130 Q 45 145 45 170 Q 50 185 58 180 Q 62 160 60 140 Q 58 132 52 130',
    muscleIds: ['AP-001', 'AP-003', 'AP-005'],
    label: 'Tricep (L)'
  },
  tricepRight: {
    path: 'M 148 130 Q 155 145 155 170 Q 150 185 142 180 Q 138 160 140 140 Q 142 132 148 130',
    muscleIds: ['AP-002', 'AP-004', 'AP-006'],
    label: 'Tricep (R)'
  },
  
  // LOWER BACK
  erectorLeft: {
    path: 'M 88 145 Q 82 170 85 210 Q 92 220 98 210 Q 98 175 95 150 Q 92 143 88 145',
    muscleIds: ['BA-003', 'BA-005', 'BA-007'],
    label: 'Erector (L)'
  },
  erectorRight: {
    path: 'M 112 145 Q 118 170 115 210 Q 108 220 102 210 Q 102 175 105 150 Q 108 143 112 145',
    muscleIds: ['BA-004', 'BA-006', 'BA-008'],
    label: 'Erector (R)'
  },
  
  // GLUTES
  gluteLeft: {
    path: 'M 70 220 Q 62 240 65 270 Q 78 285 95 275 Q 100 250 95 230 Q 85 218 70 220',
    muscleIds: ['HG-001', 'HG-003', 'HG-005'],
    label: 'Glute (L)'
  },
  gluteRight: {
    path: 'M 130 220 Q 138 240 135 270 Q 122 285 105 275 Q 100 250 105 230 Q 115 218 130 220',
    muscleIds: ['HG-002', 'HG-004', 'HG-006'],
    label: 'Glute (R)'
  },
  
  // HAMSTRINGS
  hamstringLeft: {
    path: 'M 70 280 Q 65 310 68 350 Q 78 365 88 355 Q 92 320 88 285 Q 82 275 70 280',
    muscleIds: ['LP-001', 'LP-003', 'LP-005', 'LP-007'],
    label: 'Hamstring (L)'
  },
  hamstringRight: {
    path: 'M 130 280 Q 135 310 132 350 Q 122 365 112 355 Q 108 320 112 285 Q 118 275 130 280',
    muscleIds: ['LP-002', 'LP-004', 'LP-006', 'LP-008'],
    label: 'Hamstring (R)'
  },
  
  // CALVES
  calfLeft: {
    path: 'M 68 360 Q 62 390 65 425 Q 75 435 85 425 Q 88 395 82 365 Q 78 358 68 360',
    muscleIds: ['LP-009', 'LP-011', 'LP-013'],
    label: 'Calf (L)'
  },
  calfRight: {
    path: 'M 132 360 Q 138 390 135 425 Q 125 435 115 425 Q 112 395 118 365 Q 122 358 132 360',
    muscleIds: ['LP-010', 'LP-012', 'LP-014'],
    label: 'Calf (R)'
  },
};

// ============================================
// COMPONENT
// ============================================

export const AnatomyViewer: React.FC<AnatomyViewerProps> = ({
  activations,
  view,
  width = 200,
  height = 480,
  onMuscleClick
}) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  
  const musclePaths = view === 'front' ? frontMusclePaths : backMusclePaths;
  
  // Create a lookup for muscle activations
  const activationLookup = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const act of activations) {
      lookup.set(act.muscleId, act.displayedActivation);
    }
    return lookup;
  }, [activations]);
  
  // Calculate group activation (average of all muscle IDs in the group)
  const getGroupActivation = (muscleIds: string[]): number => {
    let total = 0;
    let count = 0;
    for (const id of muscleIds) {
      const activation = activationLookup.get(id);
      if (activation !== undefined) {
        total += activation;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  };
  
  return (
    <svg 
      viewBox="0 0 200 480" 
      width={width} 
      height={height}
      style={{ backgroundColor: '#111' }}
    >
      {/* Body outline */}
      <ellipse cx="100" cy="45" rx="28" ry="35" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      <path 
        d="M 72 75 Q 50 85 45 130 Q 40 180 45 230 Q 48 250 50 255
           M 128 75 Q 150 85 155 130 Q 160 180 155 230 Q 152 250 150 255"
        fill="none" stroke="#333" strokeWidth="1"
      />
      <path
        d="M 75 230 Q 65 280 68 360 Q 70 420 75 450
           M 125 230 Q 135 280 132 360 Q 130 420 125 450"
        fill="none" stroke="#333" strokeWidth="1"
      />
      
      {/* Muscle groups */}
      {Object.entries(musclePaths).map(([key, { path, muscleIds, label }]) => {
        const activation = getGroupActivation(muscleIds);
        const color = getActivationColor(activation);
        const isHovered = hoveredMuscle === key;
        
        return (
          <g key={key}>
            <path
              d={path}
              fill={color}
              stroke={isHovered ? '#fff' : '#444'}
              strokeWidth={isHovered ? 2 : 1}
              opacity={isHovered ? 1 : 0.9}
              style={{
                cursor: 'pointer',
                filter: getActivationGlow(activation),
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={() => setHoveredMuscle(key)}
              onMouseLeave={() => setHoveredMuscle(null)}
              onClick={() => onMuscleClick?.(muscleIds[0])}
            />
          </g>
        );
      })}
      
      {/* Tooltip */}
      {hoveredMuscle && (
        <g>
          <rect
            x="10"
            y="5"
            width="180"
            height="24"
            rx="4"
            fill="rgba(0,0,0,0.8)"
          />
          <text
            x="100"
            y="22"
            textAnchor="middle"
            fill="white"
            fontSize="12"
            fontFamily="system-ui"
          >
            {musclePaths[hoveredMuscle]?.label}: {Math.round(getGroupActivation(musclePaths[hoveredMuscle]?.muscleIds || []))}%
          </text>
        </g>
      )}
      
      {/* View label */}
      <text
        x="100"
        y="470"
        textAnchor="middle"
        fill="#666"
        fontSize="11"
        fontFamily="system-ui"
      >
        {view === 'front' ? 'FRONT' : 'BACK'}
      </text>
    </svg>
  );
};

// ============================================
// DUAL VIEW COMPONENT
// ============================================

interface DualAnatomyViewerProps {
  activations: MuscleActivation[];
  width?: number;
  height?: number;
  onMuscleClick?: (muscleId: string) => void;
}

export const DualAnatomyViewer: React.FC<DualAnatomyViewerProps> = ({
  activations,
  width = 400,
  height = 480,
  onMuscleClick
}) => {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <AnatomyViewer
        activations={activations}
        view="front"
        width={width / 2 - 4}
        height={height}
        onMuscleClick={onMuscleClick}
      />
      <AnatomyViewer
        activations={activations}
        view="back"
        width={width / 2 - 4}
        height={height}
        onMuscleClick={onMuscleClick}
      />
    </div>
  );
};

export default DualAnatomyViewer;
