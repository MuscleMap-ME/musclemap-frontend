export * from './errors.js';
export * from './ranks.js';
export * from './illustrations.js';
export * from './result.js';
export * from './preferences.js';
// Export units but exclude types already exported from preferences
export {
  // Additional types not in preferences
  type HeightUnit,
  type LengthUnit,
  type TemperatureUnit,
  // Conversion constants
  CONVERSIONS,
  // Weight conversions
  kgToLbs,
  lbsToKg,
  convertWeight,
  weightToKg,
  // Length/height conversions
  cmToIn,
  inToCm,
  cmToFtIn,
  ftInToCm,
  convertLength,
  lengthToCm,
  convertHeight,
  // Distance conversions
  kmToMi,
  miToKm,
  convertDistance,
  // Temperature conversions
  cToF,
  fToC,
  // Formatting utilities
  formatWeight,
  formatLength,
  formatDistance,
  // Labels
  UNIT_LABELS,
  getMeasurementLabel,
  getLengthUnitFromHeightPref,
  // Body measurement helpers
  type MeasurementFieldConfig,
  BODY_MEASUREMENT_FIELDS,
  getDisplayUnitForField,
  convertMeasurementForDisplay,
  convertMeasurementToStorage,
} from './units.js';
