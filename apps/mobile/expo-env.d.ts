/// <reference types="expo/types" />

declare module '*.otf' {
  const content: number;
  export default content;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL?: string;
    }
  }
}

// Type declarations for native health packages
declare module 'react-native-health' {
  export interface HealthKitPermissions {
    permissions: {
      read: string[];
      write: string[];
    };
  }

  export interface HealthValue {
    value: number;
    startDate: string;
    endDate: string;
    id?: string;
    metadata?: Record<string, unknown>;
  }

  export interface HealthInputOptions {
    startDate?: string;
    endDate?: string;
    date?: string;
    ascending?: boolean;
    limit?: number;
    includeManuallyAdded?: boolean;
    unit?: string;
    type?: string;
  }

  export interface HealthActivitySummary {
    activeEnergyBurned: number;
    activeEnergyBurnedGoal: number;
    appleExerciseTime: number;
    appleExerciseTimeGoal: number;
    appleStandHours: number;
    appleStandHoursGoal: number;
  }

  interface AppleHealthKit {
    Constants: {
      Permissions: Record<string, string>;
    };
    isAvailable: boolean;
    initHealthKit(
      permissions: HealthKitPermissions,
      callback: (error: string | null) => void
    ): void;
    getHeartRateSamples(
      options: HealthInputOptions,
      callback: (error: string | null, results: HealthValue[] | null) => void
    ): void;
    getStepCount(
      options: { date: string; includeManuallyAdded?: boolean },
      callback: (error: string | null, results: { value: number } | null) => void
    ): void;
    getSamples(
      options: HealthInputOptions,
      callback: (error: string | null, results: unknown[] | null) => void
    ): void;
    getSleepSamples(
      options: HealthInputOptions,
      callback: (error: string | null, results: unknown[] | null) => void
    ): void;
    getLatestWeight(
      options: { unit?: string },
      callback: (error: string | null, results: { value: number } | null) => void
    ): void;
    getLatestBodyFatPercentage(
      options: Record<string, unknown>,
      callback: (error: string | null, results: { value: number } | null) => void
    ): void;
    saveWorkout(
      options: {
        type: string;
        startDate: string;
        endDate: string;
        energyBurned?: number;
        distance?: number;
      },
      callback: (error: string | null, results: unknown) => void
    ): void;
  }

  const AppleHealthKit: AppleHealthKit;
  export default AppleHealthKit;
}

declare module 'react-native-health-connect' {
  export enum SdkAvailabilityStatus {
    SDK_UNAVAILABLE = 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2,
    SDK_AVAILABLE = 3,
  }

  export interface Permission {
    accessType: 'read' | 'write';
    recordType: string;
  }

  export type RecordType =
    | 'HeartRate'
    | 'RestingHeartRate'
    | 'Steps'
    | 'Distance'
    | 'ActiveCaloriesBurned'
    | 'TotalCaloriesBurned'
    | 'ExerciseSession'
    | 'SleepSession'
    | 'Weight'
    | 'BodyFat'
    | 'Height';

  export interface TimeRangeFilter {
    operator: 'between' | 'before' | 'after';
    startTime?: string;
    endTime?: string;
  }

  export interface ReadRecordsOptions {
    timeRangeFilter: TimeRangeFilter;
    ascendingOrder?: boolean;
    pageSize?: number;
  }

  export function initialize(): Promise<boolean>;
  export function requestPermission(permissions: Permission[]): Promise<Permission[]>;
  export function getSdkStatus(): Promise<SdkAvailabilityStatus>;
  export function readRecords(recordType: string, options: ReadRecordsOptions): Promise<unknown[]>;
  export function insertRecords(records: unknown[]): Promise<void>;
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }

  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }

  export function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}
