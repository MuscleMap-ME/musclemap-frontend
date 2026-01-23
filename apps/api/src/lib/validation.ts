/**
 * Shared Validation Utilities
 *
 * Common Zod schemas and validation helpers used across the API.
 */

import { z } from 'zod';

/**
 * Date string schema that accepts YYYY-MM-DD format
 * Transforms empty strings to null
 * Validates that the date is a real date (e.g., not 2024-02-31)
 */
export const dateSchema = z.string().nullish().transform((val) => {
  if (!val || val.trim() === '') return null;
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(val)) return null;
  // Validate it's a real date
  const date = new Date(val);
  if (isNaN(date.getTime())) return null;
  return val;
});

/**
 * Required date string schema
 * Same as dateSchema but required (cannot be null)
 */
export const requiredDateSchema = z.string().refine((val) => {
  if (!val || val.trim() === '') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(val)) return false;
  const date = new Date(val);
  return !isNaN(date.getTime());
}, { message: 'Invalid date format. Expected YYYY-MM-DD.' });

/**
 * Date that must be in the past or today
 */
export const pastDateSchema = z.string().nullish().transform((val) => {
  if (!val || val.trim() === '') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(val)) return null;
  const date = new Date(val);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return null;
  return val;
});

/**
 * Date that must be in the future
 */
export const futureDateSchema = z.string().nullish().transform((val) => {
  if (!val || val.trim() === '') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(val)) return null;
  const date = new Date(val);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return null;
  return val;
});

/**
 * Date within a reasonable range (not too far in past or future)
 * Past limit: 100 years
 * Future limit: 10 years
 */
export const reasonableDateSchema = z.string().nullish().transform((val) => {
  if (!val || val.trim() === '') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(val)) return null;
  const date = new Date(val);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const minDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());

  if (date < minDate || date > maxDate) return null;
  return val;
});

/**
 * Helper to validate date range (start must be before end)
 * @param startFieldName - Name of the start date field
 * @param endFieldName - Name of the end date field
 * @param message - Custom error message
 */
export function dateRangeRefinement<T extends Record<string, unknown>>(
  startFieldName: keyof T,
  endFieldName: keyof T,
  message = 'End date must be after start date'
) {
  return (data: T) => {
    const startDate = data[startFieldName] as string | null | undefined;
    const endDate = data[endFieldName] as string | null | undefined;

    if (startDate && endDate) {
      return new Date(startDate) <= new Date(endDate);
    }
    return true;
  };
}

/**
 * Helper to create a refinement for date not too far in future
 * @param years - Maximum years in the future
 * @param fieldName - Name of the date field
 * @param message - Custom error message
 */
export function maxFutureDateRefinement<T extends Record<string, unknown>>(
  fieldName: keyof T,
  years: number,
  message?: string
) {
  return (data: T) => {
    const dateValue = data[fieldName] as string | null | undefined;
    if (dateValue) {
      const date = new Date(dateValue);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + years);
      return date <= maxDate;
    }
    return true;
  };
}

/**
 * Parse and validate a date string, returning null for invalid dates
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value || value.trim() === '') return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
