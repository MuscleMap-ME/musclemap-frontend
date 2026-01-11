/**
 * D3 Gradient Utilities
 *
 * Beautiful gradient presets for hyper-realistic visualizations:
 * - Linear gradients
 * - Radial gradients
 * - Mesh gradients (approximated)
 * - Glow effects
 */

import * as d3 from 'd3';

// ============================================
// GRADIENT PRESETS
// ============================================

export interface GradientStop {
  offset: string;
  color: string;
  opacity?: number;
}

export interface LinearGradientConfig {
  id: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  stops: GradientStop[];
}

export interface RadialGradientConfig {
  id: string;
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
  stops: GradientStop[];
}

// Beautiful gradient presets
export const gradientPresets = {
  // Electric blues
  electric: {
    id: 'gradient-electric',
    stops: [
      { offset: '0%', color: '#3b82f6' },
      { offset: '50%', color: '#6366f1' },
      { offset: '100%', color: '#8b5cf6' },
    ],
  },

  // Sunset vibes
  sunset: {
    id: 'gradient-sunset',
    stops: [
      { offset: '0%', color: '#f59e0b' },
      { offset: '50%', color: '#ec4899' },
      { offset: '100%', color: '#8b5cf6' },
    ],
  },

  // Ocean depth
  ocean: {
    id: 'gradient-ocean',
    stops: [
      { offset: '0%', color: '#06b6d4' },
      { offset: '50%', color: '#3b82f6' },
      { offset: '100%', color: '#1e3a8a' },
    ],
  },

  // Fire and heat
  fire: {
    id: 'gradient-fire',
    stops: [
      { offset: '0%', color: '#fbbf24' },
      { offset: '50%', color: '#f97316' },
      { offset: '100%', color: '#dc2626' },
    ],
  },

  // Nature green
  nature: {
    id: 'gradient-nature',
    stops: [
      { offset: '0%', color: '#10b981' },
      { offset: '50%', color: '#059669' },
      { offset: '100%', color: '#065f46' },
    ],
  },

  // Cosmic purple
  cosmic: {
    id: 'gradient-cosmic',
    stops: [
      { offset: '0%', color: '#a855f7' },
      { offset: '50%', color: '#7c3aed' },
      { offset: '100%', color: '#4c1d95' },
    ],
  },

  // MuscleMap brand
  muscleMap: {
    id: 'gradient-musclemap',
    stops: [
      { offset: '0%', color: '#60a5fa' },
      { offset: '50%', color: '#a855f7' },
      { offset: '100%', color: '#ec4899' },
    ],
  },

  // Muscle heat map (activation intensity)
  muscleHeat: {
    id: 'gradient-muscle-heat',
    stops: [
      { offset: '0%', color: '#3b82f6' },    // Cold - low activation
      { offset: '25%', color: '#22c55e' },   // Warm
      { offset: '50%', color: '#eab308' },   // Hot
      { offset: '75%', color: '#f97316' },   // Very hot
      { offset: '100%', color: '#ef4444' },  // Maximum activation
    ],
  },

  // Steel/metallic
  steel: {
    id: 'gradient-steel',
    stops: [
      { offset: '0%', color: '#94a3b8' },
      { offset: '30%', color: '#cbd5e1' },
      { offset: '50%', color: '#f1f5f9' },
      { offset: '70%', color: '#cbd5e1' },
      { offset: '100%', color: '#64748b' },
    ],
  },

  // Gold metallic
  gold: {
    id: 'gradient-gold',
    stops: [
      { offset: '0%', color: '#92400e' },
      { offset: '30%', color: '#f59e0b' },
      { offset: '50%', color: '#fcd34d' },
      { offset: '70%', color: '#f59e0b' },
      { offset: '100%', color: '#78350f' },
    ],
  },
};

// ============================================
// GRADIENT CREATION
// ============================================

/**
 * Create a defs element if it doesn't exist
 */
export function ensureDefs(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): d3.Selection<SVGDefsElement, unknown, null, undefined> {
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append('defs');
  }
  return defs;
}

/**
 * Create a linear gradient
 */
export function createLinearGradient(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  config: LinearGradientConfig
): string {
  const defs = ensureDefs(svg);

  // Remove existing gradient with same ID
  defs.select(`#${config.id}`).remove();

  const gradient = defs
    .append('linearGradient')
    .attr('id', config.id)
    .attr('x1', config.x1 || '0%')
    .attr('y1', config.y1 || '0%')
    .attr('x2', config.x2 || '100%')
    .attr('y2', config.y2 || '0%');

  config.stops.forEach((stop) => {
    gradient
      .append('stop')
      .attr('offset', stop.offset)
      .attr('stop-color', stop.color)
      .attr('stop-opacity', stop.opacity ?? 1);
  });

  return `url(#${config.id})`;
}

/**
 * Create a radial gradient
 */
export function createRadialGradient(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  config: RadialGradientConfig
): string {
  const defs = ensureDefs(svg);

  // Remove existing gradient with same ID
  defs.select(`#${config.id}`).remove();

  const gradient = defs
    .append('radialGradient')
    .attr('id', config.id)
    .attr('cx', config.cx || '50%')
    .attr('cy', config.cy || '50%')
    .attr('r', config.r || '50%');

  if (config.fx) gradient.attr('fx', config.fx);
  if (config.fy) gradient.attr('fy', config.fy);

  config.stops.forEach((stop) => {
    gradient
      .append('stop')
      .attr('offset', stop.offset)
      .attr('stop-color', stop.color)
      .attr('stop-opacity', stop.opacity ?? 1);
  });

  return `url(#${config.id})`;
}

