/**
 * Leaderboards Screen
 *
 * Exercise-based competitive rankings:
 * - Global and hangout-specific leaderboards
 * - Filter by exercise, period, and cohort
 * - View personal rankings and progress
 */
import { useEffect, useState, useCallback } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  H4,
  Button,
  Avatar,
  Separator,
  Spinner,
  Select,
  ScrollView as TScrollView,
} from 'tamagui';
import { ScrollView, RefreshControl, Alert, Pressable } from 'react-native';
import {
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  ChevronDown,
  User,
  Filter,
  Globe,
  Users,
} from '@tamagui/lucide-icons';
import { apiClient } from '@musclemap/client';

// Types
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  value: number;
  verificationStatus: string;
  achievedAt: string;
  genderCategory?: string;
  ageBand?: string;
}

interface MetricDefinition {
  exerciseId: string;
  exerciseName: string;
  metrics: Array<{
    id: string;
    metricKey: string;
    displayName: string;
    unit: string;
    direction: 'higher' | 'lower';
  }>;
}

interface UserRank {
  rank: number;
  value: number;
  total: number;
  percentile: number;
}

// Period options
const PERIOD_OPTIONS = [
  { value: 'all_time', label: 'All Time' },
  { value: 'monthly', label: 'This Month' },
  { value: 'weekly', label: 'This Week' },
  { value: 'daily', label: 'Today' },
];

// Gender filter options
const GENDER_OPTIONS = [
  { value: 'open', label: 'All Genders' },
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'non_binary', label: 'Non-Binary' },
];

// Age band options
const AGE_OPTIONS = [
  { value: 'open', label: 'All Ages' },
  { value: 'under_18', label: 'Under 18' },
  { value: '18_29', label: '18-29' },
  { value: '30_39', label: '30-39' },
  { value: '40_49', label: '40-49' },
  { value: '50_59', label: '50-59' },
  { value: '60_plus', label: '60+' },
];

// Rank colors
function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return '#6B7280'; // Gray
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown size={20} color="#FFD700" />;
  if (rank === 2) return <Medal size={20} color="#C0C0C0" />;
  if (rank === 3) return <Medal size={20} color="#CD7F32" />;
  return null;
}

