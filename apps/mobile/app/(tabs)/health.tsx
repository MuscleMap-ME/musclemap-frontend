/**
 * Health Screen
 *
 * Wearables integration and health data dashboard.
 */
import { useCallback, useState } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  Button,
  Separator,
  Spinner,
  Progress,
} from 'tamagui';
import { ScrollView, RefreshControl, Platform } from 'react-native';
import {
  Heart,
  Footprints,
  Flame,
  Moon,
  Watch,
  Activity,
  Link2,
  Unlink,
  RefreshCw,
  Clock,
} from '@tamagui/lucide-icons';
import { useHealthKit } from '@/hooks/useHealthKit';

export default function HealthScreen() {
  const {
    isAvailable,
    isAuthorized,
    isLoading,
    error,
    summary,
    requestAuthorization,
    syncData,
    disconnect,
  } = useHealthKit();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncData();
    setRefreshing(false);
  }, [syncData]);

  const handleConnect = async () => {
    await requestAuthorization();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleSync = async () => {
    await syncData();
  };

  // Format time nicely
  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <YStack flex={1} padding="$4" space="$4">
        <H2>Health</H2>

        {/* Connection Status */}
        <Card padding="$4" elevate>
          <YStack space="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack space="$3" alignItems="center">
                <Watch size={24} color={isAuthorized ? '$green10' : '$gray10'} />
                <YStack>
                  <Text fontWeight="bold">Apple Health</Text>
                  <Text fontSize="$2" color="$gray11">
                    {isAuthorized ? 'Connected' : isAvailable ? 'Not connected' : 'Not available'}
                  </Text>
                </YStack>
              </XStack>
              {isAvailable && (
                isAuthorized ? (
                  <XStack space="$2">
                    <Button
                      size="$3"
                      icon={<RefreshCw size={16} />}
                      onPress={handleSync}
                      disabled={isLoading}
                    >
                      Sync
                    </Button>
                    <Button
                      size="$3"
                      theme="red"
                      variant="outlined"
                      icon={<Unlink size={16} />}
                      onPress={handleDisconnect}
                      disabled={isLoading}
                    />
                  </XStack>
                ) : (
                  <Button
                    size="$3"
                    theme="blue"
                    icon={<Link2 size={16} />}
                    onPress={handleConnect}
                    disabled={isLoading}
                  >
                    Connect
                  </Button>
                )
              )}
            </XStack>

            {isAuthorized && summary?.connections[0]?.lastSyncAt && (
              <XStack space="$2" alignItems="center">
                <Clock size={14} color="$gray11" />
                <Text fontSize="$2" color="$gray11">
                  Last synced: {formatLastSync(summary.connections[0].lastSyncAt)}
                </Text>
              </XStack>
            )}

            {error && (
              <Text color="$red10" fontSize="$2">
                {error}
              </Text>
            )}
          </YStack>
        </Card>

        {isLoading && !refreshing && (
          <YStack alignItems="center" padding="$4">
            <Spinner size="large" color="$blue10" />
          </YStack>
        )}

        {/* Today's Stats */}
        {summary && (
          <>
            <H3>Today</H3>
            <XStack space="$3" flexWrap="wrap">
              <Card flex={1} minWidth={150} padding="$4" elevate>
                <YStack space="$2" alignItems="center">
                  <Footprints size={28} color="$blue10" />
                  <Text fontSize="$7" fontWeight="bold">
                    {summary.today.steps.toLocaleString()}
                  </Text>
                  <Text fontSize="$2" color="$gray11">Steps</Text>
                </YStack>
              </Card>

              <Card flex={1} minWidth={150} padding="$4" elevate>
                <YStack space="$2" alignItems="center">
                  <Flame size={28} color="$orange10" />
                  <Text fontSize="$7" fontWeight="bold">
                    {summary.today.activeCalories}
                  </Text>
                  <Text fontSize="$2" color="$gray11">Active Calories</Text>
                </YStack>
              </Card>
            </XStack>

            <XStack space="$3" flexWrap="wrap">
              <Card flex={1} minWidth={150} padding="$4" elevate>
                <YStack space="$2" alignItems="center">
                  <Heart size={28} color="$red10" />
                  <Text fontSize="$7" fontWeight="bold">
                    {summary.today.avgHeartRate || '--'}
                  </Text>
                  <Text fontSize="$2" color="$gray11">Avg Heart Rate</Text>
                </YStack>
              </Card>

              <Card flex={1} minWidth={150} padding="$4" elevate>
                <YStack space="$2" alignItems="center">
                  <Activity size={28} color="$green10" />
                  <Text fontSize="$7" fontWeight="bold">
                    {summary.today.workoutMinutes}
                  </Text>
                  <Text fontSize="$2" color="$gray11">Workout Min</Text>
                </YStack>
              </Card>
            </XStack>

            {summary.today.sleepHours !== null && (
              <Card padding="$4" elevate>
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack space="$3" alignItems="center">
                    <Moon size={24} color="$purple10" />
                    <YStack>
                      <Text fontWeight="bold">Sleep</Text>
                      <Text fontSize="$2" color="$gray11">Last night</Text>
                    </YStack>
                  </XStack>
                  <Text fontSize="$6" fontWeight="bold">
                    {summary.today.sleepHours} hrs
                  </Text>
                </XStack>
              </Card>
            )}

            {/* Weekly Summary */}
            <H3>This Week</H3>
            <Card padding="$4" elevate>
              <YStack space="$4">
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack space="$3" alignItems="center">
                    <Footprints size={20} color="$blue10" />
                    <Text>Total Steps</Text>
                  </XStack>
                  <Text fontWeight="bold">
                    {summary.thisWeek.totalSteps.toLocaleString()}
                  </Text>
                </XStack>
                <Separator />

                <XStack justifyContent="space-between" alignItems="center">
                  <XStack space="$3" alignItems="center">
                    <Footprints size={20} color="$blue10" />
                    <Text>Daily Average</Text>
                  </XStack>
                  <Text fontWeight="bold">
                    {summary.thisWeek.avgDailySteps.toLocaleString()}
                  </Text>
                </XStack>
                <Separator />

                <XStack justifyContent="space-between" alignItems="center">
                  <XStack space="$3" alignItems="center">
                    <Activity size={20} color="$green10" />
                    <Text>Workout Minutes</Text>
                  </XStack>
                  <Text fontWeight="bold">
                    {summary.thisWeek.totalWorkoutMinutes}
                  </Text>
                </XStack>
                <Separator />

                {summary.thisWeek.avgSleepHours !== null && (
                  <>
                    <XStack justifyContent="space-between" alignItems="center">
                      <XStack space="$3" alignItems="center">
                        <Moon size={20} color="$purple10" />
                        <Text>Avg Sleep</Text>
                      </XStack>
                      <Text fontWeight="bold">
                        {summary.thisWeek.avgSleepHours} hrs
                      </Text>
                    </XStack>
                    <Separator />
                  </>
                )}

                {summary.thisWeek.avgRestingHeartRate !== null && (
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack space="$3" alignItems="center">
                      <Heart size={20} color="$red10" />
                      <Text>Resting Heart Rate</Text>
                    </XStack>
                    <Text fontWeight="bold">
                      {summary.thisWeek.avgRestingHeartRate} bpm
                    </Text>
                  </XStack>
                )}
              </YStack>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!isAuthorized && !isLoading && (
          <Card padding="$6" elevate>
            <YStack alignItems="center" space="$4">
              <Watch size={64} color="$gray10" />
              <YStack alignItems="center" space="$2">
                <Text fontSize="$5" fontWeight="bold" textAlign="center">
                  Connect Your Wearable
                </Text>
                <Text color="$gray11" textAlign="center">
                  {Platform.OS === 'ios'
                    ? 'Connect Apple Health to sync your workouts, heart rate, steps, and sleep data.'
                    : 'Wearable integration is currently available on iOS devices with Apple Health.'}
                </Text>
              </YStack>
              {isAvailable && (
                <Button
                  size="$5"
                  theme="blue"
                  icon={<Link2 size={20} />}
                  onPress={handleConnect}
                  disabled={isLoading}
                >
                  Connect Apple Health
                </Button>
              )}
            </YStack>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}
