/**
 * ExportSheet Component
 *
 * Allows users to export their workout data in various formats:
 * - CSV (Excel/Sheets compatible)
 * - JSON (structured data)
 * - PDF (printable report)
 * - Strong App format
 * - Apple Health export
 *
 * Supports date range filtering and exercise selection.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Printer,
  Calendar,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { haptic } from '@/utils/haptics';
import { jsPDF } from 'jspdf';

interface ExportSheetProps {
  onClose: () => void;
}

type ExportFormat = 'csv' | 'json' | 'strong' | 'pdf';
type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

const WORKOUT_HISTORY_QUERY = gql`
  query WorkoutHistory($limit: Int, $after: String) {
    workoutHistory(limit: $limit, after: $after) {
      sessions {
        id
        startedAt
        endedAt
        totalTU
        sets {
          exerciseId
          exerciseName
          reps
          weightKg
          setNumber
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Format workout data for CSV export
function formatCSV(sessions: Array<{
  startedAt: string;
  sets: Array<{
    exerciseName: string;
    weightKg: number;
    reps: number;
    setNumber: number;
  }>;
}>): string {
  const headers = ['Date', 'Exercise', 'Set', 'Weight (lbs)', 'Reps'];
  const rows = [headers.join(',')];

  for (const session of sessions) {
    const date = new Date(session.startedAt).toLocaleDateString();
    for (const set of session.sets) {
      const weightLbs = Math.round(set.weightKg * 2.205);
      rows.push([
        date,
        `"${set.exerciseName}"`,
        set.setNumber.toString(),
        weightLbs.toString(),
        set.reps.toString(),
      ].join(','));
    }
  }

  return rows.join('\n');
}

// Format workout data for Strong app compatible CSV
function formatStrongCSV(sessions: Array<{
  startedAt: string;
  endedAt?: string;
  sets: Array<{
    exerciseName: string;
    weightKg: number;
    reps: number;
    setNumber: number;
  }>;
}>): string {
  const headers = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];
  const rows = [headers.join(',')];

  for (const session of sessions) {
    const date = new Date(session.startedAt).toISOString().split('T')[0];
    const duration = session.endedAt
      ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
      : 0;

    for (const set of session.sets) {
      const weightLbs = Math.round(set.weightKg * 2.205);
      rows.push([
        date,
        '"MuscleMap Export"',
        duration.toString(),
        `"${set.exerciseName}"`,
        set.setNumber.toString(),
        weightLbs.toString(),
        set.reps.toString(),
        '',
        '',
        '',
        '',
        '',
      ].join(','));
    }
  }

  return rows.join('\n');
}

// Format workout data for JSON export
function formatJSON(sessions: Array<{
  id: string;
  startedAt: string;
  endedAt?: string;
  totalTU: number;
  sets: Array<{
    exerciseId: string;
    exerciseName: string;
    weightKg: number;
    reps: number;
    setNumber: number;
  }>;
}>): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    source: 'MuscleMap',
    workouts: sessions.map(session => ({
      id: session.id,
      date: session.startedAt,
      endDate: session.endedAt,
      totalTU: session.totalTU,
      exercises: session.sets.reduce((acc, set) => {
        const existing = acc.find(e => e.name === set.exerciseName);
        if (existing) {
          existing.sets.push({
            weight: set.weightKg,
            weightLbs: Math.round(set.weightKg * 2.205),
            reps: set.reps,
          });
        } else {
          acc.push({
            id: set.exerciseId,
            name: set.exerciseName,
            sets: [{
              weight: set.weightKg,
              weightLbs: Math.round(set.weightKg * 2.205),
              reps: set.reps,
            }],
          });
        }
        return acc;
      }, [] as Array<{
        id: string;
        name: string;
        sets: Array<{ weight: number; weightLbs: number; reps: number }>;
      }>),
    })),
  }, null, 2);
}

// Generate PDF workout report
function generatePDF(
  sessions: Array<{
    startedAt: string;
    endedAt?: string;
    totalTU: number;
    sets: Array<{
      exerciseName: string;
      weightKg: number;
      reps: number;
      setNumber: number;
    }>;
  }>,
  stats: {
    sessions: number;
    sets: number;
    reps: number;
    volume: number;
    exercises: number;
  }
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper to add new page if needed
  const checkPageBreak = (height: number) => {
    if (yPos + height > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('MuscleMap Workout Report', margin, yPos);
  yPos += 10;

  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const dateRange = sessions.length > 0
    ? `${new Date(sessions[sessions.length - 1]?.startedAt).toLocaleDateString()} - ${new Date(sessions[0]?.startedAt).toLocaleDateString()}`
    : 'No workouts';
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${dateRange}`, margin, yPos);
  yPos += 15;

  // Summary Stats Box
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 35, 3, 3, 'F');
  yPos += 10;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin + 5, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const statText = `${stats.sessions} Workouts  |  ${stats.sets} Sets  |  ${stats.exercises} Exercises  |  ${stats.volume.toLocaleString()} lbs Total Volume`;
  doc.text(statText, margin + 5, yPos);
  yPos += 25;

  // Group sessions by week
  const sessionsByWeek = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const date = new Date(session.startedAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!sessionsByWeek.has(weekKey)) {
      sessionsByWeek.set(weekKey, []);
    }
    sessionsByWeek.get(weekKey)!.push(session);
  }

  // Workout details
  for (const session of sessions.slice(0, 20)) { // Limit to 20 sessions for PDF size
    checkPageBreak(60);

    // Session header
    const sessionDate = new Date(session.startedAt);
    const duration = session.endedAt
      ? Math.round((new Date(session.endedAt).getTime() - sessionDate.getTime()) / 60000)
      : 0;

    doc.setFillColor(59, 130, 246); // Blue
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${sessionDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${duration > 0 ? ` - ${duration} min` : ''}`,
      margin + 3,
      yPos + 6
    );
    yPos += 12;

    // Group sets by exercise
    const exerciseMap = new Map<string, Array<{ weight: number; reps: number }>>();
    for (const set of session.sets) {
      if (!exerciseMap.has(set.exerciseName)) {
        exerciseMap.set(set.exerciseName, []);
      }
      exerciseMap.get(set.exerciseName)!.push({
        weight: Math.round(set.weightKg * 2.205),
        reps: set.reps,
      });
    }

    // Exercise rows
    doc.setTextColor(0, 0, 0);
    for (const [exerciseName, sets] of exerciseMap) {
      checkPageBreak(10);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(exerciseName, margin + 3, yPos);

      doc.setFont('helvetica', 'normal');
      const setsText = sets.map((s) => `${s.weight}×${s.reps}`).join('  ');
      doc.text(setsText, margin + 80, yPos);
      yPos += 7;
    }

    yPos += 5;
  }

  // Footer with more sessions note
  if (sessions.length > 20) {
    checkPageBreak(15);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`+ ${sessions.length - 20} more workouts not shown (use CSV for full data)`, margin, yPos);
    yPos += 10;
  }

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}  |  MuscleMap`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}

// Trigger file download
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const formatOptions = [
  {
    id: 'csv' as const,
    name: 'CSV',
    description: 'Excel & Google Sheets',
    icon: FileSpreadsheet,
    color: 'text-green-400',
  },
  {
    id: 'json' as const,
    name: 'JSON',
    description: 'Developer-friendly',
    icon: FileJson,
    color: 'text-yellow-400',
  },
  {
    id: 'pdf' as const,
    name: 'PDF Report',
    description: 'Printable workout summary',
    icon: Printer,
    color: 'text-red-400',
  },
  {
    id: 'strong' as const,
    name: 'Strong Format',
    description: 'Compatible with Strong app',
    icon: FileText,
    color: 'text-blue-400',
  },
];

const dateRangeOptions = [
  { id: '7d' as const, label: 'Last 7 days' },
  { id: '30d' as const, label: 'Last 30 days' },
  { id: '90d' as const, label: 'Last 90 days' },
  { id: 'all' as const, label: 'All time' },
];

export function ExportSheet({ onClose }: ExportSheetProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch workout history
  const { data, loading } = useQuery(WORKOUT_HISTORY_QUERY, {
    variables: { limit: 500 },
    fetchPolicy: 'cache-and-network',
  });

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    if (!data?.workoutHistory?.sessions) return [];

    const sessions = data.workoutHistory.sessions;
    if (dateRange === 'all') return sessions;

    const now = new Date();
    const daysAgo = parseInt(dateRange);
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return sessions.filter((s: { startedAt: string }) => new Date(s.startedAt) >= cutoff);
  }, [data, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    const exercises = new Set<string>();

    for (const session of filteredSessions) {
      for (const set of session.sets || []) {
        totalSets++;
        totalReps += set.reps || 0;
        totalVolume += (set.weightKg || 0) * (set.reps || 0);
        exercises.add(set.exerciseName);
      }
    }

    return {
      sessions: filteredSessions.length,
      sets: totalSets,
      reps: totalReps,
      volume: Math.round(totalVolume * 2.205), // Convert to lbs
      exercises: exercises.size,
    };
  }, [filteredSessions]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (filteredSessions.length === 0) {
      setError('No workout data to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    haptic('medium');

    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      const timestamp = new Date().toISOString().split('T')[0];

      switch (selectedFormat) {
        case 'csv':
          content = formatCSV(filteredSessions);
          filename = `musclemap-export-${timestamp}.csv`;
          mimeType = 'text/csv';
          downloadFile(content, filename, mimeType);
          break;
        case 'json':
          content = formatJSON(filteredSessions);
          filename = `musclemap-export-${timestamp}.json`;
          mimeType = 'application/json';
          downloadFile(content, filename, mimeType);
          break;
        case 'pdf':
          const pdf = generatePDF(filteredSessions, stats);
          pdf.save(`musclemap-report-${timestamp}.pdf`);
          break;
        case 'strong':
          content = formatStrongCSV(filteredSessions);
          filename = `musclemap-strong-export-${timestamp}.csv`;
          mimeType = 'text/csv';
          downloadFile(content, filename, mimeType);
          break;
        default:
          throw new Error('Invalid format');
      }
      setExportSuccess(true);
      haptic('success');

      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (_err) {
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [filteredSessions, selectedFormat, stats]);

  return (
    <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-2xl p-4 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-400" />
          <span className="font-medium">Export Data</span>
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
        {/* Date Range Selector */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Range
          </label>
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full p-3 bg-gray-800/50 rounded-xl flex items-center justify-between"
            >
              <span>{dateRangeOptions.find(o => o.id === dateRange)?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>

            <SafeAnimatePresence>
              {showDatePicker && (
                <SafeMotion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-xl overflow-hidden z-10 border border-gray-700"
                >
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setDateRange(option.id);
                        setShowDatePicker(false);
                      }}
                      className={`w-full p-3 text-left hover:bg-gray-700 transition-colors ${
                        dateRange === option.id ? 'bg-indigo-600/20 text-indigo-300' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </SafeMotion.div>
              )}
            </SafeAnimatePresence>
          </div>
        </div>

        {/* Stats Preview */}
        {loading ? (
          <div className="h-24 bg-gray-800/50 rounded-xl animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-indigo-400">{stats.sessions}</div>
              <div className="text-xs text-gray-500">Workouts</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-green-400">{stats.sets}</div>
              <div className="text-xs text-gray-500">Sets</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{stats.exercises}</div>
              <div className="text-xs text-gray-500">Exercises</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{stats.volume.toLocaleString()}</div>
              <div className="text-xs text-gray-500">lbs lifted</div>
            </div>
          </div>
        )}

        {/* Format Selection */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Export Format</label>
          <div className="space-y-2">
            {formatOptions.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                    selectedFormat === format.id
                      ? 'bg-indigo-600/20 border border-indigo-500/50'
                      : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${format.color}`} />
                    <div className="text-left">
                      <p className="font-medium">{format.name}</p>
                      <p className="text-xs text-gray-500">{format.description}</p>
                    </div>
                  </div>
                  {selectedFormat === format.id && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Success Message */}
        <SafeAnimatePresence>
          {exportSuccess && (
            <SafeMotion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-300 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Export complete! Check your downloads.
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>

        {/* Error Message */}
        <SafeAnimatePresence>
          {error && (
            <SafeMotion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </SafeMotion.div>
          )}
        </SafeAnimatePresence>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting || loading || stats.sessions === 0}
        className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export {stats.sessions} Workout{stats.sessions !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </div>
  );
}

export default ExportSheet;
