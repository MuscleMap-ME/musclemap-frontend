/**
 * LocationDetail Component
 *
 * Detailed view of an outdoor fitness venue with equipment list,
 * photos, verification info, and contribution actions.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import {
  MapPin,
  CheckCircle,
  Camera,
  ChevronLeft,
  Share2,
  Flag,
  Navigation,
  ThumbsUp,
  X,
  AlertTriangle,
  Dumbbell,
  HelpCircle,
} from 'lucide-react';
import { GeolocationHelper } from '@/components/help/GeolocationHelper';
import { useGeolocationWithHelp } from '@/hooks/useGeolocationWithHelp';

const GET_VENUE = gql`
  query GetVenue($id: ID!) {
    outdoorVenue(id: $id) {
      id
      name
      slug
      description
      latitude
      longitude
      address
      borough
      neighborhood
      venueType
      dataSource
      amenities
      surfaceType
      lightingAvailable
      coveredArea
      accessibleFeatures
      operatingHours
      seasonalAvailability
      equipment {
        id
        equipmentType {
          id
          name
          category
          iconName
        }
        condition
        quantity
        notes
        isVerified
        verificationCount
      }
      photos {
        id
        url
        thumbnailUrl
        caption
        uploadedBy {
          username
          displayName
        }
        isFeatured
        createdAt
      }
      verificationCount
      lastVerifiedAt
      averageRating
      totalRatings
      isVerified
      createdAt
    }
  }
`;

const VERIFY_VENUE = gql`
  mutation VerifyVenue($venueId: ID!, $input: VenueVerifyInput!) {
    verifyVenue(venueId: $venueId, input: $input) {
      success
      creditsEarned
      message
    }
  }
`;

const REPORT_ISSUE = gql`
  mutation ReportIssue($venueId: ID!, $input: VenueReportInput!) {
    reportVenueIssue(venueId: $venueId, input: $input) {
      success
      message
    }
  }
`;

// Condition badges
const conditionColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-orange-100 text-orange-700',
  broken: 'bg-red-100 text-red-700',
};

interface LocationDetailProps {
  venueId: string;
  onBack?: () => void;
  onNavigate?: (lat: number, lng: number) => void;
  className?: string;
}

export function LocationDetail({
  venueId,
  onBack,
  onNavigate,
  className = '',
}: LocationDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'photos'>('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showVerifySuccess, setShowVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Use the enhanced geolocation hook with help system
  const {
    position,
    error: geoError,
    loading: isGettingLocation,
    showHelp,
    platformInfo,
    instructionKey,
    requestLocation,
    dismissHelp,
    openHelp,
    retryLocation,
    clearError,
  } = useGeolocationWithHelp({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000,
  });

  const { data, loading, error, refetch } = useQuery(GET_VENUE, {
    variables: { id: venueId },
  });

  const [verifyVenue, { loading: verifying }] = useMutation(VERIFY_VENUE, {
    onCompleted: (data) => {
      if (data.verifyVenue.success) {
        setShowVerifySuccess(true);
        setVerifyError(null);
        clearError();
        setTimeout(() => setShowVerifySuccess(false), 3000);
        refetch();
      }
    },
    onError: (error) => {
      console.error('Verification error:', error);
      setVerifyError(error.message || 'Failed to verify venue');
    },
  });

  const [reportIssue, { loading: reporting }] = useMutation(REPORT_ISSUE, {
    onCompleted: () => {
      setShowReportModal(false);
      setReportType('');
      setReportDescription('');
    },
  });

  // Handle verification with geolocation
  const handleVerify = () => {
    setVerifyError(null);
    clearError();

    // If we already have a valid position, use it
    if (position) {
      verifyVenue({
        variables: {
          venueId,
          input: {
            exists: true,
            latitude: position.latitude,
            longitude: position.longitude,
          },
        },
      });
      return;
    }

    // Otherwise, request location first
    requestLocation();
  };

  // When position is obtained, auto-verify
  React.useEffect(() => {
    if (position && !verifying && !showVerifySuccess) {
      // Position just became available, trigger verification
      verifyVenue({
        variables: {
          venueId,
          input: {
            exists: true,
            latitude: position.latitude,
            longitude: position.longitude,
          },
        },
      });
    }
  }, [position]);

  const handleReport = () => {
    if (!reportType || !reportDescription) return;

    reportIssue({
      variables: {
        venueId,
        input: {
          reportType,
          description: reportDescription,
          severity: 'medium',
        },
      },
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: venue.name,
          text: `Check out ${venue.name} - outdoor fitness equipment in ${venue.borough || 'NYC'}`,
          url: window.location.href,
        });
      } catch (_err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleNavigate = () => {
    const { latitude, longitude } = venue;
    if (onNavigate) {
      onNavigate(latitude, longitude);
    } else {
      // Open in Google Maps or Apple Maps
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse p-6 ${className}`}>
        <div className="h-8 w-3/4 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-1/2 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.outdoorVenue) {
    return (
      <div className={`p-6 ${className}`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Location Not Found</h3>
          <p className="text-gray-500 mt-2">This location may have been removed or doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const venue = data.outdoorVenue;
  const equipmentCount = venue.equipment?.length || 0;
  const photoCount = venue.photos?.length || 0;

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b">
        <div className="flex items-center justify-between p-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Report issue"
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero / Photo */}
      {venue.photos?.length > 0 ? (
        <div className="relative h-48 bg-gray-200">
          <img
            src={venue.photos[0].url}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
          {photoCount > 1 && (
            <button
              onClick={() => setActiveTab('photos')}
              className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm"
            >
              <Camera className="w-4 h-4" />
              {photoCount} photos
            </button>
          )}
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <Dumbbell className="w-16 h-16 text-white/50" />
        </div>
      )}

      {/* Venue Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-800">{venue.name}</h1>
          {venue.isVerified && (
            <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-gray-600 text-sm mb-4">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {venue.address}
            {venue.borough && `, ${venue.borough}`}
          </span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{equipmentCount}</div>
            <div className="text-xs text-gray-500">Equipment</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{venue.verificationCount || 0}</div>
            <div className="text-xs text-gray-500">Verifications</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-800">
              {venue.averageRating ? venue.averageRating.toFixed(1) : '-'}
            </div>
            <div className="text-xs text-gray-500">
              {venue.totalRatings ? `${venue.totalRatings} ratings` : 'Rating'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleNavigate}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors"
          >
            <Navigation className="w-5 h-5" />
            Directions
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying || isGettingLocation}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-5 h-5" />
            {isGettingLocation ? 'Getting Location...' : verifying ? 'Verifying...' : 'I Was Here'}
          </button>
        </div>

        {/* Geolocation error message with help button */}
        {(geoError || verifyError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="block text-sm">{geoError?.message || verifyError}</span>
                <div className="flex items-center gap-3 mt-2">
                  {geoError?.type === 'permission_denied' && (
                    <button
                      onClick={openHelp}
                      className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Get Help
                    </button>
                  )}
                  <button
                    onClick={() => {
                      clearError();
                      setVerifyError(null);
                    }}
                    className="text-xs text-red-600 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Geolocation Help Modal */}
        <GeolocationHelper
          isOpen={showHelp}
          onClose={dismissHelp}
          onRetry={retryLocation}
          platformInfo={platformInfo}
          instructionKey={instructionKey}
          errorType={geoError?.type}
        />

        {/* Success message */}
        {showVerifySuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>Thanks for verifying! You earned credits.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-4">
          {(['overview', 'equipment', 'photos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-orange-600 border-orange-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'equipment' && ` (${equipmentCount})`}
              {tab === 'photos' && ` (${photoCount})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {venue.description && (
              <p className="text-gray-600 text-sm">{venue.description}</p>
            )}

            {/* Amenities */}
            {venue.amenities?.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity: string) => (
                    <span
                      key={amenity}
                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {amenity.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-2">
              {venue.surfaceType && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Surface</span>
                  <span className="text-gray-800">{venue.surfaceType.replace(/_/g, ' ')}</span>
                </div>
              )}
              {venue.lightingAvailable !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lighting</span>
                  <span className="text-gray-800">{venue.lightingAvailable ? 'Available' : 'None'}</span>
                </div>
              )}
              {venue.coveredArea !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Covered Area</span>
                  <span className="text-gray-800">{venue.coveredArea ? 'Yes' : 'No'}</span>
                </div>
              )}
              {venue.dataSource && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Data Source</span>
                  <span className="text-gray-800">{venue.dataSource.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>

            {/* Accessible features */}
            {venue.accessibleFeatures?.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Accessibility</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.accessibleFeatures.map((feature: string) => (
                    <span
                      key={feature}
                      className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                    >
                      {feature.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="space-y-3">
            {venue.equipment?.length > 0 ? (
              venue.equipment.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {item.equipmentType?.name || 'Unknown'}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.condition && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          conditionColors[item.condition] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.condition}
                      </span>
                    )}
                    {item.isVerified && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Dumbbell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No equipment information available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-3">
            {venue.photos?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {venue.photos.map((photo: any) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || venue.name}
                      className="w-full h-full object-cover"
                    />
                    {photo.uploadedBy && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <span className="text-white text-xs">
                          by {photo.uploadedBy.displayName || photo.uploadedBy.username}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No photos yet</p>
                <button className="mt-3 text-orange-500 hover:text-orange-600 text-sm font-medium">
                  Add the first photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-800">Report an Issue</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select an issue...</option>
                  <option value="location_wrong">Wrong location</option>
                  <option value="equipment_missing">Equipment missing</option>
                  <option value="equipment_broken">Equipment broken</option>
                  <option value="safety_hazard">Safety hazard</option>
                  <option value="closed_permanently">Location closed</option>
                  <option value="duplicate">Duplicate listing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  placeholder="Please describe the issue..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                onClick={handleReport}
                disabled={!reportType || !reportDescription || reporting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {reporting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationDetail;
