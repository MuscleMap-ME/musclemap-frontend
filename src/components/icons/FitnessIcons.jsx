/**
 * MuscleMap Custom Fitness Icons
 *
 * Hand-crafted SVG icons for fitness-specific use cases
 * that aren't available in standard icon libraries.
 *
 * All icons:
 * - Use currentColor for easy theming
 * - Default to 24x24 viewBox
 * - Accept size, color, strokeWidth, and className props
 */

import { forwardRef } from 'react';
import { getIconSize, getIconColor, getIconWeight } from './iconTheme';

// Base icon wrapper
const IconBase = forwardRef(function IconBase(
  { children, size = 24, color, strokeWidth = 1.5, className = '', viewBox = '0 0 24 24', ...props },
  ref
) {
  const computedSize = getIconSize(size);
  const computedColor = getIconColor(color);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={computedSize}
      height={computedSize}
      viewBox={viewBox}
      fill="none"
      stroke={computedColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mm-icon mm-fitness-icon ${className}`.trim()}
      {...props}
    >
      {children}
    </svg>
  );
});

// ============================================
// MUSCLE GROUP ICONS
// ============================================

export const MuscleChest = forwardRef(function MuscleChest(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Pectoral muscles outline */}
      <path d="M12 4C8 4 5 6 4 8c-1 2-1 4 0 6 1 2 3 3 5 3h6c2 0 4-1 5-3 1-2 1-4 0-6-1-2-4-4-8-4z" />
      <path d="M12 4v13" />
      <path d="M7 8c1 2 2 4 5 5" />
      <path d="M17 8c-1 2-2 4-5 5" />
    </IconBase>
  );
});

export const MuscleBack = forwardRef(function MuscleBack(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Back muscles - lats and traps */}
      <path d="M12 3v18" />
      <path d="M8 5c-2 1-4 3-4 7s2 6 4 7" />
      <path d="M16 5c2 1 4 3 4 7s-2 6-4 7" />
      <path d="M8 9c1 1 2 2 4 2s3-1 4-2" />
      <path d="M8 15c1-1 2-2 4-2s3 1 4 2" />
    </IconBase>
  );
});

export const MuscleShoulders = forwardRef(function MuscleShoulders(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Deltoid muscles */}
      <circle cx="6" cy="10" r="4" />
      <circle cx="18" cy="10" r="4" />
      <path d="M10 10h4" />
      <path d="M12 6v8" />
    </IconBase>
  );
});

export const MuscleArms = forwardRef(function MuscleArms(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Bicep/arm muscle */}
      <path d="M6 20c0-4 2-6 4-8 2-2 2-4 2-6" />
      <path d="M18 20c0-4-2-6-4-8-2-2-2-4-2-6" />
      <ellipse cx="8" cy="12" rx="2" ry="3" />
      <ellipse cx="16" cy="12" rx="2" ry="3" />
    </IconBase>
  );
});

export const MuscleBicep = forwardRef(function MuscleBicep(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Flexed bicep */}
      <path d="M5 18c0-3 1-5 3-7" />
      <path d="M8 11c2-3 4-5 6-5" />
      <path d="M14 6c2 0 3 1 4 3" />
      <path d="M18 9c1 2 1 4 0 6" />
      <path d="M18 15c-1 2-3 3-5 3" />
      <ellipse cx="12" cy="11" rx="3" ry="4" />
    </IconBase>
  );
});

export const MuscleLegs = forwardRef(function MuscleLegs(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Quadriceps/legs */}
      <path d="M8 4v16" />
      <path d="M16 4v16" />
      <ellipse cx="8" cy="10" rx="2" ry="4" />
      <ellipse cx="16" cy="10" rx="2" ry="4" />
      <ellipse cx="8" cy="16" rx="1.5" ry="2" />
      <ellipse cx="16" cy="16" rx="1.5" ry="2" />
    </IconBase>
  );
});

export const MuscleCore = forwardRef(function MuscleCore(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Abs/core muscles */}
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h10" />
      <path d="M7 16h10" />
      <path d="M12 4v16" />
    </IconBase>
  );
});

export const MuscleGlutes = forwardRef(function MuscleGlutes(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Glute muscles */}
      <ellipse cx="8" cy="12" rx="4" ry="5" />
      <ellipse cx="16" cy="12" rx="4" ry="5" />
      <path d="M12 7v10" />
    </IconBase>
  );
});

// ============================================
// EXERCISE TYPE ICONS
// ============================================

export const ExercisePush = forwardRef(function ExercisePush(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Push-up position */}
      <path d="M4 16h3l2-4 6 0 2 4h3" />
      <circle cx="6" cy="8" r="2" />
      <path d="M8 10l4 2" />
      <path d="M12 12l6-2" />
    </IconBase>
  );
});

export const ExercisePull = forwardRef(function ExercisePull(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Pull-up position */}
      <path d="M4 4h16" />
      <path d="M8 4v4" />
      <path d="M16 4v4" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 12v4" />
      <path d="M9 20l3-4 3 4" />
    </IconBase>
  );
});

export const ExerciseSquat = forwardRef(function ExerciseSquat(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Squat position */}
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v3" />
      <path d="M8 10h8" />
      <path d="M8 10c-1 3-2 6-2 8" />
      <path d="M16 10c1 3 2 6 2 8" />
      <path d="M6 18h4" />
      <path d="M14 18h4" />
    </IconBase>
  );
});

export const ExerciseCardio = forwardRef(function ExerciseCardio(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Running figure */}
      <circle cx="12" cy="5" r="2" />
      <path d="M9 9l3 3 4-2" />
      <path d="M12 12l-2 8" />
      <path d="M12 12l4 6" />
      <path d="M6 20l4-3" />
      <path d="M18 17l-2 1" />
    </IconBase>
  );
});

export const ExerciseStretch = forwardRef(function ExerciseStretch(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Stretching figure */}
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5" />
      <path d="M8 9l4 1 4-1" />
      <path d="M6 20l6-8 6 8" />
    </IconBase>
  );
});

// ============================================
// EQUIPMENT ICONS
// ============================================

export const EquipmentBarbell = forwardRef(function EquipmentBarbell(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Barbell with plates */}
      <rect x="2" y="8" width="3" height="8" rx="1" />
      <rect x="19" y="8" width="3" height="8" rx="1" />
      <rect x="5" y="10" width="2" height="4" rx="0.5" />
      <rect x="17" y="10" width="2" height="4" rx="0.5" />
      <path d="M7 12h10" />
    </IconBase>
  );
});

export const EquipmentDumbbell = forwardRef(function EquipmentDumbbell(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Dumbbell */}
      <rect x="2" y="9" width="4" height="6" rx="1" />
      <rect x="18" y="9" width="4" height="6" rx="1" />
      <path d="M6 12h12" />
    </IconBase>
  );
});

export const EquipmentKettlebell = forwardRef(function EquipmentKettlebell(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Kettlebell */}
      <circle cx="12" cy="15" r="6" />
      <path d="M9 9c0-2 1-3 3-3s3 1 3 3" />
      <path d="M9 9v2" />
      <path d="M15 9v2" />
    </IconBase>
  );
});

export const EquipmentBand = forwardRef(function EquipmentBand(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Resistance band */}
      <path d="M4 8c4 4 4 8 0 12" />
      <path d="M20 8c-4 4-4 8 0 12" />
      <path d="M4 14h16" />
      <circle cx="4" cy="14" r="2" />
      <circle cx="20" cy="14" r="2" />
    </IconBase>
  );
});

export const EquipmentMat = forwardRef(function EquipmentMat(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Yoga/exercise mat */}
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <path d="M3 12h18" />
      <path d="M6 8v8" />
      <path d="M18 8v8" />
    </IconBase>
  );
});

export const EquipmentTreadmill = forwardRef(function EquipmentTreadmill(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Treadmill */}
      <rect x="3" y="14" width="18" height="4" rx="1" />
      <path d="M5 14V8" />
      <path d="M5 8h6" />
      <path d="M8 8v3" />
      <circle cx="6" cy="18" r="1" />
      <circle cx="18" cy="18" r="1" />
    </IconBase>
  );
});

// ============================================
// PROGRESS & METRICS ICONS
// ============================================

export const MetricReps = forwardRef(function MetricReps(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Rep counter */}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
      <path d="M8 16l2-2" />
      <path d="M14 16l2 2" />
    </IconBase>
  );
});

export const MetricSets = forwardRef(function MetricSets(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Multiple sets indicator */}
      <rect x="3" y="4" width="6" height="6" rx="1" />
      <rect x="15" y="4" width="6" height="6" rx="1" />
      <rect x="3" y="14" width="6" height="6" rx="1" />
      <rect x="15" y="14" width="6" height="6" rx="1" />
    </IconBase>
  );
});

export const MetricWeight = forwardRef(function MetricWeight(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Weight plate */}
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </IconBase>
  );
});

export const MetricTime = forwardRef(function MetricTime(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Stopwatch */}
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M12 5V3" />
      <path d="M10 3h4" />
      <path d="M18 7l2-2" />
    </IconBase>
  );
});

export const MetricDistance = forwardRef(function MetricDistance(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Distance/route */}
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 16V8c0-2 2-4 4-4h4c2 0 4 2 4 4v8" />
    </IconBase>
  );
});

export const MetricCalories = forwardRef(function MetricCalories(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Flame/calories */}
      <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 4-7 1-1 2-3 2-5 0 3 2 5 4 7 2 2 4 4 4 7 0 4-3 7-7 7z" />
      <path d="M12 22c-2 0-3-1.5-3-3.5 0-1.5 1-2.5 2-3.5.5-.5 1-1.5 1-2.5 0 1.5 1 2.5 2 3.5 1 1 2 2 2 3.5 0 2-1 3.5-3 3.5z" />
    </IconBase>
  );
});

// ============================================
// BODY COMPOSITION ICONS
// ============================================

export const BodyFat = forwardRef(function BodyFat(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Body fat measurement */}
      <ellipse cx="12" cy="12" rx="6" ry="8" />
      <path d="M8 10c0 2 2 4 4 4s4-2 4-4" />
      <path d="M10 8h4" />
    </IconBase>
  );
});

export const BodyMuscle = forwardRef(function BodyMuscle(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Muscle mass */}
      <path d="M7 4c-2 0-3 2-3 4v8c0 2 1 4 3 4" />
      <path d="M17 4c2 0 3 2 3 4v8c0 2-1 4-3 4" />
      <rect x="7" y="6" width="10" height="12" rx="2" />
      <path d="M7 10h10" />
      <path d="M7 14h10" />
    </IconBase>
  );
});

export const BodyScale = forwardRef(function BodyScale(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Weight scale */}
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <circle cx="12" cy="15" r="3" />
      <path d="M12 13v2" />
      <path d="M4 6h16" />
      <path d="M8 6V4" />
      <path d="M16 6V4" />
    </IconBase>
  );
});

// ============================================
// WORKOUT STATUS ICONS
// ============================================

export const WorkoutActive = forwardRef(function WorkoutActive(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Active workout indicator */}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
      <path d="M17 12h2" />
      <path d="M5 12h2" />
      <path d="M12 5V3" />
    </IconBase>
  );
});

export const WorkoutRest = forwardRef(function WorkoutRest(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Rest period */}
      <circle cx="12" cy="12" r="9" />
      <path d="M10 10h4v4h-4z" />
    </IconBase>
  );
});

export const WorkoutComplete = forwardRef(function WorkoutComplete(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Completed workout */}
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </IconBase>
  );
});

export const WorkoutSkipped = forwardRef(function WorkoutSkipped(props, ref) {
  return (
    <IconBase ref={ref} {...props}>
      {/* Skipped workout */}
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8l8 8" />
      <path d="M8 14l2-2" />
    </IconBase>
  );
});

// ============================================
// EXPORT ALL
// ============================================

const FitnessIcons = {
  // Muscle groups
  MuscleChest,
  MuscleBack,
  MuscleShoulders,
  MuscleArms,
  MuscleBicep,
  MuscleLegs,
  MuscleCore,
  MuscleGlutes,

  // Exercise types
  ExercisePush,
  ExercisePull,
  ExerciseSquat,
  ExerciseCardio,
  ExerciseStretch,

  // Equipment
  EquipmentBarbell,
  EquipmentDumbbell,
  EquipmentKettlebell,
  EquipmentBand,
  EquipmentMat,
  EquipmentTreadmill,

  // Metrics
  MetricReps,
  MetricSets,
  MetricWeight,
  MetricTime,
  MetricDistance,
  MetricCalories,

  // Body composition
  BodyFat,
  BodyMuscle,
  BodyScale,

  // Workout status
  WorkoutActive,
  WorkoutRest,
  WorkoutComplete,
  WorkoutSkipped,
};

export default FitnessIcons;
