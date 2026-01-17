/**
 * Stats Screen
 *
 * D&D-style character stats display with:
 * - Radar chart visualization
 * - Individual stat bars
 * - Personal rankings
 * - Leaderboards
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Separator,
} from 'tamagui';
import { ScrollView, RefreshControl } from 'react-native';
import { TrendingUp, RefreshCw, Globe, MapPin } from '@tamagui/lucide-icons';
import {
  apiClient,
  type CharacterStats,
  type StatRankingsByScope,
  type ExtendedProfile,
  type MuscleActivation as APIMuscleActivation,
} from '@musclemap/client';
import { CharacterStatsCard } from '../../src/components/CharacterStatsCard';
import { LeaderboardCard } from '../../src/components/LeaderboardCard';
import { MuscleViewer, type MuscleActivation } from '../../src/components/MuscleViewer';

type StatKey = 'strength' | 'constitution' | 'dexterity' | 'power' | 'endurance' | 'vitality';

const STAT_META: Record<StatKey, { name: string; abbr: string; color: string }> = {
  strength: { name: 'Strength', abbr: 'STR', color: '#FF3366' },
  constitution: { name: 'Constitution', abbr: 'CON', color: '#00CC66' },
  dexterity: { name: 'Dexterity', abbr: 'DEX', color: '#FFB800' },
  power: { name: 'Power', abbr: 'PWR', color: '#FF6B00' },
  endurance: { name: 'Endurance', abbr: 'END', color: '#0066FF' },
  vitality: { name: 'Vitality', abbr: 'VIT', color: '#9333EA' },
};

interface RankingDisplayProps {
  statKey: StatKey;
  rankings: StatRankingsByScope;
}

function RankingDisplay({ statKey, rankings }: RankingDisplayProps) {
  const meta = STAT_META[statKey];

  return (
    <Card padding="$3" backgroundColor="$gray2">
      <YStack space="$2">
        <XStack space="$2" alignItems="center">
          <Text fontWeight="bold" color={meta.color}>
            {meta.abbr}
          </Text>
          <Text color="$gray11" fontSize="$2">
            Rankings
          </Text>
        </XStack>

        <XStack justifyContent="space-around" flexWrap="wrap">
          {rankings.global && (
            <YStack alignItems="center" minWidth={60}>
              <XStack space="$1" alignItems="center">
                <Globe size={12} color="$gray11" />
                <Text fontSize="$1" color="$gray11">
                  Global
                </Text>
              </XStack>
              <Text fontWeight="bold" fontSize="$3">
                #{rankings.global.rank}
              </Text>
              <Text fontSize="$1" color="$gray11">
                Top {rankings.global.percentile.toFixed(0)}%
              </Text>
            </YStack>
          )}

          {rankings.country && (
            <YStack alignItems="center" minWidth={60}>
              <XStack space="$1" alignItems="center">
                <MapPin size={12} color="$gray11" />
                <Text fontSize="$1" color="$gray11">
                  Country
                </Text>
              </XStack>
              <Text fontWeight="bold" fontSize="$3">
                #{rankings.country.rank}
              </Text>
              <Text fontSize="$1" color="$gray11">
                Top {rankings.country.percentile.toFixed(0)}%
              </Text>
            </YStack>
          )}

          {rankings.state && (
            <YStack alignItems="center" minWidth={60}>
              <Text fontSize="$1" color="$gray11">
                State
              </Text>
              <Text fontWeight="bold" fontSize="$3">
                #{rankings.state.rank}
              </Text>
              <Text fontSize="$1" color="$gray11">
                Top {rankings.state.percentile.toFixed(0)}%
              </Text>
            </YStack>
          )}
        </XStack>
      </YStack>
    </Card>
  );
}

export default function StatsScreen() {
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [rankings, setRankings] = useState<Record<StatKey, StatRankingsByScope> | null>(null);
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [muscleActivations, setMuscleActivations] = useState<APIMuscleActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert API activations to MuscleViewer format
  const viewerActivations = useMemo((): MuscleActivation[] => {
    if (!muscleActivations.length) return [];
    const maxActivation = Math.max(...muscleActivations.map((a) => a.normalizedActivation), 1);
    return muscleActivations.map((a) => ({
      id: a.muscleId,
      intensity: a.normalizedActivation / maxActivation,
      isPrimary: a.normalizedActivation / maxActivation > 0.6,
    }));
  }, [muscleActivations]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsResult, profileResult, muscleResult] = await Promise.all([
        apiClient.characterStats.me(),
        apiClient.characterStats.extendedProfile(),
        apiClient.workouts.muscleActivations(30), // Last 30 days
      ]);

      setStats(statsResult.data.stats);
      setRankings(statsResult.data.rankings as Record<StatKey, StatRankingsByScope>);
      setProfile(profileResult.data);
      setMuscleActivations(muscleResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const result = await apiClient.characterStats.recalculate();
      setStats(result.data.stats);
      // Reload rankings after recalculation
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate stats');
    } finally {
      setRecalculating(false);
    }
  }, [loadData]);

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$blue10" />
        <Text color="$gray11" marginTop="$2">
          Loading character stats...
        </Text>
      </YStack>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <YStack flex={1} padding="$4" space="$4">
        <YStack space="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <H2>Character Stats</H2>
              <Paragraph color="$gray11">Your D&D-style attributes</Paragraph>
            </YStack>
            <Button
              size="$3"
              icon={recalculating ? <Spinner size="small" /> : <RefreshCw size={16} />}
              theme="gray"
              onPress={handleRecalculate}
              disabled={recalculating}
            >
              Recalc
            </Button>
          </XStack>
        </YStack>

        {error && (
          <Card padding="$4" backgroundColor="$red2">
            <Text color="$red10">{error}</Text>
          </Card>
        )}

        {/* Main Stats Card with Radar */}
        {stats && <CharacterStatsCard stats={stats} showRadar={true} />}

        {/* Muscle Development Overview */}
        {viewerActivations.length > 0 && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <H3>Muscle Development</H3>
                <Text color="$gray11" fontSize="$2">Last 30 days</Text>
              </XStack>
              <MuscleViewer
                muscles={viewerActivations}
                mode="card"
                showModeToggle={true}
                interactive={true}
              />
            </YStack>
          </Card>
        )}

        {/* Rankings Section */}
        {rankings && (
          <Card padding="$4" elevate>
            <YStack space="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <H3>Your Rankings</H3>
                <TrendingUp size={20} color="$blue10" />
              </XStack>

              <YStack space="$3">
                {/* Show vitality (overall) ranking prominently */}
                {rankings.vitality && (
                  <RankingDisplay statKey="vitality" rankings={rankings.vitality} />
                )}

                <Separator />

                {/* Other stats in a grid */}
                <XStack flexWrap="wrap" justifyContent="space-between" gap="$2">
                  {(['strength', 'constitution', 'dexterity', 'power', 'endurance'] as StatKey[]).map(
                    (key) =>
                      rankings[key] && (
                        <YStack key={key} width="48%" marginBottom="$2">
                          <RankingDisplay statKey={key} rankings={rankings[key]} />
                        </YStack>
                      )
                  )}
                </XStack>
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Leaderboard */}
        <LeaderboardCard
          userCountry={profile?.country ?? undefined}
          userState={profile?.state ?? undefined}
          userCity={profile?.city ?? undefined}
        />

        {/* Profile Location */}
        {profile && (profile.city || profile.country) && (
          <Card padding="$4" elevate>
            <YStack space="$2">
              <H3>Your Location</H3>
              <XStack space="$2" alignItems="center">
                <MapPin size={16} color="$gray11" />
                <Text color="$gray11">
                  {[profile.city, profile.state, profile.country]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </XStack>
              <Text color="$gray10" fontSize="$2">
                Update your location in settings for local rankings
              </Text>
            </YStack>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}
