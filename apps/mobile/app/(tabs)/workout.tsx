import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth';
import type { Exercise } from '@musclemap/core';

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: { reps: number; weight?: number }[];
}

export default function WorkoutScreen() {
  const { token } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [isSelectingExercise, setIsSelectingExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/exercises`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setExercises(data.exercises || data);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addExercise = (exercise: Exercise) => {
    setWorkoutExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [{ reps: 0 }],
      },
    ]);
    setIsSelectingExercise(false);
    setSearchQuery('');
  };

  const addSet = (exerciseIndex: number) => {
    setWorkoutExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex].sets.push({ reps: 0 });
      return updated;
    });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: string
  ) => {
    const numValue = parseInt(value, 10) || 0;
    setWorkoutExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex][field] = numValue;
      return updated;
    });
  };

  const removeExercise = (index: number) => {
    setWorkoutExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const saveWorkout = async () => {
    if (workoutExercises.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercises: workoutExercises.map((we) => ({
            exerciseId: we.exerciseId,
            sets: we.sets.filter((s) => s.reps > 0),
          })),
        }),
      });

      if (response.ok) {
        setWorkoutExercises([]);
        // Show success feedback
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {workoutExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptyText}>
              Add exercises to start building your workout
            </Text>
          </View>
        ) : (
          workoutExercises.map((we, exIndex) => (
            <View key={`${we.exerciseId}-${exIndex}`} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{we.exerciseName}</Text>
                <TouchableOpacity onPress={() => removeExercise(exIndex)}>
                  <Text style={styles.removeButton}>Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.setsHeader}>
                <Text style={styles.setHeaderText}>Set</Text>
                <Text style={styles.setHeaderText}>Reps</Text>
                <Text style={styles.setHeaderText}>Weight (lbs)</Text>
              </View>

              {we.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <Text style={styles.setNumber}>{setIndex + 1}</Text>
                  <TextInput
                    style={styles.setInput}
                    value={set.reps > 0 ? String(set.reps) : ''}
                    onChangeText={(v) => updateSet(exIndex, setIndex, 'reps', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#666"
                  />
                  <TextInput
                    style={styles.setInput}
                    value={set.weight ? String(set.weight) : ''}
                    onChangeText={(v) => updateSet(exIndex, setIndex, 'weight', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor="#666"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addSet(exIndex)}
              >
                <Text style={styles.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setIsSelectingExercise(true)}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>

        {workoutExercises.length > 0 && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={saveWorkout}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Complete Workout</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={isSelectingExercise}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity onPress={() => setIsSelectingExercise(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {isLoading ? (
            <ActivityIndicator color="#fff" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseListItem}
                  onPress={() => addExercise(item)}
                >
                  <Text style={styles.exerciseListName}>{item.name}</Text>
                  <Text style={styles.exerciseListType}>{item.type}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.exerciseList}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    color: '#ef4444',
    fontSize: 14,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setHeaderText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  setNumber: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
  },
  setInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  addSetButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addSetText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addExerciseText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    color: '#3b82f6',
    fontSize: 16,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
  },
  loader: {
    marginTop: 40,
  },
  exerciseList: {
    padding: 16,
    paddingTop: 0,
  },
  exerciseListItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseListName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseListType: {
    fontSize: 14,
    color: '#888',
    textTransform: 'capitalize',
  },
});
