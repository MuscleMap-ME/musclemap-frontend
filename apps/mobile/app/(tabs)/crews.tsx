/**
 * Crews Screen
 *
 * Crew management and Crew Wars tournament system.
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
import { ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Users,
  Trophy,
  Swords,
  Plus,
  Search,
  Crown,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
} from '@tamagui/lucide-icons';
import {
  apiClient,
  type MyCrewData,
  type Crew,
  type CrewWar,
  type CrewLeaderboardEntry,
} from '@musclemap/client';

export default function CrewsScreen() {
  const [myCrew, setMyCrew] = useState<MyCrewData | null>(null);
  const [leaderboard, setLeaderboard] = useState<CrewLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Crew[]>([]);
  const [searching, setSearching] = useState(false);

  // Create crew form
  const [crewName, setCrewName] = useState('');
  const [crewTag, setCrewTag] = useState('');
  const [crewDescription, setCrewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [crewData, leaderboardData] = await Promise.all([
        apiClient.crews.my(),
        apiClient.crews.leaderboard(20),
      ]);
      setMyCrew(crewData.data);
      setLeaderboard(leaderboardData.data);
    } catch (err) {
      console.error('Failed to load crews data:', err);
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
      const results = await apiClient.crews.search(query);
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

  const handleCreateCrew = async () => {
    if (!crewName.trim() || !crewTag.trim()) {
      Alert.alert('Error', 'Name and tag are required');
      return;
    }

    setCreating(true);
    try {
      await apiClient.crews.create(crewName.trim(), crewTag.trim(), crewDescription.trim() || undefined);
      setShowCreate(false);
      setCrewName('');
      setCrewTag('');
      setCrewDescription('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create crew');
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveCrew = async () => {
    Alert.alert(
      'Leave Crew',
      'Are you sure you want to leave this crew?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.crews.leave();
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave crew');
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color="$yellow10" />;
      case 'captain':
        return <Shield size={16} color="$blue10" />;
      default:
        return null;
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
        <H2>Crews</H2>

        {/* My Crew Section */}
        {myCrew ? (
          <>
            {/* Crew Header */}
            <Card padding="$4" elevate backgroundColor={myCrew.crew.color + '20'}>
              <YStack space="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack space="$3" alignItems="center">
                    <Avatar circular size="$5" backgroundColor={myCrew.crew.color}>
                      <Avatar.Fallback backgroundColor={myCrew.crew.color}>
                        <Text color="white" fontWeight="bold">
                          {myCrew.crew.tag}
                        </Text>
                      </Avatar.Fallback>
                    </Avatar>
                    <YStack>
                      <XStack space="$2" alignItems="center">
                        <Text fontSize="$5" fontWeight="bold">
                          {myCrew.crew.name}
                        </Text>
                        {getRoleIcon(myCrew.membership.role)}
                      </XStack>
                      <Text fontSize="$2" color="$gray11">
                        [{myCrew.crew.tag}] · {myCrew.crew.memberCount} members
                      </Text>
                    </YStack>
                  </XStack>
                </XStack>

                <XStack justifyContent="space-around">
                  <YStack alignItems="center">
                    <Text fontSize="$5" fontWeight="bold">
                      {myCrew.stats.weeklyTU.toLocaleString()}
                    </Text>
                    <Text fontSize="$2" color="$gray11">Weekly TU</Text>
                  </YStack>
                  <YStack alignItems="center">
                    <Text fontSize="$5" fontWeight="bold" color="$green10">
                      {myCrew.stats.warsWon}
                    </Text>
                    <Text fontSize="$2" color="$gray11">Wins</Text>
                  </YStack>
                  <YStack alignItems="center">
                    <Text fontSize="$5" fontWeight="bold" color="$red10">
                      {myCrew.stats.warsLost}
                    </Text>
                    <Text fontSize="$2" color="$gray11">Losses</Text>
                  </YStack>
                </XStack>
              </YStack>
            </Card>

            {/* Active Wars */}
            {myCrew.wars.length > 0 && (
              <YStack space="$3">
                <H3>Active Wars</H3>
                {myCrew.wars.map((war) => (
                  <WarCard key={war.id} war={war} myCrew={myCrew.crew} />
                ))}
              </YStack>
            )}

            {/* Top Contributors */}
            <Card padding="$4" elevate>
              <YStack space="$3">
                <H3>Top Contributors</H3>
                <Separator />
                {myCrew.stats.topContributors.map((contributor, index) => (
                  <XStack
                    key={contributor.userId}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <XStack space="$3" alignItems="center">
                      <Text color="$gray11" width={20}>
                        #{index + 1}
                      </Text>
                      <Avatar circular size="$3">
                        <Avatar.Image
                          source={{
                            uri: contributor.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${contributor.username}`,
                          }}
                        />
                        <Avatar.Fallback backgroundColor="$blue5">
                          <Text fontSize="$2">
                            {contributor.username.charAt(0).toUpperCase()}
                          </Text>
                        </Avatar.Fallback>
                      </Avatar>
                      <Text>{contributor.username}</Text>
                    </XStack>
                    <Text fontWeight="bold" color="$blue10">
                      {contributor.weeklyTU.toLocaleString()} TU
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </Card>

            {/* Leave Button */}
            {myCrew.membership.role !== 'owner' && (
              <Button
                size="$4"
                theme="red"
                variant="outlined"
                onPress={handleLeaveCrew}
              >
                Leave Crew
              </Button>
            )}
          </>
        ) : (
          <>
            {/* No Crew - Create or Join */}
            <Card padding="$6" elevate>
              <YStack alignItems="center" space="$4">
                <Users size={64} color="$gray10" />
                <YStack alignItems="center" space="$2">
                  <Text fontSize="$5" fontWeight="bold" textAlign="center">
                    Join a Crew
                  </Text>
                  <Text color="$gray11" textAlign="center">
                    Team up with others and compete in Crew Wars!
                  </Text>
                </YStack>
                <XStack space="$3">
                  <Button
                    size="$4"
                    theme="blue"
                    icon={<Plus size={20} />}
                    onPress={() => setShowCreate(true)}
                  >
                    Create Crew
                  </Button>
                  <Button
                    size="$4"
                    variant="outlined"
                    icon={<Search size={20} />}
                    onPress={() => setShowSearch(true)}
                  >
                    Find Crew
                  </Button>
                </XStack>
              </YStack>
            </Card>

            {/* Create Crew Form */}
            {showCreate && (
              <Card padding="$4" elevate>
                <YStack space="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H3>Create Crew</H3>
                    <Button size="$2" onPress={() => setShowCreate(false)}>
                      Cancel
                    </Button>
                  </XStack>
                  <Separator />

                  <Input
                    placeholder="Crew Name"
                    value={crewName}
                    onChangeText={setCrewName as any}
                  />
                  <Input
                    placeholder="Tag (3-5 chars)"
                    value={crewTag}
                    onChangeText={setCrewTag as any}
                    maxLength={5}
                    autoCapitalize="characters"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={crewDescription}
                    onChangeText={setCrewDescription as any}
                  />
                  <Button
                    size="$4"
                    theme="blue"
                    disabled={creating || !crewName.trim() || !crewTag.trim()}
                    onPress={handleCreateCrew}
                  >
                    {creating ? <Spinner size="small" /> : 'Create Crew'}
                  </Button>
                </YStack>
              </Card>
            )}

            {/* Search Crews */}
            {showSearch && (
              <Card padding="$4" elevate>
                <YStack space="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H3>Find Crew</H3>
                    <Button size="$2" onPress={() => setShowSearch(false)}>
                      Cancel
                    </Button>
                  </XStack>
                  <Input
                    placeholder="Search by name or tag..."
                    value={searchQuery}
                    onChangeText={setSearchQuery as any}
                  />
                  {searching && <Spinner size="small" color="$blue10" />}
                  {searchResults.map((crew) => (
                    <XStack
                      key={crew.id}
                      justifyContent="space-between"
                      alignItems="center"
                      paddingVertical="$2"
                    >
                      <XStack space="$3" alignItems="center">
                        <Avatar circular size="$3" backgroundColor={crew.color}>
                          <Avatar.Fallback>
                            <Text color="white" fontSize="$2">{crew.tag}</Text>
                          </Avatar.Fallback>
                        </Avatar>
                        <YStack>
                          <Text fontWeight="bold">{crew.name}</Text>
                          <Text fontSize="$2" color="$gray11">
                            {crew.memberCount} members · {crew.weeklyTU.toLocaleString()} TU
                          </Text>
                        </YStack>
                      </XStack>
                    </XStack>
                  ))}
                </YStack>
              </Card>
            )}
          </>
        )}

        {/* Leaderboard */}
        <YStack space="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H3>Leaderboard</H3>
            <Trophy size={20} color="$yellow10" />
          </XStack>
          <Card padding="$4" elevate>
            <YStack space="$3">
              {leaderboard.slice(0, 10).map((entry) => (
                <XStack
                  key={entry.crew.id}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <XStack space="$3" alignItems="center">
                    <Text
                      color={entry.rank <= 3 ? '$yellow10' : '$gray11'}
                      fontWeight={entry.rank <= 3 ? 'bold' : 'normal'}
                      width={24}
                    >
                      #{entry.rank}
                    </Text>
                    <Avatar circular size="$3" backgroundColor={entry.crew.color}>
                      <Avatar.Fallback>
                        <Text color="white" fontSize="$1">{entry.crew.tag}</Text>
                      </Avatar.Fallback>
                    </Avatar>
                    <YStack>
                      <Text fontWeight="bold">{entry.crew.name}</Text>
                      <Text fontSize="$2" color="$gray11">
                        {entry.crew.memberCount} members
                      </Text>
                    </YStack>
                  </XStack>
                  <Text fontWeight="bold" color="$blue10">
                    {entry.crew.weeklyTU.toLocaleString()}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </Card>
        </YStack>
      </YStack>
    </ScrollView>
  );
}

interface WarCardProps {
  war: CrewWar;
  myCrew: Crew;
}

function WarCard({ war, myCrew }: WarCardProps) {
  const isChallenger = war.challengerCrewId === myCrew.id;
  const opponentCrew = isChallenger ? war.defendingCrew : war.challengerCrew;
  const myTU = isChallenger ? war.challengerTU : war.defendingTU;
  const opponentTU = isChallenger ? war.defendingTU : war.challengerTU;
  const total = myTU + opponentTU;
  const myPercent = total > 0 ? (myTU / total) * 100 : 50;

  return (
    <Card padding="$4" elevate>
      <YStack space="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack space="$3" alignItems="center">
            <Swords size={24} color="$red10" />
            <YStack>
              <Text fontWeight="bold">vs {opponentCrew.name}</Text>
              <XStack space="$2" alignItems="center">
                <Clock size={14} color="$gray11" />
                <Text fontSize="$2" color="$gray11">
                  {war.daysRemaining} days left
                </Text>
              </XStack>
            </YStack>
          </XStack>
          <XStack space="$2" alignItems="center">
            {war.isWinning ? (
              <TrendingUp size={20} color="$green10" />
            ) : myTU < opponentTU ? (
              <TrendingDown size={20} color="$red10" />
            ) : null}
            <Text
              fontWeight="bold"
              color={war.isWinning ? '$green10' : myTU < opponentTU ? '$red10' : '$gray11'}
            >
              {myTU > opponentTU ? '+' : ''}{myTU - opponentTU} TU
            </Text>
          </XStack>
        </XStack>

        {/* Progress Bar */}
        <YStack space="$1">
          <XStack justifyContent="space-between">
            <Text fontSize="$2" color="$blue10">
              {myCrew.name}: {myTU.toLocaleString()} TU
            </Text>
            <Text fontSize="$2" color="$red10">
              {opponentCrew.name}: {opponentTU.toLocaleString()} TU
            </Text>
          </XStack>
          <XStack height={8} borderRadius={4} overflow="hidden">
            <XStack flex={myPercent} backgroundColor="$blue10" />
            <XStack flex={100 - myPercent} backgroundColor="$red10" />
          </XStack>
        </YStack>
      </YStack>
    </Card>
  );
}
