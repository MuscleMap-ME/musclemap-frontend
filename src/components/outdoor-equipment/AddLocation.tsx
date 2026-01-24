/**
 * AddLocation Component
 *
 * Multi-step form for submitting new outdoor fitness venues.
 * Includes location selection, equipment picker, and photo upload.
 */

import React, { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import {
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertCircle,
  Loader2,
  Upload,
  Trash2,
  Target,
} from 'lucide-react';
import { EquipmentSelector } from './EquipmentSelector';

const SUBMIT_VENUE = gql`
  mutation SubmitVenue($input: VenueSubmissionInput!) {
    submitVenue(input: $input) {
      success
      submission {
        id
        status
      }
      creditsEarned
      message
    }
  }
`;

// NYC boroughs
const BOROUGHS = [
  { value: 'Manhattan', label: 'Manhattan' },
  { value: 'Brooklyn', label: 'Brooklyn' },
  { value: 'Queens', label: 'Queens' },
  { value: 'Bronx', label: 'The Bronx' },
  { value: 'Staten Island', label: 'Staten Island' },
];

interface AddLocationProps {
  onClose?: () => void;
  onSuccess?: (submissionId: string) => void;
  className?: string;
  initialLocation?: { lat: number; lng: number };
}

type Step = 'location' | 'details' | 'equipment' | 'photos' | 'review';

export function AddLocation({
  onClose,
  onSuccess,
  className = '',
  initialLocation,
}: AddLocationProps) {
  // Form state
  const [step, setStep] = useState<Step>('location');
  const [locationMethod, setLocationMethod] = useState<'current' | 'manual'>('current');

  // Location data
  const [latitude, setLatitude] = useState<number | null>(initialLocation?.lat || null);
  const [longitude, setLongitude] = useState<number | null>(initialLocation?.lng || null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Venue details
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [borough, setBorough] = useState('');
  const [description, setDescription] = useState('');

  // Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Photos
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Submission
  const [submitVenue, { loading: submitting }] = useMutation(SUBMIT_VENUE, {
    onCompleted: (data) => {
      if (data.submitVenue.success) {
        onSuccess?.(data.submitVenue.submission.id);
      }
    },
  });

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        // Validate NYC bounds
        if (lat < 40.49 || lat > 40.92 || lng < -74.27 || lng > -73.68) {
          setLocationError('Location must be within New York City');
          setLocationLoading(false);
          return;
        }

        setLatitude(lat);
        setLongitude(lng);
        setLocationLoading(false);

        // Try to reverse geocode for address
        fetchAddress(lat, lng);
      },
      (error) => {
        let message = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        setLocationError(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Reverse geocode to get address
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();

      if (data.address) {
        const { house_number, road } = data.address;
        const addressParts = [house_number, road].filter(Boolean);
        setAddress(addressParts.join(' '));

        // Detect borough from response
        const boroughMap: Record<string, string> = {
          Manhattan: 'Manhattan',
          Brooklyn: 'Brooklyn',
          Queens: 'Queens',
          'The Bronx': 'Bronx',
          Bronx: 'Bronx',
          'Staten Island': 'Staten Island',
        };

        for (const [key, value] of Object.entries(boroughMap)) {
          if (
            data.display_name?.includes(key) ||
            data.address.city?.includes(key) ||
            data.address.suburb?.includes(key)
          ) {
            setBorough(value);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to reverse geocode:', err);
    }
  };

  // Manual coordinate input (for future use)
  const _handleManualCoordinates = (lat: string, lng: string) => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setLocationError('Please enter valid coordinates');
      return;
    }

    if (latNum < 40.49 || latNum > 40.92 || lngNum < -74.27 || lngNum > -73.68) {
      setLocationError('Location must be within New York City');
      return;
    }

    setLatitude(latNum);
    setLongitude(lngNum);
    setLocationError(null);
    fetchAddress(latNum, lngNum);
  };

  // Photo upload (mock - would integrate with actual upload service)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      // In a real implementation, upload to your storage service
      // For now, create a local object URL
      const url = URL.createObjectURL(file);
      setPhotoUrls((prev) => [...prev, url]);
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = () => {
    if (!latitude || !longitude || !name || selectedEquipment.length === 0) {
      return;
    }

    submitVenue({
      variables: {
        input: {
          name,
          latitude,
          longitude,
          address: address || undefined,
          borough: borough || undefined,
          description: description || undefined,
          equipment: selectedEquipment.map((type) => ({ equipmentType: type })),
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        },
      },
    });
  };

  // Step validation
  const canProceed = useCallback(() => {
    switch (step) {
      case 'location':
        return latitude !== null && longitude !== null;
      case 'details':
        return name.trim().length >= 3;
      case 'equipment':
        return selectedEquipment.length > 0;
      case 'photos':
        return true; // Photos are optional
      case 'review':
        return true;
      default:
        return false;
    }
  }, [step, latitude, longitude, name, selectedEquipment]);

  // Navigation
  const steps: Step[] = ['location', 'details', 'equipment', 'photos', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const goNext = () => {
    if (currentStepIndex < steps.length - 1 && canProceed()) {
      setStep(steps[currentStepIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    }
  };

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <h2 className="font-semibold text-gray-800">Add Location</h2>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[400px]">
        {/* Step 1: Location */}
        {step === 'location' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Where is this location?</h3>
              <p className="text-gray-500 text-sm">
                Help us pinpoint the exact location of this fitness spot.
              </p>
            </div>

            {/* Location method tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLocationMethod('current')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  locationMethod === 'current'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Use My Location
              </button>
              <button
                onClick={() => setLocationMethod('manual')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  locationMethod === 'manual'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Enter Manually
              </button>
            </div>

            {locationMethod === 'current' ? (
              <div className="space-y-4">
                <button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg transition-colors"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" />
                      Get Current Location
                    </>
                  )}
                </button>

                {latitude && longitude && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-medium">Location captured!</p>
                    <p className="text-green-600 text-sm">
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="40.7128"
                    value={latitude || ''}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="-74.0060"
                    value={longitude || ''}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Tip: You can get coordinates from Google Maps by right-clicking a location.
                </p>
              </div>
            )}

            {locationError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{locationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Location Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Central Park Fitness Station"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Give this location a clear, descriptive name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Borough</label>
              <select
                value={borough}
                onChange={(e) => setBorough(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select borough...</option>
                {BOROUGHS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add any helpful details about this location..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        {/* Step 3: Equipment */}
        {step === 'equipment' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                What equipment is available?
              </h3>
              <p className="text-gray-500 text-sm">
                Select all equipment types you can find at this location.
              </p>
            </div>

            <EquipmentSelector
              value={selectedEquipment}
              onChange={setSelectedEquipment}
              maxSelections={15}
              showDescriptions={false}
            />
          </div>
        )}

        {/* Step 4: Photos */}
        {step === 'photos' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Add Photos (Optional)</h3>
              <p className="text-gray-500 text-sm">
                Photos help others find and verify this location. You&apos;ll earn extra credits!
              </p>
            </div>

            {/* Upload button */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500 transition-colors">
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Click to upload photos</p>
                    <p className="text-gray-400 text-sm">JPG, PNG up to 10MB</p>
                  </>
                )}
              </div>
            </label>

            {/* Photo grid */}
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={goNext}
              className="w-full text-center text-gray-500 text-sm hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Review & Submit</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-800 font-medium">{name}</span>
              </div>
              {address && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Address</span>
                  <span className="text-gray-800">{address}</span>
                </div>
              )}
              {borough && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Borough</span>
                  <span className="text-gray-800">{borough}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Equipment</span>
                <span className="text-gray-800">{selectedEquipment.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Photos</span>
                <span className="text-gray-800">{photoUrls.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Coordinates</span>
                <span className="text-gray-800 text-sm font-mono">
                  {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                </span>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-700 text-sm">
                <strong>You&apos;ll earn 50-75 credits</strong> when your submission is approved!
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit Location
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="border-t p-4 flex justify-between">
        <button
          onClick={goBack}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {step !== 'review' && (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default AddLocation;
