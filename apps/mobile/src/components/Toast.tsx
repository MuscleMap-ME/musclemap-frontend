/**
 * Toast Component for React Native
 *
 * Provides undo-capable toast notifications for touchscreen-first interactions.
 * Replaces Alert.alert confirmations with optimistic UI patterns.
 */

import { useEffect, useRef, useState, createContext, useContext, useCallback, ReactNode } from 'react';
import { Animated, StyleSheet, Pressable } from 'react-native';
import { Text, XStack, YStack, Button } from 'tamagui';
import { haptic } from '../utils/haptics';

// Toast types
export type ToastType = 'success' | 'error' | 'info' | 'undo' | 'warning';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

// Toast Context
interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  showUndo: (message: string, onUndo: () => void, duration?: number) => string;
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast colors
const TOAST_COLORS: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.5)' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.5)' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)' },
  undo: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)' },
  warning: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.5)' },
};

// Individual Toast Item
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback based on type
    if (toast.type === 'success') haptic('success');
    else if (toast.type === 'error') haptic('error');
    else if (toast.type === 'warning') haptic('warning');
    else haptic('light');

    // Auto-dismiss
    const duration = toast.duration ?? (toast.type === 'undo' ? 5000 : 3000);
    const timer = setTimeout(() => {
      animateOut(() => onDismiss(toast.id));
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleAction = () => {
    if (toast.action) {
      haptic('light');
      toast.action.onPress();
      animateOut(() => onDismiss(toast.id));
    }
  };

  const colors = TOAST_COLORS[toast.type];

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <XStack
        alignItems="center"
        justifyContent="space-between"
        gap="$3"
        flex={1}
      >
        <Text color="$gray12" flex={1} fontSize="$4">
          {toast.message}
        </Text>
        {toast.action && (
          <Button
            size="$3"
            backgroundColor="$blue10"
            onPress={handleAction}
            pressStyle={{ scale: 0.98 }}
          >
            <Text color="white" fontWeight="bold">
              {toast.action.label}
            </Text>
          </Button>
        )}
      </XStack>
    </Animated.View>
  );
}

// Toast Provider
interface ToastProviderProps {
  children: ReactNode;
  maxVisible?: number;
}

export function ToastProvider({ children, maxVisible = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).slice(2, 11);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      return updated.slice(-maxVisible);
    });

    return id;
  }, [maxVisible]);

  const showUndo = useCallback(
    (message: string, onUndo: () => void, duration = 5000) => {
      return showToast({
        message,
        type: 'undo',
        action: { label: 'Undo', onPress: onUndo },
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
      {toasts.length > 0 && (
        <YStack
          position="absolute"
          bottom={100}
          left={16}
          right={16}
          gap="$2"
          pointerEvents="box-none"
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </YStack>
      )}
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
 * // Undo pattern (replaces Alert.alert confirmation)
 * const handleLeave = () => {
 *   const previousMembership = leaveHangout(id);
 *   showUndo('Left hangout', () => rejoinHangout(previousMembership));
 * };
 *
 * // Success feedback
 * showSuccess('Joined hangout!');
 *
 * // Error feedback
 * showError('Failed to join');
 * ```
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ToastProvider;
