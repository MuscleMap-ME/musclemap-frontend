/**
 * Achievements Screen
 *
 * Badge collection and achievement tracking:
 * - View earned achievements
 * - See achievement progress
 * - Browse available achievements
 * - Track achievement points
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
  Spinner,
  Progress,
  Separator,
  Tabs,
} from 'tamagui';
import { ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import {
  Award,
  Trophy,
  Star,
  Zap,
  Target,
  Users,
  Flame,
  Crown,
  Lock,
} from '@tamagui/lucide-icons';
import { apiClient } from '@musclemap/client';

// Types
interface AchievementEvent {
  id: string;
  achievementKey: string;
  achievementName: string;
  achievementDescription?: string;
  achievementIcon?: string;
  category: string;
  points: number;
  rarity: string;
  earnedAt: string;
  value?: number;
  hangoutId?: number;
  exerciseId?: string;
}

interface AchievementDefinition {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
  points: number;
  rarity: string;
  enabled: boolean;
}

interface AchievementSummary {
  totalPoints: number;
  totalAchievements: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
  recentAchievements: AchievementEvent[];
}

// Category colors and icons
const CATEGORY_CONFIG: Record<string, { color: string; icon: typeof Award }> = {
  record: { color: '#FFD700', icon: Trophy },
  streak: { color: '#F97316', icon: Flame },
  first_time: { color: '#22C55E', icon: Star },
  top_rank: { color: '#8B5CF6', icon: Crown },
  milestone: { color: '#3B82F6', icon: Target },
  social: { color: '#EC4899', icon: Users },
  special: { color: '#14B8A6', icon: Zap },
};

// Rarity colors
const RARITY_COLORS: Record<string, string> = {
  common: '#6B7280',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

// Rarity labels
const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export default function AchievementsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'earned' | 'available'>('earned');
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [earnedAchievements, setEarnedAchievements] = useState<AchievementEvent[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<AchievementDefinition[]>([]);
  const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summaryResponse, earnedResponse, availableResponse] = await Promise.all([
        apiClient.achievements.summary(),
        apiClient.achievements.my({ limit: 100 }),
        apiClient.achievements.definitions(),
      ]);

      const summaryData = (summaryResponse as any).data;
      const earnedData = (earnedResponse as any).data || [];
      const availableData = (availableResponse as any).data || [];

      setSummary(summaryData);
      setEarnedAchievements(earnedData);
      setAvailableAchievements(availableData);
      setEarnedKeys(new Set(earnedData.map((a: AchievementEvent) => a.achievementKey)));
    } catch (err) {
      console.error('Failed to load achievements:', err);
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

  // Show achievement details in an alert
  const showAchievementDetail = useCallback((achievement: AchievementEvent | AchievementDefinition, isEarned: boolean) => {
    const name = 'achievementName' in achievement ? achievement.achievementName : achievement.name;
    const description = 'achievementDescription' in achievement
      ? achievement.achievementDescription
      : achievement.description;
    const earnedAt = 'earnedAt' in achievement ? achievement.earnedAt : null;
    const categoryLabel = achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1).replace('_', ' ');

    const details = [
      `Category: ${categoryLabel}`,
      `Rarity: ${RARITY_LABELS[achievement.rarity] || achievement.rarity}`,
      `Points: ${achievement.points}`,
    ];

    if (description) {
      details.unshift(description);
    }

    if (isEarned && earnedAt) {
      details.push(`Earned: ${new Date(earnedAt).toLocaleDateString()}`);
    }

    if ('value' in achievement && achievement.value) {
      details.push(`Value: ${achievement.value}`);
    }

    Alert.alert(
      isEarned ? `${name}` : `${name} (Locked)`,
      details.join('\n\n'),
      [{ text: 'OK' }]
    );
  }, []);

  // Filter achievements by category
  const filteredEarned = selectedCategory
    ? earnedAchievements.filter((a) => a.category === selectedCategory)
    : earnedAchievements;

  const filteredAvailable = selectedCategory
    ? availableAchievements.filter((a) => a.category === selectedCategory)
    : availableAchievements;

  // Separate earned and unearned from available
  const unearnedAchievements = filteredAvailable.filter((a) => !earnedKeys.has(a.key));

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$blue10" />
        <Text marginTop="$4" color="$gray11">Loading achievements...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header with Summary */}
      <YStack padding="$4" backgroundColor="$purple10">
        <XStack alignItems="center" gap="$2">
          <Award size={28} color="white" />
          <H2 color="white">Achievements</H2>
        </XStack>

        {summary && (
          <XStack marginTop="$4" gap="$4">
            <YStack alignItems="center" flex={1}>
              <Text fontSize="$8" fontWeight="bold" color="white">
                {summary.totalPoints.toLocaleString()}
              </Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">Total Points</Text>
            </YStack>
            <Separator vertical height={50} borderColor="rgba(255,255,255,0.3)" />
            <YStack alignItems="center" flex={1}>
              <Text fontSize="$8" fontWeight="bold" color="white">
                {summary.totalAchievements}
              </Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">Earned</Text>
            </YStack>
            <Separator vertical height={50} borderColor="rgba(255,255,255,0.3)" />
            <YStack alignItems="center" flex={1}>
              <Text fontSize="$8" fontWeight="bold" color="white">
                {availableAchievements.length}
              </Text>
              <Text fontSize="$2" color="rgba(255,255,255,0.8)">Total</Text>
            </YStack>
          </XStack>
        )}

        {/* Rarity breakdown */}
        {summary && (
          <XStack marginTop="$3" gap="$2" flexWrap="wrap">
            {Object.entries(summary.byRarity).map(([rarity, count]) => (
              count > 0 && (
                <XStack
                  key={rarity}
                  backgroundColor="rgba(255,255,255,0.2)"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                  alignItems="center"
                  gap="$1"
                >
                  <YStack
                    width={8}
                    height={8}
                    borderRadius={4}
                    backgroundColor={RARITY_COLORS[rarity] || '$gray10'}
                  />
                  <Text fontSize="$1" color="white">
                    {count} {RARITY_LABELS[rarity] || rarity}
                  </Text>
                </XStack>
              )
            ))}
          </XStack>
        )}
      </YStack>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
        <XStack padding="$2" gap="$2">
          <Button
            size="$3"
            backgroundColor={selectedCategory === null ? '$blue10' : '$gray4'}
            onPress={() => setSelectedCategory(null)}
          >
            <Text color={selectedCategory === null ? 'white' : '$gray11'}>All</Text>
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const Icon = config.icon;
            return (
              <Button
                key={category}
                size="$3"
                backgroundColor={selectedCategory === category ? config.color : '$gray4'}
                icon={<Icon size={14} color={selectedCategory === category ? 'white' : '$gray11'} />}
                onPress={() => setSelectedCategory(category)}
              >
                <Text color={selectedCategory === category ? 'white' : '$gray11'}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                </Text>
              </Button>
            );
          })}
        </XStack>
      </ScrollView>

      {/* Tabs */}
      <XStack padding="$3" gap="$2">
        <Button
          flex={1}
          size="$4"
          backgroundColor={activeTab === 'earned' ? '$purple10' : '$gray4'}
          onPress={() => setActiveTab('earned')}
        >
          <Text color={activeTab === 'earned' ? 'white' : '$gray11'} fontWeight="bold">
            Earned ({filteredEarned.length})
          </Text>
        </Button>
        <Button
          flex={1}
          size="$4"
          backgroundColor={activeTab === 'available' ? '$purple10' : '$gray4'}
          onPress={() => setActiveTab('available')}
        >
          <Text color={activeTab === 'available' ? 'white' : '$gray11'} fontWeight="bold">
            Available ({unearnedAchievements.length})
          </Text>
        </Button>
      </XStack>

      {/* Achievement List */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack padding="$3" gap="$3">
          {activeTab === 'earned' ? (
            filteredEarned.length === 0 ? (
              <Card padding="$6" backgroundColor="$gray2" alignItems="center">
                <Award size={48} color="$gray8" />
                <Text marginTop="$3" color="$gray11" textAlign="center">
                  No achievements earned yet.{'\n'}Keep working out to unlock badges!
                </Text>
              </Card>
            ) : (
              filteredEarned.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isEarned
                  onPress={() => showAchievementDetail(achievement, true)}
                />
              ))
            )
          ) : (
            unearnedAchievements.length === 0 ? (
              <Card padding="$6" backgroundColor="$gray2" alignItems="center">
                <Trophy size={48} color="$yellow10" />
                <Text marginTop="$3" color="$gray11" textAlign="center">
                  You've earned all available achievements in this category!
                </Text>
              </Card>
            ) : (
              unearnedAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isEarned={false}
                  onPress={() => showAchievementDetail(achievement, false)}
                />
              ))
            )
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

