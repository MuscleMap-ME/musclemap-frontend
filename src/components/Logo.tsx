/**
 * Optimized Logo Component
 *
 * Uses progressive enhancement:
 * 1. AVIF (best compression, ~1.7KB) - Chrome 85+, Firefox 93+, Safari 16+
 * 2. WebP (~1.8KB) - All modern browsers
 * 3. PNG (53KB) - Fallback for older browsers
 *
 * Cloudflare caches all variants at edge for ~4 hours by default.
 */

import { memo } from 'react';

const LOGO_SIZES = {
  xs: { width: 24, height: 24, className: 'w-6 h-6' },
  sm: { width: 32, height: 32, className: 'w-8 h-8' },
  md: { width: 40, height: 40, className: 'w-10 h-10' },
  lg: { width: 64, height: 64, className: 'w-16 h-16' },
  xl: { width: 80, height: 80, className: 'w-20 h-20' },
};

/**
 * Optimized Logo with AVIF > WebP > PNG progressive enhancement
 *
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} props.size - Predefined size (default: 'md')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.priority - If true, loads eagerly with high priority (for above-fold)
 */
function Logo({ size = 'md', className = '', priority = false }) {
  const { width, height, className: sizeClass } = LOGO_SIZES[size] || LOGO_SIZES.md;

  return (
    <picture>
      <source srcSet="/logo.avif" type="image/avif" />
      <source srcSet="/logo.webp" type="image/webp" />
      <img
        src="/logo.png"
        alt="MuscleMap"
        width={width}
        height={height}
        className={`rounded-lg ${sizeClass} ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
      />
    </picture>
  );
}

export default memo(Logo);
