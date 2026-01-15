/**
 * PhotoGuide - Overlay positioning guide for consistent progress photos
 *
 * Displays alignment guides (grid, silhouette, markers) to help users
 * take consistently positioned photos for better comparison.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/**
 * Guide types for different poses
 */
const GUIDE_TYPES = {
  front: {
    id: 'front',
    label: 'Front Pose',
    icon: '🧍',
    description: 'Stand facing the camera, arms at sides or slightly away',
  },
  back: {
    id: 'back',
    label: 'Back Pose',
    icon: '🔙',
    description: 'Stand with your back to the camera, arms at sides',
  },
  left_side: {
    id: 'left_side',
    label: 'Left Side',
    icon: '👈',
    description: 'Turn to show your left profile',
  },
  right_side: {
    id: 'right_side',
    label: 'Right Side',
    icon: '👉',
    description: 'Turn to show your right profile',
  },
  flexed: {
    id: 'flexed',
    label: 'Front Flexed',
    icon: '💪',
    description: 'Double bicep pose facing forward',
  },
};

/**
 * PhotoGuide Component
 *
 * @param {Object} props
 * @param {string} [props.guideType] - Type of pose guide to display
 * @param {boolean} [props.showGrid] - Show alignment grid
 * @param {boolean} [props.showSilhouette] - Show body silhouette outline
 * @param {number} [props.opacity] - Guide opacity (0-1)
 * @param {Function} [props.onCapture] - Callback when user takes photo
 * @param {string} [props.className] - Additional CSS classes
 */
