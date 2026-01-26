/**
 * HelpTooltip - Inline help tooltip component
 *
 * A small (?) icon that shows explanatory content on hover (desktop) or click (mobile).
 * Supports predefined terms from helpContent or custom content.
 *
 * @example
 * // Using predefined term
 * <span>Training Units <HelpTooltip term="TU" /></span>
 *
 * // With custom content
 * <HelpTooltip
 *   term="Custom"
 *   explanation="This is a custom explanation"
 *   learnMoreUrl="/docs/custom"
 * />
 *
 * // Inline with text
 * <p>Earn <HelpTooltip term="credits" inline /> by completing workouts.</p>
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useHelp } from './HelpProvider';

// Icon sizes
const ICON_SIZES = {
  sm: 14,
  md: 16,
  lg: 18,
};

// Tooltip positioning offsets
const POSITION_OFFSET = 8;

/**
 * Calculate optimal tooltip position to avoid viewport overflow
 */
function calculatePosition(triggerRect, tooltipWidth, tooltipHeight) {
  if (!triggerRect) return { top: 0, left: 0, placement: 'bottom' };

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  // Try positions in order: bottom, top, right, left
  const positions = [
    {
      name: 'bottom',
      top: triggerRect.bottom + scrollY + POSITION_OFFSET,
      left: triggerRect.left + scrollX + triggerRect.width / 2 - tooltipWidth / 2,
    },
    {
      name: 'top',
      top: triggerRect.top + scrollY - tooltipHeight - POSITION_OFFSET,
      left: triggerRect.left + scrollX + triggerRect.width / 2 - tooltipWidth / 2,
    },
    {
      name: 'right',
      top: triggerRect.top + scrollY + triggerRect.height / 2 - tooltipHeight / 2,
      left: triggerRect.right + scrollX + POSITION_OFFSET,
    },
    {
      name: 'left',
      top: triggerRect.top + scrollY + triggerRect.height / 2 - tooltipHeight / 2,
      left: triggerRect.left + scrollX - tooltipWidth - POSITION_OFFSET,
    },
  ];

  // Find first position that fits
  for (const pos of positions) {
    const fitsVertically =
      pos.top >= scrollY &&
      pos.top + tooltipHeight <= scrollY + viewportHeight;
    const fitsHorizontally =
      pos.left >= scrollX &&
      pos.left + tooltipWidth <= scrollX + viewportWidth;

    if (fitsVertically && fitsHorizontally) {
      return { top: pos.top, left: pos.left, placement: pos.name };
    }
  }

  // Fallback: clamp to viewport with bottom position
  const fallback = positions[0];
  return {
    top: Math.min(
      Math.max(fallback.top, scrollY + POSITION_OFFSET),
      scrollY + viewportHeight - tooltipHeight - POSITION_OFFSET
    ),
    left: Math.min(
      Math.max(fallback.left, scrollX + POSITION_OFFSET),
      scrollX + viewportWidth - tooltipWidth - POSITION_OFFSET
    ),
    placement: 'bottom',
  };
}

/**
 * Animation variants for tooltip
 */
const tooltipVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: {
      duration: 0.15,
    },
  },
};

/**
 * HelpTooltip Component
 */
