/**
 * ViewSelector - View Type Toggle
 *
 * Tab buttons to switch between Globe, Stars, and Rooms visualization modes.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Sparkles, Building2 } from 'lucide-react';
import type { ViewSelectorProps, MapViewType } from '../types';

interface ViewOption {
  type: MapViewType;
  label: string;
  icon: React.ReactNode;
}

const VIEW_OPTIONS: ViewOption[] = [
  { type: 'world', label: 'Globe', icon: <Globe className="w-4 h-4" /> },
  { type: 'constellation', label: 'Stars', icon: <Sparkles className="w-4 h-4" /> },
  { type: 'isometric', label: 'Rooms', icon: <Building2 className="w-4 h-4" /> },
];

export function ViewSelector({
  currentView,
  onViewChange,
  onViewHover,
  disabled = false,
}: ViewSelectorProps) {
  return (
    <div
      className="
        flex items-center gap-1 p-1
        bg-glass-dark-30 backdrop-blur-glass-md
        border border-glass-default rounded-glass-lg
      "
      role="tablist"
      aria-label="Map visualization style"
    >
      {VIEW_OPTIONS.map((option) => {
        const isActive = currentView === option.type;

        return (
          <button
            key={option.type}
            onClick={() => onViewChange(option.type)}
            onMouseEnter={() => onViewHover?.(option.type)}
            onFocus={() => onViewHover?.(option.type)}
            disabled={disabled}
            role="tab"
            aria-selected={isActive}
            aria-controls={`map-view-${option.type}`}
            className={`
              relative flex items-center gap-2 px-3 py-1.5 rounded-glass-md
              text-sm font-medium transition-colors duration-fast
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? 'text-white'
                : 'text-white/60 hover:text-white/80'
              }
            `}
          >
            {/* Active background indicator */}
            {isActive && (
              <motion.div
                layoutId="viewSelector-active"
                className="absolute inset-0 bg-glass-brand-medium rounded-glass-md"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ViewSelector;
