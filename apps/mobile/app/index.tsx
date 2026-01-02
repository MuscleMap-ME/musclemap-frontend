/**
 * Home Screen
 *
 * Entry point that redirects to auth or tabs based on authentication state.
 */
import { Redirect } from 'expo-router';
import { useAuth } from '@musclemap/client';
import { YStack, Spinner } from 'tamagui';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" color="$blue10" />
      </YStack>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
