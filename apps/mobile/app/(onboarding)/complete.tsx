/**
 * Onboarding Complete Screen
 *
 * Summary of profile + "Get Started" button.
 * Saves all data to server and redirects to main app.
 */
import { useState } from 'react';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  H1,
  H3,
  Paragraph,
  Spinner,
  Card,
} from 'tamagui';
import { CheckCircle, User, Home, Ruler, Scale } from '@tamagui/lucide-icons';
import { apiClient } from '@musclemap/client';
import { useOnboardingStore } from '../../src/stores/onboarding';

export default function Complete() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    preferredUnits,
    gender,
    dateOfBirth,
    heightCm,
    heightFt,
    heightIn,
    weightKg,
    weightLbs,
    homeEquipment,
    reset,
  } = useOnboardingStore();

  const handleComplete = async () => {
    setSaving(true);
    setError(null);

    try {
      // Save physical profile
      await apiClient.onboarding.saveProfile({
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        heightCm: preferredUnits === 'metric' ? (heightCm || undefined) : undefined,
        heightFt: preferredUnits === 'imperial' ? (heightFt || undefined) : undefined,
        heightIn: preferredUnits === 'imperial' ? (heightIn || undefined) : undefined,
        weightKg: preferredUnits === 'metric' ? (weightKg || undefined) : undefined,
        weightLbs: preferredUnits === 'imperial' ? (weightLbs || undefined) : undefined,
        preferredUnits,
      });

      // Save home equipment if any selected
      if (homeEquipment.length > 0) {
        await apiClient.onboarding.saveHomeEquipment(homeEquipment, 'home');
      }

      // Mark onboarding complete
      await apiClient.onboarding.complete();

      // Clear local store
      reset();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Failed to save onboarding data:', err);
      setError('Failed to save your profile. Please try again.');
      setSaving(false);
    }
  };

  // Format display values
  const heightDisplay = preferredUnits === 'metric'
    ? heightCm ? `${heightCm} cm` : 'Not set'
    : heightFt || heightIn ? `${heightFt || 0}' ${heightIn || 0}"` : 'Not set';

  const weightDisplay = preferredUnits === 'metric'
    ? weightKg ? `${weightKg} kg` : 'Not set'
    : weightLbs ? `${weightLbs} lbs` : 'Not set';

  const genderDisplay = gender
    ? gender.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Not set';

  return (
    <YStack flex={1} padding="$4" justifyContent="space-between" backgroundColor="$background">
      {/* Progress indicator */}
      <XStack justifyContent="center" paddingTop="$4" paddingBottom="$2">
        <XStack space="$2">
          <ProgressDot active />
          <ProgressDot active />
          <ProgressDot active />
          <ProgressDot active />
        </XStack>
      </XStack>

      {/* Header */}
      <YStack flex={1} justifyContent="center" alignItems="center" space="$6">
        <YStack alignItems="center" space="$3">
          <CheckCircle size={64} color="$green10" />
          <H1 textAlign="center">You're All Set!</H1>
          <Paragraph color="$gray11" textAlign="center">
            Here's a summary of your profile
          </Paragraph>
        </YStack>

        {/* Profile Summary */}
        <Card bordered padding="$4" width="100%" maxWidth={350}>
          <YStack space="$4">
            <SummaryRow
              icon={<User size={20} color="$gray10" />}
              label="Gender"
              value={genderDisplay}
            />
            <SummaryRow
              icon={<Ruler size={20} color="$gray10" />}
              label="Height"
              value={heightDisplay}
            />
            <SummaryRow
              icon={<Scale size={20} color="$gray10" />}
              label="Weight"
              value={weightDisplay}
            />
            <SummaryRow
              icon={<Home size={20} color="$gray10" />}
              label="Home Equipment"
              value={homeEquipment.length > 0 ? `${homeEquipment.length} items` : 'None'}
            />
          </YStack>
        </Card>

        <Paragraph color="$gray10" textAlign="center" fontSize="$2">
          Units: {preferredUnits === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft/in)'}
        </Paragraph>
      </YStack>

      {/* Action Buttons */}
      <YStack space="$3" paddingBottom="$4">
        {error && (
          <Text color="$red10" textAlign="center">
            {error}
          </Text>
        )}
        <Button
          onPress={handleComplete}
          theme="active"
          size="$5"
          disabled={saving}
        >
          {saving ? <Spinner color="$color" /> : 'Get Started'}
        </Button>
        <Text color="$gray10" textAlign="center" fontSize="$2">
          You can update your profile anytime in Settings
        </Text>
      </YStack>
    </YStack>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <XStack justifyContent="space-between" alignItems="center">
      <XStack alignItems="center" space="$2">
        {icon}
        <Text color="$gray11">{label}</Text>
      </XStack>
      <Text fontWeight="bold">{value}</Text>
    </XStack>
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
