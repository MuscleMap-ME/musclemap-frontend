/**
 * VenueRecordsList - List of Venue Records with Filters
 *
 * Displays:
 * - Filterable list of records
 * - Search by exercise or user
 * - Filter by record type, verification status
 * - Sort by value, date, rank
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Trophy,
  Weight,
  Timer,
  Repeat,
  Target,
  Shield,
  Video,
  Users,
  X,
} from 'lucide-react';
import { VenueRecordCard, type VenueRecordCardProps } from './VenueRecordCard';

// ============================================
// TYPES
// ============================================

type RecordType = 'MAX_WEIGHT' | 'MAX_REPS' | 'FASTEST_TIME' | 'MAX_DISTANCE' | 'MAX_1RM';
type VerificationStatus = 'UNVERIFIED' | 'SELF_VERIFIED' | 'WITNESS_VERIFIED' | 'VIDEO_VERIFIED' | 'PENDING_VERIFICATION';
type SortKey = 'rank' | 'value' | 'achievedAt';
type SortDirection = 'asc' | 'desc';

export interface VenueRecordsListProps {
  records: VenueRecordCardProps['record'][];
  currentUserId?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  onRecordClick?: (record: VenueRecordCardProps['record']) => void;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const RECORD_TYPE_OPTIONS: { value: RecordType; label: string; icon: React.ElementType }[] = [
  { value: 'MAX_WEIGHT', label: 'Max Weight', icon: Weight },
  { value: 'MAX_REPS', label: 'Max Reps', icon: Repeat },
  { value: 'FASTEST_TIME', label: 'Fastest Time', icon: Timer },
  { value: 'MAX_DISTANCE', label: 'Max Distance', icon: Target },
  { value: 'MAX_1RM', label: 'Est. 1RM', icon: Trophy },
];

const VERIFICATION_OPTIONS: { value: VerificationStatus; label: string; icon: React.ElementType | null }[] = [
  { value: 'VIDEO_VERIFIED', label: 'Video', icon: Video },
  { value: 'WITNESS_VERIFIED', label: 'Witness', icon: Users },
  { value: 'SELF_VERIFIED', label: 'Self', icon: Shield },
  { value: 'UNVERIFIED', label: 'Unverified', icon: null },
];

// ============================================
// COMPONENT
// ============================================

export function VenueRecordsList({
  records,
  currentUserId,
  showFilters = true,
  showSearch = true,
  onRecordClick,
  emptyMessage = 'No records found',
  className = '',
  compact = false,
}: VenueRecordsListProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<RecordType[]>([]);
  const [selectedVerifications, setSelectedVerifications] = useState<VerificationStatus[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let result = [...records];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.exerciseName.toLowerCase().includes(query) ||
          r.username.toLowerCase().includes(query) ||
          r.venueName.toLowerCase().includes(query)
      );
    }

    // Record type filter
    if (selectedRecordTypes.length > 0) {
      result = result.filter((r) => selectedRecordTypes.includes(r.recordType));
    }

    // Verification filter
    if (selectedVerifications.length > 0) {
      result = result.filter((r) => selectedVerifications.includes(r.verificationStatus));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'value':
          comparison = b.recordValue - a.recordValue;
          break;
        case 'achievedAt':
          comparison = new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, searchQuery, selectedRecordTypes, selectedVerifications, sortKey, sortDirection]);

  // Toggle filter
  const toggleRecordType = (type: RecordType) => {
    setSelectedRecordTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleVerification = (status: VerificationStatus) => {
    setSelectedVerifications((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRecordTypes([]);
    setSelectedVerifications([]);
    setSortKey('rank');
    setSortDirection('asc');
  };

  const hasActiveFilters =
    searchQuery || selectedRecordTypes.length > 0 || selectedVerifications.length > 0;

  return (
    <div className={className}>
      {/* Search and Filter Bar */}
      {(showSearch || showFilters) && (
        <div className="space-y-3 mb-4">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search exercises, users, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-white/40" />
                </button>
              )}
            </div>
          )}

          {/* Filter Toggle & Sort */}
          {showFilters && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  filtersExpanded || hasActiveFilters
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded-full">
                    {selectedRecordTypes.length + selectedVerifications.length + (searchQuery ? 1 : 0)}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                {/* Sort Selector */}
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="rank">Rank</option>
                  <option value="value">Value</option>
                  <option value="achievedAt">Date</option>
                </select>

                <button
                  onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {sortDirection === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Expanded Filters */}
          {filtersExpanded && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
              {/* Record Type Filters */}
              <div>
                <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Record Type</div>
                <div className="flex flex-wrap gap-2">
                  {RECORD_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => toggleRecordType(value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedRecordTypes.includes(value)
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification Filters */}
              <div>
                <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Verification</div>
                <div className="flex flex-wrap gap-2">
                  {VERIFICATION_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => toggleVerification(value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedVerifications.includes(value)
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-white/60 text-sm mb-3">
        {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
        {hasActiveFilters && ` (filtered from ${records.length})`}
      </div>

      {/* Records List */}
      {filteredRecords.length > 0 ? (
        <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
          {filteredRecords.map((record) => (
            <VenueRecordCard
              key={record.id}
              record={record}
              isCurrentUser={record.userId === currentUserId}
              onClick={onRecordClick ? () => onRecordClick(record) : undefined}
              compact={compact}
              showVenue={true}
              showExercise={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">{emptyMessage}</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-violet-400 hover:text-violet-300 text-sm"
            >
              Clear filters to see all records
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default VenueRecordsList;
