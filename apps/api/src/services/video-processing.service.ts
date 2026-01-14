/**
 * Video Processing Service
 *
 * Handles video processing tasks like thumbnail generation using FFmpeg.
 * Runs FFmpeg as a child process for video manipulation.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { loggers } from '../lib/logger';

const log = loggers.core.child({ service: 'video-processing' });

// ============================================
// Types
// ============================================

export interface ThumbnailResult {
  success: boolean;
  thumbnailPath?: string;
  error?: string;
}

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
  codec?: string;
  fps?: number;
}

export interface ProcessingOptions {
  quality?: number; // 1-31, lower is better (default: 5)
  scale?: { width?: number; height?: number };
  timestamp?: number; // Seconds into video (default: 1)
}

// ============================================
// FFmpeg Helpers
// ============================================

/**
 * Check if FFmpeg is available on the system
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });

    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Run FFmpeg command and return output
 */
function runFfmpeg(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', args, {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      resolve({ success: false, stdout, stderr: err.message });
    });

    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr });
    });
  });
}

/**
 * Run FFprobe command to get video metadata
 */
function runFfprobe(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', args, {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      resolve({ success: false, stdout, stderr: err.message });
    });

    proc.on('close', (code) => {
      resolve({ success: code === 0, stdout, stderr });
    });
  });
}

// ============================================
// Video Processing Service
// ============================================

export const VideoProcessingService = {
  /**
   * Generate a thumbnail from a video file
   *
   * @param videoPath - Path to the input video file
   * @param outputPath - Path where thumbnail will be saved (should end in .jpg or .png)
   * @param options - Processing options (timestamp, quality, scale)
   */
  async generateThumbnail(
    videoPath: string,
    outputPath: string,
    options: ProcessingOptions = {}
  ): Promise<ThumbnailResult> {
    const { quality = 5, scale, timestamp = 1 } = options;

    log.info(`Generating thumbnail for ${videoPath} at timestamp ${timestamp}s`);

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      log.warn('FFmpeg not available, skipping thumbnail generation');
      return {
        success: false,
        error: 'FFmpeg not available on this system',
      };
    }

    // Check if video file exists
    try {
      await fs.access(videoPath);
    } catch {
      return {
        success: false,
        error: 'Video file not found',
      };
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Build FFmpeg command
    const args = [
      '-y', // Overwrite output
      '-ss', timestamp.toString(), // Seek to timestamp
      '-i', videoPath, // Input file
      '-vframes', '1', // Extract one frame
      '-q:v', quality.toString(), // Quality (1-31, lower is better)
    ];

    // Add scale filter if specified
    if (scale && (scale.width || scale.height)) {
      const w = scale.width || -1;
      const h = scale.height || -1;
      args.push('-vf', `scale=${w}:${h}`);
    }

    args.push(outputPath);

    // Run FFmpeg
    const result = await runFfmpeg(args);

    if (!result.success) {
      log.error(`FFmpeg failed: ${result.stderr}`);

      // Try with timestamp 0 if the specified timestamp failed (video might be too short)
      if (timestamp > 0) {
        log.info('Retrying with timestamp 0');
        return this.generateThumbnail(videoPath, outputPath, { ...options, timestamp: 0 });
      }

      return {
        success: false,
        error: `FFmpeg failed: ${result.stderr.slice(0, 200)}`,
      };
    }

    // Verify thumbnail was created
    try {
      await fs.access(outputPath);
      log.info(`Thumbnail generated successfully: ${outputPath}`);
      return {
        success: true,
        thumbnailPath: outputPath,
      };
    } catch {
      return {
        success: false,
        error: 'Thumbnail file was not created',
      };
    }
  },

  /**
   * Get video metadata using FFprobe
   */
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata | null> {
    log.debug(`Getting metadata for ${videoPath}`);

    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath,
    ];

    const result = await runFfprobe(args);

    if (!result.success) {
      log.error(`FFprobe failed: ${result.stderr}`);
      return null;
    }

    try {
      const data = JSON.parse(result.stdout);
      const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');

      return {
        duration: parseFloat(data.format?.duration) || undefined,
        width: videoStream?.width || undefined,
        height: videoStream?.height || undefined,
        codec: videoStream?.codec_name || undefined,
        fps: videoStream?.r_frame_rate
          ? eval(videoStream.r_frame_rate) // e.g., "30/1" -> 30
          : undefined,
      };
    } catch (err) {
      log.error(`Failed to parse FFprobe output: ${err}`);
      return null;
    }
  },

  /**
   * Generate multiple thumbnails at different timestamps
   * Useful for creating preview strips
   */
  async generateThumbnailStrip(
    videoPath: string,
    outputDir: string,
    count: number = 5,
    options: Omit<ProcessingOptions, 'timestamp'> = {}
  ): Promise<string[]> {
    const metadata = await this.getVideoMetadata(videoPath);
    if (!metadata?.duration) {
      log.warn('Could not get video duration, generating single thumbnail');
      const result = await this.generateThumbnail(
        videoPath,
        path.join(outputDir, 'thumb_0.jpg'),
        options
      );
      return result.success && result.thumbnailPath ? [result.thumbnailPath] : [];
    }

    const thumbnails: string[] = [];
    const interval = metadata.duration / (count + 1);

    for (let i = 0; i < count; i++) {
      const timestamp = interval * (i + 1);
      const outputPath = path.join(outputDir, `thumb_${i}.jpg`);

      const result = await this.generateThumbnail(videoPath, outputPath, {
        ...options,
        timestamp,
      });

      if (result.success && result.thumbnailPath) {
        thumbnails.push(result.thumbnailPath);
      }
    }

    return thumbnails;
  },

  /**
   * Convert video to web-friendly format (MP4 H.264)
   * For future use with video optimization
   */
  async convertToWebFormat(
    inputPath: string,
    outputPath: string,
    options: { maxWidth?: number; maxHeight?: number; crf?: number } = {}
  ): Promise<{ success: boolean; error?: string }> {
    const { maxWidth = 1280, maxHeight = 720, crf = 23 } = options;

    log.info(`Converting ${inputPath} to web format`);

    const ffmpegAvailable = await checkFfmpegAvailable();
    if (!ffmpegAvailable) {
      return { success: false, error: 'FFmpeg not available' };
    }

    const args = [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-crf', crf.toString(),
      '-preset', 'medium',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart', // Enable progressive download
      '-vf', `scale='min(${maxWidth},iw)':min'(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
      outputPath,
    ];

    const result = await runFfmpeg(args);

    if (!result.success) {
      log.error(`Video conversion failed: ${result.stderr}`);
      return { success: false, error: result.stderr.slice(0, 200) };
    }

    return { success: true };
  },
};

export default VideoProcessingService;
