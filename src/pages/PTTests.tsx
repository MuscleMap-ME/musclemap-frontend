/**
 * PT Tests Page - MuscleMap Liquid Glass Design
 *
 * Physical fitness tests for military, first responders, and occupational training.
 * Track test results, compare against standards, view progress over time.
 *
 * Converted to GraphQL for improved performance via Apollo caching.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store';
import {
  PT_TESTS_BY_INSTITUTION_QUERY,
  MY_ARCHETYPE_PT_TEST_QUERY,
  PT_TEST_RESULTS_QUERY,
  RECORD_PT_TEST_RESULT_MUTATION,
} from '../graphql';
import {
  GlassSurface,
  GlassButton,
  GlassNav,
  AnimatedLogo,
  GlassMobileNav,
  MeshBackground,
} from '../components/glass';

// TypeScript interfaces
interface PTTestComponent {
  id: string;
  name: string;
  type: string;
  durationSeconds?: number;
  distanceMiles?: number;
  description?: string;
}

interface PTTest {
  id: string;
  name: string;
  description?: string;
  institution?: string;
  components: PTTestComponent[];
  scoringMethod: string;
  maxScore?: number;
  passingScore?: number;
  testFrequency?: string;
  sourceUrl?: string;
  lastUpdated?: string;
  category?: string;
}

interface PTTestResult {
  id: string;
  testId: string;
  testName: string;
  institution?: string;
  testDate: string;
  componentResults: Record<string, unknown>;
  totalScore?: number;
  passed?: boolean;
  category?: string;
  official: boolean;
  location?: string;
  proctor?: string;
  notes?: string;
  recordedAt: string;
}

// Icons
const Icons = {
  Shield: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Star: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Clock: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronRight: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// Institution icons/colors
const INSTITUTION_META: Record<string, { color: string; icon: string }> = {
  'U.S. Army': { color: '#556B2F', icon: '🪖' },
  'U.S. Marine Corps': { color: '#8B0000', icon: '🦅' },
  'U.S. Navy': { color: '#000080', icon: '⚓' },
  'U.S. Air Force': { color: '#00308F', icon: '✈️' },
  'Fire Service': { color: '#B22222', icon: '🚒' },
  'Law Enforcement': { color: '#191970', icon: '🚔' },
  'FBI': { color: '#003366', icon: '🔍' },
  'EMS': { color: '#FF6347', icon: '🚑' },
  default: { color: '#6366f1', icon: '🏋️' },
};

// PT Test Card
function PTTestCard({
  test,
  onClick,
  isSelected,
}: {
  test: PTTest;
  onClick: () => void;
  isSelected: boolean;
}) {
  const meta = INSTITUTION_META[test.institution || ''] || INSTITUTION_META.default;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`w-full p-4 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-[var(--brand-blue-500)]/20 border-[var(--brand-blue-500)]'
          : 'bg-[var(--glass-white-5)] border-[var(--border-subtle)] hover:bg-[var(--glass-white-10)]'
      } border`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--text-primary)] truncate">{test.name}</h3>
          <p className="text-sm text-[var(--text-tertiary)]">{test.institution}</p>
        </div>
        <Icons.ChevronRight className="w-5 h-5 text-[var(--text-quaternary)]" />
      </div>
      {test.components && (
        <div className="mt-3 flex flex-wrap gap-1">
          {test.components.slice(0, 3).map(comp => (
            <span
              key={comp.id}
              className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-tertiary)]"
            >
              {comp.name}
            </span>
          ))}
          {test.components.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-tertiary)]">
              +{test.components.length - 3} more
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

// PT Test Detail View
function PTTestDetail({
  test,
  onRecordResult,
}: {
  test: PTTest;
  onRecordResult: () => void;
}) {
  const meta = INSTITUTION_META[test.institution || ''] || INSTITUTION_META.default;

  return (
    <GlassSurface className="p-6" depth="medium">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            {meta.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)]">{test.name}</h2>
            <p className="text-[var(--text-secondary)]">{test.institution}</p>
          </div>
        </div>
        <GlassButton variant="primary" onClick={onRecordResult}>
          <Icons.Plus className="w-5 h-5 mr-2" />
          Log Result
        </GlassButton>
      </div>

      {test.description && (
        <p className="text-[var(--text-tertiary)] mb-6">{test.description}</p>
      )}

      {/* Scoring Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {test.maxScore || '—'}
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">Max Score</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {test.passingScore || '—'}
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">Passing</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-2xl font-bold text-[var(--text-primary)] capitalize">
            {test.scoringMethod?.replace('_', ' ') || '—'}
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">Scoring</div>
        </div>
      </div>

      {/* Components */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Test Components</h3>
        <div className="space-y-3">
          {test.components?.map((comp, index) => (
            <div
              key={comp.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-white-5)]"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--brand-blue-500)]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--brand-blue-400)]">{index + 1}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[var(--text-primary)]">{comp.name}</div>
                {comp.description && (
                  <div className="text-sm text-[var(--text-tertiary)]">{comp.description}</div>
                )}
                <div className="flex gap-2 mt-1">
                  {comp.type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--glass-white-10)] text-[var(--text-quaternary)]">
                      {comp.type}
                    </span>
                  )}
                  {comp.durationSeconds && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--glass-white-10)] text-[var(--text-quaternary)]">
                      {comp.durationSeconds}s
                    </span>
                  )}
                  {comp.distanceMiles && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--glass-white-10)] text-[var(--text-quaternary)]">
                      {comp.distanceMiles} mi
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassSurface>
  );
}

