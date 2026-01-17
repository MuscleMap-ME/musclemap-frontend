/**
 * NodeTooltip - Hover Information Display
 *
 * Shows details about the hovered map node.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { NodeTooltipProps } from '../types';

export function NodeTooltip({ node }: NodeTooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="
        absolute top-20 left-1/2 -translate-x-1/2 z-20
        px-4 py-3 min-w-[200px] max-w-[300px]
        bg-glass-dark-40 backdrop-blur-glass-lg
        border border-glass-default rounded-glass-lg
        shadow-glass-lg
      "
      role="tooltip"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {node.metadata?.icon && (
          <span className="text-2xl">{node.metadata.icon}</span>
        )}

        <div className="flex-1 min-w-0">
          {/* Label */}
          <h4 className="text-white font-semibold text-sm truncate">
            {node.label}
          </h4>

          {/* Description */}
          {node.metadata?.description && (
            <p className="text-white/60 text-xs mt-1">
              {node.metadata.description}
            </p>
          )}

          {/* Route hint */}
          <p className="text-white/30 text-xs mt-2 font-mono">
            {node.route}
          </p>
        </div>
      </div>

      {/* Pointer */}
      <div
        className="
          absolute -top-2 left-1/2 -translate-x-1/2
          w-4 h-4 rotate-45
          bg-glass-dark-40 border-l border-t border-glass-default
        "
      />
    </motion.div>
  );
}

export default NodeTooltip;
