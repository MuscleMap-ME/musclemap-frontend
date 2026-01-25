/**
 * ScreenshotImportSheet Component
 *
 * Allows users to take or upload screenshots of workout data and extract
 * exercise information using OCR powered by Tesseract.js.
 *
 * Features:
 * - Real OCR using Tesseract.js (runs in browser via WebAssembly)
 * - Image preprocessing for better results
 * - Smart parsing for workout data patterns
 * - Confidence scoring for extracted data
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { haptic } from '@/utils/haptics';
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';

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

interface ScreenshotImportSheetProps {
  onImport: (exercises: ParsedExercise[]) => void;
  onClose: () => void;
}

// OCR progress state
interface OCRProgress {
  status: string;
  progress: number;
}

// Tesseract worker singleton for better performance
let tesseractWorker: Worker | null = null;
let workerInitializing = false;

/**
 * Initialize Tesseract worker
 * Uses singleton pattern to avoid reinitializing on each use
 */
async function getWorker(): Promise<Worker> {
  if (tesseractWorker) {
    return tesseractWorker;
  }

  if (workerInitializing) {
    // Wait for existing initialization
    while (workerInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (tesseractWorker) {
      return tesseractWorker;
    }
  }

  workerInitializing = true;

  try {
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
      // Use CDN for Tesseract assets for faster loading
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
    });

    // Configure for text recognition
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 xX×:.,-()lbskgr',
    });

    tesseractWorker = worker;
    return worker;
  } finally {
    workerInitializing = false;
  }
}

/**
 * Perform OCR on image using Tesseract.js
 */
