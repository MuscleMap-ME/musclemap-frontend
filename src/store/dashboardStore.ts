/**
 * Dashboard Store (Zustand)
 *
 * Manages customizable dashboard widget layout state:
 * - Widget positions and sizes
 * - Edit mode for drag-and-drop
 * - Layout persistence
 * - Widget visibility
 *
 * @example
 * // Only re-renders when widgets change
 * const widgets = useDashboard((s) => s.widgets);
 *
 * // Use shorthand hooks
 * const { isEditMode, toggleEditMode, widgets, moveWidget } = useDashboardLayout();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { DashboardWidget, WidgetDefinition, Platform } from '@musclemap/shared';

// ============================================
// TYPES
// ============================================

interface DashboardState {
  // Widget layout
  widgets: DashboardWidget[];
  columns: number;
  rowHeight: number;
  platform: Platform;

  // Edit mode
  isEditMode: boolean;

  // Available widgets (from server)
  availableWidgets: WidgetDefinition[];

  // Loading state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  loadLayout: () => Promise<void>;
  saveLayout: () => Promise<void>;
  loadAvailableWidgets: () => Promise<void>;

  // Widget management
  addWidget: (type: string) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  toggleWidgetVisibility: (id: string) => void;
  updateWidgetSettings: (id: string, settings: Record<string, unknown>) => void;

  // Layout actions
  toggleEditMode: () => void;
  resetToDefault: () => Promise<void>;
  setColumns: (columns: number) => void;
  setRowHeight: (height: number) => void;

  // Batch updates (for react-grid-layout)
  updateLayout: (layout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
}

// ============================================
// DEFAULT LAYOUT
// ============================================

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'current_path', type: 'current_path', x: 0, y: 0, w: 2, h: 1, visible: true, settings: {} },
  { id: 'stats', type: 'stats', x: 2, y: 0, w: 1, h: 2, visible: true, settings: {} },
  { id: 'quick_actions', type: 'quick_actions', x: 0, y: 1, w: 3, h: 1, visible: true, settings: {} },
  { id: 'xp_progress', type: 'xp_progress', x: 0, y: 2, w: 1, h: 1, visible: true, settings: {} },
  { id: 'daily_quests', type: 'daily_quests', x: 1, y: 2, w: 1, h: 1, visible: true, settings: {} },
  { id: 'insights', type: 'insights', x: 0, y: 3, w: 3, h: 1, visible: true, settings: {} },
  { id: 'daily_challenges', type: 'daily_challenges', x: 0, y: 4, w: 2, h: 1, visible: true, settings: {} },
  { id: 'todays_workout', type: 'todays_workout', x: 0, y: 5, w: 1, h: 1, visible: true, settings: {} },
  { id: 'weekly_progress', type: 'weekly_progress', x: 1, y: 5, w: 1, h: 1, visible: true, settings: {} },
  { id: 'nutrition', type: 'nutrition', x: 0, y: 6, w: 2, h: 1, visible: true, settings: {} },
  { id: 'muscle_map', type: 'muscle_map', x: 0, y: 7, w: 2, h: 2, visible: true, settings: {} },
  { id: 'daily_tip', type: 'daily_tip', x: 0, y: 9, w: 2, h: 1, visible: true, settings: {} },
  { id: 'milestones', type: 'milestones', x: 0, y: 10, w: 2, h: 1, visible: true, settings: {} },
  { id: 'adventure_map', type: 'adventure_map', x: 0, y: 11, w: 2, h: 2, visible: true, settings: {} },
  { id: 'activity', type: 'activity', x: 0, y: 13, w: 2, h: 2, visible: true, settings: {} },
  { id: 'hydration', type: 'hydration', x: 2, y: 2, w: 1, h: 1, visible: true, settings: {} },
  { id: 'music_player', type: 'music_player', x: 2, y: 3, w: 1, h: 1, visible: false, settings: {} },
  { id: 'coach_tips', type: 'coach_tips', x: 2, y: 4, w: 1, h: 1, visible: true, settings: {} },
];

// ============================================
// API HELPERS
// ============================================

const getToken = () => localStorage.getItem('musclemap_token');

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

// ============================================
// STORE
// ============================================

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        widgets: DEFAULT_WIDGETS,
        columns: 12,
        rowHeight: 100,
        platform: 'web',
        isEditMode: false,
        availableWidgets: [],
        isLoading: false,
        isSaving: false,
        error: null,

        // ============================================
        // LOAD/SAVE
        // ============================================

        loadLayout: async () => {
          const token = getToken();
          if (!token) return;

          set({ isLoading: true, error: null });

          try {
            const res = await fetchWithAuth('/api/me/dashboard/layout?platform=web');
            if (!res.ok) throw new Error('Failed to load layout');

            const data = await res.json();
            if (data.success && data.data?.layout) {
              set({
                widgets: data.data.layout.widgets || DEFAULT_WIDGETS,
                columns: data.data.layout.columns || 12,
                rowHeight: data.data.layout.rowHeight || 100,
                isLoading: false,
              });
            } else {
              // No saved layout, use defaults
              set({ widgets: DEFAULT_WIDGETS, isLoading: false });
            }
          } catch {
            set({ error: 'Failed to load layout', isLoading: false });
          }
        },

        saveLayout: async () => {
          const token = getToken();
          if (!token) return;

          const { widgets, columns, rowHeight } = get();
          set({ isSaving: true, error: null });

          try {
            const res = await fetchWithAuth('/api/me/dashboard/layout?platform=web', {
              method: 'PUT',
              body: JSON.stringify({ widgets, columns, rowHeight }),
            });

            if (!res.ok) throw new Error('Failed to save layout');

            set({ isSaving: false });
          } catch {
            set({ error: 'Failed to save layout', isSaving: false });
          }
        },

        loadAvailableWidgets: async () => {
          try {
            const res = await fetchWithAuth('/api/me/dashboard/widgets');
            if (!res.ok) throw new Error('Failed to load widgets');

            const data = await res.json();
            if (data.success && data.data?.widgets) {
              set({ availableWidgets: data.data.widgets });
            }
          } catch {
            set({ error: 'Failed to load available widgets' });
          }
        },

        // ============================================
        // WIDGET MANAGEMENT
        // ============================================

        addWidget: (type) => {
          const { widgets, availableWidgets } = get();

          // Check if widget already exists
          if (widgets.some((w) => w.type === type)) {
            // Just make it visible
            set({
              widgets: widgets.map((w) =>
                w.type === type ? { ...w, visible: true } : w
              ),
            });
            return;
          }

          // Find widget definition
          const def = availableWidgets.find((w) => w.id === type);
          if (!def) return;

          // Find position for new widget (bottom of current layout)
          const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

          const newWidget: DashboardWidget = {
            id: `${type}_${Date.now()}`,
            type,
            x: 0,
            y: maxY,
            w: def.defaultWidth,
            h: def.defaultHeight,
            visible: true,
            settings: {},
          };

          set({ widgets: [...widgets, newWidget] });
        },

        removeWidget: (id) => {
          set((s) => ({
            widgets: s.widgets.filter((w) => w.id !== id),
          }));
        },

        updateWidget: (id, updates) => {
          set((s) => ({
            widgets: s.widgets.map((w) =>
              w.id === id ? { ...w, ...updates } : w
            ),
          }));
        },

        moveWidget: (id, x, y) => {
          set((s) => ({
            widgets: s.widgets.map((w) =>
              w.id === id ? { ...w, x, y } : w
            ),
          }));
        },

        resizeWidget: (id, w, h) => {
          set((s) => ({
            widgets: s.widgets.map((widget) =>
              widget.id === id ? { ...widget, w, h } : widget
            ),
          }));
        },

        toggleWidgetVisibility: (id) => {
          set((s) => ({
            widgets: s.widgets.map((w) =>
              w.id === id ? { ...w, visible: !w.visible } : w
            ),
          }));
        },

        updateWidgetSettings: (id, settings) => {
          set((s) => ({
            widgets: s.widgets.map((w) =>
              w.id === id ? { ...w, settings: { ...w.settings, ...settings } } : w
            ),
          }));
        },

        // ============================================
        // LAYOUT ACTIONS
        // ============================================

        toggleEditMode: () => {
          const { isEditMode, saveLayout } = get();

          // Auto-save when exiting edit mode
          if (isEditMode) {
            saveLayout();
          }

          set({ isEditMode: !isEditMode });
        },

        resetToDefault: async () => {
          set({ widgets: DEFAULT_WIDGETS });
          await get().saveLayout();
        },

        setColumns: (columns) => set({ columns }),
        setRowHeight: (rowHeight) => set({ rowHeight }),

        // Batch update for react-grid-layout
        updateLayout: (layout) => {
          set((s) => ({
            widgets: s.widgets.map((widget) => {
              const item = layout.find((l) => l.i === widget.id);
              if (item) {
                return {
                  ...widget,
                  x: item.x,
                  y: item.y,
                  w: item.w,
                  h: item.h,
                };
              }
              return widget;
            }),
          }));
        },
      }),
      {
        name: 'musclemap-dashboard',
        partialize: (state) => ({
          widgets: state.widgets,
          columns: state.columns,
          rowHeight: state.rowHeight,
        }),
      }
    )
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for dashboard layout management
 */
