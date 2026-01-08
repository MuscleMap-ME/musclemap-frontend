/**
 * Toast Provider
 *
 * Global toast notification system with undo support.
 * Used for optimistic UI feedback and undo patterns.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '../../utils/haptics';

// Toast types
export type ToastType = 'success' | 'error' | 'info' | 'undo' | 'warning';

export interface ToastAction {
  label: string;
  handler: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  /** Show a toast notification */
  showToast: (toast: Omit<Toast, 'id'>) => string;
  /** Convenience method for showing undo toast */
  showUndo: (message: string, onUndo: () => void, duration?: number) => string;
  /** Convenience method for success toast */
  showSuccess: (message: string, duration?: number) => string;
  /** Convenience method for error toast */
  showError: (message: string, duration?: number) => string;
  /** Dismiss a specific toast */
  dismissToast: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast icons
const TOAST_ICONS: Record<ToastType, string> = {
  success: '',
  error: '',
  info: '',
  undo: '',
  warning: '',
};

// Toast colors
const TOAST_COLORS: Record<ToastType, string> = {
  success: 'border-green-500/50 bg-green-500/10',
  error: 'border-red-500/50 bg-red-500/10',
  info: 'border-blue-500/50 bg-blue-500/10',
  undo: 'border-blue-500/50 bg-blue-500/10',
  warning: 'border-yellow-500/50 bg-yellow-500/10',
};

interface ToastProviderProps {
  children: ReactNode;
  /** Position of toasts (default: bottom) */
  position?: 'top' | 'bottom';
  /** Maximum number of visible toasts (default: 3) */
  maxVisible?: number;
}

export function ToastProvider({
  children,
  position = 'bottom',
  maxVisible = 3,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).slice(2, 11);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };

    // Haptic feedback based on type
    if (toast.type === 'success') haptic('success');
    else if (toast.type === 'error') haptic('error');
    else if (toast.type === 'warning') haptic('warning');
    else haptic('light');

    setToasts((prev) => {
      // Keep only the most recent toasts
      const updated = [...prev, newToast];
      return updated.slice(-maxVisible);
    });

    // Auto-dismiss
    const duration = toast.duration ?? (toast.type === 'undo' ? 5000 : 3000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);

    return id;
  }, [maxVisible]);

  const showUndo = useCallback(
    (message: string, onUndo: () => void, duration = 5000) => {
      return showToast({
        message,
        type: 'undo',
        action: { label: 'Undo', handler: onUndo },
        duration,
      });
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, duration = 3000) => {
      return showToast({ message, type: 'success', duration });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration = 4000) => {
      return showToast({ message, type: 'error', duration });
    },
    [showToast]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const handleActionClick = (toast: Toast) => {
    if (toast.action) {
      haptic('light');
      toast.action.handler();
      dismissToast(toast.id);
    }
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showUndo,
        showSuccess,
        showError,
        dismissToast,
        dismissAll,
      }}
    >
      {children}

      {/* Toast Container */}
      <div
        className={`
          fixed left-4 right-4 z-50
          flex flex-col gap-2 pointer-events-none
          ${position === 'bottom' ? 'bottom-24' : 'top-20'}
        `}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: position === 'bottom' ? 50 : -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              className={`
                pointer-events-auto
                px-4 py-3 rounded-2xl
                backdrop-blur-xl border
                flex items-center justify-between gap-4
                shadow-lg
                ${TOAST_COLORS[toast.type]}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{TOAST_ICONS[toast.type]}</span>
                <span className="text-white font-medium">{toast.message}</span>
              </div>

              {toast.action && (
                <button
                  onClick={() => handleActionClick(toast)}
                  className="
                    px-4 py-2 min-h-[44px]
                    bg-white/20 hover:bg-white/30
                    rounded-xl text-white font-bold
                    transition-colors
                    touch-action-manipulation
                    active:scale-95
                  "
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast notifications
 *
 * @example
 * ```tsx
 * const { showUndo, showSuccess, showError } = useToast();
 *
 * // Undo pattern
 * const handleDelete = () => {
 *   const item = removeItem(id);
 *   showUndo('Item deleted', () => restoreItem(item));
 * };
 *
 * // Success feedback
 * showSuccess('Workout saved!');
 *
 * // Error feedback
 * showError('Failed to save');
 * ```
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
