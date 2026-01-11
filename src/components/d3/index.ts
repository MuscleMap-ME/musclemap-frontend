/**
 * D3 Visualization System for MuscleMap
 *
 * A hyper-realistic, cutting-edge visualization library featuring:
 * - Smooth animations and transitions
 * - Force-directed graphs
 * - Interactive muscle maps
 * - Radar charts
 * - Geographic visualizations
 * - Particle effects
 *
 * Usage:
 * ```tsx
 * import { MuscleMapD3, RadarChartD3, ForceGraph, ParticleField } from '@/components/d3';
 *
 * // Muscle Map with activations
 * <MuscleMapD3
 *   activations={[{ muscleId: 'pectoralis-major-left', name: 'Chest', activation: 0.8 }]}
 *   view="front"
 *   interactive
 *   animated
 * />
 *
 * // Radar Chart for stats
 * <RadarChartD3
 *   axes={[{ key: 'strength', label: 'STR' }, { key: 'endurance', label: 'END' }]}
 *   series={[{ name: 'Current', data: { strength: 85, endurance: 70 }, color: '#8b5cf6' }]}
 * />
 *
 * // Particle background
 * <ParticleField particleCount={100} showConnections glowIntensity={1.5} />
 * ```
 */

// Core utilities
export { D3Container } from './core/D3Container';
export type { D3ContainerProps } from './core/D3Container';

export { useD3, debounce } from './core/useD3';
export type { D3Dimensions, UseD3Options } from './core/useD3';

export {
  easings,
  transitions,
  applyTransition,
  staggeredEntrance,
  pulseAnimation,
  glowAnimation,
  animatePathDraw,
  morphPath,
  animateColor,
  rainbowCycle,
  springAnimation,
  springPresets,
  interpolateObject,
  interpolatePoints,
} from './core/animations';
export type { TransitionConfig, SpringConfig } from './core/animations';

export {
  gradientPresets,
  ensureDefs,
  createLinearGradient,
  createRadialGradient,
  createGlowFilter,
  createDropShadow,
  createGlassFilter,
  createMuscleActivationScale,
  createStatColorScale,
  generatePalette,
  complementary,
  lighten,
  darken,
  withOpacity,
} from './core/gradients';
export type { GradientStop, LinearGradientConfig, RadialGradientConfig } from './core/gradients';

// Visualizations
export { MuscleMapD3 } from './visualizations/MuscleMapD3';
export type { MuscleMapD3Props, MuscleActivation } from './visualizations/MuscleMapD3';

export { ForceGraph } from './visualizations/ForceGraph';
export type { ForceGraphProps, ForceGraphNode, ForceGraphEdge } from './visualizations/ForceGraph';

export { RadarChartD3 } from './visualizations/RadarChartD3';
export type { RadarChartD3Props, RadarChartAxis, RadarChartDataPoint, RadarChartSeries } from './visualizations/RadarChartD3';

export { WorldMapD3 } from './visualizations/WorldMapD3';
export type { WorldMapD3Props, MapLocation, MapConnection } from './visualizations/WorldMapD3';

export { BarChartD3 } from './visualizations/BarChartD3';
export type { BarChartD3Props, BarChartDataItem } from './visualizations/BarChartD3';

export { PieChartD3 } from './visualizations/PieChartD3';
export type { PieChartD3Props, PieChartDataItem } from './visualizations/PieChartD3';

export { ParticleField } from './visualizations/ParticleField';
export type { ParticleFieldProps, Particle } from './visualizations/ParticleField';

export { RouteAtlasD3 } from './visualizations/RouteAtlasD3';
export type { RouteAtlasD3Props, RouteDefinition, RouteCategory, RouteAtlasManifest } from './visualizations/RouteAtlasD3';
