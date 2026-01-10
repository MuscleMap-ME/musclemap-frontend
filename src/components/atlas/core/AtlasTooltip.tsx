/**
 * AtlasTooltip - Hover/tap tooltip for atlas nodes
 *
 * Displays route information with navigation action.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RouteNode } from '../atlasTypes';

interface AtlasTooltipProps {
  route: RouteNode | null;
  position: { x: number; y: number } | null;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

const protectionLabels = {
  public: { label: 'Public', color: 'text-green-400', bg: 'bg-green-500/20' },
  protected: { label: 'Login Required', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  admin: { label: 'Admin Only', color: 'text-red-400', bg: 'bg-red-500/20' },
};

export function AtlasTooltip({ route, position, onNavigate, onClose }: AtlasTooltipProps) {
  if (!route || !position) return null;

  const protection = protectionLabels[route.protection];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)',
          marginTop: -10,
        }}
      >
        <div
          className="
            min-w-[200px] max-w-[280px] p-4 rounded-xl
            bg-gray-900/95 backdrop-blur-xl
            border border-white/10
            shadow-2xl shadow-black/50
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-white text-base">{route.label}</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Path */}
          <div className="text-xs text-gray-500 font-mono mb-2">{route.path}</div>

          {/* Description */}
          <p className="text-sm text-gray-300 mb-3">{route.description}</p>

          {/* Protection badge */}
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded ${protection.bg} ${protection.color}`}>
              {protection.label}
            </span>

            {/* Navigate button */}
            <button
              onClick={() => onNavigate(route.path)}
              className="
                flex items-center gap-1.5
                px-3 py-1.5 rounded-lg
                bg-blue-500/20 text-blue-400
                hover:bg-blue-500/30 hover:text-blue-300
                transition-colors text-sm font-medium
              "
            >
              Go
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Arrow */}
          <div
            className="absolute left-1/2 bottom-0 w-3 h-3 bg-gray-900/95 border-r border-b border-white/10"
            style={{
              transform: 'translate(-50%, 50%) rotate(45deg)',
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
