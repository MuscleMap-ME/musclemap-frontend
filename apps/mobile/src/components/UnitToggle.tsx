/**
 * UnitToggle Component
 *
 * A toggle switch between metric and imperial units.
 * Reusable in settings and onboarding.
 */
import React from 'react';
import { XStack, Text, Button, YStack } from 'tamagui';
import { Ruler, Scale } from '@tamagui/lucide-icons';

type UnitSystem = 'metric' | 'imperial';

interface UnitToggleProps {
  value: UnitSystem;
  onChange: (value: UnitSystem) => void;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function UnitToggle({
  value,
  onChange,
  showLabels = true,
  size = 'md',
}: UnitToggleProps) {
  const buttonSize = size === 'sm' ? '$3' : size === 'lg' ? '$5' : '$4';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <YStack space="$2">
      <XStack
        backgroundColor="$gray3"
        borderRadius="$4"
        padding="$1"
        overflow="hidden"
      >
        <UnitButton
          label="Metric"
          sublabel="kg, cm"
          active={value === 'metric'}
          onPress={() => onChange('metric')}
          size={buttonSize}
          iconSize={iconSize}
          showLabels={showLabels}
        />
        <UnitButton
          label="Imperial"
          sublabel="lbs, ft"
          active={value === 'imperial'}
          onPress={() => onChange('imperial')}
          size={buttonSize}
          iconSize={iconSize}
          showLabels={showLabels}
        />
      </XStack>
    </YStack>
  );
}

interface UnitButtonProps {
  label: string;
  sublabel: string;
  active: boolean;
  onPress: () => void;
  size: string;
  iconSize: number;
  showLabels: boolean;
}

function UnitButton({
  label,
  sublabel,
  active,
  onPress,
  size,
  iconSize,
  showLabels,
}: UnitButtonProps) {
  return (
    <Button
      flex={1}
      size={size as any}
      onPress={onPress}
      backgroundColor={active ? '$background' : 'transparent'}
      borderRadius="$3"
      pressStyle={{ opacity: 0.8 }}
      borderWidth={0}
      elevation={active ? 1 : 0}
    >
      <YStack alignItems="center" space="$1">
        <Text fontWeight={active ? 'bold' : 'normal'} color={active ? '$blue10' : '$gray10'}>
          {label}
        </Text>
        {showLabels && (
          <Text fontSize="$1" color="$gray9">
            {sublabel}
          </Text>
        )}
      </YStack>
    </Button>
  );
}

/**
 * Compact inline version
 */
export function UnitToggleInline({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (value: UnitSystem) => void;
}) {
  return (
    <XStack space="$2" alignItems="center">
      <Button
        size="$2"
        variant={value === 'metric' ? 'outlined' : undefined}
        backgroundColor={value === 'metric' ? '$blue2' : 'transparent'}
        borderColor={value === 'metric' ? '$blue8' : '$borderColor'}
        onPress={() => onChange('metric')}
      >
        Metric
      </Button>
      <Button
        size="$2"
        variant={value === 'imperial' ? 'outlined' : undefined}
        backgroundColor={value === 'imperial' ? '$blue2' : 'transparent'}
        borderColor={value === 'imperial' ? '$blue8' : '$borderColor'}
        onPress={() => onChange('imperial')}
      >
        Imperial
      </Button>
    </XStack>
  );
}
