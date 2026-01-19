/**
 * Music Settings Tab
 *
 * Controls music streaming integration:
 * - Connect Spotify, Apple Music, YouTube Music
 * - Workout playback settings
 * - BPM matching
 * - Volume fade during rest
 */

import React, { useEffect } from 'react';
import { Music, Play, Link2, Unlink, RefreshCw, Volume2, Activity, Pause } from 'lucide-react';
import {
  useMusicStore,
  useMusicConnections,
  useMusicWorkoutIntegration,
  MusicProvider,
} from '../../../store/musicStore';

// ============================================
// PROVIDER CONFIG
// ============================================

const PROVIDERS: Array<{
  id: MusicProvider;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}> = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    color: '#1DB954',
    bgColor: 'bg-green-900/30',
  },
  {
    id: 'apple_music',
    name: 'Apple Music',
    icon: '🎵',
    color: '#FC3C44',
    bgColor: 'bg-red-900/30',
  },
  {
    id: 'youtube_music',
    name: 'YouTube Music',
    icon: '🎵',
    color: '#FF0000',
    bgColor: 'bg-red-900/30',
  },
];

// ============================================
// COMPONENTS
// ============================================

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-14 h-8 rounded-full transition-all duration-200 ${
        value ? 'bg-purple-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full transition-transform duration-200 mx-1 ${
          value ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

function ProviderCard({
  provider,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
}: {
  provider: (typeof PROVIDERS)[number];
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isConnected
          ? `border-[${provider.color}]/50 ${provider.bgColor}`
          : 'border-transparent bg-gray-700/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{provider.icon}</span>
          <div>
            <div className="font-bold">{provider.name}</div>
            <div className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Not connected'}
            </div>
          </div>
        </div>
        {isConnected && (
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: provider.color }}
          />
        )}
      </div>

      {isConnected ? (
        <button
          onClick={onDisconnect}
          className="w-full py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 rounded-xl transition-colors text-red-400 flex items-center justify-center gap-2"
        >
          <Unlink className="w-4 h-4" />
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-wait rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Connect
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MusicTab() {
  const {
    connections,
    activeProvider,
    isConnecting,
    connectionError,
    isConnected,
    connect,
    disconnect,
    setActiveProvider,
    refresh,
  } = useMusicConnections();

  const {
    autoPlayOnWorkout,
    bpmMatchingEnabled,
    targetBpm,
    fadeOnRest,
    setAutoPlayOnWorkout,
    setBpmMatching,
    setFadeOnRest,
  } = useMusicWorkoutIntegration();

  // Load connections on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasAnyConnection = connections.some((c) => c.connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-gradient-to-r from-green-900/30 to-purple-900/30 border border-green-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Music className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="font-bold">Music Integration</h2>
            <p className="text-sm text-gray-400">
              Connect your favorite streaming service to workout with music
            </p>
          </div>
        </div>

        {connectionError && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-400">
            {connectionError}
          </div>
        )}
      </section>

      {/* Provider Connections */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">🔗 Connect Services</h3>
        <div className="grid gap-3">
          {PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isConnected={isConnected(provider.id)}
              isConnecting={isConnecting}
              onConnect={() => connect(provider.id)}
              onDisconnect={() => disconnect(provider.id)}
            />
          ))}
        </div>
      </section>

      {/* Active Provider Selection */}
      {hasAnyConnection && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-4">🎯 Active Provider</h3>
          <p className="text-sm text-gray-400 mb-3">
            Select which service to use for playback
          </p>
          <div className="flex gap-2">
            {connections
              .filter((c) => c.connected)
              .map((connection) => {
                const provider = PROVIDERS.find((p) => p.id === connection.provider);
                if (!provider) return null;

                return (
                  <button
                    key={connection.provider}
                    onClick={() => setActiveProvider(connection.provider)}
                    className={`flex-1 py-3 rounded-xl transition-all ${
                      activeProvider === connection.provider
                        ? 'bg-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-xl mr-2">{provider.icon}</span>
                    {provider.name}
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {/* Workout Integration */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          Workout Integration
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Auto-Play on Workout Start</div>
              <div className="text-sm text-gray-400">
                Start music when you begin a workout
              </div>
            </div>
            <Toggle
              value={autoPlayOnWorkout}
              onChange={() => setAutoPlayOnWorkout(!autoPlayOnWorkout)}
              disabled={!hasAnyConnection}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium">Fade During Rest</div>
                <div className="text-sm text-gray-400">
                  Lower volume between sets
                </div>
              </div>
            </div>
            <Toggle
              value={fadeOnRest}
              onChange={() => setFadeOnRest(!fadeOnRest)}
              disabled={!hasAnyConnection}
            />
          </div>
        </div>
      </section>

      {/* BPM Matching */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-400" />
          BPM Matching
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Match Music to Workout Tempo</div>
              <div className="text-sm text-gray-400">
                Play songs that match your exercise pace
              </div>
            </div>
            <Toggle
              value={bpmMatchingEnabled}
              onChange={() => setBpmMatching(!bpmMatchingEnabled, targetBpm || 120)}
              disabled={!hasAnyConnection}
            />
          </div>

          {bpmMatchingEnabled && (
            <div className="p-4 bg-gray-700/30 rounded-xl">
              <div className="flex justify-between mb-2">
                <span>Target BPM</span>
                <span className="text-orange-400 font-bold">{targetBpm || 120}</span>
              </div>
              <input
                type="range"
                min={60}
                max={180}
                value={targetBpm || 120}
                onChange={(e) => setBpmMatching(true, Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>60 (Walking)</span>
                <span>120 (Running)</span>
                <span>180 (HIIT)</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Mini Player Preview */}
      {hasAnyConnection && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-4">🎛️ Player Preview</h3>
          <div className="p-4 bg-gray-900/50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-3xl">
                🎵
              </div>
              <div className="flex-1">
                <div className="font-medium">Not Playing</div>
                <div className="text-sm text-gray-400">Connect and play to see track info</div>
              </div>
              <button className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
                <Play className="w-6 h-6" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            A mini player will appear on your dashboard during workouts
          </p>
        </section>
      )}

      {/* Tips */}
      <section className="bg-gray-800/50 rounded-2xl p-4">
        <h3 className="font-bold mb-3">💡 Music Tips</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Create a dedicated workout playlist with high-energy songs</li>
          <li>• Match BPM to your exercise type for better rhythm</li>
          <li>• Use fade during rest to stay focused between sets</li>
          <li>• Premium accounts provide uninterrupted playback</li>
        </ul>
      </section>
    </div>
  );
}
