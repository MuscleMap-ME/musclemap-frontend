/**
 * Privacy Settings Screen
 *
 * Allows users to control their privacy preferences and enable minimalist mode.
 * Users can opt out of community features and data collection entirely.
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
  Switch,
  Separator,
  Spinner,
  ScrollView,
} from 'tamagui';
import {
  Shield,
  Eye,
  EyeOff,
  Users,
  Swords,
  MessageCircle,
  Trophy,
  MapPin,
  Bell,
  BarChart3,
  Target,
  Lightbulb,
  Activity,
  Lock,
  Unlock,
} from '@tamagui/lucide-icons';
import { apiClient, type PrivacySettings, type PrivacySummary } from '@musclemap/client';
import { Alert } from 'react-native';

export default function PrivacyScreen() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [summary, setSummary] = useState<PrivacySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, summaryRes] = await Promise.all([
        apiClient.privacy.get(),
        apiClient.privacy.summary(),
      ]);
      setSettings((settingsRes as any).data);
      setSummary((summaryRes as any).data);
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    if (!settings) return;

    setUpdating(key);
    try {
      const result = await apiClient.privacy.update({ [key]: value });
      setSettings((result as any).data);
      // Refresh summary
      const summaryRes = await apiClient.privacy.summary();
      setSummary((summaryRes as any).data);
    } catch (err) {
      console.error('Failed to update setting:', err);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const enableMinimalistMode = async () => {
    Alert.alert(
      'Enable Minimalist Mode',
      'This will disable all community features and exclude your data from all comparisons and public features. You can always re-enable features later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          style: 'destructive',
          onPress: async () => {
            setUpdating('minimalistMode');
            try {
              await apiClient.privacy.enableMinimalist();
              await loadData();
            } catch (err) {
              console.error('Failed to enable minimalist mode:', err);
              Alert.alert('Error', 'Failed to enable minimalist mode.');
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const disableMinimalistMode = async () => {
    Alert.alert(
      'Disable Minimalist Mode',
      'This will restore all features to their default settings. Your data will again be visible in community features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          onPress: async () => {
            setUpdating('minimalistMode');
            try {
              await apiClient.privacy.disableMinimalist();
              await loadData();
            } catch (err) {
              console.error('Failed to disable minimalist mode:', err);
              Alert.alert('Error', 'Failed to disable minimalist mode.');
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$blue10" />
        <Text marginTop="$4" color="$gray11">Loading privacy settings...</Text>
      </YStack>
    );
  }

  const isMinimalist = settings?.minimalistMode ?? false;

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" space="$4">
        {/* Header Card */}
        <Card padding="$4" elevate backgroundColor={isMinimalist ? '$green2' : '$gray2'}>
          <YStack space="$3">
            <XStack alignItems="center" space="$3">
              <Shield size={32} color={isMinimalist ? '$green10' : '$blue10'} />
              <YStack flex={1}>
                <H2>Privacy Mode</H2>
                <Text color="$gray11" fontSize="$3">
                  {isMinimalist ? 'Minimalist mode is active' : 'Standard mode'}
                </Text>
              </YStack>
            </XStack>

            {summary && (
              <Text color="$gray11" fontSize="$2">
                {summary.summary}
              </Text>
            )}

            <Button
              size="$4"
              theme={isMinimalist ? 'green' : 'blue'}
              icon={isMinimalist ? <Unlock size={20} /> : <Lock size={20} />}
              onPress={isMinimalist ? disableMinimalistMode : enableMinimalistMode}
              disabled={updating === 'minimalistMode'}
            >
              {updating === 'minimalistMode' ? (
                <Spinner size="small" />
              ) : isMinimalist ? (
                'Restore Standard Mode'
              ) : (
                'Enable Minimalist Mode'
              )}
            </Button>

            {!isMinimalist && (
              <Text fontSize="$1" color="$gray10" textAlign="center">
                One click to disable all community features
              </Text>
            )}
          </YStack>
        </Card>

        {/* Data Privacy Summary */}
        {summary && (
          <Card padding="$4" elevate>
            <YStack space="$3">
              <H3>Your Data Privacy</H3>
              <Separator />

              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">Excluded from comparisons</Text>
                {summary.dataPrivacy.excludedFromComparisons ? (
                  <EyeOff size={20} color="$green10" />
                ) : (
                  <Eye size={20} color="$gray10" />
                )}
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">Hidden from activity feed</Text>
                {summary.dataPrivacy.excludedFromActivityFeed ? (
                  <EyeOff size={20} color="$green10" />
                ) : (
                  <Eye size={20} color="$gray10" />
                )}
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">Location hidden</Text>
                {summary.dataPrivacy.locationHidden ? (
                  <EyeOff size={20} color="$green10" />
                ) : (
                  <Eye size={20} color="$gray10" />
                )}
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">Presence hidden</Text>
                {summary.dataPrivacy.presenceHidden ? (
                  <EyeOff size={20} color="$green10" />
                ) : (
                  <Eye size={20} color="$gray10" />
                )}
              </XStack>

              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$gray11">Profile private</Text>
                {summary.dataPrivacy.profilePrivate ? (
                  <EyeOff size={20} color="$green10" />
                ) : (
                  <Eye size={20} color="$gray10" />
                )}
              </XStack>
            </YStack>
          </Card>
        )}

        {/* Community Features */}
        <Card padding="$4" elevate opacity={isMinimalist ? 0.6 : 1}>
          <YStack space="$3">
            <H3>Community Features</H3>
            <Text color="$gray11" fontSize="$2">
              {isMinimalist
                ? 'All community features are disabled in minimalist mode'
                : 'Toggle individual community features'}
            </Text>
            <Separator />

            <SettingRow
              icon={<Trophy size={20} color="$yellow10" />}
              label="Leaderboards"
              description="Appear in public rankings"
              value={!settings?.optOutLeaderboards}
              disabled={isMinimalist || updating === 'optOutLeaderboards'}
              onToggle={(v) => updateSetting('optOutLeaderboards', !v)}
            />

            <SettingRow
              icon={<Activity size={20} color="$blue10" />}
              label="Community Feed"
              description="Your activity visible in feed"
              value={!settings?.optOutCommunityFeed}
              disabled={isMinimalist || updating === 'optOutCommunityFeed'}
              onToggle={(v) => updateSetting('optOutCommunityFeed', !v)}
            />

            <SettingRow
              icon={<Users size={20} color="$purple10" />}
              label="Crews"
              description="Join and participate in crews"
              value={!settings?.optOutCrews}
              disabled={isMinimalist || updating === 'optOutCrews'}
              onToggle={(v) => updateSetting('optOutCrews', !v)}
            />

            <SettingRow
              icon={<Swords size={20} color="$red10" />}
              label="Rivals"
              description="Challenge and compete with others"
              value={!settings?.optOutRivals}
              disabled={isMinimalist || updating === 'optOutRivals'}
              onToggle={(v) => updateSetting('optOutRivals', !v)}
            />

            <SettingRow
              icon={<MapPin size={20} color="$green10" />}
              label="Hangouts"
              description="Location-based community hubs"
              value={!settings?.optOutHangouts}
              disabled={isMinimalist || updating === 'optOutHangouts'}
              onToggle={(v) => updateSetting('optOutHangouts', !v)}
            />

            <SettingRow
              icon={<MessageCircle size={20} color="$cyan10" />}
              label="Messaging"
              description="Direct and group messages"
              value={!settings?.optOutMessaging}
              disabled={isMinimalist || updating === 'optOutMessaging'}
              onToggle={(v) => updateSetting('optOutMessaging', !v)}
            />
          </YStack>
        </Card>

        {/* UI Preferences */}
        <Card padding="$4" elevate>
          <YStack space="$3">
            <H3>UI Preferences</H3>
            <Text color="$gray11" fontSize="$2">
              Customize your experience
            </Text>
            <Separator />

            <SettingRow
              icon={<Target size={20} color="$orange10" />}
              label="Gamification"
              description="XP, levels, and RPG elements"
              value={!settings?.hideGamification}
              disabled={updating === 'hideGamification'}
              onToggle={(v) => updateSetting('hideGamification', !v)}
            />

            <SettingRow
              icon={<Trophy size={20} color="$yellow10" />}
              label="Achievements"
              description="Badges and milestones"
              value={!settings?.hideAchievements}
              disabled={updating === 'hideAchievements'}
              onToggle={(v) => updateSetting('hideAchievements', !v)}
            />

            <SettingRow
              icon={<Lightbulb size={20} color="$yellow10" />}
              label="Tips & Insights"
              description="Contextual guidance"
              value={!settings?.hideTips}
              disabled={updating === 'hideTips'}
              onToggle={(v) => updateSetting('hideTips', !v)}
            />

            <SettingRow
              icon={<Bell size={20} color="$blue10" />}
              label="Social Notifications"
              description="Alerts about social activity"
              value={!settings?.hideSocialNotifications}
              disabled={updating === 'hideSocialNotifications'}
              onToggle={(v) => updateSetting('hideSocialNotifications', !v)}
            />

            <SettingRow
              icon={<BarChart3 size={20} color="$purple10" />}
              label="Progress Comparisons"
              description="Compare with other users"
              value={!settings?.hideProgressComparisons}
              disabled={updating === 'hideProgressComparisons'}
              onToggle={(v) => updateSetting('hideProgressComparisons', !v)}
            />
          </YStack>
        </Card>

        {/* Data Collection */}
        <Card padding="$4" elevate>
          <YStack space="$3">
            <H3>Data & Tracking</H3>
            <Text color="$gray11" fontSize="$2">
              Control how your data is used
            </Text>
            <Separator />

            <SettingRow
              icon={<BarChart3 size={20} color="$gray10" />}
              label="Stats Comparison"
              description="Include in aggregated stats"
              value={!settings?.excludeFromStatsComparison}
              disabled={isMinimalist || updating === 'excludeFromStatsComparison'}
              onToggle={(v) => updateSetting('excludeFromStatsComparison', !v)}
            />

            <SettingRow
              icon={<MapPin size={20} color="$gray10" />}
              label="Location Features"
              description="Geographic data collection"
              value={!settings?.excludeFromLocationFeatures}
              disabled={isMinimalist || updating === 'excludeFromLocationFeatures'}
              onToggle={(v) => updateSetting('excludeFromLocationFeatures', !v)}
            />

            <SettingRow
              icon={<Activity size={20} color="$gray10" />}
              label="Presence Tracking"
              description="Online status visibility"
              value={!settings?.disablePresenceTracking}
              disabled={isMinimalist || updating === 'disablePresenceTracking'}
              onToggle={(v) => updateSetting('disablePresenceTracking', !v)}
            />

            <SettingRow
              icon={<Eye size={20} color="$gray10" />}
              label="Workout Sharing"
              description="Allow workouts to be public"
              value={!settings?.disableWorkoutSharing}
              disabled={updating === 'disableWorkoutSharing'}
              onToggle={(v) => updateSetting('disableWorkoutSharing', !v)}
            />
          </YStack>
        </Card>

        <Text color="$gray10" fontSize="$1" textAlign="center" marginTop="$2" marginBottom="$6">
          Changes are saved automatically. Your personal workout data is always private unless you explicitly share it.
        </Text>
      </YStack>
    </ScrollView>
  );
}

// Helper component for setting rows
function SettingRow({
  icon,
  label,
  description,
  value,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <XStack justifyContent="space-between" alignItems="center" opacity={disabled ? 0.5 : 1}>
      <XStack space="$3" alignItems="center" flex={1}>
        {icon}
        <YStack flex={1}>
          <Text fontWeight="500">{label}</Text>
          <Text color="$gray11" fontSize="$1">{description}</Text>
        </YStack>
      </XStack>
      <Switch
        checked={value}
        onCheckedChange={onToggle}
        disabled={disabled}
      >
        <Switch.Thumb animation="quick" />
      </Switch>
    </XStack>
  );
}
