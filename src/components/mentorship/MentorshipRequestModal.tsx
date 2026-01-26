import React, { useState } from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import {
  X,
  Users,
  Target,
  Calendar,
  Clock,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  Zap,
} from 'lucide-react';

interface MentorInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  specializations: string[];
  hourlyRate?: number;
}

interface MentorshipRequestModalProps {
  mentor: MentorInfo;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: MentorshipRequest) => void;
}

interface MentorshipRequest {
  mentorId: string;
  goals: string[];
  preferredSchedule: string;
  sessionFrequency: string;
  message: string;
  focusAreas: string[];
}

const GOALS = [
  { id: 'strength', label: 'Build Strength', icon: '💪' },
  { id: 'muscle', label: 'Build Muscle', icon: '🏋️' },
  { id: 'weight_loss', label: 'Lose Weight', icon: '⚖️' },
  { id: 'endurance', label: 'Improve Endurance', icon: '🏃' },
  { id: 'flexibility', label: 'Increase Flexibility', icon: '🧘' },
  { id: 'competition', label: 'Competition Prep', icon: '🏆' },
  { id: 'rehabilitation', label: 'Injury Recovery', icon: '🩹' },
  { id: 'general', label: 'General Fitness', icon: '❤️' },
];

const SCHEDULE_OPTIONS = [
  { id: 'morning', label: 'Mornings (6am-12pm)' },
  { id: 'afternoon', label: 'Afternoons (12pm-5pm)' },
  { id: 'evening', label: 'Evenings (5pm-9pm)' },
  { id: 'flexible', label: 'Flexible' },
];

const FREQUENCY_OPTIONS = [
  { id: 'weekly', label: '1x per week' },
  { id: 'biweekly', label: '2x per week' },
  { id: 'triweekly', label: '3x per week' },
  { id: 'monthly', label: 'Monthly check-ins' },
];

export function MentorshipRequestModal({
  mentor,
  isOpen,
  onClose,
  onSubmit,
}: MentorshipRequestModalProps) {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [schedule, setSchedule] = useState('flexible');
  const [frequency, setFrequency] = useState('weekly');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const handleGoalToggle = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleFocusToggle = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      mentorId: mentor.id,
      goals: selectedGoals,
      preferredSchedule: schedule,
      sessionFrequency: frequency,
      message,
      focusAreas,
    });
    onClose();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedGoals.length > 0;
      case 2:
        return schedule && frequency;
      case 3:
        return true;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <SafeMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <SafeMotion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                {mentor.avatarUrl ? (
                  <img src={mentor.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                    {mentor.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">Request Mentorship</h3>
                <p className="text-sm text-gray-400">with {mentor.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? 'bg-purple-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <SafeAnimatePresence mode="wait">
            {step === 1 && (
              <SafeMotion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-purple-400" />
                  <h4 className="font-medium text-white">What are your goals?</h4>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => handleGoalToggle(goal.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                        selectedGoals.includes(goal.id)
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
                      }`}
                    >
                      <span className="text-xl">{goal.icon}</span>
                      <span className="text-sm font-medium text-white">{goal.label}</span>
                      {selectedGoals.includes(goal.id) && (
                        <CheckCircle className="w-4 h-4 text-purple-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Focus Areas */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-gray-400">
                      Areas to focus on (optional)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mentor.specializations.map((spec) => (
                      <button
                        key={spec}
                        onClick={() => handleFocusToggle(spec)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          focusAreas.includes(spec)
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              </SafeMotion.div>
            )}

            {step === 2 && (
              <SafeMotion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Schedule */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <h4 className="font-medium text-white">Preferred Schedule</h4>
                  </div>
                  <div className="space-y-2">
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSchedule(opt.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          schedule === opt.id
                            ? 'bg-purple-500/20 border-2 border-purple-500'
                            : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
                        }`}
                      >
                        <span className="text-sm text-white">{opt.label}</span>
                        {schedule === opt.id && (
                          <CheckCircle className="w-4 h-4 text-purple-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <h4 className="font-medium text-white">Session Frequency</h4>
                  </div>
                  <div className="space-y-2">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFrequency(opt.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          frequency === opt.id
                            ? 'bg-purple-500/20 border-2 border-purple-500'
                            : 'bg-gray-800/50 border-2 border-transparent hover:border-gray-600'
                        }`}
                      >
                        <span className="text-sm text-white">{opt.label}</span>
                        {frequency === opt.id && (
                          <CheckCircle className="w-4 h-4 text-purple-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </SafeMotion.div>
            )}

            {step === 3 && (
              <SafeMotion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <h4 className="font-medium text-white">Introduce Yourself</h4>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell your potential mentor about your fitness background, current level, and what you hope to achieve..."
                  className="w-full h-40 p-4 bg-gray-800/50 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />

                <p className="text-xs text-gray-500">
                  A thoughtful introduction helps mentors understand if they&apos;re a good fit for you.
                </p>

                {/* Summary */}
                <div className="mt-4 p-4 bg-gray-800/50 rounded-xl">
                  <h5 className="text-sm font-medium text-gray-400 mb-3">Request Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <span className="text-gray-500">Goals: </span>
                        <span className="text-white">
                          {selectedGoals
                            .map((g) => GOALS.find((goal) => goal.id === g)?.label)
                            .join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-500">Schedule: </span>
                      <span className="text-white">
                        {SCHEDULE_OPTIONS.find((s) => s.id === schedule)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-500">Frequency: </span>
                      <span className="text-white">
                        {FREQUENCY_OPTIONS.find((f) => f.id === frequency)?.label}
                      </span>
                    </div>
                    {focusAreas.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500">Focus: </span>
                          <span className="text-white">{focusAreas.join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SafeMotion.div>
            )}
          </SafeAnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-colors"
            >
              <Users className="w-4 h-4" />
              Send Request
            </button>
          )}
        </div>
      </SafeMotion.div>
    </div>
  );
}
