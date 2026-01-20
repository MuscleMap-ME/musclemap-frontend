/**
 * ExerciseImageUpload Component
 *
 * Allows users to upload exercise images and earn credits for contributions.
 * Features:
 * - Drag & drop or click to upload
 * - Client-side preview with crop
 * - Progress indication
 * - Success/error feedback
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface ExerciseImageUploadProps {
  exerciseId: string;
  exerciseName: string;
  currentImageUrl?: string | null;
  onUploadSuccess?: (result: UploadResult) => void;
  onClose?: () => void;
}

interface UploadResult {
  id: string;
  thumbnailUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const ExerciseImageUpload: React.FC<ExerciseImageUploadProps> = ({
  exerciseId,
  exerciseName,
  currentImageUrl,
  onUploadSuccess,
  onClose,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image is too large. Maximum size is 15MB.';
    }
    return null;
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [validateFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [validateFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('exerciseId', exerciseId);
      formData.append('image', selectedFile);

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/exercise-images/upload');

        // Get auth token
        const token = localStorage.getItem('token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve({
              id: response.submission.id,
              thumbnailUrl: response.submission.thumbnailUrl,
              status: response.submission.status,
              message: response.message,
            });
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.message || errorResponse.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.send(formData);
      });

      setSuccess(result);
      onUploadSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, exerciseId, onUploadSuccess]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Contribute Image
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Thank You!</h4>
            <p className="text-gray-400 text-sm mb-4">{success.message}</p>
            {success.status === 'approved' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="font-medium">+25 credits earned!</span>
              </div>
            )}
            {success.status === 'pending' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="font-medium">Pending review - credits awarded upon approval</span>
              </div>
            )}
            <button
              onClick={handleReset}
              className="mt-4 text-sm text-violet-400 hover:text-violet-300"
            >
              Upload another
            </button>
          </motion.div>
        ) : !selectedFile ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto mb-4 bg-violet-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>

              <p className="text-white font-medium mb-1">
                {isDragging ? 'Drop your image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-gray-500 text-sm mb-3">
                JPEG, PNG, WebP up to 15MB
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
                <span className="font-medium">Earn 25 credits</span>
              </div>
            </div>

            {/* Guidelines */}
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Photo Guidelines</h4>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className="flex items-start gap-2">
                  <svg className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Show the exercise being performed clearly</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Good lighting and visibility</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  <span>No inappropriate content</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Preview */}
            <div className="relative rounded-xl overflow-hidden bg-black/50 mb-4">
              <img
                src={previewUrl!}
                alt="Preview"
                className="w-full h-48 object-contain"
              />
              {!uploading && (
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* File info */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="mb-4">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <p className="text-sm text-rose-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Upload Image'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Button to trigger the upload modal
 */
export const ExerciseImageUploadButton: React.FC<{
  exerciseId: string;
  exerciseName: string;
  hasImage: boolean;
  onUploadSuccess?: (result: UploadResult) => void;
}> = ({ exerciseId, exerciseName, hasImage, onUploadSuccess }) => {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowUpload(true)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
          hasImage
            ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        {hasImage ? 'Suggest better image' : 'Add image (+25 credits)'}
      </button>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <ExerciseImageUpload
                exerciseId={exerciseId}
                exerciseName={exerciseName}
                onUploadSuccess={(result) => {
                  onUploadSuccess?.(result);
                  // Don't close immediately on success to show the result
                }}
                onClose={() => setShowUpload(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExerciseImageUpload;
