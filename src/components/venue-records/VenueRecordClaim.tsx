/**
 * VenueRecordClaim - Claim a New Venue Record
 *
 * Form component for:
 * - Selecting exercise and record type
 * - Entering record value
 * - Adding context (reps at weight, etc.)
 * - Optional video upload for verification
 * - Notes and conditions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Weight,
  Timer,
  Repeat,
  Target,
  Video,
  X,
  Check,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type RecordType = 'MAX_WEIGHT' | 'MAX_REPS' | 'FASTEST_TIME' | 'MAX_DISTANCE' | 'MAX_1RM';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
}

export interface ExistingRecord {
  value: number;
  unit: string;
  holderUsername: string;
  achievedAt: string;
}

export interface VenueRecordClaimProps {
  venueId: string;
  venueName: string;
  exercises: Exercise[];
  existingRecords?: Record<string, Record<RecordType, ExistingRecord | null>>;
  onSubmit: (data: RecordClaimData) => Promise<void>;
  onCancel: () => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
}

export interface RecordClaimData {
  venueId: string;
  exerciseId: string;
  recordType: RecordType;
  recordValue: number;
  recordUnit: string;
  repsAtWeight?: number;
  weightAtReps?: number;
  conditions?: Record<string, unknown>;
  notes?: string;
  videoFile?: File;
}

// ============================================
// CONSTANTS
// ============================================

const RECORD_TYPE_OPTIONS: { value: RecordType; label: string; icon: React.ElementType; unit: string; description: string }[] = [
  {
    value: 'MAX_WEIGHT',
    label: 'Max Weight',
    icon: Weight,
    unit: 'kg',
    description: 'Heaviest weight lifted for the exercise',
  },
  {
    value: 'MAX_REPS',
    label: 'Max Reps',
    icon: Repeat,
    unit: 'reps',
    description: 'Most reps completed at a given weight',
  },
  {
    value: 'FASTEST_TIME',
    label: 'Fastest Time',
    icon: Timer,
    unit: 'seconds',
    description: 'Shortest time to complete the exercise',
  },
  {
    value: 'MAX_DISTANCE',
    label: 'Max Distance',
    icon: Target,
    unit: 'meters',
    description: 'Longest distance covered',
  },
  {
    value: 'MAX_1RM',
    label: 'Estimated 1RM',
    icon: Trophy,
    unit: '1rm_kg',
    description: 'Calculated one-rep max based on weight × reps',
  },
];

// ============================================
// COMPONENT
// ============================================

export function VenueRecordClaim({
  venueId,
  venueName,
  exercises,
  existingRecords = {},
  onSubmit,
  onCancel,
  className = '',
  loading = false,
  error = null,
}: VenueRecordClaimProps) {
  // Form state
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('MAX_WEIGHT');
  const [recordValue, setRecordValue] = useState<string>('');
  const [repsAtWeight, setRepsAtWeight] = useState<string>('');
  const [weightAtReps, setWeightAtReps] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    if (!exerciseSearch) return exercises.slice(0, 20);
    const query = exerciseSearch.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(query)).slice(0, 20);
  }, [exercises, exerciseSearch]);

  // Current record type config
  const currentTypeConfig = useMemo(() => {
    return RECORD_TYPE_OPTIONS.find((o) => o.value === recordType);
  }, [recordType]);

  // Existing record for selected exercise/type
  const existingRecord = useMemo(() => {
    if (!selectedExercise || !recordType) return null;
    return existingRecords[selectedExercise]?.[recordType] || null;
  }, [selectedExercise, recordType, existingRecords]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!selectedExercise) errors.push('Select an exercise');
    if (!recordValue || parseFloat(recordValue) <= 0) errors.push('Enter a valid record value');

    if (recordType === 'MAX_WEIGHT' && !repsAtWeight) {
      errors.push('Enter reps performed at this weight');
    }

    if (recordType === 'MAX_REPS' && !weightAtReps) {
      errors.push('Enter the weight used');
    }

    // Check if beats existing record
    if (existingRecord && parseFloat(recordValue) <= existingRecord.value) {
      errors.push(`Must beat current record of ${existingRecord.value} ${existingRecord.unit}`);
    }

    return errors;
  }, [selectedExercise, recordValue, recordType, repsAtWeight, weightAtReps, existingRecord]);

  const isValid = validationErrors.length === 0;

  // Handle video selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        alert('Please select a video file');
        return;
      }
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('Video must be under 100MB');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  // Cleanup video preview
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({
        venueId,
        exerciseId: selectedExercise,
        recordType,
        recordValue: parseFloat(recordValue),
        recordUnit: currentTypeConfig?.unit || 'kg',
        repsAtWeight: repsAtWeight ? parseInt(repsAtWeight) : undefined,
        weightAtReps: weightAtReps ? parseFloat(weightAtReps) : undefined,
        notes: notes || undefined,
        videoFile: videoFile || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Claim a Record
          </h2>
          <p className="text-white/60 text-sm mt-1">at {venueName}</p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* Exercise Selection */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Exercise</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search exercises..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          {exerciseSearch && filteredExercises.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto bg-white/5 rounded-xl border border-white/10">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    setSelectedExercise(exercise.id);
                    setExerciseSearch(exercise.name);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                    selectedExercise === exercise.id ? 'bg-violet-500/20 text-violet-400' : 'text-white'
                  }`}
                >
                  <div className="font-medium">{exercise.name}</div>
                  <div className="text-white/40 text-xs">{exercise.primaryMuscles.join(', ')}</div>
                </button>
              ))}
            </div>
          )}
          {selectedExercise && !exerciseSearch && (
            <div className="mt-2 px-4 py-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <div className="text-violet-400 font-medium">
                {exercises.find((e) => e.id === selectedExercise)?.name}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedExercise('');
                  setExerciseSearch('');
                }}
                className="text-violet-400/60 text-xs hover:text-violet-400"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Record Type Selection */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Record Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {RECORD_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecordType(value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                  recordType === value
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
          {currentTypeConfig && (
            <p className="mt-2 text-white/40 text-xs flex items-center gap-1">
              <Info className="w-3 h-3" />
              {currentTypeConfig.description}
            </p>
          )}
        </div>

        {/* Existing Record Notice */}
        {existingRecord && (
          <div className="px-4 py-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-3">
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-400 font-medium">Current Record</div>
              <div className="text-white text-lg font-bold">
                {existingRecord.value} {existingRecord.unit}
              </div>
              <div className="text-white/60 text-xs">
                Held by {existingRecord.holderUsername}
              </div>
            </div>
          </div>
        )}

        {/* Record Value */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Your Record Value
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={`Enter ${currentTypeConfig?.label.toLowerCase() || 'value'}`}
              value={recordValue}
              onChange={(e) => setRecordValue(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-2xl font-bold placeholder:text-white/40 placeholder:text-lg placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
              {currentTypeConfig?.unit}
            </span>
          </div>
        </div>

        {/* Contextual Fields */}
        {recordType === 'MAX_WEIGHT' && (
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Reps at This Weight
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g., 5"
              value={repsAtWeight}
              onChange={(e) => setRepsAtWeight(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        )}

        {recordType === 'MAX_REPS' && (
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Weight Used (kg)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 60"
              value={weightAtReps}
              onChange={(e) => setWeightAtReps(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
        )}

        {/* Video Upload */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Video Proof (Optional)
          </label>
          <p className="text-white/40 text-xs mb-2">
            Upload a video to get Video Verified status. Required for top 3 positions.
          </p>

          {videoFile ? (
            <div className="relative">
              {videoPreview && (
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-48 rounded-xl bg-black"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 bg-white/5 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-white/10 transition-colors">
              <div className="flex flex-col items-center">
                <Video className="w-8 h-8 text-white/40 mb-2" />
                <span className="text-white/60 text-sm">Click to upload video</span>
                <span className="text-white/40 text-xs">Max 100MB</span>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            placeholder="Any additional context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-4 py-3 bg-red-500/10 rounded-xl border border-red-500/20">
            {validationErrors.map((error, i) => (
              <div key={i} className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Submit Error */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || submitting || loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-600 hover:to-pink-600 transition-colors flex items-center justify-center gap-2"
          >
            {submitting || loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Claim Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default VenueRecordClaim;
