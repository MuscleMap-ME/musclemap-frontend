/**
 * Community Screen
 *
 * Themed virtual hangouts and self-organized communities.
 * Browse by theme, join hangouts, and participate in discussions.
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
  Input,
  ScrollView as TScrollView,
  Tabs,
} from 'tamagui';
import { ScrollView, RefreshControl, Alert, Pressable } from 'react-native';
import {
  Users,
  MessageSquare,
  Search,
  Plus,
  ChevronRight,
  Crown,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from '@tamagui/lucide-icons';
import {
  apiClient,
  type VirtualHangout,
  type VirtualHangoutTheme,
  type Community,
  type BulletinPost,
} from '@musclemap/client';

// Theme colors for hangouts
const THEME_COLORS: Record<string, string> = {
  'warriors-cave': '#DC2626',
  'hunters-den': '#65A30D',
  'runners-camp': '#0EA5E9',
  'police-academy': '#1D4ED8',
  'fire-station': '#EA580C',
  'military-barracks': '#4B5563',
  'yoga-garden': '#8B5CF6',
  'crossfit-box': '#F59E0B',
  'swimmers-cove': '#06B6D4',
  'climbers-peak': '#78716C',
};

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'hangouts' | 'communities'>('hangouts');
  const [themes, setThemes] = useState<VirtualHangoutTheme[]>([]);
  const [myHangouts, setMyHangouts] = useState<VirtualHangout[]>([]);
  const [recommendedHangouts, setRecommendedHangouts] = useState<VirtualHangout[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [popularCommunities, setPopularCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedHangout, setSelectedHangout] = useState<VirtualHangout | null>(null);
  const [hangoutPosts, setHangoutPosts] = useState<BulletinPost[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [
        themesData,
        myHangoutsData,
        recommendedData,
        myCommunitiesData,
        popularCommunitiesData,
      ] = await Promise.all([
        apiClient.hangouts.themes(),
        apiClient.hangouts.my(),
        apiClient.hangouts.recommended(),
        apiClient.communities.my(),
        apiClient.communities.search({ limit: 10 }),
      ]);

      setThemes((themesData as any).data || []);
      setMyHangouts((myHangoutsData as any).data || []);
      setRecommendedHangouts((recommendedData as any).data || []);
      setMyCommunities((myCommunitiesData as any).data || []);
      setPopularCommunities((popularCommunitiesData as any).data || []);
    } catch (err) {
      console.error('Failed to load community data:', err);
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
      const results = await apiClient.communities.search({ query, limit: 20 });
      setSearchResults((results as any).data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleJoinHangout = useCallback(async (hangout: VirtualHangout) => {
    try {
      await apiClient.hangouts.join(hangout.id);
      Alert.alert('Joined!', `Welcome to ${hangout.name}!`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join hangout');
    }
  }, [loadData]);

  const handleLeaveHangout = useCallback(async (hangout: VirtualHangout) => {
    Alert.alert(
      'Leave Hangout',
      `Are you sure you want to leave ${hangout.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.hangouts.leave(hangout.id);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave hangout');
            }
          },
        },
      ]
    );
  }, [loadData]);

  const handleJoinCommunity = useCallback(async (community: Community) => {
    try {
      const result = await apiClient.communities.join(community.id);
      const status = (result as any).data?.status;
      if (status === 'pending') {
        Alert.alert('Request Sent', 'Your membership request is pending approval.');
      } else {
        Alert.alert('Joined!', `Welcome to ${community.name}!`);
      }
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join community');
    }
  }, [loadData]);

  const handleSelectHangout = useCallback(async (hangout: VirtualHangout) => {
    setSelectedHangout(hangout);
    try {
      const postsData = await apiClient.hangouts.posts(hangout.id, { limit: 20 });
      setHangoutPosts((postsData as any).data || []);
      // Send heartbeat
      apiClient.hangouts.heartbeat(hangout.id);
    } catch (err) {
      console.error('Failed to load hangout posts:', err);
    }
  }, []);

  const handleVotePost = useCallback(async (postId: string, voteType: 'up' | 'down') => {
    try {
      await apiClient.bulletin.votePost(postId, voteType);
      // Refresh posts
      if (selectedHangout) {
        const postsData = await apiClient.hangouts.posts(selectedHangout.id, { limit: 20 });
        setHangoutPosts((postsData as any).data || []);
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  }, [selectedHangout]);

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$blue10" />
        <Text marginTop="$4" color="$gray11">Loading communities...</Text>
      </YStack>
    );
  }

  // Hangout detail view
  if (selectedHangout) {
    return (
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          backgroundColor={selectedHangout.accentColor}
          alignItems="center"
        >
          <Button
            size="$3"
            circular
            chromeless
            onPress={() => setSelectedHangout(null)}
            icon={<ChevronRight size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />}
          />
          <YStack flex={1} marginLeft="$3">
            <Text fontSize="$6" fontWeight="bold" color="white">
              {selectedHangout.iconEmoji} {selectedHangout.name}
            </Text>
            <Text fontSize="$2" color="rgba(255,255,255,0.8)">
              {selectedHangout.memberCount} members · {selectedHangout.activeNow} active now
            </Text>
          </YStack>
          {selectedHangout.isMember ? (
            <Button
              size="$3"
              backgroundColor="rgba(255,255,255,0.2)"
              onPress={() => handleLeaveHangout(selectedHangout)}
            >
              <Text color="white">Leave</Text>
            </Button>
          ) : (
            <Button
              size="$3"
              backgroundColor="white"
              onPress={() => handleJoinHangout(selectedHangout)}
            >
              <Text color={selectedHangout.accentColor}>Join</Text>
            </Button>
          )}
        </XStack>

        {/* Welcome message */}
        {selectedHangout.welcomeMessage && (
          <Card margin="$3" padding="$3" backgroundColor="$gray2">
            <Text color="$gray11">{selectedHangout.welcomeMessage}</Text>
          </Card>
        )}

        {/* Posts */}
        <ScrollView style={{ flex: 1 }}>
          <YStack padding="$3" gap="$3">
            <H4>Discussion Board</H4>
            {hangoutPosts.length === 0 ? (
              <Card padding="$4" backgroundColor="$gray2">
                <Text textAlign="center" color="$gray11">
                  No posts yet. Be the first to start a discussion!
                </Text>
              </Card>
            ) : (
              hangoutPosts.map((post) => (
                <Card key={post.id} padding="$3" backgroundColor="$gray2">
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1}>
                      {post.isPinned && (
                        <XStack alignItems="center" gap="$1" marginBottom="$1">
                          <Star size={12} color="$yellow10" />
                          <Text fontSize="$1" color="$yellow10">Pinned</Text>
                        </XStack>
                      )}
                      <Text fontWeight="bold" fontSize="$4">{post.title}</Text>
                      <Text fontSize="$2" color="$gray11" marginTop="$1">
                        by {post.authorUsername || 'Anonymous'} · {new Date(post.createdAt).toLocaleDateString()}
                      </Text>
                    </YStack>
                    <XStack alignItems="center" gap="$2">
                      <XStack alignItems="center" gap="$1">
                        <Eye size={14} color="$gray10" />
                        <Text fontSize="$2" color="$gray10">{post.viewCount}</Text>
                      </XStack>
                      <XStack alignItems="center" gap="$1">
                        <MessageSquare size={14} color="$gray10" />
                        <Text fontSize="$2" color="$gray10">{post.commentCount}</Text>
                      </XStack>
                    </XStack>
                  </XStack>
                  <Text marginTop="$2" numberOfLines={3} color="$gray12">
                    {post.content}
                  </Text>
                  <XStack marginTop="$3" gap="$3" alignItems="center">
                    <Pressable onPress={() => handleVotePost(post.id, 'up')}>
                      <XStack alignItems="center" gap="$1">
                        <ThumbsUp
                          size={18}
                          color={post.userVote === 'up' ? '$green10' : '$gray10'}
                        />
                        <Text color={post.userVote === 'up' ? '$green10' : '$gray10'}>
                          {post.upvotes}
                        </Text>
                      </XStack>
                    </Pressable>
                    <Pressable onPress={() => handleVotePost(post.id, 'down')}>
                      <XStack alignItems="center" gap="$1">
                        <ThumbsDown
                          size={18}
                          color={post.userVote === 'down' ? '$red10' : '$gray10'}
                        />
                        <Text color={post.userVote === 'down' ? '$red10' : '$gray10'}>
                          {post.downvotes}
                        </Text>
                      </XStack>
                    </Pressable>
                  </XStack>
                </Card>
              ))
            )}
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Tabs */}
      <XStack padding="$3" gap="$2">
        <Button
          flex={1}
          size="$4"
          backgroundColor={activeTab === 'hangouts' ? '$blue10' : '$gray4'}
          onPress={() => setActiveTab('hangouts')}
        >
          <Text color={activeTab === 'hangouts' ? 'white' : '$gray11'} fontWeight="bold">
            Hangouts
          </Text>
        </Button>
        <Button
          flex={1}
          size="$4"
          backgroundColor={activeTab === 'communities' ? '$blue10' : '$gray4'}
          onPress={() => setActiveTab('communities')}
        >
          <Text color={activeTab === 'communities' ? 'white' : '$gray11'} fontWeight="bold">
            Communities
          </Text>
        </Button>
      </XStack>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'hangouts' ? (
          <YStack padding="$3" gap="$4">
            {/* My Hangouts */}
            {myHangouts.length > 0 && (
              <YStack gap="$2">
                <H3>My Hangouts</H3>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <XStack gap="$3" paddingRight="$3">
                    {myHangouts.map((hangout) => (
                      <Pressable key={hangout.id} onPress={() => handleSelectHangout(hangout)}>
                        <Card
                          width={160}
                          padding="$3"
                          backgroundColor={hangout.accentColor}
                          borderRadius="$4"
                        >
                          <Text fontSize="$7">{hangout.iconEmoji}</Text>
                          <Text
                            fontWeight="bold"
                            color="white"
                            marginTop="$2"
                            numberOfLines={1}
                          >
                            {hangout.name}
                          </Text>
                          <XStack marginTop="$2" alignItems="center" gap="$1">
                            <Users size={12} color="rgba(255,255,255,0.8)" />
                            <Text fontSize="$2" color="rgba(255,255,255,0.8)">
                              {hangout.memberCount}
                            </Text>
                            {hangout.activeNow > 0 && (
                              <>
                                <Text fontSize="$2" color="rgba(255,255,255,0.8)">·</Text>
                                <Text fontSize="$2" color="#4ADE80">
                                  {hangout.activeNow} online
                                </Text>
                              </>
                            )}
                          </XStack>
                        </Card>
                      </Pressable>
                    ))}
                  </XStack>
                </ScrollView>
              </YStack>
            )}

            {/* Recommended Hangouts */}
            {recommendedHangouts.length > 0 && (
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <H3>Recommended for You</H3>
                  <Star size={18} color="$yellow10" />
                </XStack>
                {recommendedHangouts.map((hangout) => (
                  <Pressable key={hangout.id} onPress={() => handleSelectHangout(hangout)}>
                    <Card padding="$3" backgroundColor="$gray2">
                      <XStack alignItems="center" gap="$3">
                        <YStack
                          width={50}
                          height={50}
                          borderRadius="$3"
                          backgroundColor={hangout.accentColor}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Text fontSize="$6">{hangout.iconEmoji}</Text>
                        </YStack>
                        <YStack flex={1}>
                          <Text fontWeight="bold" fontSize="$4">{hangout.name}</Text>
                          <Text fontSize="$2" color="$gray11">{hangout.themeName}</Text>
                          <XStack marginTop="$1" alignItems="center" gap="$2">
                            <XStack alignItems="center" gap="$1">
                              <Users size={12} color="$gray10" />
                              <Text fontSize="$2" color="$gray10">{hangout.memberCount}</Text>
                            </XStack>
                          </XStack>
                        </YStack>
                        <Button
                          size="$3"
                          backgroundColor="$blue10"
                          onPress={(e) => {
                            e.stopPropagation();
                            handleJoinHangout(hangout);
                          }}
                        >
                          Join
                        </Button>
                      </XStack>
                    </Card>
                  </Pressable>
                ))}
              </YStack>
            )}

            {/* Browse by Theme */}
            <YStack gap="$2">
              <H3>Browse by Theme</H3>
              <YStack gap="$2">
                {themes.map((theme) => (
                  <Card
                    key={theme.id}
                    padding="$3"
                    backgroundColor={theme.accentColor}
                    borderRadius="$3"
                  >
                    <XStack alignItems="center" gap="$3">
                      <Text fontSize="$7">{theme.iconEmoji}</Text>
                      <YStack flex={1}>
                        <Text fontWeight="bold" color="white" fontSize="$4">
                          {theme.name}
                        </Text>
                        <Text fontSize="$2" color="rgba(255,255,255,0.8)" numberOfLines={2}>
                          {theme.description}
                        </Text>
                      </YStack>
                      <ChevronRight size={24} color="rgba(255,255,255,0.8)" />
                    </XStack>
                  </Card>
                ))}
              </YStack>
            </YStack>
          </YStack>
        ) : (
          <YStack padding="$3" gap="$4">
            {/* Search */}
            <XStack alignItems="center" gap="$2">
              <Input
                flex={1}
                size="$4"
                placeholder="Search communities..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearch(text);
                }}
              />
              {searching && <Spinner size="small" />}
            </XStack>

            {/* Search Results */}
            {searchQuery.length >= 2 && searchResults.length > 0 && (
              <YStack gap="$2">
                <H4>Search Results</H4>
                {searchResults.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={() => handleJoinCommunity(community)}
                  />
                ))}
              </YStack>
            )}

            {/* My Communities */}
            {myCommunities.length > 0 && !searchQuery && (
              <YStack gap="$2">
                <H3>My Communities</H3>
                {myCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    isMember
                  />
                ))}
              </YStack>
            )}

            {/* Popular Communities */}
            {!searchQuery && (
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <H3>Popular Communities</H3>
                  <TrendingUp size={18} color="$green10" />
                </XStack>
                {popularCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={() => handleJoinCommunity(community)}
                  />
                ))}
              </YStack>
            )}

            {/* Create Community Button */}
            <Button
              size="$5"
              backgroundColor="$blue10"
              icon={<Plus size={20} color="white" />}
              onPress={() => Alert.alert('Coming Soon', 'Community creation will be available soon!')}
            >
              <Text color="white" fontWeight="bold">Create a Community</Text>
            </Button>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