export default function LeaderboardsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all_time');
  const [selectedGender, setSelectedGender] = useState<string>('open');
  const [selectedAge, setSelectedAge] = useState<string>('open');
  const [showFilters, setShowFilters] = useState(false);

  // Load available metrics
  const loadMetrics = useCallback(async () => {
    try {
      const response = await apiClient.exerciseLeaderboards.metrics();
      const data = (response as any).data || [];
      setMetrics(data);

      // Select first exercise/metric by default
      if (data.length > 0 && data[0].metrics.length > 0) {
        setSelectedExercise(data[0].exerciseId);
        setSelectedMetric(data[0].metrics[0].metricKey);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }, []);

  // Load leaderboard data
  const loadLeaderboard = useCallback(async () => {
    if (!selectedExercise || !selectedMetric) return;

    try {
      const periodType = selectedPeriod as 'daily' | 'weekly' | 'monthly' | 'all_time';

      const [leaderboardResponse, rankResponse] = await Promise.all([
        apiClient.exerciseLeaderboards.get({
          exerciseId: selectedExercise,
          metricKey: selectedMetric,
          periodType,
          gender: selectedGender !== 'open' ? selectedGender : undefined,
          ageBand: selectedAge !== 'open' ? selectedAge : undefined,
          limit: 50,
        }),
        apiClient.exerciseLeaderboards.myRank({
          exerciseId: selectedExercise,
          metricKey: selectedMetric,
          periodType,
        }).catch(() => null),
      ]);

      const leaderboardData = leaderboardResponse as any;
      setEntries(leaderboardData.data?.entries || []);
      setTotal(leaderboardData.data?.entries?.length || 0);

      if (rankResponse) {
        const rankData = (rankResponse as any).data;
        if (rankData) {
          setUserRank({
            rank: rankData.rank,
            value: rankData.value,
            total: rankData.totalParticipants,
            percentile: rankData.percentile,
          });
        } else {
          setUserRank(null);
        }
      } else {
        setUserRank(null);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedExercise, selectedMetric, selectedPeriod, selectedGender, selectedAge]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (selectedExercise && selectedMetric) {
      setLoading(true);
      loadLeaderboard();
    }
  }, [loadLeaderboard, selectedExercise, selectedMetric]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Get current metric info
  const currentExercise = metrics.find((m) => m.exerciseId === selectedExercise);
  const currentMetric = currentExercise?.metrics.find((m) => m.metricKey === selectedMetric);

  if (loading && entries.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$blue10" />
        <Text marginTop="$4" color="$gray11">Loading leaderboards...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack padding="$4" backgroundColor="$blue10">
        <XStack alignItems="center" gap="$2">
          <Trophy size={28} color="white" />
          <H2 color="white">Leaderboards</H2>
        </XStack>
        {userRank && (
          <XStack marginTop="$3" backgroundColor="rgba(255,255,255,0.2)" borderRadius="$3" padding="$3" alignItems="center" gap="$3">
            <YStack alignItems="center">
              <Text fontSize="$7" fontWeight="bold" color="white">#{userRank.rank}</Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">Your Rank</Text>
            </YStack>
            <Separator vertical height={40} />
            <YStack alignItems="center">
              <Text fontSize="$5" fontWeight="bold" color="white">
                {userRank.value.toLocaleString()} {currentMetric?.unit || ''}
              </Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">Your Best</Text>
            </YStack>
            <Separator vertical height={40} />
            <YStack alignItems="center">
              <Text fontSize="$5" fontWeight="bold" color="white">Top {userRank.percentile}%</Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">Percentile</Text>
            </YStack>
          </XStack>
        )}
      </YStack>

      {/* Exercise & Metric Selector */}
      <YStack padding="$3" gap="$2" backgroundColor="$gray1">
        <XStack gap="$2">
          <YStack flex={1}>
            <Text fontSize="$2" color="$gray11" marginBottom="$1">Exercise</Text>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <Select.Trigger iconAfter={ChevronDown}>
                <Select.Value placeholder="Select exercise" />
              </Select.Trigger>
              <Select.Content>
                <Select.ScrollUpButton />
                <Select.Viewport>
                  {metrics.map((m) => (
                    <Select.Item key={m.exerciseId} value={m.exerciseId} index={metrics.indexOf(m)}>
                      <Select.ItemText>{m.exerciseName}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton />
              </Select.Content>
            </Select>
          </YStack>

          <YStack flex={1}>
            <Text fontSize="$2" color="$gray11" marginBottom="$1">Metric</Text>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <Select.Trigger iconAfter={ChevronDown}>
                <Select.Value placeholder="Select metric" />
              </Select.Trigger>
              <Select.Content>
                <Select.ScrollUpButton />
                <Select.Viewport>
                  {currentExercise?.metrics.map((m, i) => (
                    <Select.Item key={m.metricKey} value={m.metricKey} index={i}>
                      <Select.ItemText>{m.displayName}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton />
              </Select.Content>
            </Select>
          </YStack>
        </XStack>

        {/* Period & Filters Toggle */}
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <Select.Trigger iconAfter={ChevronDown}>
                <Select.Value placeholder="Period" />
              </Select.Trigger>
              <Select.Content>
                <Select.ScrollUpButton />
                <Select.Viewport>
                  {PERIOD_OPTIONS.map((p, i) => (
                    <Select.Item key={p.value} value={p.value} index={i}>
                      <Select.ItemText>{p.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton />
              </Select.Content>
            </Select>
          </YStack>

          <Button
            size="$3"
            icon={<Filter size={16} />}
            backgroundColor={showFilters ? '$blue10' : '$gray4'}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text color={showFilters ? 'white' : '$gray11'}>Filters</Text>
          </Button>
        </XStack>

        {/* Expanded Filters */}
        {showFilters && (
          <XStack gap="$2" marginTop="$2">
            <YStack flex={1}>
              <Text fontSize="$1" color="$gray11" marginBottom="$1">Gender</Text>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <Select.Trigger iconAfter={ChevronDown} size="$3">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Viewport>
                    {GENDER_OPTIONS.map((g, i) => (
                      <Select.Item key={g.value} value={g.value} index={i}>
                        <Select.ItemText>{g.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </YStack>

            <YStack flex={1}>
              <Text fontSize="$1" color="$gray11" marginBottom="$1">Age Group</Text>
              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <Select.Trigger iconAfter={ChevronDown} size="$3">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Viewport>
                    {AGE_OPTIONS.map((a, i) => (
                      <Select.Item key={a.value} value={a.value} index={i}>
                        <Select.ItemText>{a.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </YStack>
          </XStack>
        )}
      </YStack>

      {/* Leaderboard List */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack padding="$3" gap="$2">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
            <XStack alignItems="center" gap="$2">
              <Globe size={16} color="$gray11" />
              <Text fontSize="$3" color="$gray11">Global Rankings</Text>
            </XStack>
            <Text fontSize="$2" color="$gray10">{total} competitors</Text>
          </XStack>

          {entries.length === 0 ? (
            <Card padding="$6" backgroundColor="$gray2" alignItems="center">
              <Trophy size={48} color="$gray8" />
              <Text marginTop="$3" color="$gray11" textAlign="center">
                No entries yet. Be the first to set a record!
              </Text>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card
                key={`${entry.userId}-${entry.rank}`}
                padding="$3"
                backgroundColor={entry.rank <= 3 ? '$gray2' : '$gray1'}
                borderWidth={entry.rank <= 3 ? 2 : 1}
                borderColor={entry.rank <= 3 ? getRankColor(entry.rank) : '$gray4'}
              >
                <XStack alignItems="center" gap="$3">
                  {/* Rank */}
                  <YStack width={40} alignItems="center">
                    {getRankIcon(entry.rank) || (
                      <Text fontSize="$5" fontWeight="bold" color="$gray11">
                        {entry.rank}
                      </Text>
                    )}
                  </YStack>

                  {/* User Info */}
                  <Avatar circular size="$4">
                    {entry.avatarUrl ? (
                      <Avatar.Image src={entry.avatarUrl} />
                    ) : (
                      <Avatar.Fallback backgroundColor="$blue10">
                        <User size={20} color="white" />
                      </Avatar.Fallback>
                    )}
                  </Avatar>

                  <YStack flex={1}>
                    <Text fontWeight="bold" fontSize="$4">
                      {entry.displayName || entry.username}
                    </Text>
                    <XStack gap="$2" alignItems="center">
                      {entry.verificationStatus === 'verified' && (
                        <Text fontSize="$1" color="$green10">✓ Verified</Text>
                      )}
                      {entry.genderCategory && entry.genderCategory !== 'open' && (
                        <Text fontSize="$1" color="$gray10">
                          {entry.genderCategory}
                        </Text>
                      )}
                      {entry.ageBand && entry.ageBand !== 'open' && (
                        <Text fontSize="$1" color="$gray10">
                          {entry.ageBand.replace('_', '-')}
                        </Text>
                      )}
                    </XStack>
                  </YStack>

                  {/* Value */}
                  <YStack alignItems="flex-end">
                    <Text fontSize="$5" fontWeight="bold" color={entry.rank <= 3 ? getRankColor(entry.rank) : '$gray12'}>
                      {entry.value.toLocaleString()}
                    </Text>
                    <Text fontSize="$1" color="$gray10">
                      {currentMetric?.unit || ''}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            ))
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
