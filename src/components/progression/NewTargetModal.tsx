import React, { useState } from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { X, Target, Zap, TrendingUp, Calendar, Search } from 'lucide-react';

interface NewTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (target: NewTargetData) => void;
  exercises?: Array<{ id: string; name: string }>;
}

interface NewTargetData {
  exerciseId: string;
  exerciseName: string;
  targetType: 'weight' | 'reps' | 'volume' | 'frequency';
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline?: string;
}

const TARGET_TYPES = [
  {
    value: 'weight',
    label: 'Weight',
    icon: Zap,
    description: 'Increase max weight lifted',
    defaultUnit: 'lbs',
  },
  {
    value: 'reps',
    label: 'Reps',
    icon: Target,
    description: 'Increase reps at a weight',
    defaultUnit: 'reps',
  },
  {
    value: 'volume',
    label: 'Volume',
    icon: TrendingUp,
    description: 'Increase total weekly volume',
    defaultUnit: 'lbs',
  },
  {
    value: 'frequency',
    label: 'Frequency',
    icon: Calendar,
    description: 'Train more often per week',
    defaultUnit: 'days/week',
  },
];

export function NewTargetModal({
  isOpen,
  onClose,
  onSubmit,
  exercises = [],
}: NewTargetModalProps) {
  const [step, setStep] = useState<'type' | 'exercise' | 'values'>('type');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<NewTargetData>>({});

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedType = TARGET_TYPES.find((t) => t.value === formData.targetType);

  const handleSelectType = (type: typeof TARGET_TYPES[0]) => {
    setFormData({
      ...formData,
      targetType: type.value as NewTargetData['targetType'],
      unit: type.defaultUnit,
    });
    setStep('exercise');
  };

  const handleSelectExercise = (exercise: { id: string; name: string }) => {
    setFormData({
      ...formData,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
    });
    setStep('values');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      formData.exerciseId &&
      formData.exerciseName &&
      formData.targetType &&
      formData.currentValue !== undefined &&
      formData.targetValue !== undefined &&
      formData.unit
    ) {
      onSubmit(formData as NewTargetData);
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('type');
    setSearchQuery('');
    setFormData({});
    onClose();
  };

  const handleBack = () => {
    if (step === 'values') setStep('exercise');
    else if (step === 'exercise') setStep('type');
  };

  return (
    <SafeAnimatePresence>
      {isOpen && (
        <SafeMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <SafeMotion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-white">New Progression Target</h3>
                <p className="text-sm text-gray-400">
                  {step === 'type' && 'Choose target type'}
                  {step === 'exercise' && 'Select exercise'}
                  {step === 'values' && 'Set your goals'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Step 1: Select Type */}
              {step === 'type' && (
                <div className="space-y-2">
                  {TARGET_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => handleSelectType(type)}
                        className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{type.label}</p>
                          <p className="text-sm text-gray-400">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Select Exercise */}
              {step === 'exercise' && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Exercise list */}
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {filteredExercises.length > 0 ? (
                      filteredExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => handleSelectExercise(exercise)}
                          className="w-full p-3 text-left bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <span className="text-white">{exercise.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        {searchQuery ? 'No exercises found' : 'No exercises available'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleBack}
                    className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to target type
                  </button>
                </div>
              )}

              {/* Step 3: Set Values */}
              {step === 'values' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Selected info */}
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400">
                      {selectedType?.label} target for{' '}
                      <span className="text-white font-medium">{formData.exerciseName}</span>
                    </p>
                  </div>

                  {/* Current value */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Current {selectedType?.label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.currentValue ?? ''}
                        onChange={(e) =>
                          setFormData({ ...formData, currentValue: Number(e.target.value) })
                        }
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                        required
                      />
                      <span className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400">
                        {formData.unit}
                      </span>
                    </div>
                  </div>

                  {/* Target value */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Target {selectedType?.label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.targetValue ?? ''}
                        onChange={(e) =>
                          setFormData({ ...formData, targetValue: Number(e.target.value) })
                        }
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                        required
                      />
                      <span className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400">
                        {formData.unit}
                      </span>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Target Date (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.deadline ?? ''}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Create Target
                    </button>
                  </div>
                </form>
              )}
            </div>
          </SafeMotion.div>
        </SafeMotion.div>
      )}
    </SafeAnimatePresence>
  );
}
