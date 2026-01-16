/**
 * MuscleMapD3 - Hyper-realistic Interactive Muscle Visualization
 *
 * A stunning anatomical visualization featuring:
 * - Detailed SVG muscle paths
 * - Heat map activation coloring
 * - Smooth animations and transitions
 * - Interactive hover/click effects
 * - Pulsing glow for active muscles
 * - Front/back view toggle
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../core/D3Container';
import {
  createLinearGradient,
  createMuscleActivationScale,
} from '../core/gradients';
import { easings } from '../core/animations';

// ============================================
// TYPES
// ============================================

export interface MuscleActivation {
  muscleId: string;
  name: string;
  activation: number; // 0-1
  isPrimary?: boolean;
}

export interface MuscleMapD3Props {
  activations?: MuscleActivation[];
  onMuscleClick?: (muscle: MuscleData) => void;
  onMuscleHover?: (muscle: MuscleData | null) => void;
  view?: 'front' | 'back';
  showLabels?: boolean;
  interactive?: boolean;
  animated?: boolean;
  height?: number;
  className?: string;
}

interface MuscleData {
  id: string;
  name: string;
  group: string;
  path: string;
  labelPosition: { x: number; y: number };
  activation: number;
  isPrimary: boolean;
}

// ============================================
// MUSCLE PATH DATA
// ============================================

// Anatomically accurate muscle paths (simplified for SVG)
const MUSCLE_PATHS: Record<'front' | 'back', Record<string, Omit<MuscleData, 'activation' | 'isPrimary'>>> = {
  front: {
    // Head and neck
    'sternocleidomastoid-left': {
      id: 'sternocleidomastoid-left',
      name: 'Sternocleidomastoid',
      group: 'neck',
      path: 'M 145 90 Q 140 100 138 115 Q 136 130 140 140 L 145 138 Q 147 125 148 110 Q 149 95 145 90 Z',
      labelPosition: { x: 130, y: 115 },
    },
    'sternocleidomastoid-right': {
      id: 'sternocleidomastoid-right',
      name: 'Sternocleidomastoid',
      group: 'neck',
      path: 'M 155 90 Q 160 100 162 115 Q 164 130 160 140 L 155 138 Q 153 125 152 110 Q 151 95 155 90 Z',
      labelPosition: { x: 170, y: 115 },
    },

    // Shoulders
    'deltoid-anterior-left': {
      id: 'deltoid-anterior-left',
      name: 'Deltoid (Anterior)',
      group: 'shoulders',
      path: 'M 108 145 Q 95 150 88 165 Q 82 180 85 195 L 100 190 Q 105 175 108 160 Q 112 150 108 145 Z',
      labelPosition: { x: 85, y: 170 },
    },
    'deltoid-anterior-right': {
      id: 'deltoid-anterior-right',
      name: 'Deltoid (Anterior)',
      group: 'shoulders',
      path: 'M 192 145 Q 205 150 212 165 Q 218 180 215 195 L 200 190 Q 195 175 192 160 Q 188 150 192 145 Z',
      labelPosition: { x: 215, y: 170 },
    },

    // Chest
    'pectoralis-major-left': {
      id: 'pectoralis-major-left',
      name: 'Pectoralis Major',
      group: 'chest',
      path: 'M 110 150 Q 125 148 145 150 Q 148 165 148 185 Q 145 200 130 205 Q 105 200 100 185 Q 98 170 110 150 Z',
      labelPosition: { x: 120, y: 175 },
    },
    'pectoralis-major-right': {
      id: 'pectoralis-major-right',
      name: 'Pectoralis Major',
      group: 'chest',
      path: 'M 190 150 Q 175 148 155 150 Q 152 165 152 185 Q 155 200 170 205 Q 195 200 200 185 Q 202 170 190 150 Z',
      labelPosition: { x: 180, y: 175 },
    },

    // Arms
    'biceps-brachii-left': {
      id: 'biceps-brachii-left',
      name: 'Biceps Brachii',
      group: 'arms',
      path: 'M 85 200 Q 78 210 75 230 Q 73 250 76 270 Q 80 280 88 280 Q 95 275 95 260 Q 94 240 92 220 Q 90 205 85 200 Z',
      labelPosition: { x: 70, y: 240 },
    },
    'biceps-brachii-right': {
      id: 'biceps-brachii-right',
      name: 'Biceps Brachii',
      group: 'arms',
      path: 'M 215 200 Q 222 210 225 230 Q 227 250 224 270 Q 220 280 212 280 Q 205 275 205 260 Q 206 240 208 220 Q 210 205 215 200 Z',
      labelPosition: { x: 230, y: 240 },
    },

    // Forearms
    'brachioradialis-left': {
      id: 'brachioradialis-left',
      name: 'Brachioradialis',
      group: 'forearms',
      path: 'M 76 280 Q 70 295 68 320 Q 67 345 70 360 L 80 358 Q 82 340 82 315 Q 82 295 76 280 Z',
      labelPosition: { x: 55, y: 320 },
    },
    'brachioradialis-right': {
      id: 'brachioradialis-right',
      name: 'Brachioradialis',
      group: 'forearms',
      path: 'M 224 280 Q 230 295 232 320 Q 233 345 230 360 L 220 358 Q 218 340 218 315 Q 218 295 224 280 Z',
      labelPosition: { x: 245, y: 320 },
    },

    // Core
    'rectus-abdominis': {
      id: 'rectus-abdominis',
      name: 'Rectus Abdominis',
      group: 'core',
      path: 'M 135 210 Q 145 208 155 208 Q 165 210 165 210 L 168 280 Q 165 320 160 340 L 155 340 L 150 340 L 145 340 L 140 340 Q 135 320 132 280 L 135 210 Z',
      labelPosition: { x: 150, y: 275 },
    },
    'external-oblique-left': {
      id: 'external-oblique-left',
      name: 'External Oblique',
      group: 'core',
      path: 'M 100 210 Q 108 220 118 230 Q 125 250 128 280 L 132 280 Q 128 250 122 220 Q 115 200 100 195 Z',
      labelPosition: { x: 100, y: 245 },
    },
    'external-oblique-right': {
      id: 'external-oblique-right',
      name: 'External Oblique',
      group: 'core',
      path: 'M 200 210 Q 192 220 182 230 Q 175 250 172 280 L 168 280 Q 172 250 178 220 Q 185 200 200 195 Z',
      labelPosition: { x: 200, y: 245 },
    },

    // Legs
    'quadriceps-left': {
      id: 'quadriceps-left',
      name: 'Quadriceps',
      group: 'legs',
      path: 'M 118 350 Q 108 380 105 420 Q 103 460 108 490 Q 115 500 125 500 Q 135 495 140 480 Q 142 440 138 400 Q 134 370 130 350 Z',
      labelPosition: { x: 100, y: 420 },
    },
    'quadriceps-right': {
      id: 'quadriceps-right',
      name: 'Quadriceps',
      group: 'legs',
      path: 'M 182 350 Q 192 380 195 420 Q 197 460 192 490 Q 185 500 175 500 Q 165 495 160 480 Q 158 440 162 400 Q 166 370 170 350 Z',
      labelPosition: { x: 200, y: 420 },
    },
    'adductors-left': {
      id: 'adductors-left',
      name: 'Adductors',
      group: 'legs',
      path: 'M 130 355 Q 138 370 142 400 Q 145 430 142 460 L 135 455 Q 132 425 132 395 Q 132 370 130 355 Z',
      labelPosition: { x: 138, y: 410 },
    },
    'adductors-right': {
      id: 'adductors-right',
      name: 'Adductors',
      group: 'legs',
      path: 'M 170 355 Q 162 370 158 400 Q 155 430 158 460 L 165 455 Q 168 425 168 395 Q 168 370 170 355 Z',
      labelPosition: { x: 162, y: 410 },
    },

    // Lower legs
    'tibialis-anterior-left': {
      id: 'tibialis-anterior-left',
      name: 'Tibialis Anterior',
      group: 'calves',
      path: 'M 112 510 Q 108 540 108 580 Q 109 620 115 650 L 125 648 Q 125 615 124 580 Q 123 545 118 510 Z',
      labelPosition: { x: 95, y: 580 },
    },
    'tibialis-anterior-right': {
      id: 'tibialis-anterior-right',
      name: 'Tibialis Anterior',
      group: 'calves',
      path: 'M 188 510 Q 192 540 192 580 Q 191 620 185 650 L 175 648 Q 175 615 176 580 Q 177 545 182 510 Z',
      labelPosition: { x: 205, y: 580 },
    },
  },

  back: {
    // Neck
    'trapezius-upper': {
      id: 'trapezius-upper',
      name: 'Trapezius (Upper)',
      group: 'back',
      path: 'M 150 95 Q 130 100 115 115 Q 108 130 112 145 L 150 140 L 188 145 Q 192 130 185 115 Q 170 100 150 95 Z',
      labelPosition: { x: 150, y: 120 },
    },

    // Shoulders
    'deltoid-posterior-left': {
      id: 'deltoid-posterior-left',
      name: 'Deltoid (Posterior)',
      group: 'shoulders',
      path: 'M 112 145 Q 98 155 90 175 Q 85 195 90 210 L 105 205 Q 110 185 112 165 Q 115 150 112 145 Z',
      labelPosition: { x: 85, y: 178 },
    },
    'deltoid-posterior-right': {
      id: 'deltoid-posterior-right',
      name: 'Deltoid (Posterior)',
      group: 'shoulders',
      path: 'M 188 145 Q 202 155 210 175 Q 215 195 210 210 L 195 205 Q 190 185 188 165 Q 185 150 188 145 Z',
      labelPosition: { x: 215, y: 178 },
    },

    // Back
    'trapezius-middle': {
      id: 'trapezius-middle',
      name: 'Trapezius (Middle)',
      group: 'back',
      path: 'M 120 150 Q 135 155 150 155 Q 165 155 180 150 L 182 175 Q 165 180 150 180 Q 135 180 118 175 Z',
      labelPosition: { x: 150, y: 165 },
    },
    'latissimus-dorsi-left': {
      id: 'latissimus-dorsi-left',
      name: 'Latissimus Dorsi',
      group: 'back',
      path: 'M 105 180 Q 95 200 92 230 Q 90 260 95 290 Q 105 310 120 320 Q 130 310 135 290 Q 140 260 138 230 Q 135 200 130 175 Q 118 178 105 180 Z',
      labelPosition: { x: 100, y: 250 },
    },
    'latissimus-dorsi-right': {
      id: 'latissimus-dorsi-right',
      name: 'Latissimus Dorsi',
      group: 'back',
      path: 'M 195 180 Q 205 200 208 230 Q 210 260 205 290 Q 195 310 180 320 Q 170 310 165 290 Q 160 260 162 230 Q 165 200 170 175 Q 182 178 195 180 Z',
      labelPosition: { x: 200, y: 250 },
    },
    'erector-spinae': {
      id: 'erector-spinae',
      name: 'Erector Spinae',
      group: 'back',
      path: 'M 140 180 Q 145 175 150 175 Q 155 175 160 180 L 162 290 Q 158 320 155 340 L 150 345 L 145 340 Q 142 320 138 290 Z',
      labelPosition: { x: 150, y: 260 },
    },

    // Arms
    'triceps-brachii-left': {
      id: 'triceps-brachii-left',
      name: 'Triceps Brachii',
      group: 'arms',
      path: 'M 90 210 Q 82 225 78 250 Q 76 275 80 295 Q 88 305 96 300 Q 102 285 102 260 Q 100 235 95 215 Q 92 210 90 210 Z',
      labelPosition: { x: 70, y: 255 },
    },
    'triceps-brachii-right': {
      id: 'triceps-brachii-right',
      name: 'Triceps Brachii',
      group: 'arms',
      path: 'M 210 210 Q 218 225 222 250 Q 224 275 220 295 Q 212 305 204 300 Q 198 285 198 260 Q 200 235 205 215 Q 208 210 210 210 Z',
      labelPosition: { x: 230, y: 255 },
    },

    // Glutes
    'gluteus-maximus-left': {
      id: 'gluteus-maximus-left',
      name: 'Gluteus Maximus',
      group: 'glutes',
      path: 'M 115 330 Q 100 340 95 365 Q 92 390 100 410 Q 115 420 130 415 Q 145 405 148 380 Q 150 355 145 335 Q 135 325 115 330 Z',
      labelPosition: { x: 110, y: 375 },
    },
    'gluteus-maximus-right': {
      id: 'gluteus-maximus-right',
      name: 'Gluteus Maximus',
      group: 'glutes',
      path: 'M 185 330 Q 200 340 205 365 Q 208 390 200 410 Q 185 420 170 415 Q 155 405 152 380 Q 150 355 155 335 Q 165 325 185 330 Z',
      labelPosition: { x: 190, y: 375 },
    },

    // Legs
    'hamstrings-left': {
      id: 'hamstrings-left',
      name: 'Hamstrings',
      group: 'legs',
      path: 'M 105 420 Q 100 450 100 490 Q 102 530 110 560 Q 120 570 130 565 Q 140 550 140 510 Q 138 470 132 430 Q 125 415 105 420 Z',
      labelPosition: { x: 95, y: 490 },
    },
    'hamstrings-right': {
      id: 'hamstrings-right',
      name: 'Hamstrings',
      group: 'legs',
      path: 'M 195 420 Q 200 450 200 490 Q 198 530 190 560 Q 180 570 170 565 Q 160 550 160 510 Q 162 470 168 430 Q 175 415 195 420 Z',
      labelPosition: { x: 205, y: 490 },
    },

    // Calves
    'gastrocnemius-left': {
      id: 'gastrocnemius-left',
      name: 'Gastrocnemius',
      group: 'calves',
      path: 'M 110 570 Q 105 590 105 620 Q 106 650 115 680 Q 122 690 130 685 Q 138 670 138 640 Q 136 605 128 575 Q 120 565 110 570 Z',
      labelPosition: { x: 95, y: 625 },
    },
    'gastrocnemius-right': {
      id: 'gastrocnemius-right',
      name: 'Gastrocnemius',
      group: 'calves',
      path: 'M 190 570 Q 195 590 195 620 Q 194 650 185 680 Q 178 690 170 685 Q 162 670 162 640 Q 164 605 172 575 Q 180 565 190 570 Z',
      labelPosition: { x: 205, y: 625 },
    },
  },
};

// Muscle group colors
const MUSCLE_GROUP_COLORS: Record<string, string> = {
  neck: '#9333ea',
  shoulders: '#f59e0b',
  chest: '#ef4444',
  arms: '#3b82f6',
  forearms: '#22c55e',
  core: '#ec4899',
  back: '#8b5cf6',
  glutes: '#f97316',
  legs: '#06b6d4',
  calves: '#14b8a6',
};

// ============================================
// COMPONENT
// ============================================

export function MuscleMapD3({
  activations = [],
  onMuscleClick,
  onMuscleHover,
  view = 'front',
  showLabels = false,
  interactive = true,
  animated = true,
  height = 700,
  className = '',
}: MuscleMapD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  // Create activation map
  const activationMap = useMemo(() => {
    const map: Record<string, { activation: number; isPrimary: boolean }> = {};
    activations.forEach((a) => {
      map[a.muscleId] = { activation: a.activation, isPrimary: a.isPrimary || false };
    });
    return map;
  }, [activations]);

  // Get muscle data for current view
  const muscleData = useMemo((): MuscleData[] => {
    const paths = MUSCLE_PATHS[view];
    return Object.values(paths).map((muscle) => ({
      ...muscle,
      activation: activationMap[muscle.id]?.activation || 0,
      isPrimary: activationMap[muscle.id]?.isPrimary || false,
    }));
  }, [view, activationMap]);

  // Color scale
  const colorScale = useMemo(() => createMuscleActivationScale(), []);

  // Handle muscle interaction
  const handleMuscleInteraction = useCallback(
    (muscle: MuscleData, type: 'hover' | 'click') => {
      if (!interactive) return;

      if (type === 'hover') {
        setHoveredMuscle(muscle.id);
        onMuscleHover?.(muscle);
      } else {
        onMuscleClick?.(muscle);
      }
    },
    [interactive, onMuscleClick, onMuscleHover]
  );

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 300;
    const svgHeight = height;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set viewBox
    svg
      .attr('viewBox', `0 0 ${width} ${svgHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Create defs for gradients and filters
    const defs = svg.append('defs');

    // Create glow filters for each activation level
    [0.25, 0.5, 0.75, 1].forEach((level) => {
      const filter = defs
        .append('filter')
        .attr('id', `muscle-glow-${level * 100}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      filter
        .append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', 3 + level * 5)
        .attr('result', 'blur');

      const merge = filter.append('feMerge');
      for (let i = 0; i < Math.ceil(level * 3); i++) {
        merge.append('feMergeNode').attr('in', 'blur');
      }
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Body outline gradient
    createLinearGradient(svg, {
      id: 'body-outline-gradient',
      y1: '0%',
      y2: '100%',
      stops: [
        { offset: '0%', color: '#475569', opacity: 0.6 },
        { offset: '100%', color: '#1e293b', opacity: 0.4 },
      ],
    });

    // Background
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', svgHeight)
      .attr('fill', 'transparent');

    // Body outline (simplified silhouette)
    const bodyOutline = view === 'front'
      ? 'M 150 30 Q 130 35 125 55 Q 120 70 125 85 Q 130 95 140 100 L 140 105 Q 115 115 105 140 Q 85 145 78 165 Q 68 195 70 230 Q 72 280 75 320 Q 78 365 85 400 L 95 400 Q 100 360 102 320 Q 105 345 100 360 L 110 365 Q 120 345 115 320 Q 112 290 112 260 Q 115 320 115 350 Q 95 355 90 400 Q 88 460 95 510 Q 98 560 95 620 Q 92 680 105 720 L 120 720 Q 128 680 125 630 Q 122 580 125 530 Q 130 480 135 440 L 140 360 L 145 360 L 150 440 L 155 360 L 160 360 L 165 440 Q 170 480 175 530 Q 178 580 175 630 Q 172 680 180 720 L 195 720 Q 208 680 205 620 Q 202 560 205 510 Q 212 460 210 400 Q 205 355 185 350 Q 185 320 188 260 Q 188 290 185 320 Q 180 345 190 365 L 200 360 Q 195 345 198 320 Q 200 360 205 400 L 215 400 Q 222 365 225 320 Q 228 280 230 230 Q 232 195 222 165 Q 215 145 195 140 Q 185 115 160 105 L 160 100 Q 170 95 175 85 Q 180 70 175 55 Q 170 35 150 30 Z'
      : 'M 150 30 Q 130 35 125 55 Q 120 70 125 85 Q 130 95 140 100 L 140 105 Q 115 115 105 140 Q 85 145 78 165 Q 68 195 70 230 Q 72 280 75 320 Q 78 365 85 400 L 95 400 Q 100 360 102 320 Q 105 345 100 360 L 110 365 Q 120 345 115 320 Q 112 290 112 260 Q 115 320 115 350 Q 95 355 90 400 Q 88 460 95 510 Q 98 560 95 620 Q 92 680 105 720 L 120 720 Q 128 680 125 630 Q 122 580 125 530 Q 130 480 135 440 L 140 360 L 145 360 L 150 440 L 155 360 L 160 360 L 165 440 Q 170 480 175 530 Q 178 580 175 630 Q 172 680 180 720 L 195 720 Q 208 680 205 620 Q 202 560 205 510 Q 212 460 210 400 Q 205 355 185 350 Q 185 320 188 260 Q 188 290 185 320 Q 180 345 190 365 L 200 360 Q 195 345 198 320 Q 200 360 205 400 L 215 400 Q 222 365 225 320 Q 228 280 230 230 Q 232 195 222 165 Q 215 145 195 140 Q 185 115 160 105 L 160 100 Q 170 95 175 85 Q 180 70 175 55 Q 170 35 150 30 Z';

    svg
      .append('path')
      .attr('d', bodyOutline)
      .attr('fill', 'url(#body-outline-gradient)')
      .attr('stroke', 'rgba(100, 116, 139, 0.3)')
      .attr('stroke-width', 1);

    // Muscle group
    const muscleGroup = svg.append('g').attr('class', 'muscles');

    // Render muscles
    const muscles = muscleGroup
      .selectAll<SVGPathElement, MuscleData>('path.muscle')
      .data(muscleData)
      .enter()
      .append('path')
      .attr('class', 'muscle')
      .attr('d', (d) => d.path)
      .attr('fill', (d) => {
        if (d.activation > 0) {
          return colorScale(d.activation);
        }
        return MUSCLE_GROUP_COLORS[d.group] || '#4b5563';
      })
      .attr('fill-opacity', (d) => (d.activation > 0 ? 0.7 + d.activation * 0.3 : 0.3))
      .attr('stroke', (d) => {
        if (d.activation > 0) {
          return colorScale(d.activation);
        }
        return MUSCLE_GROUP_COLORS[d.group] || '#6b7280';
      })
      .attr('stroke-width', (d) => (d.isPrimary ? 2 : 1))
      .attr('stroke-opacity', 0.8)
      .style('cursor', interactive ? 'pointer' : 'default')
      .style('filter', (d) => {
        if (d.activation > 0.75) return 'url(#muscle-glow-100)';
        if (d.activation > 0.5) return 'url(#muscle-glow-75)';
        if (d.activation > 0.25) return 'url(#muscle-glow-50)';
        if (d.activation > 0) return 'url(#muscle-glow-25)';
        return 'none';
      });

    // Animate entrance
    if (animated) {
      muscles
        .attr('opacity', 0)
        .attr('transform', 'scale(0.95)')
        .transition()
        .duration(500)
        .delay((_, i) => i * 30)
        .ease(easings.cubic)
        .attr('opacity', 1)
        .attr('transform', 'scale(1)');
    }

    // Interactive effects
    if (interactive) {
      muscles
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('fill-opacity', 1)
            .attr('stroke-width', 3)
            .style('filter', 'url(#muscle-glow-100)');

          handleMuscleInteraction(d, 'hover');
        })
        .on('mouseleave', function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('fill-opacity', d.activation > 0 ? 0.7 + d.activation * 0.3 : 0.3)
            .attr('stroke-width', d.isPrimary ? 2 : 1)
            .style('filter', () => {
              if (d.activation > 0.75) return 'url(#muscle-glow-100)';
              if (d.activation > 0.5) return 'url(#muscle-glow-75)';
              if (d.activation > 0.25) return 'url(#muscle-glow-50)';
              if (d.activation > 0) return 'url(#muscle-glow-25)';
              return 'none';
            });

          setHoveredMuscle(null);
          onMuscleHover?.(null);
        })
        .on('click', function (event, d) {
          // Pulse animation
          d3.select(this)
            .transition()
            .duration(100)
            .attr('transform', 'scale(1.05)')
            .transition()
            .duration(100)
            .attr('transform', 'scale(1)');

          handleMuscleInteraction(d, 'click');
        });
    }

    // Labels
    if (showLabels) {
      const labels = svg.append('g').attr('class', 'labels');

      muscleData.forEach((muscle) => {
        if (muscle.activation > 0 || hoveredMuscle === muscle.id) {
          labels
            .append('text')
            .attr('x', muscle.labelPosition.x)
            .attr('y', muscle.labelPosition.y)
            .attr('fill', 'white')
            .attr('font-size', '8px')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('opacity', 0)
            .text(muscle.name)
            .transition()
            .duration(300)
            .attr('opacity', 0.9);
        }
      });
    }

    // Pulsing animation for active muscles
    if (animated) {
      const activeMuscles = muscleData.filter((d) => d.activation > 0.5);
      if (activeMuscles.length > 0) {
        const pulse = () => {
          muscles
            .filter((d) => d.activation > 0.5)
            .transition()
            .duration(1000)
            .ease(easings.sin)
            .attr('fill-opacity', (d) => 0.6 + d.activation * 0.2)
            .transition()
            .duration(1000)
            .ease(easings.sin)
            .attr('fill-opacity', (d) => 0.8 + d.activation * 0.2)
            .on('end', pulse);
        };
        pulse();
      }
    }
  }, [muscleData, view, colorScale, showLabels, interactive, animated, height, hoveredMuscle, handleMuscleInteraction, onMuscleHover]);

  return (
    <D3Container
      height={height}
      className={className}
      noPadding
      glassmorphism={false}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ maxHeight: height }}
      />

      {/* Tooltip */}
      {hoveredMuscle && interactive && (
        <div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-xl bg-black/80 backdrop-blur-sm border border-white/20 shadow-xl"
        >
          <div className="text-white font-semibold text-sm">
            {muscleData.find((m) => m.id === hoveredMuscle)?.name}
          </div>
          {activationMap[hoveredMuscle]?.activation > 0 && (
            <div className="text-xs mt-1">
              <span className="text-gray-400">Activation: </span>
              <span
                style={{ color: colorScale(activationMap[hoveredMuscle].activation) }}
                className="font-bold"
              >
                {Math.round(activationMap[hoveredMuscle].activation * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </D3Container>
  );
}

export default MuscleMapD3;
