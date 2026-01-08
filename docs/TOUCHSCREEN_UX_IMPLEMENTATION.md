# MuscleMap Touchscreen-First UX Implementation Guide

**Version:** 1.0
**Last Updated:** January 2025

This document provides component-by-component specifications for implementing touchscreen-first interactions.

---

## Table of Contents

1. [Core Utilities](#1-core-utilities)
2. [Button Components](#2-button-components)
3. [Card Components](#3-card-components)
4. [Gesture System](#4-gesture-system)
5. [Toast & Undo System](#5-toast--undo-system)
6. [Form Components](#6-form-components)
7. [Navigation Patterns](#7-navigation-patterns)
8. [Haptic Feedback](#8-haptic-feedback)

---

## 1. Core Utilities

### 1.1 Haptic Feedback Utility

**File:** `src/utils/haptics.ts`

```typescript
/**
 * Cross-platform haptic feedback utility
 * Works on web (vibration API), iOS (Taptic), and Android
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const VIBRATION_PATTERNS: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 10],
  warning: [20, 30, 20],
  error: [50, 30, 50],
  selection: [5],
};

export function haptic(type: HapticType = 'light'): void {
  // Web Vibration API
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(VIBRATION_PATTERNS[type]);
  }
}

// React Native version (separate file for mobile)
export function hapticNative(type: HapticType = 'light'): void {
  // Uses expo-haptics or react-native-haptic-feedback
}
```

### 1.2 Optimistic Action Utility

**File:** `src/utils/optimistic.ts`

```typescript
/**
 * Optimistic UI update pattern with rollback capability
 */

interface OptimisticAction<T> {
  // Immediately apply optimistic update
  apply: () => T;
  // Persist to backend
  persist: () => Promise<void>;
  // Rollback if persist fails
  rollback: (previousState: T) => void;
  // Show undo toast
  undoLabel?: string;
  undoDuration?: number;
}

export async function executeOptimistic<T>(action: OptimisticAction<T>): Promise<void> {
  const previousState = action.apply();

  try {
    await action.persist();
  } catch (error) {
    action.rollback(previousState);
    throw error;
  }
}
```

---

## 2. Button Components

### 2.1 GlassButton (Web)

**File:** `src/components/glass/GlassButton.jsx`

**Changes Required:**
- Increase minimum touch targets
- Add touch feedback classes
- Ensure proper tap highlight behavior

```jsx
// UPDATED: Touchscreen-first sizes
const SIZES = {
  sm: 'px-4 py-2.5 text-sm min-h-[44px]',      // Was 24px, now 44px min
  md: 'px-5 py-3 text-base min-h-[48px]',      // Was 36px, now 48px min
  lg: 'px-6 py-3.5 text-base min-h-[52px]',    // Was 44px, now 52px min
  xl: 'px-8 py-4 text-lg min-h-[56px]',        // Was 52px, now 56px min
};

// UPDATED: Icon button minimum sizes
const ICON_SIZES = {
  sm: 'w-10 h-10',   // Was 32px, now 40px
  md: 'w-12 h-12',   // Was 40px, now 48px
  lg: 'w-14 h-14',   // Was 48px, now 56px
  xl: 'w-16 h-16',   // Was 56px, now 64px
};

// ADD: Touch feedback styles
const TOUCH_CLASSES = `
  touch-action-manipulation
  -webkit-tap-highlight-color-transparent
  select-none
  active:scale-[0.98]
  transition-transform
`;
```

### 2.2 Button (Mobile - Tamagui)

**File:** `packages/ui/src/Button.tsx`

```typescript
export const Button = styled(TamaguiButton, {
  name: 'Button',

  // ADD: Base touchscreen styles
  touchAction: 'manipulation',
  userSelect: 'none',

  variants: {
    size: {
      sm: {
        height: 44,            // Was 32, now 44
        paddingHorizontal: '$4',
        fontSize: '$3',
      },
      md: {
        height: 48,            // Was 40, now 48
        paddingHorizontal: '$5',
        fontSize: '$4',
      },
      lg: {
        height: 56,            // Was 48, now 56
        paddingHorizontal: '$6',
        fontSize: '$5',
      },
    },
    // ... existing variants
  },
});
```

### 2.3 ActionButton (New Component)

**File:** `src/components/glass/ActionButton.jsx`

A specialized button for primary actions with enhanced touch feedback:

```jsx
/**
 * ActionButton - Full-width primary action with haptic feedback
 *
 * Used for: Submit workout, Join hangout, Complete action
 */
import { motion } from 'framer-motion';
import { haptic } from '../../utils/haptics';

export default function ActionButton({
  children,
  onClick,
  loading,
  disabled,
  variant = 'primary',
  icon,
  ...props
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    haptic('medium');
    onClick?.(e);
  };

  return (
    <motion.button
      className={`
        w-full min-h-[56px] px-6 py-4
        rounded-2xl font-bold text-lg
        flex items-center justify-center gap-3
        touch-action-manipulation
        ${variant === 'primary' ? 'bg-blue-600 text-white' : ''}
        ${variant === 'danger' ? 'bg-red-600 text-white' : ''}
        ${variant === 'success' ? 'bg-green-600 text-white' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className="w-6 h-6">{icon}</span>}
      {loading ? <LoadingSpinner /> : children}
    </motion.button>
  );
}
```

---

## 3. Card Components

### 3.1 ActionCard (New Component)

**File:** `src/components/glass/ActionCard.jsx`

Cards that are themselves the touch target (not buttons within cards):

```jsx
/**
 * ActionCard - Tappable card that executes action directly
 *
 * The entire card is the touch target. No internal buttons needed.
 * Long-press shows additional options.
 */
import { motion } from 'framer-motion';
import { useLongPress } from '../../hooks/useLongPress';
import { haptic } from '../../utils/haptics';

export default function ActionCard({
  children,
  onTap,
  onLongPress,
  disabled,
  className,
  ...props
}) {
  const longPressProps = useLongPress({
    onLongPress: () => {
      haptic('medium');
      onLongPress?.();
    },
    threshold: 500,
  });

  const handleTap = () => {
    if (disabled) return;
    haptic('light');
    onTap?.();
  };

  return (
    <motion.div
      className={`
        glass p-4 rounded-2xl cursor-pointer
        touch-action-manipulation select-none
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={handleTap}
      {...longPressProps}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### 3.2 SwipeableCard (New Component)

**File:** `src/components/glass/SwipeableCard.jsx`

Cards with swipe actions for complete/delete:

```jsx
/**
 * SwipeableCard - Card with swipe gestures
 *
 * Swipe right: Primary action (complete, favorite)
 * Swipe left: Secondary action (delete, remove)
 */
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { haptic } from '../../utils/haptics';

const SWIPE_THRESHOLD = 100;

export default function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightAction = { icon: '✓', color: 'bg-green-500', label: 'Complete' },
  leftAction = { icon: '×', color: 'bg-red-500', label: 'Delete' },
}) {
  const x = useMotionValue(0);
  const controls = useAnimation();

  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > SWIPE_THRESHOLD && onSwipeRight) {
      haptic('success');
      onSwipeRight();
      controls.start({ x: 0 });
    } else if (info.offset.x < -SWIPE_THRESHOLD && onSwipeLeft) {
      haptic('warning');
      onSwipeLeft();
      controls.start({ x: 0 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Right swipe background (complete) */}
      <motion.div
        className={`absolute inset-y-0 left-0 w-24 ${rightAction.color} flex items-center justify-center`}
        style={{ opacity: rightOpacity }}
      >
        <span className="text-white text-2xl">{rightAction.icon}</span>
      </motion.div>

      {/* Left swipe background (delete) */}
      <motion.div
        className={`absolute inset-y-0 right-0 w-24 ${leftAction.color} flex items-center justify-center`}
        style={{ opacity: leftOpacity }}
      >
        <span className="text-white text-2xl">{leftAction.icon}</span>
      </motion.div>

      {/* Card content */}
      <motion.div
        className="glass p-4 rounded-2xl relative bg-gray-800"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        {children}
      </motion.div>
    </div>
  );
}
```

---

## 4. Gesture System

### 4.1 useLongPress Hook

**File:** `src/hooks/useLongPress.ts`

```typescript
import { useCallback, useRef } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  threshold?: number; // ms
}

export function useLongPress({
  onLongPress,
  onPress,
  threshold = 500,
}: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLongPress.current && onPress) {
      onPress();
    }
  }, [onPress]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
```

### 4.2 useSwipeGesture Hook

**File:** `src/hooks/useSwipeGesture.ts`

```typescript
import { useRef, TouchEvent } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}: SwipeHandlers) {
  const touchStart = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > threshold) onSwipeRight?.();
      else if (deltaX < -threshold) onSwipeLeft?.();
    } else {
      // Vertical swipe
      if (deltaY > threshold) onSwipeDown?.();
      else if (deltaY < -threshold) onSwipeUp?.();
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
```

---

## 5. Toast & Undo System

### 5.1 Toast Provider & Hook

**File:** `src/components/Toast/ToastProvider.tsx`

```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'undo';
  action?: {
    label: string;
    handler: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showUndo: (message: string, onUndo: () => void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const showUndo = useCallback(
    (message: string, onUndo: () => void, duration = 5000) => {
      showToast({
        message,
        type: 'undo',
        action: { label: 'Undo', handler: onUndo },
        duration,
      });
    },
    [showToast]
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showUndo }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`
              pointer-events-auto
              glass px-4 py-3 rounded-2xl
              flex items-center justify-between gap-4
              ${toast.type === 'error' ? 'border-red-500/50' : ''}
              ${toast.type === 'success' ? 'border-green-500/50' : ''}
              ${toast.type === 'undo' ? 'border-blue-500/50' : ''}
            `}
          >
            <span className="text-white">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.handler();
                  onDismiss(toast.id);
                }}
                className="px-4 py-2 bg-white/20 rounded-xl text-white font-bold
                           min-h-[44px] touch-action-manipulation"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
```

### 5.2 Mobile Toast (React Native)

**File:** `apps/mobile/src/components/Toast.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text, XStack, Button } from 'tamagui';
import * as Haptics from 'expo-haptics';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
}

