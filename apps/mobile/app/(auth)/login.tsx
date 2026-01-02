/**
 * Login Screen
 */
import { useState } from 'react';
import { Link, router } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  H1,
  Paragraph,
  Spinner,
} from 'tamagui';
import { apiClient, useAuth } from '@musclemap/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.auth.login(email, password);
      await login(response);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} padding="$4" justifyContent="center" backgroundColor="$background">
      <YStack space="$4" maxWidth={400} width="100%" alignSelf="center">
        <YStack space="$2" alignItems="center">
          <H1>MuscleMap</H1>
          <Paragraph color="$gray11">Sign in to your account</Paragraph>
        </YStack>

        <YStack space="$3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail as any}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword as any}
            secureTextEntry
            autoComplete="password"
          />

          {error && (
            <Text color="$red10" textAlign="center">
              {error}
            </Text>
          )}

          <Button
            onPress={handleLogin}
            disabled={loading}
            theme="active"
            size="$5"
          >
            {loading ? <Spinner color="$color" /> : 'Sign In'}
          </Button>
        </YStack>

        <XStack justifyContent="center" space="$2">
          <Text color="$gray11">Don't have an account?</Text>
          <Link href="/(auth)/signup" asChild>
            <Text color="$blue10" fontWeight="bold">
              Sign Up
            </Text>
          </Link>
        </XStack>
      </YStack>
    </YStack>
  );
}