export default function HelpTooltip({
  // Content - either use term key or provide directly
  term,
  explanation: customExplanation,
  learnMoreUrl: customLearnMoreUrl,

  // Display options
  size = 'md',
  inline = false,
  showIcon = true,
  iconColor,
  className,

  // Behavior
  delay = 200,
  persistent = false, // Keep open until explicitly closed

  // Accessibility
  'aria-label': ariaLabel,
}) {
  const tooltipId = useId();
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Get help content from context
  const { getHelp, openTooltip, closeTooltip } = useHelp();

  // Resolve content (custom props override context)
  const helpContent = useMemo(() => {
    const contextContent = term ? getHelp(term) : null;
    return {
      term: term || contextContent?.term || 'Help',
      explanation: customExplanation || contextContent?.explanation || '',
      learnMoreUrl: customLearnMoreUrl || contextContent?.learnMoreUrl,
    };
  }, [term, customExplanation, customLearnMoreUrl, getHelp]);

  // Define callbacks BEFORE effects that use them
  const handleOpen = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      openTooltip(tooltipId);
    }, delay);
  }, [delay, openTooltip, tooltipId]);

  const handleClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!persistent) {
      setIsOpen(false);
      closeTooltip();
    }
  }, [persistent, closeTooltip]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      // Immediate open on click
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsOpen(true);
      openTooltip(tooltipId);
    }
  }, [isOpen, handleClose, openTooltip, tooltipId]);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Update position when tooltip opens
  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const newPosition = calculatePosition(
        triggerRect,
        tooltipRect.width,
        tooltipRect.height
      );
      setPosition(newPosition);
    }
  }, [isOpen]);

  // Handle window resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const newPosition = calculatePosition(
          triggerRect,
          tooltipRect.width,
          tooltipRect.height
        );
        setPosition(newPosition);
      }
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Close on outside click (mobile)
  useEffect(() => {
    if (!isOpen || !isTouchDevice) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isTouchDevice, handleClose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // If no explanation, don't render
  if (!helpContent.explanation) {
    return null;
  }

  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={clsx(
          'inline-flex items-center justify-center',
          'rounded-full transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--void-base)]',
          inline ? 'align-baseline mx-0.5' : '',
          isOpen
            ? 'bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]'
            : 'text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]',
          className
        )}
        style={{
          width: iconSize + 8,
          height: iconSize + 8,
          color: iconColor,
        }}
        onClick={isTouchDevice ? handleToggle : undefined}
        onMouseEnter={!isTouchDevice ? handleOpen : undefined}
        onMouseLeave={!isTouchDevice ? handleClose : undefined}
        onFocus={handleOpen}
        onBlur={handleClose}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-label={ariaLabel || `Help for ${helpContent.term}`}
        aria-expanded={isOpen}
      >
        {showIcon && (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="7"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M6 6.5C6 5.67157 6.67157 5 7.5 5H8.5C9.32843 5 10 5.67157 10 6.5C10 7.12951 9.61115 7.67066 9.05 7.88675V7.88675C8.44036 8.11987 8 8.69583 8 9.35V9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Tooltip Portal - renders to document.body to avoid clipping */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              variants={tooltipVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={clsx(
                'fixed z-[var(--z-tooltip)]',
                'w-72 max-w-[calc(100vw-32px)]',
                'p-3 rounded-lg',
                // Glass styling
                'bg-[var(--glass-white-10)] backdrop-blur-xl',
                'border border-[var(--border-medium)]',
                'shadow-[var(--shadow-glass-lg)]'
              )}
              style={{
                top: position.top,
                left: position.left,
              }}
            >
              {/* Arrow indicator */}
              <div
                className={clsx(
                  'absolute w-2 h-2 rotate-45',
                  'bg-[var(--glass-white-10)] border-[var(--border-medium)]',
                  position.placement === 'bottom' && '-top-1 border-l border-t',
                  position.placement === 'top' && '-bottom-1 border-r border-b',
                  position.placement === 'left' && '-right-1 border-r border-t',
                  position.placement === 'right' && '-left-1 border-l border-b'
                )}
                style={{
                  left: position.placement === 'bottom' || position.placement === 'top' ? '50%' : undefined,
                  top: position.placement === 'left' || position.placement === 'right' ? '50%' : undefined,
                  transform: `translate(-50%, ${position.placement === 'top' ? '50%' : position.placement === 'bottom' ? '-50%' : '0'})`,
                }}
              />

              {/* Content */}
              <div className="relative">
                {/* Term title */}
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {helpContent.term}
                </h4>

                {/* Explanation */}
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {helpContent.explanation}
                </p>

                {/* Learn more link */}
                {helpContent.learnMoreUrl && (
                  <a
                    href={helpContent.learnMoreUrl}
                    className={clsx(
                      'inline-flex items-center gap-1 mt-2',
                      'text-xs font-medium text-[var(--brand-blue-400)]',
                      'hover:text-[var(--brand-blue-300)] transition-colors'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Learn more
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.5 3L7.5 6L4.5 9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

/**
 * HelpIcon - Standalone icon without tooltip (for custom implementations)
 */
export function HelpIcon({ size = 'md', className, ...props }) {
  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 6.5C6 5.67157 6.67157 5 7.5 5H8.5C9.32843 5 10 5.67157 10 6.5C10 7.12951 9.61115 7.67066 9.05 7.88675V7.88675C8.44036 8.11987 8 8.69583 8 9.35V9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

/**
 * InlineHelp - Wraps text with help tooltip
 *
 * @example
 * <InlineHelp term="TU">Training Units</InlineHelp>
 */
export function InlineHelp({ children, term, className, ...tooltipProps }) {
  return (
    <span className={clsx('inline-flex items-center gap-0.5', className)}>
      {children}
      <HelpTooltip term={term} inline size="sm" {...tooltipProps} />
    </span>
  );
}
