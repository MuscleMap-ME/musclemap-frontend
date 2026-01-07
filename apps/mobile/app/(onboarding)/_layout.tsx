/**
 * Onboarding Layout
 *
 * Stack navigation for onboarding flow with progress indicator.
 * No back button - users must complete or skip onboarding.
 */
import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false, // Prevent swiping back
        contentStyle: {
          backgroundColor: theme.background?.val,
        },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="units" />
      <Stack.Screen name="physical" />
      <Stack.Screen name="home-equipment" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
