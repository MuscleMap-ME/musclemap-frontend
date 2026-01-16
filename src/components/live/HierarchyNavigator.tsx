/**
 * HierarchyNavigator Component
 *
 * Breadcrumb navigation for geographic drill-down.
 * Shows: Global > Country > Region > City (counts only, no user data)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Globe, MapPin, Building2, Home } from 'lucide-react';

const LEVEL_ICONS = {
  global: Globe,
  country: MapPin,
  region: Building2,
  city: Home,
};

const LEVEL_LABELS = {
  global: 'Global',
  country: 'Country',
  region: 'Region',
  city: 'City',
};

function HierarchyNavigator({ timeWindow = '1h', onLevelChange, className = '' }) {
  const [path, setPath] = useState([{ level: 'global', code: null, name: 'Global' }]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentLevel = path[path.length - 1];

  // Fetch children for current level
  const fetchChildren = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/live/hierarchy/${currentLevel.level}?window=${timeWindow}`;
      if (currentLevel.code) {
        url += `&parent=${encodeURIComponent(currentLevel.code)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch hierarchy');
      const json = await res.json();
      setChildren(json.data || []);
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [currentLevel, timeWindow]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // Navigate to a child
  const handleDrillDown = (child) => {
    const nextLevel = currentLevel.level === 'global' ? 'country'
      : currentLevel.level === 'country' ? 'region'
      : 'city';

    if (nextLevel === 'city') {
      // Can't drill down further
      return;
    }

    const newLevel = {
      level: nextLevel,
      code: child.code,
      name: child.name,
    };

    setPath([...path, newLevel]);
    onLevelChange?.(newLevel, [...path, newLevel]);
  };

  // Navigate back to a breadcrumb level
  const handleBreadcrumbClick = (index) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    onLevelChange?.(newPath[newPath.length - 1], newPath);
  };

  const LevelIcon = LEVEL_ICONS[currentLevel.level];

  return (
    <div className={`bg-black/20 rounded-xl border border-white/5 ${className}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 overflow-x-auto">
        {path.map((item, index) => {
          const Icon = LEVEL_ICONS[item.level];
          const isLast = index === path.length - 1;

          return (
            <React.Fragment key={`${item.level}-${item.code || 'root'}`}>
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
              )}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                disabled={isLast}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
                  isLast
                    ? 'bg-blue-500/20 text-blue-400 cursor-default'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Children list */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
            <LevelIcon className="w-4 h-4" />
            {LEVEL_LABELS[currentLevel.level]} breakdown
          </h3>
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>

        {children.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">
            {loading ? 'Loading...' : 'No activity data for this region'}
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {children.map((child) => (
              <button
                key={child.code}
                onClick={() => handleDrillDown(child)}
                disabled={currentLevel.level === 'region'}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  currentLevel.level === 'region'
                    ? 'bg-white/5 cursor-default'
                    : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                }`}
              >
                <span className="text-sm text-white/80">{child.name || child.code}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-400">{child.count}</span>
                  {currentLevel.level !== 'region' && (
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HierarchyNavigator;