// Record Result Modal
function RecordResultModal({
  isOpen,
  onClose,
  test,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  test: PTTest | null;
  onSubmit: (data: {
    ptTestId: string;
    testDate: string;
    componentResults: Array<{ componentId: string; value: number }>;
    official: boolean;
    location?: string;
    notes?: string;
  }) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    testDate: new Date().toISOString().split('T')[0],
    componentResults: {} as Record<string, string>,
    official: false,
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (test) {
      const results: Record<string, string> = {};
      test.components?.forEach(comp => {
        results[comp.id] = '';
      });
      setFormData(prev => ({ ...prev, componentResults: results }));
    }
  }, [test]);

  if (!isOpen || !test) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const results = Object.entries(formData.componentResults).map(([componentId, value]) => ({
      componentId,
      value: parseFloat(value) || 0,
    }));
    onSubmit({
      ptTestId: test.id,
      testDate: formData.testDate,
      componentResults: results,
      official: formData.official,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[var(--void-base)] border border-[var(--border-subtle)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Log PT Test Result</h2>
            <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Test Date
              </label>
              <input
                type="date"
                required
                value={formData.testDate}
                onChange={e => setFormData({ ...formData, testDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Results</h3>
              <div className="space-y-3">
                {test.components?.map(comp => (
                  <div key={comp.id}>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                      {comp.name}
                      {comp.type === 'time' && ' (seconds)'}
                      {comp.type === 'reps' && ' (reps)'}
                      {comp.type === 'distance' && ' (meters)'}
                      {comp.type === 'weight' && ' (lbs)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.componentResults[comp.id] || ''}
                      onChange={e => setFormData({
                        ...formData,
                        componentResults: {
                          ...formData.componentResults,
                          [comp.id]: e.target.value,
                        },
                      })}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      placeholder={comp.type === 'time' ? 'e.g., 720 for 12:00' : 'Enter value'}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                placeholder="e.g., Fort Bragg, Local Gym"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.official}
                onChange={e => setFormData({ ...formData, official: e.target.checked })}
                className="rounded border-[var(--border-subtle)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">This was an official/proctored test</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <GlassButton type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Result'}
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Result History Card
function ResultHistoryCard({ result }: { result: PTTestResult }) {
  const passed = result.passed;
  const meta = INSTITUTION_META[result.institution || ''] || INSTITUTION_META.default;

  return (
    <div className="p-4 rounded-xl bg-[var(--glass-white-5)] border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{result.testName}</div>
            <div className="text-xs text-[var(--text-tertiary)]">
              {new Date(result.testDate).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          {result.totalScore !== null && result.totalScore !== undefined && (
            <div className="text-xl font-bold text-[var(--text-primary)]">{result.totalScore}</div>
          )}
          {passed !== null && passed !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              passed
                ? 'bg-[var(--feedback-success)]/20 text-[var(--feedback-success)]'
                : 'bg-[var(--feedback-error)]/20 text-[var(--feedback-error)]'
            }`}>
              {passed ? 'PASS' : 'FAIL'}
            </span>
          )}
          {result.category && (
            <div className="text-sm text-[var(--text-secondary)]">{result.category}</div>
          )}
        </div>
      </div>
      {result.official && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]">
          Official
        </span>
      )}
    </div>
  );
}

// Main PT Tests Page
export default function PTTests() {
  const { isAuthenticated } = useAuth();
  const [selectedTest, setSelectedTest] = useState<PTTest | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tests');

  // GraphQL Queries - PT tests list is public data
  const { data: testsData, loading: testsLoading } = useQuery(PT_TESTS_BY_INSTITUTION_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: archetypeTestData } = useQuery(MY_ARCHETYPE_PT_TEST_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { data: resultsData, refetch: refetchResults } = useQuery(PT_TEST_RESULTS_QUERY, {
    variables: { limit: 20 },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL Mutation
  const [recordResult, { loading: isRecording }] = useMutation(RECORD_PT_TEST_RESULT_MUTATION, {
    onCompleted: () => {
      setShowRecordModal(false);
      refetchResults();
    },
    onError: (err) => {
      console.error('Failed to record result:', err);
    },
  });

  // Memoized data extraction
  const testsByInstitution: Record<string, PTTest[]> = useMemo(() => {
    return testsData?.ptTestsByInstitution?.byInstitution || {};
  }, [testsData]);

  const myArchetypeTest: PTTest | null = useMemo(() => {
    return archetypeTestData?.myArchetypePTTest || null;
  }, [archetypeTestData]);

  const results: PTTestResult[] = useMemo(() => {
    return resultsData?.ptTestResults || [];
  }, [resultsData]);

  // Debug effect - will remove after fixing
  useEffect(() => {
    console.info('[PTTests] Query state:', {
      testsLoading,
      testsData: testsData ? 'present' : 'null',
      byInstitution: testsData?.ptTestsByInstitution?.byInstitution ? 'present' : 'null',
      institutionCount: Object.keys(testsByInstitution).length,
    });
  }, [testsLoading, testsData, testsByInstitution]);

  // Handlers
  const handleRecordResult = useCallback(
    (data: {
      ptTestId: string;
      testDate: string;
      componentResults: Array<{ componentId: string; value: number }>;
      official: boolean;
      location?: string;
      notes?: string;
    }) => {
      recordResult({
        variables: {
          input: data,
        },
      });
    },
    [recordResult]
  );

  const handleSelectTest = useCallback((test: PTTest) => {
    setSelectedTest(test);
  }, []);

  const handleOpenRecordModal = useCallback(() => {
    setShowRecordModal(true);
  }, []);

  const handleCloseRecordModal = useCallback(() => {
    setShowRecordModal(false);
  }, []);

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <AnimatedLogo size={32} breathing />
            <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <div className="flex pt-16">
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Fitness Standards
              </h1>
              <p className="text-[var(--text-secondary)]">
                Track your progress against military, first responder, and career fitness tests
              </p>
            </div>

            {/* My Archetype Test Banner */}
            {myArchetypeTest && (
              <GlassSurface className="p-4 mb-6" depth="subtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icons.Star className="w-5 h-5 text-[var(--brand-blue-400)]" />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">Your PT Test</div>
                      <div className="text-sm text-[var(--text-tertiary)]">
                        {myArchetypeTest.name} ({myArchetypeTest.institution})
                      </div>
                    </div>
                  </div>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedTest(myArchetypeTest);
                      setShowRecordModal(true);
                    }}
                  >
                    Log Result
                  </GlassButton>
                </div>
              </GlassSurface>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'tests', label: 'All Tests', icon: Icons.Shield },
                { key: 'history', label: 'My History', icon: Icons.Clock },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[var(--brand-blue-500)] text-white'
                      : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {testsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand-blue-500)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'tests' ? (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Test List */}
                <div className="space-y-4">
                  {Object.entries(testsByInstitution).map(([institution, institutionTests]) => (
                    <div key={institution}>
                      <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
                        {institution}
                      </h3>
                      <div className="space-y-2">
                        {(institutionTests as PTTest[]).map(test => (
                          <PTTestCard
                            key={test.id}
                            test={test}
                            onClick={() => handleSelectTest(test)}
                            isSelected={selectedTest?.id === test.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Test Detail */}
                <div className="lg:sticky lg:top-24 lg:h-fit">
                  {selectedTest ? (
                    <PTTestDetail
                      test={selectedTest}
                      onRecordResult={handleOpenRecordModal}
                    />
                  ) : (
                    <GlassSurface className="p-12 text-center" depth="subtle">
                      <Icons.Shield className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        Choose a Standard
                      </h3>
                      <p className="text-[var(--text-tertiary)]">
                        Select a fitness test from the list to view requirements and track your results
                      </p>
                    </GlassSurface>
                  )}
                </div>
              </div>
            ) : (
              /* History Tab */
              <div>
                {results.length === 0 ? (
                  <GlassSurface className="p-12 text-center" depth="subtle">
                    <Icons.Clock className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                      No Results Yet
                    </h3>
                    <p className="text-[var(--text-tertiary)] mb-6">
                      Log your first PT test result to start tracking your progress
                    </p>
                    <GlassButton variant="primary" onClick={() => setActiveTab('tests')}>
                      Browse Tests
                    </GlassButton>
                  </GlassSurface>
                ) : (
                  <div className="space-y-4">
                    {results.map(result => (
                      <ResultHistoryCard key={result.id} result={result} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <GlassMobileNav items={[
        { to: '/dashboard', icon: Icons.Shield, label: 'Home' },
        { to: '/pt-tests', icon: Icons.Shield, label: 'PT Tests', active: true },
        { to: '/profile', icon: Icons.Shield, label: 'Profile' },
      ]} />

      <RecordResultModal
        isOpen={showRecordModal}
        onClose={handleCloseRecordModal}
        test={selectedTest}
        onSubmit={handleRecordResult}
        isSubmitting={isRecording}
      />
    </div>
  );
}
