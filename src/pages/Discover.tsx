/**
 * Discover Page
 *
 * Outdoor exercise equipment discovery and crowdsourcing hub.
 * Displays the equipment map with venues, equipment types, and filters.
 */

import React, { useState, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SafeMotion } from '@/utils/safeMotion';
import {
  MapPin,
  Filter,
  Plus,
  List,
  Map as MapIcon,
  Search,
  Star,
} from 'lucide-react';

// Lazy load the heavy map component
const EquipmentMap = lazy(() =>
  import('@/components/outdoor-equipment/EquipmentMap').then((m) => ({ default: m.EquipmentMap }))
);

// Lazy load location detail component
const LocationDetail = lazy(() =>
  import('@/components/outdoor-equipment/LocationDetail').then((m) => ({ default: m.LocationDetail }))
);

// Loading skeleton for map
function MapSkeleton() {
  return (
    <div className="w-full h-full bg-gray-800/50 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  );
}

// Loading skeleton for venue detail
function VenueDetailSkeleton() {
  return (
    <div className="h-full bg-white animate-pulse p-6">
      <div className="h-8 w-3/4 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
      <div className="h-48 bg-gray-200 rounded-lg mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { venueId } = useParams<{ venueId: string }>();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle venue selection - EquipmentMap passes venueId as string
  const handleVenueSelect = (venueId: string) => {
    // Navigate to venue detail page
    if (venueId) {
      navigate(`/discover/venue/${venueId}`);
    }
  };

  // Handle back from venue detail
  const handleBack = () => {
    navigate('/discover');
  };

  // If a venue is selected, show the detail view
  if (venueId) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <Suspense fallback={<VenueDetailSkeleton />}>
          <LocationDetail
            venueId={venueId}
            onBack={handleBack}
            className="flex-1 overflow-y-auto"
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-green-400" />
            <h1 className="text-xl font-bold">Discover</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="Map view"
              >
                <MapIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Add Location Button */}
            <button
              onClick={() => navigate('/discover/add')}
              className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              title="Add new location"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parks, gyms, equipment..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </header>

      {/* Quick Stats / Filters */}
      {showFilters && (
        <SafeMotion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="shrink-0 px-4 py-3 border-b border-gray-800 overflow-hidden"
        >
          <div className="flex gap-2 flex-wrap">
            <FilterChip label="Pull-up Bars" active />
            <FilterChip label="Dip Stations" />
            <FilterChip label="Parallel Bars" />
            <FilterChip label="Rings" />
            <FilterChip label="Monkey Bars" />
            <FilterChip label="Battle Ropes" />
            <FilterChip label="TRX" />
          </div>
        </SafeMotion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0 relative">
        {viewMode === 'map' ? (
          <Suspense fallback={<MapSkeleton />}>
            <EquipmentMap
              onVenueSelect={handleVenueSelect}
              searchQuery={searchQuery}
            />
          </Suspense>
        ) : (
          <ListView
            searchQuery={searchQuery}
            onVenueSelect={handleVenueSelect}
          />
        )}

        {/* Note: Location button is inside EquipmentMap component */}
      </main>

      {/* Bottom Info Bar */}
      <footer className="shrink-0 px-4 py-3 border-t border-gray-800 bg-gray-900/95">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>NYC Area</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Star className="w-4 h-4" />
              <span>500+ locations</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/discover/contribute')}
            className="text-green-400 hover:text-green-300 font-medium"
          >
            Contribute
          </button>
        </div>
      </footer>
    </div>
  );
}

// Filter Chip Component
function FilterChip({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

// List View Component (placeholder)
function ListView({
  searchQuery: _searchQuery,
  onVenueSelect,
}: {
  searchQuery: string;
  onVenueSelect: (venueId: string) => void;
}) {
  // This would query venues and display as a list
  // TODO: Use _searchQuery to filter venues
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-3">
        {/* Placeholder items */}
        {Array.from({ length: 10 }).map((_, i) => (
          <button
            key={i}
            onClick={() => onVenueSelect(`venue-${i}`)}
            className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-left hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">Outdoor Fitness Area {i + 1}</h3>
                <p className="text-sm text-gray-500">Central Park Area</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Pull-up</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">Dips</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm">4.5</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">0.3 mi</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
