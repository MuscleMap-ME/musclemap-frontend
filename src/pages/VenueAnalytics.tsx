/**
 * VenueAnalytics Page
 *
 * Shows comprehensive analytics for a specific venue including:
 * - Activity trends and patterns
 * - Exercise distribution
 * - Leaderboards
 * - Community stats
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  ArrowLeft,
  MapPin,
  Trophy,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { VenueAnalyticsDashboard } from '../components/venue-analytics';
import { VenueRecordClaim, VenueRecordsList } from '../components/venue-records';

// ============================================
// GRAPHQL QUERIES
// ============================================

const VENUE_ANALYTICS_QUERY = gql`
  query VenueAnalyticsQuery($venueId: ID!, $startDate: Date!, $endDate: Date!) {
    venueActivitySummary(venueId: $venueId, startDate: $startDate, endDate: $endDate) {
      venueId
      venue {
        id
        name
        address
        latitude
        longitude
      }
      startDate
      endDate
      totalWorkouts
      uniqueUsers
      totalRecordsSet
      totalVolumeKg
      totalTu
      dailyWorkouts {
        date
        value
      }
      dailyUsers {
        date
        value
      }
      dailyRecords {
        date
        value
      }
      exerciseDistribution {
        exerciseId
        exerciseName
        count
        percentage
      }
      muscleDistribution {
        muscleId
        muscleName
        totalTu
        percentage
      }
      hourlyPattern {
        hour
        averageUsers
        averageWorkouts
      }
      weekdayPattern {
        dayOfWeek
        dayName
        averageUsers
        averageWorkouts
      }
      topContributors {
        userId
        username
        avatarUrl
        totalWorkouts
        totalVolumeKg
        recordsHeld
      }
      recentRecords {
        id
        exerciseId
        exerciseName: exercise { name }
        userId
        user {
          id
          username
          avatarUrl
        }
        recordType
        recordValue
        recordUnit
        verificationStatus
        achievedAt
        rank
      }
    }

    venueLeaderboard(
      venueId: $venueId
      exerciseId: "bench-press"
      recordType: MAX_WEIGHT
      limit: 10
    ) {
      exerciseId
      exercise {
        id
        name
      }
      recordType
      totalParticipants
      entries {
        rank
        userId
        username
        avatarUrl
        value
        unit
        achievedAt
        verificationStatus
        isCurrentUser
      }
      myRank
    }

    myVenueRecords(venueId: $venueId, limit: 10) {
      edges {
        id
        venueId
        venue {
          id
          name
        }
        exerciseId
        exercise {
          id
          name
        }
        recordType
        recordValue
        recordUnit
        rank
        verificationStatus
        achievedAt
      }
      totalCount
    }
  }
`;

const EXERCISES_QUERY = gql`
  query ExercisesForRecordClaim {
    exercises(limit: 200) {
      id
      name
      primaryMuscles
    }
  }
`;

const CLAIM_VENUE_RECORD = gql`
  mutation ClaimVenueRecord($input: ClaimVenueRecordInput!) {
    claimVenueRecord(input: $input) {
      record {
        id
        recordType
        recordValue
        recordUnit
        rank
        verificationStatus
        achievedAt
      }
      isNewRecord
      previousValue
      previousHolderId
      rank
      achievements {
        id
        key
        name
      }
    }
  }
`;

// ============================================
// COMPONENT
// ============================================

export default function VenueAnalytics() {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();

  // Date range state (default to last 30 days)
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  });

  // UI State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Queries
  const { data, loading, error, refetch } = useQuery(VENUE_ANALYTICS_QUERY, {
    variables: {
      venueId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    skip: !venueId,
  });

  const { data: exercisesData } = useQuery(EXERCISES_QUERY);

  // Mutations
  const [claimRecord, { loading: claiming }] = useMutation(CLAIM_VENUE_RECORD, {
    onCompleted: () => {
      setShowClaimModal(false);
      setClaimError(null);
      refetch();
    },
    onError: (err) => {
      setClaimError(err.message);
    },
  });

  // Extract data
  const activitySummary = data?.venueActivitySummary;
  const leaderboard = data?.venueLeaderboard;
  const myRecords = data?.myVenueRecords?.edges || [];
  const exercises = exercisesData?.exercises || [];

  // Handle date range change
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  // Handle record claim
  const handleClaimRecord = async (claimData: {
    venueId: string;
    exerciseId: string;
    recordType: string;
    recordValue: number;
    recordUnit: string;
    repsAtWeight?: number;
    weightAtReps?: number;
    notes?: string;
  }) => {
    await claimRecord({
      variables: {
        input: {
          venueId: claimData.venueId,
          exerciseId: claimData.exerciseId,
          recordType: claimData.recordType,
          recordValue: claimData.recordValue,
          recordUnit: claimData.recordUnit,
          repsAtWeight: claimData.repsAtWeight,
          weightAtReps: claimData.weightAtReps,
          notes: claimData.notes,
        },
      },
    });
  };

  // Transform data for dashboard
  const dashboardData = useMemo(() => {
    if (!activitySummary) return null;

    return {
      venueName: activitySummary.venue?.name || 'Unknown Venue',
      venueId: activitySummary.venueId,
      dateRange,
      summary: {
        totalWorkouts: activitySummary.totalWorkouts,
        uniqueUsers: activitySummary.uniqueUsers,
        totalRecordsSet: activitySummary.totalRecordsSet,
        totalVolumeKg: activitySummary.totalVolumeKg,
        totalTu: activitySummary.totalTu,
      },
      dailyWorkouts: activitySummary.dailyWorkouts,
      dailyUsers: activitySummary.dailyUsers,
      dailyRecords: activitySummary.dailyRecords,
      exerciseDistribution: activitySummary.exerciseDistribution,
      muscleDistribution: activitySummary.muscleDistribution,
      hourlyPattern: activitySummary.hourlyPattern?.map((h: { averageUsers: number }) => h.averageUsers) || [],
      weekdayPattern: activitySummary.weekdayPattern,
      topExercise: leaderboard
        ? {
            exerciseId: leaderboard.exerciseId,
            exerciseName: leaderboard.exercise?.name || 'Bench Press',
            recordType: leaderboard.recordType,
            entries: leaderboard.entries,
            totalParticipants: leaderboard.totalParticipants,
          }
        : undefined,
    };
  }, [activitySummary, leaderboard, dateRange]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded w-1/4" />
            <div className="h-64 bg-white/5 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-48 bg-white/5 rounded-xl" />
              <div className="h-48 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Analytics</h2>
            <p className="text-white/60">{error.message}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-6 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {activitySummary?.venue?.name || 'Venue Analytics'}
                </h1>
                {activitySummary?.venue?.address && (
                  <p className="text-white/60 text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {activitySummary.venue.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClaimModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-lg hover:from-violet-600 hover:to-pink-600 transition-colors"
              >
                <Trophy className="w-4 h-4" />
                Claim Record
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {dashboardData && (
          <VenueAnalyticsDashboard
            {...dashboardData}
            onDateRangeChange={handleDateRangeChange}
            onExerciseClick={(exerciseId) => {
              navigate(`/exercises/${exerciseId}`);
            }}
            onLeaderboardRowClick={(entry) => {
              navigate(`/profile/${entry.username}`);
            }}
          />
        )}

        {/* My Records Section */}
        {myRecords.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                My Records at This Venue
              </h2>
              <Link
                to="/me/records"
                className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <VenueRecordsList
              records={myRecords.map((r: {
                id: string;
                venueId: string;
                venue: { name: string };
                exerciseId: string;
                exercise: { name: string };
                userId?: string;
                recordType: string;
                recordValue: number;
                recordUnit: string;
                rank: number;
                verificationStatus: string;
                achievedAt: string;
              }) => ({
                ...r,
                venueName: r.venue?.name || '',
                exerciseName: r.exercise?.name || '',
                username: 'You',
                userId: r.userId || '',
              }))}
              showFilters={false}
              showSearch={false}
              compact={true}
            />
          </div>
        )}
      </div>

      {/* Claim Record Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <VenueRecordClaim
              venueId={venueId || ''}
              venueName={activitySummary?.venue?.name || 'This Venue'}
              exercises={exercises}
              onSubmit={handleClaimRecord}
              onCancel={() => {
                setShowClaimModal(false);
                setClaimError(null);
              }}
              loading={claiming}
              error={claimError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
