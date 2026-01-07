/**
 * Tabs Layout
 *
 * Bottom tab navigation for authenticated users.
 * Respects user privacy settings - hides community tabs in minimalist mode.
 */
import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, Dumbbell, User, Swords, Users, BarChart3, Shield, MessageCircle, Trophy, Award } from '@tamagui/lucide-icons';
import { useTheme } from 'tamagui';
import { apiClient, type PrivacySettings } from '@musclemap/client';

export default function TabsLayout() {
  const theme = useTheme();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);

  // Load privacy settings on mount
  useEffect(() => {
    async function loadPrivacySettings() {
      try {
        const result = await apiClient.privacy.get();
        setPrivacySettings((result as any).data);
      } catch (err) {
        // If settings fail to load, show all tabs by default
        console.warn('Failed to load privacy settings:', err);
      }
    }
    loadPrivacySettings();
  }, []);

  // Determine which tabs to show based on privacy settings
  const isMinimalist = privacySettings?.minimalistMode ?? false;
  const hideCrews = isMinimalist || privacySettings?.optOutCrews;
  const hideRivals = isMinimalist || privacySettings?.optOutRivals;
  const hideLeaderboards = isMinimalist || privacySettings?.optOutLeaderboards;
  const hideHangouts = isMinimalist || privacySettings?.optOutHangouts;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.blue10?.val,
        tabBarInactiveTintColor: theme.gray10?.val,
        tabBarStyle: {
          backgroundColor: theme.background?.val,
          borderTopColor: theme.borderColor?.val,
        },
        headerStyle: {
          backgroundColor: theme.background?.val,
        },
        headerTintColor: theme.color?.val,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="crews"
        options={{
          title: 'Crews',
          href: hideCrews ? null : undefined, // Hide when opted out
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rivals"
        options={{
          title: 'Rivals',
          href: hideRivals ? null : undefined, // Hide when opted out
          tabBarIcon: ({ color, size }) => <Swords color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          href: hideHangouts ? null : undefined, // Hide when opted out
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          // Stats tab shows personal stats regardless of leaderboard opt-out
          // but hides the leaderboard section within the screen
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: 'Leaderboards',
          href: hideLeaderboards ? null : undefined, // Hide when opted out
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ color, size }) => <Award color={color} size={size} />,
        }}
      />
      {/* Privacy settings - always accessible */}
      <Tabs.Screen
        name="privacy"
        options={{
          title: 'Privacy',
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      {/* Hidden screens - accessible via navigation but not in tab bar */}
      <Tabs.Screen
        name="muscles"
        options={{
          href: null, // Hide from tab bar
          title: 'Muscles',
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          href: null, // Hide from tab bar
          title: 'Health',
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          href: null, // Hide from tab bar
          title: 'Journey',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
