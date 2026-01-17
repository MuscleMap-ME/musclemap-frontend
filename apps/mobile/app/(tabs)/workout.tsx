/**
 * Workout Screen
 *
 * Exercise logging and workout tracking with real API integration.
 */
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  H2,
  H3,
  Button,
  Paragraph,
  Spinner,
  Input,
  Sheet,
} from 'tamagui';
import { ScrollView, Alert } from 'react-native';
import { Play, Pause, RotateCcw, Plus, Search, Trash2, Check } from '@tamagui/lucide-icons';
import {
  apiClient,
  type Exercise,
  type WorkoutExercise,
  type MuscleActivation as APIMuscleActivation,
} from '@musclemap/client';
import { ExerciseIllustration } from '../../src/components/ExerciseIllustration';
import { hasExerciseIllustration } from '@musclemap/shared';
import { MuscleActivationBadge, type MuscleActivation } from '../../src/components/MuscleViewer';

interface WorkoutEntry extends WorkoutExercise {
  exercise: Exercise;
  completed: boolean;
}

export default function Workout() {
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exercise search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Workout state
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [preview, setPreview] = useState<{
    totalTU: number;
    activations: APIMuscleActivation[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Convert preview activations to MuscleViewer format
  const viewerActivations = useMemo((): MuscleActivation[] => {
    if (!preview?.activations?.length) return [];
    const maxActivation = Math.max(...preview.activations.map((a) => a.normalizedActivation), 1);
    return preview.activations.map((a) => ({
      id: a.muscleId,
      intensity: a.normalizedActivation / maxActivation,
      isPrimary: a.normalizedActivation / maxActivation > 0.6,
    }));
  }, [preview]);

  // Timer effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive]);

  // Load exercise types on mount
  useEffect(() => {
    async function loadTypes() {
      try {
        const result = await apiClient.exercises.types();
        setExerciseTypes(result.data);
      } catch (err) {
        console.error('Failed to load exercise types:', err);
      }
    }
    loadTypes();
  }, []);

  // Search exercises when query or type changes
  useEffect(() => {
    async function searchExercises() {
      if (!searchOpen) return;

      setSearching(true);
      try {
        if (searchQuery.length >= 2) {
          const result = await apiClient.exercises.search(searchQuery);
          setSearchResults(result.data);
        } else if (selectedType) {
          const result = await apiClient.exercises.list(selectedType);
          setSearchResults(result.data);
        } else {
          const result = await apiClient.exercises.list();
          setSearchResults(result.data.slice(0, 20)); // Limit initial results
        }
      } catch (err) {
        console.error('Failed to search exercises:', err);
      } finally {
        setSearching(false);
      }
    }

    const debounce = setTimeout(searchExercises, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedType, searchOpen]);

  // Update preview when entries change
  useEffect(() => {
    async function updatePreview() {
      if (entries.length === 0) {
        setPreview(null);
        return;
      }

      try {
        const workoutExercises = entries.map(({ exerciseId, sets, reps, weight }) => ({
          exerciseId,
          sets,
          reps,
          weight,
        }));
        const result = await apiClient.workouts.preview(workoutExercises);
        setPreview(result.data);
      } catch (err) {
        console.error('Failed to get workout preview:', err);
      }
    }

    updatePreview();
  }, [entries]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addExercise = useCallback((exercise: Exercise) => {
    setEntries((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exercise,
        sets: 3,
        reps: 10,
        weight: undefined,
        completed: false,
      },
    ]);
    setSearchOpen(false);
    setSearchQuery('');
    setSelectedType(null);
  }, []);

  const removeExercise = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleCompleted = useCallback((index: number) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, completed: !entry.completed } : entry
      )
    );
  }, []);

  const updateEntry = useCallback((index: number, updates: Partial<WorkoutEntry>) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry))
    );
  }, []);

  const submitWorkout = async () => {
    if (entries.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to your workout');
      return;
    }

    setSubmitting(true);
    try {
      const workoutExercises = entries.map(({ exerciseId, sets, reps, weight }) => ({
        exerciseId,
        sets,
        reps,
        weight,
      }));

      await apiClient.workouts.create({
        exercises: workoutExercises,
        idempotencyKey: `workout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      Alert.alert('Workout Complete!', `You earned ${preview?.totalTU.toFixed(1) || 0} TU`, [
        { text: 'OK', onPress: () => setEntries([]) },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save workout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView style={{ flex: 1 }}>
        <YStack flex={1} padding="$4" space="$4">
          <YStack space="$2">
            <H2>Today's Workout</H2>
            <Paragraph color="$gray11">Track your exercises and rest times</Paragraph>
          </YStack>

          {/* Rest Timer */}
          <Card padding="$4" elevate>
            <YStack space="$3" alignItems="center">
              <Text color="$gray11" fontSize="$3">Rest Timer</Text>
              <H2 fontSize="$10">{formatTime(seconds)}</H2>
              <XStack space="$3">
                <Button
                  size="$4"
                  circular
                  icon={timerActive ? <Pause size={20} /> : <Play size={20} />}
                  onPress={() => setTimerActive(!timerActive)}
                  theme={timerActive ? 'red' : 'green'}
                />
                <Button
                  size="$4"
                  circular
                  icon={<RotateCcw size={20} />}
                  onPress={() => {
                    setSeconds(0);
                    setTimerActive(false);
                  }}
                  theme="gray"
                />
              </XStack>
            </YStack>
          </Card>

          {/* Workout Preview */}
          {preview && (
            <Card padding="$4" elevate backgroundColor="$blue2">
              <XStack justifyContent="space-between" alignItems="center" space="$3">
                {/* Muscle Badge */}
                {viewerActivations.length > 0 && (
                  <MuscleActivationBadge
                    muscles={viewerActivations}
                    size={56}
                    showGlow={true}
                  />
                )}
                <YStack flex={1}>
                  <Text color="$gray11" fontSize="$2">Estimated Training Units</Text>
                  <H3 color="$blue10">{preview.totalTU.toFixed(1)} TU</H3>
                </YStack>
                <YStack alignItems="flex-end">
                  <Text color="$gray11" fontSize="$2">Top muscles</Text>
                  <Text color="$blue10" fontSize="$3">
                    {preview.activations
                      .slice(0, 3)
                      .map((a) => a.muscleName)
                      .join(', ')}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Exercise List */}
          <XStack justifyContent="space-between" alignItems="center">
            <H3>Exercises ({entries.length})</H3>
            <Button
              size="$3"
              icon={<Plus size={16} />}
              onPress={() => setSearchOpen(true)}
              theme="active"
            >
              Add
            </Button>
          </XStack>

          {entries.length === 0 ? (
            <Card padding="$6" elevate>
              <YStack alignItems="center" space="$2">
                <Text color="$gray11" textAlign="center">
                  No exercises yet
                </Text>
                <Button
                  size="$3"
                  icon={<Plus size={16} />}
                  onPress={() => setSearchOpen(true)}
                >
                  Add Exercise
                </Button>
              </YStack>
            </Card>
          ) : (
            <YStack space="$3">
              {entries.map((entry, index) => (
                <Card
                  key={`${entry.exerciseId}-${index}`}
                  padding="$4"
                  elevate
                  opacity={entry.completed ? 0.6 : 1}
                >
                  <YStack space="$3">
                    <XStack justifyContent="space-between" alignItems="flex-start" space="$3">
                      {/* Exercise Illustration */}
                      {hasExerciseIllustration(entry.exerciseId) && (
                        <ExerciseIllustration
                          exerciseId={entry.exerciseId}
                          exerciseName={entry.exercise.name}
                          primaryMuscles={entry.exercise.primaryMuscles}
                          size="sm"
                          showMuscleLabels={false}
                          interactive={false}
                          style={{ borderRadius: 8 }}
                        />
                      )}
                      <YStack flex={1}>
                        <Text
                          fontWeight="bold"
                          fontSize="$5"
                          textDecorationLine={entry.completed ? 'line-through' : 'none'}
                        >
                          {entry.exercise.name}
                        </Text>
                        <Text color="$blue10" fontSize="$2">
                          {entry.exercise.primaryMuscles.join(', ') || entry.exercise.type}
                        </Text>
                      </YStack>
                      <XStack space="$2">
                        <Button
                          size="$2"
                          circular
                          icon={<Check size={14} />}
                          onPress={() => toggleCompleted(index)}
                          theme={entry.completed ? 'green' : 'gray'}
                        />
                        <Button
                          size="$2"
                          circular
                          icon={<Trash2 size={14} />}
                          onPress={() => removeExercise(index)}
                          theme="red"
                        />
                      </XStack>
                    </XStack>

                    {/* Note: onChangeText uses `as any` due to Tamagui type bug */}
                    <XStack space="$3">
                      <YStack flex={1}>
                        <Text color="$gray11" fontSize="$2">Sets</Text>
                        <Input
                          size="$3"
                          keyboardType="number-pad"
                          value={String(entry.sets)}
                          onChangeText={((text: string) =>
                            updateEntry(index, { sets: parseInt(text) || 1 })
                          ) as any}
                        />
                      </YStack>
                      <YStack flex={1}>
                        <Text color="$gray11" fontSize="$2">Reps</Text>
                        <Input
                          size="$3"
                          keyboardType="number-pad"
                          value={entry.reps != null ? String(entry.reps) : ''}
                          placeholder="10"
                          onChangeText={((text: string) => {
                            const parsed = parseInt(text, 10);
                            updateEntry(index, { reps: isNaN(parsed) ? undefined : parsed });
                          }) as any}
                        />
                      </YStack>
                      <YStack flex={1}>
                        <Text color="$gray11" fontSize="$2">Weight</Text>
                        <Input
                          size="$3"
                          keyboardType="decimal-pad"
                          placeholder="lbs"
                          value={entry.weight ? String(entry.weight) : ''}
                          onChangeText={((text: string) =>
                            updateEntry(index, { weight: parseFloat(text) || undefined })
                          ) as any}
                        />
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>
              ))}
            </YStack>
          )}

          {/* Submit Button */}
          {entries.length > 0 && (
            <Button
              size="$5"
              theme="active"
              onPress={submitWorkout}
              disabled={submitting}
              icon={submitting ? <Spinner color="$color" /> : undefined}
            >
              {submitting ? 'Saving...' : 'Complete Workout'}
            </Button>
          )}
        </YStack>
      </ScrollView>

      {/* Exercise Search Sheet */}
      <Sheet
        modal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        snapPoints={[80]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame padding="$4">
          <Sheet.Handle />
          <YStack space="$4" flex={1}>
            <H3>Add Exercise</H3>

            <XStack space="$2" alignItems="center">
              <Input
                flex={1}
                size="$4"
                placeholder="Search exercises..."
                value={searchQuery}
                onChangeText={setSearchQuery as any}
              />
              <Search size={20} color="$gray11" />
            </XStack>

            {/* Type filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack space="$2" paddingBottom="$2">
                <Button
                  size="$2"
                  theme={selectedType === null ? 'active' : 'gray'}
                  onPress={() => setSelectedType(null)}
                >
                  All
                </Button>
                {exerciseTypes.map((type) => (
                  <Button
                    key={type}
                    size="$2"
                    theme={selectedType === type ? 'active' : 'gray'}
                    onPress={() => setSelectedType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </XStack>
            </ScrollView>

            {/* Results */}
            {searching ? (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <Spinner size="large" />
              </YStack>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                <YStack space="$2">
                  {searchResults.map((exercise) => (
                    <Card
                      key={exercise.id}
                      padding="$3"
                      pressTheme
                      onPress={() => addExercise(exercise)}
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <YStack flex={1}>
                          <Text fontWeight="bold">{exercise.name}</Text>
                          <Text color="$gray11" fontSize="$2">
                            {exercise.type} • {exercise.primaryMuscles.join(', ')}
                          </Text>
                        </YStack>
                        <Plus size={20} color="$blue10" />
                      </XStack>
                    </Card>
                  ))}
                  {searchResults.length === 0 && (
                    <Paragraph color="$gray11" textAlign="center" padding="$4">
                      {searchQuery.length > 0
                        ? 'No exercises found'
                        : 'Start typing to search'}
                    </Paragraph>
                  )}
                </YStack>
              </ScrollView>
            )}
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
