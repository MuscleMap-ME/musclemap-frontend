/**
 * VideoThumbnail Component
 *
 * Displays a video thumbnail with:
 * - Play button overlay
 * - Duration badge
 * - Lazy loading
 * - Hover preview (optional)
 * - View angle indicator
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Eye, Video } from 'lucide-react';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

/**
 * Format seconds to mm:ss
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * View angle label mapping
 */
const VIEW_ANGLE_LABELS = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  detail: 'Detail',
  overhead: 'Overhead',
};

/**
 * VideoThumbnail Component
 */
const VideoThumbnail = memo(function VideoThumbnail({
  src,
  alt = 'Video thumbnail',
  videoUrl = null,
  duration = null,
  viewAngle = null,
  width = null,
  height = null,
  aspectRatio = '16/9',
  className = '',
  showDuration = true,
  showViewAngle = false,
  showPlayButton = true,
  hoverPreview = false,
  priority = false,
  onClick = null,
  onError = null,
}) {
  const shouldReduceMotion = useShouldReduceMotion();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);
  const videoPreviewRef = useRef(null);

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
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Handle hover preview
  useEffect(() => {
    if (!hoverPreview || !videoUrl || !isHovering || !videoPreviewRef.current) return;

    const video = videoPreviewRef.current;
    video.currentTime = 0;
    video.play().catch(() => {
      // Autoplay may be blocked, that's okay
    });

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [hoverPreview, videoUrl, isHovering]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleClick = () => {
    onClick?.();
  };

  // Not in view yet - show placeholder
  if (!isInView) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl bg-white/5 ${className}`}
        style={{ width, height, aspectRatio }}
        role="img"
        aria-label={alt}
      >
        <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl bg-white/5 flex items-center justify-center ${className}`}
        style={{ width, height, aspectRatio }}
        role="img"
        aria-label="Failed to load video thumbnail"
      >
        <div className="text-center p-2">
          <Video className="w-8 h-8 text-gray-500 mx-auto mb-1" />
          <span className="text-gray-500 text-xs">No preview</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl bg-black cursor-pointer group ${className}`}
      style={{ width, height, aspectRatio }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="button"
      aria-label={`Play video: ${alt}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
      )}

      {/* Thumbnail Image */}
      {src && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full object-cover transition-transform duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${isHovering && !shouldReduceMotion ? 'scale-105' : 'scale-100'}
          `}
        />
      )}

      {/* Video Preview on Hover */}
      {hoverPreview && videoUrl && isHovering && (
        <video
          ref={videoPreviewRef}
          src={videoUrl}
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

      {/* Play Button */}
      {showPlayButton && (
        <motion.div
          initial={false}
          animate={shouldReduceMotion ? {} : { scale: isHovering ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </motion.div>
      )}

      {/* Duration Badge */}
      {showDuration && duration > 0 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 backdrop-blur-sm flex items-center gap-1">
          <Clock className="w-3 h-3 text-white/70" />
          <span className="text-white text-xs font-mono">
            {formatDuration(duration)}
          </span>
        </div>
      )}

      {/* View Angle Badge */}
      {showViewAngle && viewAngle && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-500/70 backdrop-blur-sm flex items-center gap-1">
          <Eye className="w-3 h-3 text-white" />
          <span className="text-white text-xs font-medium">
            {VIEW_ANGLE_LABELS[viewAngle] || viewAngle}
          </span>
        </div>
      )}
    </div>
  );
});

/**
 * VideoThumbnailGrid - Display multiple video angles in a grid
 */
export function VideoThumbnailGrid({
  videos = [],
  selectedAngle = 'front',
  onSelectAngle = null,
  className = '',
}) {
  if (videos.length === 0) {
    return null;
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {videos.map((video) => (
        <button
          key={video.id || video.viewAngle}
          onClick={() => onSelectAngle?.(video.viewAngle)}
          className={`
            relative rounded-lg overflow-hidden transition-all
            ${selectedAngle === video.viewAngle
              ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black'
              : 'opacity-60 hover:opacity-100'
            }
          `}
          aria-pressed={selectedAngle === video.viewAngle}
          aria-label={`${VIEW_ANGLE_LABELS[video.viewAngle] || video.viewAngle} view`}
        >
          <VideoThumbnail
            src={video.thumbnailUrl || video.thumbnail_url}
            alt={`${video.viewAngle} view`}
            viewAngle={video.viewAngle || video.view_angle}
            width={80}
            height={45}
            showDuration={false}
            showPlayButton={false}
            showViewAngle={true}
          />
        </button>
      ))}
    </div>
  );
}

export default VideoThumbnail;