export const useDashboardLayout = () => {
  const widgets = useDashboardStore((s) => s.widgets);
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const columns = useDashboardStore((s) => s.columns);
  const rowHeight = useDashboardStore((s) => s.rowHeight);

  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const updateLayout = useDashboardStore((s) => s.updateLayout);
  const saveLayout = useDashboardStore((s) => s.saveLayout);
  const resetToDefault = useDashboardStore((s) => s.resetToDefault);

  // Get only visible widgets
  const visibleWidgets = widgets.filter((w) => w.visible);

  // Convert to react-grid-layout format
  const gridLayout = visibleWidgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
  }));

  return {
    widgets,
    visibleWidgets,
    gridLayout,
    isEditMode,
    columns,
    rowHeight,
    toggleEditMode,
    updateLayout,
    save: saveLayout,
    reset: resetToDefault,
  };
};

/**
 * Hook for managing individual widgets
 */
export const useWidgetManager = () => {
  const widgets = useDashboardStore((s) => s.widgets);
  const availableWidgets = useDashboardStore((s) => s.availableWidgets);

  const addWidget = useDashboardStore((s) => s.addWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const toggleVisibility = useDashboardStore((s) => s.toggleWidgetVisibility);
  const updateSettings = useDashboardStore((s) => s.updateWidgetSettings);
  const loadAvailable = useDashboardStore((s) => s.loadAvailableWidgets);

  // Get widgets that are not currently in layout
  const unusedWidgets = availableWidgets.filter(
    (def) => !widgets.some((w) => w.type === def.id && w.visible)
  );

  return {
    widgets,
    availableWidgets,
    unusedWidgets,
    add: addWidget,
    remove: removeWidget,
    toggleVisibility,
    updateSettings,
    loadAvailable,
    getWidget: (id: string) => widgets.find((w) => w.id === id),
    getWidgetDef: (type: string) => availableWidgets.find((w) => w.id === type),
  };
};

/**
 * Hook for dashboard loading/saving state
 */
export const useDashboardState = () => {
  const isLoading = useDashboardStore((s) => s.isLoading);
  const isSaving = useDashboardStore((s) => s.isSaving);
  const error = useDashboardStore((s) => s.error);
  const loadLayout = useDashboardStore((s) => s.loadLayout);

  return {
    isLoading,
    isSaving,
    error,
    load: loadLayout,
  };
};

export default useDashboardStore;
