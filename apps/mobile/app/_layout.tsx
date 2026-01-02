import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/stores/auth';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth state from secure storage
        await initialize();
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [initialize]);

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0a0a0a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0a0a0a',
          },
        }}
      />
    </SafeAreaProvider>
  );
}
