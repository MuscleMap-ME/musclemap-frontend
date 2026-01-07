/**
 * HeightInput Component
 *
 * Adapts input format based on unit preference.
 * Metric: single cm input
 * Imperial: ft + in inputs
 */
import React, { useState, useEffect } from 'react';
import { XStack, YStack, Text, Input, Label } from 'tamagui';

type UnitSystem = 'metric' | 'imperial';

interface HeightInputProps {
  units: UnitSystem;
  valueCm: number | null;
  valueFt: number | null;
  valueIn: number | null;
  onChangeCm: (cm: number | null) => void;
  onChangeFtIn: (ft: number | null, inches: number | null) => void;
  label?: string;
}

export default function HeightInput({
  units,
  valueCm,
  valueFt,
  valueIn,
  onChangeCm,
  onChangeFtIn,
  label = 'Height',
}: HeightInputProps) {
  const [localCm, setLocalCm] = useState(valueCm?.toString() || '');
  const [localFt, setLocalFt] = useState(valueFt?.toString() || '');
  const [localIn, setLocalIn] = useState(valueIn?.toString() || '');

  // Sync local state with props
  useEffect(() => {
    setLocalCm(valueCm?.toString() || '');
  }, [valueCm]);

  useEffect(() => {
    setLocalFt(valueFt?.toString() || '');
  }, [valueFt]);

  useEffect(() => {
    setLocalIn(valueIn?.toString() || '');
  }, [valueIn]);

  const handleCmChange = (text: string) => {
    setLocalCm(text);
    const parsed = parseFloat(text);
    onChangeCm(isNaN(parsed) ? null : parsed);
  };

  const handleFtChange = (text: string) => {
    setLocalFt(text);
    const ft = text ? parseInt(text) : null;
    const inches = localIn ? parseFloat(localIn) : null;
    onChangeFtIn(ft, inches);
  };

  const handleInChange = (text: string) => {
    setLocalIn(text);
    const ft = localFt ? parseInt(localFt) : null;
    const inches = text ? parseFloat(text) : null;
    onChangeFtIn(ft, inches);
  };

  if (units === 'metric') {
    return (
      <YStack space="$2">
        {label && <Label>{label}</Label>}
        <XStack alignItems="center" space="$2">
          <Input
            flex={1}
            keyboardType="numeric"
            placeholder="175"
            value={localCm}
            onChangeText={handleCmChange as any}
          />
          <Text color="$gray10" width={30}>cm</Text>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack space="$2">
      {label && <Label>{label}</Label>}
      <XStack alignItems="center" space="$2">
        <Input
          flex={1}
          keyboardType="numeric"
          placeholder="5"
          value={localFt}
          onChangeText={handleFtChange as any}
          maxLength={1}
        />
        <Text color="$gray10" width={20}>ft</Text>
        <Input
          flex={1}
          keyboardType="numeric"
          placeholder="10"
          value={localIn}
          onChangeText={handleInChange as any}
        />
        <Text color="$gray10" width={20}>in</Text>
      </XStack>
    </YStack>
  );
}

/**
 * Read-only display version
 */
export function HeightDisplay({
  units,
  valueCm,
  valueFt,
  valueIn,
}: {
  units: UnitSystem;
  valueCm: number | null;
  valueFt: number | null;
  valueIn: number | null;
}) {
  if (units === 'metric') {
    return <Text>{valueCm ? `${valueCm} cm` : 'Not set'}</Text>;
  }

  if (valueFt || valueIn) {
    return <Text>{`${valueFt || 0}' ${valueIn || 0}"`}</Text>;
  }

  return <Text color="$gray10">Not set</Text>;
}
