/**
 * AtlasControls - Zoom, pan, and search controls for the atlas
 */

import React from 'react';
import { useReactFlow } from 'reactflow';

interface AtlasControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch?: boolean;
}

export function AtlasControls({ searchQuery, onSearchChange, showSearch = true }: AtlasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
      {/* Search input */}
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search routes..."
            className="
              w-40 md:w-48 px-3 py-1.5 pr-8
              text-sm text-white placeholder-gray-400
              bg-white/10 backdrop-blur-md
              border border-white/10 rounded-lg
              focus:outline-none focus:border-blue-500/50
              transition-all
            "
          />
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {/* Zoom controls */}
      <div className="flex items-center gap-1 p-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg">
        <button
          onClick={() => zoomOut()}
          className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <button
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Fit to view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <button
          onClick={() => zoomIn()}
          className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
