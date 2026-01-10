/**
 * AtlasLegend - Category and protection legend for the atlas
 */

import React, { useState } from 'react';
import type { RouteCategory } from '../atlasTypes';

interface AtlasLegendProps {
  categories: RouteCategory[];
  activeCategories: string[];
  onToggleCategory: (categoryId: string) => void;
}

export function AtlasLegend({ categories, activeCategories, onToggleCategory }: AtlasLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden">
        {/* Toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 w-full transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>Legend</span>
        </button>

        {/* Legend content */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/10">
            {/* Categories */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                Categories
              </div>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onToggleCategory(category.id)}
                  className={`
                    flex items-center gap-2 text-xs w-full px-1.5 py-0.5 rounded
                    transition-colors
                    ${activeCategories.includes(category.id)
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.label}</span>
                </button>
              ))}
            </div>

            {/* Protection indicators */}
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                Access Level
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 px-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <span>Public</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 px-1.5">
                <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Login Required</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 px-1.5">
                <svg className="w-2.5 h-2.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Admin Only</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
