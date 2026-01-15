/**
 * PhotoCompare - Before/After comparison slider
 *
 * Drag-to-reveal comparison component for progress photos.
 * Follows glass design language with smooth animations.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * @param {Object} props
 * @param {string} props.beforeSrc - URL for the "before" image
 * @param {string} props.afterSrc - URL for the "after" image
 * @param {string} [props.beforeLabel] - Label for before image
 * @param {string} [props.afterLabel] - Label for after image
 * @param {string} [props.beforeDate] - Date string for before photo
 * @param {string} [props.afterDate] - Date string for after photo
 * @param {string} [props.className] - Additional CSS classes
 */
export function PhotoCompare({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  beforeDate,
  afterDate,
  className,
}) {
  const containerRef = useRef(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState({ before: false, after: false });

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const startDragging = useCallback(() => {
    setIsDragging(true);
  }, []);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', stopDragging);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, stopDragging]);

  const allLoaded = imagesLoaded.before && imagesLoaded.after;

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-[var(--glass-white-5)]',
        'border border-[var(--border-default)]',
        'select-none touch-none',
        className
      )}
      style={{ aspectRatio: '3/4' }}
    >
      {/* Loading state */}
      {!allLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-20">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* After Image (background, fully visible) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={() => setImagesLoaded(prev => ({ ...prev, after: true }))}
        draggable={false}
      />

      {/* Before Image (foreground, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => setImagesLoaded(prev => ({ ...prev, before: true }))}
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Vertical Line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />

        {/* Drag Handle */}
        <motion.button
          className={clsx(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-12 h-12 rounded-full',
            'bg-white/20 backdrop-blur-md border border-white/30',
            'flex items-center justify-center',
            'cursor-grab active:cursor-grabbing',
            'shadow-[0_0_20px_rgba(255,255,255,0.3)]',
            'transition-transform',
            isDragging && 'scale-110'
          )}
          onMouseDown={startDragging}
          onTouchStart={startDragging}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center gap-0.5">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
            </svg>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
        </motion.button>
      </div>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between p-4 pointer-events-none">
        {/* Before Label */}
        <motion.div
          className={clsx(
            'glass px-3 py-2 rounded-xl',
            'text-sm font-semibold text-white'
          )}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: sliderPosition > 15 ? 1 : 0, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div>{beforeLabel}</div>
          {beforeDate && (
            <div className="text-xs text-gray-400 font-normal">{beforeDate}</div>
          )}
        </motion.div>

        {/* After Label */}
        <motion.div
          className={clsx(
            'glass px-3 py-2 rounded-xl',
            'text-sm font-semibold text-white'
          )}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: sliderPosition < 85 ? 1 : 0, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div>{afterLabel}</div>
          {afterDate && (
            <div className="text-xs text-gray-400 font-normal">{afterDate}</div>
          )}
        </motion.div>
      </div>

      {/* Instructions */}
      {allLoaded && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 glass px-3 py-2 rounded-xl text-xs text-gray-300 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: isDragging ? 0 : 1 }}
          transition={{ delay: isDragging ? 0 : 2, duration: 0.3 }}
        >
          Drag to compare
        </motion.div>
      )}
    </div>
  );
}

/**
 * PhotoCompareSideBySide - Traditional side-by-side view
 */
export function PhotoCompareSideBySide({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  beforeDate,
  afterDate,
  className,
}) {
  return (
    <div className={clsx('grid grid-cols-2 gap-2', className)}>
      <div className="relative rounded-xl overflow-hidden bg-[var(--glass-white-5)] border border-[var(--border-default)]">
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="w-full h-full object-cover"
          style={{ aspectRatio: '3/4' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60">
          <div className="text-sm font-semibold text-white">{beforeLabel}</div>
          {beforeDate && (
            <div className="text-xs text-gray-300">{beforeDate}</div>
          )}
        </div>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-[var(--glass-white-5)] border border-[var(--border-default)]">
        <img
          src={afterSrc}
          alt={afterLabel}
          className="w-full h-full object-cover"
          style={{ aspectRatio: '3/4' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60">
          <div className="text-sm font-semibold text-white">{afterLabel}</div>
          {afterDate && (
            <div className="text-xs text-gray-300">{afterDate}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoCompare;
