import React from 'react';

/**
 * Skeleton for 3D Atlas/Muscle visualization components
 */
function AtlasSkeleton({ height = 400, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-900/50 ${className}`}
      style={{ height }}
    >
      {/* Background pulse */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/30 to-gray-900/30 animate-pulse" />

      {/* 3D figure outline placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="w-48 h-64 text-gray-700/50 animate-pulse"
          viewBox="0 0 100 150"
          fill="currentColor"
        >
          {/* Simplified human figure */}
          <ellipse cx="50" cy="20" rx="15" ry="18" /> {/* Head */}
          <rect x="35" y="38" width="30" height="50" rx="5" /> {/* Torso */}
          <rect x="20" y="42" width="15" height="35" rx="3" /> {/* Left arm */}
          <rect x="65" y="42" width="15" height="35" rx="3" /> {/* Right arm */}
          <rect x="35" y="88" width="12" height="45" rx="3" /> {/* Left leg */}
          <rect x="53" y="88" width="12" height="45" rx="3" /> {/* Right leg */}
        </svg>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-500 text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Loading 3D Model...</span>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-gray-700/50 rounded-tl-lg" />
      <div className="absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-gray-700/50 rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-gray-700/50 rounded-bl-lg" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-gray-700/50 rounded-br-lg" />
    </div>
  );
}

export default AtlasSkeleton;
