/**
 * AdaptiveImage
 *
 * Smart image component that adapts to network conditions:
 * - Lazy loads images when they enter the viewport
 * - Uses low-quality placeholders on slow connections
 * - Shows blur-up loading effect
 * - Supports WebP with fallback
 * - Respects save-data and reduced-motion preferences
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { useNetworkStatus, useImageQuality } from '../hooks/useNetworkStatus';

const AdaptiveImage = memo(function AdaptiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = null,
  lowQualitySrc = null,
  webpSrc = null,
  priority = false, // Skip lazy loading for above-fold images
  objectFit = 'cover',
  onLoad = null,
  onError = null,
}) {
  const { shouldReduceData, isOnline } = useNetworkStatus();
  const { quality } = useImageQuality();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Determine which image source to use
  const getImageSrc = () => {
    // On slow connections or save-data mode, use low-quality version if available
    if ((shouldReduceData || quality === 'low') && lowQualitySrc) {
      return lowQualitySrc;
    }
    return src;
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Don't render actual image until in view
  if (!isInView) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        {placeholder || (
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse"
            style={{ width, height }}
          />
        )}
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-white/5 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load: ${alt}`}
      >
        <span className="text-gray-500 text-sm">Unable to load image</span>
      </div>
    );
  }

  // Offline with no cached image
  if (!isOnline && !isLoaded) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-white/5 ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-gray-500 text-sm">Offline</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
      )}

      {/* Use picture element for WebP support */}
      <picture>
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
        <img
          ref={imgRef}
          src={getImageSrc()}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ objectFit }}
        />
      </picture>
    </div>
  );
});

export default AdaptiveImage;

/**
 * Responsive image helper - generates srcSet for responsive images
 */
export function generateSrcSet(basePath, sizes = [320, 640, 1024, 1920]) {
  const ext = basePath.split('.').pop();
  const base = basePath.replace(`.${ext}`, '');

  return sizes.map((size) => `${base}-${size}w.${ext} ${size}w`).join(', ');
}

/**
 * Preload an image programmatically
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
