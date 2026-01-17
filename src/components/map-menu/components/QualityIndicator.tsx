/**
 * QualityIndicator - FPS and Quality Display
 *
 * Shows current FPS and allows toggling between quality levels.
 */

import React from 'react';
import { Gauge, Zap, ZapOff } from 'lucide-react';
import type { QualityIndicatorProps, QualityLevel } from '../types';

const QUALITY_LABELS: Record<QualityLevel, string> = {
  lite: 'Lite',
  medium: 'Med',
  high: 'High',
};

const QUALITY_COLORS: Record<QualityLevel, string> = {
  lite: 'text-yellow-400',
  medium: 'text-blue-400',
  high: 'text-green-400',
};

export function QualityIndicator({
  level,
  fps,
  onToggle,
}: QualityIndicatorProps) {
  const fpsColor =
    fps >= 50 ? 'text-green-400' :
    fps >= 30 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <button
      onClick={onToggle}
      className="
        flex items-center gap-2 px-2 py-1
        bg-glass-dark-30 backdrop-blur-glass-md
        border border-glass-default rounded-glass-md
        hover:bg-glass-white-5 transition-colors duration-fast
        text-xs
      "
      title={`Quality: ${QUALITY_LABELS[level]} | FPS: ${fps}\nClick to toggle`}
    >
      {/* Quality indicator */}
      <span className={`flex items-center gap-1 ${QUALITY_COLORS[level]}`}>
        {level === 'lite' ? (
          <ZapOff className="w-3 h-3" />
        ) : (
          <Zap className="w-3 h-3" />
        )}
        <span className="hidden sm:inline">{QUALITY_LABELS[level]}</span>
      </span>

      {/* Divider */}
      <span className="w-px h-3 bg-white/20" />

      {/* FPS counter */}
      <span className={`flex items-center gap-1 ${fpsColor}`}>
        <Gauge className="w-3 h-3" />
        <span>{fps}</span>
      </span>
    </button>
  );
}

export default QualityIndicator;
