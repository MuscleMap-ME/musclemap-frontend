/**
 * Unit Conversion Utilities
 *
 * Comprehensive unit conversion system for MuscleMap.
 * All internal storage uses metric (kg, cm) - conversions happen at display layer.
 */

// Import shared types from preferences to avoid duplicates
import type { WeightUnit, DistanceUnit, UnitsPreferences } from './preferences.js';

// Re-export for convenience
export type { WeightUnit, DistanceUnit, UnitsPreferences };

// ============================================
// ADDITIONAL TYPES (not in preferences.ts)
// ============================================

export type HeightUnit = 'ft_in' | 'cm';
export type LengthUnit = 'in' | 'cm';
export type TemperatureUnit = 'f' | 'c';

// ============================================
// CONVERSION CONSTANTS
// ============================================

export const CONVERSIONS = {
  // Weight
  KG_TO_LBS: 2.20462,
  LBS_TO_KG: 0.453592,

  // Length/Height
  CM_TO_IN: 0.393701,
  IN_TO_CM: 2.54,
  CM_TO_FT: 0.0328084,
  FT_TO_CM: 30.48,

  // Distance
  KM_TO_MI: 0.621371,
  MI_TO_KM: 1.60934,

  // Volume (for hydration)
  ML_TO_OZ: 0.033814,
  OZ_TO_ML: 29.5735,
} as const;

// ============================================
// WEIGHT CONVERSIONS
// ============================================

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg * CONVERSIONS.KG_TO_LBS;
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * CONVERSIONS.LBS_TO_KG;
}

/**
 * Convert weight based on unit preference
 * @param valueKg - Value in kilograms (storage unit)
 * @param toUnit - Target display unit
 */
export function convertWeight(valueKg: number, toUnit: WeightUnit): number {
  if (toUnit === 'kg') return valueKg;
  return kgToLbs(valueKg);
}

/**
 * Convert weight from display unit to storage unit (kg)
 * @param value - Value in display unit
 * @param fromUnit - Source display unit
 */
export function weightToKg(value: number, fromUnit: WeightUnit): number {
  if (fromUnit === 'kg') return value;
  return lbsToKg(value);
}

// ============================================
// LENGTH/HEIGHT CONVERSIONS
// ============================================

/**
 * Convert centimeters to inches
 */
export function cmToIn(cm: number): number {
  return cm * CONVERSIONS.CM_TO_IN;
}

/**
 * Convert inches to centimeters
 */
export function inToCm(inches: number): number {
  return inches * CONVERSIONS.IN_TO_CM;
}

