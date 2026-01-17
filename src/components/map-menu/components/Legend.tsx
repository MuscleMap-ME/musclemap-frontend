/**
 * Legend - Category Filter
 *
 * Displays map categories as filter buttons.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { LegendProps } from '../types';

export function Legend({
  categories,
  selectedCategory,
  onCategorySelect,
}: LegendProps) {
  return (
    <div
      className="
        absolute bottom-4 left-1/2 -translate-x-1/2 z-10
        flex items-center gap-2 px-3 py-2
        bg-glass-dark-30 backdrop-blur-glass-md
        border border-glass-default rounded-glass-xl
      "
      role="group"
      aria-label="Filter by category"
    >
      {/* All categories button */}
      <button
        onClick={() => onCategorySelect(null)}
        className={`
          px-3 py-1 rounded-glass-md text-xs font-medium
          transition-all duration-fast
          ${selectedCategory === null
            ? 'bg-glass-white-15 text-white'
            : 'text-white/50 hover:text-white/80 hover:bg-glass-white-5'
          }
        `}
        aria-pressed={selectedCategory === null}
      >
        All
      </button>

      {/* Category buttons */}
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onCategorySelect(isSelected ? null : category.id)}
            className={`
              relative flex items-center gap-1.5 px-3 py-1 rounded-glass-md
              text-xs font-medium transition-all duration-fast
              ${isSelected
                ? 'text-white'
                : 'text-white/50 hover:text-white/80'
              }
            `}
            aria-pressed={isSelected}
            style={{
              backgroundColor: isSelected
                ? `${category.color}33`
                : undefined,
            }}
          >
            {/* Color dot */}
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color }}
              animate={{
                scale: isSelected ? 1.2 : 1,
                boxShadow: isSelected
                  ? `0 0 8px ${category.color}`
                  : 'none',
              }}
            />

            {/* Label */}
            <span className="hidden sm:inline">{category.label}</span>
            <span className="sm:hidden">{category.icon}</span>

            {/* Node count badge */}
            <span className="hidden md:inline text-white/30 ml-1">
              {category.nodeCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default Legend;
