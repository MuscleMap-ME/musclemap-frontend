/**
 * Toast Container
 *
 * Renders all active toasts from the UI store with animations.
 * Positioned at the bottom of the screen.
 */
import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, Layout } from 'react-native-reanimated';
import { XStack, YStack, Text } from 'tamagui';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RotateCcw,
} from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore, type Toast, type ToastType } from '@/stores';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const TOAST_ICONS: Record<ToastType, React.ComponentType<{ size: number; color: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  undo: RotateCcw,
};

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', icon: '#10B981' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', icon: '#EF4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', icon: '#F59E0B' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', icon: '#3B82F6' },
  undo: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', icon: '#8B5CF6' },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = TOAST_ICONS[toast.type];
  const colors = TOAST_COLORS[toast.type];

  const handleAction = () => {
    if (toast.action) {
      toast.action.onPress();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onDismiss();
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      exiting={FadeOutDown.springify().damping(15)}
      layout={Layout.springify()}
    >
      <Pressable onPress={onDismiss}>
        <XStack
          alignItems="center"
          gap="$3"
          padding="$3"
          marginHorizontal="$4"
          marginBottom="$2"
          backgroundColor={colors.bg}
          borderRadius="$4"
          borderWidth={1}
          borderColor={colors.border}
        >
          {/* Icon */}
          <Icon size={20} color={colors.icon} />

          {/* Message */}
          <Text
            flex={1}
            fontSize={14}
            color="$color12"
            numberOfLines={2}
          >
            {toast.message}
          </Text>

          {/* Action button */}
          {toast.action && (
            <Pressable onPress={handleAction}>
              <XStack
                paddingHorizontal="$3"
                paddingVertical="$2"
                backgroundColor={colors.border}
                borderRadius="$2"
              >
                <Text fontSize={12} fontWeight="600" color="white">
                  {toast.action.label}
                </Text>
              </XStack>
            </Pressable>
          )}
        </XStack>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <YStack
      position="absolute"
      bottom={insets.bottom + 80} // Above tab bar
      left={0}
      right={0}
      pointerEvents="box-none"
      zIndex={1000}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </YStack>
  );
}

export default ToastContainer;
