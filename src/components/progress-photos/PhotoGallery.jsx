/**
 * PhotoGallery - Timeline gallery view for progress photos
 *
 * Displays photos in a chronological timeline with thumbnails,
 * filtering by body part, and selection for comparison.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/**
 * Body part categories for organizing photos
 */
export const BODY_PARTS = {
  front: { id: 'front', label: 'Front', icon: '🧍' },
  back: { id: 'back', label: 'Back', icon: '🔙' },
  left: { id: 'left_side', label: 'Left Side', icon: '👈' },
  right: { id: 'right_side', label: 'Right Side', icon: '👉' },
  flexed: { id: 'flexed', label: 'Flexed', icon: '💪' },
  legs: { id: 'legs', label: 'Legs', icon: '🦵' },
};

/**
 * @typedef {Object} ProgressPhoto
 * @property {string} id - Unique identifier
 * @property {string} src - Image source URL
 * @property {string} thumbnailSrc - Thumbnail URL (optional, falls back to src)
 * @property {string} bodyPart - Body part category
 * @property {Date|string} date - Photo date
 * @property {number} [weight] - Weight at time of photo
 * @property {string} [notes] - User notes
 * @property {boolean} [isLocal] - Whether stored locally only
 */

/**
 * PhotoGallery Component
 *
 * @param {Object} props
 * @param {ProgressPhoto[]} props.photos - Array of progress photos
 * @param {Function} [props.onSelectPhoto] - Callback when photo is selected
 * @param {Function} [props.onCompare] - Callback when two photos selected for comparison
 * @param {Function} [props.onDelete] - Callback to delete a photo
 * @param {string} [props.className] - Additional CSS classes
 */
