/**
 * Tabs Layout
 *
 * Bottom tab navigation for authenticated users.
 */
import { Tabs } from 'expo-router';
import { Home, Dumbbell, User, Swords, Users } from '@tamagui/lucide-icons';
import { useTheme } from 'tamagui';

export default function TabsLayout() {
  const theme = useTheme();

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
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rivals"
        options={{
          title: 'Rivals',
          tabBarIcon: ({ color, size }) => <Swords color={color} size={size} />,
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