/**
 * Create a glow filter
 */
export function createGlowFilter(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  options: {
    id?: string;
    color?: string;
    blur?: number;
    intensity?: number;
  } = {}
): string {
  const {
    id = 'glow-filter',
    color = '#3b82f6',
    blur = 10,
    intensity = 3,
  } = options;

  const defs = ensureDefs(svg);

  // Remove existing filter with same ID
  defs.select(`#${id}`).remove();

  const filter = defs
    .append('filter')
    .attr('id', id)
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  // Colored blur for glow
  filter
    .append('feFlood')
    .attr('result', 'flood')
    .attr('flood-color', color)
    .attr('flood-opacity', '1');

  filter
    .append('feComposite')
    .attr('in', 'flood')
    .attr('in2', 'SourceGraphic')
    .attr('operator', 'in')
    .attr('result', 'mask');

  filter
    .append('feGaussianBlur')
    .attr('in', 'mask')
    .attr('stdDeviation', blur)
    .attr('result', 'blur');

  // Stack multiple blurs for intensity
  const merge = filter.append('feMerge');
  for (let i = 0; i < intensity; i++) {
    merge.append('feMergeNode').attr('in', 'blur');
  }
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  return `url(#${id})`;
}

/**
 * Create a drop shadow filter
 */
export function createDropShadow(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  options: {
    id?: string;
    dx?: number;
    dy?: number;
    blur?: number;
    opacity?: number;
    color?: string;
  } = {}
): string {
  const {
    id = 'drop-shadow',
    dx = 2,
    dy = 4,
    blur = 6,
    opacity = 0.3,
    color = '#000000',
  } = options;

  const defs = ensureDefs(svg);

  // Remove existing filter with same ID
  defs.select(`#${id}`).remove();

  const filter = defs
    .append('filter')
    .attr('id', id)
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  filter
    .append('feDropShadow')
    .attr('dx', dx)
    .attr('dy', dy)
    .attr('stdDeviation', blur)
    .attr('flood-color', color)
    .attr('flood-opacity', opacity);

  return `url(#${id})`;
}

/**
 * Create a glass/frosted effect filter
 */
export function createGlassFilter(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  options: {
    id?: string;
    blur?: number;
    saturation?: number;
  } = {}
): string {
  const { id = 'glass-filter', blur = 10, saturation = 1.5 } = options;

  const defs = ensureDefs(svg);

  // Remove existing filter with same ID
  defs.select(`#${id}`).remove();

  const filter = defs
    .append('filter')
    .attr('id', id)
    .attr('x', '-10%')
    .attr('y', '-10%')
    .attr('width', '120%')
    .attr('height', '120%');

  // Blur for frosted glass effect
  filter
    .append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', blur)
    .attr('result', 'blur');

  // Saturation boost
  filter
    .append('feColorMatrix')
    .attr('in', 'blur')
    .attr('type', 'saturate')
    .attr('values', saturation)
    .attr('result', 'saturated');

  // Blend with original
  filter
    .append('feBlend')
    .attr('in', 'saturated')
    .attr('in2', 'SourceGraphic')
    .attr('mode', 'normal');

  return `url(#${id})`;
}

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Create a color scale for muscle activation
 */
export function createMuscleActivationScale(): d3.ScaleSequential<string> {
  return d3.scaleSequential(d3.interpolateRgbBasis([
    '#3b82f6', // Cold blue - 0%
    '#22c55e', // Green - 25%
    '#eab308', // Yellow - 50%
    '#f97316', // Orange - 75%
    '#ef4444', // Red - 100%
  ]));
}

/**
 * Create a color scale for stats (0-100)
 */
export function createStatColorScale(
  baseColor: string = '#3b82f6'
): d3.ScaleLinear<string, string> {
  const hsl = d3.hsl(baseColor);
  const dark = d3.hsl(hsl.h, hsl.s * 0.6, hsl.l * 0.4);
  const light = d3.hsl(hsl.h, hsl.s, Math.min(hsl.l * 1.4, 0.9));

  return d3.scaleLinear<string>()
    .domain([0, 50, 100])
    .range([dark.formatHsl(), baseColor, light.formatHsl()]);
}

/**
 * Generate a color palette
 */
export function generatePalette(
  baseColor: string,
  count: number = 6
): string[] {
  const hsl = d3.hsl(baseColor);
  const palette: string[] = [];

  for (let i = 0; i < count; i++) {
    const hue = (hsl.h + (360 / count) * i) % 360;
    palette.push(d3.hsl(hue, hsl.s, hsl.l).formatHex());
  }

  return palette;
}

/**
 * Create complementary color
 */
export function complementary(color: string): string {
  const hsl = d3.hsl(color);
  return d3.hsl((hsl.h + 180) % 360, hsl.s, hsl.l).formatHex();
}

/**
 * Lighten a color
 */
export function lighten(color: string, amount: number = 0.2): string {
  const hsl = d3.hsl(color);
  hsl.l = Math.min(1, hsl.l + amount);
  return hsl.formatHex();
}

/**
 * Darken a color
 */
export function darken(color: string, amount: number = 0.2): string {
  const hsl = d3.hsl(color);
  hsl.l = Math.max(0, hsl.l - amount);
  return hsl.formatHex();
}

/**
 * Adjust color opacity
 */
export function withOpacity(color: string, opacity: number): string {
  const rgb = d3.rgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}
