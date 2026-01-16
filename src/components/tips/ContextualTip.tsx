/**
 * ContextualTip Component
 *
 * A smart suggestion component that shows contextual tips based on user actions.
 * Features animated slide-in, glass styling, and action buttons.
 *
 * @example
 * <ContextualTip
 *   id="post-workout-tip"
 *   trigger="workout_complete"
 *   message="Great workout! Want to see your muscle heat map?"
 *   action={{ label: "View Map", to: "/stats" }}
 *   dismissible
 * />
 *
 * // Or use with custom message override
 * <ContextualTip
 *   trigger="new_achievement"
 *   message="You earned the Iron Will badge!"
 *   action={{ label: "View Badge", onClick: () => showBadgeModal() }}
 * />
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useContextualTips } from './ContextualTipProvider';
import { getPrimaryTipForTrigger, TIP_CATEGORIES } from './tipDefinitions';
import {
  X,
  Zap,
  TrendingUp,
  Award,
  Users,
  Bell,
  ChevronRight,
} from 'lucide-react';

// Icon mapping
const ICON_MAP = {
  zap: Zap,
  'trending-up': TrendingUp,
  award: Award,
  users: Users,
  bell: Bell,
};

/**
 * Animation variants for tip slide-in
 */
const slideVariants = {
  bottom: {
    initial: { y: 100, opacity: 0, scale: 0.95 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: 50, opacity: 0, scale: 0.95 },
  },
  right: {
    initial: { x: 100, opacity: 0, scale: 0.95 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: 50, opacity: 0, scale: 0.95 },
  },
  left: {
    initial: { x: -100, opacity: 0, scale: 0.95 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: -50, opacity: 0, scale: 0.95 },
  },
  top: {
    initial: { y: -100, opacity: 0, scale: 0.95 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: -50, opacity: 0, scale: 0.95 },
  },
};

/**
 * Position classes for tip placement
 */
const positionClasses = {
  'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'fixed bottom-4 left-4',
  'bottom-right': 'fixed bottom-4 right-4',
  'top-center': 'fixed top-20 left-1/2 -translate-x-1/2',
  'top-left': 'fixed top-20 left-4',
  'top-right': 'fixed top-20 right-4',
  center: 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  top: 'fixed top-20 left-1/2 -translate-x-1/2',
  bottom: 'fixed bottom-4 left-1/2 -translate-x-1/2',
  left: 'fixed top-1/2 left-4 -translate-y-1/2',
  right: 'fixed top-1/2 right-4 -translate-y-1/2',
  inline: 'relative',
};

/**
 * LocalStorage key for show-once tips
 */
const SHOW_ONCE_KEY = 'musclemap_shown_once_tips';

/**
 * Get show-once tips from localStorage
 * @returns {Set<string>} Set of tip ids that have been shown once
 */