export function Toast({ message, visible, onDismiss, action, duration = 5000 }: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    } else {
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
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <XStack
        backgroundColor="$gray2"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderRadius="$4"
        alignItems="center"
        justifyContent="space-between"
        gap="$3"
      >
        <Text color="$gray12" flex={1}>{message}</Text>
        {action && (
          <Button
            size="$3"
            backgroundColor="$blue10"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              action.onPress();
              onDismiss();
            }}
          >
            {action.label}
          </Button>
        )}
      </XStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
});
```

---

## 6. Form Components

### 6.1 Stepper Input

**File:** `src/components/inputs/Stepper.tsx`

Replace keyboard number input with tap-friendly steppers:

```tsx
import { motion } from 'framer-motion';
import { haptic } from '../../utils/haptics';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
}: StepperProps) {
  const decrement = () => {
    if (value > min) {
      haptic('light');
      onChange(value - step);
    }
  };

  const increment = () => {
    if (value < max) {
      haptic('light');
      onChange(value + step);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <div className="flex items-center gap-2">
        <motion.button
          className="w-12 h-12 rounded-xl bg-gray-700 text-white text-xl font-bold
                     flex items-center justify-center touch-action-manipulation"
          whileTap={{ scale: 0.95 }}
          onClick={decrement}
          disabled={value <= min}
        >
          −
        </motion.button>
        <div className="w-16 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{value}</span>
        </div>
        <motion.button
          className="w-12 h-12 rounded-xl bg-gray-700 text-white text-xl font-bold
                     flex items-center justify-center touch-action-manipulation"
          whileTap={{ scale: 0.95 }}
          onClick={increment}
          disabled={value >= max}
        >
          +
        </motion.button>
      </div>
    </div>
  );
}
```

### 6.2 Auto-Save Input

**File:** `src/components/inputs/AutoSaveInput.tsx`

```tsx
import { useState, useEffect, useRef } from 'react';

interface AutoSaveInputProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  debounceMs?: number;
}

