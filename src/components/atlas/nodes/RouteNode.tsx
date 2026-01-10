/**
 * RouteNode - Custom React Flow node for route visualization
 *
 * Displays a route as a glass-styled node with protection indicators.
 */

import React, { memo } from 'react';
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

function RouteNodeComponent({ data }: NodeProps<RouteNodeData>) {
  const { route, category, isHighlighted, isCurrentRoute, onNavigate } = data;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-white/20 !border-white/30" />

      <div
        onClick={() => onNavigate(route.path)}
        className={`
          atlas-route-node group cursor-pointer
          px-3 py-2 rounded-lg min-w-[120px]
          bg-white/5 backdrop-blur-md
          border border-white/10
          transition-all duration-200
          hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5
          ${isHighlighted ? 'ring-2 ring-blue-400/50' : ''}
          ${isCurrentRoute ? 'ring-2 ring-pink-500/50 animate-pulse' : ''}
        `}
        style={{
          borderLeftColor: category.color,
          borderLeftWidth: '3px',
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
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white/20 !border-white/30" />
    </>
  );
}

export const RouteNode = memo(RouteNodeComponent);
