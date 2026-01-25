/**
 * FileImportSheet Component
 *
 * Handles importing workout data from various file formats:
 * - CSV (comma-separated values)
 * - JSON (structured workout data)
 * - Strong App export format
 * - Hevy export format
 * - JEFIT export format
 * - Generic fitness app exports
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  File,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  Trash2,
  FileJson,
  FileText,
  Download,
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

interface FileImportSheetProps {
  onImport: (exercises: ParsedExercise[]) => void;
  onClose: () => void;
}

type FileFormat = 'csv' | 'json' | 'strong' | 'hevy' | 'jefit' | 'unknown';

interface ParsedFile {
  format: FileFormat;
  exercises: ParsedExercise[];
  errors: string[];
  totalRows: number;
  parsedRows: number;
}

// Detect file format from content
function detectFileFormat(content: string, filename: string): FileFormat {
  const lowername = filename.toLowerCase();

  // Check by extension first
  if (lowername.endsWith('.json')) return 'json';

  // Check for specific app signatures
  if (content.includes('Strong App') || content.includes('Date,Workout Name,Duration')) {
    return 'strong';
  }
  if (content.includes('"hevy"') || content.includes('Exercise,Weight,Reps,RPE')) {
    return 'hevy';
  }
  if (content.includes('JEFIT') || content.includes('Exercise Name,Weight (lbs),Reps')) {
    return 'jefit';
  }

  // Generic CSV
  if (lowername.endsWith('.csv') || content.includes(',')) {
    return 'csv';
  }

  return 'unknown';
}

// Parse CSV content
function parseCSV(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

// Parse Strong App format
function parseStrongFormat(content: string): ParsedFile {
  const rows = parseCSV(content);
  const exercises: ParsedExercise[] = [];
  const errors: string[] = [];
  let parsedRows = 0;

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 6) continue;

    try {
      // Strong format: Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
      const exerciseName = row[3];
      const weight = parseFloat(row[5]) || 0;
      const reps = parseInt(row[6], 10) || 0;

      if (exerciseName && (weight > 0 || reps > 0)) {
        // Find or create exercise entry
        let exercise = exercises.find(e => e.exerciseName === exerciseName);
        if (!exercise) {
          exercise = {
            id: Math.random().toString(36).substring(2, 9),
            exerciseName,
            sets: [],
            rawText: row.join(','),
            confidence: 'high',
          };
          exercises.push(exercise);
        }

        exercise.sets.push({
          weight,
          reps,
          setNumber: exercise.sets.length + 1,
        });
        parsedRows++;
      }
    } catch (_err) {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return {
    format: 'strong',
    exercises,
    errors,
    totalRows: rows.length - 1,
    parsedRows,
  };
}

// Parse Hevy format
function parseHevyFormat(content: string): ParsedFile {
  const rows = parseCSV(content);
  const exercises: ParsedExercise[] = [];
  const errors: string[] = [];
  let parsedRows = 0;

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    try {
      // Hevy format: Exercise,Weight,Reps,RPE,...
      const exerciseName = row[0];
      const weight = parseFloat(row[1]) || 0;
      const reps = parseInt(row[2], 10) || 0;

      if (exerciseName && (weight > 0 || reps > 0)) {
        let exercise = exercises.find(e => e.exerciseName === exerciseName);
        if (!exercise) {
          exercise = {
            id: Math.random().toString(36).substring(2, 9),
            exerciseName,
            sets: [],
            rawText: row.join(','),
            confidence: 'high',
          };
          exercises.push(exercise);
        }

        exercise.sets.push({
          weight,
          reps,
          setNumber: exercise.sets.length + 1,
        });
        parsedRows++;
      }
    } catch (_err) {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return {
    format: 'hevy',
    exercises,
    errors,
    totalRows: rows.length - 1,
    parsedRows,
  };
}

// Parse generic CSV format
function parseGenericCSV(content: string): ParsedFile {
  const rows = parseCSV(content);
  const exercises: ParsedExercise[] = [];
  const errors: string[] = [];
  let parsedRows = 0;

  if (rows.length < 2) {
    return { format: 'csv', exercises, errors: ['No data rows found'], totalRows: 0, parsedRows: 0 };
  }

  // Try to detect column mapping from header
  const header = rows[0].map(h => h.toLowerCase());
  const exerciseCol = header.findIndex(h => h.includes('exercise') || h.includes('name'));
  const weightCol = header.findIndex(h => h.includes('weight') || h.includes('load'));
  const repsCol = header.findIndex(h => h.includes('rep'));
  const setsCol = header.findIndex(h => h.includes('set') && !h.includes('sets'));

  if (exerciseCol === -1) {
    errors.push('Could not find exercise name column');
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= Math.max(exerciseCol, weightCol, repsCol)) continue;

    try {
      const exerciseName = exerciseCol >= 0 ? row[exerciseCol] : row[0];
      const weight = weightCol >= 0 ? parseFloat(row[weightCol]) || 0 : 0;
      const reps = repsCol >= 0 ? parseInt(row[repsCol], 10) || 0 : 0;
      const setCount = setsCol >= 0 ? parseInt(row[setsCol], 10) || 1 : 1;

      if (exerciseName) {
        const sets = [];
        for (let s = 0; s < setCount; s++) {
          sets.push({ weight, reps, setNumber: s + 1 });
        }

        exercises.push({
          id: Math.random().toString(36).substring(2, 9),
          exerciseName,
          sets,
          rawText: row.join(','),
          confidence: weightCol >= 0 && repsCol >= 0 ? 'medium' : 'low',
        });
        parsedRows++;
      }
    } catch (_err) {
      errors.push(`Row ${i + 1}: Failed to parse`);
    }
  }

  return {
    format: 'csv',
    exercises,
    errors,
    totalRows: rows.length - 1,
    parsedRows,
  };
}

// Parse JSON format
function parseJSONFormat(content: string): ParsedFile {
  const exercises: ParsedExercise[] = [];
  const errors: string[] = [];
  let parsedRows = 0;

  try {
    const data = JSON.parse(content);

    // Handle array of exercises
    const items = Array.isArray(data) ? data : (data.exercises || data.workouts || [data]);

    for (const item of items) {
      const exerciseName = item.exercise || item.exerciseName || item.name || 'Unknown';
      const sets = [];

      if (Array.isArray(item.sets)) {
        for (const set of item.sets) {
          sets.push({
            weight: set.weight || 0,
            reps: set.reps || 0,
            setNumber: sets.length + 1,
          });
        }
      } else if (item.weight || item.reps) {
        const setCount = item.sets || 1;
        for (let i = 0; i < setCount; i++) {
          sets.push({
            weight: item.weight || 0,
            reps: item.reps || 0,
            setNumber: i + 1,
          });
        }
      }

      if (sets.length > 0) {
        exercises.push({
          id: Math.random().toString(36).substring(2, 9),
          exerciseName,
          sets,
          rawText: JSON.stringify(item).substring(0, 100),
          confidence: 'high',
        });
        parsedRows++;
      }
    }
  } catch (_err) {
    errors.push('Invalid JSON format');
  }

  return {
    format: 'json',
    exercises,
    errors,
    totalRows: parsedRows,
    parsedRows,
  };
}

// Main parse function
function parseFile(content: string, filename: string): ParsedFile {
  const format = detectFileFormat(content, filename);

  switch (format) {
    case 'strong':
      return parseStrongFormat(content);
    case 'hevy':
      return parseHevyFormat(content);
    case 'json':
      return parseJSONFormat(content);
    case 'csv':
      return parseGenericCSV(content);
    default:
      // Try generic CSV as fallback
      return parseGenericCSV(content);
  }
}

const formatLabels: Record<FileFormat, string> = {
  csv: 'CSV File',
  json: 'JSON File',
  strong: 'Strong App Export',
  hevy: 'Hevy Export',
  jefit: 'JEFIT Export',
  unknown: 'Unknown Format',
};

export function FileImportSheet({ onImport, onClose }: FileImportSheetProps) {
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.json', '.txt'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validTypes.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Please use CSV, JSON, or TXT.`);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setError(null);
    setFilename(file.name);
    setIsProcessing(true);
    haptic('light');

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const result = parseFile(content, file.name);
        setParsedFile(result);

        if (result.exercises.length === 0) {
          setError('No workout data found in file. Please check the format.');
        } else if (result.errors.length > 0) {
          setError(`Parsed with ${result.errors.length} warning(s)`);
        }
      } catch (_err) {
        setError('Failed to parse file. Please check the format.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, []);

  // Trigger file input
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Clear and reset
  const handleClear = useCallback(() => {
    setParsedFile(null);
    setFilename(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove exercise
  const handleRemoveExercise = useCallback((id: string) => {
    if (!parsedFile) return;
    setParsedFile({
      ...parsedFile,
      exercises: parsedFile.exercises.filter(e => e.id !== id),
    });
    haptic('light');
  }, [parsedFile]);

  // Import exercises
  const handleImport = useCallback(() => {
    if (parsedFile && parsedFile.exercises.length > 0) {
      haptic('medium');
      onImport(parsedFile.exercises);
    }
  }, [parsedFile, onImport]);

  // Calculate totals
  const totals = parsedFile?.exercises.reduce((acc, ex) => {
    acc.sets += ex.sets.length;
    ex.sets.forEach(s => {
      acc.reps += s.reps || 0;
      acc.volume += (s.weight || 0) * (s.reps || 0);
    });
    return acc;
  }, { sets: 0, reps: 0, volume: 0 }) || { sets: 0, reps: 0, volume: 0 };

  return (
    <div className="bg-gradient-to-br from-teal-600/20 to-cyan-600/20 border border-teal-500/30 rounded-2xl p-4 max-h-[80vh] flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-teal-400" />
          <span className="font-medium">File Import</span>
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
        {!parsedFile ? (
          // Upload area
          <div className="space-y-4">
            <button
              onClick={handleUploadClick}
              disabled={isProcessing}
              className="w-full aspect-video bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-teal-500/50 hover:bg-gray-800/70 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                  <p className="text-sm text-gray-400">Processing...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-teal-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Upload File</p>
                    <p className="text-sm text-gray-400">CSV, JSON, or TXT</p>
                  </div>
                </>
              )}
            </button>

            {/* Supported formats */}
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-teal-300 mb-3 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Supported Exports
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <span>Strong App</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span>Hevy</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                  <span>JEFIT</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileJson className="w-4 h-4 text-yellow-400" />
                  <span>JSON</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span>Generic CSV</span>
                </div>
              </div>
            </div>

            {/* CSV format help */}
            <div className="bg-gray-800/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">CSV Format</h3>
              <p className="text-xs text-gray-500 mb-2">Include these columns:</p>
              <code className="text-xs text-teal-300 bg-gray-900/50 rounded px-2 py-1 block">
                Exercise,Weight,Reps,Sets
              </code>
            </div>
          </div>
        ) : (
          // Parsed results
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-teal-400" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{filename}</p>
                  <p className="text-xs text-gray-500">{formatLabels[parsedFile.format]}</p>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800/50 rounded-xl p-2">
                <div className="text-lg font-bold text-teal-400">{parsedFile.parsedRows}</div>
                <div className="text-xs text-gray-500">Rows</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-2">
                <div className="text-lg font-bold text-green-400">{parsedFile.exercises.length}</div>
                <div className="text-xs text-gray-500">Exercises</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-2">
                <div className="text-lg font-bold text-blue-400">{totals.sets}</div>
                <div className="text-xs text-gray-500">Sets</div>
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {parsedFile.exercises.map((exercise) => (
                <SafeMotion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{exercise.exerciseName}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exercise.sets.slice(0, 5).map((set, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs"
                          >
                            {set.weight ? `${set.weight}×` : ''}{set.reps}
                          </span>
                        ))}
                        {exercise.sets.length > 5 && (
                          <span className="px-1.5 py-0.5 text-xs text-gray-500">
                            +{exercise.sets.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveExercise(exercise.id)}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </SafeMotion.div>
              ))}
            </div>

            {/* Import button */}
            {parsedFile.exercises.length > 0 && (
              <button
                onClick={handleImport}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Import {parsedFile.exercises.length} Exercise{parsedFile.exercises.length !== 1 ? 's' : ''}
              </button>
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
              className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-300 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>
      </div>
    </div>
  );
}

export default FileImportSheet;
