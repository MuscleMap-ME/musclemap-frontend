// Sample workout data for development/testing

const now = new Date();
const oneDay = 24 * 60 * 60 * 1000;

export const workouts = [
  {
    id: 'workout-001',
    userId: 'demo-user-001',
    exercises: [
      { exerciseId: 'bench-press', name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 135, notes: null },
      { exerciseId: 'overhead-press', name: 'Overhead Press', sets: 3, reps: 10, weight: 95, notes: null },
      { exerciseId: 'dumbbell-curl', name: 'Dumbbell Bicep Curl', sets: 3, reps: 12, weight: 25, notes: 'Felt strong today' },
    ],
    duration: 45,
    notes: 'Push day - felt great',
    totalTU: 850,
    createdAt: new Date(now.getTime() - oneDay).toISOString(),
  },
  {
    id: 'workout-002',
    userId: 'demo-user-001',
    exercises: [
      { exerciseId: 'squat', name: 'Barbell Back Squat', sets: 5, reps: 5, weight: 225, notes: null },
      { exerciseId: 'deadlift', name: 'Conventional Deadlift', sets: 3, reps: 5, weight: 275, notes: 'PR attempt' },
      { exerciseId: 'lunges', name: 'Walking Lunges', sets: 3, reps: 12, weight: 0, notes: null },
    ],
    duration: 55,
    notes: 'Leg day - heavy session',
    totalTU: 1200,
    createdAt: new Date(now.getTime() - 3 * oneDay).toISOString(),
  },
  {
    id: 'workout-003',
    userId: 'demo-user-001',
    exercises: [
      { exerciseId: 'pull-up', name: 'Pull-Up', sets: 4, reps: 10, weight: 0, notes: null },
      { exerciseId: 'barbell-row', name: 'Barbell Row', sets: 4, reps: 8, weight: 155, notes: null },
      { exerciseId: 'plank', name: 'Plank', sets: 3, reps: 60, weight: 0, notes: '60 second holds' },
    ],
    duration: 40,
    notes: 'Pull day',
    totalTU: 750,
    createdAt: new Date(now.getTime() - 5 * oneDay).toISOString(),
  },
  {
    id: 'workout-004',
    userId: 'demo-user-001',
    exercises: [
      { exerciseId: 'kettlebell-swing', name: 'Kettlebell Swing', sets: 5, reps: 15, weight: 53, notes: null },
      { exerciseId: 'squat', name: 'Barbell Back Squat', sets: 3, reps: 10, weight: 185, notes: 'Light day' },
    ],
    duration: 30,
    notes: 'Quick conditioning session',
    totalTU: 550,
    createdAt: new Date(now.getTime() - 7 * oneDay).toISOString(),
  },
];

export const workoutStats = {
  totalWorkouts: 87,
  totalExercises: 412,
  totalSets: 1648,
  totalReps: 16480,
  totalWeight: 245000,
  currentStreak: 12,
  longestStreak: 21,
  thisWeek: 4,
  thisMonth: 15,
};

export const muscleStats = {
  muscleGroups: [
    { muscle: 'chest', totalSets: 156, totalReps: 1248, lastTrained: new Date(now.getTime() - oneDay).toISOString() },
    { muscle: 'back', totalSets: 198, totalReps: 1584, lastTrained: new Date(now.getTime() - 2 * oneDay).toISOString() },
    { muscle: 'legs', totalSets: 210, totalReps: 1680, lastTrained: new Date(now.getTime() - 3 * oneDay).toISOString() },
    { muscle: 'shoulders', totalSets: 120, totalReps: 960, lastTrained: new Date(now.getTime() - oneDay).toISOString() },
    { muscle: 'arms', totalSets: 144, totalReps: 1440, lastTrained: new Date(now.getTime() - 2 * oneDay).toISOString() },
    { muscle: 'core', totalSets: 90, totalReps: 720, lastTrained: new Date(now.getTime() - 2 * oneDay).toISOString() },
  ],
  lastTrained: {
    chest: new Date(now.getTime() - oneDay).toISOString(),
    back: new Date(now.getTime() - 2 * oneDay).toISOString(),
    legs: new Date(now.getTime() - 3 * oneDay).toISOString(),
  },
  weeklyVolume: {
    chest: 48,
    back: 52,
    legs: 45,
    shoulders: 36,
    arms: 42,
    core: 24,
  },
};