async function performOCR(
  imageData: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<{ lines: string[]; rawText: string; confidence: number }> {
  onProgress?.({ status: 'Initializing OCR engine...', progress: 0 });

  const worker = await getWorker();

  onProgress?.({ status: 'Analyzing image...', progress: 20 });

  const result = await worker.recognize(imageData, {}, {
    text: true,
    blocks: true,
  });

  onProgress?.({ status: 'Extracting text...', progress: 80 });

  const rawText = result.data.text;
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  onProgress?.({ status: 'Complete!', progress: 100 });

  return {
    lines,
    rawText,
    confidence: result.data.confidence,
  };
}

/**
 * Common exercise name patterns to help with fuzzy matching
 */
const COMMON_EXERCISES = [
  'bench press', 'squat', 'deadlift', 'overhead press', 'barbell row',
  'pull up', 'chin up', 'lat pulldown', 'cable row', 'dumbbell curl',
  'tricep extension', 'leg press', 'leg curl', 'leg extension', 'calf raise',
  'shoulder press', 'lateral raise', 'front raise', 'face pull', 'shrug',
  'romanian deadlift', 'hip thrust', 'lunge', 'split squat', 'goblet squat',
  'incline press', 'decline press', 'dumbbell press', 'fly', 'cable fly',
  'preacher curl', 'hammer curl', 'concentration curl', 'skull crusher',
  'dip', 'push up', 'plank', 'crunch', 'russian twist', 'hanging leg raise',
];

/**
 * Normalize exercise name for better matching
 */
function normalizeExerciseName(name: string): string {
  // Clean up common OCR artifacts
  let cleaned = name
    .toLowerCase()
    .replace(/[|!1l]/g, 'l') // Common OCR confusion
    .replace(/[0oO]/g, 'o')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to match against common exercises
  for (const exercise of COMMON_EXERCISES) {
    // Simple fuzzy match - if most characters are there
    const exerciseWords = exercise.split(' ');
    const nameWords = cleaned.split(' ');

    let matchCount = 0;
    for (const ew of exerciseWords) {
      for (const nw of nameWords) {
        if (nw.includes(ew) || ew.includes(nw)) {
          matchCount++;
          break;
        }
      }
    }

    if (matchCount >= exerciseWords.length * 0.7) {
      // Return properly capitalized version
      return exercise.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // Return original with title case
  return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Parse OCR text into exercises
 * Handles multiple workout app formats and common patterns
 */
function parseOCRText(lines: string[], ocrConfidence: number): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];
  let currentExercise: ParsedExercise | null = null;

  // Pattern definitions for different formats
  const patterns = {
    // "Bench Press 185 x 8 x 3" or "Bench Press 185×8×3"
    exerciseWithSets: /^([a-zA-Z][a-zA-Z\s]+?)\s+(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/i,

    // "3 x 185 x 8" (sets first)
    setsFirst: /^(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)/i,

    // "Set 1: 185 lbs x 8 reps"
    setDetail: /(?:set\s*)?(\d+):\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)\s*(?:reps?)?/i,

    // "185 lbs × 8"
    weightReps: /^(\d+(?:\.\d+)?)\s*(?:lbs?|kg)\s*[x×]\s*(\d+)/i,

    // Just an exercise name (followed by sets on next lines)
    exerciseName: /^([a-zA-Z][a-zA-Z\s]{3,30})$/,

    // "8 reps @ 185 lbs"
    repsAtWeight: /^(\d+)\s*reps?\s*@\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?/i,
  };

  // Calculate confidence level based on OCR confidence
  function getConfidence(ocrConf: number): 'high' | 'medium' | 'low' {
    if (ocrConf >= 85) return 'high';
    if (ocrConf >= 65) return 'medium';
    return 'low';
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) continue;

    // Skip common noise
    if (/^(date|time|notes?|workout|history|log|total|volume):/i.test(trimmed)) {
      continue;
    }

    // Try exercise with sets pattern
    let match = trimmed.match(patterns.exerciseWithSets);
    if (match) {
      const exerciseName = normalizeExerciseName(match[1]);
      const weight = parseFloat(match[2]);
      const reps = parseInt(match[3], 10);
      const setCount = match[4] ? parseInt(match[4], 10) : 1;

      const sets = [];
      for (let i = 0; i < setCount; i++) {
        sets.push({
          weight,
          reps,
          setNumber: sets.length + 1,
        });
      }

      exercises.push({
        id: Math.random().toString(36).substring(2, 9),
        exerciseName,
        sets,
        rawText: trimmed,
        confidence: getConfidence(ocrConfidence),
      });
      currentExercise = null;
      continue;
    }

    // Try set detail pattern (for multi-line formats)
    match = trimmed.match(patterns.setDetail);
    if (match && currentExercise) {
      const setNum = parseInt(match[1], 10);
      const weight = parseFloat(match[2]);
      const reps = parseInt(match[3], 10);

      currentExercise.sets.push({
        weight,
        reps,
        setNumber: setNum,
      });
      currentExercise.rawText += '\n' + trimmed;
      continue;
    }

    // Try weight x reps pattern (for multi-line formats)
    match = trimmed.match(patterns.weightReps);
    if (match && currentExercise) {
      const weight = parseFloat(match[1]);
      const reps = parseInt(match[2], 10);

      currentExercise.sets.push({
        weight,
        reps,
        setNumber: currentExercise.sets.length + 1,
      });
      currentExercise.rawText += '\n' + trimmed;
      continue;
    }

    // Try reps @ weight pattern
    match = trimmed.match(patterns.repsAtWeight);
    if (match && currentExercise) {
      const reps = parseInt(match[1], 10);
      const weight = parseFloat(match[2]);

      currentExercise.sets.push({
        weight,
        reps,
        setNumber: currentExercise.sets.length + 1,
      });
      currentExercise.rawText += '\n' + trimmed;
      continue;
    }

    // Try exercise name pattern (starts a new exercise)
    match = trimmed.match(patterns.exerciseName);
    if (match) {
      // Save previous exercise if it has sets
      if (currentExercise && currentExercise.sets.length > 0) {
        exercises.push(currentExercise);
      }

      currentExercise = {
        id: Math.random().toString(36).substring(2, 9),
        exerciseName: normalizeExerciseName(match[1]),
        sets: [],
        rawText: trimmed,
        confidence: getConfidence(ocrConfidence),
      };
      continue;
    }
  }

  // Don't forget the last exercise
  if (currentExercise && currentExercise.sets.length > 0) {
    exercises.push(currentExercise);
  }

  return exercises;
}

export function ScreenshotImportSheet({ onImport, onClose }: ScreenshotImportSheetProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedExercises, setParsedExercises] = useState<ParsedExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      // Don't terminate - singleton pattern keeps it for next use
    };
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum size is 10MB.');
      return;
    }

    setError(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
      haptic('light');
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  // Trigger file input
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Process image with OCR
  const handleProcess = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);
    setOcrProgress({ status: 'Starting...', progress: 0 });
    haptic('medium');

    try {
      const { lines, rawText, confidence } = await performOCR(
        selectedImage,
        setOcrProgress
      );

      setRawOcrText(rawText);

      if (lines.length === 0) {
        setError('No text detected in image. Try a clearer screenshot with better lighting.');
        setParsedExercises([]);
      } else {
        const parsed = parseOCRText(lines, confidence);
        setParsedExercises(parsed);

        if (parsed.length === 0) {
          setError('Text detected but no workout data found. The OCR extracted text is shown below - you can copy it to Text Import.');
          setShowRawText(true);
        } else {
          haptic('success');
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to process image. Please try again or use Text Import instead.');
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  }, [selectedImage]);

  // Remove image and reset
  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
    setParsedExercises([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove a parsed exercise
  const handleRemoveExercise = useCallback((id: string) => {
    setParsedExercises(prev => prev.filter(e => e.id !== id));
    haptic('light');
  }, []);

  // Import exercises
  const handleImport = useCallback(() => {
    if (parsedExercises.length > 0) {
      haptic('medium');
      onImport(parsedExercises);
    }
  }, [parsedExercises, onImport]);

  return (
    <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-4 max-h-[80vh] flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-orange-400" />
          <span className="font-medium">Screenshot Import</span>
          <span className="px-2 py-0.5 bg-green-500/20 rounded-full text-xs text-green-300">OCR Powered</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close screenshot import"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {!selectedImage ? (
          // Upload area
          <div className="space-y-4">
            <button
              onClick={handleUploadClick}
              className="w-full aspect-video bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 hover:bg-gray-800/70 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-orange-400" />
              </div>
              <div className="text-center">
                <p className="font-medium">Upload Screenshot</p>
                <p className="text-sm text-gray-400">Take or select a photo of your workout</p>
              </div>
            </button>

            {/* Tips */}
            <div className="bg-gray-800/30 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-medium text-orange-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips for best results
              </h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Use a clear, well-lit screenshot</li>
                <li>• Include exercise names and weights/reps</li>
                <li>• Crop to show only the workout data</li>
                <li>• Works best with gym app screenshots</li>
              </ul>
            </div>

            {/* Preview of what this will support */}
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Supported formats</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  <span>Strong App</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  <span>Hevy</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  <span>JEFIT</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  <span>Any workout log</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Image preview and processing
          <div className="space-y-4">
            {/* Image preview */}
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={selectedImage}
                alt="Uploaded screenshot"
                className="w-full max-h-64 object-contain bg-gray-900"
              />
              <button
                onClick={handleClearImage}
                className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Process button with progress */}
            {parsedExercises.length === 0 && !error && (
              <div className="space-y-2">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {ocrProgress?.status || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Extract Workout Data
                    </>
                  )}
                </button>

                {/* Progress bar */}
                {isProcessing && ocrProgress && (
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                        style={{ width: `${ocrProgress.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      First-time OCR may take 10-15 seconds to load
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Retry button after error */}
            {error && !isProcessing && (
              <button
                onClick={handleProcess}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            )}

            {/* Parsed results */}
            {parsedExercises.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-gray-400">
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
                        <div className="text-xs text-yellow-400">
                          OCR confidence: {exercise.confidence}
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
                          {set.weight && <span className="text-orange-400">{set.weight}lbs</span>}
                          {set.weight && set.reps && <span className="text-gray-500"> × </span>}
                          {set.reps && <span className="text-green-400">{set.reps}</span>}
                        </div>
                      ))}
                    </div>
                  </SafeMotion.div>
                ))}

                <button
                  onClick={handleImport}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Import {parsedExercises.length} Exercise{parsedExercises.length !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        <SafeAnimatePresence>
          {error && (
            <SafeMotion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-300 text-sm"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You can also use Text Import or Voice Input for more reliable results.
                  </p>
                </div>
              </div>
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>

        {/* Raw OCR text display */}
        <SafeAnimatePresence>
          {showRawText && rawOcrText && (
            <SafeMotion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Raw OCR Text</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(rawOcrText);
                      haptic('light');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Copy to clipboard
                  </button>
                </div>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-900/50 rounded-lg p-2">
                  {rawOcrText}
                </pre>
                <button
                  onClick={() => setShowRawText(false)}
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  Hide raw text
                </button>
              </div>
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>

        {/* Toggle raw text button when exercises found */}
        {parsedExercises.length > 0 && rawOcrText && !showRawText && (
          <button
            onClick={() => setShowRawText(true)}
            className="text-xs text-gray-500 hover:text-gray-400 underline"
          >
            Show raw OCR text
          </button>
        )}
      </div>
    </div>
  );
}

export default ScreenshotImportSheet;
