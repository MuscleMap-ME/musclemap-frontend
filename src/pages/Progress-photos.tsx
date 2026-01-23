/**
 * Progress Photos Page
 *
 * Complete progress photo tracking with:
 * - Photo capture with positioning guides
 * - Before/after comparison slider
 * - Timeline gallery with thumbnails
 * - Body part categorization
 * - Image compression before upload
 * - Local-only storage option (privacy mode)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';
import { useToast } from '../store';
import { api } from '../utils/api';
import {
  compressWithPreset,
  createThumbnail,
  validateImage,
  type CompressionPreset,
} from '../utils/imageCompression';
import { PhotoCompare, PhotoCompareSideBySide } from '../components/progress-photos/PhotoCompare';
import { PhotoGallery, BODY_PARTS } from '../components/progress-photos/PhotoGallery';
import { PhotoGuideOverlay } from '../components/progress-photos/PhotoGuide';

/**
 * Progress photo data structure
 */
interface ProgressPhoto {
  id: string;
  src: string;
  thumbnailSrc?: string;
  bodyPart: string;
  date: Date | string;
  weight?: number;
  notes?: string;
  isLocal: boolean;
}

/**
 * Photo settings
 */
interface PhotoSettings {
  storageMode: 'cloud' | 'local';
  compressionQuality: CompressionPreset;
  reminderFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  showGuide: boolean;
}

const DEFAULT_SETTINGS: PhotoSettings = {
  storageMode: 'local',
  compressionQuality: 'medium',
  reminderFrequency: 'weekly',
  showGuide: true,
};

/**
 * IndexedDB storage key for local photos
 */
const LOCAL_PHOTOS_KEY = 'musclemap_progress_photos';
const LOCAL_SETTINGS_KEY = 'musclemap_photo_settings';

/**
 * Save photos to IndexedDB for local-only storage
 */
async function saveLocalPhotos(photos: ProgressPhoto[]): Promise<void> {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    await store.clear();
    for (const photo of photos) {
      await store.put(photo);
    }
    await tx.done;
  } catch (error) {
    console.error('Failed to save local photos:', error);
    // Fallback to localStorage for smaller datasets
    try {
      const miniPhotos = photos.map(p => ({
        ...p,
        src: p.thumbnailSrc || p.src.substring(0, 1000), // Truncate for localStorage
      }));
      localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(miniPhotos));
    } catch {
      console.error('Failed to save to localStorage fallback');
    }
  }
}

/**
 * Load photos from IndexedDB
 */
