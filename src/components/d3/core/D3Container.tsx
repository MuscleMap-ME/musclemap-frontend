/**
 * D3Container - Glass-styled container for D3 visualizations
 *
 * Features:
 * - Glassmorphism design
 * - Responsive sizing
 * - Loading states
 * - Error boundaries
 */

import React, { ReactNode, forwardRef } from 'react';
import clsx from 'clsx';

export interface D3ContainerProps {
  children: ReactNode;
  className?: string;
  height?: number | string;
  width?: number | string;
  loading?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  glassmorphism?: boolean;
  noPadding?: boolean;
}

export const D3Container = forwardRef<HTMLDivElement, D3ContainerProps>(
  (
    {
      children,
      className = '',
      height = 400,
      width = '100%',
      loading = false,
      error = null,
      title,
      subtitle,
      glassmorphism = true,
      noPadding = false,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'relative overflow-hidden rounded-2xl',
          glassmorphism && [
            'bg-white/5 backdrop-blur-xl',
            'border border-white/10',
            'shadow-2xl shadow-black/20',
          ],
          !noPadding && 'p-6',
          className
        )}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
        }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-4">
            {title && (
              <h3
                className="text-xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </div>
        )}

        {/* Content */}
        <div className="relative h-full w-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10 rounded-xl">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <div className="absolute inset-2 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin animate-reverse" />
                </div>
                <span className="text-sm text-gray-400">Loading visualization...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-sm z-10 rounded-xl">
              <div className="text-center p-6">
                <div className="text-4xl mb-3">⚠️</div>
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            </div>
          )}

          {children}
        </div>

        {/* Ambient glow effect */}
        {glassmorphism && (
          <>
            <div
              className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full pointer-events-none opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <div
              className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
          </>
        )}
      </div>
    );
  }
);

D3Container.displayName = 'D3Container';

// Add reverse animation keyframe
const style = document.createElement('style');
style.textContent = `
  @keyframes spin-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
  .animate-reverse {
    animation-direction: reverse;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#d3-container-styles')) {
  style.id = 'd3-container-styles';
  document.head.appendChild(style);
}