export function PhotoGallery({
  photos = [],
  onSelectPhoto,
  onCompare,
  onDelete,
  className,
}) {
  const [selectedBodyPart, setSelectedBodyPart] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'grid'

  // Filter and sort photos
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    if (selectedBodyPart) {
      result = result.filter(p => p.bodyPart === selectedBodyPart);
    }

    // Sort by date descending (newest first)
    result.sort((a, b) => new Date(b.date) - new Date(a.date));

    return result;
  }, [photos, selectedBodyPart]);

  // Group photos by month for timeline view
  const groupedByMonth = useMemo(() => {
    const groups = {};
    filteredPhotos.forEach(photo => {
      const date = new Date(photo.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthKey]) {
        groups[monthKey] = { label: monthLabel, photos: [] };
      }
      groups[monthKey].photos.push(photo);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredPhotos]);

  const handlePhotoClick = useCallback((photo) => {
    if (selectionMode) {
      setSelectedPhotos(prev => {
        const isSelected = prev.some(p => p.id === photo.id);
        if (isSelected) {
          return prev.filter(p => p.id !== photo.id);
        }
        // Max 2 photos for comparison
        if (prev.length >= 2) {
          return [prev[1], photo];
        }
        return [...prev, photo];
      });
    } else {
      onSelectPhoto?.(photo);
    }
  }, [selectionMode, onSelectPhoto]);

  const handleCompare = useCallback(() => {
    if (selectedPhotos.length === 2) {
      // Sort by date - older first
      const sorted = [...selectedPhotos].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      onCompare?.(sorted[0], sorted[1]);
    }
  }, [selectedPhotos, onCompare]);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedPhotos([]);
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Body Part Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedBodyPart(null)}
            className={clsx(
              'px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
              !selectedBodyPart
                ? 'bg-[var(--brand-blue-500)] text-white'
                : 'glass text-gray-300 hover:text-white'
            )}
          >
            All
          </button>
          {Object.values(BODY_PARTS).map(part => (
            <button
              key={part.id}
              onClick={() => setSelectedBodyPart(part.id)}
              className={clsx(
                'px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                selectedBodyPart === part.id
                  ? 'bg-[var(--brand-blue-500)] text-white'
                  : 'glass text-gray-300 hover:text-white'
              )}
            >
              <span className="mr-1">{part.icon}</span>
              {part.label}
            </button>
          ))}
        </div>

        {/* View Mode & Selection Toggle */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="glass rounded-xl p-1 flex">
            <button
              onClick={() => setViewMode('timeline')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                viewMode === 'timeline' ? 'bg-white/10 text-white' : 'text-gray-400'
              )}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400'
              )}
            >
              Grid
            </button>
          </div>

          {/* Selection Mode Toggle */}
          {selectionMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {selectedPhotos.length}/2 selected
              </span>
              <button
                onClick={handleCompare}
                disabled={selectedPhotos.length !== 2}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  selectedPhotos.length === 2
                    ? 'bg-[var(--brand-blue-500)] text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                )}
              >
                Compare
              </button>
              <button
                onClick={cancelSelection}
                className="px-4 py-2 rounded-xl text-sm font-medium glass text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSelectionMode(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium glass text-gray-300 hover:text-white transition-colors"
            >
              Select to Compare
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📸</div>
          <h3 className="text-lg font-semibold text-white mb-2">No photos yet</h3>
          <p className="text-gray-400">
            {selectedBodyPart
              ? `No ${BODY_PARTS[selectedBodyPart]?.label || 'matching'} photos found`
              : 'Add your first progress photo to start tracking your transformation'}
          </p>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && groupedByMonth.length > 0 && (
        <div className="space-y-6">
          {groupedByMonth.map(([monthKey, group]) => (
            <div key={monthKey}>
              {/* Month Header */}
              <h3 className="text-lg font-semibold text-white mb-3 sticky top-0 bg-gray-900/80 backdrop-blur-sm py-2 z-10">
                {group.label}
              </h3>

              {/* Photos Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                <AnimatePresence mode="popLayout">
                  {group.photos.map((photo, index) => (
                    <PhotoThumbnail
                      key={photo.id}
                      photo={photo}
                      isSelected={selectedPhotos.some(p => p.id === photo.id)}
                      selectionMode={selectionMode}
                      onClick={() => handlePhotoClick(photo)}
                      onDelete={onDelete}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredPhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          <AnimatePresence mode="popLayout">
            {filteredPhotos.map((photo, index) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                isSelected={selectedPhotos.some(p => p.id === photo.id)}
                selectionMode={selectionMode}
                onClick={() => handlePhotoClick(photo)}
                onDelete={onDelete}
                index={index}
                showDate
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * PhotoThumbnail - Individual photo card in the gallery
 */
function PhotoThumbnail({
  photo,
  isSelected,
  selectionMode,
  onClick,
  onDelete,
  index,
  showDate = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className={clsx(
        'relative rounded-xl overflow-hidden cursor-pointer group',
        'bg-[var(--glass-white-5)] border',
        isSelected
          ? 'border-[var(--brand-blue-500)] ring-2 ring-[var(--brand-blue-500)]/50'
          : 'border-[var(--border-default)]'
      )}
      style={{ aspectRatio: '3/4' }}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Loading Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
      )}

      {/* Image */}
      <img
        src={photo.thumbnailSrc || photo.src}
        alt={`Progress photo - ${photo.bodyPart}`}
        className={clsx(
          'w-full h-full object-cover transition-opacity',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />

      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={clsx(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-[var(--brand-blue-500)] border-[var(--brand-blue-500)]'
                : 'bg-black/50 border-white/50'
            )}
          >
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Local Only Badge */}
      {photo.isLocal && (
        <div className="absolute top-2 left-2 z-10">
          <div className="w-6 h-6 rounded-full bg-amber-500/80 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      )}

      {/* Hover Actions */}
      <AnimatePresence>
        {showActions && !selectionMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2"
          >
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo);
                }}
                className="ml-auto p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Label */}
      {showDate && loaded && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-xs text-white text-center">
          {new Date(photo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {/* Body Part Badge */}
      {photo.bodyPart && BODY_PARTS[photo.bodyPart] && (
        <div className="absolute top-2 right-2 text-lg opacity-80 drop-shadow">
          {BODY_PARTS[photo.bodyPart].icon}
        </div>
      )}
    </motion.div>
  );
}

export default PhotoGallery;
