/**
 * XRButton - VR/AR entry button component
 *
 * A glass-styled button that handles WebXR session entry with
 * proper loading states and VR headset icon.
 */

import React from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useXRButton, XR_STATE } from '../../hooks/useXR';

/**
 * VR Headset Icon
 */
const VRHeadsetIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 10a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-3l-2 2h-6l-2-2H4a2 2 0 01-2-2v-4z" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="16" cy="12" r="2" />
    <path d="M10 12h4" />
  </svg>
);

/**
 * XRButton component
 */
export default function XRButton({
  className,
  size = 'md',
  variant = 'glass',
  showIcon = true,
  showText = true,
  customText,
  onSessionStart,
  onSessionEnd,
  onFrame,
  onError,
  mode = 'immersive-vr',
  ...props
}) {
  const {
    state: _state,
    isSupported,
    isActive,
    isLoading,
    buttonProps,
    buttonText,
    error,
  } = useXRButton({
    mode,
    onSessionStart,
    onSessionEnd,
    onFrame,
    onError,
  });

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
    xl: 'px-8 py-4 text-lg gap-3',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const variantStyles = {
    glass: 'btn-glass',
    primary: 'btn-glass btn-primary',
    pulse: 'btn-glass btn-pulse',
    ghost: 'btn-ghost',
  };

  const displayText = customText || buttonText;

  return (
    <motion.button
      className={clsx(
        variantStyles[variant],
        sizeStyles[size],
        'inline-flex items-center justify-center font-medium',
        'transition-colors duration-200',
        !isSupported && 'opacity-50 cursor-not-allowed',
        isActive && 'ring-2 ring-cyan-400/50',
        error && 'ring-2 ring-red-400/50',
        className
      )}
      whileHover={isSupported && !isLoading ? { scale: 1.02, y: -1 } : {}}
      whileTap={isSupported && !isLoading ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...buttonProps}
      {...props}
    >
      {showIcon && (
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <LoadingSpinner className={iconSizes[size]} />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <VRHeadsetIcon
                className={clsx(
                  iconSizes[size],
                  isActive && 'text-cyan-400'
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {showText && (
        <span className={clsx(isLoading && 'opacity-70')}>
          {displayText}
        </span>
      )}
    </motion.button>
  );
}

/**
 * Loading spinner
 */
const LoadingSpinner = ({ className }) => (
  <svg
    className={clsx('animate-spin', className)}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * XRIconButton - Compact circular VR button
 */
export function XRIconButton({
  className,
  size = 'md',
  variant = 'glass',
  ...props
}) {
  const { state: _state, isSupported, isActive, isLoading, buttonProps, error } =
    useXRButton(props);

  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  const variantStyles = {
    glass: 'btn-glass',
    primary: 'btn-glass btn-primary',
    pulse: 'btn-glass btn-pulse',
    ghost: 'btn-ghost',
  };

  return (
    <motion.button
      className={clsx(
        variantStyles[variant],
        sizeStyles[size],
        'rounded-full p-0 flex items-center justify-center',
        !isSupported && 'opacity-50 cursor-not-allowed',
        isActive && 'ring-2 ring-cyan-400/50',
        error && 'ring-2 ring-red-400/50',
        className
      )}
      whileHover={isSupported && !isLoading ? { scale: 1.05 } : {}}
      whileTap={isSupported && !isLoading ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      title={
        !isSupported
          ? 'VR Not Supported'
          : isActive
            ? 'Exit VR'
            : 'Enter VR'
      }
      {...buttonProps}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <LoadingSpinner className={iconSizes[size]} />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <VRHeadsetIcon
              className={clsx(iconSizes[size], isActive && 'text-cyan-400')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * XRStatusBadge - Shows current XR status
 */
export function XRStatusBadge({ className }) {
  const { state, isSupported } = useXRButton();

  if (!isSupported) return null;

  const statusConfig = {
    [XR_STATE.READY]: {
      text: 'VR Ready',
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
    [XR_STATE.ACTIVE]: {
      text: 'In VR',
      className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse',
    },
    [XR_STATE.REQUESTING]: {
      text: 'Starting VR...',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    },
    [XR_STATE.ERROR]: {
      text: 'VR Error',
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
  };

  const config = statusConfig[state];
  if (!config) return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.text}
    </span>
  );
}
