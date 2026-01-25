/**
 * Workout Templates System
 *
 * Provides quick-start templates for common workout routines.
 * Users can start from templates and customize them.
 */

// ============================================
// TYPES
// ============================================

export interface TemplateSet {
  reps?: number;
  weight?: number;
  duration?: number;
  restSeconds?: number;
}

export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  sets: TemplateSet[];
  notes?: string;
  supersetGroup?: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  targetMuscles: string[];
  exercises: TemplateExercise[];
  tags: string[];
  isBuiltIn: boolean;
  createdAt?: Date;
  usageCount?: number;
}

export type TemplateCategory =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full-body'
  | 'cardio'
  | 'hiit'
  | 'strength'
  | 'hypertrophy'
  | 'powerlifting'
  | 'custom';

// ============================================
// BUILT-IN TEMPLATES
// ============================================

export const BUILT_IN_TEMPLATES: WorkoutTemplate[] = [
  // Push Day
  {
    id: 'push-day-1',
    name: 'Push Day A',
    description: 'Classic push workout focusing on chest, shoulders, and triceps',
    category: 'push',
    difficulty: 'intermediate',
    estimatedMinutes: 60,
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    tags: ['PPL', 'push', 'upper body'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'bench-press',
        exerciseName: 'Barbell Bench Press',
        sets: [
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
        ],
      },
      {
        exerciseId: 'incline-db-press',
        exerciseName: 'Incline Dumbbell Press',
        sets: [
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'ohp',
        exerciseName: 'Overhead Press',
        sets: [
          { reps: 8, restSeconds: 90 },
          { reps: 8, restSeconds: 90 },
          { reps: 8, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'lateral-raise',
        exerciseName: 'Lateral Raise',
        sets: [
          { reps: 15, restSeconds: 60 },
          { reps: 15, restSeconds: 60 },
          { reps: 15, restSeconds: 60 },
        ],
      },
      {
        exerciseId: 'tricep-pushdown',
        exerciseName: 'Tricep Pushdown',
        sets: [
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
        ],
      },
    ],
  },

  // Pull Day
  {
    id: 'pull-day-1',
    name: 'Pull Day A',
    description: 'Back and biceps focused workout',
    category: 'pull',
    difficulty: 'intermediate',
    estimatedMinutes: 60,
    targetMuscles: ['back', 'biceps', 'rear delts'],
    tags: ['PPL', 'pull', 'upper body'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'deadlift',
        exerciseName: 'Deadlift',
        sets: [
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
        ],
      },
      {
        exerciseId: 'pull-up',
        exerciseName: 'Pull-ups',
        sets: [
          { reps: 8, restSeconds: 90 },
          { reps: 8, restSeconds: 90 },
          { reps: 8, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'barbell-row',
        exerciseName: 'Barbell Row',
        sets: [
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'face-pull',
        exerciseName: 'Face Pulls',
        sets: [
          { reps: 15, restSeconds: 60 },
          { reps: 15, restSeconds: 60 },
          { reps: 15, restSeconds: 60 },
        ],
      },
      {
        exerciseId: 'barbell-curl',
        exerciseName: 'Barbell Curl',
        sets: [
          { reps: 10, restSeconds: 60 },
          { reps: 10, restSeconds: 60 },
          { reps: 10, restSeconds: 60 },
        ],
      },
    ],
  },

  // Leg Day
  {
    id: 'leg-day-1',
    name: 'Leg Day A',
    description: 'Complete lower body workout',
    category: 'legs',
    difficulty: 'intermediate',
    estimatedMinutes: 70,
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    tags: ['PPL', 'legs', 'lower body'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'squat',
        exerciseName: 'Barbell Squat',
        sets: [
          { reps: 8, restSeconds: 150 },
          { reps: 8, restSeconds: 150 },
          { reps: 8, restSeconds: 150 },
          { reps: 8, restSeconds: 150 },
        ],
      },
      {
        exerciseId: 'romanian-deadlift',
        exerciseName: 'Romanian Deadlift',
        sets: [
          { reps: 10, restSeconds: 120 },
          { reps: 10, restSeconds: 120 },
          { reps: 10, restSeconds: 120 },
        ],
      },
      {
        exerciseId: 'leg-press',
        exerciseName: 'Leg Press',
        sets: [
          { reps: 12, restSeconds: 90 },
          { reps: 12, restSeconds: 90 },
          { reps: 12, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'leg-curl',
        exerciseName: 'Leg Curl',
        sets: [
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
        ],
      },
      {
        exerciseId: 'calf-raise',
        exerciseName: 'Standing Calf Raise',
        sets: [
          { reps: 15, restSeconds: 45 },
          { reps: 15, restSeconds: 45 },
          { reps: 15, restSeconds: 45 },
          { reps: 15, restSeconds: 45 },
        ],
      },
    ],
  },

  // Full Body Beginner
  {
    id: 'full-body-beginner',
    name: 'Full Body Starter',
    description: 'Perfect for beginners - covers all major muscle groups',
    category: 'full-body',
    difficulty: 'beginner',
    estimatedMinutes: 45,
    targetMuscles: ['full body'],
    tags: ['beginner', 'full body', 'compound'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'goblet-squat',
        exerciseName: 'Goblet Squat',
        sets: [
          { reps: 12, restSeconds: 90 },
          { reps: 12, restSeconds: 90 },
          { reps: 12, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'db-bench-press',
        exerciseName: 'Dumbbell Bench Press',
        sets: [
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'db-row',
        exerciseName: 'Dumbbell Row',
        sets: [
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'plank',
        exerciseName: 'Plank',
        sets: [
          { duration: 30, restSeconds: 60 },
          { duration: 30, restSeconds: 60 },
          { duration: 30, restSeconds: 60 },
        ],
      },
    ],
  },

  // Upper Body
  {
    id: 'upper-body-1',
    name: 'Upper Body Power',
    description: 'Chest, back, shoulders, and arms in one session',
    category: 'upper',
    difficulty: 'intermediate',
    estimatedMinutes: 60,
    targetMuscles: ['chest', 'back', 'shoulders', 'arms'],
    tags: ['upper lower', 'upper body'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
        ],
      },
      {
        exerciseId: 'barbell-row',
        exerciseName: 'Barbell Row',
        sets: [
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
          { reps: 8, restSeconds: 120 },
        ],
      },
      {
        exerciseId: 'ohp',
        exerciseName: 'Overhead Press',
        sets: [
          { reps: 8, restSeconds: 90 },
          { reps: 8, restSeconds: 90 },
          { reps: 8, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'lat-pulldown',
        exerciseName: 'Lat Pulldown',
        sets: [
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'bicep-curl',
        exerciseName: 'Bicep Curl',
        supersetGroup: 1,
        sets: [
          { reps: 12, restSeconds: 30 },
          { reps: 12, restSeconds: 30 },
          { reps: 12, restSeconds: 30 },
        ],
      },
      {
        exerciseId: 'tricep-extension',
        exerciseName: 'Tricep Extension',
        supersetGroup: 1,
        sets: [
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
        ],
      },
    ],
  },

  // 5x5 Strength
  {
    id: '5x5-strength',
    name: 'StrongLifts 5x5',
    description: 'Classic strength program - 5 sets of 5 reps',
    category: 'strength',
    difficulty: 'beginner',
    estimatedMinutes: 45,
    targetMuscles: ['full body'],
    tags: ['strength', '5x5', 'compound', 'beginner'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'squat',
        exerciseName: 'Squat',
        sets: [
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
        ],
      },
      {
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
        ],
      },
      {
        exerciseId: 'barbell-row',
        exerciseName: 'Barbell Row',
        sets: [
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
        ],
      },
    ],
  },

  // HIIT
  {
    id: 'hiit-circuit',
    name: 'HIIT Circuit',
    description: 'High intensity interval training for fat loss',
    category: 'hiit',
    difficulty: 'intermediate',
    estimatedMinutes: 25,
    targetMuscles: ['full body', 'cardio'],
    tags: ['hiit', 'cardio', 'fat loss', 'circuit'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'burpees',
        exerciseName: 'Burpees',
        sets: [
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
        ],
      },
      {
        exerciseId: 'mountain-climbers',
        exerciseName: 'Mountain Climbers',
        sets: [
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
        ],
      },
      {
        exerciseId: 'jump-squat',
        exerciseName: 'Jump Squats',
        sets: [
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
        ],
      },
      {
        exerciseId: 'high-knees',
        exerciseName: 'High Knees',
        sets: [
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
        ],
      },
      {
        exerciseId: 'plank',
        exerciseName: 'Plank',
        sets: [
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
          { duration: 30, restSeconds: 15 },
        ],
      },
    ],
  },

  // Powerlifting
  {
    id: 'powerlifting-squat-day',
    name: 'Squat Focus Day',
    description: 'Powerlifting-style squat emphasis',
    category: 'powerlifting',
    difficulty: 'advanced',
    estimatedMinutes: 75,
    targetMuscles: ['quads', 'glutes', 'core'],
    tags: ['powerlifting', 'squat', 'strength'],
    isBuiltIn: true,
    exercises: [
      {
        exerciseId: 'squat',
        exerciseName: 'Competition Squat',
        notes: 'Work up to heavy single, then back-off sets',
        sets: [
          { reps: 1, restSeconds: 300 },
          { reps: 3, restSeconds: 180 },
          { reps: 3, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
          { reps: 5, restSeconds: 180 },
        ],
      },
      {
        exerciseId: 'pause-squat',
        exerciseName: 'Pause Squat',
        sets: [
          { reps: 3, restSeconds: 150 },
          { reps: 3, restSeconds: 150 },
          { reps: 3, restSeconds: 150 },
        ],
      },
      {
        exerciseId: 'leg-press',
        exerciseName: 'Leg Press',
        sets: [
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
          { reps: 10, restSeconds: 90 },
        ],
      },
      {
        exerciseId: 'leg-curl',
        exerciseName: 'Leg Curl',
        sets: [
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
          { reps: 12, restSeconds: 60 },
        ],
      },
    ],
  },
];

// ============================================
// TEMPLATE MANAGEMENT
// ============================================

const CUSTOM_TEMPLATES_KEY = 'musclemap_custom_templates';

/**
 * Get all templates (built-in + custom)
 */
export function getAllTemplates(): WorkoutTemplate[] {
  const customTemplates = getCustomTemplates();
  return [...BUILT_IN_TEMPLATES, ...customTemplates];
}

/**
 * Get custom templates from storage
 */
export function getCustomTemplates(): WorkoutTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save a custom template
 */
export function saveCustomTemplate(template: Omit<WorkoutTemplate, 'id' | 'isBuiltIn' | 'createdAt'>): WorkoutTemplate {
  const newTemplate: WorkoutTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isBuiltIn: false,
    createdAt: new Date(),
    usageCount: 0,
  };

  const existing = getCustomTemplates();
  const updated = [...existing, newTemplate];

  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
  }

  return newTemplate;
}

/**
 * Delete a custom template
 */
export function deleteCustomTemplate(templateId: string): boolean {
  const existing = getCustomTemplates();
  const updated = existing.filter((t) => t.id !== templateId);

  if (updated.length === existing.length) {
    return false; // Template not found
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
  }

  return true;
}

/**
 * Update template usage count
 */
export function incrementTemplateUsage(templateId: string): void {
  // For built-in templates, we don't persist usage
  // For custom templates, update localStorage
  const customTemplates = getCustomTemplates();
  const index = customTemplates.findIndex((t) => t.id === templateId);

  if (index >= 0) {
    customTemplates[index].usageCount = (customTemplates[index].usageCount || 0) + 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    }
  }
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): WorkoutTemplate[] {
  return getAllTemplates().filter((t) => t.category === category);
}

/**
 * Search templates by name or tags
 */
export function searchTemplates(query: string): WorkoutTemplate[] {
  const lowerQuery = query.toLowerCase();
  return getAllTemplates().filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      t.targetMuscles.some((m) => m.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get recommended templates based on time and user preferences
 */
export function getRecommendedTemplates(
  availableMinutes?: number,
  preferredCategories?: TemplateCategory[],
  difficulty?: WorkoutTemplate['difficulty']
): WorkoutTemplate[] {
  let templates = getAllTemplates();

  // Filter by time if specified
  if (availableMinutes) {
    templates = templates.filter((t) => t.estimatedMinutes <= availableMinutes);
  }

  // Filter by category if specified
  if (preferredCategories && preferredCategories.length > 0) {
    templates = templates.filter((t) => preferredCategories.includes(t.category));
  }

  // Filter by difficulty if specified
  if (difficulty) {
    templates = templates.filter((t) => t.difficulty === difficulty);
  }

  // Sort by usage count (most used first)
  return templates.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
}

/**
 * Create workout from template with optional weight adjustments
 */
export function createWorkoutFromTemplate(
  template: WorkoutTemplate,
  weightMultiplier: number = 1
): {
  name: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: Array<{
      reps?: number;
      weight?: number;
      duration?: number;
    }>;
    notes?: string;
  }>;
} {
  return {
    name: template.name,
    exercises: template.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight ? Math.round(set.weight * weightMultiplier) : undefined,
        duration: set.duration,
      })),
    })),
  };
}

export default {
  BUILT_IN_TEMPLATES,
  getAllTemplates,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  incrementTemplateUsage,
  getTemplatesByCategory,
  searchTemplates,
  getRecommendedTemplates,
  createWorkoutFromTemplate,
};
