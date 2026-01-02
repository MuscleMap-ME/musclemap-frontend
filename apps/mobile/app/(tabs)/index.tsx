/**
 * Dashboard Screen
 *
 * Main dashboard showing user stats, journey progress, and muscle breakdown.
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
  Progress,
} from 'tamagui';
import { ScrollView } from 'react-native';
import { useAuth, apiClient, type JourneyData, type Wallet } from '@musclemap/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [journeyData, walletData] = await Promise.all([
          apiClient.journey.get(),
          apiClient.wallet.balance(),
        ]);
        setJourney(journeyData.data);
        setWallet(walletData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$blue10" />
      </YStack>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" space="$4">
        <YStack space="$2">
          <H2>Welcome back, {user?.username || 'Athlete'}!</H2>
          <Paragraph color="$gray11">Here's your progress overview</Paragraph>
        </YStack>

        {error && (
          <Card padding="$4" backgroundColor="$red2">
            <Text color="$red10">{error}</Text>
          </Card>
        )}

        {/* Level Progress */}
        {journey && (
          <Card padding="$4" elevate backgroundColor="$blue2">
            <YStack space="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <Text color="$gray11" fontSize="$2">Current Level</Text>
                  <H3 color="$blue10">{journey.currentLevelName}</H3>
                </YStack>
                <YStack alignItems="flex-end">
                  <Text color="$gray11" fontSize="$2">Total TU</Text>
                  <H3 color="$blue10">{journey.totalTU.toFixed(0)}</H3>
                </YStack>
              </XStack>
              <YStack space="$2">
                <XStack justifyContent="space-between">
                  <Text color="$gray11" fontSize="$2">Progress to next level</Text>
                  <Text color="$blue10" fontSize="$2">
                    {journey.progressToNextLevel.toFixed(0)}%
                  </Text>
                </XStack>
                <Progress value={journey.progressToNextLevel} max={100}>
                  <Progress.Indicator animation="bouncy" />
                </Progress>
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Stats Grid */}
        <XStack space="$3" flexWrap="wrap">
          <Card flex={1} minWidth={150} padding="$4" elevate>
            <YStack space="$2">
              <Text color="$gray11" fontSize="$3">Workouts</Text>
              <H3>{journey?.totalWorkouts ?? 0}</H3>
              <Text color="$gray10" fontSize="$2">completed</Text>
            </YStack>
          </Card>

          <Card flex={1} minWidth={150} padding="$4" elevate>
            <YStack space="$2">
              <Text color="$gray11" fontSize="$3">Streak</Text>
              <H3>{journey?.streak ?? 0}</H3>
              <Text color="$gray10" fontSize="$2">days</Text>
            </YStack>
          </Card>
        </XStack>

        {/* Weekly Stats */}
        {journey?.stats?.weekly && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <H3>This Week</H3>
              <XStack justifyContent="space-around">
                <YStack alignItems="center">
                  <H3>{journey.stats.weekly.workouts}</H3>
                  <Text color="$gray11" fontSize="$2">workouts</Text>
                </YStack>
                <YStack alignItems="center">
                  <H3>{journey.stats.weekly.tu.toFixed(0)}</H3>
                  <Text color="$gray11" fontSize="$2">TU earned</Text>
                </YStack>
                <YStack alignItems="center">
                  <H3>{journey.stats.weekly.avgTuPerWorkout.toFixed(0)}</H3>
                  <Text color="$gray11" fontSize="$2">avg TU</Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>
        )}

        {/* Credits */}
        <Card padding="$4" elevate>
          <YStack space="$2">
            <Text color="$gray11" fontSize="$3">Credits</Text>
            <XStack alignItems="baseline" space="$2">
              <H2>{wallet?.wallet?.balance ?? 0}</H2>
              <Text color="$gray10">{wallet?.wallet?.currency ?? 'CR'}</Text>
            </XStack>
          </YStack>
        </Card>

        {/* Top Muscles */}
        {journey?.muscleBreakdown && journey.muscleBreakdown.length > 0 && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <H3>Top Muscles Worked</H3>
              <YStack space="$2">
                {journey.muscleBreakdown.slice(0, 5).map((muscle) => (
                  <XStack
                    key={muscle.id}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <YStack>
                      <Text fontWeight="bold">{muscle.name}</Text>
                      <Text color="$gray11" fontSize="$2">{muscle.group}</Text>
                    </YStack>
                    <Text color="$blue10" fontWeight="bold">
                      {muscle.totalActivation.toFixed(0)}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Recent Workouts */}
        {journey?.recentWorkouts && journey.recentWorkouts.length > 0 && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <H3>Recent Workouts</H3>
              <YStack space="$2">
                {journey.recentWorkouts.map((workout) => (
                  <XStack
                    key={workout.id}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$2"
                    borderBottomWidth={1}
                    borderBottomColor="$gray4"
                  >
                    <Text>{new Date(workout.date).toLocaleDateString()}</Text>
                    <Text color="$blue10" fontWeight="bold">
                      {workout.tu.toFixed(1)} TU
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Member Since */}
        {journey && (
          <Card padding="$4" elevate>
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$gray11">Member for</Text>
              <Text fontWeight="bold">{journey.daysSinceJoined} days</Text>
            </XStack>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}
