/**
 * Welcome Screen
 *
 * First screen of onboarding flow. Introduces the onboarding process
 * and gives users the option to continue or skip.
 */
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  Button,
  H1,
  H3,
  Paragraph,
} from 'tamagui';
import { Dumbbell, Target, Users, Zap } from '@tamagui/lucide-icons';
import { apiClient } from '@musclemap/client';

export default function Welcome() {
  const handleContinue = () => {
    router.push('/(onboarding)/units');
  };

  const handleSkip = async () => {
    try {
      await apiClient.onboarding.skip();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
      // Still navigate to tabs even if skip fails
      router.replace('/(tabs)');
    }
  };

  return (
    <YStack flex={1} padding="$4" justifyContent="space-between" backgroundColor="$background">
      {/* Header Section */}
      <YStack flex={1} justifyContent="center" alignItems="center" space="$6">
        <YStack alignItems="center" space="$3">
          <Dumbbell size={64} color="$blue10" />
          <H1 textAlign="center">Welcome to MuscleMap</H1>
          <Paragraph color="$gray11" textAlign="center" maxWidth={300}>
            Let's set up your profile to personalize your fitness journey
          </Paragraph>
        </YStack>

        {/* Feature highlights */}
        <YStack space="$4" width="100%" maxWidth={350}>
          <FeatureRow
            icon={<Target size={24} color="$blue10" />}
            title="Personalized Workouts"
            description="Recommendations based on your body and goals"
          />
          <FeatureRow
            icon={<Zap size={24} color="$orange10" />}
            title="Track Your Equipment"
            description="Know what gear you have at home or the gym"
          />
          <FeatureRow
            icon={<Users size={24} color="$green10" />}
            title="Community Equipment"
            description="Help others find equipment at local gyms"
          />
        </YStack>
      </YStack>

      {/* Action Buttons */}
      <YStack space="$3" paddingBottom="$4">
        <Button
          onPress={handleContinue}
          theme="active"
          size="$5"
        >
          Get Started
        </Button>
        <Button
          onPress={handleSkip}
          variant="outlined"
          size="$4"
        >
          Skip for now
        </Button>
        <Text color="$gray10" textAlign="center" fontSize="$2">
          You can always update your profile later in Settings
        </Text>
      </YStack>
    </YStack>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <XStack alignItems="center" space="$3">
      <YStack
        width={48}
        height={48}
        borderRadius="$4"
        backgroundColor="$gray3"
        justifyContent="center"
        alignItems="center"
      >
        {icon}
      </YStack>
      <YStack flex={1}>
        <H3 fontSize="$4">{title}</H3>
        <Text color="$gray11" fontSize="$3">{description}</Text>
      </YStack>
    </XStack>
  );
}
