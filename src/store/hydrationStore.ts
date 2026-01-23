/**
 * Hydration Store (Zustand)
 *
 * Manages water intake tracking and reminders:
 * - Daily hydration goal tracking
 * - Quick-log functionality
 * - Reminder scheduling
 * - History persistence
 *
 * Reminders are DEFAULT ON per user requirements.
 *
 * @example
 * const { currentIntake, logWater, dailyGoal } = useHydrationTracker();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { resilientStorage, getToken } from '../lib/zustand-storage';

// ============================================
// TYPES
// ============================================

interface HydrationLog {
  id: string;
  amount: number; // in oz
  timestamp: Date;
}

interface HydrationState {
  // Today's tracking
  todayLogs: HydrationLog[];
  currentIntake: number; // in oz
  dailyGoal: number; // in oz (default 64)

  // Reminder state
  remindersEnabled: boolean;
  reminderIntervalMinutes: number;
  lastReminderAt: Date | null;
  nextReminderAt: Date | null;
  reminderTimerId: number | null;

  // During workout
  showDuringWorkout: boolean;
  workoutMode: boolean;

  // Sound/vibration
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Loading state
  isLoading: boolean;
  isSyncing: boolean;

  // Actions
  logWater: (amount: number) => void;
  undoLastLog: () => void;
  setDailyGoal: (goal: number) => void;

  // Reminder controls
  enableReminders: () => void;
  disableReminders: () => void;
  setReminderInterval: (minutes: number) => void;
  snoozeReminder: (minutes?: number) => void;
  dismissReminder: () => void;

  // Workout mode
  enterWorkoutMode: () => void;
  exitWorkoutMode: () => void;

  // Settings sync
  updateSettings: (settings: Partial<HydrationSettings>) => void;

  // Sync with server
  loadFromServer: () => Promise<void>;
  syncToServer: (amount: number) => Promise<void>;

  // Day management
  resetForNewDay: () => void;
}

interface HydrationSettings {
  enabled: boolean;
  intervalMinutes: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showDuringWorkout: boolean;
  dailyGoalOz: number;
}

// ============================================
// CONSTANTS
// ============================================

const QUICK_LOG_AMOUNTS = [8, 12, 16, 20, 32]; // Common cup sizes in oz

// ============================================
// HELPERS
// ============================================

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

function generateId(): string {
  return `hydration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// ============================================
// STORE
// ============================================

export const useHydrationStore = create<HydrationState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state - reminders DEFAULT ON per requirements
        todayLogs: [],
        currentIntake: 0,
        dailyGoal: 64, // 64 oz (8 cups)

        remindersEnabled: true, // DEFAULT ON
        reminderIntervalMinutes: 15,
        lastReminderAt: null,
        nextReminderAt: null,
        reminderTimerId: null,

        showDuringWorkout: true,
        workoutMode: false,

        soundEnabled: true,
        vibrationEnabled: true,

        isLoading: false,
        isSyncing: false,

        // ============================================
        // WATER LOGGING
        // ============================================

        logWater: (amount) => {
          const log: HydrationLog = {
            id: generateId(),
            amount,
            timestamp: new Date(),
          };

          set((s) => ({
            todayLogs: [...s.todayLogs, log],
            currentIntake: s.currentIntake + amount,
          }));

          // Sync to server
          get().syncToServer(amount);

          // Reset reminder timer
          if (get().remindersEnabled) {
            get().scheduleNextReminder();
          }
        },

        undoLastLog: () => {
          const { todayLogs } = get();
          if (todayLogs.length === 0) return;

          const lastLog = todayLogs[todayLogs.length - 1];
          set((s) => ({
            todayLogs: s.todayLogs.slice(0, -1),
            currentIntake: Math.max(0, s.currentIntake - lastLog.amount),
          }));
        },

        setDailyGoal: (goal) => {
          set({ dailyGoal: goal });
        },

        // ============================================
        // REMINDER CONTROLS
        // ============================================

        enableReminders: () => {
          set({ remindersEnabled: true });
          get().scheduleNextReminder();
        },

        disableReminders: () => {
          const { reminderTimerId } = get();
          if (reminderTimerId) {
            clearTimeout(reminderTimerId);
          }
          set({
            remindersEnabled: false,
            reminderTimerId: null,
            nextReminderAt: null,
          });
        },

        setReminderInterval: (minutes) => {
          set({ reminderIntervalMinutes: minutes });
          if (get().remindersEnabled) {
            get().scheduleNextReminder();
          }
        },

        snoozeReminder: (minutes = 5) => {
          const nextReminder = new Date(Date.now() + minutes * 60 * 1000);
          set({ nextReminderAt: nextReminder });
          get().scheduleReminderAt(nextReminder);
        },

        dismissReminder: () => {
          set({ lastReminderAt: new Date() });
          if (get().remindersEnabled) {
            get().scheduleNextReminder();
          }
        },

        // ============================================
        // WORKOUT MODE
        // ============================================

        enterWorkoutMode: () => {
          set({ workoutMode: true });
        },

        exitWorkoutMode: () => {
          set({ workoutMode: false });
        },

        // ============================================
        // SETTINGS
        // ============================================

        updateSettings: (settings) => {
          set((s) => ({
            remindersEnabled: settings.enabled ?? s.remindersEnabled,
            reminderIntervalMinutes: settings.intervalMinutes ?? s.reminderIntervalMinutes,
            soundEnabled: settings.soundEnabled ?? s.soundEnabled,
            vibrationEnabled: settings.vibrationEnabled ?? s.vibrationEnabled,
            showDuringWorkout: settings.showDuringWorkout ?? s.showDuringWorkout,
            dailyGoal: settings.dailyGoalOz ?? s.dailyGoal,
          }));

          // Update reminder schedule if enabled
          if (settings.enabled !== false && get().remindersEnabled) {
            get().scheduleNextReminder();
          }
        },

        // ============================================
        // SERVER SYNC
        // ============================================

        loadFromServer: async () => {
          const token = getToken();
          if (!token) return;

          set({ isLoading: true });

          try {
            const res = await fetchWithAuth('/api/me/hydration/today');
            if (!res.ok) throw new Error('Failed to load hydration');

            const data = await res.json();
            if (data.success && data.data) {
              const logs = (data.data.logs || []).map((log: { id: string; amount_oz: number; logged_at: string }) => ({
                id: log.id,
                amount: log.amount_oz,
                timestamp: new Date(log.logged_at),
              }));

              const totalIntake = logs.reduce((sum: number, log: HydrationLog) => sum + log.amount, 0);

              set({
                todayLogs: logs,
                currentIntake: totalIntake,
                isLoading: false,
              });
            }
          } catch {
            set({ isLoading: false });
          }
        },

        syncToServer: async (amount) => {
          const token = getToken();
          if (!token) return;

          set({ isSyncing: true });

          try {
            await fetchWithAuth('/api/me/hydration', {
              method: 'POST',
              body: JSON.stringify({ amount_oz: amount }),
            });
          } catch {
            // Silent fail - local state is source of truth
          } finally {
            set({ isSyncing: false });
          }
        },

        // ============================================
        // DAY MANAGEMENT
        // ============================================

        resetForNewDay: () => {
          set({
            todayLogs: [],
            currentIntake: 0,
            lastReminderAt: null,
          });
        },

        // ============================================
        // INTERNAL HELPERS
        // ============================================

        scheduleNextReminder: () => {
          const { reminderIntervalMinutes, reminderTimerId } = get();

          // Clear existing timer
          if (reminderTimerId) {
            clearTimeout(reminderTimerId);
          }

          const nextReminder = new Date(Date.now() + reminderIntervalMinutes * 60 * 1000);
          set({ nextReminderAt: nextReminder });
          get().scheduleReminderAt(nextReminder);
        },

        scheduleReminderAt: (time: Date) => {
          const delay = time.getTime() - Date.now();
          if (delay <= 0) return;

          const timerId = window.setTimeout(() => {
            const { workoutMode, showDuringWorkout } = get();

            // Don't show during workout if disabled
            if (workoutMode && !showDuringWorkout) {
              get().scheduleNextReminder();
              return;
            }

            // Trigger reminder event
            get().triggerReminder();
          }, delay);

          set({ reminderTimerId: timerId });
        },

        triggerReminder: () => {
          const { soundEnabled, vibrationEnabled } = get();

          // Play sound
          if (soundEnabled) {
            try {
              // Use Web Audio API for reminder sound
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();

              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);

              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              gainNode.gain.value = 0.3;

              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.2);
            } catch {
              // Audio not available
            }
          }

          // Vibrate
          if (vibrationEnabled && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          // Dispatch custom event for UI to show notification
          window.dispatchEvent(
            new CustomEvent('hydration-reminder', {
              detail: {
                currentIntake: get().currentIntake,
                dailyGoal: get().dailyGoal,
              },
            })
          );

          set({ lastReminderAt: new Date() });
        },
      }),
      {
        name: 'musclemap-hydration',
        storage: createJSONStorage(() => resilientStorage),
        partialize: (state) => ({
          todayLogs: state.todayLogs,
          currentIntake: state.currentIntake,
          dailyGoal: state.dailyGoal,
          remindersEnabled: state.remindersEnabled,
          reminderIntervalMinutes: state.reminderIntervalMinutes,
          soundEnabled: state.soundEnabled,
          vibrationEnabled: state.vibrationEnabled,
          showDuringWorkout: state.showDuringWorkout,
        }),
        onRehydrate: (_state) => {
          // Check if stored data is from a previous day
          return (state) => {
            if (state && state.todayLogs.length > 0) {
              const lastLog = state.todayLogs[state.todayLogs.length - 1];
              if (!isToday(new Date(lastLog.timestamp))) {
                state.resetForNewDay();
              }
            }

            // Start reminders if enabled
            if (state?.remindersEnabled) {
              // Use setTimeout to avoid blocking
              setTimeout(() => {
                state.scheduleNextReminder();
              }, 1000);
            }
          };
        },
      }
    )
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for hydration tracking
 */
