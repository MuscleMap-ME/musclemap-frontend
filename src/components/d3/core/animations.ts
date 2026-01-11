/**
 * D3 Animation Utilities
 *
 * Cutting-edge animation presets for smooth, hyper-realistic effects:
 * - Easing functions
 * - Transition presets
 * - Spring physics
 * - Particle systems
 */

import * as d3 from 'd3';

// ============================================
// EASING FUNCTIONS
// ============================================

export const easings = {
  // Standard easings
  linear: d3.easeLinear,
  quad: d3.easeQuad,
  cubic: d3.easeCubic,
  poly: d3.easePoly.exponent(3),
  sin: d3.easeSin,
  exp: d3.easeExp,
  circle: d3.easeCircle,
  elastic: d3.easeElastic.amplitude(1).period(0.3),
  back: d3.easeBack.overshoot(1.7),
  bounce: d3.easeBounce,

  // Custom smooth easings
  smooth: (t: number) => t * t * (3 - 2 * t),
  smoother: (t: number) => t * t * t * (t * (t * 6 - 15) + 10),

  // Spring-like easing
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Anticipation + overshoot
  anticipate: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
};

// ============================================
// TRANSITION PRESETS
// ============================================

export interface TransitionConfig {
  duration: number;
  delay?: number;
  ease: (t: number) => number;
}

export const transitions = {
  // Fast, snappy animations
  instant: { duration: 0, ease: easings.linear } as TransitionConfig,
  fast: { duration: 150, ease: easings.cubic } as TransitionConfig,
  quick: { duration: 250, ease: easings.smooth } as TransitionConfig,

  // Standard animations
  normal: { duration: 400, ease: easings.cubic } as TransitionConfig,
  smooth: { duration: 500, ease: easings.smoother } as TransitionConfig,
  gentle: { duration: 600, ease: easings.sin } as TransitionConfig,

  // Slow, dramatic animations
  dramatic: { duration: 800, ease: easings.exp } as TransitionConfig,
  slow: { duration: 1000, ease: easings.cubic } as TransitionConfig,
  epic: { duration: 1500, ease: easings.smoother } as TransitionConfig,

  // Physics-based
  springy: { duration: 600, ease: easings.spring } as TransitionConfig,
  bouncy: { duration: 800, ease: easings.bounce } as TransitionConfig,
  elastic: { duration: 1000, ease: easings.elastic } as TransitionConfig,

  // Entrance animations
  fadeIn: { duration: 400, ease: easings.cubic } as TransitionConfig,
  slideIn: { duration: 500, ease: easings.back } as TransitionConfig,
  scaleIn: { duration: 400, ease: easings.elastic } as TransitionConfig,

  // Staggered animations (use with delay)
  stagger: (index: number, baseDelay = 50): TransitionConfig => ({
    duration: 400,
    delay: index * baseDelay,
    ease: easings.cubic,
  }),
};

// ============================================
// ANIMATION HELPERS
// ============================================

/**
 * Apply a transition configuration to a D3 selection
 */
export function applyTransition<T extends d3.BaseType>(
  selection: d3.Selection<T, unknown, null, undefined> | d3.Transition<T, unknown, null, undefined>,
  config: TransitionConfig
): d3.Transition<T, unknown, null, undefined> {
  const transition = 'transition' in selection ? selection : selection.transition();
  return transition
    .duration(config.duration)
    .delay(config.delay || 0)
    .ease(config.ease);
}

/**
 * Create staggered entrance animation
 */
export function staggeredEntrance<T extends d3.BaseType, D>(
  selection: d3.Selection<T, D, d3.BaseType, unknown>,
  config: {
    duration?: number;
    staggerDelay?: number;
    initialOpacity?: number;
    initialScale?: number;
    initialY?: number;
  } = {}
): d3.Transition<T, D, d3.BaseType, unknown> {
  const {
    duration = 500,
    staggerDelay = 50,
    initialOpacity = 0,
    initialScale = 0.8,
    initialY = 20,
  } = config;

  // Set initial state
  selection
    .style('opacity', initialOpacity)
    .attr('transform', `translate(0, ${initialY}) scale(${initialScale})`);

  // Animate to final state
  return selection
    .transition()
    .duration(duration)
    .delay((_, i) => i * staggerDelay)
    .ease(easings.cubic)
    .style('opacity', 1)
    .attr('transform', 'translate(0, 0) scale(1)');
}

/**
 * Pulse animation for emphasis
 */
export function pulseAnimation<T extends d3.BaseType>(
  selection: d3.Selection<T, unknown, null, undefined>,
  options: {
    scale?: number;
    duration?: number;
    repeat?: number;
  } = {}
): void {
  const { scale = 1.1, duration = 300, repeat = 1 } = options;

  let current = selection;

  for (let i = 0; i < repeat; i++) {
    current = current
      .transition()
      .duration(duration / 2)
      .ease(easings.cubic)
      .attr('transform', `scale(${scale})`)
      .transition()
      .duration(duration / 2)
      .ease(easings.cubic)
      .attr('transform', 'scale(1)') as unknown as d3.Selection<T, unknown, null, undefined>;
  }
}

/**
 * Glow animation for highlighting
 */
