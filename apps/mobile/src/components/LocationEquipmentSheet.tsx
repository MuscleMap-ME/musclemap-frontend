/**
 * LocationEquipmentSheet Component
 *
 * Bottom sheet for reporting equipment at a gym or park.
 * Shows equipment list with crowd-sourced verification status.
 */
import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import {
  Sheet,
  YStack,
  XStack,
  Text,
  Button,
  H3,
  H4,
  Paragraph,
  Spinner,
  Card,
} from 'tamagui';
import {
  Check,
  X,
  MapPin,
  Users,
  CheckCircle2,
  CircleDashed,
} from '@tamagui/lucide-icons';
import {
  apiClient,
  type EquipmentType,
  type LocationEquipment,
} from '@musclemap/client';

interface LocationEquipmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hangoutId: string;
  hangoutName: string;
}

export default function LocationEquipmentSheet({
  open,
  onOpenChange,
  hangoutId,
  hangoutName,
}: LocationEquipmentSheetProps) {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [locationEquipment, setLocationEquipment] = useState<LocationEquipment[]>([]);
  const [myReports, setMyReports] = useState<Map<string, 'present' | 'absent'>>(new Map());
  const [selectedPresent, setSelectedPresent] = useState<Set<string>>(new Set());
  const [selectedAbsent, setSelectedAbsent] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, hangoutId]);

  async function loadData() {
    setLoading(true);
    try {
      const [typesRes, equipmentRes, reportsRes] = await Promise.all([
        apiClient.equipment.types(),
        apiClient.equipment.getLocationEquipment(hangoutId),
        apiClient.equipment.getMyReports(hangoutId),
      ]);

      setEquipmentTypes((typesRes as any).data);
      setLocationEquipment((equipmentRes as any).data);

      // Build map of user's existing reports
      const reportMap = new Map<string, 'present' | 'absent'>();
      for (const report of (reportsRes as any).data) {
        reportMap.set(report.equipmentTypeId, report.reportType);
      }
      setMyReports(reportMap);

      // Pre-select based on existing reports
      const present = new Set<string>();
      const absent = new Set<string>();
      for (const [id, type] of reportMap) {
        if (type === 'present') present.add(id);
        else absent.add(id);
      }
      setSelectedPresent(present);
      setSelectedAbsent(absent);
    } catch (err) {
      console.error('Failed to load equipment data:', err);
    } finally {
      setLoading(false);
    }
  }

  const togglePresent = (id: string) => {
    const newPresent = new Set(selectedPresent);
    const newAbsent = new Set(selectedAbsent);

    if (newPresent.has(id)) {
      newPresent.delete(id);
    } else {
      newPresent.add(id);
      newAbsent.delete(id); // Can't be both
    }

    setSelectedPresent(newPresent);
    setSelectedAbsent(newAbsent);
  };

  const toggleAbsent = (id: string) => {
    const newPresent = new Set(selectedPresent);
    const newAbsent = new Set(selectedAbsent);

    if (newAbsent.has(id)) {
      newAbsent.delete(id);
    } else {
      newAbsent.add(id);
      newPresent.delete(id); // Can't be both
    }

    setSelectedPresent(newPresent);
    setSelectedAbsent(newAbsent);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Submit present reports
      if (selectedPresent.size > 0) {
        await apiClient.equipment.reportEquipment(
          hangoutId,
          Array.from(selectedPresent),
          'present'
        );
      }

      // Submit absent reports
      if (selectedAbsent.size > 0) {
        await apiClient.equipment.reportEquipment(
          hangoutId,
          Array.from(selectedAbsent),
          'absent'
        );
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Failed to submit equipment report:', err);
    } finally {
      setSaving(false);
    }
  };

  // Build equipment status map from location data
  const equipmentStatus = new Map<string, LocationEquipment>();
  for (const eq of locationEquipment) {
    equipmentStatus.set(eq.equipmentTypeId, eq);
  }

  // Group equipment by category
  const categories = equipmentTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, EquipmentType[]>);

  const categoryLabels: Record<string, string> = {
    bars: 'Bars & Racks',
    free_weights: 'Free Weights',
    benches: 'Benches',
    cardio: 'Cardio',
    machines: 'Machines',
    bodyweight: 'Bodyweight',
    outdoor: 'Outdoor',
    specialty: 'Specialty',
  };

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[85]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame>
        <Sheet.Handle />

        {/* Header */}
        <YStack padding="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
          <XStack alignItems="center" space="$2">
            <MapPin size={20} color="$blue10" />
            <H3 numberOfLines={1}>{hangoutName}</H3>
          </XStack>
          <Paragraph color="$gray11">
            Help others by reporting what equipment is available
          </Paragraph>
        </YStack>

        {/* Content */}
        {loading ? (
          <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
            <Spinner size="large" color="$blue10" />
            <Text color="$gray11" paddingTop="$2">Loading equipment...</Text>
          </YStack>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            <YStack space="$4" padding="$4" paddingBottom="$20">
              {Object.entries(categories).map(([category, types]) => (
                <YStack key={category} space="$2">
                  <H4 color="$gray11">{categoryLabels[category] || category}</H4>
                  {types.map((type) => {
                    const status = equipmentStatus.get(type.id);
                    const isPresent = selectedPresent.has(type.id);
                    const isAbsent = selectedAbsent.has(type.id);

                    return (
                      <EquipmentReportRow
                        key={type.id}
                        equipment={type}
                        status={status}
                        isPresent={isPresent}
                        isAbsent={isAbsent}
                        onTogglePresent={() => togglePresent(type.id)}
                        onToggleAbsent={() => toggleAbsent(type.id)}
                      />
                    );
                  })}
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        )}

        {/* Footer */}
        <YStack
          padding="$4"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          backgroundColor="$background"
        >
          <Button
            onPress={handleSubmit}
            theme="active"
            size="$5"
            disabled={saving || (selectedPresent.size === 0 && selectedAbsent.size === 0)}
          >
            {saving ? <Spinner color="$color" /> : 'Submit Report'}
          </Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

function EquipmentReportRow({
  equipment,
  status,
  isPresent,
  isAbsent,
  onTogglePresent,
  onToggleAbsent,
}: {
  equipment: EquipmentType;
  status?: LocationEquipment;
  isPresent: boolean;
  isAbsent: boolean;
  onTogglePresent: () => void;
  onToggleAbsent: () => void;
}) {
  return (
    <Card bordered padding="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1} space="$1">
          <XStack alignItems="center" space="$2">
            <Text fontWeight="bold">{equipment.name}</Text>
            {status?.isVerified && (
              <CheckCircle2 size={14} color="$green10" />
            )}
          </XStack>
          {status && (
            <XStack alignItems="center" space="$1">
              <Users size={12} color="$gray10" />
              <Text fontSize="$2" color="$gray10">
                {status.confirmedCount} confirmed
                {status.deniedCount > 0 && `, ${status.deniedCount} say absent`}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Report buttons */}
        <XStack space="$2">
          <Button
            size="$3"
            circular
            backgroundColor={isPresent ? '$green3' : '$gray3'}
            borderColor={isPresent ? '$green8' : '$borderColor'}
            borderWidth={isPresent ? 2 : 1}
            onPress={onTogglePresent}
          >
            <Check size={16} color={isPresent ? '$green10' : '$gray10'} />
          </Button>
          <Button
            size="$3"
            circular
            backgroundColor={isAbsent ? '$red3' : '$gray3'}
            borderColor={isAbsent ? '$red8' : '$borderColor'}
            borderWidth={isAbsent ? 2 : 1}
            onPress={onToggleAbsent}
          >
            <X size={16} color={isAbsent ? '$red10' : '$gray10'} />
          </Button>
        </XStack>
      </XStack>
    </Card>
  );
}
