/**
 * Root Layout
 *
 * Sets up all providers and initializations:
 * - TamaguiProvider for styling
 * - ApolloProvider for GraphQL
 * - Network listener for offline support
 * - Auth initialization
 * - Font loading
 */
import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ApolloProvider } from '@apollo/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  setStorageAdapter,
  configureHttpClient,
  useAuth,
} from '@musclemap/client';
import { nativeStorage } from '@/storage/native';
import { initializeApollo, getApolloClient } from '@/lib/apollo';
import { initializeNetworkListener, useOfflineStatus } from '@/stores';
import { ToastContainer } from '@/components/ToastContainer';
import tamaguiConfig from '../tamagui.config';

import type { ApolloClient, NormalizedCacheObject } from '@apollo/client';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize storage adapter (must happen before any store access)
setStorageAdapter(nativeStorage);

// Configure HTTP client for REST endpoints
configureHttpClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://musclemap.me',
});

export default function RootLayout() {
  const [apolloClient, setApolloClient] = useState<ApolloClient<NormalizedCacheObject> | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);
  const { isLoading: authLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  // Initialize Apollo Client and network listener
  useEffect(() => {
    let networkUnsubscribe: (() => void) | undefined;

    async function initialize() {
      try {
        // Initialize Apollo Client with cache persistence
        const client = await initializeApollo();
        setApolloClient(client);

        // Initialize network listener for offline support
        networkUnsubscribe = initializeNetworkListener();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    }

    initialize();

    return () => {
      networkUnsubscribe?.();
    };
  }, []);

  // Check if app is ready to render
  useEffect(() => {
    if (fontsLoaded && !authLoading && apolloClient) {
      setAppIsReady(true);
    }
  }, [fontsLoaded, authLoading, apolloClient]);

  // Hide splash screen when ready
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Show nothing while loading
  if (!appIsReady || !apolloClient) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <ApolloProvider client={apolloClient}>
        <TamaguiProvider config={tamaguiConfig}>
          <AppContent />
        </TamaguiProvider>
      </ApolloProvider>
    </GestureHandlerRootView>
  );
}

/**
 * App Content
 *
 * Separated to access stores within providers.
 */
function AppContent() {
  const { isOffline } = useOfflineStatus();

  return (
    <View style={styles.container}>
      {/* Offline indicator */}
      {isOffline && <OfflineBanner />}

      {/* Navigation stack */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: styles.content,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* Global toast notifications */}
      <ToastContainer />

      {/* Status bar */}
      <StatusBar style="light" />
    </View>
  );
}

/**
 * Offline Banner
 *
 * Shows when the device is offline.
 */
function OfflineBanner() {
  return (
    <View style={styles.offlineBanner}>
      <View style={styles.offlineDot} />
      <View style={styles.offlineTextContainer}>
        {/* Using View + nested text for Tamagui compatibility */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    backgroundColor: '#0a0a0f',
  },
  offlineBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  offlineTextContainer: {
    // Text would go here
  },
});
