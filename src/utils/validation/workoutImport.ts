/**
 * Zod Validation Schemas for Workout Import
 *
 * Validates workout data from various import sources:
 * - Text import (manual text parsing)
 * - Voice input (transcription parsing)
 * - Screenshot OCR (extracted text)
 * - File import (CSV/JSON)
 * - Health sync (Apple Health, Google Fit)
 */

import { z } from 'zod';

// ============================================
// BASE SCHEMAS
// ============================================

/**
 * Single set of an exercise
 */
export const SetSchema = z.object({
  setNumber: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(2000).optional(),
  reps: z.number().int().min(0).max(500).optional(),
  duration: z.number().min(0).max(36000).optional(), // seconds, max 10 hours
  distance: z.number().min(0).max(1000000).optional(), // meters, max 1000km
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
  isWarmup: z.boolean().optional(),
  isDropSet: z.boolean().optional(),
  isFailed: z.boolean().optional(),
});

export type SetInput = z.infer<typeof SetSchema>;

/**
 * Exercise with multiple sets
 */
export const ExerciseImportSchema = z.object({
  id: z.string().optional(), // Generated if not provided
  exerciseName: z.string().min(1).max(200).trim(),
  exerciseId: z.string().uuid().optional(), // DB exercise ID if matched
  sets: z.array(SetSchema).min(1).max(50),
  rawText: z.string().max(5000).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  source: z.enum(['text', 'voice', 'screenshot', 'file', 'health']).optional(),
});

export type ExerciseImport = z.infer<typeof ExerciseImportSchema>;

/**
 * Complete workout import
 */
export const WorkoutImportSchema = z.object({
  exercises: z.array(ExerciseImportSchema).min(1).max(100),
  date: z.string().datetime().or(z.date()).optional(),
  notes: z.string().max(2000).optional(),
  duration: z.number().min(0).max(86400).optional(), // seconds, max 24 hours
  importSource: z.enum(['text', 'voice', 'screenshot', 'file', 'health']),
  rawInput: z.string().max(50000).optional(), // Original raw input
});

export type WorkoutImport = z.infer<typeof WorkoutImportSchema>;

// ============================================
// TEXT IMPORT VALIDATION
// ============================================

/**
 * Raw text input for parsing
 */
export const TextImportInputSchema = z.object({
  text: z.string()
    .min(1, 'Please enter some workout data')
    .max(50000, 'Text is too long (max 50,000 characters)')
    .trim(),
  format: z.enum(['auto', 'strongapp', 'hevy', 'jefit', 'custom']).optional(),
});

export type TextImportInput = z.infer<typeof TextImportInputSchema>;

// ============================================
// VOICE INPUT VALIDATION
// ============================================

/**
 * Voice transcription input
 */
export const VoiceInputSchema = z.object({
  transcript: z.string()
    .min(1, 'No speech detected')
    .max(10000, 'Transcript too long')
    .trim(),
  confidence: z.number().min(0).max(1).optional(),
  language: z.string().max(10).optional(),
});

export type VoiceInput = z.infer<typeof VoiceInputSchema>;

// ============================================
// FILE IMPORT VALIDATION
// ============================================

/**
 * CSV row for import
 */
export const CSVRowSchema = z.object({
  exercise: z.string().min(1).max(200),
  weight: z.string().or(z.number()).optional(),
  reps: z.string().or(z.number()).optional(),
  sets: z.string().or(z.number()).optional(),
  date: z.string().optional(),
  notes: z.string().max(500).optional(),
}).passthrough(); // Allow additional columns

export type CSVRow = z.infer<typeof CSVRowSchema>;

/**
 * JSON import format
 */
export const JSONImportSchema = z.object({
  version: z.string().optional(),
  exportDate: z.string().datetime().optional(),
  workouts: z.array(z.object({
    date: z.string().or(z.date()),
    name: z.string().optional(),
    duration: z.number().optional(),
    exercises: z.array(z.object({
      name: z.string(),
      notes: z.string().optional(),
      sets: z.array(z.object({
        weight: z.number().optional(),
        reps: z.number().optional(),
        duration: z.number().optional(),
        distance: z.number().optional(),
        rpe: z.number().optional(),
      })),
    })),
  })).min(1).max(1000),
});

export type JSONImport = z.infer<typeof JSONImportSchema>;

// ============================================
// HEALTH PLATFORM VALIDATION
// ============================================

/**
 * Apple Health workout
 */
export const AppleHealthWorkoutSchema = z.object({
  id: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.number(), // seconds
  totalEnergyBurned: z.number().optional(), // kcal
  activityType: z.string(),
  source: z.object({
    name: z.string(),
    bundleIdentifier: z.string().optional(),
  }).optional(),
});

export type AppleHealthWorkout = z.infer<typeof AppleHealthWorkoutSchema>;

/**
 * Google Fit session
 */
export const GoogleFitSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTimeMillis: z.string().or(z.number()),
  endTimeMillis: z.string().or(z.number()),
  activityType: z.number(),
  application: z.object({
    packageName: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
});

export type GoogleFitSession = z.infer<typeof GoogleFitSessionSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Safe parse with detailed error messages
 */
export function validateWorkoutImport(data: unknown): {
  success: true;
  data: WorkoutImport
} | {
  success: false;
  errors: Array<{ path: string; message: string }>
} {
  const result = WorkoutImportSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Validate exercise data
 */
export function validateExercise(data: unknown): {
  success: true;
  data: ExerciseImport;
} | {
  success: false;
  errors: Array<{ path: string; message: string }>;
} {
  const result = ExerciseImportSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Validate set data
 */
export function validateSet(data: unknown): {
  success: true;
  data: SetInput;
} | {
  success: false;
  errors: Array<{ path: string; message: string }>;
} {
  const result = SetSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Validate text import input
 */
export function validateTextImport(data: unknown): {
  success: true;
  data: TextImportInput;
} | {
  success: false;
  errors: Array<{ path: string; message: string }>;
} {
  const result = TextImportInputSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

/**
 * Sanitize exercise name
 */
export function sanitizeExerciseName(name: string): string {
  return sanitizeString(name)
    .replace(/[^a-zA-Z0-9\s\-'().]/g, '') // Only allow safe characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 200); // Max length
}

/**
 * Sanitize and validate weight input
 */
export function sanitizeWeight(input: string | number): number | null {
  if (typeof input === 'number') {
    return input >= 0 && input <= 2000 ? input : null;
  }

  const cleaned = input.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num) || num < 0 || num > 2000) {
    return null;
  }

  return Math.round(num * 10) / 10; // 1 decimal precision
}

/**
 * Sanitize and validate reps input
 */
export function sanitizeReps(input: string | number): number | null {
  if (typeof input === 'number') {
    return Number.isInteger(input) && input >= 0 && input <= 500 ? input : null;
  }

  const cleaned = input.replace(/[^\d]/g, '');
  const num = parseInt(cleaned, 10);

  if (isNaN(num) || num < 0 || num > 500) {
    return null;
  }

  return num;
}

export default {
  SetSchema,
  ExerciseImportSchema,
  WorkoutImportSchema,
  TextImportInputSchema,
  VoiceInputSchema,
  CSVRowSchema,
  JSONImportSchema,
  AppleHealthWorkoutSchema,
  GoogleFitSessionSchema,
  validateWorkoutImport,
  validateExercise,
  validateSet,
  validateTextImport,
  sanitizeString,
  sanitizeExerciseName,
  sanitizeWeight,
  sanitizeReps,
};
