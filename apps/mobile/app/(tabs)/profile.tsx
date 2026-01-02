/**
 * Profile Screen
 *
 * User settings and account management.
 */
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
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
  Switch,
  Spinner,
} from 'tamagui';
import { ScrollView } from 'react-native';
import { LogOut, Bell, Moon, Shield } from '@tamagui/lucide-icons';
import { useAuth, apiClient, type Settings, type Profile } from '@musclemap/client';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, settingsData] = await Promise.all([
          apiClient.profile.get(),
          apiClient.settings.fetch(),
        ]);
        setProfile(profileData);
        setSettings(settingsData.settings || null);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const toggleSetting = async (key: keyof Settings, value: boolean) => {
    try {
      const updated = await apiClient.settings.update({ [key]: value });
      setSettings((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error('Failed to update setting:', err);
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
    <ScrollView style={{ flex: 1 }}>
      <YStack flex={1} padding="$4" space="$4">
        <Card padding="$4" elevate>
          <YStack space="$3" alignItems="center">
            <Avatar circular size="$10">
              <Avatar.Image
                source={{
                  uri: profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`,
                }}
              />
              <Avatar.Fallback backgroundColor="$blue5">
                <Text fontSize="$6" color="$blue10">
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <YStack alignItems="center">
              <H2>{profile?.username || user?.username || 'User'}</H2>
              <Text color="$gray11">{user?.email}</Text>
              {user?.archetype && (
                <Text color="$blue10" fontSize="$3" marginTop="$1">
                  {user.archetype}
                </Text>
              )}
            </YStack>
            {profile?.bio && (
              <Text color="$gray11" textAlign="center">
                {profile.bio}
              </Text>
            )}
          </YStack>
        </Card>

        <Card padding="$4" elevate>
          <YStack space="$3">
            <H3>Settings</H3>
            <Separator />

            <XStack justifyContent="space-between" alignItems="center">
              <XStack space="$3" alignItems="center">
                <Bell size={20} color="$gray11" />
                <Text>Email Notifications</Text>
              </XStack>
              <Switch
                checked={settings?.email_notifications ?? false}
                onCheckedChange={(checked) =>
                  toggleSetting('email_notifications', checked)
                }
              >
                <Switch.Thumb animation="quick" />
              </Switch>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <XStack space="$3" alignItems="center">
                <Bell size={20} color="$gray11" />
                <Text>SMS Notifications</Text>
              </XStack>
              <Switch
                checked={settings?.sms_notifications ?? false}
                onCheckedChange={(checked) =>
                  toggleSetting('sms_notifications', checked)
                }
              >
                <Switch.Thumb animation="quick" />
              </Switch>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <XStack space="$3" alignItems="center">
                <Moon size={20} color="$gray11" />
                <Text>Theme</Text>
              </XStack>
              <Text color="$gray11">{settings?.theme || 'System'}</Text>
            </XStack>
          </YStack>
        </Card>

        <Card padding="$4" elevate>
          <YStack space="$3">
            <H3>Account</H3>
            <Separator />

            <XStack space="$3" alignItems="center">
              <Shield size={20} color="$gray11" />
              <Text>Account ID: {String(user?.id).slice(0, 8)}...</Text>
            </XStack>
          </YStack>
        </Card>

        <Button
          size="$5"
          theme="red"
          icon={<LogOut size={20} />}
          onPress={handleLogout}
        >
          Sign Out
        </Button>
      </YStack>
    </ScrollView>
  );
}
