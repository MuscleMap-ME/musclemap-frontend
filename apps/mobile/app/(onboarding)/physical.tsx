/**
 * Physical Profile Screen
 *
 * Collects height, weight, date of birth, and gender.
 * Adapts input format based on unit preference.
 */
import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, Platform } from 'react-native';

// @ts-ignore - DateTimePicker types may not be available
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  YStack,
  XStack,
  Text,
  Button,
  H2,
  Paragraph,
  Input,
  Label,
  Card,
} from 'tamagui';
import { Check, Calendar } from '@tamagui/lucide-icons';
import { useOnboardingStore } from '../../src/stores/onboarding';

type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function Physical() {
  const {
    preferredUnits,
    gender,
    dateOfBirth,
    heightCm,
    heightFt,
    heightIn,
    weightKg,
    weightLbs,
    setGender,
    setDateOfBirth,
    setHeightMetric,
    setHeightImperial,
    setWeightMetric,
    setWeightImperial,
  } = useOnboardingStore();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const isMetric = preferredUnits === 'metric';

  // Local input states for controlled inputs
  const [localHeightCm, setLocalHeightCm] = useState(heightCm?.toString() || '');
  const [localHeightFt, setLocalHeightFt] = useState(heightFt?.toString() || '');
  const [localHeightIn, setLocalHeightIn] = useState(heightIn?.toString() || '');
  const [localWeightKg, setLocalWeightKg] = useState(weightKg?.toString() || '');
  const [localWeightLbs, setLocalWeightLbs] = useState(weightLbs?.toString() || '');

  const handleContinue = () => {
    // Save height
    if (isMetric && localHeightCm) {
      setHeightMetric(parseFloat(localHeightCm));
    } else if (!isMetric && (localHeightFt || localHeightIn)) {
      setHeightImperial(
        localHeightFt ? parseInt(localHeightFt) : null,
        localHeightIn ? parseFloat(localHeightIn) : null
      );
    }

    // Save weight
    if (isMetric && localWeightKg) {
      setWeightMetric(parseFloat(localWeightKg));
    } else if (!isMetric && localWeightLbs) {
      setWeightImperial(parseFloat(localWeightLbs));
    }

    router.push('/(onboarding)/home-equipment' as any);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate.toISOString().split('T')[0]);
    }
  };

  const parsedDOB = dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13); // Minimum 13 years old

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'var(--background)' }}>
      <YStack flex={1} padding="$4" backgroundColor="$background">
        {/* Progress indicator */}
        <XStack justifyContent="center" paddingTop="$4" paddingBottom="$2">
          <XStack space="$2">
            <ProgressDot active />
            <ProgressDot active />
            <ProgressDot />
            <ProgressDot />
          </XStack>
        </XStack>

        {/* Header */}
        <YStack alignItems="center" space="$2" paddingVertical="$4">
          <H2 textAlign="center">Your Physical Profile</H2>
          <Paragraph color="$gray11" textAlign="center">
            This helps personalize workout recommendations
          </Paragraph>
        </YStack>

        {/* Form fields */}
        <YStack space="$6" paddingBottom="$4">
          {/* Gender */}
          <YStack space="$2">
            <Label>Gender (optional)</Label>
            <XStack flexWrap="wrap" gap="$2">
              {genderOptions.map((option) => (
                <GenderChip
                  key={option.value}
                  label={option.label}
                  selected={gender === option.value}
                  onPress={() => setGender(option.value)}
                />
              ))}
            </XStack>
          </YStack>

          {/* Date of Birth */}
          <YStack space="$2">
            <Label>Date of Birth (optional)</Label>
            <Button
              onPress={() => setShowDatePicker(true)}
              variant="outlined"
              justifyContent="flex-start"
              icon={<Calendar size={18} color="$gray10" />}
            >
              {dateOfBirth || 'Select date'}
            </Button>
            {showDatePicker && (
              <DateTimePicker
                value={parsedDOB}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={maxDate}
                minimumDate={new Date(1920, 0, 1)}
              />
            )}
          </YStack>

          {/* Height */}
          <YStack space="$2">
            <Label>Height (optional)</Label>
            {isMetric ? (
              <XStack alignItems="center" space="$2">
                <Input
                  flex={1}
                  keyboardType="numeric"
                  placeholder="175"
                  value={localHeightCm}
                  onChangeText={setLocalHeightCm as any}
                />
                <Text color="$gray10">cm</Text>
              </XStack>
            ) : (
              <XStack alignItems="center" space="$2">
                <Input
                  flex={1}
                  keyboardType="numeric"
                  placeholder="5"
                  value={localHeightFt}
                  onChangeText={setLocalHeightFt as any}
                />
                <Text color="$gray10">ft</Text>
                <Input
                  flex={1}
                  keyboardType="numeric"
                  placeholder="10"
                  value={localHeightIn}
                  onChangeText={setLocalHeightIn as any}
                />
                <Text color="$gray10">in</Text>
              </XStack>
            )}
          </YStack>

          {/* Weight */}
          <YStack space="$2">
            <Label>Weight (optional)</Label>
            <XStack alignItems="center" space="$2">
              <Input
                flex={1}
                keyboardType="numeric"
                placeholder={isMetric ? '70' : '154'}
                value={isMetric ? localWeightKg : localWeightLbs}
                onChangeText={(isMetric ? setLocalWeightKg : setLocalWeightLbs) as any}
              />
              <Text color="$gray10">{isMetric ? 'kg' : 'lbs'}</Text>
            </XStack>
          </YStack>
        </YStack>

        {/* Continue button */}
        <YStack paddingBottom="$4" paddingTop="$4">
          <Button
            onPress={handleContinue}
            theme="active"
            size="$5"
          >
            Continue
          </Button>
          <Text color="$gray10" textAlign="center" paddingTop="$2" fontSize="$2">
            All fields are optional and can be updated later
          </Text>
        </YStack>
      </YStack>
    </ScrollView>
  );
}

function GenderChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      bordered
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={onPress}
      backgroundColor={selected ? '$blue2' : '$background'}
      borderColor={selected ? '$blue8' : '$borderColor'}
      borderWidth={selected ? 2 : 1}
      paddingHorizontal="$3"
      paddingVertical="$2"
    >
      <XStack alignItems="center" space="$2">
        {selected && <Check size={14} color="$blue10" />}
        <Text fontWeight={selected ? 'bold' : 'normal'}>{label}</Text>
      </XStack>
    </Card>
  );
}

function ProgressDot({ active = false }: { active?: boolean }) {
  return (
    <YStack
      width={8}
      height={8}
      borderRadius={4}
      backgroundColor={active ? '$blue10' : '$gray6'}
    />
  );
}
