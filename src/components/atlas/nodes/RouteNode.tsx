/**
 * RouteNode - Custom React Flow node for route visualization
 *
 * Displays a route as a glass-styled node with protection indicators.
 * Click to show tooltip with description and Go button.
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { RouteNodeData } from '../atlasTypes';

const protectionIcons = {
  public: null,
  protected: (
    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  admin: (
    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

const protectionLabels = {
  public: 'Public',
  protected: 'Login required',
  admin: 'Admin only',
};

function RouteNodeComponent({ data }: NodeProps<RouteNodeData>) {
  const { route, category, isHighlighted, isCurrentRoute, onNavigate } = data;
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };

    // Use timeout to avoid immediate close from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTooltip]);

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowTooltip(!showTooltip);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onNavigate(route.path);
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-white/20 !border-white/30 !pointer-events-none" />

      <div
        ref={nodeRef}
        onClick={handleNodeClick}
        onMouseDown={(e) => e.stopPropagation()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNodeClick(e as any); }}
        className={`
          atlas-route-node group cursor-pointer relative
          px-3 py-2 rounded-lg min-w-[120px]
          bg-white/5 backdrop-blur-md
          border border-white/10
          transition-all duration-200
          hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5
          select-none
          ${isHighlighted ? 'ring-2 ring-blue-400/50' : ''}
          ${isCurrentRoute ? 'ring-2 ring-pink-500/50 animate-pulse' : ''}
          ${showTooltip ? 'ring-2 ring-white/30' : ''}
        `}
        style={{
          borderLeftColor: category.color,
          borderLeftWidth: '3px',
          pointerEvents: 'all',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Protection indicator */}
          {protectionIcons[route.protection]}

          {/* Route label */}
          <span className="font-medium text-white text-sm truncate">
            {route.label}
          </span>

          {/* Badge */}
          {route.badge && (
            <span className="px-1.5 py-0.5 text-[10px] bg-pink-500/30 text-pink-300 rounded font-medium">
              {route.badge}
            </span>
          )}
        </div>

        {/* Description on hover */}
        <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[150px] opacity-70 group-hover:opacity-100">
          {route.description}
        </div>

        {/* Tooltip popup */}
        {showTooltip && (
          <div
            ref={tooltipRef}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs text-gray-400">{category.label}</span>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-white text-base mb-1">{route.label}</h4>

              {/* Description */}
              <p className="text-sm text-gray-300 mb-3">{route.description}</p>

              {/* Path */}
              <div className="text-xs text-gray-500 font-mono mb-3">{route.path}</div>

              {/* Protection badge */}
              <div className="flex items-center gap-2 mb-4">
                {protectionIcons[route.protection]}
                <span className={`text-xs ${route.protection === 'public' ? 'text-green-400' : 'text-amber-400'}`}>
                  {protectionLabels[route.protection]}
                </span>
              </div>

              {/* Go button */}
              <button
                onClick={handleNavigate}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Go to {route.label}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-gray-900/95 border-b border-r border-white/20 transform rotate-45" />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white/20 !border-white/30 !pointer-events-none" />
    </>
  );
}

export const RouteNode = memo(RouteNodeComponent);