export function AutoSaveInput({
  value: initialValue,
  onSave,
  placeholder,
  debounceMs = 500,
}: AutoSaveInputProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setSaved(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave(newValue);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, debounceMs);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-xl bg-gray-800 text-white
                   border border-gray-700 focus:border-blue-500 outline-none"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {saving && <span className="text-gray-400 text-xs">Saving...</span>}
        {saved && <span className="text-green-500 text-xs">Saved</span>}
      </div>
    </div>
  );
}
```

---

## 7. Navigation Patterns

### 7.1 Bottom Tab Bar (Enhanced)

Ensure all primary sections are 1-tap accessible:

```tsx
// apps/mobile/app/(tabs)/_layout.tsx

// Tabs should be:
// - Large enough (min 48px height)
// - Evenly spaced
// - With haptic feedback on selection

<Tabs
  screenOptions={{
    tabBarStyle: {
      height: 80,        // Increased for touch
      paddingBottom: 16,
      paddingTop: 8,
    },
    tabBarItemStyle: {
      minHeight: 56,     // Large touch target
    },
    tabBarLabelStyle: {
      fontSize: 12,
      marginTop: 4,
    },
  }}
>
```

### 7.2 Floating Action Button

**File:** `src/components/navigation/FAB.tsx`

```tsx
import { motion } from 'framer-motion';
import { haptic } from '../../utils/haptics';

