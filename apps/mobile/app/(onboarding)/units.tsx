/**
 * Units Selection Screen
 *
 * Lets users choose their preferred measurement units (metric/imperial).
 * Stores the preference for height, weight, and distance calculations.
 */
import { useState } from 'react';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  H2,
  Paragraph,
  Card,
} from 'tamagui';
import { Check, Ruler, Scale } from '@tamagui/lucide-icons';
import { useOnboardingStore } from '../../src/stores/onboarding';

type UnitSystem = 'metric' | 'imperial';

export default function Units() {
  const { preferredUnits, setPreferredUnits } = useOnboardingStore();
  const [selected, setSelected] = useState<UnitSystem>(preferredUnits);

  const handleContinue = () => {
    setPreferredUnits(selected);
    router.push('/(onboarding)/physical');
  };

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Progress indicator */}
      <XStack justifyContent="center" paddingTop="$4" paddingBottom="$2">
        <XStack space="$2">
          <ProgressDot active />
          <ProgressDot />
          <ProgressDot />
          <ProgressDot />
        </XStack>
      </XStack>

      {/* Header */}
      <YStack alignItems="center" space="$2" paddingVertical="$6">
        <H2 textAlign="center">Choose Your Units</H2>
        <Paragraph color="$gray11" textAlign="center">
          We'll use this for height, weight, and workout data
        </Paragraph>
      </YStack>

      {/* Unit options */}
      <YStack flex={1} justifyContent="center" space="$4" maxWidth={400} alignSelf="center" width="100%">
        <UnitCard
          title="Metric"
          description="Kilograms, centimeters"
          examples={['Weight: 75 kg', 'Height: 180 cm']}
          selected={selected === 'metric'}
          onPress={() => setSelected('metric')}
        />
        <UnitCard
          title="Imperial"
          description="Pounds, feet & inches"
          examples={['Weight: 165 lbs', 'Height: 5\' 11"']}
          selected={selected === 'imperial'}
          onPress={() => setSelected('imperial')}
        />
      </YStack>

      {/* Continue button */}
      <YStack paddingBottom="$4">
        <Button
          onPress={handleContinue}
          theme="active"
          size="$5"
        >
          Continue
        </Button>
      </YStack>
    </YStack>
  );
}

function UnitCard({
  title,
  description,
  examples,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  examples: string[];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      bordered
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={onPress}
      backgroundColor={selected ? '$blue2' : '$background'}
      borderColor={selected ? '$blue8' : '$borderColor'}
      borderWidth={selected ? 2 : 1}
      padding="$4"
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} space="$2">
          <XStack alignItems="center" space="$2">
            <Text fontWeight="bold" fontSize="$6">{title}</Text>
          </XStack>
          <Text color="$gray11">{description}</Text>
          <XStack space="$4" paddingTop="$2">
            {examples.map((example, i) => (
              <XStack key={i} alignItems="center" space="$2">
                {i === 0 ? (
                  <Scale size={16} color="$gray10" />
                ) : (
                  <Ruler size={16} color="$gray10" />
                )}
                <Text color="$gray10" fontSize="$3">{example}</Text>
              </XStack>
            ))}
          </XStack>
        </YStack>
        {selected && (
          <YStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="$blue10"
            justifyContent="center"
            alignItems="center"
          >
            <Check size={18} color="white" />
          </YStack>
        )}
      </XStack>
    </Card>
  );
}

function ProgressDot({ active = false }: { active?: boolean }) {
  return (
    <YStack
      width={8}
      height={8}
      borderRadius={4}
      backgroundColor={active ? '$blue10' : '$gray6'}
    />
  );
}
