/**
 * LocationPrivacySettings - Privacy Controls for Location Records
 *
 * Allows users to control:
 * - Whether their records appear on venue leaderboards
 * - Whether their activity contributes to venue statistics
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  MapPin,
  Trophy,
  BarChart3,
  Shield,
  Info,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';

// ============================================
// GRAPHQL
// ============================================

const GET_PRIVACY_SETTINGS = gql`
  query GetLocationPrivacySettings {
    me {
      id
      shareLocationRecords
      shareVenueActivity
    }
  }
`;

const UPDATE_PRIVACY = gql`
  mutation UpdateLocationRecordPrivacy(
    $shareLocationRecords: Boolean!
    $shareVenueActivity: Boolean!
  ) {
    updateLocationRecordPrivacy(
      shareLocationRecords: $shareLocationRecords
      shareVenueActivity: $shareVenueActivity
    ) {
      shareLocationRecords
      shareVenueActivity
    }
  }
`;

// ============================================
// TYPES
// ============================================

export interface LocationPrivacySettingsProps {
  className?: string;
  compact?: boolean;
  onSettingsChange?: (settings: { shareLocationRecords: boolean; shareVenueActivity: boolean }) => void;
}

// ============================================
// COMPONENT
// ============================================

export function LocationPrivacySettings({
  className = '',
  compact = false,
  onSettingsChange,
}: LocationPrivacySettingsProps) {
  const [shareLocationRecords, setShareLocationRecords] = useState(false);
  const [shareVenueActivity, setShareVenueActivity] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings
  const { data, loading: queryLoading, error: queryError } = useQuery(GET_PRIVACY_SETTINGS);

  // Mutation
  const [updatePrivacy, { loading: mutationLoading, error: mutationError }] = useMutation(UPDATE_PRIVACY, {
    onCompleted: (data) => {
      setHasChanges(false);
      onSettingsChange?.({
        shareLocationRecords: data.updateLocationRecordPrivacy.shareLocationRecords,
        shareVenueActivity: data.updateLocationRecordPrivacy.shareVenueActivity,
      });
    },
  });

  // Initialize from query
  useEffect(() => {
    if (data?.me) {
      setShareLocationRecords(data.me.shareLocationRecords ?? false);
      setShareVenueActivity(data.me.shareVenueActivity ?? false);
    }
  }, [data]);

  // Track changes
  useEffect(() => {
    if (data?.me) {
      const originalRecords = data.me.shareLocationRecords ?? false;
      const originalActivity = data.me.shareVenueActivity ?? false;
      setHasChanges(
        shareLocationRecords !== originalRecords || shareVenueActivity !== originalActivity
      );
    }
  }, [shareLocationRecords, shareVenueActivity, data]);

  // Handle save
  const handleSave = async () => {
    await updatePrivacy({
      variables: {
        shareLocationRecords,
        shareVenueActivity,
      },
    });
  };

  // Toggle switch component
  const ToggleSwitch = ({
    enabled,
    onChange,
    disabled = false,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative w-12 h-6 rounded-full transition-colors
        ${enabled ? 'bg-violet-500' : 'bg-white/20'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform
          ${enabled ? 'translate-x-6' : ''}
        `}
      />
    </button>
  );

  // Loading state
  if (queryLoading) {
    return (
      <div className={`bg-white/5 rounded-xl border border-white/10 p-6 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading privacy settings...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (queryError) {
    return (
      <div className={`bg-red-500/10 rounded-xl border border-red-500/20 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Failed to load privacy settings</span>
        </div>
      </div>
    );
  }

  // Compact view (for embedding in other settings pages)
  if (compact) {
    return (
      <div className={className}>
        <div className="space-y-4">
          {/* Records Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-white font-medium">Share Location Records</div>
                <div className="text-white/60 text-sm">
                  Appear on venue leaderboards when you set PRs
                </div>
              </div>
            </div>
            <ToggleSwitch
              enabled={shareLocationRecords}
              onChange={setShareLocationRecords}
              disabled={mutationLoading}
            />
          </div>

          {/* Activity Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-white font-medium">Share Venue Activity</div>
                <div className="text-white/60 text-sm">
                  Include workouts in venue statistics and charts
                </div>
              </div>
            </div>
            <ToggleSwitch
              enabled={shareVenueActivity}
              onChange={setShareVenueActivity}
              disabled={mutationLoading}
            />
          </div>

          {/* Save Button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={mutationLoading}
              className="w-full py-2 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutationLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          )}

          {mutationError && (
            <div className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {mutationError.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-violet-400" />
          Location & Venue Privacy
        </h2>
        <p className="text-white/60 text-sm mt-1">
          Control how your workout data is shared at venues
        </p>
      </div>

      {/* Settings */}
      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <div className="px-4 py-3 bg-violet-500/10 rounded-xl border border-violet-500/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/80">
            When enabled, your records will appear on venue leaderboards and your workouts will
            contribute to community activity statistics. Your username will be visible to other
            users at the same venues.
          </div>
        </div>

        {/* Records Setting */}
        <div className="flex items-start justify-between py-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Show My Records on Leaderboards</h3>
              <p className="text-white/60 text-sm mt-1">
                When you set a personal record at a venue, it will appear on that venue&apos;s
                leaderboard. Other users can see your username, record value, and when you
                achieved it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white/5 rounded-full text-white/60">
                  Visible on leaderboards
                </span>
                <span className="px-2 py-1 bg-white/5 rounded-full text-white/60">
                  Username shown
                </span>
                <span className="px-2 py-1 bg-white/5 rounded-full text-white/60">
                  Record values public
                </span>
              </div>
            </div>
          </div>
          <ToggleSwitch
            enabled={shareLocationRecords}
            onChange={setShareLocationRecords}
            disabled={mutationLoading}
          />
        </div>

        {/* Activity Setting */}
        <div className="flex items-start justify-between py-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Include Activity in Venue Statistics</h3>
              <p className="text-white/60 text-sm mt-1">
                Your workouts will be included in aggregate venue statistics like &quot;X workouts
                today&quot; or &quot;popular exercises at this venue&quot;. Your individual data remains
                anonymous in these aggregations.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-white/5 rounded-full text-white/60">
                  Counted in stats
                </span>
                <span className="px-2 py-1 bg-white/5 rounded-full text-white/60">
                  Aggregate only
                </span>
                <span className="px-2 py-1 bg-white/5 rounded-full text-white/60">
                  Helps community insights
                </span>
              </div>
            </div>
          </div>
          <ToggleSwitch
            enabled={shareVenueActivity}
            onChange={setShareVenueActivity}
            disabled={mutationLoading}
          />
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-3 px-4 py-3 bg-white/5 rounded-xl">
          <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="text-sm text-white/60">
            <strong className="text-white">Your privacy matters.</strong> Even with these settings
            enabled, we never share your exact location, workout times, or personal details
            without your consent. Records only show the venue name, not the exact location
            within the venue.
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => {
              setShareLocationRecords(false);
              setShareVenueActivity(false);
            }}
            disabled={mutationLoading || (!shareLocationRecords && !shareVenueActivity)}
            className="flex-1 py-3 bg-white/5 text-white/60 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disable All
          </button>
          <button
            onClick={() => {
              setShareLocationRecords(true);
              setShareVenueActivity(true);
            }}
            disabled={mutationLoading || (shareLocationRecords && shareVenueActivity)}
            className="flex-1 py-3 bg-white/5 text-white/60 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enable All
          </button>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={mutationLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-pink-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutationLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Privacy Settings
              </>
            )}
          </button>
        )}

        {mutationError && (
          <div className="px-4 py-3 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {mutationError.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationPrivacySettings;