export function PhotoGuide({
  guideType = 'front',
  showGrid = true,
  showSilhouette = true,
  opacity = 0.5,
  onCapture,
  className,
}) {
  const [showControls, setShowControls] = useState(true);
  const [localGuideType, setLocalGuideType] = useState(guideType);
  const [localShowGrid, setLocalShowGrid] = useState(showGrid);
  const [localShowSilhouette, setLocalShowSilhouette] = useState(showSilhouette);
  const [localOpacity, setLocalOpacity] = useState(opacity);

  const guide = GUIDE_TYPES[localGuideType] || GUIDE_TYPES.front;

  return (
    <div className={clsx('relative w-full h-full', className)}>
      {/* Main Guide Container */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid Overlay */}
        <AnimatePresence>
          {localShowGrid && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: localOpacity }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <GridOverlay />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Silhouette Guide */}
        <AnimatePresence>
          {localShowSilhouette && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: localOpacity }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <SilhouetteGuide type={localGuideType} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="w-4 h-4 border-2 border-white rounded-full"
            style={{ opacity: localOpacity }}
          />
        </div>

        {/* Alignment Markers */}
        <AlignmentMarkers opacity={localOpacity} />
      </div>

      {/* Controls Toggle */}
      <button
        onClick={() => setShowControls(!showControls)}
        className={clsx(
          'absolute top-4 right-4 z-20',
          'w-10 h-10 rounded-full glass',
          'flex items-center justify-center',
          'text-white transition-transform',
          showControls && 'rotate-45'
        )}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-16 right-4 z-20 glass rounded-2xl p-4 space-y-4 w-64"
          >
            {/* Pose Type Selector */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Pose Guide
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(GUIDE_TYPES).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setLocalGuideType(g.id)}
                    className={clsx(
                      'p-2 rounded-xl text-center transition-colors',
                      localGuideType === g.id
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    )}
                    title={g.label}
                  >
                    <span className="text-xl">{g.icon}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{guide.description}</p>
            </div>

            {/* Toggle Options */}
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-300">Show Grid</span>
                <button
                  onClick={() => setLocalShowGrid(!localShowGrid)}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-colors relative',
                    localShowGrid ? 'bg-[var(--brand-blue-500)]' : 'bg-gray-600'
                  )}
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                      localShowGrid ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-300">Show Silhouette</span>
                <button
                  onClick={() => setLocalShowSilhouette(!localShowSilhouette)}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-colors relative',
                    localShowSilhouette ? 'bg-[var(--brand-blue-500)]' : 'bg-gray-600'
                  )}
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                      localShowSilhouette ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </label>
            </div>

            {/* Opacity Slider */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Guide Opacity: {Math.round(localOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localOpacity}
                onChange={(e) => setLocalOpacity(parseFloat(e.target.value))}
                className="w-full accent-[var(--brand-blue-500)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture Button */}
      {onCapture && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <motion.button
            onClick={() => onCapture(localGuideType)}
            className={clsx(
              'w-16 h-16 rounded-full',
              'bg-white/20 backdrop-blur-md border-4 border-white',
              'flex items-center justify-center',
              'shadow-[0_0_20px_rgba(255,255,255,0.3)]'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </motion.button>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-sm text-white/70 max-w-xs">
        <p>Align your body with the guide for consistent progress photos</p>
      </div>
    </div>
  );
}

/**
 * GridOverlay - Rule of thirds grid for alignment
 */
function GridOverlay() {
  return (
    <svg className="w-full h-full" preserveAspectRatio="none">
      {/* Vertical lines */}
      <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="white" strokeWidth="1" />
      <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="white" strokeWidth="1" />

      {/* Horizontal lines */}
      <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="white" strokeWidth="1" />
      <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="white" strokeWidth="1" />

      {/* Center crosshair */}
      <line x1="50%" y1="45%" x2="50%" y2="55%" stroke="white" strokeWidth="2" />
      <line x1="45%" y1="50%" x2="55%" y2="50%" stroke="white" strokeWidth="2" />
    </svg>
  );
}

/**
 * AlignmentMarkers - Corner and edge markers for framing
 */
function AlignmentMarkers({ opacity }) {
  const markerSize = 30;
  const markerWeight = 3;

  const corners = [
    { position: 'top-4 left-4', rotation: 0 },
    { position: 'top-4 right-4', rotation: 90 },
    { position: 'bottom-4 right-4', rotation: 180 },
    { position: 'bottom-4 left-4', rotation: 270 },
  ];

  return (
    <>
      {corners.map((corner, i) => (
        <div
          key={i}
          className={`absolute ${corner.position}`}
          style={{
            width: markerSize,
            height: markerSize,
            opacity,
            transform: `rotate(${corner.rotation}deg)`,
          }}
        >
          <div
            className="absolute top-0 left-0 bg-white"
            style={{ width: markerSize, height: markerWeight }}
          />
          <div
            className="absolute top-0 left-0 bg-white"
            style={{ width: markerWeight, height: markerSize }}
          />
        </div>
      ))}
    </>
  );
}

/**
 * SilhouetteGuide - Body outline for pose alignment
 */
function SilhouetteGuide({ type }) {
  // SVG paths for different poses
  const silhouettes = {
    front: (
      <path
        d="M50 10
           C45 10 42 15 42 20
           C42 28 45 32 50 32
           C55 32 58 28 58 20
           C58 15 55 10 50 10
           M45 34 L40 35 L38 45 L40 75 L38 100
           M55 34 L60 35 L62 45 L60 75 L62 100
           M40 35 L38 50 L35 80 L32 95
           M60 35 L62 50 L65 80 L68 95"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
    ),
    back: (
      <path
        d="M50 10
           C45 10 42 15 42 20
           C42 28 45 32 50 32
           C55 32 58 28 58 20
           C58 15 55 10 50 10
           M45 34 L40 35 L38 45 L40 75 L38 100
           M55 34 L60 35 L62 45 L60 75 L62 100
           M40 35 L38 50 L35 80 L32 95
           M60 35 L62 50 L65 80 L68 95
           M42 38 L42 50 M58 38 L58 50"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
    ),
    left_side: (
      <path
        d="M50 10
           C47 10 45 15 45 20
           C45 28 48 32 50 32
           C52 32 55 28 55 20
           C55 15 53 10 50 10
           M50 34 L52 40 L54 75 L52 100
           M50 35 L48 50 L45 80 L42 95"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
    ),
    right_side: (
      <path
        d="M50 10
           C47 10 45 15 45 20
           C45 28 48 32 50 32
           C52 32 55 28 55 20
           C55 15 53 10 50 10
           M50 34 L48 40 L46 75 L48 100
           M50 35 L52 50 L55 80 L58 95"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
    ),
    flexed: (
      <path
        d="M50 10
           C45 10 42 15 42 20
           C42 28 45 32 50 32
           C55 32 58 28 58 20
           C58 15 55 10 50 10
           M45 34 L40 35 L38 45 L40 75 L38 100
           M55 34 L60 35 L62 45 L60 75 L62 100
           M40 35 L35 30 L32 25 L38 28 L40 35
           M60 35 L65 30 L68 25 L62 28 L60 35"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
    ),
  };

  return (
    <svg
      viewBox="0 0 100 110"
      className="w-auto h-3/4 max-h-[80%]"
      style={{ opacity: 0.6 }}
    >
      {silhouettes[type] || silhouettes.front}
    </svg>
  );
}

/**
 * PhotoGuideOverlay - Simplified overlay for use in camera view
 */
export function PhotoGuideOverlay({
  type = 'front',
  showGrid = true,
  opacity = 0.4,
  className,
}) {
  return (
    <div className={clsx('absolute inset-0 pointer-events-none', className)}>
      {showGrid && (
        <div style={{ opacity }}>
          <GridOverlay />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity }}>
        <SilhouetteGuide type={type} />
      </div>
      <AlignmentMarkers opacity={opacity} />
    </div>
  );
}

export default PhotoGuide;
