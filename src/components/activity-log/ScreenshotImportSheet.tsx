/**
 * ScreenshotImportSheet Component
 *
 * Allows users to take or upload screenshots of workout data and extract
 * exercise information using OCR.
 *
 * Future integration points:
 * - Cloud Vision API / Tesseract.js for OCR
 * - Camera access for direct capture
 * - Image preprocessing for better OCR results
 */

import React, { useState, useCallback, useRef } from 'react';
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

interface ScreenshotImportSheetProps {
  onImport: (exercises: ParsedExercise[]) => void;
  onClose: () => void;
}

// Mock OCR function - will be replaced with actual OCR service
async function performOCR(_imageData: string): Promise<string[]> {
  // Simulate OCR processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // This would be replaced with actual OCR API call
  // For now, return empty to show the "coming soon" state
  return [];
}

// Parse OCR text into exercises
function parseOCRText(lines: string[]): ParsedExercise[] {
  const exercises: ParsedExercise[] = [];

  // Pattern matching similar to TextImportSheet
  // This would be refined based on actual OCR output
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Basic pattern: "Exercise Name 185x8x3"
    const match = trimmed.match(/^([a-zA-Z][a-zA-Z\s]+?)\s+(\d+)\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+))?/i);

    if (match) {
      const exerciseName = match[1].trim();
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
        confidence: 'medium',
      });
    }
  }

  return exercises;
}

export function ScreenshotImportSheet({ onImport, onClose }: ScreenshotImportSheetProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedExercises, setParsedExercises] = useState<ParsedExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    haptic('medium');

    try {
      const ocrLines = await performOCR(selectedImage);

      if (ocrLines.length === 0) {
        // OCR not yet implemented - show coming soon message
        setError('OCR processing is coming soon. This feature will use AI to extract workout data from screenshots.');
        setParsedExercises([]);
      } else {
        const parsed = parseOCRText(ocrLines);
        setParsedExercises(parsed);

        if (parsed.length === 0) {
          setError('No workout data found in image. Try a clearer screenshot.');
        }
      }
    } catch (_err) {
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
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
          <span className="px-2 py-0.5 bg-orange-500/20 rounded-full text-xs text-orange-300">Coming Soon</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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

            {/* Process button */}
            {parsedExercises.length === 0 && !error && (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Extract Workout Data
                  </>
                )}
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
              className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-start gap-2 text-orange-300 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {error.includes('coming soon') && (
                  <p className="text-xs text-gray-400 mt-1">
                    For now, use Text Import or Voice Input to log your workouts.
                  </p>
                )}
              </div>
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>
      </div>
    </div>
  );
}

export default ScreenshotImportSheet;