// Achievement Card Component
function AchievementCard({
  achievement,
  isEarned,
  onPress,
}: {
  achievement: AchievementEvent | AchievementDefinition;
  isEarned: boolean;
  onPress?: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.special;
  const Icon = categoryConfig.icon;
  const rarityColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;

  // Get the right fields depending on type
  const name = 'achievementName' in achievement ? achievement.achievementName : achievement.name;
  const description = 'achievementDescription' in achievement
    ? achievement.achievementDescription
    : achievement.description;
  const earnedAt = 'earnedAt' in achievement ? achievement.earnedAt : null;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card
        padding="$3"
        backgroundColor={isEarned ? '$gray2' : '$gray1'}
        borderWidth={2}
        borderColor={isEarned ? rarityColor : '$gray4'}
        opacity={isEarned ? 1 : 0.7}
      >
      <XStack alignItems="center" gap="$3">
        {/* Icon */}
        <YStack
          width={56}
          height={56}
          borderRadius="$4"
          backgroundColor={isEarned ? categoryConfig.color : '$gray6'}
          justifyContent="center"
          alignItems="center"
        >
          {isEarned ? (
            <Icon size={28} color="white" />
          ) : (
            <Lock size={24} color="$gray10" />
          )}
        </YStack>

        {/* Info */}
        <YStack flex={1}>
          <XStack alignItems="center" gap="$2">
            <Text fontWeight="bold" fontSize="$4" color={isEarned ? '$gray12' : '$gray10'}>
              {name}
            </Text>
            <XStack
              backgroundColor={rarityColor}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              <Text fontSize="$1" color="white" fontWeight="bold">
                {RARITY_LABELS[achievement.rarity] || achievement.rarity}
              </Text>
            </XStack>
          </XStack>

          {description && (
            <Text fontSize="$2" color="$gray11" marginTop="$1" numberOfLines={2}>
              {description}
            </Text>
          )}

          <XStack marginTop="$2" alignItems="center" gap="$3">
            <XStack alignItems="center" gap="$1">
              <Star size={12} color="$yellow10" />
              <Text fontSize="$2" color="$yellow10" fontWeight="bold">
                {achievement.points} pts
              </Text>
            </XStack>

            {isEarned && earnedAt && (
              <Text fontSize="$2" color="$gray10">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </Text>
            )}

            {'value' in achievement && achievement.value && (
              <Text fontSize="$2" color="$gray10">
                Value: {achievement.value}
              </Text>
            )}
          </XStack>
        </YStack>

        {/* Check mark for earned */}
        {isEarned && (
          <YStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor="$green10"
            justifyContent="center"
            alignItems="center"
          >
            <Text color="white" fontWeight="bold">✓</Text>
          </YStack>
        )}
      </XStack>
      </Card>
    </Pressable>
  );
}
