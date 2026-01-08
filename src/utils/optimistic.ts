/**
 * Optimistic UI Utilities
 *
 * Implements the optimistic update pattern with rollback capability.
 * Used for touchscreen-first interactions where immediate feedback is critical.
 */

export interface OptimisticAction<T, R = void> {
  /** Immediately apply optimistic update, returns previous state */
  apply: () => T;
  /** Persist to backend */
  persist: () => Promise<R>;
  /** Rollback if persist fails */
  rollback: (previousState: T) => void;
  /** Optional: called on success */
  onSuccess?: (result: R) => void;
  /** Optional: called on error */
  onError?: (error: Error) => void;
}

/**
 * Execute an optimistic action with automatic rollback on failure
 *
 * @example
 * ```ts
 * await executeOptimistic({
 *   apply: () => {
 *     const prev = [...items];
 *     setItems(items.filter(i => i.id !== id));
 *     return prev;
 *   },
 *   persist: () => api.deleteItem(id),
 *   rollback: (prev) => setItems(prev),
 *   onSuccess: () => showToast('Deleted'),
 *   onError: (err) => showToast(err.message, 'error'),
 * });
 * ```
 */
export async function executeOptimistic<T, R = void>(
  action: OptimisticAction<T, R>
): Promise<R | undefined> {
  const previousState = action.apply();

  try {
    const result = await action.persist();
    action.onSuccess?.(result);
    return result;
  } catch (error) {
    action.rollback(previousState);
    action.onError?.(error instanceof Error ? error : new Error(String(error)));
    return undefined;
  }
}

/**
 * Create a debounced save function for auto-save patterns
 *
 * @example
 * ```ts
 * const debouncedSave = createDebouncedSave(
 *   (data) => api.saveSettings(data),
 *   500
 * );
 *
 * // Call on every change - will debounce automatically
 * debouncedSave({ theme: 'dark' });
 * ```
 */
export function createDebouncedSave<T>(
  saveFn: (data: T) => Promise<void>,
  debounceMs: number = 500
): (data: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingData: T | null = null;

  return (data: T) => {
    pendingData = data;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      if (pendingData !== null) {
        try {
          await saveFn(pendingData);
        } catch (error) {
          console.error('Debounced save failed:', error);
        }
        pendingData = null;
      }
    }, debounceMs);
  };
}

/**
 * Create an undo-able action that can be reversed within a time window
 *
 * @example
 * ```ts
 * const { execute, undo, isPending } = createUndoableAction(
 *   () => deleteItem(id),
 *   5000
 * );
 *
 * execute(); // Starts timer, doesn't persist yet
 * // User can call undo() within 5 seconds
 * // After 5 seconds, persist is called automatically
 * ```
 */
export function createUndoableAction(
  persistFn: () => Promise<void>,
  undoWindowMs: number = 5000
): {
  execute: () => void;
  undo: () => void;
  isPending: () => boolean;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pending = false;

  return {
    execute: () => {
      pending = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        if (pending) {
          try {
            await persistFn();
          } catch (error) {
            console.error('Undoable action persist failed:', error);
          }
          pending = false;
        }
      }, undoWindowMs);
    },

    undo: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pending = false;
    },

    isPending: () => pending,
  };
}