interface FABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
}

export function FAB({ icon, onClick, label }: FABProps) {
  const handleClick = () => {
    haptic('medium');
    onClick();
  };

  return (
    <motion.button
      className="fixed bottom-24 right-4 w-14 h-14 rounded-full
                 bg-blue-600 text-white shadow-lg
                 flex items-center justify-center
                 touch-action-manipulation z-40"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}
```

---

## 8. Haptic Feedback

### 8.1 When to Use Haptics

| Interaction | Haptic Type | Notes |
|-------------|-------------|-------|
| Button tap | `light` | Subtle confirmation |
| Toggle change | `light` | Settings feedback |
| Swipe action | `medium` | Gesture confirmation |
| Success | `success` | Workout complete, etc. |
| Error | `error` | Validation, API error |
| Destructive action | `warning` | Delete, leave |
| Long press trigger | `medium` | Context menu opened |
| Selection | `selection` | List item selected |

### 8.2 Mobile Haptics (Expo)

**File:** `apps/mobile/src/utils/haptics.ts`

```typescript
import * as Haptics from 'expo-haptics';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export async function haptic(type: HapticType = 'light'): Promise<void> {
  switch (type) {
    case 'light':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'selection':
      await Haptics.selectionAsync();
      break;
  }
}
```

---

## 9. CSS Utilities

### 9.1 Touch-First CSS Classes

**File:** `src/index.css`

```css
/* Touch-first utility classes */

/* Disable tap highlight */
.touch-none-highlight {
  -webkit-tap-highlight-color: transparent;
}

/* Prevent text selection on touch */
.touch-no-select {
  user-select: none;
  -webkit-user-select: none;
}

/* Optimal touch handling */
.touch-action-manipulation {
  touch-action: manipulation;
}

/* Touch-friendly minimum sizes */
.touch-target {
  min-height: 48px;
  min-width: 48px;
}

.touch-target-lg {
  min-height: 56px;
  min-width: 56px;
}

/* Full-width action button */
.touch-action-full {
  width: 100%;
  min-height: 56px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Pressable feedback */
.touch-feedback {
  transition: transform 0.1s ease-out, opacity 0.1s ease-out;
}

.touch-feedback:active {
  transform: scale(0.98);
  opacity: 0.9;
}
```

---

## 10. Migration Checklist

### Phase 1: Core Utilities
- [ ] Implement `src/utils/haptics.ts`
- [ ] Implement `src/utils/optimistic.ts`
- [ ] Implement `src/hooks/useLongPress.ts`
- [ ] Implement `src/hooks/useSwipeGesture.ts`
- [ ] Add ToastProvider to app root

### Phase 2: Button Updates
- [ ] Update `GlassButton.jsx` sizes
- [ ] Update `packages/ui/Button.tsx` sizes
- [ ] Add ActionButton component
- [ ] Test all buttons for 48px minimum

### Phase 3: Card Updates
- [ ] Implement ActionCard component
- [ ] Implement SwipeableCard component
- [ ] Update exercise cards in workout.tsx
- [ ] Update hangout cards in community.tsx

### Phase 4: Form Updates
- [ ] Implement Stepper component
- [ ] Replace workout inputs with steppers
- [ ] Add auto-save to all settings

### Phase 5: Dialog Replacement
- [ ] Replace Alert.alert with undo toast (mobile)
- [ ] Replace confirmation modals (web)
- [ ] Test all destructive actions have undo

### Phase 6: Navigation
- [ ] Ensure all tabs are 1-tap accessible
- [ ] Add FAB where appropriate
- [ ] Test swipe between related screens

---

*Implementation guide for MuscleMap Touchscreen-First UX Redesign*
