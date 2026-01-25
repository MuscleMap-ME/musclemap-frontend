/**
 * Modal Component - Tier-Aware Dialog
 *
 * Knuth-inspired component that adapts to rendering tier:
 * - FULL: Animated overlay, glassmorphism, smooth transitions
 * - REDUCED: Solid overlay, no animations
 * - MINIMAL: Basic modal with border
 * - TEXT_ONLY: Inline expandable section
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Settings">
 *   <p>Modal content here</p>
 * </Modal>
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Size variant */
  size?: ModalSize;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional class name for content */
  className?: string;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA description */
  'aria-describedby'?: string;
}

// Size configurations
const sizeConfig: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: ModalProps): React.ReactElement | null {
  const { tier } = useRenderingTier();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previous focus and trap focus in modal
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the modal after a short delay to allow animation
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  if (!open) return null;

  // TEXT_ONLY tier: Inline expandable
  if (tier === RenderingTier.TEXT_ONLY) {
    return (
      <div className={`border-2 border-dashed p-4 my-4 ${className}`}>
        <div className="flex justify-between items-center mb-2">
          {title && <strong>{title}</strong>}
          {showCloseButton && (
            <button onClick={onClose} className="font-bold" aria-label="Close">
              [X]
            </button>
          )}
        </div>
        <div>{children}</div>
        {footer && <div className="mt-4 pt-2 border-t">{footer}</div>}
      </div>
    );
  }

  // Get overlay styles based on tier
  const getOverlayStyles = (): string => {
    const base = 'fixed inset-0 z-50 flex items-center justify-center p-4';

    if (tier === RenderingTier.MINIMAL) {
      return `${base} bg-black/50`;
    }

    if (tier === RenderingTier.REDUCED) {
      return `${base} bg-black/60`;
    }

    // FULL tier: Animated backdrop
    return `${base} bg-black/50 backdrop-blur-sm`;
  };

  // Get modal content styles based on tier
  const getModalStyles = (): string => {
    const base = `
      ${sizeConfig[size]}
      w-full
      rounded-xl
      overflow-hidden
      flex flex-col
      max-h-[90vh]
    `;

    if (tier === RenderingTier.MINIMAL) {
      return `${base} bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700`;
    }

    if (tier === RenderingTier.REDUCED) {
      return `${base} bg-white dark:bg-neutral-900 shadow-2xl`;
    }

    // FULL tier: Glass effect with animation
    return `${base} bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-2xl`;
  };

  const modalContent = (
    <div
      className={getOverlayStyles()}
      onClick={handleOverlayClick}
      role="presentation"
      style={tier === RenderingTier.FULL ? { animation: 'fadeIn 200ms ease-out' } : undefined}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`${getModalStyles()} ${className}`}
        style={tier === RenderingTier.FULL ? { animation: 'scaleIn 200ms ease-out' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            {title && (
              <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`
                  p-2 -mr-2 rounded-lg
                  text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300
                  hover:bg-neutral-100 dark:hover:bg-neutral-800
                  ${tier === RenderingTier.FULL ? 'transition-colors duration-150' : ''}
                `}
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render at document root
  return createPortal(modalContent, document.body);
}

export default Modal;
