/**
 * EquipmentEditor Component
 *
 * Visual interface for suggesting new equipment at venues and
 * voting on existing equipment conditions. Features:
 * - Icon-based equipment type selection
 * - Condition slider with visual feedback
 * - Photo upload option
 * - Location verification indicator
 * - Community voting on suggestions
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Plus,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  OUTDOOR_EQUIPMENT_TYPES_QUERY,
  PENDING_EQUIPMENT_SUGGESTIONS_QUERY,
  SUGGEST_EQUIPMENT_MUTATION,
  VOTE_ON_SUGGESTION_MUTATION,
} from '@/graphql/queries';
import { useGeolocationWithHelp } from '@/hooks/useGeolocationWithHelp';
import { GeolocationHelper } from '@/components/help/GeolocationHelper';

// Equipment categories for organization
const EQUIPMENT_CATEGORIES = [
  { id: 'pull', name: 'Pull', icon: '💪' },
  { id: 'push', name: 'Push', icon: '🤸' },
  { id: 'cardio', name: 'Cardio', icon: '🏃' },
  { id: 'core', name: 'Core', icon: '🎯' },
  { id: 'flexibility', name: 'Flexibility', icon: '🧘' },
  { id: 'other', name: 'Other', icon: '⚙️' },
];

// Condition levels with colors
const CONDITIONS = [
  { id: 'excellent', name: 'Excellent', color: 'bg-green-500', emoji: '✨' },
  { id: 'good', name: 'Good', color: 'bg-blue-500', emoji: '👍' },
  { id: 'fair', name: 'Fair', color: 'bg-yellow-500', emoji: '😐' },
  { id: 'poor', name: 'Poor', color: 'bg-orange-500', emoji: '👎' },
  { id: 'broken', name: 'Broken', color: 'bg-red-500', emoji: '⚠️' },
];

// Map equipment type to icon name (fallback mapping)
const EQUIPMENT_ICONS: Record<string, string> = {
  pull_up_bar: '💪',
  parallel_bars: '🤸',
  dip_station: '🏋️',
  rings: '⭕',
  climbing_wall: '🧗',
  monkey_bars: '🐒',
  bench: '🪑',
  sit_up_bench: '🎯',
  balance_beam: '⚖️',
  elliptical: '🏃',
  stationary_bike: '🚴',
  rowing_machine: '🚣',
  step_platform: '📈',
  stretching_station: '🧘',
  default: '⚙️',
};

interface EquipmentType {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  iconName: string | null;
  muscleGroups: string[];
}

interface EquipmentSuggestion {
  id: string;
  venueId: string;
  equipmentType: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
  photoUrl: string | null;
  status: string;
  supportCount: number;
  rejectCount: number;
  suggestedBy: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null;
  locationVerified: boolean;
  createdAt: string;
}

interface EquipmentEditorProps {
  venueId: string;
  onClose?: () => void;
  onSuggestionAdded?: () => void;
  className?: string;
}

type EditorMode = 'list' | 'add' | 'vote';

export function EquipmentEditor({
  venueId,
  onClose,
  onSuggestionAdded,
  className = '',
}: EquipmentEditorProps) {
  const [mode, setMode] = useState<EditorMode>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Geolocation for verification
  const {
    position,
    error: geoError,
    loading: geoLoading,
    showHelp,
    platformInfo,
    instructionKey,
    requestLocation,
    dismissHelp,
    retryLocation,
  } = useGeolocationWithHelp({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
  });

  // Fetch equipment types
  const { data: typesData, loading: typesLoading } = useQuery(OUTDOOR_EQUIPMENT_TYPES_QUERY);

  // Fetch pending suggestions
  const { data: suggestionsData, loading: suggestionsLoading, refetch: refetchSuggestions } = useQuery(
    PENDING_EQUIPMENT_SUGGESTIONS_QUERY,
    { variables: { venueId } }
  );

  // Mutations
  const [suggestEquipment, { loading: suggesting }] = useMutation(SUGGEST_EQUIPMENT_MUTATION, {
    onCompleted: (data) => {
      if (data.suggestEquipment.success) {
        setSubmitSuccess(true);
        setSubmitError(null);
        setSelectedEquipment(null);
        setQuantity(1);
        setCondition('good');
        setNotes('');
        refetchSuggestions();
        onSuggestionAdded?.();
        setTimeout(() => {
          setSubmitSuccess(false);
          setMode('list');
        }, 2000);
      } else {
        setSubmitError(data.suggestEquipment.message || 'Failed to submit suggestion');
      }
    },
    onError: (error) => {
      setSubmitError(error.message);
    },
  });

  const [voteOnSuggestion, { loading: voting }] = useMutation(VOTE_ON_SUGGESTION_MUTATION, {
    onCompleted: () => {
      refetchSuggestions();
    },
  });

  const equipmentTypes: EquipmentType[] = typesData?.outdoorEquipmentTypes || [];
  const suggestions: EquipmentSuggestion[] = suggestionsData?.pendingEquipmentSuggestions || [];

  // Filter equipment by category
  const filteredEquipment = selectedCategory
    ? equipmentTypes.filter((eq) => eq.category.toLowerCase() === selectedCategory.toLowerCase())
    : equipmentTypes;

  // Get icon for equipment
  const getEquipmentIcon = (equipment: EquipmentType) => {
    return EQUIPMENT_ICONS[equipment.slug] || EQUIPMENT_ICONS.default;
  };

  // Handle suggestion submission
  const handleSubmitSuggestion = useCallback(() => {
    if (!selectedEquipment) return;

    setSubmitError(null);

    suggestEquipment({
      variables: {
        venueId,
        input: {
          equipmentType: selectedEquipment.slug,
          quantity,
          condition,
          notes: notes || null,
          latitude: position?.latitude,
          longitude: position?.longitude,
        },
      },
    });
  }, [selectedEquipment, venueId, quantity, condition, notes, position, suggestEquipment]);

  // Handle vote on suggestion
  const handleVote = useCallback(
    (suggestionId: string, support: boolean) => {
      voteOnSuggestion({
        variables: {
          suggestionId,
          support,
          latitude: position?.latitude,
          longitude: position?.longitude,
        },
      });
    },
    [position, voteOnSuggestion]
  );

  // Request location on mount if not available
  React.useEffect(() => {
    if (!position && !geoLoading && !geoError) {
      requestLocation();
    }
  }, [position, geoLoading, geoError, requestLocation]);

  // Render equipment type grid
  const renderEquipmentGrid = () => (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          All
        </button>
        {EQUIPMENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Equipment grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {filteredEquipment.map((equipment) => (
          <button
            key={equipment.id}
            onClick={() => setSelectedEquipment(equipment)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
              selectedEquipment?.id === equipment.id
                ? 'bg-blue-500 text-white ring-2 ring-blue-400'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <span className="text-2xl mb-1">{getEquipmentIcon(equipment)}</span>
            <span className="text-xs text-center line-clamp-2">{equipment.name}</span>
          </button>
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <p className="text-center text-white/50 py-8">No equipment types in this category</p>
      )}
    </div>
  );

  // Render condition selector
  const renderConditionSelector = () => (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/80">Condition</label>
      <div className="flex gap-2">
        {CONDITIONS.map((cond) => (
          <button
            key={cond.id}
            onClick={() => setCondition(cond.id)}
            className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${
              condition === cond.id
                ? `${cond.color} text-white`
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <span className="text-lg">{cond.emoji}</span>
            <span className="text-xs mt-1">{cond.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render quantity selector
  const renderQuantitySelector = () => (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/80">Quantity</label>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          disabled={quantity <= 1}
        >
          -
        </button>
        <span className="text-2xl font-bold text-white w-12 text-center">{quantity}</span>
        <button
          onClick={() => setQuantity(Math.min(10, quantity + 1))}
          className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          disabled={quantity >= 10}
        >
          +
        </button>
      </div>
    </div>
  );

  // Render pending suggestions list
  const renderSuggestionsList = () => (
    <div className="space-y-3">
      {suggestions.length === 0 ? (
        <p className="text-center text-white/50 py-6">No pending equipment suggestions</p>
      ) : (
        suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-white/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-white capitalize">
                  {suggestion.equipmentType.replace(/_/g, ' ')}
                </h4>
                <p className="text-sm text-white/60">
                  {suggestion.quantity}x • {suggestion.condition || 'Unknown condition'}
                </p>
                {suggestion.suggestedBy && (
                  <p className="text-xs text-white/40 mt-1">
                    by {suggestion.suggestedBy.displayName || suggestion.suggestedBy.username}
                  </p>
                )}
              </div>
              {suggestion.locationVerified && (
                <span className="flex items-center text-xs text-green-400">
                  <MapPin className="w-3 h-3 mr-1" />
                  Verified
                </span>
              )}
            </div>

            {suggestion.notes && (
              <p className="text-sm text-white/70 bg-white/5 rounded-lg p-2">
                {suggestion.notes}
              </p>
            )}

            {/* Vote buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleVote(suggestion.id, true)}
                  disabled={voting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{suggestion.supportCount}</span>
                </button>
                <button
                  onClick={() => handleVote(suggestion.id, false)}
                  disabled={voting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>{suggestion.rejectCount}</span>
                </button>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${Math.min(100, (suggestion.supportCount / 3) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-white/50">{suggestion.supportCount}/3</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Loading state
  if (typesLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {mode !== 'list' && (
            <button
              onClick={() => setMode('list')}
              className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <h3 className="text-lg font-semibold text-white">
            {mode === 'list' && 'Equipment Suggestions'}
            {mode === 'add' && 'Suggest Equipment'}
            {mode === 'vote' && 'Vote on Equipment'}
          </h3>
        </div>
        {mode === 'list' && (
          <button
            onClick={() => setMode('add')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add</span>
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Location status */}
      {(geoError || geoLoading) && (
        <div className="px-4 py-2 bg-yellow-500/20 border-b border-yellow-500/30">
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            {geoLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Getting your location...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>{geoError?.message || 'Location unavailable'}</span>
                <button
                  onClick={requestLocation}
                  className="ml-auto text-yellow-300 underline"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {mode === 'list' && (
          <>
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : (
              renderSuggestionsList()
            )}
          </>
        )}

        {mode === 'add' && (
          <div className="space-y-6">
            {/* Success message */}
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-500/20 rounded-lg text-green-400">
                <Check className="w-5 h-5" />
                <span>Equipment suggestion submitted! +20 credits</span>
              </div>
            )}

            {/* Error message */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span>{submitError}</span>
              </div>
            )}

            {!selectedEquipment ? (
              renderEquipmentGrid()
            ) : (
              <div className="space-y-6">
                {/* Selected equipment */}
                <div className="flex items-center justify-between p-3 bg-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getEquipmentIcon(selectedEquipment)}</span>
                    <div>
                      <p className="font-medium text-white">{selectedEquipment.name}</p>
                      <p className="text-xs text-white/60 capitalize">{selectedEquipment.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEquipment(null)}
                    className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {renderQuantitySelector()}
                {renderConditionSelector()}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional details about this equipment..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-blue-500 focus:outline-none resize-none"
                    rows={3}
                  />
                </div>

                {/* Location verification indicator */}
                <div className="flex items-center gap-2 text-sm">
                  {position ? (
                    <span className="flex items-center gap-1.5 text-green-400">
                      <MapPin className="w-4 h-4" />
                      Location verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      Location not verified (must be within 500m)
                    </span>
                  )}
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmitSuggestion}
                  disabled={suggesting || !position}
                  className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {suggesting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Submit Suggestion</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Geolocation help modal */}
      {showHelp && (
        <GeolocationHelper
          isOpen={showHelp}
          onClose={dismissHelp}
          onRetry={retryLocation}
          platformInfo={platformInfo}
          instructionKey={instructionKey}
        />
      )}
    </div>
  );
}

export default EquipmentEditor;
