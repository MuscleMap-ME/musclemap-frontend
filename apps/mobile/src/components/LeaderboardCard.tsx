/**
 * Leaderboard Card Component
 *
 * Displays leaderboard rankings with filtering by stat type,
 * geographic scope, and gender.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  H3,
  Button,
  Avatar,
  Spinner,
  ScrollView,
} from 'tamagui';
import { Trophy, Medal } from '@tamagui/lucide-icons';
import { apiClient, type LeaderboardEntry } from '@musclemap/client';

type StatType = 'vitality' | 'strength' | 'constitution' | 'dexterity' | 'power' | 'endurance';
type Scope = 'global' | 'country' | 'state' | 'city';

interface LeaderboardCardProps {
  initialStat?: StatType;
  initialScope?: Scope;
  userCountry?: string;
  userState?: string;
  userCity?: string;
  compact?: boolean;
}

const STAT_OPTIONS: { value: StatType; label: string; color: string }[] = [
  { value: 'vitality', label: 'VIT', color: '#9333EA' },
  { value: 'strength', label: 'STR', color: '#FF3366' },
  { value: 'constitution', label: 'CON', color: '#00CC66' },
  { value: 'dexterity', label: 'DEX', color: '#FFB800' },
  { value: 'power', label: 'PWR', color: '#FF6B00' },
  { value: 'endurance', label: 'END', color: '#0066FF' },
];

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'country', label: 'Country' },
  { value: 'state', label: 'State' },
  { value: 'city', label: 'City' },
];

function getRankBadge(rank: number): React.ReactNode {
  if (rank === 1) {
    return <Trophy size={20} color="#FFD700" />;
  }
  if (rank === 2) {
    return <Medal size={20} color="#C0C0C0" />;
  }
  if (rank === 3) {
    return <Medal size={20} color="#CD7F32" />;
  }
  return (
    <Text
      fontSize="$3"
      fontWeight="bold"
      color="$gray11"
      width={20}
      textAlign="center"
    >
      {rank}
    </Text>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  statColor: string;
}

function LeaderboardRow({ entry, statColor }: LeaderboardRowProps) {
  return (
    <XStack
      paddingVertical="$2"
      paddingHorizontal="$2"
      alignItems="center"
      space="$3"
      borderBottomWidth={1}
      borderBottomColor="$gray4"
    >
      <XStack width={30} justifyContent="center">
        {getRankBadge(entry.rank)}
      </XStack>

      <Avatar circular size="$3">
        <Avatar.Image
          source={{
            uri: entry.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.username}`,
          }}
        />
        <Avatar.Fallback backgroundColor="$blue5">
          <Text fontSize="$2" color="$blue10">
            {entry.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </Avatar.Fallback>
      </Avatar>

      <YStack flex={1}>
        <Text fontWeight="600" fontSize="$3">
          {entry.username}
        </Text>
        {entry.country && (
          <Text color="$gray11" fontSize="$1">
            {[entry.city, entry.state, entry.country].filter(Boolean).join(', ')}
          </Text>
        )}
      </YStack>

      <Text fontWeight="bold" color={statColor} fontSize="$4">
        {entry.statValue.toFixed(0)}
      </Text>
    </XStack>
  );
}

export function LeaderboardCard({
  initialStat = 'vitality',
  initialScope = 'global',
  userCountry,
  userState,
  userCity,
  compact = false,
}: LeaderboardCardProps) {
  const [stat, setStat] = useState<StatType>(initialStat);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statColor = STAT_OPTIONS.find((s) => s.value === stat)?.color || '#9333EA';

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Determine scope value based on user's location
      let scopeValue: string | undefined;
      if (scope === 'country') scopeValue = userCountry;
      else if (scope === 'state') scopeValue = userState;
      else if (scope === 'city') scopeValue = userCity;

      const result = await apiClient.characterStats.leaderboard({
        stat,
        scope,
        scopeValue,
        limit: compact ? 5 : 20,
      });

      setEntries(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [stat, scope, userCountry, userState, userCity, compact]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <Card padding="$4" elevate>
      <YStack space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <H3>Leaderboard</H3>
          <XStack space="$1">
            <Trophy size={20} color="$blue10" />
          </XStack>
        </XStack>

        {/* Stat filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack space="$2">
            {STAT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="$2"
                theme={stat === option.value ? 'active' : 'gray'}
                onPress={() => setStat(option.value)}
                backgroundColor={stat === option.value ? option.color : undefined}
              >
                {option.label}
              </Button>
            ))}
          </XStack>
        </ScrollView>

        {/* Scope filter */}
        {!compact && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack space="$2">
              {SCOPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="$2"
                  theme={scope === option.value ? 'active' : 'gray'}
                  onPress={() => setScope(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </XStack>
          </ScrollView>
        )}

        {/* Content */}
        {loading ? (
          <YStack padding="$4" alignItems="center">
            <Spinner size="large" color="$blue10" />
          </YStack>
        ) : error ? (
          <YStack padding="$4" alignItems="center">
            <Text color="$red10">{error}</Text>
            <Button size="$3" marginTop="$2" onPress={loadLeaderboard}>
              Retry
            </Button>
          </YStack>
        ) : entries.length === 0 ? (
          <YStack padding="$4" alignItems="center">
            <Text color="$gray11">No rankings available yet</Text>
          </YStack>
        ) : (
          <YStack>
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                statColor={statColor}
              />
            ))}
          </YStack>
        )}
      </YStack>
    </Card>
  );
}

export default LeaderboardCard;
