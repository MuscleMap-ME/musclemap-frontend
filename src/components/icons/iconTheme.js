/**
 * MuscleMap Icon Theme Configuration
 *
 * Unified icon styling that matches the Liquid Glass design system.
 * All icons use these defaults for consistent appearance.
 */

// Default icon sizes matching the design system
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};

// Icon stroke weights
export const iconWeights = {
  thin: 1,
  light: 1.25,
  regular: 1.5,
  medium: 1.75,
  bold: 2,
  duotone: 1.5, // For Phosphor duotone icons
};

// Brand colors from the design system
export const iconColors = {
  // Primary colors
  primary: '#0066ff',      // brand-blue-500
  secondary: '#ff3366',    // brand-pulse-500

  // Text colors
  white: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.7)',
  subtle: 'rgba(255, 255, 255, 0.5)',
  disabled: 'rgba(255, 255, 255, 0.35)',

  // Muscle group colors
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#f97316',
  arms: '#8b5cf6',
  legs: '#22c55e',
  core: '#eab308',
  cardio: '#ec4899',

  // Status colors
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',
};

// Default icon props for consistent styling
export const defaultIconProps = {
  size: iconSizes.md,
  strokeWidth: iconWeights.regular,
  color: 'currentColor',
};

// Glass-style icon wrapper classes
export const iconWrapperStyles = {
  // For icons in glass containers
  glass: `
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  `,
  // For glowing active icons
  glow: `
    filter: drop-shadow(0 0 8px currentColor);
  `,
  // For icons in buttons
  button: `
    transition: transform 150ms ease;
  `,
};

/**
 * Get icon size in pixels
 * @param {string|number} size - Size key or number
 * @returns {number}
 */
export function getIconSize(size) {
  if (typeof size === 'number') return size;
  return iconSizes[size] || iconSizes.md;
}

/**
 * Get icon color value
 * @param {string} color - Color key or CSS value
 * @returns {string}
 */
export function getIconColor(color) {
  return iconColors[color] || color || 'currentColor';
}

/**
 * Get stroke weight
 * @param {string|number} weight - Weight key or number
 * @returns {number}
 */
export function getIconWeight(weight) {
  if (typeof weight === 'number') return weight;
  return iconWeights[weight] || iconWeights.regular;
}

export default {
  sizes: iconSizes,
  weights: iconWeights,
  colors: iconColors,
  defaults: defaultIconProps,
  wrapperStyles: iconWrapperStyles,
  getSize: getIconSize,
  getColor: getIconColor,
  getWeight: getIconWeight,
};
