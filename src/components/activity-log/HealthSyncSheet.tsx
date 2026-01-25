/**
 * HealthSyncSheet Component
 *
 * Connects to health platforms to sync workout data:
 * - Apple Health (via HealthKit)
 * - Google Fit
 * - Fitbit
 * - Garmin Connect
 * - Strava
 * - WHOOP
 *
 * Future integration points:
 * - OAuth flows for each platform
 * - Background sync workers
 * - Conflict resolution for duplicate workouts
 */

import React, { useState, useCallback } from 'react';
import {
  Heart,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ExternalLink,
  Watch,
  Activity,
} from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { haptic } from '@/utils/haptics';

interface HealthPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  status: 'available' | 'connected' | 'coming_soon';
}

interface HealthSyncSheetProps {
  onClose: () => void;
}

const HEALTH_PLATFORMS: HealthPlatform[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: '🍎',
    color: 'from-red-500/20 to-pink-500/20 border-red-500/30',
    description: 'Sync workouts from Apple Watch and iPhone',
    status: 'coming_soon',
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    icon: '💚',
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    description: 'Connect Google Fit and Wear OS',
    status: 'coming_soon',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '💙',
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
    description: 'Import from Fitbit trackers',
    status: 'coming_soon',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: '⌚',
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    description: 'Sync Garmin watch workouts',
    status: 'coming_soon',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: '🧡',
    color: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
    description: 'Import activities from Strava',
    status: 'coming_soon',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: '⚫',
    color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
    description: 'Connect WHOOP strain and recovery',
    status: 'coming_soon',
  },
];

export function HealthSyncSheet({ onClose }: HealthSyncSheetProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle platform connection attempt
  const handleConnect = useCallback(async (platform: HealthPlatform) => {
    if (platform.status === 'coming_soon') {
      setError(`${platform.name} integration is coming soon! We're working on bringing this feature to you.`);
      haptic('light');
      return;
    }

    setConnecting(platform.id);
    setError(null);
    haptic('medium');

    // This would initiate OAuth flow or native health kit permissions
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // TODO: Implement actual OAuth/HealthKit flows
      setError('Health platform connections are being developed. Stay tuned!');
    } catch (_err) {
      setError(`Failed to connect to ${platform.name}`);
    } finally {
      setConnecting(null);
    }
  }, []);

  return (
    <div className="bg-gradient-to-br from-rose-600/20 to-pink-600/20 border border-rose-500/30 rounded-2xl p-4 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <span className="font-medium">Health Sync</span>
          <span className="px-2 py-0.5 bg-rose-500/20 rounded-full text-xs text-rose-300">Coming Soon</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Introduction */}
      <div className="mb-4 p-3 bg-gray-800/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-medium text-sm mb-1">Connect Your Health Apps</h3>
            <p className="text-xs text-gray-400">
              Import workout data automatically from your favorite health platforms and wearables.
            </p>
          </div>
        </div>
      </div>

      {/* Platform list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {HEALTH_PLATFORMS.map((platform) => (
          <SafeMotion.button
            key={platform.id}
            onClick={() => handleConnect(platform)}
            disabled={connecting === platform.id}
            className={`w-full p-4 rounded-xl bg-gradient-to-r ${platform.color} border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-left`}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{platform.icon}</span>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {platform.name}
                    {platform.status === 'coming_soon' && (
                      <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-400">
                        Soon
                      </span>
                    )}
                    {platform.status === 'connected' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{platform.description}</p>
                </div>
              </div>

              <div className="flex items-center">
                {connecting === platform.id ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : platform.status === 'connected' ? (
                  <RefreshCw className="w-5 h-5 text-gray-500" />
                ) : (
                  <ExternalLink className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </SafeMotion.button>
        ))}
      </div>

      {/* What's coming section */}
      <div className="mt-4 p-3 bg-gray-800/30 rounded-xl">
        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <Watch className="w-4 h-4" />
          Coming Features
        </h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Automatic workout sync from wearables</li>
          <li>• Heart rate and calorie data import</li>
          <li>• Sleep and recovery metrics</li>
          <li>• Historical data backfill</li>
          <li>• Two-way sync (export to health apps)</li>
        </ul>
      </div>

      {/* Wearable detection info */}
      <div className="mt-3 p-3 bg-gray-800/30 rounded-xl">
        <div className="flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-gray-500 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">
              <strong className="text-gray-300">Native app required:</strong> Health platform sync requires the MuscleMap native app (coming soon) for direct integration with HealthKit and other platform APIs.
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      <SafeAnimatePresence>
        {error && (
          <SafeMotion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-start gap-2 text-rose-300 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>
    </div>
  );
}

export default HealthSyncSheet;
