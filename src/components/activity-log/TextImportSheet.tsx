/**
 * TextImportSheet Component
 *
 * Allows users to paste or type workout data in natural language or structured formats.
 * Parses the text to extract exercises, sets, reps, and weights.
 *
 * Supported formats:
 * - Natural language: "Did 3 sets of bench press at 185 for 8 reps"
 * - Structured: "Bench Press: 185x8, 185x8, 185x6"
 * - List format: "Squat 225x5x3" (weight x reps x sets)
 * - Simple: "Deadlift 315 5 3" (exercise weight reps sets)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ClipboardPaste,
  FileText,
  Sparkles,
  AlertCircle,
  X,
  Trash2,
  Plus,
} from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { haptic } from '@/utils/haptics';

interface ParsedExercise {
  id: string;
  exerciseName: string;
  sets: Array<{
    weight?: number;
    reps?: number;
    setNumber: number;
  }>;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

interface TextImportSheetProps {
  onImport: (exercises: ParsedExercise[]) => void;
  onClose: () => void;
}

// Common exercise name mappings for fuzzy matching
const EXERCISE_ALIASES: Record<string, string> = {
  'bench': 'Barbell Bench Press',
  'bench press': 'Barbell Bench Press',
  'flat bench': 'Barbell Bench Press',
  'squat': 'Barbell Back Squat',
  'squats': 'Barbell Back Squat',
  'back squat': 'Barbell Back Squat',
  'deadlift': 'Conventional Deadlift',
  'dead lift': 'Conventional Deadlift',
  'dl': 'Conventional Deadlift',
  'ohp': 'Barbell Overhead Press',
  'overhead press': 'Barbell Overhead Press',
  'shoulder press': 'Barbell Overhead Press',
  'military press': 'Barbell Overhead Press',
  'curl': 'Dumbbell Bicep Curl',
  'curls': 'Dumbbell Bicep Curl',
  'bicep curl': 'Dumbbell Bicep Curl',
  'row': 'Barbell Bent Over Row',
  'rows': 'Barbell Bent Over Row',
  'bent over row': 'Barbell Bent Over Row',
  'lat pulldown': 'Lat Pulldown',
  'pulldown': 'Lat Pulldown',
  'pull up': 'Pull-up',
  'pullup': 'Pull-up',
  'pull-up': 'Pull-up',
  'chin up': 'Chin-up',
  'chinup': 'Chin-up',
  'push up': 'Push-up',
  'pushup': 'Push-up',
  'push-up': 'Push-up',
  'dip': 'Dips',
  'dips': 'Dips',
  'leg press': 'Leg Press',
  'lunge': 'Walking Lunge',
  'lunges': 'Walking Lunge',
  'rdl': 'Romanian Deadlift',
  'romanian deadlift': 'Romanian Deadlift',
  'incline bench': 'Incline Barbell Bench Press',
  'incline press': 'Incline Barbell Bench Press',
  'decline bench': 'Decline Barbell Bench Press',
  'fly': 'Dumbbell Fly',
  'flies': 'Dumbbell Fly',
  'flyes': 'Dumbbell Fly',
  'cable fly': 'Cable Fly',
  'tricep extension': 'Tricep Extension',
  'skull crusher': 'Skull Crusher',
  'skull crushers': 'Skull Crusher',
  'hammer curl': 'Hammer Curl',
  'hammer curls': 'Hammer Curl',
  'face pull': 'Face Pull',
  'face pulls': 'Face Pull',
  'shrug': 'Barbell Shrug',
  'shrugs': 'Barbell Shrug',
  'calf raise': 'Standing Calf Raise',
  'calf raises': 'Standing Calf Raise',
  'leg curl': 'Leg Curl',
  'leg extension': 'Leg Extension',
  'hip thrust': 'Hip Thrust',
  'hip thrusts': 'Hip Thrust',
  'plank': 'Plank',
  'crunch': 'Crunch',
  'crunches': 'Crunch',
  'sit up': 'Sit-up',
  'situp': 'Sit-up',
};

// Parsing patterns
const PATTERNS = {
  // "185x8x3" or "185 x 8 x 3" (weight x reps x sets)
  weightRepsSets: /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/gi,
  // "185x8" or "185 x 8" (weight x reps)
  weightReps: /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+)(?!\s*[x×])/gi,
  // "3 sets of 8 at 185" or "3x8 at 185"
  setsRepsAt: /(\d+)\s*(?:sets?\s*(?:of)?|[x×])\s*(\d+)\s*(?:at|@)\s*(\d+(?:\.\d+)?)/gi,
  // "185 lbs for 8 reps"
  weightForReps: /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilos?)?\s*(?:for|x|×)\s*(\d+)\s*(?:reps?)?/gi,
  // "8 reps at 185"
  repsAtWeight: /(\d+)\s*(?:reps?)\s*(?:at|@|with)\s*(\d+(?:\.\d+)?)/gi,
  // Exercise name at start of line
  exerciseName: /^([a-zA-Z][a-zA-Z\s\-]+?)(?:\s*[:|\-|–]|\s+\d)/i,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function normalizeExerciseName(name: string): string {
  const normalized = name.toLowerCase().trim();
  return EXERCISE_ALIASES[normalized] || name.trim();
}

function parseTextInput(text: string): ParsedExercise[] {
  const lines = text.split('\n').filter(line => line.trim());
  const exercises: ParsedExercise[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try to extract exercise name
    const nameMatch = trimmedLine.match(PATTERNS.exerciseName);
    let exerciseName = 'Unknown Exercise';
    let remainingText = trimmedLine;

    if (nameMatch) {
      exerciseName = normalizeExerciseName(nameMatch[1]);
      remainingText = trimmedLine.substring(nameMatch[0].length - 1);
    }

    const sets: Array<{ weight?: number; reps?: number; setNumber: number }> = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Try different patterns
    // Pattern 1: weight x reps x sets (e.g., "185x8x3")
    const wrsMatches = [...remainingText.matchAll(PATTERNS.weightRepsSets)];
    if (wrsMatches.length > 0) {
      for (const match of wrsMatches) {
        const weight = parseFloat(match[1]);
        const reps = parseInt(match[2], 10);
        const setCount = parseInt(match[3], 10);
        for (let i = 0; i < setCount; i++) {
          sets.push({ weight, reps, setNumber: sets.length + 1 });
        }
      }
      confidence = 'high';
    }

    // Pattern 2: sets x reps at weight (e.g., "3x8 at 185")
    if (sets.length === 0) {
      const sraMatches = [...remainingText.matchAll(PATTERNS.setsRepsAt)];
      if (sraMatches.length > 0) {
        for (const match of sraMatches) {
          const setCount = parseInt(match[1], 10);
          const reps = parseInt(match[2], 10);
          const weight = parseFloat(match[3]);
          for (let i = 0; i < setCount; i++) {
            sets.push({ weight, reps, setNumber: sets.length + 1 });
          }
        }
        confidence = 'high';
      }
    }

    // Pattern 3: Multiple weight x reps (e.g., "185x8, 185x8, 185x6")
    if (sets.length === 0) {
      const wrMatches = [...remainingText.matchAll(PATTERNS.weightReps)];
      if (wrMatches.length > 0) {
        for (const match of wrMatches) {
          const weight = parseFloat(match[1]);
          const reps = parseInt(match[2], 10);
          sets.push({ weight, reps, setNumber: sets.length + 1 });
        }
        confidence = wrMatches.length > 1 ? 'high' : 'medium';
      }
    }

    // Pattern 4: weight for reps (e.g., "185 lbs for 8 reps")
    if (sets.length === 0) {
      const wfrMatches = [...remainingText.matchAll(PATTERNS.weightForReps)];
      if (wfrMatches.length > 0) {
        for (const match of wfrMatches) {
          const weight = parseFloat(match[1]);
          const reps = parseInt(match[2], 10);
          sets.push({ weight, reps, setNumber: sets.length + 1 });
        }
        confidence = 'medium';
      }
    }

    // Pattern 5: reps at weight (e.g., "8 reps at 185")
    if (sets.length === 0) {
      const rawMatches = [...remainingText.matchAll(PATTERNS.repsAtWeight)];
      if (rawMatches.length > 0) {
        for (const match of rawMatches) {
          const reps = parseInt(match[1], 10);
          const weight = parseFloat(match[2]);
          sets.push({ weight, reps, setNumber: sets.length + 1 });
        }
        confidence = 'medium';
      }
    }

    // Only add if we found something meaningful
    if (sets.length > 0 || nameMatch) {
      // If we have a name but no sets, add a placeholder set
      if (sets.length === 0 && nameMatch) {
        // Try to extract just numbers from the remaining text
        const numbers = remainingText.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          // Assume first number is weight, second is reps
          sets.push({
            weight: parseFloat(numbers[0]),
            reps: parseInt(numbers[1], 10),
            setNumber: 1,
          });
          confidence = 'low';
        }
      }

      if (sets.length > 0) {
        exercises.push({
          id: generateId(),
          exerciseName,
          sets,
          rawText: trimmedLine,
          confidence,
        });
      }
    }
  }

  return exercises;
}

export function TextImportSheet({ onImport, onClose }: TextImportSheetProps) {
  const [inputText, setInputText] = useState('');
  const [parsedExercises, setParsedExercises] = useState<ParsedExercise[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse text when it changes
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    setError(null);

    if (text.trim()) {
      setIsParsing(true);
      // Small delay for better UX
      setTimeout(() => {
        try {
          const parsed = parseTextInput(text);
          setParsedExercises(parsed);
          setIsParsing(false);
        } catch (_err) {
          setError('Failed to parse text. Please check the format.');
          setParsedExercises([]);
          setIsParsing(false);
        }
      }, 100);
    } else {
      setParsedExercises([]);
    }
  }, []);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleTextChange(text);
        haptic('light');
      }
    } catch (_err) {
      setError('Failed to read clipboard. Please paste manually.');
    }
  }, [handleTextChange]);

  // Remove a parsed exercise
  const handleRemoveExercise = useCallback((id: string) => {
    setParsedExercises(prev => prev.filter(e => e.id !== id));
    haptic('light');
  }, []);

  // Import all exercises
  const handleImport = useCallback(() => {
    if (parsedExercises.length > 0) {
      haptic('medium');
      onImport(parsedExercises);
    }
  }, [parsedExercises, onImport]);

  // Calculate totals
  const totals = useMemo(() => {
    let sets = 0;
    let reps = 0;
    let volume = 0;

    for (const exercise of parsedExercises) {
      sets += exercise.sets.length;
      for (const set of exercise.sets) {
        reps += set.reps || 0;
        volume += (set.weight || 0) * (set.reps || 0);
      }
    }

    return { sets, reps, volume };
  }, [parsedExercises]);

  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-orange-400',
  };

  const confidenceLabels = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Review needed',
  };

  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Text Import</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Input Area */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`Paste or type your workout data...\n\nExamples:\nBench Press: 185x8, 185x8, 185x6\nSquat 225x5x3\n3 sets of deadlift at 315 for 5 reps`}
            className="w-full h-32 bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            onClick={handlePaste}
            className="absolute top-2 right-2 p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-4 h-4 text-blue-400" />
          </button>
        </div>

        {/* Format hints */}
        <div className="text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Supported: &quot;Exercise: 185x8x3&quot;, &quot;3x8 at 185&quot;, &quot;185 lbs for 8 reps&quot;
          </p>
        </div>
      </div>

      {/* Error Message */}
      <SafeAnimatePresence>
        {error && (
          <SafeMotion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>

      {/* Parsed Results */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {isParsing ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            Parsing...
          </div>
        ) : parsedExercises.length > 0 ? (
          <>
            <div className="text-sm text-gray-400 mb-2">
              Found {parsedExercises.length} exercise{parsedExercises.length !== 1 ? 's' : ''}
            </div>

            {parsedExercises.map((exercise) => (
              <SafeMotion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{exercise.exerciseName}</div>
                    <div className={`text-xs ${confidenceColors[exercise.confidence]}`}>
                      {confidenceLabels[exercise.confidence]}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveExercise(exercise.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {exercise.sets.map((set, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 bg-gray-700/50 rounded-lg text-sm"
                    >
                      {set.weight && <span className="text-blue-400">{set.weight}lbs</span>}
                      {set.weight && set.reps && <span className="text-gray-500"> × </span>}
                      {set.reps && <span className="text-green-400">{set.reps}</span>}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-500 italic truncate">
                  &quot;{exercise.rawText}&quot;
                </div>
              </SafeMotion.div>
            ))}
          </>
        ) : inputText.trim() ? (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No exercises found in text</p>
            <p className="text-xs mt-1">Try using formats like &quot;Bench: 185x8x3&quot;</p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Paste or type workout data above</p>
          </div>
        )}
      </div>

      {/* Footer with totals and import button */}
      {parsedExercises.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sets:</span>{' '}
                <span className="font-medium">{totals.sets}</span>
              </div>
              <div>
                <span className="text-gray-500">Reps:</span>{' '}
                <span className="font-medium">{totals.reps}</span>
              </div>
              <div>
                <span className="text-gray-500">Volume:</span>{' '}
                <span className="font-medium">{totals.volume.toLocaleString()}lbs</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleImport}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Import {parsedExercises.length} Exercise{parsedExercises.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export default TextImportSheet;
