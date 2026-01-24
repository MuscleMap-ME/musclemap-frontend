/**
 * Body Measurements Page
 *
 * Track body measurements over time - like Hevy/Strong.
 * Features:
 * - Weight and body composition
 * - Circumference measurements (arms, chest, waist, etc.)
 * - Progress charts and comparisons
 * - History view
 * - Supports both metric (kg/cm) and imperial (lbs/in) units
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Ruler,
  Scale,
  Target,
  Edit,
  Trash2,
  X,
  ChevronDown,
  Activity,
  Settings2,
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { useUnitsPreferences } from '../store/preferencesStore';
import { useToast } from '../hooks';
import {
  BODY_MEASUREMENTS_QUERY,
  LATEST_BODY_MEASUREMENT_QUERY,
  BODY_MEASUREMENT_COMPARISON_QUERY,
} from '../graphql/queries';
import {
  CREATE_BODY_MEASUREMENT_MUTATION,
  UPDATE_BODY_MEASUREMENT_MUTATION,
  DELETE_BODY_MEASUREMENT_MUTATION,
} from '../graphql/mutations';
import {
  convertWeight,
  weightToKg,
  convertLength,
  lengthToCm,
  getLengthUnitFromHeightPref,
  type WeightUnit,
  type LengthUnit,
} from '@musclemap/shared';

// Types - GraphQL uses camelCase
interface BodyMeasurement {
  id: string;
  userId: string;
  weightKg?: number;
  bodyFatPercentage?: number;
  leanMassKg?: number;
  neckCm?: number;
  shouldersCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  leftBicepCm?: number;
  rightBicepCm?: number;
  leftForearmCm?: number;
  rightForearmCm?: number;
  leftThighCm?: number;
  rightThighCm?: number;
  leftCalfCm?: number;
  rightCalfCm?: number;
  measurementSource: string;
  notes?: string;
  measurementDate: string;
  createdAt: string;
}

interface ComparisonField {
  current?: number;
  past?: number;
  change?: number;
  changePercent?: string;
}

interface BodyMeasurementComparison {
  weightKg?: ComparisonField;
  bodyFatPercentage?: ComparisonField;
  leanMassKg?: ComparisonField;
  neckCm?: ComparisonField;
  shouldersCm?: ComparisonField;
  chestCm?: ComparisonField;
  waistCm?: ComparisonField;
  hipsCm?: ComparisonField;
  leftBicepCm?: ComparisonField;
  rightBicepCm?: ComparisonField;
  leftForearmCm?: ComparisonField;
  rightForearmCm?: ComparisonField;
  leftThighCm?: ComparisonField;
  rightThighCm?: ComparisonField;
  leftCalfCm?: ComparisonField;
  rightCalfCm?: ComparisonField;
  currentDate?: string;
  pastDate?: string;
  daysBetween?: number;
}

interface MeasurementField {
  key: keyof BodyMeasurement;
  label: string;
  baseUnit: 'kg' | 'cm' | 'percent';
  category: 'weight' | 'composition' | 'upper' | 'lower';
  icon: React.ComponentType<{ className?: string }>;
}

// Measurement field configuration - uses base storage units
const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'weightKg', label: 'Weight', baseUnit: 'kg', category: 'weight', icon: Scale },
  { key: 'bodyFatPercentage', label: 'Body Fat', baseUnit: 'percent', category: 'composition', icon: Activity },
  { key: 'leanMassKg', label: 'Lean Mass', baseUnit: 'kg', category: 'composition', icon: Target },
  { key: 'neckCm', label: 'Neck', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'shouldersCm', label: 'Shoulders', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'chestCm', label: 'Chest', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'leftBicepCm', label: 'Left Bicep', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'rightBicepCm', label: 'Right Bicep', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'leftForearmCm', label: 'Left Forearm', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'rightForearmCm', label: 'Right Forearm', baseUnit: 'cm', category: 'upper', icon: Ruler },
  { key: 'waistCm', label: 'Waist', baseUnit: 'cm', category: 'lower', icon: Ruler },
  { key: 'hipsCm', label: 'Hips', baseUnit: 'cm', category: 'lower', icon: Ruler },
  { key: 'leftThighCm', label: 'Left Thigh', baseUnit: 'cm', category: 'lower', icon: Ruler },
  { key: 'rightThighCm', label: 'Right Thigh', baseUnit: 'cm', category: 'lower', icon: Ruler },
  { key: 'leftCalfCm', label: 'Left Calf', baseUnit: 'cm', category: 'lower', icon: Ruler },
  { key: 'rightCalfCm', label: 'Right Calf', baseUnit: 'cm', category: 'lower', icon: Ruler },
];

// Helper to get display unit for a field
function getDisplayUnit(
  field: MeasurementField,
  weightUnit: WeightUnit,
  lengthUnit: LengthUnit
): string {
  switch (field.baseUnit) {
    case 'kg':
      return weightUnit;
    case 'cm':
      return lengthUnit;
    case 'percent':
      return '%';
    default:
      return '';
  }
}

// Helper to convert storage value to display value
function toDisplayValue(
  value: number,
  baseUnit: 'kg' | 'cm' | 'percent',
  weightUnit: WeightUnit,
  lengthUnit: LengthUnit
): number {
  switch (baseUnit) {
    case 'kg':
      return convertWeight(value, weightUnit);
    case 'cm':
      return convertLength(value, lengthUnit);
    case 'percent':
      return value;
    default:
      return value;
  }
}

// Helper to convert display value to storage value
function toStorageValue(
  value: number,
  baseUnit: 'kg' | 'cm' | 'percent',
  weightUnit: WeightUnit,
  lengthUnit: LengthUnit
): number {
  switch (baseUnit) {
    case 'kg':
      return weightToKg(value, weightUnit);
    case 'cm':
      return lengthToCm(value, lengthUnit);
    case 'percent':
      return value;
    default:
      return value;
  }
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'weight', label: 'Weight' },
  { id: 'composition', label: 'Body Comp' },
  { id: 'upper', label: 'Upper Body' },
  { id: 'lower', label: 'Lower Body' },
];

export default function BodyMeasurements() {
  const { isAuthenticated } = useAuth();
  const { toast, error: showError } = useToast();
  const { weight: weightUnit, height: heightPref, setWeightUnit, setHeightUnit } = useUnitsPreferences();

  // Derive length unit from height preference
  const lengthUnit: LengthUnit = getLengthUnitFromHeightPref(heightPref);

  const [comparisonDays, setComparisonDays] = useState(30);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showUnitSettings, setShowUnitSettings] = useState(false);

  // New measurement form - stores values in DISPLAY units (user's preference)
  const [newMeasurement, setNewMeasurement] = useState<Partial<BodyMeasurement>>({
    measurementDate: new Date().toISOString().split('T')[0],
  });
  // Track which unit was used when the form was opened (for editing)
  const [formUnits, setFormUnits] = useState<{ weight: WeightUnit; length: LengthUnit }>({
    weight: weightUnit,
    length: lengthUnit,
  });

  // GraphQL Queries
  const { data: measurementsData, refetch: refetchMeasurements } = useQuery(BODY_MEASUREMENTS_QUERY, {
    variables: { limit: 100 },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { data: latestData, refetch: refetchLatest } = useQuery(LATEST_BODY_MEASUREMENT_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { data: comparisonData, refetch: refetchComparison } = useQuery(BODY_MEASUREMENT_COMPARISON_QUERY, {
    variables: { days: comparisonDays },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL Mutations
  const [createMeasurement] = useMutation(CREATE_BODY_MEASUREMENT_MUTATION, {
    onCompleted: () => {
      toast('Measurement added!');
      setShowAddModal(false);
      setEditingMeasurement(null);
      setNewMeasurement({ measurementDate: new Date().toISOString().split('T')[0] });
      refetchMeasurements();
      refetchLatest();
      refetchComparison();
    },
    onError: () => showError('Failed to save measurement'),
  });

  const [updateMeasurement] = useMutation(UPDATE_BODY_MEASUREMENT_MUTATION, {
    onCompleted: () => {
      toast('Measurement updated!');
      setShowAddModal(false);
      setEditingMeasurement(null);
      setNewMeasurement({ measurementDate: new Date().toISOString().split('T')[0] });
      refetchMeasurements();
      refetchLatest();
      refetchComparison();
    },
    onError: () => showError('Failed to update measurement'),
  });

  const [deleteMeasurement] = useMutation(DELETE_BODY_MEASUREMENT_MUTATION, {
    onCompleted: () => {
      toast('Measurement deleted');
      refetchMeasurements();
      refetchLatest();
      refetchComparison();
    },
    onError: () => showError('Failed to delete measurement'),
  });

  // Extract data from queries
  const measurements = useMemo<BodyMeasurement[]>(
    () => measurementsData?.bodyMeasurements?.measurements || [],
    [measurementsData?.bodyMeasurements?.measurements]
  );

  const latestMeasurement = useMemo<BodyMeasurement | null>(
    () => latestData?.latestBodyMeasurement || null,
    [latestData?.latestBodyMeasurement]
  );

  const comparison = useMemo<BodyMeasurementComparison | null>(
    () => comparisonData?.bodyMeasurementComparison || null,
    [comparisonData?.bodyMeasurementComparison]
  );

  const loading = !measurementsData && !latestData;

  // Handlers
  const handleSaveMeasurement = async () => {
    // Check if at least one measurement value is provided
    const hasValue = MEASUREMENT_FIELDS.some(f =>
      newMeasurement[f.key] !== undefined && newMeasurement[f.key] !== null && newMeasurement[f.key] !== ''
    );

    if (!hasValue) {
      showError('Please enter at least one measurement');
      return;
    }

    if (!newMeasurement.measurementDate) {
      showError('Please select a date');
      return;
    }

    // Convert display values to storage units (kg/cm)
    const input: Record<string, number | string | undefined> = {
      measurementDate: newMeasurement.measurementDate,
      notes: newMeasurement.notes,
    };

    // Convert each field from display units to storage units
    for (const field of MEASUREMENT_FIELDS) {
      const displayValue = newMeasurement[field.key] as number | undefined;
      if (displayValue !== undefined && displayValue !== null) {
        input[field.key] = toStorageValue(
          displayValue,
          field.baseUnit,
          formUnits.weight,
          formUnits.length
        );
      }
    }

    if (editingMeasurement) {
      await updateMeasurement({
        variables: { id: editingMeasurement.id, input },
      });
    } else {
      await createMeasurement({
        variables: { input },
      });
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm('Delete this measurement?')) return;
    await deleteMeasurement({ variables: { id } });
  };

  const handleEditMeasurement = (measurement: BodyMeasurement) => {
    setEditingMeasurement(measurement);
    // Store current units when opening the form
    setFormUnits({ weight: weightUnit, length: lengthUnit });

    // Convert storage values to display values
    const displayData: Partial<BodyMeasurement> = {
      measurementDate: measurement.measurementDate.split('T')[0],
      notes: measurement.notes,
    };

    for (const field of MEASUREMENT_FIELDS) {
      const storageValue = measurement[field.key] as number | undefined;
      if (storageValue !== undefined && storageValue !== null) {
        (displayData as Record<string, number>)[field.key] = toDisplayValue(
          storageValue,
          field.baseUnit,
          weightUnit,
          lengthUnit
        );
      }
    }

    setNewMeasurement(displayData);
    setShowAddModal(true);
  };

  // Refetch comparison when days change
  React.useEffect(() => {
    if (isAuthenticated) {
      refetchComparison({ days: comparisonDays });
    }
  }, [comparisonDays, isAuthenticated, refetchComparison]);

  // Filter fields by category
  const filteredFields = useMemo(() => {
    if (activeCategory === 'all') return MEASUREMENT_FIELDS;
    return MEASUREMENT_FIELDS.filter(f => f.category === activeCategory);
  }, [activeCategory]);

  // Get trend indicator
  const getTrend = (change: number | null | undefined, inverse = false) => {
    if (change === null || change === undefined || change === 0) {
      return { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-500/20' };
    }
    const isPositive = inverse ? change < 0 : change > 0;
    if (isPositive) {
      return { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' };
    }
    return { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Sign in Required</h2>
          <p className="text-gray-400 mb-4">Please sign in to track body measurements</p>
          <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/stats" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Body Measurements</h1>
                <p className="text-sm text-gray-400">
                  Track your progress over time
                  <span className="ml-2 px-2 py-0.5 bg-gray-800 rounded text-xs">
                    {weightUnit === 'kg' ? 'Metric' : 'Imperial'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUnitSettings(true)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                title="Unit settings"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditingMeasurement(null);
                  setFormUnits({ weight: weightUnit, length: lengthUnit });
                  setNewMeasurement({ measurementDate: new Date().toISOString().split('T')[0] });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Tips Banner */}
        {measurements.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">📏</span>
              <div>
                <h3 className="font-medium text-white mb-1">Track Your Body Transformation</h3>
                <p className="text-sm text-gray-300">
                  Measure consistently (weekly or bi-weekly) at the same time of day for accurate progress tracking.
                  Track more than just weight - circumferences show muscle growth!
                </p>
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-2 py-1 bg-white/10 rounded-lg">⏰ Measure in the morning</span>
                  <span className="px-2 py-1 bg-white/10 rounded-lg">📊 Compare over 30+ days</span>
                  <span className="px-2 py-1 bg-white/10 rounded-lg">💪 Track arm & leg gains</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : latestMeasurement === null ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900 flex items-center justify-center">
              <Scale className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No measurements yet</h3>
            <p className="text-gray-500 mb-4">Start tracking your body measurements</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Add First Measurement
            </button>
          </div>
        ) : (
          <>
            {/* Comparison period selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Progress</h2>
              <select
                value={comparisonDays}
                onChange={(e) => setComparisonDays(parseInt(e.target.value))}
                className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm"
              >
                <option value={7}>vs 7 days ago</option>
                <option value={30}>vs 30 days ago</option>
                <option value={90}>vs 90 days ago</option>
                <option value={180}>vs 6 months ago</option>
                <option value={365}>vs 1 year ago</option>
              </select>
            </div>

            {/* Measurement cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredFields.map((field) => {
                const storageValue = latestMeasurement[field.key] as number | undefined;
                const compData = comparison?.[field.key as keyof BodyMeasurementComparison] as ComparisonField | undefined;
                const change = compData?.change;
                const changePercent = compData?.changePercent;
                const isWeightOrWaist = field.key === 'weightKg' || field.key === 'waistCm';
                const trend = getTrend(change, isWeightOrWaist);
                const TrendIcon = trend.icon;
                const FieldIcon = field.icon;

                if (storageValue === null || storageValue === undefined) return null;

                // Convert to display units
                const displayValue = toDisplayValue(storageValue, field.baseUnit, weightUnit, lengthUnit);
                const displayUnit = getDisplayUnit(field, weightUnit, lengthUnit);

                // Convert change to display units too
                let displayChange: number | null = null;
                if (change !== null && change !== undefined) {
                  displayChange = toDisplayValue(Math.abs(change), field.baseUnit, weightUnit, lengthUnit);
                  if (change < 0) displayChange = -displayChange;
                }

                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 rounded-xl p-4 border border-gray-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-800 rounded-lg">
                          <FieldIcon className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-400">{field.label}</span>
                      </div>
                      {displayChange !== null && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trend.bg}`}>
                          <TrendIcon className={`w-3.5 h-3.5 ${trend.color}`} />
                          <span className={`text-xs font-medium ${trend.color}`}>
                            {displayChange > 0 ? '+' : ''}{displayChange.toFixed(1)} ({changePercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{displayValue.toFixed(1)}</span>
                      <span className="text-gray-500">{displayUnit}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* History section */}
            <div className="mt-8">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Measurement History</span>
                  <span className="text-sm text-gray-500">({measurements.length} entries)</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {measurements.slice(0, 20).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(m.measurementDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                              {m.weightKg && (
                                <span>
                                  Weight: {convertWeight(m.weightKg, weightUnit).toFixed(1)}{weightUnit}
                                </span>
                              )}
                              {m.bodyFatPercentage && <span>BF: {m.bodyFatPercentage}%</span>}
                              {m.chestCm && (
                                <span>
                                  Chest: {convertLength(m.chestCm, lengthUnit).toFixed(1)}{lengthUnit}
                                </span>
                              )}
                              {m.waistCm && (
                                <span>
                                  Waist: {convertLength(m.waistCm, lengthUnit).toFixed(1)}{lengthUnit}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditMeasurement(m)}
                              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMeasurement(m.id)}
                              className="p-2 hover:bg-gray-800 rounded-lg text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <div className="min-h-screen flex items-start justify-center p-4 pt-20">
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <h2 className="text-lg font-bold">
                    {editingMeasurement ? 'Edit Measurement' : 'Add Measurement'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingMeasurement(null);
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={newMeasurement.measurementDate || ''}
                      onChange={(e) => setNewMeasurement({ ...newMeasurement, measurementDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                  </div>

                  {/* Measurements by category */}
                  {CATEGORIES.slice(1).map((cat) => (
                    <div key={cat.id}>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">{cat.label}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {MEASUREMENT_FIELDS.filter((f) => f.category === cat.id).map((field) => {
                          const displayUnit = getDisplayUnit(field, formUnits.weight, formUnits.length);
                          return (
                            <div key={field.key}>
                              <label className="block text-xs text-gray-500 mb-1">
                                {field.label} ({displayUnit})
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={(newMeasurement[field.key] as number | undefined) ?? ''}
                                onChange={(e) =>
                                  setNewMeasurement({
                                    ...newMeasurement,
                                    [field.key]: e.target.value ? parseFloat(e.target.value) : undefined,
                                  })
                                }
                                placeholder="—"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                    <textarea
                      value={newMeasurement.notes || ''}
                      onChange={(e) => setNewMeasurement({ ...newMeasurement, notes: e.target.value })}
                      placeholder="Optional notes..."
                      rows={2}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingMeasurement(null);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMeasurement}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                  >
                    {editingMeasurement ? 'Update' : 'Save'}
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unit Settings Modal */}
      <AnimatePresence>
        {showUnitSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowUnitSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold">Unit Preferences</h2>
                <p className="text-sm text-gray-400">Choose your preferred measurement units</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Weight Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Weight</label>
                  <div className="flex bg-gray-800 rounded-xl p-1">
                    {(['kg', 'lbs'] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setWeightUnit(u)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          weightUnit === u
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length/Height Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Height & Circumferences</label>
                  <div className="flex bg-gray-800 rounded-xl p-1">
                    {(['cm', 'ft_in'] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setHeightUnit(u)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          heightPref === u
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {u === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick presets */}
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">Quick presets</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setWeightUnit('kg');
                        setHeightUnit('cm');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        weightUnit === 'kg' && heightPref === 'cm'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Metric (kg/cm)
                    </button>
                    <button
                      onClick={() => {
                        setWeightUnit('lbs');
                        setHeightUnit('ft_in');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        weightUnit === 'lbs' && heightPref === 'ft_in'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Imperial (lbs/in)
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => setShowUnitSettings(false)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
