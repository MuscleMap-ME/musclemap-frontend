/**
 * Image Compression Utility
 *
 * Compresses images before upload to reduce storage and bandwidth.
 * Uses browser's Canvas API for client-side compression.
 */

/**
 * Compression quality presets
 */
export const COMPRESSION_PRESETS = {
  high: { quality: 0.9, maxWidth: 2000, maxHeight: 2000 },
  medium: { quality: 0.7, maxWidth: 1500, maxHeight: 1500 },
  low: { quality: 0.5, maxWidth: 1000, maxHeight: 1000 },
  thumbnail: { quality: 0.6, maxWidth: 300, maxHeight: 400 },
} as const;

export type CompressionPreset = keyof typeof COMPRESSION_PRESETS;

export interface CompressionOptions {
  /** JPEG quality (0-1), default 0.7 */
  quality?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Output format: 'image/jpeg', 'image/png', or 'image/webp' */
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Preserve aspect ratio when resizing */
  preserveAspectRatio?: boolean;
}

export interface CompressedImage {
  /** Compressed image as Blob */
  blob: Blob;
  /** Base64 data URL */
  dataUrl: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (0-1, lower is more compressed) */
  compressionRatio: number;
  /** Output dimensions */
  width: number;
  height: number;
}

/**
 * Compresses an image file
 *
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed image data
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const {
    quality = 0.7,
    maxWidth = 1500,
    maxHeight = 1500,
    format = 'image/jpeg',
    preserveAspectRatio = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const originalSize = file.size;

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;

        if (preserveAspectRatio) {
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        } else {
          width = Math.min(width, maxWidth);
          height = Math.min(height, maxHeight);
        }

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw image to canvas (this performs the resize)
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const dataUrl = canvas.toDataURL(format, quality);

            resolve({
              blob,
              dataUrl,
              originalSize,
              compressedSize: blob.size,
              compressionRatio: blob.size / originalSize,
              width,
              height,
            });
          },
          format,
          quality
        );
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compresses an image using a preset
 *
 * @param file - Image file to compress
 * @param preset - Compression preset name
 * @returns Promise resolving to compressed image data
 */
export async function compressWithPreset(
  file: File | Blob,
  preset: CompressionPreset
): Promise<CompressedImage> {
  const options = COMPRESSION_PRESETS[preset];
  return compressImage(file, options);
}

/**
 * Creates a thumbnail from an image
 *
 * @param file - Image file
 * @param size - Maximum dimension (width or height)
 * @returns Promise resolving to thumbnail data URL
 */
export async function createThumbnail(
  file: File | Blob,
  size: number = 300
): Promise<string> {
  const result = await compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.6,
    format: 'image/jpeg',
  });
  return result.dataUrl;
}

/**
 * Validates image file type and size
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns Validation result with error message if invalid
 */
export function validateImage(
  file: File,
  maxSizeMB: number = 20
): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: ${validTypes.join(', ')}`,
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Extracts EXIF date from image (if available)
 *
 * @param file - Image file
 * @returns Promise resolving to date or null
 */
export async function extractExifDate(file: File): Promise<Date | null> {
  try {
    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);

    // Check for JPEG SOI marker
    if (dataView.getUint16(0) !== 0xFFD8) {
      return null; // Not a JPEG
    }

    let offset = 2;
    while (offset < buffer.byteLength) {
      const marker = dataView.getUint16(offset);
      offset += 2;

      // Look for APP1 marker (EXIF)
      if (marker === 0xFFE1) {
        const length = dataView.getUint16(offset);

        // Check for "Exif" identifier
        const exifHeader = new TextDecoder().decode(
          new Uint8Array(buffer, offset + 2, 4)
        );
        if (exifHeader !== 'Exif') {
          return null;
        }

        // Parse TIFF header to find DateTime tag
        // This is simplified - full EXIF parsing is complex
        // For production, consider using a library like exif-js
        return null; // Simplified implementation
      }

      // Skip to next marker
      if (marker !== 0xFFD8 && marker !== 0xFFD9) {
        const segmentLength = dataView.getUint16(offset);
        offset += segmentLength;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Formats file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Converts a base64 data URL to a Blob
 *
 * @param dataUrl - Base64 data URL
 * @returns Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mime });
}

/**
 * Converts a Blob to base64 data URL
 *
 * @param blob - Blob to convert
 * @returns Promise resolving to data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default {
  compressImage,
  compressWithPreset,
  createThumbnail,
  validateImage,
  formatFileSize,
  dataUrlToBlob,
  blobToDataUrl,
  COMPRESSION_PRESETS,
};