export const useHydrationTracker = () => {
  const currentIntake = useHydrationStore((s) => s.currentIntake);
  const dailyGoal = useHydrationStore((s) => s.dailyGoal);
  const todayLogs = useHydrationStore((s) => s.todayLogs);

  const logWater = useHydrationStore((s) => s.logWater);
  const undoLastLog = useHydrationStore((s) => s.undoLastLog);
  const setDailyGoal = useHydrationStore((s) => s.setDailyGoal);
  const loadFromServer = useHydrationStore((s) => s.loadFromServer);

  // Calculate progress
  const progress = dailyGoal > 0 ? Math.min(100, (currentIntake / dailyGoal) * 100) : 0;
  const remaining = Math.max(0, dailyGoal - currentIntake);
  const isGoalMet = currentIntake >= dailyGoal;

  return {
    currentIntake,
    dailyGoal,
    todayLogs,
    progress,
    remaining,
    isGoalMet,
    logWater,
    undoLastLog,
    setDailyGoal,
    load: loadFromServer,
    quickLogAmounts: QUICK_LOG_AMOUNTS,
  };
};

/**
 * Hook for hydration reminders
 */
export const useHydrationReminders = () => {
  const remindersEnabled = useHydrationStore((s) => s.remindersEnabled);
  const reminderIntervalMinutes = useHydrationStore((s) => s.reminderIntervalMinutes);
  const nextReminderAt = useHydrationStore((s) => s.nextReminderAt);
  const lastReminderAt = useHydrationStore((s) => s.lastReminderAt);

  const enableReminders = useHydrationStore((s) => s.enableReminders);
  const disableReminders = useHydrationStore((s) => s.disableReminders);
  const setReminderInterval = useHydrationStore((s) => s.setReminderInterval);
  const snoozeReminder = useHydrationStore((s) => s.snoozeReminder);
  const dismissReminder = useHydrationStore((s) => s.dismissReminder);

  return {
    enabled: remindersEnabled,
    intervalMinutes: reminderIntervalMinutes,
    nextReminderAt,
    lastReminderAt,
    enable: enableReminders,
    disable: disableReminders,
    setInterval: setReminderInterval,
    snooze: snoozeReminder,
    dismiss: dismissReminder,
  };
};

