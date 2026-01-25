/**
 * UI Store
 *
 * Manages global UI state:
 * - Modal stack
 * - Toast notifications
 * - Loading states
 * - Theme preferences
 * - Bottom sheet state
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'undo';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export type ModalType =
  | 'spirit-animal-customizer'
  | 'credits-store'
  | 'achievement-detail'
  | 'exercise-detail'
  | 'workout-complete'
  | 'rest-timer'
  | 'confirm'
  | 'custom';

export interface Modal {
  type: ModalType;
  props?: Record<string, unknown>;
  onClose?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export type ThemeMode = 'dark' | 'light' | 'system';

// ============================================================================
// Store
// ============================================================================

interface UIState {
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  modalStack: Modal[];
  openModal: (modal: Modal) => void;
  closeModal: () => void;
  closeAllModals: () => void;

  // Confirm dialog (special modal)
  confirmOptions: ConfirmOptions | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: ((value: boolean) => void) | null;

  // Loading
  globalLoading: boolean;
  loadingMessage: string | null;
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Bottom sheet
  bottomSheetContent: ReactNode | null;
  bottomSheetSnapPoints: (string | number)[];
  openBottomSheet: (content: ReactNode, snapPoints?: (string | number)[]) => void;
  closeBottomSheet: () => void;

  // Haptics enabled
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
}

let toastId = 0;
const generateToastId = () => `toast-${++toastId}`;

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // Toasts
    // ========================================================================
    toasts: [],

    addToast: (toast) => {
      const id = generateToastId();
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? (toast.type === 'error' ? 5000 : 3000),
      };

      set((state) => ({
        toasts: [...state.toasts, newToast],
      }));

      // Auto-remove after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
      }

      return id;
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    clearToasts: () => set({ toasts: [] }),

    // ========================================================================
    // Modals
    // ========================================================================
    modalStack: [],

    openModal: (modal) => {
      set((state) => ({
        modalStack: [...state.modalStack, modal],
      }));
    },

    closeModal: () => {
      const { modalStack } = get();
      if (modalStack.length > 0) {
        const closingModal = modalStack[modalStack.length - 1];
        closingModal?.onClose?.();
        set((state) => ({
          modalStack: state.modalStack.slice(0, -1),
        }));
      }
    },

    closeAllModals: () => {
      const { modalStack } = get();
      modalStack.forEach((modal) => modal.onClose?.());
      set({ modalStack: [] });
    },

    // ========================================================================
    // Confirm Dialog
    // ========================================================================
    confirmOptions: null,
    resolveConfirm: null,

    confirm: (options) => {
      return new Promise<boolean>((resolve) => {
        set({
          confirmOptions: options,
          resolveConfirm: resolve,
        });
        get().openModal({ type: 'confirm' });
      });
    },

    // ========================================================================
    // Loading
    // ========================================================================
    globalLoading: false,
    loadingMessage: null,

    setGlobalLoading: (loading, message) => {
      set({
        globalLoading: loading,
        loadingMessage: loading ? (message ?? null) : null,
      });
    },

    // ========================================================================
    // Theme
    // ========================================================================
    themeMode: 'dark',

    setThemeMode: (mode) => set({ themeMode: mode }),

    // ========================================================================
    // Bottom Sheet
    // ========================================================================
    bottomSheetContent: null,
    bottomSheetSnapPoints: ['25%', '50%', '90%'],

    openBottomSheet: (content, snapPoints) => {
      set({
        bottomSheetContent: content,
        bottomSheetSnapPoints: snapPoints ?? ['25%', '50%', '90%'],
      });
    },

    closeBottomSheet: () => {
      set({ bottomSheetContent: null });
    },

    // ========================================================================
    // Haptics
    // ========================================================================
    hapticsEnabled: true,

    setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
  })),
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for toast notifications
 */
export function useToast() {
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);

  return {
    toast: (message: string, type: ToastType = 'info') => addToast({ message, type }),
    success: (message: string) => addToast({ message, type: 'success' }),
    error: (message: string) => addToast({ message, type: 'error', duration: 5000 }),
    warning: (message: string) => addToast({ message, type: 'warning' }),
    info: (message: string) => addToast({ message, type: 'info' }),
    undo: (message: string, onUndo: () => void) =>
      addToast({
        message,
        type: 'undo',
        duration: 5000,
        action: { label: 'Undo', onPress: onUndo },
      }),
    dismiss: removeToast,
  };
}

/**
 * Hook for modal management
 */
export function useModal() {
  const modalStack = useUIStore((s) => s.modalStack);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const closeAllModals = useUIStore((s) => s.closeAllModals);

  return {
    activeModal: modalStack[modalStack.length - 1] ?? null,
    modalCount: modalStack.length,
    openModal,
    closeModal,
    closeAllModals,
  };
}

/**
 * Hook for confirmation dialogs
 */
export function useConfirm() {
  const confirm = useUIStore((s) => s.confirm);
  return confirm;
}

/**
 * Hook for global loading state
 */
export function useGlobalLoading() {
  const globalLoading = useUIStore((s) => s.globalLoading);
  const loadingMessage = useUIStore((s) => s.loadingMessage);
  const setGlobalLoading = useUIStore((s) => s.setGlobalLoading);

  return {
    isLoading: globalLoading,
    message: loadingMessage,
    show: (message?: string) => setGlobalLoading(true, message),
    hide: () => setGlobalLoading(false),
  };
}
