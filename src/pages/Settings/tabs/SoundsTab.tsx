/**
 * Sounds Settings Tab
 *
 * Controls sound effects, metronome, and audio settings:
 * - Master volume
 * - Timer sounds
 * - Metronome settings
 * - Rep counting sounds
 * - Sound packs
 */

import React, { useState, useCallback } from 'react';
import { Volume2, Clock, Activity, Play, Pause, Music2 } from 'lucide-react';
import { useSoundSettings } from '../../../store/preferencesStore';
import { getSoundManager, playSound } from '../../../services/soundManager';
import { getMetronome } from '../../../services/metronome';

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

function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    />
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SoundsTab() {
  const { settings, updateSettings } = useSoundSettings();
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);

  // Get sound manager and metronome instances
  const soundManager = getSoundManager();
  const metronome = getMetronome();

  // Preview a sound
  const previewSound = useCallback(
    (sound: 'timer_complete' | 'rep_count' | 'set_complete') => {
      soundManager.setVolume(settings.masterVolume / 100);
      playSound(sound);
    },
    [settings.masterVolume, soundManager]
  );

  // Toggle metronome preview
  const toggleMetronome = useCallback(() => {
    if (isMetronomePlaying) {
      metronome.stop();
    } else {
      metronome.setBpm(settings.metronomeBpm);
      metronome.setAccent(settings.metronomeAccent);
      metronome.setVolume(settings.masterVolume / 100);
      metronome.start();
    }
    setIsMetronomePlaying(!isMetronomePlaying);
  }, [isMetronomePlaying, metronome, settings]);

  // Tap tempo
  const handleTapTempo = useCallback(() => {
    const newBpm = metronome.tapTempo();
    updateSettings({ metronomeBpm: newBpm });
  }, [metronome, updateSettings]);

  return (
    <div className="space-y-6">
      {/* Master Volume */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-blue-400" />
          Master Volume
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Volume2 className="w-5 h-5 text-gray-400" />
            <Slider
              value={settings.masterVolume * 100}
              onChange={(v) => {
                updateSettings({ masterVolume: v / 100 });
                soundManager.setVolume(v / 100);
              }}
            />
            <span className="w-12 text-right">{Math.round(settings.masterVolume * 100)}%</span>
          </div>

          <button
            onClick={() => soundManager.testPack()}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
          >
            🔊 Test Current Sounds
          </button>
        </div>
      </section>

      {/* Timer Sounds */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" />
          Timer Sounds
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Timer Sound</div>
              <div className="text-sm text-gray-400">Play sound when timer completes</div>
            </div>
            <Toggle
              value={settings.timerSoundEnabled}
              onChange={() => updateSettings({ timerSoundEnabled: !settings.timerSoundEnabled })}
            />
          </div>

          {settings.timerSoundEnabled && (
            <div className="p-4 bg-gray-700/30 rounded-xl space-y-4">
              <div>
                <div className="font-medium mb-2">Sound Type</div>
                <div className="grid grid-cols-4 gap-2">
                  {['beep', 'chime', 'bell', 'custom'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        updateSettings({
                          timerSoundType: type as 'beep' | 'chime' | 'bell' | 'custom',
                        });
                        previewSound('timer_complete');
                      }}
                      className={`py-2 rounded-xl capitalize transition-all ${
                        settings.timerSoundType === type
                          ? 'bg-purple-600'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => previewSound('timer_complete')}
                className="w-full py-2 bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 rounded-xl transition-colors text-green-400"
              >
                ▶ Preview Timer Sound
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Rep Count Sounds */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-400" />
          Rep Counting
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Rep Count Sound</div>
              <div className="text-sm text-gray-400">Audio cue for each rep</div>
            </div>
            <Toggle
              value={settings.repCountSoundEnabled}
              onChange={() => updateSettings({ repCountSoundEnabled: !settings.repCountSoundEnabled })}
            />
          </div>

          {settings.repCountSoundEnabled && (
            <button
              onClick={() => previewSound('rep_count')}
              className="w-full py-2 bg-orange-600/20 border border-orange-500/30 hover:bg-orange-600/30 rounded-xl transition-colors text-orange-400"
            >
              ▶ Preview Rep Sound
            </button>
          )}
        </div>
      </section>

      {/* Metronome */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Music2 className="w-5 h-5 text-purple-400" />
          Metronome
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Enable Metronome</div>
              <div className="text-sm text-gray-400">Beat timing for tempo training</div>
            </div>
            <Toggle
              value={settings.metronomeEnabled}
              onChange={() => updateSettings({ metronomeEnabled: !settings.metronomeEnabled })}
            />
          </div>

          {settings.metronomeEnabled && (
            <div className="p-4 bg-gray-700/30 rounded-xl space-y-4">
              {/* BPM Control */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">BPM (Beats Per Minute)</span>
                  <span className="text-purple-400 font-bold">{settings.metronomeBpm}</span>
                </div>
                <Slider
                  value={settings.metronomeBpm}
                  min={20}
                  max={200}
                  onChange={(bpm) => {
                    updateSettings({ metronomeBpm: bpm });
                    if (isMetronomePlaying) {
                      metronome.setBpm(bpm);
                    }
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>20</span>
                  <span>Slow</span>
                  <span>Medium</span>
                  <span>Fast</span>
                  <span>200</span>
                </div>
              </div>

              {/* Accent Pattern */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Accent Every</span>
                  <span className="text-purple-400">{settings.metronomeAccent} beats</span>
                </div>
                <div className="flex gap-2">
                  {[2, 3, 4, 6, 8].map((accent) => (
                    <button
                      key={accent}
                      onClick={() => {
                        updateSettings({ metronomeAccent: accent });
                        if (isMetronomePlaying) {
                          metronome.setAccent(accent);
                        }
                      }}
                      className={`flex-1 py-2 rounded-xl transition-all ${
                        settings.metronomeAccent === accent
                          ? 'bg-purple-600'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    >
                      {accent}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <button
                  onClick={toggleMetronome}
                  className={`flex-1 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    isMetronomePlaying
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  {isMetronomePlaying ? (
                    <>
                      <Pause className="w-5 h-5" /> Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" /> Start
                    </>
                  )}
                </button>

                <button
                  onClick={handleTapTempo}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl transition-colors"
                >
                  👆 Tap Tempo
                </button>
              </div>

              {isMetronomePlaying && (
                <div className="text-center text-sm text-purple-400 animate-pulse">
                  ♪ Metronome is playing at {settings.metronomeBpm} BPM
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Sound Packs */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">🎵 Sound Packs</h3>
        <div className="space-y-2">
          {soundManager.getAvailablePacks().map((pack) => (
            <button
              key={pack.id}
              onClick={() => {
                updateSettings({ customSoundPackId: pack.id });
                soundManager.setPack(pack.id);
                soundManager.testPack();
              }}
              className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                (settings.customSoundPackId || 'default') === pack.id
                  ? 'border-purple-500 bg-purple-900/20'
                  : 'border-transparent bg-gray-700/50 hover:bg-gray-700'
              }`}
            >
              <div className="font-medium">{pack.name}</div>
              <div className="text-sm text-gray-400">{pack.description}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
