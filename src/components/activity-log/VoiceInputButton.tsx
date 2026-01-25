/**
 * VoiceInputButton Component
 *
 * Web Speech API voice input for workout logging.
 * Supports natural language like:
 * - "135 pounds for 10 reps"
 * - "bench press 225 for 5"
 * - "3 sets of squats at 185"
 *
 * Uses browser's built-in speech recognition with fallback messaging.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  X,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { SafeMotion } from '@/utils/safeMotion';
import { haptic } from '@/utils/haptics';

// Type for SpeechRecognition (browser API)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface VoiceInputButtonProps {
  onResult: (parsed: {
    exerciseName: string;
    exerciseId?: string;
    weight?: number;
    reps?: number;
    sets?: number;
    rawText: string;
  }) => void;
  onClose: () => void;
}

// Voice parsing patterns
const PATTERNS = {
  // "135 lbs for 10 reps" or "135 for 10"
  weightReps: /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilos?)?\s*(?:for|x|×|times)\s*(\d+)\s*(?:reps?)?/i,
  // "10 reps at 135 lbs"
  repsWeight: /(\d+)\s*(?:reps?)\s*(?:at|@)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilos?)?/i,
  // "3 sets of 10"
  setsReps: /(\d+)\s*sets?\s*(?:of|x|×)?\s*(\d+)/i,
  // "bench press" or exercise names
  exerciseName: /^([\w\s-]+?)(?:\s+\d|$)/i,
};

// Common exercise name mappings
const EXERCISE_ALIASES: Record<string, string> = {
  'bench': 'Barbell Bench Press',
  'bench press': 'Barbell Bench Press',
  'squat': 'Barbell Back Squat',
  'squats': 'Barbell Back Squat',
  'deadlift': 'Conventional Deadlift',
  'dead lift': 'Conventional Deadlift',
  'overhead press': 'Barbell Overhead Press',
  'ohp': 'Barbell Overhead Press',
  'shoulder press': 'Barbell Overhead Press',
  'curl': 'Dumbbell Bicep Curl',
  'curls': 'Dumbbell Bicep Curl',
  'bicep curl': 'Dumbbell Bicep Curl',
  'row': 'Barbell Bent Over Row',
  'rows': 'Barbell Bent Over Row',
  'lat pulldown': 'Lat Pulldown',
  'pull up': 'Pull-up',
  'pullup': 'Pull-up',
  'push up': 'Push-up',
  'pushup': 'Push-up',
  'dip': 'Dips',
  'dips': 'Dips',
  'leg press': 'Leg Press',
  'lunge': 'Walking Lunge',
  'lunges': 'Walking Lunge',
};

function parseVoiceText(text: string): {
  exerciseName?: string;
  weight?: number;
  reps?: number;
  sets?: number;
} {
  const normalized = text.toLowerCase().trim();
  const result: ReturnType<typeof parseVoiceText> = {};

  // Try to extract weight and reps
  const weightRepsMatch = normalized.match(PATTERNS.weightReps);
  if (weightRepsMatch) {
    result.weight = parseFloat(weightRepsMatch[1]);
    result.reps = parseInt(weightRepsMatch[2], 10);
  } else {
    const repsWeightMatch = normalized.match(PATTERNS.repsWeight);
    if (repsWeightMatch) {
      result.reps = parseInt(repsWeightMatch[1], 10);
      result.weight = parseFloat(repsWeightMatch[2]);
    }
  }

  // Try to extract sets
  const setsMatch = normalized.match(PATTERNS.setsReps);
  if (setsMatch) {
    result.sets = parseInt(setsMatch[1], 10);
    if (!result.reps) {
      result.reps = parseInt(setsMatch[2], 10);
    }
  }

  // Try to extract exercise name
  const exerciseMatch = normalized.match(PATTERNS.exerciseName);
  if (exerciseMatch) {
    const rawName = exerciseMatch[1].trim();
    // Check aliases first
    result.exerciseName = EXERCISE_ALIASES[rawName] || rawName;
  }

  return result;
}

export function VoiceInputButton({ onResult, onClose }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Voice input is not supported in this browser');
    }
  }, []);

  // Initialize speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported');
      return;
    }

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      haptic('light');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const current = results[results.length - 1];
      const transcriptText = current[0].transcript;

      setTranscript(transcriptText);

      // If this is a final result, parse it
      if (current.isFinal) {
        const parsed = parseVoiceText(transcriptText);
        haptic('medium');

        onResult({
          exerciseName: parsed.exerciseName || 'Unknown Exercise',
          weight: parsed.weight,
          reps: parsed.reps,
          sets: parsed.sets,
          rawText: transcriptText,
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in your browser settings.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-purple-400" />
          <span className="font-medium">Voice Input</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Main content */}
      <div className="text-center space-y-4">
        {/* Mic button */}
        <button
          onClick={toggleListening}
          disabled={!isSupported}
          className={`
            w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all
            ${isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/30'
              : isSupported
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-gray-700 cursor-not-allowed'
            }
          `}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>

        {/* Status text */}
        <div className="min-h-[60px]">
          {isListening ? (
            <div className="space-y-2">
              <p className="text-purple-300 flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening...
              </p>
              {transcript && (
                <SafeMotion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white font-medium bg-gray-800/50 rounded-lg px-4 py-2"
                >
                  &quot;{transcript}&quot;
                </SafeMotion.p>
              )}
            </div>
          ) : error ? (
            <div className="text-red-400 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              Tap the mic and say something like:
              <br />
              <span className="text-purple-300">&quot;135 pounds for 10 reps&quot;</span>
            </p>
          )}
        </div>

        {/* Examples */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>Examples: &quot;bench press 185 for 8&quot; • &quot;3 sets of 12&quot; • &quot;225 times 5&quot;</p>
        </div>
      </div>
    </div>
  );
}

export default VoiceInputButton;

// Add type declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
