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

import { memo, useState } from 'react';

const LOGO_SIZES = {
  xs: { width: 24, height: 24, className: 'w-6 h-6' },
  sm: { width: 32, height: 32, className: 'w-8 h-8' },
  md: { width: 40, height: 40, className: 'w-10 h-10' },
  lg: { width: 64, height: 64, className: 'w-16 h-16' },
  xl: { width: 80, height: 80, className: 'w-20 h-20' },
};

/**
 * SVG fallback logo for when image loading fails (e.g., Brave Shields, iOS Lockdown Mode)
 */
function LogoFallback({ width, height, className }: { width: number; height: number; className: string }) {
  return (
    <div
      className={`rounded-lg ${className} flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500`}
      style={{ width, height }}
      role="img"
      aria-label="MuscleMap"
    >
      <svg
        width={width * 0.6}
        height={height * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 6.5c1.5-1.5 3-2 4.5-2s3 .5 4.5 2" />
        <path d="M4 12c0-2 1-4 3-5.5" />
        <path d="M20 12c0-2-1-4-3-5.5" />
        <path d="M4 12c0 3 2 6 5 7.5" />
        <path d="M20 12c0 3-2 6-5 7.5" />
        <path d="M9 19.5c1 .5 2 .5 3 .5s2 0 3-.5" />
        <circle cx="12" cy="12" r="2" fill="white" stroke="none" />
      </svg>
    </div>
  );
}

/**
 * Optimized Logo with AVIF > WebP > PNG progressive enhancement
 * Falls back to SVG icon if all image formats fail (Brave Shields, Lockdown Mode)
 *
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} props.size - Predefined size (default: 'md')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.priority - If true, loads eagerly with high priority (for above-fold)
 */
function Logo({ size = 'md', className = '', priority = false }) {
  const { width, height, className: sizeClass } = LOGO_SIZES[size] || LOGO_SIZES.md;
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return <LogoFallback width={width} height={height} className={`${sizeClass} ${className}`} />;
  }

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
        onError={() => setImgFailed(true)}
      />
    </picture>
  );
}

export default memo(Logo);
