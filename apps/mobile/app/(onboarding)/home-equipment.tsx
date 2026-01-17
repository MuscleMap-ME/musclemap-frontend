/**
 * Home Equipment Screen
 *
 * Lets users select what equipment they have at home.
 * Uses EquipmentGrid component for visual selection.
 */
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  H2,
  H4,
  Paragraph,
  Spinner,
} from 'tamagui';
import { Home } from '@tamagui/lucide-icons';
import { apiClient } from '@musclemap/client';
import { useOnboardingStore } from '../../src/stores/onboarding';
import EquipmentGrid, { type EquipmentType } from '../../src/components/EquipmentGrid';

// Group equipment by category for display
interface CategoryGroup {
  category: string;
  label: string;
  items: EquipmentType[];
}

const categoryLabels: Record<string, string> = {
  bars: 'Bars & Racks',
  free_weights: 'Free Weights',
  benches: 'Benches',
  cardio: 'Cardio',
  machines: 'Machines',
  bodyweight: 'Bodyweight & Accessories',
  outdoor: 'Outdoor',
  specialty: 'Specialty Equipment',
};

export default function HomeEquipment() {
  const { homeEquipment, toggleEquipment } = useOnboardingStore();
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEquipmentTypes() {
      try {
        const result = await apiClient.equipment.types();
        setEquipmentTypes((result as any).data);
      } catch (err) {
        setError('Failed to load equipment types');
        console.error('Failed to load equipment types:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEquipmentTypes();
  }, []);

  const handleContinue = () => {
    router.push('/(onboarding)/complete' as any);
  };

  // Group equipment by category
  const categoryGroups: CategoryGroup[] = Object.entries(
    equipmentTypes.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, EquipmentType[]>)
  )
    .map(([category, items]) => ({
      category,
      label: categoryLabels[category] || category,
      items,
    }))
    .sort((a, b) => {
      // Sort by display order of first item in category
      const orderA = a.items[0]?.displayOrder || 0;
      const orderB = b.items[0]?.displayOrder || 0;
      return orderA - orderB;
    });

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Progress indicator */}
      <XStack justifyContent="center" paddingTop="$6" paddingBottom="$2">
        <XStack space="$2">
          <ProgressDot active />
          <ProgressDot active />
          <ProgressDot active />
          <ProgressDot />
        </XStack>
      </XStack>

      {/* Header */}
      <YStack alignItems="center" space="$2" paddingHorizontal="$4" paddingVertical="$4">
        <XStack alignItems="center" space="$2">
          <Home size={24} color="$blue10" />
          <H2 textAlign="center">Your Home Equipment</H2>
        </XStack>
        <Paragraph color="$gray11" textAlign="center">
          Select the equipment you have at home for personalized workouts
        </Paragraph>
        {homeEquipment.length > 0 && (
          <Text color="$blue10" fontWeight="bold">
            {homeEquipment.length} selected
          </Text>
        )}
      </YStack>

      {/* Equipment grid */}
      {loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$blue10" />
          <Text color="$gray11" paddingTop="$2">Loading equipment...</Text>
        </YStack>
      ) : error ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color="$red10" textAlign="center">{error}</Text>
          <Button
            onPress={() => router.push('/(onboarding)/complete' as any)}
            variant="outlined"
            marginTop="$4"
          >
            Skip this step
          </Button>
        </YStack>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
          <YStack space="$4" padding="$4">
            {categoryGroups.map((group) => (
              <YStack key={group.category} space="$2">
                <H4 color="$gray11">{group.label}</H4>
                <EquipmentGrid
                  items={group.items}
                  selectedIds={homeEquipment}
                  onToggle={toggleEquipment}
                />
              </YStack>
            ))}
          </YStack>
        </ScrollView>
      )}

      {/* Continue button - fixed at bottom */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$borderColor"
      >
        <Button
          onPress={handleContinue}
          theme="active"
          size="$5"
        >
          {homeEquipment.length === 0 ? "Skip - I don't have equipment" : 'Continue'}
        </Button>
      </YStack>
    </YStack>
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
