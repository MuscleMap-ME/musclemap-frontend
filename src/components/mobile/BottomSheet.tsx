/**
 * BottomSheet Component
 *
 * A mobile-optimized modal that slides up from the bottom of the screen.
 * Supports drag-to-dismiss, snap points, and safe area insets.
 *
 * CRITICAL: Uses getIsRestrictive() to detect iOS Lockdown Mode + Brave,
 * falling back to static rendering when framer-motion might fail.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useMotion } from '../../contexts/MotionContext';
import { getIsRestrictive } from '../../utils/safeMotion';

interface BottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Title for the sheet header */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Snap points as percentages of screen height (default: [0.5, 0.9]) */
  snapPoints?: number[];
  /** Initial snap point index (default: 0) */
  initialSnap?: number;
  /** Whether to show the drag handle (default: true) */
  showHandle?: boolean;
  /** Whether to show close button (default: true) */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes the sheet (default: true) */
  closeOnBackdrop?: boolean;
  /** Custom class for the sheet container */
  className?: string;
}

const DRAG_CLOSE_THRESHOLD = 150; // pixels to drag down before closing

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  showHandle = true,
  showCloseButton = true,
  closeOnBackdrop = true,
  className = '',
}: BottomSheetProps) {
  const { reducedMotion } = useMotion();
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  // Update window height on resize
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      haptic('light');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Calculate current height based on snap point
  const currentHeight = windowHeight * snapPoints[currentSnapIndex];

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // Fast downward swipe or dragged past threshold = close
      if (velocity > 500 || offset > DRAG_CLOSE_THRESHOLD) {
        haptic('medium');
        onClose();
        return;
      }

      // Snap to nearest point based on drag direction
      if (offset < -50 && currentSnapIndex < snapPoints.length - 1) {
        // Dragged up - snap to higher point
        haptic('selection');
        setCurrentSnapIndex(currentSnapIndex + 1);
      } else if (offset > 50 && currentSnapIndex > 0) {
        // Dragged down - snap to lower point
        haptic('selection');
        setCurrentSnapIndex(currentSnapIndex - 1);
      }
    },
    [currentSnapIndex, snapPoints.length, onClose]
  );

  const handleClose = useCallback(() => {
    haptic('light');
    onClose();
  }, [onClose]);

  // In restrictive environments (iOS Lockdown Mode + Brave), use static rendering
  // to prevent blank content when framer-motion fails silently
  if (getIsRestrictive()) {
    if (!isOpen) return null;

    return (
      <>
        {/* Static Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-200"
          style={{ opacity: 1 }}
          onClick={closeOnBackdrop ? handleClose : undefined}
        />

        {/* Static Sheet */}
        <div
          ref={sheetRef}
          className={`
            fixed bottom-0 left-0 right-0 z-50
            bg-slate-900/95 backdrop-blur-xl
            rounded-t-3xl shadow-2xl
            border-t border-white/10
            flex flex-col
            transition-transform duration-300 ease-out
            ${className}
          `}
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            height: currentHeight,
            transform: 'translateY(0)',
            opacity: 1,
          }}
        >
          {/* Drag Handle */}
          {showHandle && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-400">{subtitle}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors touch-target-md"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {children}
          </div>
        </div>
      </>
    );
  }

  // Normal animated rendering with full framer-motion support (including drag)
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            style={{ opacity: 1 }} // CSS fallback
            onClick={closeOnBackdrop ? handleClose : undefined}
          />

          {/* Sheet with drag support */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: currentHeight }}
            exit={{ y: '100%' }}
            transition={{
              type: reducedMotion ? 'tween' : 'spring',
              damping: 30,
              stiffness: 300,
              duration: reducedMotion ? 0.15 : undefined,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={`
              fixed bottom-0 left-0 right-0 z-50
              bg-slate-900/95 backdrop-blur-xl
              rounded-t-3xl shadow-2xl
              border-t border-white/10
              flex flex-col
              touch-none
              ${className}
            `}
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              opacity: 1, // CSS fallback
            }}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-white/30 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-400">{subtitle}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors touch-target-md"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BottomSheet;
