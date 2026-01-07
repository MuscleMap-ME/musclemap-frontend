/**
 * EquipmentGrid Component
 *
 * Visual multi-select grid for equipment selection.
 * Shows equipment items in a responsive grid with selection state.
 */
import React from 'react';
import { XStack, YStack, Text, Card } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import type { EquipmentType } from '@musclemap/client';

interface EquipmentGridProps {
  items: EquipmentType[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  columns?: number;
}

export default function EquipmentGrid({
  items,
  selectedIds,
  onToggle,
  columns = 2,
}: EquipmentGridProps) {
  return (
    <XStack flexWrap="wrap" gap="$2">
      {items.map((item) => (
        <EquipmentItem
          key={item.id}
          item={item}
          selected={selectedIds.includes(item.id)}
          onToggle={() => onToggle(item.id)}
          width={`${100 / columns - 2}%`}
        />
      ))}
    </XStack>
  );
}

interface EquipmentItemProps {
  item: EquipmentType;
  selected: boolean;
  onToggle: () => void;
  width: string;
}

function EquipmentItem({ item, selected, onToggle, width }: EquipmentItemProps) {
  return (
    <Card
      bordered
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={onToggle}
      backgroundColor={selected ? '$blue2' : '$background'}
      borderColor={selected ? '$blue8' : '$borderColor'}
      borderWidth={selected ? 2 : 1}
      padding="$3"
      width={width as any}
      minWidth={140}
      flex={1}
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} space="$1">
          <Text fontWeight={selected ? 'bold' : 'normal'} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description && (
            <Text color="$gray10" fontSize="$2" numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </YStack>
        {selected && (
          <YStack
            width={22}
            height={22}
            borderRadius={11}
            backgroundColor="$blue10"
            justifyContent="center"
            alignItems="center"
            marginLeft="$2"
          >
            <Check size={14} color="white" />
          </YStack>
        )}
      </XStack>
    </Card>
  );
}

/**
 * Compact version for use in sheets/dialogs
 */
export function EquipmentChip({
  item,
  selected,
  onToggle,
}: {
  item: EquipmentType;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      bordered
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      onPress={onToggle}
      backgroundColor={selected ? '$blue2' : '$background'}
      borderColor={selected ? '$blue8' : '$borderColor'}
      borderWidth={selected ? 2 : 1}
      paddingHorizontal="$3"
      paddingVertical="$2"
    >
      <XStack alignItems="center" space="$2">
        {selected && <Check size={14} color="$blue10" />}
        <Text fontWeight={selected ? 'bold' : 'normal'}>{item.name}</Text>
      </XStack>
    </Card>
  );
}
