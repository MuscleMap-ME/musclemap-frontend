/**
 * Rivals Screen
 *
 * Real-time rivalry competition with WebSocket updates.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  Button,
  Avatar,
  Separator,
  Spinner,
  Input,
  Progress,
} from 'tamagui';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Swords,
  Trophy,
  Search,
  Check,
  X,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from '@tamagui/lucide-icons';
import {
  useAuth,
  useWebSocket,
  apiClient,
  type Rival,
  type RivalStats,
  type RivalSearchResult,
} from '@musclemap/client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.musclemap.me';

interface RivalEvent {
  type: 'rival.request' | 'rival.accepted' | 'rival.declined' | 'rival.ended' | 'rival.workout' | 'rival.milestone';
  rivalryId: string;
  userId: string;
  data?: {
    tu?: number;
    workout?: { id: string; totalTU: number };
    message?: string;
  };
}

interface RivalsSnapshot {
  rivals: Rival[];
  stats: RivalStats;
}

export default function RivalsScreen() {
  const { user, token } = useAuth();
  const [rivals, setRivals] = useState<Rival[]>([]);
  const [pendingRivals, setPendingRivals] = useState<Rival[]>([]);
  const [stats, setStats] = useState<RivalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RivalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // WebSocket connection for real-time updates
  const { connected, events } = useWebSocket<RivalsSnapshot, RivalEvent>(
    '/ws/rivals',
    {
      baseUrl: API_BASE_URL,
      token: token || undefined,
      onSnapshot: (snapshot) => {
        setRivals(snapshot.rivals.filter((r) => r.status === 'active'));
        setPendingRivals(snapshot.rivals.filter((r) => r.status === 'pending'));
        setStats(snapshot.stats);
      },
      onMessage: (event) => {
        // Handle real-time events
        if (event.type === 'rival.workout') {
          // Update the specific rivalry's TU
          setRivals((prev) =>
            prev.map((r) => {
              if (r.id === event.rivalryId && event.data?.workout) {
                const isMyWorkout = event.userId === user?.id;
                return {
                  ...r,
                  myTU: isMyWorkout ? r.myTU + event.data.workout.totalTU : r.myTU,
                  opponentTU: !isMyWorkout ? r.opponentTU + event.data.workout.totalTU : r.opponentTU,
                  tuDifference: isMyWorkout
                    ? r.tuDifference + event.data.workout.totalTU
                    : r.tuDifference - event.data.workout.totalTU,
                };
              }
              return r;
            })
          );
        } else if (event.type === 'rival.accepted') {
          loadData();
        } else if (event.type === 'rival.declined' || event.type === 'rival.ended') {
          loadData();
        } else if (event.type === 'rival.request') {
          loadData();
        }
      },
    }
  );

  const loadData = useCallback(async () => {
    try {
      const [activeData, pendingData, statsData] = await Promise.all([
        apiClient.rivals.list('active'),
        apiClient.rivals.pending(),
        apiClient.rivals.stats(),
      ]);

      setRivals(activeData.data.rivals);
      setPendingRivals(pendingData.data);
      setStats(statsData.data);
    } catch (err) {
      console.error('Failed to load rivals data:', err);
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

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await apiClient.rivals.search(query);
      setSearchResults(results.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, handleSearch]);

  const handleChallenge = async (userId: string) => {
    try {
      await apiClient.rivals.challenge(userId);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
      loadData();
    } catch (err) {
      console.error('Failed to send challenge:', err);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await apiClient.rivals.accept(id);
      loadData();
    } catch (err) {
      console.error('Failed to accept rivalry:', err);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await apiClient.rivals.decline(id);
      loadData();
    } catch (err) {
      console.error('Failed to decline rivalry:', err);
    }
  };

  const handleEnd = async (id: string) => {
    try {
      await apiClient.rivals.end(id);
      loadData();
    } catch (err) {
      console.error('Failed to end rivalry:', err);
    }
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$blue10" />
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
        {/* Connection Status */}
        <XStack justifyContent="space-between" alignItems="center">
          <H2>Rivals</H2>
          <XStack space="$2" alignItems="center">
            <XStack
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={connected ? '$green10' : '$gray10'}
            />
            <Text fontSize="$2" color="$gray11">
              {connected ? 'Live' : 'Offline'}
            </Text>
          </XStack>
        </XStack>

        {/* Stats Overview */}
        {stats && (
          <Card padding="$4" elevate>
            <XStack justifyContent="space-around">
              <YStack alignItems="center">
                <Trophy size={24} color="$yellow10" />
                <Text fontSize="$6" fontWeight="bold">{stats.wins}</Text>
                <Text fontSize="$2" color="$gray11">Wins</Text>
              </YStack>
              <YStack alignItems="center">
                <Swords size={24} color="$blue10" />
                <Text fontSize="$6" fontWeight="bold">{stats.activeRivals}</Text>
                <Text fontSize="$2" color="$gray11">Active</Text>
              </YStack>
              <YStack alignItems="center">
                <Zap size={24} color="$orange10" />
                <Text fontSize="$6" fontWeight="bold">{stats.totalTUEarned.toLocaleString()}</Text>
                <Text fontSize="$2" color="$gray11">TU Earned</Text>
              </YStack>
            </XStack>
          </Card>
        )}

        {/* Find Rivals */}
        <Card padding="$4" elevate>
          <YStack space="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <H3>Find Rivals</H3>
              <Button
                size="$3"
                icon={showSearch ? <X size={16} /> : <Search size={16} />}
                onPress={() => {
                  setShowSearch(!showSearch);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                {showSearch ? 'Close' : 'Search'}
              </Button>
            </XStack>

            {showSearch && (
              <YStack space="$3">
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChangeText={setSearchQuery as any}
                  autoCapitalize="none"
                />

                {searching && <Spinner size="small" color="$blue10" />}

                {searchResults.map((result) => (
                  <XStack
                    key={result.id}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$2"
                  >
                    <XStack space="$3" alignItems="center">
                      <Avatar circular size="$4">
                        <Avatar.Image
                          source={{
                            uri: `https://api.dicebear.com/7.x/initials/svg?seed=${result.username}`,
                          }}
                        />
                        <Avatar.Fallback backgroundColor="$blue5">
                          <Text>{result.username.charAt(0).toUpperCase()}</Text>
                        </Avatar.Fallback>
                      </Avatar>
                      <YStack>
                        <Text fontWeight="bold">{result.username}</Text>
                        {result.archetype && (
                          <Text fontSize="$2" color="$gray11">
                            {result.archetype}
                          </Text>
                        )}
                      </YStack>
                    </XStack>
                    <Button
                      size="$3"
                      theme="blue"
                      icon={<UserPlus size={16} />}
                      onPress={() => handleChallenge(result.id)}
                    >
                      Challenge
                    </Button>
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>
        </Card>

        {/* Pending Requests */}
        {pendingRivals.length > 0 && (
          <Card padding="$4" elevate borderColor="$yellow8" borderWidth={1}>
            <YStack space="$3">
              <H3>Pending Requests</H3>
              <Separator />

              {pendingRivals.map((rival) => (
                <YStack key={rival.id} space="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack space="$3" alignItems="center">
                      <Avatar circular size="$4">
                        <Avatar.Image
                          source={{
                            uri: `https://api.dicebear.com/7.x/initials/svg?seed=${rival.opponent.username}`,
                          }}
                        />
                        <Avatar.Fallback backgroundColor="$blue5">
                          <Text>{rival.opponent.username.charAt(0).toUpperCase()}</Text>
                        </Avatar.Fallback>
                      </Avatar>
                      <YStack>
                        <Text fontWeight="bold">{rival.opponent.username}</Text>
                        <Text fontSize="$2" color="$gray11">
                          {rival.isChallenger ? 'Waiting for response' : 'Wants to compete'}
                        </Text>
                      </YStack>
                    </XStack>
                    {!rival.isChallenger && (
                      <XStack space="$2">
                        <Button
                          size="$3"
                          theme="green"
                          icon={<Check size={16} />}
                          onPress={() => handleAccept(rival.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="$3"
                          theme="red"
                          icon={<X size={16} />}
                          onPress={() => handleDecline(rival.id)}
                        />
                      </XStack>
                    )}
                  </XStack>
                </YStack>
              ))}
            </YStack>
          </Card>
        )}

        {/* Active Rivalries */}
        <YStack space="$3">
          <H3>Active Rivalries</H3>

          {rivals.length === 0 ? (
            <Card padding="$6" elevate>
              <YStack alignItems="center" space="$3">
                <Swords size={48} color="$gray10" />
                <Text color="$gray11" textAlign="center">
                  No active rivalries yet.{'\n'}Challenge someone to compete!
                </Text>
              </YStack>
            </Card>
          ) : (
            rivals.map((rival) => {
              const total = rival.myTU + rival.opponentTU;
              const myPercent = total > 0 ? (rival.myTU / total) * 100 : 50;

              return (
                <Card key={rival.id} padding="$4" elevate>
                  <YStack space="$3">
                    <XStack justifyContent="space-between" alignItems="center">
                      <XStack space="$3" alignItems="center">
                        <Avatar circular size="$4">
                          <Avatar.Image
                            source={{
                              uri: `https://api.dicebear.com/7.x/initials/svg?seed=${rival.opponent.username}`,
                            }}
                          />
                          <Avatar.Fallback backgroundColor="$blue5">
                            <Text>{rival.opponent.username.charAt(0).toUpperCase()}</Text>
                          </Avatar.Fallback>
                        </Avatar>
                        <YStack>
                          <Text fontWeight="bold">{rival.opponent.username}</Text>
                          <Text fontSize="$2" color="$gray11">
                            vs You
                          </Text>
                        </YStack>
                      </XStack>
                      <XStack space="$2" alignItems="center">
                        {rival.isWinning ? (
                          <TrendingUp size={20} color="$green10" />
                        ) : rival.tuDifference < 0 ? (
                          <TrendingDown size={20} color="$red10" />
                        ) : (
                          <Minus size={20} color="$gray10" />
                        )}
                        <Text
                          fontWeight="bold"
                          color={
                            rival.isWinning
                              ? '$green10'
                              : rival.tuDifference < 0
                              ? '$red10'
                              : '$gray11'
                          }
                        >
                          {rival.tuDifference > 0 ? '+' : ''}
                          {rival.tuDifference} TU
                        </Text>
                      </XStack>
                    </XStack>

                    {/* Progress Bar */}
                    <YStack space="$1">
                      <XStack justifyContent="space-between">
                        <Text fontSize="$2" color="$blue10">
                          You: {rival.myTU.toLocaleString()} TU
                        </Text>
                        <Text fontSize="$2" color="$red10">
                          {rival.opponent.username}: {rival.opponentTU.toLocaleString()} TU
                        </Text>
                      </XStack>
                      <XStack height={8} borderRadius={4} overflow="hidden">
                        <XStack
                          flex={myPercent}
                          backgroundColor="$blue10"
                        />
                        <XStack
                          flex={100 - myPercent}
                          backgroundColor="$red10"
                        />
                      </XStack>
                    </YStack>

                    <Button
                      size="$3"
                      theme="red"
                      variant="outlined"
                      onPress={() => handleEnd(rival.id)}
                    >
                      End Rivalry
                    </Button>
                  </YStack>
                </Card>
              );
            })
          )}
        </YStack>

        {/* Recent Activity from WebSocket */}
        {events.length > 0 && (
          <YStack space="$3">
            <H3>Recent Activity</H3>
            <Card padding="$4" elevate>
              <YStack space="$2">
                {events.slice(0, 5).map((event, index) => (
                  <XStack key={index} space="$2" alignItems="center">
                    <Zap size={16} color="$orange10" />
                    <Text fontSize="$2" color="$gray11">
                      {event.type === 'rival.workout'
                        ? `Workout logged: +${event.data?.workout?.totalTU || 0} TU`
                        : event.type === 'rival.accepted'
                        ? 'Rivalry accepted!'
                        : event.type === 'rival.request'
                        ? 'New challenge received'
                        : event.data?.message || 'Activity update'}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </Card>
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