async function loadLocalPhotos(): Promise<ProgressPhoto[]> {
  try {
    const db = await openPhotoDB();
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const photos = await store.getAll();
    await tx.done;
    return photos || [];
  } catch (error) {
    console.error('Failed to load local photos:', error);
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(LOCAL_PHOTOS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

/**
 * Open IndexedDB for photo storage
 * Returns null if IndexedDB is not available (Brave Shields, private browsing)
 */
function openPhotoDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available (Brave Shields blocks it entirely)
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
    } catch {
      // Brave Shields throws ReferenceError on indexedDB access
      resolve(null);
      return;
    }

    const request = indexedDB.open('MuscleMapPhotos', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Progress Photos Page Component
 */
export default function ProgressPhotos() {
  const { token, user: _user } = useAuth();
  const { toast, error: showError, success } = useToast();

  // State
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<PhotoSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'gallery' | 'capture' | 'compare' | 'settings'>('gallery');
  const [comparePhotos, setComparePhotos] = useState<{ before: ProgressPhoto | null; after: ProgressPhoto | null }>({
    before: null,
    after: null,
  });
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [captureBodyPart, setCaptureBodyPart] = useState<string>('front');
  const [captureWeight, setCaptureWeight] = useState<string>('');
  const [captureNotes, setCaptureNotes] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [compareMode, setCompareMode] = useState<'slider' | 'sideBySide'>('slider');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load photos and settings on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }

        // Load local photos
        const localPhotos = await loadLocalPhotos();
        setPhotos(localPhotos.map(p => ({ ...p, isLocal: true })));

        // If user is logged in, also load cloud photos
        if (token) {
          try {
            const cloudPhotos = await api.progressPhotos?.list() || [];
            // Merge cloud and local photos, avoiding duplicates
            setPhotos(prev => {
              const localIds = new Set(prev.map(p => p.id));
              const newCloud = cloudPhotos.filter((p: ProgressPhoto) => !localIds.has(p.id));
              return [...prev, ...newCloud.map((p: ProgressPhoto) => ({ ...p, isLocal: false }))];
            });
          } catch {
            // API endpoint may not exist yet - that's ok
          }
        }
      } catch (error) {
        console.error('Failed to load photos:', error);
        showError('Failed to load photos');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token, showError]);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Start camera for photo capture
   */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      showError('Failed to access camera. Please check permissions.');
    }
  }, [showError]);

  /**
   * Stop camera
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  /**
   * Capture photo from camera
   */
  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      setUploading(true);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Mirror the image (front camera is mirrored)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.9
        );
      });

      // Process the captured image
      await processAndSavePhoto(blob);
      stopCamera();
    } catch (error) {
      console.error('Failed to capture photo:', error);
      showError('Failed to capture photo');
    } finally {
      setUploading(false);
    }
  }, [stopCamera, showError, processAndSavePhoto]);

  /**
   * Handle file selection for upload
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImage(file);

    if (!validation.valid) {
      showError(validation.error || 'Invalid image');
      return;
    }

    try {
      setUploading(true);
      await processAndSavePhoto(file);
    } catch (error) {
      console.error('Failed to process image:', error);
      showError('Failed to process image');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [showError, processAndSavePhoto]);

  /**
   * Process and save a photo (compression, thumbnail, storage)
   */
  const processAndSavePhoto = useCallback(async (file: File | Blob) => {
    // Compress image
    const compressed = await compressWithPreset(file, settings.compressionQuality);

    // Create thumbnail
    const thumbnail = await createThumbnail(file);

    // Create photo object
    const newPhoto: ProgressPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      src: compressed.dataUrl,
      thumbnailSrc: thumbnail,
      bodyPart: captureBodyPart,
      date: new Date().toISOString(),
      weight: captureWeight ? parseFloat(captureWeight) : undefined,
      notes: captureNotes || undefined,
      isLocal: settings.storageMode === 'local',
    };

    // Add to state
    setPhotos(prev => [newPhoto, ...prev]);

    // Save locally
    if (settings.storageMode === 'local' || !token) {
      const updatedPhotos = [newPhoto, ...photos.filter(p => p.isLocal)];
      await saveLocalPhotos(updatedPhotos);
    } else {
      // Upload to cloud
      try {
        await api.progressPhotos?.create({
          imageData: compressed.dataUrl,
          thumbnailData: thumbnail,
          bodyPart: captureBodyPart,
          weight: captureWeight ? parseFloat(captureWeight) : null,
          notes: captureNotes || null,
        });
      } catch (error) {
        console.error('Failed to upload to cloud:', error);
        // Save locally as fallback
        newPhoto.isLocal = true;
        const updatedPhotos = [newPhoto, ...photos.filter(p => p.isLocal)];
        await saveLocalPhotos(updatedPhotos);
        toast('Saved locally (cloud upload failed)');
      }
    }

    success('Photo saved!');
    setCaptureWeight('');
    setCaptureNotes('');
    setActiveTab('gallery');
  }, [captureBodyPart, captureWeight, captureNotes, settings, token, photos, toast, success]);

  /**
   * Delete a photo
   */
  const handleDeletePhoto = useCallback(async (photo: ProgressPhoto) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;

    try {
      // Remove from state
      setPhotos(prev => prev.filter(p => p.id !== photo.id));

      // Remove from storage
      if (photo.isLocal) {
        const localPhotos = photos.filter(p => p.isLocal && p.id !== photo.id);
        await saveLocalPhotos(localPhotos);
      } else if (token) {
        try {
          await api.progressPhotos?.delete(photo.id);
        } catch {
          // Ignore if API fails
        }
      }

      success('Photo deleted');
    } catch (error) {
      console.error('Failed to delete photo:', error);
      showError('Failed to delete photo');
    }
  }, [photos, token, success, showError]);

  /**
   * Handle comparison selection
   */
  const handleCompare = useCallback((before: ProgressPhoto, after: ProgressPhoto) => {
    setComparePhotos({ before, after });
    setActiveTab('compare');
  }, []);

  /**
   * Update settings
   */
  const updateSettings = useCallback((updates: Partial<PhotoSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-3xl">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-xl font-bold">Progress Photos</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-10 bg-gray-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-3">
            {[
              { id: 'gallery', label: 'Gallery', icon: '🖼' },
              { id: 'capture', label: 'Capture', icon: '📸' },
              { id: 'compare', label: 'Compare', icon: '⚖' },
              { id: 'settings', label: 'Settings', icon: '⚙' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-[var(--brand-blue-500)] text-white'
                    : 'glass text-gray-300 hover:text-white'
                )}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4">
        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{photos.length}</div>
                <div className="text-sm text-gray-400">Total Photos</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {photos.filter(p => p.isLocal).length}
                </div>
                <div className="text-sm text-gray-400">Local Only</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {photos.length > 0
                    ? Math.ceil(
                        (new Date().getTime() - new Date(photos[photos.length - 1].date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0}
                </div>
                <div className="text-sm text-gray-400">Days Tracking</div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {Object.keys(
                    photos.reduce((acc, p) => ({ ...acc, [p.bodyPart]: true }), {})
                  ).length}
                </div>
                <div className="text-sm text-gray-400">Body Parts</div>
              </div>
            </div>

            {/* Photo Gallery */}
            <PhotoGallery
              photos={photos}
              onSelectPhoto={setSelectedPhoto}
              onCompare={handleCompare}
              onDelete={handleDeletePhoto}
            />

            {/* Add Photo CTA */}
            {photos.length === 0 && (
              <div className="text-center py-8">
                <button
                  onClick={() => setActiveTab('capture')}
                  className="px-6 py-3 bg-[var(--brand-blue-500)] hover:bg-[var(--brand-blue-600)] rounded-xl font-semibold transition-colors"
                >
                  Take Your First Photo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Capture Tab */}
        {activeTab === 'capture' && (
          <div className="space-y-6">
            {/* Camera View */}
            {showCamera ? (
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />

                {/* Photo Guide Overlay */}
                {settings.showGuide && (
                  <PhotoGuideOverlay
                    type={captureBodyPart}
                    showGrid={true}
                    opacity={0.4}
                  />
                )}

                {/* Camera Controls */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                  <button
                    onClick={stopCamera}
                    className="w-14 h-14 rounded-full glass flex items-center justify-center text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <motion.button
                    onClick={captureFromCamera}
                    disabled={uploading}
                    className={clsx(
                      'w-20 h-20 rounded-full',
                      'bg-white/20 backdrop-blur-md border-4 border-white',
                      'flex items-center justify-center',
                      uploading && 'opacity-50'
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {uploading ? (
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-white" />
                    )}
                  </motion.button>
                  <div className="w-14" /> {/* Spacer */}
                </div>
              </div>
            ) : (
              /* Capture Options */
              <div className="space-y-6">
                {/* Body Part Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">
                    Select Body Part
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {Object.values(BODY_PARTS).map((part) => (
                      <button
                        key={part.id}
                        onClick={() => setCaptureBodyPart(part.id)}
                        className={clsx(
                          'p-3 rounded-xl text-center transition-colors',
                          captureBodyPart === part.id
                            ? 'bg-[var(--brand-blue-500)] text-white'
                            : 'glass text-gray-300 hover:text-white'
                        )}
                      >
                        <div className="text-2xl mb-1">{part.icon}</div>
                        <div className="text-xs">{part.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Current Weight (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={captureWeight}
                        onChange={(e) => setCaptureWeight(e.target.value)}
                        placeholder="Enter weight"
                        className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-500)]"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        lbs
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={captureNotes}
                      onChange={(e) => setCaptureNotes(e.target.value)}
                      placeholder="Any notes about this photo"
                      className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-500)]"
                    />
                  </div>
                </div>

                {/* Capture Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.button
                    onClick={startCamera}
                    className="glass p-6 rounded-2xl text-center hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-4xl mb-3">📷</div>
                    <div className="font-semibold text-white">Take Photo</div>
                    <div className="text-sm text-gray-400 mt-1">Use your camera</div>
                  </motion.button>

                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass p-6 rounded-2xl text-center hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-4xl mb-3">📁</div>
                    <div className="font-semibold text-white">Upload Photo</div>
                    <div className="text-sm text-gray-400 mt-1">From your device</div>
                  </motion.button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    <div className="text-sm text-gray-300">Processing image...</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            {comparePhotos.before && comparePhotos.after ? (
              <>
                {/* Comparison Mode Toggle */}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCompareMode('slider')}
                    className={clsx(
                      'px-4 py-2 rounded-xl font-medium transition-colors',
                      compareMode === 'slider'
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'glass text-gray-300'
                    )}
                  >
                    Slider View
                  </button>
                  <button
                    onClick={() => setCompareMode('sideBySide')}
                    className={clsx(
                      'px-4 py-2 rounded-xl font-medium transition-colors',
                      compareMode === 'sideBySide'
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'glass text-gray-300'
                    )}
                  >
                    Side by Side
                  </button>
                </div>

                {/* Comparison View */}
                {compareMode === 'slider' ? (
                  <PhotoCompare
                    beforeSrc={comparePhotos.before.src}
                    afterSrc={comparePhotos.after.src}
                    beforeDate={new Date(comparePhotos.before.date).toLocaleDateString()}
                    afterDate={new Date(comparePhotos.after.date).toLocaleDateString()}
                    className="max-w-md mx-auto"
                  />
                ) : (
                  <PhotoCompareSideBySide
                    beforeSrc={comparePhotos.before.src}
                    afterSrc={comparePhotos.after.src}
                    beforeDate={new Date(comparePhotos.before.date).toLocaleDateString()}
                    afterDate={new Date(comparePhotos.after.date).toLocaleDateString()}
                    className="max-w-2xl mx-auto"
                  />
                )}

                {/* Weight Change */}
                {comparePhotos.before.weight && comparePhotos.after.weight && (
                  <div className="glass rounded-xl p-4 text-center max-w-md mx-auto">
                    <div className="text-sm text-gray-400 mb-1">Weight Change</div>
                    <div className="text-2xl font-bold">
                      {comparePhotos.after.weight - comparePhotos.before.weight > 0 ? '+' : ''}
                      {(comparePhotos.after.weight - comparePhotos.before.weight).toFixed(1)} lbs
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {comparePhotos.before.weight} lbs → {comparePhotos.after.weight} lbs
                    </div>
                  </div>
                )}

                {/* Clear Selection */}
                <div className="text-center">
                  <button
                    onClick={() => setComparePhotos({ before: null, after: null })}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Clear selection
                  </button>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="glass rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">⚖</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Photos Selected</h3>
                <p className="text-gray-400 mb-6">
                  Go to the Gallery tab and select two photos to compare your progress
                </p>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className="px-6 py-3 bg-[var(--brand-blue-500)] hover:bg-[var(--brand-blue-600)] rounded-xl font-semibold transition-colors"
                >
                  Go to Gallery
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-md mx-auto">
            {/* Storage Mode */}
            <div className="glass rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Default Storage Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSettings({ storageMode: 'local' })}
                  className={clsx(
                    'p-4 rounded-xl text-center transition-colors',
                    settings.storageMode === 'local'
                      ? 'bg-[var(--brand-blue-500)] text-white'
                      : 'bg-white/10 text-gray-300'
                  )}
                >
                  <div className="text-2xl mb-2">🔒</div>
                  <div className="font-medium">Local Only</div>
                  <div className="text-xs text-gray-400 mt-1">Privacy mode</div>
                </button>
                <button
                  onClick={() => updateSettings({ storageMode: 'cloud' })}
                  className={clsx(
                    'p-4 rounded-xl text-center transition-colors',
                    settings.storageMode === 'cloud'
                      ? 'bg-[var(--brand-blue-500)] text-white'
                      : 'bg-white/10 text-gray-300'
                  )}
                >
                  <div className="text-2xl mb-2">☁</div>
                  <div className="font-medium">Cloud Sync</div>
                  <div className="text-xs text-gray-400 mt-1">Access anywhere</div>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {settings.storageMode === 'local'
                  ? 'Photos stay on your device only. More private but no backup.'
                  : 'Photos sync to cloud. Access from any device with your account.'}
              </p>
            </div>

            {/* Compression Quality */}
            <div className="glass rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Photo Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'medium', 'low'] as const).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => updateSettings({ compressionQuality: quality })}
                    className={clsx(
                      'p-3 rounded-xl text-center capitalize transition-colors',
                      settings.compressionQuality === quality
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'bg-white/10 text-gray-300'
                    )}
                  >
                    {quality}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Higher quality = larger file size. Medium recommended for most users.
              </p>
            </div>

            {/* Reminder Frequency */}
            <div className="glass rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Photo Reminder
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['weekly', 'monthly', 'daily', 'never'] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => updateSettings({ reminderFrequency: freq })}
                    className={clsx(
                      'p-3 rounded-xl text-center capitalize transition-colors',
                      settings.reminderFrequency === freq
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'bg-white/10 text-gray-300'
                    )}
                  >
                    {freq}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Get reminded to take progress photos for consistent tracking.
              </p>
            </div>

            {/* Show Guide Toggle */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Show Pose Guide</div>
                  <div className="text-sm text-gray-400">
                    Display alignment guides when taking photos
                  </div>
                </div>
                <button
                  onClick={() => updateSettings({ showGuide: !settings.showGuide })}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-colors relative',
                    settings.showGuide ? 'bg-[var(--brand-blue-500)]' : 'bg-gray-600'
                  )}
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white absolute top-1 transition-transform',
                      settings.showGuide ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Storage Info */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-medium text-white mb-3">Storage Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Local photos:</span>
                  <span>{photos.filter(p => p.isLocal).length}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Cloud photos:</span>
                  <span>{photos.filter(p => !p.isLocal).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Photo Detail Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.src}
                alt="Progress photo"
                className="w-full rounded-2xl"
              />
              <div className="mt-4 text-center text-white">
                <div className="text-lg font-semibold">
                  {BODY_PARTS[selectedPhoto.bodyPart as keyof typeof BODY_PARTS]?.label || 'Photo'}
                </div>
                <div className="text-gray-400">
                  {new Date(selectedPhoto.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {selectedPhoto.weight && (
                  <div className="text-gray-300 mt-1">{selectedPhoto.weight} lbs</div>
                )}
                {selectedPhoto.notes && (
                  <div className="text-gray-400 mt-2 text-sm">{selectedPhoto.notes}</div>
                )}
                {selectedPhoto.isLocal && (
                  <div className="mt-2 text-amber-400 text-sm flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Local only
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