/**
 * Convert centimeters to feet and inches
 * @returns Object with feet and inches
 */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cmToIn(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Convert feet and inches to centimeters
 */
export function ftInToCm(feet: number, inches: number = 0): number {
  const totalInches = feet * 12 + inches;
  return inToCm(totalInches);
}

/**
 * Convert length/circumference based on unit preference
 * @param valueCm - Value in centimeters (storage unit)
 * @param toUnit - Target display unit ('cm' or 'in')
 */
export function convertLength(valueCm: number, toUnit: LengthUnit): number {
  if (toUnit === 'cm') return valueCm;
  return cmToIn(valueCm);
}

/**
 * Convert length from display unit to storage unit (cm)
 * @param value - Value in display unit
 * @param fromUnit - Source display unit
 */
export function lengthToCm(value: number, fromUnit: LengthUnit): number {
  if (fromUnit === 'cm') return value;
  return inToCm(value);
}

/**
 * Convert height based on unit preference
 * @param valueCm - Value in centimeters (storage unit)
 * @param toUnit - Target display unit
 */
export function convertHeight(valueCm: number, toUnit: HeightUnit): string {
  if (toUnit === 'cm') return `${Math.round(valueCm)} cm`;
  const { feet, inches } = cmToFtIn(valueCm);
  return `${feet}'${inches}"`;
}

// ============================================
// DISTANCE CONVERSIONS
// ============================================

/**
 * Convert kilometers to miles
 */
export function kmToMi(km: number): number {
  return km * CONVERSIONS.KM_TO_MI;
}

/**
 * Convert miles to kilometers
 */
export function miToKm(mi: number): number {
  return mi * CONVERSIONS.MI_TO_KM;
}

/**
 * Convert distance based on unit preference
 * @param valueKm - Value in kilometers (storage unit)
 * @param toUnit - Target display unit
 */
export function convertDistance(valueKm: number, toUnit: DistanceUnit): number {
  if (toUnit === 'km') return valueKm;
  return kmToMi(valueKm);
}

// ============================================
// VOLUME CONVERSIONS (Hydration)
// Note: mlToOz and ozToMl are exported from preferences.ts
// ============================================

// ============================================
// TEMPERATURE CONVERSIONS
// ============================================

/**
 * Convert Celsius to Fahrenheit
 */
export function cToF(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fToC(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format weight value with unit
 */
export function formatWeight(
  valueKg: number,
  unit: WeightUnit,
  decimals: number = 1
): string {
  const converted = convertWeight(valueKg, unit);
  return `${converted.toFixed(decimals)} ${unit}`;
}

/**
 * Format length/circumference value with unit
 */
export function formatLength(
  valueCm: number,
  unit: LengthUnit,
  decimals: number = 1
): string {
  const converted = convertLength(valueCm, unit);
  return `${converted.toFixed(decimals)} ${unit}`;
}

/**
 * Format distance value with unit
 */
export function formatDistance(
  valueKm: number,
  unit: DistanceUnit,
  decimals: number = 1
): string {
  const converted = convertDistance(valueKm, unit);
  return `${converted.toFixed(decimals)} ${unit}`;
}

// ============================================
// UNIT LABELS
// ============================================

export const UNIT_LABELS = {
  weight: {
    kg: 'Kilograms (kg)',
    lbs: 'Pounds (lbs)',
  },
  length: {
    cm: 'Centimeters (cm)',
    in: 'Inches (in)',
  },
  height: {
    cm: 'Centimeters (cm)',
    ft_in: 'Feet & Inches (ft\'in")',
  },
  distance: {
    km: 'Kilometers (km)',
    mi: 'Miles (mi)',
  },
  temperature: {
    c: 'Celsius (°C)',
    f: 'Fahrenheit (°F)',
  },
} as const;

/**
 * Get display label for a measurement based on unit system
 * Used for form field labels like "Weight (kg)" or "Weight (lbs)"
 */
export function getMeasurementLabel(
  baseName: string,
  fieldType: 'weight' | 'length' | 'percentage',
  units: { weight: WeightUnit; height: HeightUnit }
): string {
  if (fieldType === 'percentage') {
    return `${baseName} (%)`;
  }
  if (fieldType === 'weight') {
    return `${baseName} (${units.weight})`;
  }
  // For length/circumference, derive from height preference
  const lengthUnit: LengthUnit = units.height === 'cm' ? 'cm' : 'in';
  return `${baseName} (${lengthUnit})`;
}

/**
 * Get the length unit based on height preference
 * If user prefers cm for height, they likely want cm for circumferences
 * If user prefers ft/in for height, they likely want inches for circumferences
 */
export function getLengthUnitFromHeightPref(heightPref: HeightUnit): LengthUnit {
  return heightPref === 'cm' ? 'cm' : 'in';
}

// ============================================
// BODY MEASUREMENT FIELD HELPERS
// ============================================

export interface MeasurementFieldConfig {
  key: string;
  label: string;
  baseUnit: 'kg' | 'cm' | 'percent';
  category: 'weight' | 'composition' | 'upper' | 'lower';
}

export const BODY_MEASUREMENT_FIELDS: MeasurementFieldConfig[] = [
  { key: 'weight_kg', label: 'Weight', baseUnit: 'kg', category: 'weight' },
  { key: 'body_fat_percentage', label: 'Body Fat', baseUnit: 'percent', category: 'composition' },
  { key: 'lean_mass_kg', label: 'Lean Mass', baseUnit: 'kg', category: 'composition' },
  { key: 'neck_cm', label: 'Neck', baseUnit: 'cm', category: 'upper' },
  { key: 'shoulders_cm', label: 'Shoulders', baseUnit: 'cm', category: 'upper' },
  { key: 'chest_cm', label: 'Chest', baseUnit: 'cm', category: 'upper' },
  { key: 'left_bicep_cm', label: 'Left Bicep', baseUnit: 'cm', category: 'upper' },
  { key: 'right_bicep_cm', label: 'Right Bicep', baseUnit: 'cm', category: 'upper' },
  { key: 'left_forearm_cm', label: 'Left Forearm', baseUnit: 'cm', category: 'upper' },
  { key: 'right_forearm_cm', label: 'Right Forearm', baseUnit: 'cm', category: 'upper' },
  { key: 'waist_cm', label: 'Waist', baseUnit: 'cm', category: 'lower' },
  { key: 'hips_cm', label: 'Hips', baseUnit: 'cm', category: 'lower' },
  { key: 'left_thigh_cm', label: 'Left Thigh', baseUnit: 'cm', category: 'lower' },
  { key: 'right_thigh_cm', label: 'Right Thigh', baseUnit: 'cm', category: 'lower' },
  { key: 'left_calf_cm', label: 'Left Calf', baseUnit: 'cm', category: 'lower' },
  { key: 'right_calf_cm', label: 'Right Calf', baseUnit: 'cm', category: 'lower' },
];

/**
 * Get display unit for a measurement field
 */
export function getDisplayUnitForField(
  field: MeasurementFieldConfig,
  units: { weight: WeightUnit; height: HeightUnit }
): string {
  switch (field.baseUnit) {
    case 'kg':
      return units.weight;
    case 'cm':
      return getLengthUnitFromHeightPref(units.height);
    case 'percent':
      return '%';
    default:
      return '';
  }
}

/**
 * Convert a measurement value for display
 */
export function convertMeasurementForDisplay(
  value: number,
  field: MeasurementFieldConfig,
  units: { weight: WeightUnit; height: HeightUnit }
): number {
  switch (field.baseUnit) {
    case 'kg':
      return convertWeight(value, units.weight);
    case 'cm':
      return convertLength(value, getLengthUnitFromHeightPref(units.height));
    case 'percent':
      return value; // No conversion needed
    default:
      return value;
  }
}

/**
 * Convert a measurement value from display unit to storage unit
 */
export function convertMeasurementToStorage(
  value: number,
  field: MeasurementFieldConfig,
  units: { weight: WeightUnit; height: HeightUnit }
): number {
  switch (field.baseUnit) {
    case 'kg':
      return weightToKg(value, units.weight);
    case 'cm':
      return lengthToCm(value, getLengthUnitFromHeightPref(units.height));
    case 'percent':
      return value; // No conversion needed
    default:
      return value;
  }
}
