/**
 * Root Layout
 *
 * Sets up Tamagui provider, navigation, and storage adapter initialization.
 */
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  setStorageAdapter,
  configureHttpClient,
  useAuth,
} from '@musclemap/client';
import { nativeStorage } from '@/storage/native';
import tamaguiConfig from '../tamagui.config';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize storage adapter
setStorageAdapter(nativeStorage);

// Configure HTTP client
configureHttpClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.musclemap.me',
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { isLoading: authLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for fonts and auth to load
        if (fontsLoaded && !authLoading) {
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn(e);
      }
    }

    prepare();
  }, [fontsLoaded, authLoading]);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </TamaguiProvider>
  );
}
