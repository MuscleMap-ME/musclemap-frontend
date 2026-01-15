/**
 * Barcode Scanner Component
 *
 * Uses the device camera to scan barcodes for food items.
 * Supports both native mobile (via Expo Camera) and web (via QuaggaJS).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, ScanLine, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { GlassSurface } from '../glass/GlassSurface';
import { GlassButton } from '../glass/GlassButton';
import { useFoodSearch } from '../../hooks/useNutrition';

/**
 * Barcode Scanner using native browser APIs
 */
function BrowserScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const barcodeDetectorRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize barcode detector
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      // Native BarcodeDetector API (Chrome 83+, Edge 83+)
      barcodeDetectorRef.current = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'qr_code'],
      });
    }
  }, []);

  // Request camera permission and start stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
      }
    } catch (err) {
      console.error('Camera permission denied:', err);
      setHasPermission(false);
      onError('Camera permission denied. Please enable camera access in your browser settings.');
    }
  }, [onError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsScanning(false);
  }, []);

  // Scan for barcodes
  const scanFrame = useCallback(async () => {
    if (!isScanning || !videoRef.current || !barcodeDetectorRef.current) {
      return;
    }

    try {
      const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const barcode = barcodes[0];
        stopCamera();
        onScan(barcode.rawValue);
        return;
      }
    } catch (_err) {
      // Ignore frame detection errors
    }

    // Continue scanning
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning, stopCamera, onScan]);

  // Start scanning loop when camera is active
  useEffect(() => {
    if (isScanning && barcodeDetectorRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, scanFrame]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Check if BarcodeDetector is supported
  if (!('BarcodeDetector' in window)) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-white font-medium mb-2">Barcode scanning not supported</p>
        <p className="text-sm text-gray-400 mb-4">
          Your browser doesn&apos;t support native barcode scanning.
          Please use Chrome 83+ or Edge 83+ for this feature.
        </p>
        <p className="text-xs text-gray-500">
          You can also manually search for food items using the search bar.
        </p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="text-center p-8">
        <Camera className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-white font-medium mb-2">Camera access denied</p>
        <p className="text-sm text-gray-400 mb-4">
          Please enable camera access in your browser settings to scan barcodes.
        </p>
        <GlassButton variant="primary" onClick={startCamera}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </GlassButton>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Video feed */}
      <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Scanning frame */}
            <div className="relative w-72 h-48 border-2 border-green-400 rounded-lg">
              {/* Animated scan line */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                animate={{
                  top: ['0%', '100%', '0%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
            </div>

            {/* Instruction text */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
                Position barcode within frame
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/**
 * Main Barcode Scanner Modal
 */
export function BarcodeScanner({ isOpen, onClose, onFoodFound }) {
  const { searchByBarcode } = useFoodSearch();
  const [scanState, setScanState] = useState('scanning'); // scanning, searching, found, error
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [foundFood, setFoundFood] = useState(null);
  const [error, setError] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScanState('scanning');
      setScannedBarcode(null);
      setFoundFood(null);
      setError(null);
    }
  }, [isOpen]);

  // Handle successful barcode scan
  const handleScan = useCallback(async (barcode) => {
    setScannedBarcode(barcode);
    setScanState('searching');

    try {
      const foods = await searchByBarcode(barcode);
      if (foods && foods.length > 0) {
        setFoundFood(foods[0]);
        setScanState('found');
      } else {
        setError(`No food found for barcode: ${barcode}`);
        setScanState('error');
      }
    } catch (_err) {
      setError('Failed to search for barcode. Please try again.');
      setScanState('error');
    }
  }, [searchByBarcode]);

  // Handle scanner error
  const handleError = useCallback((errorMsg) => {
    setError(errorMsg);
    setScanState('error');
  }, []);

  // Handle food selection
  const handleSelectFood = useCallback(() => {
    if (foundFood) {
      onFoodFound(foundFood);
      onClose();
    }
  }, [foundFood, onFoodFound, onClose]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setScanState('scanning');
    setScannedBarcode(null);
    setFoundFood(null);
    setError(null);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] z-50 flex items-center justify-center"
          >
            <GlassSurface className="w-full max-w-lg p-6 max-h-full overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <ScanLine className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Scan Barcode</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Scanner content */}
              {scanState === 'scanning' && (
                <BrowserScanner onScan={handleScan} onError={handleError} />
              )}

              {/* Searching state */}
              {scanState === 'searching' && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
                  <p className="text-white font-medium mb-2">Searching for product...</p>
                  <p className="text-sm text-gray-400">Barcode: {scannedBarcode}</p>
                </div>
              )}

              {/* Found state */}
              {scanState === 'found' && foundFood && (
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-white font-medium">Product Found!</p>
                  </div>

                  {/* Food card */}
                  <div className="p-4 rounded-xl bg-white/5">
                    <h3 className="text-white font-semibold mb-1">{foundFood.name}</h3>
                    {foundFood.brand && (
                      <p className="text-sm text-gray-400 mb-3">{foundFood.brand}</p>
                    )}

                    {/* Nutrition summary */}
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{foundFood.calories || 0}</p>
                        <p className="text-xs text-gray-400">Cal</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-400">
                          {Math.round(foundFood.proteinG || 0)}g
                        </p>
                        <p className="text-xs text-gray-400">Protein</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-400">
                          {Math.round(foundFood.carbsG || 0)}g
                        </p>
                        <p className="text-xs text-gray-400">Carbs</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-yellow-400">
                          {Math.round(foundFood.fatG || 0)}g
                        </p>
                        <p className="text-xs text-gray-400">Fat</p>
                      </div>
                    </div>

                    {/* Serving info */}
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Per {foundFood.servingDescription || '1 serving'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <GlassButton variant="ghost" className="flex-1" onClick={handleRetry}>
                      Scan Again
                    </GlassButton>
                    <GlassButton variant="primary" className="flex-1" onClick={handleSelectFood}>
                      Add Food
                    </GlassButton>
                  </div>
                </div>
              )}

              {/* Error state */}
              {scanState === 'error' && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Oops!</p>
                  <p className="text-sm text-gray-400 mb-6">{error}</p>
                  <GlassButton variant="primary" onClick={handleRetry}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </GlassButton>
                </div>
              )}

              {/* Manual entry link */}
              {(scanState === 'scanning' || scanState === 'error') && (
                <p className="text-center text-sm text-gray-500 mt-6">
                  Can&apos;t scan? <button onClick={onClose} className="text-blue-400 hover:underline">Search manually</button>
                </p>
              )}
            </GlassSurface>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BarcodeScanner;