export function glowAnimation(
  selection: d3.Selection<SVGElement, unknown, null, undefined>,
  options: {
    color?: string;
    intensity?: number;
    duration?: number;
  } = {}
): d3.Transition<SVGElement, unknown, null, undefined> {
  const { color = '#3b82f6', intensity = 15, duration = 500 } = options;

  return selection
    .transition()
    .duration(duration)
    .ease(easings.sin)
    .style('filter', `drop-shadow(0 0 ${intensity}px ${color})`)
    .transition()
    .duration(duration)
    .ease(easings.sin)
    .style('filter', 'none');
}

// ============================================
// PATH ANIMATION
// ============================================

/**
 * Animate path drawing (stroke dasharray technique)
 */
export function animatePathDraw(
  path: d3.Selection<SVGPathElement, unknown, null, undefined>,
  duration: number = 1000
): d3.Transition<SVGPathElement, unknown, null, undefined> {
  const pathNode = path.node();
  if (!pathNode) return path.transition();

  const totalLength = pathNode.getTotalLength();

  return path
    .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
    .attr('stroke-dashoffset', totalLength)
    .transition()
    .duration(duration)
    .ease(easings.smooth)
    .attr('stroke-dashoffset', 0);
}

/**
 * Simple path interpolation (crossfade fallback)
 */
function interpolatePath(a: string, b: string): (t: number) => string {
  // Simple fallback that switches paths at the midpoint
  // For more sophisticated path morphing, consider d3-interpolate-path package
  return (t: number) => (t < 0.5 ? a : b);
}

/**
 * Morph between two paths
 */
export function morphPath(
  path: d3.Selection<SVGPathElement, unknown, null, undefined>,
  targetPath: string,
  duration: number = 800
): d3.Transition<SVGPathElement, unknown, null, undefined> {
  return path
    .transition()
    .duration(duration)
    .ease(easings.smoother)
    .attrTween('d', function () {
      const currentPath = this.getAttribute('d') || '';
      return interpolatePath(currentPath, targetPath);
    });
}

// ============================================
// COLOR ANIMATIONS
// ============================================

/**
 * Animate between colors
 */
export function animateColor(
  selection: d3.Selection<SVGElement, unknown, null, undefined>,
  targetColor: string,
  options: {
    attribute?: string;
    duration?: number;
  } = {}
): d3.Transition<SVGElement, unknown, null, undefined> {
  const { attribute = 'fill', duration = 400 } = options;

  return selection
    .transition()
    .duration(duration)
    .ease(easings.smooth)
    .attr(attribute, targetColor);
}

/**
 * Rainbow color cycle
 */
export function rainbowCycle(
  selection: d3.Selection<SVGElement, unknown, null, undefined>,
  options: {
    attribute?: string;
    duration?: number;
    saturation?: number;
    lightness?: number;
  } = {}
): () => void {
  const { attribute = 'fill', duration = 5000, saturation = 70, lightness = 50 } = options;

  let animationId: number;
  let startTime: number;

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const progress = ((timestamp - startTime) % duration) / duration;
    const hue = progress * 360;

    selection.attr(attribute, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(animationId);
}

// ============================================
// PHYSICS-BASED ANIMATIONS
// ============================================

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const springPresets: Record<string, SpringConfig> = {
  default: { stiffness: 100, damping: 10, mass: 1 },
  gentle: { stiffness: 50, damping: 15, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 210, damping: 20, mass: 1 },
  slow: { stiffness: 30, damping: 10, mass: 1 },
  molasses: { stiffness: 20, damping: 25, mass: 1 },
};

/**
 * Spring physics animation
 */
export function springAnimation(
  from: number,
  to: number,
  config: SpringConfig = springPresets.default,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): () => void {
  const { stiffness, damping, mass } = config;

  let position = from;
  let velocity = 0;
  let animationId: number;
  let lastTime = performance.now();

  const animate = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.064); // Cap at 64ms
    lastTime = now;

    // Spring force: F = -k * x - c * v
    const displacement = position - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;

    onUpdate(position);

    // Check if animation should stop
    if (Math.abs(velocity) < 0.001 && Math.abs(displacement) < 0.001) {
      onUpdate(to);
      if (onComplete) onComplete();
      return;
    }

    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(animationId);
}

// ============================================
// INTERPOLATION HELPERS
// ============================================

/**
 * Custom interpolator for complex objects
 */
export function interpolateObject<T extends Record<string, number>>(a: T, b: T): (t: number) => T {
  const keys = Object.keys(a) as (keyof T)[];
  const interpolators = keys.map((key) => ({
    key,
    interpolator: d3.interpolateNumber(a[key] as number, b[key] as number),
  }));

  return (t: number) => {
    const result = {} as T;
    for (const { key, interpolator } of interpolators) {
      (result as Record<string, number>)[key as string] = interpolator(t);
    }
    return result;
  };
}

/**
 * Interpolate array of points
 */
export function interpolatePoints(
  a: Array<{ x: number; y: number }>,
  b: Array<{ x: number; y: number }>
): (t: number) => Array<{ x: number; y: number }> {
  const minLength = Math.min(a.length, b.length);
  const interpolators = [];

  for (let i = 0; i < minLength; i++) {
    interpolators.push({
      x: d3.interpolateNumber(a[i].x, b[i].x),
      y: d3.interpolateNumber(a[i].y, b[i].y),
    });
  }

  return (t: number) => interpolators.map((interp) => ({
    x: interp.x(t),
    y: interp.y(t),
  }));
}

