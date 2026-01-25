/**
 * Rest Timer Component
 *
 * Circular countdown timer with:
 * - Visual progress ring
 * - Time remaining display
 * - Quick time adjustment buttons
 * - Skip functionality
 * - Haptic feedback at completion
 */
import React, { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { XStack, YStack, Text, Button } from 'tamagui';
import { Plus, Minus, SkipForward, Pause, Play } from '@tamagui/lucide-icons';
import { useRestTimer } from '@/stores';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Types
// ============================================================================

export interface RestTimerProps {
  /** Size of the timer circle */
  size?: 'small' | 'medium' | 'large';
  /** Show quick adjustment buttons */
  showControls?: boolean;
  /** Show skip button */
  showSkip?: boolean;
  /** Custom style */
  style?: ViewStyle;
}

// Size configurations
const SIZES = {
  small: { diameter: 80, strokeWidth: 6, fontSize: 20 },
  medium: { diameter: 140, strokeWidth: 8, fontSize: 32 },
  large: { diameter: 200, strokeWidth: 10, fontSize: 48 },
};

// Animated SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// Component
// ============================================================================

export function RestTimer({
  size = 'medium',
  showControls = true,
  showSkip = true,
  style,
}: RestTimerProps) {
  const {
    seconds,
    target,
    remaining,
    progress,
    isActive,
    isComplete,
    start,
    stop,
    addTime,
    skip,
  } = useRestTimer();

  const sizeConfig = SIZES[size];
  const radius = (sizeConfig.diameter - sizeConfig.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Format time as MM:SS
  const formattedTime = useMemo(() => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [remaining]);

  // Animated stroke dash offset
  const animatedProgress = useDerivedValue(() => {
    return withTiming(progress, { duration: 300 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return { strokeDashoffset };
  });

  // Animated color based on time remaining
  const ringStyle = useAnimatedStyle(() => {
    const percentRemaining = 1 - animatedProgress.value;
    // Green -> Yellow -> Red as time runs out
    const color = interpolateColor(
      percentRemaining,
      [0, 0.25, 0.5, 1],
      ['#EF4444', '#F59E0B', '#10B981', '#10B981'],
    );
    return { color };
  });

  // Handle time adjustments
  const handleAddTime = (amount: number) => {
    addTime(amount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSkip = () => {
    skip();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleToggle = () => {
    if (isActive) {
      stop();
    } else {
      start();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <YStack alignItems="center" gap="$4" style={style}>
      {/* Timer circle */}
      <YStack alignItems="center" justifyContent="center">
        <Svg
          width={sizeConfig.diameter}
          height={sizeConfig.diameter}
          style={styles.svg}
        >
          {/* Background circle */}
          <Circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={sizeConfig.strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke={isComplete ? '#EF4444' : '#10B981'}
            strokeWidth={sizeConfig.strokeWidth}
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${sizeConfig.diameter / 2} ${sizeConfig.diameter / 2})`}
          />
        </Svg>

        {/* Time display */}
        <YStack
          position="absolute"
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize={sizeConfig.fontSize}
            fontWeight="700"
            fontFamily="$mono"
            color={isComplete ? '$red10' : '$color12'}
          >
            {formattedTime}
          </Text>
          {target > 0 && (
            <Text fontSize={12} color="$color10">
              of {Math.floor(target / 60)}:{(target % 60).toString().padStart(2, '0')}
            </Text>
          )}
        </YStack>
      </YStack>

      {/* Controls */}
      {showControls && (
        <XStack alignItems="center" gap="$3">
          {/* Subtract time */}
          <Button
            size="$3"
            circular
            backgroundColor="$color4"
            onPress={() => handleAddTime(-15)}
            disabled={target <= 15}
          >
            <Minus size={18} color="$color11" />
          </Button>

          {/* Play/Pause */}
          <Button
            size="$4"
            circular
            backgroundColor={isActive ? '$orange10' : '$green10'}
            onPress={handleToggle}
          >
            {isActive ? (
              <Pause size={24} color="white" />
            ) : (
              <Play size={24} color="white" />
            )}
          </Button>

          {/* Add time */}
          <Button
            size="$3"
            circular
            backgroundColor="$color4"
            onPress={() => handleAddTime(15)}
          >
            <Plus size={18} color="$color11" />
          </Button>
        </XStack>
      )}

      {/* Quick presets */}
      {showControls && size !== 'small' && (
        <XStack gap="$2">
          {[30, 60, 90, 120].map((time) => (
            <Button
              key={time}
              size="$2"
              backgroundColor={target === time ? '$blue10' : '$color3'}
              onPress={() => {
                start(time);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                fontSize={12}
                fontWeight="500"
                color={target === time ? 'white' : '$color11'}
              >
                {time < 60 ? `${time}s` : `${time / 60}m`}
              </Text>
            </Button>
          ))}
        </XStack>
      )}

      {/* Skip button */}
      {showSkip && isActive && (
        <Button
          size="$3"
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="$color6"
          onPress={handleSkip}
          icon={<SkipForward size={16} />}
        >
          <Text fontSize={14} color="$color11">
            Skip Rest
          </Text>
        </Button>
      )}
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  svg: {
    transform: [{ rotateZ: '-90deg' }],
  },
});

export default RestTimer;
