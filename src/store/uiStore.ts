/**
 * UI Store (Zustand)
 *
 * Global UI state that changes frequently. Uses selector-based subscriptions
 * to minimize re-renders - components only update when their selected slice changes.
 *
 * @example
 * // Only re-renders when sidebarOpen changes
 * const sidebarOpen = useUIStore((s) => s.sidebarOpen);
 *
 * // Multiple selectors - still efficient
 * const { sidebarOpen, modalOpen } = useUIStore((s) => ({
 *   sidebarOpen: s.sidebarOpen,
 *   modalOpen: s.modalOpen,
 * }));
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * UI Store
 * Handles all transient UI state that doesn't need persistence
 */
export const useUIStore = create(
  subscribeWithSelector((set, get) => ({
    // ============================================
    // NAVIGATION & LAYOUT
    // ============================================
    sidebarOpen: false,
    sidebarCollapsed: false,
    mobileMenuOpen: false,

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

    // ============================================
    // MODALS & DIALOGS
    // ============================================
    activeModal: null,
    modalData: null,

    openModal: (modalId, data = null) => set({ activeModal: modalId, modalData: data }),
    closeModal: () => set({ activeModal: null, modalData: null }),

    // Confirmation dialog state
    confirmDialog: null,
    showConfirmDialog: ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default' }) =>
      set({
        confirmDialog: { title, message, onConfirm, onCancel, confirmText, cancelText, variant },
      }),
    hideConfirmDialog: () => set({ confirmDialog: null }),

    // ============================================
    // LOADING & PROGRESS
    // ============================================
    globalLoading: false,
    loadingMessage: '',
    navigationLoading: false,

    setGlobalLoading: (loading, message = '') => set({ globalLoading: loading, loadingMessage: message }),
    setNavigationLoading: (loading) => set({ navigationLoading: loading }),

    // Pending operations for optimistic UI
    pendingOperations: new Set(),
    addPendingOperation: (id) =>
      set((s) => {
        const newSet = new Set(s.pendingOperations);
        newSet.add(id);
        return { pendingOperations: newSet };
      }),
    removePendingOperation: (id) =>
      set((s) => {
        const newSet = new Set(s.pendingOperations);
        newSet.delete(id);
        return { pendingOperations: newSet };
      }),
    isPending: (id) => get().pendingOperations.has(id),

    // ============================================
    // NOTIFICATIONS & TOASTS
    // ============================================
    toasts: [],
    addToast: (toast) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      const newToast = { id, ...toast, createdAt: Date.now() };
      set((s) => ({ toasts: [...s.toasts, newToast] }));

      // Auto-dismiss after duration (default 5s)
      if (toast.duration !== 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, toast.duration || 5000);
      }

      return id;
    },
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    clearToasts: () => set({ toasts: [] }),

    // ============================================
    // SELECTION STATE
    // ============================================
    selectedItems: [],
    selectionMode: false,

    setSelectionMode: (enabled) => set({ selectionMode: enabled, selectedItems: enabled ? [] : [] }),
    toggleItemSelection: (itemId) =>
      set((s) => ({
        selectedItems: s.selectedItems.includes(itemId)
          ? s.selectedItems.filter((id) => id !== itemId)
          : [...s.selectedItems, itemId],
      })),
    selectAll: (itemIds) => set({ selectedItems: itemIds }),
    clearSelection: () => set({ selectedItems: [], selectionMode: false }),

    // ============================================
    // SCROLL STATE
    // ============================================
    scrollPositions: {},
    setScrollPosition: (key, position) =>
      set((s) => ({
        scrollPositions: { ...s.scrollPositions, [key]: position },
      })),
    getScrollPosition: (key) => get().scrollPositions[key] || 0,

    // ============================================
    // RESPONSIVE HELPERS
    // ============================================
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,

    updateBreakpoints: () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      set({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
    },
  }))
);

// FE-001 FIX: Initialize responsive listener with cleanup capability
// Store the handler so it can be removed if needed (e.g., in tests or SSR)
let resizeHandler = null;
let resizeTimeout = null;

export function initResizeListener() {
  if (typeof window === 'undefined') return () => {};

  // Clean up any existing listener first
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }

  resizeHandler = () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      useUIStore.getState().updateBreakpoints();
    }, 100);
  };

  window.addEventListener('resize', resizeHandler);

  // Return cleanup function
  return () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
  };
}

// Auto-initialize on module load (but provide cleanup)
if (typeof window !== 'undefined') {
  initResizeListener();
}

/**
 * Shorthand hooks for common UI operations
 */
export const useModal = () => {
  const activeModal = useUIStore((s) => s.activeModal);
  const modalData = useUIStore((s) => s.modalData);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);

  return { activeModal, modalData, openModal, closeModal };
};

export const useToast = () => {
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);

  return {
    toast: (message, options = {}) => addToast({ message, type: 'default', ...options }),
    success: (message, options = {}) => addToast({ message, type: 'success', ...options }),
    error: (message, options = {}) => addToast({ message, type: 'error', ...options }),
    warning: (message, options = {}) => addToast({ message, type: 'warning', ...options }),
    info: (message, options = {}) => addToast({ message, type: 'info', ...options }),
    dismiss: removeToast,
  };
};

export const useConfirm = () => {
  const showConfirmDialog = useUIStore((s) => s.showConfirmDialog);
  const hideConfirmDialog = useUIStore((s) => s.hideConfirmDialog);

  return {
    confirm: (options) =>
      new Promise((resolve) => {
        showConfirmDialog({
          ...options,
          onConfirm: () => {
            hideConfirmDialog();
            resolve(true);
          },
          onCancel: () => {
            hideConfirmDialog();
            resolve(false);
          },
        });
      }),
  };
};

export const useResponsive = () => {
  const isMobile = useUIStore((s) => s.isMobile);
  const isTablet = useUIStore((s) => s.isTablet);
  const isDesktop = useUIStore((s) => s.isDesktop);

  return { isMobile, isTablet, isDesktop };
};

export default useUIStore;
