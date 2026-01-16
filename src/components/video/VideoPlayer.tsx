/**
 * VideoPlayer Component
 *
 * Adaptive video player for exercise demonstrations:
 * - Lazy loads video when entering viewport
 * - Supports HLS streaming (ready for CDN integration)
 * - Respects save-data and reduced-motion preferences
 * - Mobile-optimized controls
 * - Offline caching preparation
 * - Multiple quality variants
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Settings,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

/**
 * Format seconds to mm:ss
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * VideoPlayer Component
 */
const VideoPlayer = memo(function VideoPlayer({
  src,
  hlsSrc = null,
  thumbnail = null,
  title = '',
  duration = 0,
  autoPlay = false,
  loop = true,
  muted = true,
  controls = true,
  showTitle = false,
  priority = false,
  className = '',
  aspectRatio = '16/9',
  qualityVariants = [],
  onPlay = null,
  onPause = null,
  onEnded = null,
  onTimeUpdate = null,
  onError = null,
}) {
  const { shouldReduceData, isOnline, connectionType: _connectionType } = useNetworkStatus();
  const shouldReduceMotion = useShouldReduceMotion();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const hlsRef = useRef(null);

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

  // Initialize HLS.js for adaptive streaming
  useEffect(() => {
    if (!isInView || !hlsSrc || !videoRef.current) return;

    const initHLS = async () => {
      try {
        const Hls = (await import('hls.js')).default;

        if (Hls.isSupported()) {
          hlsRef.current = new Hls({
            maxBufferLength: shouldReduceData ? 15 : 30,
            maxMaxBufferLength: shouldReduceData ? 30 : 60,
            startLevel: shouldReduceData ? 0 : -1, // Start with lowest quality on slow connections
          });

          hlsRef.current.loadSource(hlsSrc);
          hlsRef.current.attachMedia(videoRef.current);

          hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoaded(true);
            if (autoPlay && !shouldReduceData) {
              videoRef.current.play().catch(() => {});
            }
          });

          hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setHasError(true);
              setErrorMessage('Video streaming error');
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS support
          videoRef.current.src = hlsSrc;
        }
      } catch (_err) {
        // HLS.js not available, fall back to native video
        console.warn('HLS.js not available, using native video');
      }
    };

    initHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [isInView, hlsSrc, shouldReduceData, autoPlay]);

  // Auto-hide controls
  useEffect(() => {
    if (!controls) return;

    const hideControls = () => {
      if (isPlaying) {
        setShowControls(false);
      }
    };

    if (showControls && isPlaying) {
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, controls]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      onPause?.();
    } else {
      videoRef.current.play().catch((err) => {
        console.warn('Video play failed:', err);
        setHasError(true);
        setErrorMessage('Unable to play video');
      });
      onPlay?.();
    }
  }, [isPlaying, onPlay, onPause]);

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen?.() ||
        containerRef.current.webkitRequestFullscreen?.();
    }
  }, []);

  // Handle restart
  const handleRestart = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
  }, []);

  // Handle seek
  const handleSeek = useCallback((e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * totalDuration;
  }, [totalDuration]);

  // Video event handlers
  const handleLoadStart = useCallback(() => setIsLoading(true), []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setIsLoaded(true);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleTimeUpdateInternal = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    onTimeUpdate?.(videoRef.current.currentTime);

    // Update buffered
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered((bufferedEnd / totalDuration) * 100);
    }
  }, [totalDuration, onTimeUpdate]);

  const handleDurationChange = useCallback(() => {
    if (!videoRef.current) return;
    setTotalDuration(videoRef.current.duration);
  }, []);

  const handleVideoError = useCallback((e) => {
    setHasError(true);
    setErrorMessage('Unable to load video');
    onError?.(e);
  }, [onError]);

  // Quality selection
  const handleQualityChange = useCallback((quality) => {
    setSelectedQuality(quality);
    setShowSettings(false);

    if (hlsRef.current) {
      if (quality === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const level = qualityVariants.findIndex((v) => v.label === quality);
        if (level >= 0) {
          hlsRef.current.currentLevel = level;
        }
      }
    }
  }, [qualityVariants]);

  // Show controls on interaction
  const handleInteraction = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  // Determine video source based on network conditions
  const getVideoSrc = useCallback(() => {
    if (shouldReduceData && qualityVariants.length > 0) {
      // Use lowest quality on slow connections
      const lowestQuality = qualityVariants.reduce((min, v) =>
        (v.bitrate || 0) < (min.bitrate || Infinity) ? v : min
      );
      return lowestQuality.url || src;
    }
    return src;
  }, [shouldReduceData, qualityVariants, src]);

  // Placeholder state (not in view yet)
  if (!isInView) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black/50 rounded-xl ${className}`}
        style={{ aspectRatio }}
        role="region"
        aria-label={title || 'Video player'}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title || 'Video thumbnail'}
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white/70 ml-1" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black/50 rounded-xl flex items-center justify-center ${className}`}
        style={{ aspectRatio }}
        role="alert"
      >
        <div className="text-center p-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p className="text-gray-400">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
            }}
            className="mt-2 px-4 py-2 bg-white/10 rounded-lg text-sm text-white hover:bg-white/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Offline state
  if (!isOnline && !isLoaded) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black/50 rounded-xl flex items-center justify-center ${className}`}
        style={{ aspectRatio }}
      >
        <div className="text-center p-4">
          <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-500">Video unavailable offline</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-black rounded-xl group ${className}`}
      style={{ aspectRatio }}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      role="region"
      aria-label={title || 'Video player'}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={!hlsSrc ? getVideoSrc() : undefined}
        poster={thumbnail}
        autoPlay={autoPlay && !shouldReduceData}
        loop={loop}
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover"
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdateInternal}
        onDurationChange={handleDurationChange}
        onError={handleVideoError}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <Loader className="w-8 h-8 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Overlay */}
      {showTitle && title && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <h3 className="text-white font-medium">{title}</h3>
        </div>
      )}

      {/* Play Button Overlay (when paused) */}
      {!isPlaying && isLoaded && controls && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          aria-label="Play video"
        >
          <motion.div
            initial={false}
            animate={shouldReduceMotion ? {} : { scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </motion.div>
        </button>
      )}

      {/* Controls */}
      {controls && (
        <AnimatePresence>
          {(showControls || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
            >
              {/* Progress Bar */}
              <div
                className="relative h-1 bg-white/20 rounded-full mb-3 cursor-pointer"
                onClick={handleSeek}
                role="slider"
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={totalDuration}
                aria-valuenow={currentTime}
              >
                {/* Buffered */}
                <div
                  className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
                {/* Handle */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${(currentTime / totalDuration) * 100}% - 6px)` }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Left Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={handleRestart}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Restart"
                  >
                    <RotateCcw className="w-4 h-4 text-white" />
                  </button>

                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <span className="text-white/70 text-xs font-mono">
                    {formatTime(currentTime)} / {formatTime(totalDuration)}
                  </span>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  {/* Quality Settings */}
                  {qualityVariants.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Quality settings"
                      >
                        <Settings className="w-4 h-4 text-white" />
                      </button>

                      {/* Quality Menu */}
                      <AnimatePresence>
                        {showSettings && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 py-2 bg-black/90 backdrop-blur-sm rounded-lg min-w-[120px]"
                          >
                            <button
                              onClick={() => handleQualityChange('auto')}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${
                                selectedQuality === 'auto' ? 'text-blue-400' : 'text-white'
                              }`}
                            >
                              Auto
                            </button>
                            {qualityVariants.map((variant) => (
                              <button
                                key={variant.label}
                                onClick={() => handleQualityChange(variant.label)}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${
                                  selectedQuality === variant.label ? 'text-blue-400' : 'text-white'
                                }`}
                              >
                                {variant.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Toggle fullscreen"
                  >
                    <Maximize className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
});

export default VideoPlayer;
