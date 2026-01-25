/**
 * Set Logger Component
 *
 * Quick input for logging a workout set with:
 * - Weight input (with unit toggle)
 * - Reps input
 * - Optional RPE slider
 * - Previous set reference
 * - PR indicator
 */
import React, { useState, useRef, useCallback } from 'react';
import { TextInput, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { XStack, YStack, Text, Button, Slider } from 'tamagui';
import { Check, Flame, RotateCcw } from '@tamagui/lucide-icons';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Types
// ============================================================================

export interface SetLoggerProps {
  /** Current set number */
  setNumber: number;
  /** Target reps (can be range) */
  targetReps?: number | { min: number; max: number };
  /** Suggested weight based on previous performance */
  suggestedWeight?: number;
  /** Previous set data for reference */
  previousSet?: {
    weight: number;
    reps: number;
    rpe?: number;
  };
  /** Weight unit */
  unit?: 'kg' | 'lbs';
  /** Show RPE input */
  showRPE?: boolean;
  /** Whether this could be a PR */
  isPotentialPR?: boolean;
  /** Callback when set is logged */
  onLog: (data: { weight: number; reps: number; rpe?: number }) => void;
  /** Custom style */
  style?: ViewStyle;
}

// ============================================================================
// Component
// ============================================================================

export function SetLogger({
  setNumber,
  targetReps,
  suggestedWeight,
  previousSet,
  unit = 'lbs',
  showRPE = false,
  isPotentialPR = false,
  onLog,
  style,
}: SetLoggerProps) {
  // Input state
  const [weight, setWeight] = useState(suggestedWeight?.toString() ?? previousSet?.weight?.toString() ?? '');
  const [reps, setReps] = useState('');
  const [rpe, setRPE] = useState(previousSet?.rpe ?? 7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const weightInputRef = useRef<TextInput>(null);
  const repsInputRef = useRef<TextInput>(null);

  // Animation
  const buttonScale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Format target reps display
  const targetRepsText = targetReps
    ? typeof targetReps === 'number'
      ? `${targetReps} reps`
      : `${targetReps.min}-${targetReps.max} reps`
    : null;

  // Handle submit
  const handleSubmit = useCallback(() => {
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);

    if (isNaN(weightNum) || isNaN(repsNum) || weightNum <= 0 || repsNum <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);

    // Animate button
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 10 }),
    );

    // Haptic feedback
    if (isPotentialPR) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Submit
    onLog({
      weight: weightNum,
      reps: repsNum,
      rpe: showRPE ? rpe : undefined,
    });

    // Reset inputs
    setWeight('');
    setReps('');
    setIsSubmitting(false);
    weightInputRef.current?.focus();
  }, [weight, reps, rpe, showRPE, isPotentialPR, onLog]);

  // Use previous set values
  const usePreviousSet = () => {
    if (previousSet) {
      setWeight(previousSet.weight.toString());
      setReps(previousSet.reps.toString());
      if (previousSet.rpe) setRPE(previousSet.rpe);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <YStack
      gap="$3"
      padding="$4"
      backgroundColor="$color2"
      borderRadius="$4"
      style={style}
    >
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <Text fontSize={16} fontWeight="600" color="$color12">
            Set {setNumber}
          </Text>
          {isPotentialPR && (
            <XStack
              alignItems="center"
              gap="$1"
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor="$orange3"
              borderRadius="$2"
            >
              <Flame size={12} color="#F59E0B" />
              <Text fontSize={10} fontWeight="600" color="$orange10">
                PR?
              </Text>
            </XStack>
          )}
        </XStack>
        {targetRepsText && (
          <Text fontSize={12} color="$color10">
            Target: {targetRepsText}
          </Text>
        )}
      </XStack>

      {/* Weight and Reps inputs */}
      <XStack gap="$3">
        {/* Weight Input */}
        <YStack flex={1} gap="$1">
          <Text fontSize={12} color="$color10">
            Weight ({unit})
          </Text>
          <XStack
            alignItems="center"
            backgroundColor="$color3"
            borderRadius="$3"
            paddingHorizontal="$3"
          >
            <TextInput
              ref={weightInputRef}
              value={weight}
              onChangeText={setWeight}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => repsInputRef.current?.focus()}
              style={styles.input}
            />
            <Text fontSize={14} color="$color10">
              {unit}
            </Text>
          </XStack>
        </YStack>

        {/* Reps Input */}
        <YStack flex={1} gap="$1">
          <Text fontSize={12} color="$color10">
            Reps
          </Text>
          <XStack
            alignItems="center"
            backgroundColor="$color3"
            borderRadius="$3"
            paddingHorizontal="$3"
          >
            <TextInput
              ref={repsInputRef}
              value={reps}
              onChangeText={setReps}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={styles.input}
            />
          </XStack>
        </YStack>
      </XStack>

      {/* RPE Slider */}
      {showRPE && (
        <YStack gap="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={12} color="$color10">
              RPE (Rate of Perceived Exertion)
            </Text>
            <Text
              fontSize={16}
              fontWeight="700"
              color={rpe >= 9 ? '$red10' : rpe >= 7 ? '$orange10' : '$green10'}
            >
              {rpe}
            </Text>
          </XStack>
          <Slider
            value={[rpe]}
            onValueChange={(values) => setRPE(values[0])}
            min={1}
            max={10}
            step={0.5}
          >
            <Slider.Track backgroundColor="$color4">
              <Slider.TrackActive backgroundColor="$blue10" />
            </Slider.Track>
            <Slider.Thumb circular index={0} size="$1" backgroundColor="$blue10" />
          </Slider>
          <XStack justifyContent="space-between">
            <Text fontSize={10} color="$color9">Easy</Text>
            <Text fontSize={10} color="$color9">Max Effort</Text>
          </XStack>
        </YStack>
      )}

      {/* Previous set reference */}
      {previousSet && (
        <XStack
          alignItems="center"
          justifyContent="space-between"
          padding="$2"
          backgroundColor="$color3"
          borderRadius="$2"
        >
          <Text fontSize={12} color="$color10">
            Previous: {previousSet.weight} {unit} × {previousSet.reps}
            {previousSet.rpe && ` @ RPE ${previousSet.rpe}`}
          </Text>
          <Button
            size="$2"
            backgroundColor="transparent"
            onPress={usePreviousSet}
            icon={<RotateCcw size={14} />}
          >
            <Text fontSize={12} color="$blue10">Use</Text>
          </Button>
        </XStack>
      )}

      {/* Submit Button */}
      <Animated.View style={buttonStyle}>
        <Button
          size="$4"
          backgroundColor="$green10"
          onPress={handleSubmit}
          disabled={isSubmitting || !weight || !reps}
          opacity={!weight || !reps ? 0.5 : 1}
          icon={<Check size={20} color="white" />}
        >
          <Text fontSize={16} fontWeight="600" color="white">
            Log Set
          </Text>
        </Button>
      </Animated.View>
    </YStack>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    paddingVertical: 12,
    fontFamily: 'monospace',
  },
});

export default SetLogger;