/**
 * Hook for hydration settings
 */
export const useHydrationSettings = () => {
  const remindersEnabled = useHydrationStore((s) => s.remindersEnabled);
  const reminderIntervalMinutes = useHydrationStore((s) => s.reminderIntervalMinutes);
  const soundEnabled = useHydrationStore((s) => s.soundEnabled);
  const vibrationEnabled = useHydrationStore((s) => s.vibrationEnabled);
  const showDuringWorkout = useHydrationStore((s) => s.showDuringWorkout);
  const dailyGoal = useHydrationStore((s) => s.dailyGoal);

  const updateSettings = useHydrationStore((s) => s.updateSettings);

  return {
    settings: {
      enabled: remindersEnabled,
      intervalMinutes: reminderIntervalMinutes,
      soundEnabled,
      vibrationEnabled,
      showDuringWorkout,
      dailyGoalOz: dailyGoal,
    },
    updateSettings,
  };
};

/**
 * Hook for workout mode integration
 */
export const useHydrationWorkoutMode = () => {
  const workoutMode = useHydrationStore((s) => s.workoutMode);
  const showDuringWorkout = useHydrationStore((s) => s.showDuringWorkout);

  const enterWorkoutMode = useHydrationStore((s) => s.enterWorkoutMode);
  const exitWorkoutMode = useHydrationStore((s) => s.exitWorkoutMode);

  return {
    isWorkoutMode: workoutMode,
    showReminders: showDuringWorkout,
    enterWorkout: enterWorkoutMode,
    exitWorkout: exitWorkoutMode,
  };
};

export default useHydrationStore;
