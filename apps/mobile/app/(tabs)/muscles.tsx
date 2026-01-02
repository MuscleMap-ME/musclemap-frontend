/**
 * Muscles Screen
 *
 * 3D muscle visualization showing workout activations.
 */
import { useEffect, useState } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  Paragraph,
  Spinner,
  Button,
  Select,
} from 'tamagui';
import { ScrollView } from 'react-native';
import { Check, ChevronDown } from '@tamagui/lucide-icons';
import { apiClient, type MuscleActivation } from '@musclemap/client';
import { MuscleModel } from '../../src/components/MuscleModel';

type TimeRange = 7 | 14 | 30 | 90;

export default function MusclesScreen() {
  const [activations, setActivations] = useState<MuscleActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  useEffect(() => {
    async function loadActivations() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.workouts.muscleActivations(timeRange);
        setActivations(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load muscle data');
      } finally {
        setLoading(false);
      }
    }

    loadActivations();
  }, [timeRange]);

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$blue10" />
        <Paragraph color="$gray11" marginTop="$4">Loading muscle data...</Paragraph>
      </YStack>
    );
  }

  // Group activations by muscle group
  const groupedActivations = activations.reduce((acc, activation) => {
    const group = activation.muscleGroup || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(activation);
    return acc;
  }, {} as Record<string, MuscleActivation[]>);

  // Sort groups by total activation
  const sortedGroups = Object.entries(groupedActivations)
    .map(([group, muscles]) => ({
      group,
      muscles,
      total: muscles.reduce((sum, m) => sum + m.normalizedActivation, 0),
    }))
    .sort((a, b) => b.total - a.total);

  // Calculate total and max for percentages
  const totalActivation = activations.reduce((sum, m) => sum + m.normalizedActivation, 0);

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" space="$4">
        <YStack space="$2">
          <H2>Muscle Map</H2>
          <Paragraph color="$gray11">See which muscles you've been working</Paragraph>
        </YStack>

        {/* Time Range Selector */}
        <XStack justifyContent="flex-end">
          <Select
            value={String(timeRange)}
            onValueChange={(val) => setTimeRange(Number(val) as TimeRange)}
          >
            <Select.Trigger width={140} iconAfter={ChevronDown}>
              <Select.Value placeholder="Time range" />
            </Select.Trigger>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                <Select.Group>
                  <Select.Label>Time Range</Select.Label>
                  <Select.Item index={0} value="7">
                    <Select.ItemText>Last 7 days</Select.ItemText>
                    <Select.ItemIndicator><Check size={16} /></Select.ItemIndicator>
                  </Select.Item>
                  <Select.Item index={1} value="14">
                    <Select.ItemText>Last 14 days</Select.ItemText>
                    <Select.ItemIndicator><Check size={16} /></Select.ItemIndicator>
                  </Select.Item>
                  <Select.Item index={2} value="30">
                    <Select.ItemText>Last 30 days</Select.ItemText>
                    <Select.ItemIndicator><Check size={16} /></Select.ItemIndicator>
                  </Select.Item>
                  <Select.Item index={3} value="90">
                    <Select.ItemText>Last 90 days</Select.ItemText>
                    <Select.ItemIndicator><Check size={16} /></Select.ItemIndicator>
                  </Select.Item>
                </Select.Group>
              </Select.Viewport>
              <Select.ScrollDownButton />
            </Select.Content>
          </Select>
        </XStack>

        {error && (
          <Card padding="$4" backgroundColor="$red2">
            <Text color="$red10">{error}</Text>
          </Card>
        )}

        {/* 3D Muscle Model */}
        <Card elevate backgroundColor="$background" overflow="hidden">
          {activations.length > 0 ? (
            <MuscleModel activations={activations} height={350} />
          ) : (
            <YStack height={350} justifyContent="center" alignItems="center" padding="$4">
              <Paragraph color="$gray11" textAlign="center">
                No workout data yet. Complete some workouts to see your muscle activations!
              </Paragraph>
            </YStack>
          )}
        </Card>

        {/* Color Legend */}
        <Card padding="$3" elevate>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$2" color="$gray11">Low activation</Text>
              <XStack height={8} width={100} borderRadius="$2" overflow="hidden">
                <YStack flex={1} backgroundColor="$blue8" />
                <YStack flex={1} backgroundColor="$green8" />
                <YStack flex={1} backgroundColor="$yellow8" />
                <YStack flex={1} backgroundColor="$red8" />
              </XStack>
            </YStack>
            <Text fontSize="$2" color="$gray11">High activation</Text>
          </XStack>
        </Card>

        {/* Muscle Group Breakdown */}
        {sortedGroups.length > 0 && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <H3>Muscle Group Breakdown</H3>
              <YStack space="$3">
                {sortedGroups.map(({ group, muscles, total }) => (
                  <YStack key={group} space="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontWeight="bold">{group}</Text>
                      <Text color="$blue10">
                        {((total / totalActivation) * 100).toFixed(0)}%
                      </Text>
                    </XStack>
                    {/* Progress bar */}
                    <YStack
                      height={8}
                      backgroundColor="$gray4"
                      borderRadius="$2"
                      overflow="hidden"
                    >
                      <YStack
                        height="100%"
                        width={`${(total / totalActivation) * 100}%`}
                        backgroundColor="$blue10"
                        borderRadius="$2"
                      />
                    </YStack>
                    {/* Individual muscles */}
                    <YStack paddingLeft="$2" space="$1">
                      {muscles
                        .sort((a, b) => b.normalizedActivation - a.normalizedActivation)
                        .slice(0, 3)
                        .map((muscle) => (
                          <XStack
                            key={muscle.muscleId}
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Text fontSize="$2" color="$gray11">
                              {muscle.muscleName}
                            </Text>
                            <Text fontSize="$2" color="$gray10">
                              {muscle.normalizedActivation.toFixed(1)}
                            </Text>
                          </XStack>
                        ))}
                    </YStack>
                  </YStack>
                ))}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Top Muscles */}
        {activations.length > 0 && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <H3>Top 10 Muscles</H3>
              <YStack space="$2">
                {activations
                  .slice()
                  .sort((a, b) => b.normalizedActivation - a.normalizedActivation)
                  .slice(0, 10)
                  .map((muscle, index) => (
                    <XStack
                      key={muscle.muscleId}
                      justifyContent="space-between"
                      alignItems="center"
                      paddingVertical="$2"
                      borderBottomWidth={index < 9 ? 1 : 0}
                      borderBottomColor="$gray4"
                    >
                      <XStack space="$2" alignItems="center">
                        <Text
                          fontSize="$2"
                          color="$gray10"
                          width={20}
                          textAlign="center"
                        >
                          {index + 1}
                        </Text>
                        <YStack>
                          <Text fontWeight="bold">{muscle.muscleName}</Text>
                          <Text fontSize="$2" color="$gray11">
                            {muscle.muscleGroup}
                          </Text>
                        </YStack>
                      </XStack>
                      <YStack alignItems="flex-end">
                        <Text color="$blue10" fontWeight="bold">
                          {muscle.normalizedActivation.toFixed(1)}
                        </Text>
                        <Text fontSize="$2" color="$gray11">
                          tier {muscle.colorTier}
                        </Text>
                      </YStack>
                    </XStack>
                  ))}
              </YStack>
            </YStack>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}
