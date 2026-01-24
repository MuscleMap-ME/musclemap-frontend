/**
 * FloatingActionButton Component
 *
 * A mobile-optimized floating action button for quick access to primary actions.
 * Supports multiple actions with an expandable menu.
 */

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useMotion } from '../../contexts/MotionContext';
import { SafeMotion, SafeAnimatePresence, getIsRestrictive } from '../../utils/safeMotion';

interface FABAction {
  /** Unique identifier */
  id: string;
  /** Icon to display */
  icon: React.ReactNode;
  /** Label for the action */
  label: string;
  /** Callback when action is clicked */
  onClick: () => void;
  /** Background color class */
  color?: string;
}

interface FloatingActionButtonProps {
  /** Primary action when FAB is clicked (if no actions provided) */
  onClick?: () => void;
  /** Custom icon for the main button */
  icon?: React.ReactNode;
  /** Expandable actions menu */
  actions?: FABAction[];
  /** Position of the FAB */
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  /** Whether to show a backdrop when expanded */
  showBackdrop?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom aria label */
  ariaLabel?: string;
}

export function FloatingActionButton({
  onClick,
  icon,
  actions = [],
  position = 'bottom-right',
  showBackdrop = true,
  className = '',
  ariaLabel = 'Actions',
}: FloatingActionButtonProps) {
  const { reducedMotion } = useMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActions = actions.length > 0;

  const positionClasses = {
    'bottom-right': 'right-4 bottom-4',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-4',
    'bottom-left': 'left-4 bottom-4',
  };

  const handleMainClick = useCallback(() => {
    haptic('light');
    if (hasActions) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick();
    }
  }, [hasActions, isExpanded, onClick]);

  const handleActionClick = useCallback((action: FABAction) => {
    haptic('selection');
    setIsExpanded(false);
    action.onClick();
  }, []);

  const handleBackdropClick = useCallback(() => {
    haptic('light');
    setIsExpanded(false);
  }, []);

  // In restrictive environments (iOS Lockdown Mode + Brave), use static rendering
  const isRestrictive = getIsRestrictive();

  // Static fallback for restrictive environments
  if (isRestrictive) {
    return (
      <>
        {/* Static Backdrop */}
        {showBackdrop && isExpanded && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200"
            style={{ opacity: 1 }}
            onClick={handleBackdropClick}
          />
        )}

        {/* FAB Container */}
        <div
          className={`
            fixed z-50
            ${positionClasses[position]}
            ${className}
          `}
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)',
          }}
        >
          {/* Static Action buttons */}
          {isExpanded && hasActions && (
            <div
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end mb-4"
              style={{ opacity: 1 }}
            >
              {actions.map((action) => (
                <div key={action.id} className="flex items-center gap-3" style={{ opacity: 1 }}>
                  <span className="bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                    {action.label}
                  </span>
                  <button
                    onClick={() => handleActionClick(action)}
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      shadow-lg shadow-black/25
                      ${action.color || 'bg-gray-700'}
                      text-white
                      transition-all duration-200 active:scale-90
                      touch-action-manipulation
                    `}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Static Main FAB */}
          <button
            onClick={handleMainClick}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              bg-gradient-to-br from-blue-500 to-purple-600
              shadow-lg shadow-blue-500/30
              text-white
              transition-all duration-200 active:scale-90
              touch-action-manipulation
              -webkit-tap-highlight-color-transparent
            `}
            style={{
              opacity: 1,
              transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
            aria-label={ariaLabel}
            aria-expanded={hasActions ? isExpanded : undefined}
          >
            {isExpanded && hasActions ? (
              <X className="w-6 h-6" />
            ) : (
              icon || <Plus className="w-6 h-6" />
            )}
          </button>
        </div>
      </>
    );
  }

  // Normal animated rendering
  return (
    <>
      {/* Backdrop */}
      <SafeAnimatePresence>
        {showBackdrop && isExpanded && (
          <SafeMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={handleBackdropClick}
          />
        )}
      </SafeAnimatePresence>

      {/* FAB Container */}
      <div
        className={`
          fixed z-50
          ${positionClasses[position]}
          ${className}
        `}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)',
        }}
      >
        {/* Action buttons (expanded) */}
        <SafeAnimatePresence>
          {isExpanded && hasActions && (
            <SafeMotion.div
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {actions.map((action, index) => (
                <SafeMotion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{
                    type: reducedMotion ? 'tween' : 'spring',
                    delay: reducedMotion ? 0 : index * 0.05,
                    damping: 25,
                    stiffness: 300,
                  }}
                  className="flex items-center gap-3"
                >
                  {/* Label */}
                  <SafeMotion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{
                      delay: reducedMotion ? 0 : index * 0.05 + 0.1,
                    }}
                    className="bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
                  >
                    {action.label}
                  </SafeMotion.span>

                  {/* Action button */}
                  <SafeMotion.button
                    onClick={() => handleActionClick(action)}
                    whileTap={{ scale: 0.9 }}
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      shadow-lg shadow-black/25
                      ${action.color || 'bg-gray-700'}
                      text-white
                      transition-colors
                      touch-action-manipulation
                    `}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </SafeMotion.button>
                </SafeMotion.div>
              ))}
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>

        {/* Main FAB */}
        <SafeMotion.button
          onClick={handleMainClick}
          whileTap={{ scale: 0.9 }}
          animate={{
            rotate: isExpanded ? 45 : 0,
          }}
          transition={{
            type: reducedMotion ? 'tween' : 'spring',
            damping: 20,
            stiffness: 300,
          }}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center
            bg-gradient-to-br from-blue-500 to-purple-600
            shadow-lg shadow-blue-500/30
            text-white
            touch-action-manipulation
            -webkit-tap-highlight-color-transparent
          `}
          aria-label={ariaLabel}
          aria-expanded={hasActions ? isExpanded : undefined}
        >
          {isExpanded && hasActions ? (
            <X className="w-6 h-6" />
          ) : (
            icon || <Plus className="w-6 h-6" />
          )}
        </SafeMotion.button>
      </div>
    </>
  );
}

export default FloatingActionButton;
