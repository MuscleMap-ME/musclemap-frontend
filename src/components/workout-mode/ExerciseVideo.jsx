/**
 * ExerciseVideo Component
 *
 * Video demonstration panel for exercises within workout mode.
 * Features:
 * - Multiple view angles (front, side, back, detail)
 * - Video type tabs (demonstration, common mistakes, cues)
 * - Lazy loading with placeholder
 * - Responsive player controls
 * - Offline fallback
 */

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Play, Video, Eye, AlertCircle, X } from 'lucide-react';
import { useShouldReduceMotion } from '../../contexts/MotionContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Lazy load the video player for better initial load performance
const VideoPlayer = lazy(() => import('../video/VideoPlayer'));

/**
 * Video type configuration
 */
const VIDEO_TYPES = [
  { id: 'demonstration', label: 'Demo', icon: Play },
  { id: 'common_mistakes', label: 'Mistakes', icon: AlertCircle },
  { id: 'cues', label: 'Cues', icon: Eye },
];

/**
 * View angle labels
 */
const VIEW_ANGLE_LABELS = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  detail: 'Detail',
  overhead: 'Overhead',
};

/**
 * Loading skeleton for video player
 */
function VideoSkeleton({ aspectRatio = '16/9' }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden bg-white/5"
      style={{ aspectRatio }}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/5 to-white/10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
          <Play className="w-6 h-6 text-white/50 ml-0.5" />
        </div>
      </div>
    </div>
  );
}

/**
 * ExerciseVideo Component
 */
export function ExerciseVideo({
  exerciseId,
  exerciseName,
  videos = [],
  hasVideo = false,
  videoUrl = null,
  thumbnailUrl = null,
  duration = null,
  className = '',
  onVideoWatch = null,
  compact = false,
}) {
  const shouldReduceMotion = useShouldReduceMotion();
  const { isOnline } = useNetworkStatus();

  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState('demonstration');
  const [selectedAngle, setSelectedAngle] = useState('front');

  // Group videos by type and angle
  const videosByType = videos.reduce((acc, video) => {
    const type = video.videoType || video.video_type || 'demonstration';
    if (!acc[type]) acc[type] = [];
    acc[type].push(video);
    return acc;
  }, {});

  // Get available angles for selected type
  const availableAngles = videosByType[selectedType]?.map(v => v.viewAngle || v.view_angle) || [];

  // Get current video
  const currentVideo = videosByType[selectedType]?.find(
    v => (v.viewAngle || v.view_angle) === selectedAngle
  ) || videosByType[selectedType]?.[0];

  // Handle video play
  const handlePlay = useCallback(() => {
    onVideoWatch?.({ exerciseId, videoId: currentVideo?.id });
  }, [exerciseId, currentVideo, onVideoWatch]);

  // Handle video ended
  const handleEnded = useCallback(() => {
    // Video ended - could track completion here
  }, []);

  // If no video available, show placeholder
  if (!hasVideo && !videoUrl && videos.length === 0) {
    return (
      <div className={`rounded-xl bg-white/5 p-4 text-center ${className}`}>
        <Video className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No video available</p>
      </div>
    );
  }

  // Offline without cached video
  if (!isOnline && !currentVideo?.videoUrl) {
    return (
      <div className={`rounded-xl bg-white/5 p-4 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Video unavailable offline</p>
      </div>
    );
  }

  // Compact mode - just thumbnail with play button
  if (compact && !isExpanded) {
    return (
      <motion.button
        onClick={() => setIsExpanded(true)}
        className={`relative rounded-xl overflow-hidden bg-black group ${className}`}
        style={{ aspectRatio: '16/9' }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      >
        {/* Thumbnail */}
        {thumbnailUrl || currentVideo?.thumbnailUrl ? (
          <img
            src={thumbnailUrl || currentVideo?.thumbnailUrl}
            alt={`${exerciseName} demonstration`}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900/30 to-black" />
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>

        {/* Label */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
          <span className="text-white text-xs font-medium">Watch Demo</span>
        </div>
      </motion.button>
    );
  }

  return (
    <div className={`rounded-xl bg-white/5 overflow-hidden ${className}`}>
      {/* Video Player */}
      <div className="relative">
        <Suspense fallback={<VideoSkeleton />}>
          <VideoPlayer
            src={currentVideo?.videoUrl || currentVideo?.video_url || videoUrl}
            hlsSrc={currentVideo?.hlsUrl || currentVideo?.hls_url}
            thumbnail={currentVideo?.thumbnailUrl || currentVideo?.thumbnail_url || thumbnailUrl}
            title={`${exerciseName} - ${VIEW_ANGLE_LABELS[selectedAngle] || selectedAngle} View`}
            duration={currentVideo?.durationSeconds || currentVideo?.duration_seconds || duration || 0}
            loop
            muted
            controls
            onPlay={handlePlay}
            onEnded={handleEnded}
            aspectRatio="16/9"
            qualityVariants={currentVideo?.qualityVariants || currentVideo?.quality_variants || []}
          />
        </Suspense>

        {/* Close button in expanded mode */}
        {compact && isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Close video"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Controls Panel */}
      {(availableAngles.length > 1 || Object.keys(videosByType).length > 1) && (
        <div className="p-3 border-t border-white/10">
          {/* Video Type Tabs */}
          {Object.keys(videosByType).length > 1 && (
            <div className="flex gap-1 mb-3">
              {VIDEO_TYPES.filter(t => videosByType[t.id]?.length > 0).map(type => {
                const Icon = type.icon;
                const isActive = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id);
                      // Reset to first available angle for this type
                      const angles = videosByType[type.id]?.map(v => v.viewAngle || v.view_angle);
                      if (angles?.length && !angles.includes(selectedAngle)) {
                        setSelectedAngle(angles[0]);
                      }
                    }}
                    className={`
                      flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-white/5 text-gray-400 hover:text-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* View Angle Selector */}
          {availableAngles.length > 1 && (
            <div className="flex gap-2">
              <span className="text-gray-500 text-xs py-1">Angle:</span>
              <div className="flex gap-1 flex-wrap">
                {availableAngles.map(angle => (
                  <button
                    key={angle}
                    onClick={() => setSelectedAngle(angle)}
                    className={`
                      px-2 py-1 rounded text-xs font-medium transition-colors
                      ${selectedAngle === angle
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-gray-400 hover:text-gray-300'
                      }
                    `}
                  >
                    {VIEW_ANGLE_LABELS[angle] || angle}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ExerciseVideoButton - Compact button to show video
 * Use this inline with other exercise info
 */
export function ExerciseVideoButton({
  exerciseName,
  hasVideo = false,
  onClick = null,
  className = '',
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  if (!hasVideo) {
    return null;
  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        bg-blue-500/20 text-blue-400 hover:bg-blue-500/30
        text-sm font-medium transition-colors
        ${className}
      `}
      aria-label={`Watch ${exerciseName} video demonstration`}
    >
      <Play className="w-4 h-4" />
      Video
    </motion.button>
  );
}

export default ExerciseVideo;
