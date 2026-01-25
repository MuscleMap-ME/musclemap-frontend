/**
 * Credits Display Component
 *
 * Animated credits counter with wealth tier indicator.
 * Shows current balance with smooth number transitions.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { XStack, YStack, Text, type ColorTokens } from 'tamagui';
import { Coins, TrendingUp, TrendingDown } from '@tamagui/lucide-icons';
import { WEALTH_TIER_NAMES, type WealthTier } from '@/stores';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Types
// ============================================================================

export interface CreditsDisplayProps {
  /** Current credits balance */
  balance: number;
  /** Previous balance (for animation direction) */
  previousBalance?: number;
  /** Wealth tier (0-6) */
  wealthTier?: WealthTier;
  /** Size variant */
  size?: 'compact' | 'normal' | 'large';
  /** Show wealth tier label */
  showTierLabel?: boolean;
  /** Show change indicator */
  showChange?: boolean;
  /** Custom style */
  style?: ViewStyle;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
}

// Wealth tier colors
const TIER_COLORS: Record<WealthTier, ColorTokens | string> = {
  0: '$color10', // Broke - gray
  1: '#CD7F32', // Bronze
  2: '#C0C0C0', // Silver
  3: '#FFD700', // Gold
  4: '#E5E4E2', // Platinum
  5: '#B9F2FF', // Diamond
  6: '#FF4500', // Obsidian (with red accent)
};

// Size configurations
const SIZES = {
  compact: { iconSize: 16, fontSize: 14, gap: 4 },
  normal: { iconSize: 20, fontSize: 18, gap: 6 },
  large: { iconSize: 28, fontSize: 24, gap: 8 },
};

// ============================================================================
// Component
// ============================================================================

export function CreditsDisplay({
  balance,
  previousBalance,
  wealthTier = 0,
  size = 'normal',
  showTierLabel = false,
  showChange = true,
  style,
  onAnimationComplete,
}: CreditsDisplayProps) {
  const [displayValue, setDisplayValue] = useState(balance);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeConfig = SIZES[size];
  const tierColor = TIER_COLORS[wealthTier];
  const change = previousBalance !== undefined ? balance - previousBalance : 0;
  const isIncrease = change > 0;
  const isDecrease = change < 0;

  // Animation values
  const scale = useSharedValue(1);
  const countProgress = useSharedValue(0);
  const changeOpacity = useSharedValue(0);
  const changeY = useSharedValue(0);

  // Animate when balance changes
  useEffect(() => {
    if (previousBalance !== undefined && previousBalance !== balance) {
      setIsAnimating(true);

      // Haptic feedback
      if (isIncrease) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Pop animation
      scale.value = withSequence(
        withSpring(1.15, { damping: 8 }),
        withSpring(1, { damping: 10 }),
      );

      // Count up/down animation
      countProgress.value = 0;
      countProgress.value = withTiming(
        1,
        { duration: 800, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setDisplayValue)(balance);
            runOnJS(setIsAnimating)(false);
            if (onAnimationComplete) {
              runOnJS(onAnimationComplete)();
            }
          }
        },
      );

      // Change indicator animation
      if (showChange) {
        changeOpacity.value = 1;
        changeY.value = 0;
        changeY.value = withTiming(-20, { duration: 1000 });
        changeOpacity.value = withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) });
      }
    } else {
      setDisplayValue(balance);
    }
  }, [balance, previousBalance]);

  // Animated number during transition
  useEffect(() => {
    if (isAnimating && previousBalance !== undefined) {
      const interval = setInterval(() => {
        const progress = countProgress.value;
        const current = Math.round(previousBalance + (balance - previousBalance) * progress);
        setDisplayValue(current);
      }, 16);

      return () => clearInterval(interval);
    }
  }, [isAnimating, previousBalance, balance]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const changeStyle = useAnimatedStyle(() => ({
    opacity: changeOpacity.value,
    transform: [{ translateY: changeY.value }],
  }));

  // Format number with commas
  const formattedBalance = displayValue.toLocaleString();

  return (
    <YStack alignItems="center" style={style}>
      <Animated.View style={containerStyle}>
        <XStack
          alignItems="center"
          gap={sizeConfig.gap}
          paddingHorizontal="$3"
          paddingVertical="$2"
          backgroundColor="$color2"
          borderRadius="$4"
          borderWidth={1}
          borderColor={typeof tierColor === 'string' ? tierColor : '$color6'}
        >
          {/* Coin icon */}
          <Coins
            size={sizeConfig.iconSize}
            color={tierColor as string}
          />

          {/* Balance */}
          <Text
            fontSize={sizeConfig.fontSize}
            fontWeight="700"
            color="$color12"
            fontFamily="$mono"
          >
            {formattedBalance}
          </Text>

          {/* Wealth tier badge for large size */}
          {size === 'large' && wealthTier > 0 && (
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor={tierColor as string}
              borderRadius="$2"
              opacity={0.9}
            >
              <Text fontSize={10} fontWeight="600" color="$color1">
                {WEALTH_TIER_NAMES[wealthTier].toUpperCase()}
              </Text>
            </XStack>
          )}
        </XStack>
      </Animated.View>

      {/* Change indicator */}
      {showChange && change !== 0 && (
        <Animated.View style={[styles.changeIndicator, changeStyle]}>
          <XStack alignItems="center" gap="$1">
            {isIncrease ? (
              <TrendingUp size={14} color="#10B981" />
            ) : (
              <TrendingDown size={14} color="#EF4444" />
            )}
            <Text
              fontSize={12}
              fontWeight="600"
              color={isIncrease ? '#10B981' : '#EF4444'}
            >
              {isIncrease ? '+' : ''}{change.toLocaleString()}
            </Text>
          </XStack>
        </Animated.View>
      )}

      {/* Tier label */}
      {showTierLabel && (
        <Text
          fontSize={12}
          color="$color10"
          marginTop="$1"
        >
          {WEALTH_TIER_NAMES[wealthTier]}
        </Text>
      )}
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  changeIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
});

export default CreditsDisplay;