function getShownOnceTips() {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(SHOW_ONCE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Mark a tip as shown once in localStorage
 * @param {string} tipId - The tip id to mark
 */
function markTipAsShownOnce(tipId) {
  if (typeof window === 'undefined') return;
  try {
    const shown = getShownOnceTips();
    shown.add(tipId);
    localStorage.setItem(SHOW_ONCE_KEY, JSON.stringify([...shown]));
  } catch {
    // localStorage not available
  }
}

/**
 * ContextualTip Component
 */
export default function ContextualTip({
  id,
  trigger,
  message: customMessage,
  action: customAction,
  dismissible = true,
  showOnce = false,
  delay = 0,
  position = 'bottom-center',
  slideFrom = 'bottom',
  autoHide = 0,
  onShow,
  onDismiss,
  onAction,
  className,
  inline = false,
  showOnMount = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tipData, setTipData] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { isTipDismissed } = useContextualTips();

  // Get tip definition from trigger
  const tipDefinition = useMemo(() => {
    return trigger ? getPrimaryTipForTrigger(trigger) : null;
  }, [trigger]);

  // Resolve final tip data (custom props override definition)
  const resolvedTip = useMemo(() => {
    if (!tipDefinition && !customMessage) return null;

    const base = tipDefinition || {};
    const tipId = id || base.id || `tip-${Date.now()}`;
    const category = base.category || 'action';
    const categoryConfig = TIP_CATEGORIES[category] || TIP_CATEGORIES.action;

    return {
      id: tipId,
      message: customMessage || base.message,
      action: customAction || base.action,
      category,
      categoryConfig,
    };
  }, [tipDefinition, id, customMessage, customAction]);

  // Check if we should show the tip
  const shouldShow = useMemo(() => {
    if (!resolvedTip) return false;
    if (isTipDismissed(resolvedTip.id)) return false;
    // Check showOnce - if tip was already shown once, don't show again
    if (showOnce && getShownOnceTips().has(resolvedTip.id)) return false;
    return true;
  }, [resolvedTip, isTipDismissed, showOnce]);

  // Show tip after delay
  useEffect(() => {
    if (!shouldShow) return;
    if (!showOnMount && !trigger) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      setTipData(resolvedTip);
      // Mark as shown once if showOnce is true
      if (showOnce && resolvedTip?.id) {
        markTipAsShownOnce(resolvedTip.id);
      }
      onShow?.();
    }, delay);

    return () => clearTimeout(timer);
  }, [shouldShow, showOnMount, trigger, delay, resolvedTip, onShow, showOnce]);

  // Auto-hide after duration
  useEffect(() => {
    if (!isVisible || !autoHide || autoHide <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.(false);
    }, autoHide);

    return () => clearTimeout(timer);
  }, [isVisible, autoHide, onDismiss]);

  // Handle dismiss
  const handleDismiss = useCallback(
    (permanent = false) => {
      setIsVisible(false);
      // If "don't show again" is checked, mark as permanent dismiss
      const shouldPermanentlyDismiss = permanent || dontShowAgain;
      if (shouldPermanentlyDismiss && tipData?.id) {
        markTipAsShownOnce(tipData.id);
      }
      onDismiss?.(shouldPermanentlyDismiss);
    },
    [onDismiss, dontShowAgain, tipData]
  );

  // Handle action click
  const handleAction = useCallback(() => {
    onAction?.();
    if (!tipData?.action?.to) {
      // Only auto-dismiss if no navigation
      handleDismiss(false);
    }
  }, [onAction, tipData, handleDismiss]);

  // Don't render if no tip data
  if (!tipData && !isVisible) return null;

  const currentTip = tipData || resolvedTip;
  if (!currentTip) return null;

  const { message, action, categoryConfig } = currentTip;
  const IconComponent = ICON_MAP[categoryConfig?.icon] || Zap;
  const variants = slideVariants[slideFrom] || slideVariants.bottom;
  const finalPosition = inline ? 'inline' : position;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={currentTip.id}
          className={clsx(positionClasses[finalPosition], 'z-50', className)}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
        >
          <div
            className={clsx(
              // Glass base
              'backdrop-blur-xl bg-gradient-to-r',
              categoryConfig?.color || 'from-blue-500/20 to-cyan-500/20',
              // Border and shape
              'rounded-2xl border border-white/10',
              // Shadow and glow
              'shadow-2xl',
              // Size
              'max-w-sm w-full p-4',
              // Interactive
              'select-none'
            )}
            style={{
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px ${categoryConfig?.glow || 'rgba(0, 102, 255, 0.2)'}`,
            }}
          >
            {/* Close button */}
            {dismissible && (
              <button
                onClick={() => handleDismiss(true)}
                className={clsx(
                  'absolute top-2 right-2',
                  'w-8 h-8 flex items-center justify-center',
                  'rounded-full',
                  'text-white/50 hover:text-white hover:bg-white/10',
                  'transition-colors duration-200'
                )}
                aria-label="Dismiss tip"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Content */}
            <div className="flex items-start gap-3 pr-8">
              {/* Icon */}
              <div
                className={clsx(
                  'flex-shrink-0',
                  'w-10 h-10 rounded-xl',
                  'bg-white/10 backdrop-blur-sm',
                  'flex items-center justify-center',
                  'border border-white/10'
                )}
              >
                <IconComponent className="w-5 h-5 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium leading-relaxed">
                  {message}
                </p>

                {/* Action button */}
                {action && (
                  <div className="mt-3">
                    {action.to ? (
                      <Link
                        to={action.to}
                        onClick={handleAction}
                        className={clsx(
                          'inline-flex items-center gap-1.5',
                          'px-4 py-2 rounded-xl',
                          'bg-white/10 hover:bg-white/20',
                          'border border-white/10',
                          'text-white text-sm font-medium',
                          'transition-all duration-200',
                          'hover:scale-[1.02] active:scale-[0.98]'
                        )}
                      >
                        {action.label}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : action.onClick ? (
                      <button
                        onClick={() => {
                          action.onClick();
                          handleAction();
                        }}
                        className={clsx(
                          'inline-flex items-center gap-1.5',
                          'px-4 py-2 rounded-xl',
                          'bg-white/10 hover:bg-white/20',
                          'border border-white/10',
                          'text-white text-sm font-medium',
                          'transition-all duration-200',
                          'hover:scale-[1.02] active:scale-[0.98]'
                        )}
                      >
                        {action.label}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Don't show again checkbox */}
                {dismissible && (
                  <div className="mt-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                        className={clsx(
                          'w-4 h-4 rounded',
                          'bg-white/10 border border-white/20',
                          'checked:bg-blue-500 checked:border-blue-500',
                          'focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0',
                          'transition-colors duration-200',
                          'cursor-pointer'
                        )}
                      />
                      <span className="text-white/60 text-xs group-hover:text-white/80 transition-colors">
                        Don&apos;t show again
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle animated glow effect */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <motion.div
                className="absolute -inset-[100%] opacity-30"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${categoryConfig?.glow || 'rgba(0, 102, 255, 0.4)'}, transparent 70%)`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.3, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Standalone tip component for programmatic display
 * Used by the context provider to render active tips
 */
export function ActiveContextualTip() {
  const { activeTip, dismissTip } = useContextualTips();

  if (!activeTip) return null;

  const categoryConfig =
    TIP_CATEGORIES[activeTip.category] || TIP_CATEGORIES.action;
  const IconComponent = ICON_MAP[categoryConfig?.icon] || Zap;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTip.instanceId}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      >
        <div
          className={clsx(
            'backdrop-blur-xl bg-gradient-to-r',
            categoryConfig?.color || 'from-blue-500/20 to-cyan-500/20',
            'rounded-2xl border border-white/10',
            'shadow-2xl',
            'max-w-sm w-full p-4',
            'select-none'
          )}
          style={{
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px ${categoryConfig?.glow || 'rgba(0, 102, 255, 0.2)'}`,
          }}
        >
          <button
            onClick={() => dismissTip(true)}
            className={clsx(
              'absolute top-2 right-2',
              'w-8 h-8 flex items-center justify-center',
              'rounded-full',
              'text-white/50 hover:text-white hover:bg-white/10',
              'transition-colors duration-200'
            )}
            aria-label="Dismiss tip"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <div
              className={clsx(
                'flex-shrink-0',
                'w-10 h-10 rounded-xl',
                'bg-white/10 backdrop-blur-sm',
                'flex items-center justify-center',
                'border border-white/10'
              )}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-relaxed">
                {activeTip.message}
              </p>

              {activeTip.action && (
                <div className="mt-3">
                  {activeTip.action.to ? (
                    <Link
                      to={activeTip.action.to}
                      onClick={() => dismissTip(false)}
                      className={clsx(
                        'inline-flex items-center gap-1.5',
                        'px-4 py-2 rounded-xl',
                        'bg-white/10 hover:bg-white/20',
                        'border border-white/10',
                        'text-white text-sm font-medium',
                        'transition-all duration-200',
                        'hover:scale-[1.02] active:scale-[0.98]'
                      )}
                    >
                      {activeTip.action.label}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : activeTip.action.onClick ? (
                    <button
                      onClick={() => {
                        activeTip.action.onClick();
                        dismissTip(false);
                      }}
                      className={clsx(
                        'inline-flex items-center gap-1.5',
                        'px-4 py-2 rounded-xl',
                        'bg-white/10 hover:bg-white/20',
                        'border border-white/10',
                        'text-white text-sm font-medium',
                        'transition-all duration-200',
                        'hover:scale-[1.02] active:scale-[0.98]'
                      )}
                    >
                      {activeTip.action.label}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <motion.div
              className="absolute -inset-[100%] opacity-30"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${categoryConfig?.glow || 'rgba(0, 102, 255, 0.4)'}, transparent 70%)`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Simple inline tip variant for embedding in content
 */
export function InlineTip({
  message,
  action,
  category = 'action',
  dismissible = true,
  onDismiss,
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const categoryConfig = TIP_CATEGORIES[category] || TIP_CATEGORIES.action;
  const IconComponent = ICON_MAP[categoryConfig?.icon] || Zap;

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={clsx(
        'relative',
        'backdrop-blur-sm bg-gradient-to-r',
        categoryConfig?.color || 'from-blue-500/20 to-cyan-500/20',
        'rounded-xl border border-white/10',
        'p-3'
      )}
    >
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      <div className="flex items-start gap-2 pr-6">
        <IconComponent className="w-4 h-4 text-white/80 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-sm">{message}</p>
          {action && (
            <div className="mt-2">
              {action.to ? (
                <Link
                  to={action.to}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  {action.label}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              ) : action.onClick ? (
                <button
                  onClick={action.onClick}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                >
                  {action.label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
