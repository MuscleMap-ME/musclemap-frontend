/**
 * NSFW Image Detection Service
 *
 * Uses NSFWJS to classify images and detect inappropriate content.
 * Supports lazy loading of the TensorFlow model to reduce startup time.
 *
 * Uses TensorFlow.js WASM backend for Bun compatibility.
 * Image decoding is handled by sharp instead of tf.node.decodeImage.
 */

import { loggers } from './logger';
import sharp from 'sharp';

const log = loggers.core;

// Classification thresholds
const THRESHOLDS = {
  BLOCK: 0.7,    // Block if any NSFW class exceeds this
  WARN: 0.4,     // Flag for review if any NSFW class exceeds this
  SAFE: 0.6,     // Consider safe if "Neutral" or "Drawing" exceeds this
};

// NSFWJS prediction classes
interface NSFWPrediction {
  className: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy';
  probability: number;
}

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'review';
  reason?: string;
  scores: Record<string, number>;
  blockedClass?: string;
  processingTimeMs: number;
}

// Lazy-loaded model instance
let nsfwModel: any = null;
let modelLoading: Promise<any> | null = null;
let tfInstance: any = null;

/**
 * Load the NSFWJS model (lazy, singleton)
 */
async function loadModel(): Promise<any> {
  if (nsfwModel) return nsfwModel;

  if (modelLoading) return modelLoading;

  modelLoading = (async () => {
    try {
      log.info('Loading NSFWJS model with WASM backend...');
      const startTime = Date.now();

      // Import TensorFlow.js (WASM version - no native bindings)
      const tf = await import('@tensorflow/tfjs');

      // Set WASM backend for better cross-platform support
      // This avoids the NAPI/libuv issues with Bun
      await tf.setBackend('cpu'); // CPU backend is always available and works with Bun
      await tf.ready();

      tfInstance = tf;

      // Import NSFWJS
      const nsfwjs = await import('nsfwjs');

      // Use the default model (MobileNetV2)
      nsfwModel = await nsfwjs.load();

      const loadTime = Date.now() - startTime;
      log.info({ loadTimeMs: loadTime, backend: tf.getBackend() }, 'NSFWJS model loaded');

      return nsfwModel;
    } catch (error) {
      log.error({ error }, 'Failed to load NSFWJS model');
      modelLoading = null;
      throw error;
    }
  })();

  return modelLoading;
}

/**
 * Decode image buffer to raw pixel data using sharp
 * Returns { data: Uint8Array, width: number, height: number, channels: 3 }
 */
async function decodeImageWithSharp(imageBuffer: Buffer): Promise<{
  data: Uint8Array;
  width: number;
  height: number;
  channels: 3;
}> {
  // Use sharp to decode and get raw pixel data
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  // Convert to RGB (3 channels) and get raw pixel data
  const { data, info } = await image
    .removeAlpha() // Remove alpha channel if present (convert to RGB)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
    channels: 3,
  };
}

/**
 * Classify an image buffer for NSFW content
 */
export async function classifyImage(imageBuffer: Buffer): Promise<ModerationResult> {
  const startTime = Date.now();

  try {
    // Load model if needed
    const model = await loadModel();
    const tf = tfInstance;

    if (!tf) {
      throw new Error('TensorFlow not initialized');
    }

    // Decode image using sharp
    let imageData;
    try {
      imageData = await decodeImageWithSharp(imageBuffer);
    } catch (decodeError) {
      log.warn({ error: decodeError }, 'Failed to decode image, may be unsupported format');
      return {
        status: 'review',
        reason: 'Could not decode image for moderation',
        scores: {},
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Create tensor from raw pixel data
    // Shape: [height, width, channels]
    const imageTensor = tf.tensor3d(
      imageData.data,
      [imageData.height, imageData.width, imageData.channels],
      'int32'
    );

    // Classify the image
    const predictions: NSFWPrediction[] = await model.classify(imageTensor);

    // Dispose tensor to free memory
    imageTensor.dispose();

    // Convert predictions to scores object
    const scores: Record<string, number> = {};
    for (const pred of predictions) {
      scores[pred.className] = pred.probability;
    }

    // Determine moderation result
    const result = evaluatePredictions(predictions, scores, startTime);

    log.info({
      status: result.status,
      scores,
      processingTimeMs: result.processingTimeMs,
    }, 'Image moderation complete');

    return result;
  } catch (error) {
    log.error({ error }, 'Error during image classification');

    return {
      status: 'review',
      reason: 'Moderation service error',
      scores: {},
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Evaluate NSFWJS predictions and determine moderation status
 */
function evaluatePredictions(
  predictions: NSFWPrediction[],
  scores: Record<string, number>,
  startTime: number
): ModerationResult {
  const processingTimeMs = Date.now() - startTime;

  // Check for explicit content (Porn, Hentai)
  const pornScore = scores['Porn'] || 0;
  const hentaiScore = scores['Hentai'] || 0;

  if (pornScore >= THRESHOLDS.BLOCK) {
    return {
      status: 'rejected',
      reason: 'Explicit content detected',
      blockedClass: 'Porn',
      scores,
      processingTimeMs,
    };
  }

  if (hentaiScore >= THRESHOLDS.BLOCK) {
    return {
      status: 'rejected',
      reason: 'Explicit animated content detected',
      blockedClass: 'Hentai',
      scores,
      processingTimeMs,
    };
  }

  // Check for suggestive content
  const sexyScore = scores['Sexy'] || 0;

  if (sexyScore >= THRESHOLDS.BLOCK) {
    return {
      status: 'rejected',
      reason: 'Suggestive content detected',
      blockedClass: 'Sexy',
      scores,
      processingTimeMs,
    };
  }

  // Flag for review if any NSFW class is borderline
  if (
    pornScore >= THRESHOLDS.WARN ||
    hentaiScore >= THRESHOLDS.WARN ||
    sexyScore >= THRESHOLDS.WARN
  ) {
    return {
      status: 'review',
      reason: 'Content requires manual review',
      scores,
      processingTimeMs,
    };
  }

  // Check if clearly safe
  const neutralScore = scores['Neutral'] || 0;
  const drawingScore = scores['Drawing'] || 0;

  if (neutralScore >= THRESHOLDS.SAFE || drawingScore >= THRESHOLDS.SAFE) {
    return {
      status: 'approved',
      scores,
      processingTimeMs,
    };
  }

  // Default to approved if no concerning content found
  return {
    status: 'approved',
    scores,
    processingTimeMs,
  };
}

/**
 * Check if the NSFW detector is available
 */
export async function isNSFWDetectorAvailable(): Promise<boolean> {
  try {
    await loadModel();
    return true;
  } catch {
    return false;
  }
}

/**
 * Preload the model (call during server startup)
 */
export async function preloadModel(): Promise<void> {
  try {
    await loadModel();
  } catch (error) {
    log.warn({ error }, 'Failed to preload NSFWJS model, will retry on first use');
  }
}
