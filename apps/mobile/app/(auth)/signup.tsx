/**
 * Signup Screen
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

export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !username) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.auth.register({ email, password, username });
      await login(response);
      // New users go to onboarding first
      router.replace('/(onboarding)/welcome' as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack flex={1} padding="$4" justifyContent="center" backgroundColor="$background">
      <YStack space="$4" maxWidth={400} width="100%" alignSelf="center">
        <YStack space="$2" alignItems="center">
          <H1>MuscleMap</H1>
          <Paragraph color="$gray11">Create your account</Paragraph>
        </YStack>

        {/* Note: onChangeText uses `as any` due to Tamagui type bug */}
        <YStack space="$3">
          <Input
            placeholder="Username"
            value={username}
            onChangeText={setUsername as any}
            autoCapitalize="none"
            autoComplete="username"
          />

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail as any}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword as any}
            secureTextEntry
            autoComplete="new-password"
          />

          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword as any}
            secureTextEntry
            autoComplete="new-password"
          />

          {error && (
            <Text color="$red10" textAlign="center">
              {error}
            </Text>
          )}

          <Button
            onPress={handleSignup}
            disabled={loading}
            theme="active"
            size="$5"
          >
            {loading ? <Spinner color="$color" /> : 'Create Account'}
          </Button>
        </YStack>

        <XStack justifyContent="center" space="$2">
          <Text color="$gray11">Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <Text color="$blue10" fontWeight="bold">
              Sign In
            </Text>
          </Link>
        </XStack>
      </YStack>
    </YStack>
  );
}