// Community Card Component
function CommunityCard({
  community,
  isMember,
  onJoin,
}: {
  community: Community;
  isMember?: boolean;
  onJoin?: () => void;
}) {
  return (
    <Card padding="$3" backgroundColor="$gray2">
      <XStack alignItems="center" gap="$3">
        <YStack
          width={50}
          height={50}
          borderRadius="$3"
          backgroundColor={community.accentColor}
          justifyContent="center"
          alignItems="center"
        >
          <Text fontSize="$6">{community.iconEmoji}</Text>
        </YStack>
        <YStack flex={1}>
          <XStack alignItems="center" gap="$2">
            <Text fontWeight="bold" fontSize="$4">{community.name}</Text>
            {community.isVerified && <Shield size={14} color="$blue10" />}
          </XStack>
          {community.tagline && (
            <Text fontSize="$2" color="$gray11" numberOfLines={1}>
              {community.tagline}
            </Text>
          )}
          <XStack marginTop="$1" alignItems="center" gap="$3">
            <XStack alignItems="center" gap="$1">
              <Users size={12} color="$gray10" />
              <Text fontSize="$2" color="$gray10">{community.memberCount}</Text>
            </XStack>
            <Text fontSize="$2" color="$gray10">
              {community.communityType}
            </Text>
            {community.privacy !== 'public' && (
              <Text fontSize="$2" color="$yellow10">
                {community.privacy}
              </Text>
            )}
          </XStack>
        </YStack>
        {isMember ? (
          <XStack alignItems="center" gap="$1">
            <Text fontSize="$2" color="$green10">Member</Text>
            {community.userRole && community.userRole > 0 && (
              <Crown size={14} color="$yellow10" />
            )}
          </XStack>
        ) : onJoin ? (
          <Button size="$3" backgroundColor="$blue10" onPress={onJoin}>
            {community.requiresApproval ? 'Request' : 'Join'}
          </Button>
        ) : null}
      </XStack>
    </Card>
  );
}
