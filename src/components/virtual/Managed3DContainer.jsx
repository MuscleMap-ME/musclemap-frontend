/**
 * Managed3DContainer - Memory-managed wrapper for 3D content
 *
 * Automatically handles:
 * - Unloading 3D when scrolled out of view
 * - Showing placeholder when memory is low
 * - Quality degradation based on device tier
 * - Graceful fallback for unsupported devices
 *
 * @example
 * <Managed3DContainer
 *   fallback={<Static2DImage />}
 *   placeholder={<LoadingSpinner />}
 * >
 *   <My3DComponent />
 * </Managed3DContainer>
 */

import React, { Suspense, lazy } from 'react';
import { use3DMemoryManager } from '../../hooks/use3DMemoryManager';

/**
 * Default placeholder while 3D loads or when hidden
 */
function DefaultPlaceholder({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg ${className}`}
    >
      <div className="text-center text-gray-400">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-500/20 animate-pulse" />
        <span className="text-sm">Loading 3D...</span>
      </div>
    </div>
  );
}

/**
 * Default fallback when 3D is disabled
 */
function DefaultFallback({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg ${className}`}
    >
      <div className="text-center text-gray-400">
        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40" />
        <span className="text-sm">3D disabled for performance</span>
      </div>
    </div>
  );
}

/**
 * Memory warning indicator
 */
function MemoryWarning() {
  return (
    <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded">
      Low memory - reduced quality
    </div>
  );
}

/**
 * Managed3DContainer Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The 3D content to render
 * @param {React.ReactNode} [props.fallback] - Fallback when 3D is disabled
 * @param {React.ReactNode} [props.placeholder] - Placeholder while loading/hidden
 * @param {boolean} [props.enabled] - Override whether 3D should be enabled
 * @param {boolean} [props.unloadWhenHidden] - Unload when scrolled out of view
 * @param {boolean} [props.showMemoryWarning] - Show indicator when memory is low
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Inline styles
 */
export function Managed3DContainer({
  children,
  fallback = <DefaultFallback />,
  placeholder = <DefaultPlaceholder />,
  enabled = true,
  unloadWhenHidden = true,
  showMemoryWarning = false,
  className = '',
  style = {},
}) {
  const {
    containerRef,
    shouldRender,
    quality,
    isMemoryWarning,
    isMemoryCritical,
    deviceTier,
  } = use3DMemoryManager({
    enabled,
    unloadWhenHidden,
    respectMemoryPressure: true,
  });

  // Clone children with quality prop if needed
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        quality,
        deviceTier,
        // Only pass if the component accepts these props
        ...(child.props.quality === undefined ? { quality } : {}),
        ...(child.props.deviceTier === undefined ? { deviceTier } : {}),
      });
    }
    return child;
  });

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={style}
      data-3d-quality={quality}
      data-3d-rendered={shouldRender}
    >
      {shouldRender ? (
        <Suspense fallback={placeholder}>
          {enhancedChildren}
          {showMemoryWarning && isMemoryWarning && !isMemoryCritical && (
            <MemoryWarning />
          )}
        </Suspense>
      ) : (
        // Show fallback when 3D is disabled
        React.cloneElement(
          React.isValidElement(fallback) ? fallback : <>{fallback}</>,
          { className: `${fallback.props?.className || ''} w-full h-full` }
        )
      )}
    </div>
  );
}

/**
 * Lazy3DLoader - Lazy loads a 3D component with memory management
 *
 * @example
 * const ManagedMascot = Lazy3DLoader(
 *   () => import('../mascot/global/GlobalMascot3D'),
 *   { fallback: <StaticMascotImage /> }
 * );
 */
export function Lazy3DLoader(importFn, options = {}) {
  const Lazy3DComponent = lazy(importFn);

  return function ManagedLazy3D(props) {
    return (
      <Managed3DContainer {...options} {...props}>
        <Lazy3DComponent {...props} />
      </Managed3DContainer>
    );
  };
}

export default Managed3DContainer;
