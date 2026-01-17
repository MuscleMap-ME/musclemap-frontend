/**
 * Home Screen
 *
 * Entry point that redirects based on authentication and onboarding state.
 * Flow: Auth check -> Onboarding check -> Main app
 */
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth, apiClient } from '@musclemap/client';
import { YStack, Spinner, Text } from 'tamagui';

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  // Check onboarding status after authentication
  useEffect(() => {
    async function checkOnboarding() {
      if (!isAuthenticated) return;

      setCheckingOnboarding(true);
      try {
        const result = await apiClient.onboarding.status();
        setOnboardingComplete((result as any).data.completed);
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
        // On error, assume onboarding is complete to avoid blocking users
        setOnboardingComplete(true);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    if (isAuthenticated) {
      checkOnboarding();
    }
  }, [isAuthenticated]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$blue10" />
      </YStack>
    );
  }

  // Not authenticated - go to login
  if (!isAuthenticated) {
    return <Redirect href={'/(auth)/login' as any} />;
  }

  // Show loading while checking onboarding status
  if (checkingOnboarding || onboardingComplete === null) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$blue10" />
        <Text color="$gray11" paddingTop="$2">Setting up...</Text>
      </YStack>
    );
  }

  // Authenticated but needs onboarding
  if (!onboardingComplete) {
    return <Redirect href={'/(onboarding)/welcome' as any} />;
  }

  // Authenticated and onboarding complete - go to main app
  return <Redirect href={'/(tabs)' as any} />;
}
