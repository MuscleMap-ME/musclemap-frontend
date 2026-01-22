/**
 * Body Measurements Page
 *
 * Track body measurements over time - like Hevy/Strong.
 * Features:
 * - Weight and body composition
 * - Circumference measurements (arms, chest, waist, etc.)
 * - Progress charts and comparisons
 * - History view
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { useToast } from '../hooks';
import api from '../utils/api';

// Types
interface Measurement {
  id: string;
  user_id: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  lean_mass_kg?: number;
  neck_cm?: number;
  shoulders_cm?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_bicep_cm?: number;
  right_bicep_cm?: number;
  left_forearm_cm?: number;
  right_forearm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  left_calf_cm?: number;
  right_calf_cm?: number;
  measurement_source: string;
  notes?: string;
  measurement_date: string;
  created_at: string;
}

interface MeasurementField {
  key: keyof Measurement;
  label: string;
  unit: string;
  category: 'weight' | 'composition' | 'upper' | 'lower';
  icon: React.ComponentType<{ className?: string }>;
}

// Measurement field configuration
const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', category: 'weight', icon: Scale },
  { key: 'body_fat_percentage', label: 'Body Fat', unit: '%', category: 'composition', icon: Activity },
  { key: 'lean_mass_kg', label: 'Lean Mass', unit: 'kg', category: 'composition', icon: Target },
  { key: 'neck_cm', label: 'Neck', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'chest_cm', label: 'Chest', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'left_bicep_cm', label: 'Left Bicep', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'right_bicep_cm', label: 'Right Bicep', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'left_forearm_cm', label: 'Left Forearm', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'right_forearm_cm', label: 'Right Forearm', unit: 'cm', category: 'upper', icon: Ruler },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', category: 'lower', icon: Ruler },
  { key: 'hips_cm', label: 'Hips', unit: 'cm', category: 'lower', icon: Ruler },
  { key: 'left_thigh_cm', label: 'Left Thigh', unit: 'cm', category: 'lower', icon: Ruler },
  { key: 'right_thigh_cm', label: 'Right Thigh', unit: 'cm', category: 'lower', icon: Ruler },
  { key: 'left_calf_cm', label: 'Left Calf', unit: 'cm', category: 'lower', icon: Ruler },
  { key: 'right_calf_cm', label: 'Right Calf', unit: 'cm', category: 'lower', icon: Ruler },
];

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

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [latestMeasurement, setLatestMeasurement] = useState<Measurement | null>(null);
  const [comparison, setComparison] = useState<Record<string, { current: number; past: number; change: number; changePercent: string }> | null>(null);
  const [comparisonDays, setComparisonDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // New measurement form
  const [newMeasurement, setNewMeasurement] = useState<Partial<Measurement>>({
    measurement_date: new Date().toISOString().split('T')[0],
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [measurementsRes, latestRes, comparisonRes] = await Promise.all([
        api.get('/body-measurements?limit=100'),
        api.get('/body-measurements/latest'),
        api.get(`/body-measurements/comparison?days=${comparisonDays}`),
      ]);

      setMeasurements(measurementsRes.data?.measurements || []);
      setLatestMeasurement(latestRes.data?.measurement || null);
      setComparison(comparisonRes.data?.comparison || null);
    } catch (err) {
      console.error('Failed to fetch measurements:', err);
    } finally {
      setLoading(false);
    }
  }, [comparisonDays]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

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

    if (!newMeasurement.measurement_date) {
      showError('Please select a date');
      return;
    }

    try {
      if (editingMeasurement) {
        await api.put(`/body-measurements/${editingMeasurement.id}`, newMeasurement);
        toast('Measurement updated!');
      } else {
        await api.post('/body-measurements', newMeasurement);
        toast('Measurement added!');
      }

      setShowAddModal(false);
      setEditingMeasurement(null);
      setNewMeasurement({ measurement_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (_err) {
      showError('Failed to save measurement');
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm('Delete this measurement?')) return;

    try {
      await api.delete(`/body-measurements/${id}`);
      toast('Measurement deleted');
      fetchData();
    } catch (_err) {
      showError('Failed to delete measurement');
    }
  };

  const handleEditMeasurement = (measurement: Measurement) => {
    setEditingMeasurement(measurement);
    setNewMeasurement({
      ...measurement,
      measurement_date: measurement.measurement_date.split('T')[0],
    });
    setShowAddModal(true);
  };

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
                <p className="text-sm text-gray-400">Track your progress over time</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingMeasurement(null);
                setNewMeasurement({ measurement_date: new Date().toISOString().split('T')[0] });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
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
                const value = latestMeasurement[field.key];
                const compData = comparison?.[field.key];
                const change = compData?.change;
                const changePercent = compData?.changePercent;
                const isWeightOrWaist = field.key === 'weight_kg' || field.key === 'waist_cm';
                const trend = getTrend(change, isWeightOrWaist);
                const TrendIcon = trend.icon;
                const FieldIcon = field.icon;

                if (value === null || value === undefined) return null;

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
                      {change !== null && change !== undefined && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trend.bg}`}>
                          <TrendIcon className={`w-3.5 h-3.5 ${trend.color}`} />
                          <span className={`text-xs font-medium ${trend.color}`}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)} ({changePercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{(value as number).toFixed(1)}</span>
                      <span className="text-gray-500">{field.unit}</span>
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
                              {new Date(m.measurement_date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                              {m.weight_kg && <span>Weight: {m.weight_kg}kg</span>}
                              {m.body_fat_percentage && <span>BF: {m.body_fat_percentage}%</span>}
                              {m.chest_cm && <span>Chest: {m.chest_cm}cm</span>}
                              {m.waist_cm && <span>Waist: {m.waist_cm}cm</span>}
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
                      value={newMeasurement.measurement_date || ''}
                      onChange={(e) => setNewMeasurement({ ...newMeasurement, measurement_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                  </div>

                  {/* Measurements by category */}
                  {CATEGORIES.slice(1).map((cat) => (
                    <div key={cat.id}>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">{cat.label}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {MEASUREMENT_FIELDS.filter((f) => f.category === cat.id).map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs text-gray-500 mb-1">
                              {field.label} ({field.unit})
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
                        ))}
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
    </div>
  );
}
